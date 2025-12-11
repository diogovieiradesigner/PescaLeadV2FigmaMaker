-- ============================================
-- WEBHOOK QUEUE - Sistema de fila para não perder mensagens
-- ============================================
-- OBJETIVO: Salvar TODOS os webhooks recebidos imediatamente,
--           processar depois de forma assíncrona.
--           Se der erro, mensagem fica na fila para retry.
-- ============================================

-- ✅ Tabela de fila de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    workspace_id UUID NULL, -- Descoberto após processar
    instance_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    message_id TEXT NULL, -- ID da mensagem (se for evento de mensagem)
    remote_jid TEXT NULL, -- WhatsApp JID do contato
    
    -- Payload bruto (JSONB para queries)
    payload JSONB NOT NULL,
    
    -- Status do processamento
    status TEXT NOT NULL DEFAULT 'pending',
    -- pending: aguardando processamento
    -- processing: sendo processado agora
    -- completed: processado com sucesso
    -- failed: erro no processamento (retry disponível)
    
    error_message TEXT NULL,
    error_details JSONB NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    processed_at TIMESTAMPTZ NULL,
    next_retry_at TIMESTAMPTZ NULL,
    
    -- Prioridade (menor = mais urgente)
    priority INTEGER NOT NULL DEFAULT 100,
    
    CONSTRAINT webhook_queue_status_check CHECK (
        status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])
    )
);

-- ✅ Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON webhook_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_pending ON webhook_queue(status, priority, created_at) 
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_queue_failed_retry ON webhook_queue(status, next_retry_at) 
    WHERE status = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_queue_workspace ON webhook_queue(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_instance ON webhook_queue(instance_name);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_message_id ON webhook_queue(message_id) 
    WHERE message_id IS NOT NULL;

-- ✅ Índice para evitar duplicatas (mesmo messageId)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_queue_unique_message 
    ON webhook_queue(message_id) 
    WHERE message_id IS NOT NULL AND status IN ('completed', 'processing');

-- ✅ Comentários
COMMENT ON TABLE webhook_queue IS 'Fila de webhooks recebidos. Salva payload bruto imediatamente, processa de forma assíncrona.';
COMMENT ON COLUMN webhook_queue.status IS 'pending: aguardando | processing: processando | completed: sucesso | failed: erro';
COMMENT ON COLUMN webhook_queue.payload IS 'Payload bruto do webhook em JSONB';
COMMENT ON COLUMN webhook_queue.retry_count IS 'Número de tentativas de processamento';
COMMENT ON COLUMN webhook_queue.next_retry_at IS 'Próxima tentativa de retry (backoff exponencial)';

-- ============================================
-- FUNÇÃO: Processar webhook da fila
-- ============================================
CREATE OR REPLACE FUNCTION public.process_webhook_queue_item(p_queue_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_queue_record RECORD;
    v_result JSON;
BEGIN
    -- ✅ Buscar item da fila e marcar como "processing"
    UPDATE webhook_queue
    SET 
        status = 'processing',
        processed_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
    WHERE id = p_queue_id
        AND status IN ('pending', 'failed')
    RETURNING * INTO v_queue_record;
    
    IF v_queue_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Queue item not found or already processing'
        );
    END IF;
    
    -- ✅ Retornar payload para ser processado pela Edge Function
    -- A Edge Function vai chamar a lógica de processamento existente
    RETURN json_build_object(
        'success', true,
        'queue_id', v_queue_record.id,
        'payload', v_queue_record.payload,
        'instance_name', v_queue_record.instance_name,
        'event_type', v_queue_record.event_type
    );
END;
$$;

-- ✅ Permissões
GRANT SELECT, INSERT, UPDATE ON webhook_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE ON webhook_queue TO service_role;
GRANT EXECUTE ON FUNCTION process_webhook_queue_item TO authenticated;
GRANT EXECUTE ON FUNCTION process_webhook_queue_item TO service_role;

-- ============================================
-- FUNÇÃO: Marcar item da fila como completo
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_webhook_queue_item(
    p_queue_id UUID,
    p_workspace_id UUID DEFAULT NULL,
    p_result JSON DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE webhook_queue
    SET 
        status = 'completed',
        workspace_id = COALESCE(p_workspace_id, workspace_id),
        processed_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
        error_message = NULL,
        error_details = NULL
    WHERE id = p_queue_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_webhook_queue_item TO authenticated;
GRANT EXECUTE ON FUNCTION complete_webhook_queue_item TO service_role;

-- ============================================
-- FUNÇÃO: Marcar item da fila como falhou
-- ============================================
CREATE OR REPLACE FUNCTION public.fail_webhook_queue_item(
    p_queue_id UUID,
    p_error_message TEXT,
    p_error_details JSON DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_retry_count INTEGER;
    v_max_retries INTEGER;
    v_next_retry_interval INTERVAL;
BEGIN
    -- ✅ Incrementar retry_count e calcular próximo retry (backoff exponencial)
    UPDATE webhook_queue
    SET 
        status = 'failed',
        error_message = p_error_message,
        error_details = p_error_details,
        retry_count = retry_count + 1,
        processed_at = NOW() AT TIME ZONE 'America/Sao_Paulo',
        -- Backoff exponencial: 1min, 5min, 15min, 1h, 3h
        next_retry_at = CASE 
            WHEN retry_count + 1 >= max_retries THEN NULL
            ELSE (NOW() AT TIME ZONE 'America/Sao_Paulo') + 
                 INTERVAL '1 minute' * POWER(3, retry_count + 1)
        END
    WHERE id = p_queue_id
    RETURNING retry_count, max_retries INTO v_retry_count, v_max_retries;
    
    RAISE NOTICE 'Webhook queue item % marked as failed (retry %/%)', 
        p_queue_id, v_retry_count, v_max_retries;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION fail_webhook_queue_item TO authenticated;
GRANT EXECUTE ON FUNCTION fail_webhook_queue_item TO service_role;

-- ============================================
-- FUNÇÃO: Buscar próximos webhooks para processar
-- ============================================
CREATE OR REPLACE FUNCTION public.get_pending_webhooks(p_limit INTEGER DEFAULT 10)
RETURNS SETOF webhook_queue
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM webhook_queue
    WHERE status = 'pending'
       OR (status = 'failed' AND next_retry_at IS NOT NULL AND next_retry_at <= NOW())
    ORDER BY priority ASC, created_at ASC
    LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_pending_webhooks TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_webhooks TO service_role;

-- ============================================
-- VIEW: Estatísticas da fila
-- ============================================
CREATE OR REPLACE VIEW webhook_queue_stats AS
SELECT
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest,
    AVG(retry_count)::NUMERIC(10,2) as avg_retries
FROM webhook_queue
GROUP BY status;

GRANT SELECT ON webhook_queue_stats TO authenticated;
GRANT SELECT ON webhook_queue_stats TO service_role;

-- ============================================
-- POLÍTICA DE LIMPEZA: Deletar mensagens antigas (30 dias)
-- ============================================
-- Criar função para limpar webhooks antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_webhooks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Deletar webhooks completados com mais de 30 dias
    DELETE FROM webhook_queue
    WHERE status = 'completed'
      AND processed_at < (NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old webhook records', v_deleted_count;
    
    RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_webhooks TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_webhooks TO service_role;

COMMENT ON FUNCTION cleanup_old_webhooks IS 'Limpa webhooks completados com mais de 30 dias. Executar via cron job.';
