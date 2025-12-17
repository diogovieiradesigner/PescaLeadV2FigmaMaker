-- Migration: Atualizar google_sync_queue table
-- Fila de sincronização para processamento assíncrono pelo cron job
--
-- USO: Esta tabela é usada EXCLUSIVAMENTE pelo cron job (google-calendar-sync-cron)
-- O frontend NÃO acessa esta tabela diretamente.
--
-- FUNCIONAMENTO:
-- 1. Quando um webhook é recebido ou sync manual é solicitado, um item é inserido na fila
-- 2. O cron job (executa a cada minuto) processa os itens pendentes
-- 3. Se a fila estiver vazia, o cron sincroniza conexões diretamente
-- 4. Itens processados são limpos após 1 hora

-- Adicionar colunas faltantes (tabela já existe)
ALTER TABLE google_sync_queue
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

ALTER TABLE google_sync_queue
ADD COLUMN IF NOT EXISTS sync_type TEXT DEFAULT 'incremental';

-- Adicionar constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'google_sync_queue_sync_type_check'
  ) THEN
    ALTER TABLE google_sync_queue
    ADD CONSTRAINT google_sync_queue_sync_type_check
    CHECK (sync_type IN ('full', 'incremental', 'webhook'));
  END IF;
END $$;

-- Índices para performance do cron job
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON google_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON google_sync_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_connection ON google_sync_queue(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_workspace ON google_sync_queue(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_completed ON google_sync_queue(completed_at) WHERE status IN ('completed', 'error');

-- RLS (se não estiver habilitado)
ALTER TABLE google_sync_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas service role pode acessar (cron job)
DROP POLICY IF EXISTS "Service role can manage sync queue" ON google_sync_queue;
CREATE POLICY "Service role can manage sync queue" ON google_sync_queue
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Comentários de documentação
COMMENT ON TABLE google_sync_queue IS 'Fila de sincronização para processamento pelo cron job. Uso interno apenas - frontend não acessa diretamente.';
COMMENT ON COLUMN google_sync_queue.status IS 'pending=aguardando, processing=em execução, completed=concluído, error=falhou';
COMMENT ON COLUMN google_sync_queue.priority IS 'Menor valor = maior prioridade. Webhooks usam 0, sync manual usa 1';
COMMENT ON COLUMN google_sync_queue.sync_type IS 'full=sync completo, incremental=apenas mudanças, webhook=trigger por notificação';
