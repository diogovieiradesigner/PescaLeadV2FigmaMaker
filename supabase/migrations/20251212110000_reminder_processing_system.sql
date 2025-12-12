-- ============================================
-- REMINDER PROCESSING SYSTEM
-- Sistema híbrido: pg_cron + Edge Function
-- ============================================

-- ============================================
-- 1. TABELA DE FILA DE PROCESSAMENTO
-- ============================================
CREATE TABLE IF NOT EXISTS reminder_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES event_reminders(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Dados do evento (desnormalizados para performance)
  event_id UUID NOT NULL,
  event_title TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_start_time TIMESTAMPTZ NOT NULL,
  event_location TEXT,

  -- Dados do lead
  lead_id UUID NOT NULL,
  lead_name TEXT NOT NULL,
  lead_company TEXT,
  lead_phone TEXT NOT NULL,

  -- Dados de envio
  inbox_id UUID NOT NULL,
  message_template TEXT,

  -- Controle de processamento
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,

  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para processamento eficiente
CREATE INDEX IF NOT EXISTS idx_reminder_queue_status ON reminder_queue(status);
CREATE INDEX IF NOT EXISTS idx_reminder_queue_queued ON reminder_queue(status, queued_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_reminder_queue_workspace ON reminder_queue(workspace_id);

-- RLS para reminder_queue
ALTER TABLE reminder_queue ENABLE ROW LEVEL SECURITY;

-- Service role pode fazer tudo (para Edge Functions)
DROP POLICY IF EXISTS "Service role full access to reminder_queue" ON reminder_queue;
CREATE POLICY "Service role full access to reminder_queue"
  ON reminder_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. FUNÇÃO PARA BUSCAR TELEFONE DO LEAD
-- ============================================
CREATE OR REPLACE FUNCTION get_lead_phone(p_lead_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_phone TEXT;
BEGIN
  -- Primeiro tenta buscar do whatsapp_jid
  SELECT
    COALESCE(
      -- Tenta whatsapp_jid primeiro (formato: 5511999999999@s.whatsapp.net)
      REGEXP_REPLACE(l.whatsapp_jid, '@.*$', ''),
      -- Fallback: busca em lead_custom_values
      (SELECT lcv.value
       FROM lead_custom_values lcv
       JOIN custom_fields cf ON cf.id = lcv.custom_field_id
       WHERE lcv.lead_id = p_lead_id
         AND cf.name ILIKE '%telefone%'
       LIMIT 1),
      -- Fallback 2: busca qualquer campo com phone
      (SELECT lcv.value
       FROM lead_custom_values lcv
       JOIN custom_fields cf ON cf.id = lcv.custom_field_id
       WHERE lcv.lead_id = p_lead_id
         AND cf.name ILIKE '%phone%'
       LIMIT 1)
    )
  INTO v_phone
  FROM leads l
  WHERE l.id = p_lead_id;

  RETURN v_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNÇÃO PRINCIPAL: ENFILEIRAR LEMBRETES
-- ============================================
CREATE OR REPLACE FUNCTION enqueue_pending_reminders()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_reminder RECORD;
  v_lead_phone TEXT;
BEGIN
  -- Buscar lembretes pendentes que já passaram do horário
  FOR v_reminder IN
    SELECT
      er.id AS reminder_id,
      er.workspace_id,
      er.event_id,
      er.inbox_id,
      er.message_template,
      ie.title AS event_title,
      ie.event_type,
      ie.start_time AS event_start_time,
      ie.location AS event_location,
      ie.lead_id,
      l.client_name AS lead_name,
      l.company AS lead_company
    FROM event_reminders er
    JOIN internal_events ie ON ie.id = er.event_id
    JOIN leads l ON l.id = ie.lead_id
    WHERE er.status = 'pending'
      AND er.remind_at <= NOW()
      AND ie.event_status != 'cancelled'
      AND ie.lead_id IS NOT NULL
      AND er.inbox_id IS NOT NULL
      -- Não enfileirar se já está na fila
      AND NOT EXISTS (
        SELECT 1 FROM reminder_queue rq
        WHERE rq.reminder_id = er.id
          AND rq.status IN ('queued', 'processing')
      )
  LOOP
    -- Buscar telefone do lead
    v_lead_phone := get_lead_phone(v_reminder.lead_id);

    -- Só enfileira se tiver telefone
    IF v_lead_phone IS NOT NULL AND v_lead_phone != '' THEN
      -- Inserir na fila
      INSERT INTO reminder_queue (
        reminder_id,
        workspace_id,
        event_id,
        event_title,
        event_type,
        event_start_time,
        event_location,
        lead_id,
        lead_name,
        lead_company,
        lead_phone,
        inbox_id,
        message_template
      ) VALUES (
        v_reminder.reminder_id,
        v_reminder.workspace_id,
        v_reminder.event_id,
        v_reminder.event_title,
        v_reminder.event_type,
        v_reminder.event_start_time,
        v_reminder.event_location,
        v_reminder.lead_id,
        v_reminder.lead_name,
        v_reminder.lead_company,
        v_lead_phone,
        v_reminder.inbox_id,
        v_reminder.message_template
      );

      -- Marcar lembrete como agendado
      UPDATE event_reminders
      SET status = 'scheduled', updated_at = NOW()
      WHERE id = v_reminder.reminder_id;

      v_count := v_count + 1;
    ELSE
      -- Marcar como falha se não tem telefone
      UPDATE event_reminders
      SET status = 'failed',
          error_message = 'Lead sem telefone cadastrado',
          updated_at = NOW()
      WHERE id = v_reminder.reminder_id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNÇÃO PARA LIMPAR FILA ANTIGA
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_reminder_queue()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Remover itens processados com mais de 7 dias
  DELETE FROM reminder_queue
  WHERE status IN ('sent', 'failed')
    AND processed_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CONFIGURAR PG_CRON
-- ============================================
-- Nota: pg_cron precisa estar habilitado no projeto Supabase
-- Vá em Database > Extensions e habilite pg_cron

-- Criar extensão se não existir (pode falhar se não tiver permissão)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron extension not available or already exists';
END $$;

-- Agendar job para rodar a cada minuto
-- Remove job existente se houver
DO $$
BEGIN
  PERFORM cron.unschedule('enqueue-reminders');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job enqueue-reminders does not exist yet';
END $$;

DO $$
BEGIN
  -- Rodar a cada minuto
  PERFORM cron.schedule(
    'enqueue-reminders',
    '* * * * *',  -- A cada minuto
    'SELECT enqueue_pending_reminders();'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule cron job. Please enable pg_cron extension.';
END $$;

-- Agendar limpeza diária
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-reminder-queue');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Job cleanup-reminder-queue does not exist yet';
END $$;

DO $$
BEGIN
  -- Rodar todo dia às 3h da manhã
  PERFORM cron.schedule(
    'cleanup-reminder-queue',
    '0 3 * * *',
    'SELECT cleanup_old_reminder_queue();'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule cleanup job. Please enable pg_cron extension.';
END $$;

-- ============================================
-- 6. FUNÇÃO HTTP PARA CHAMAR EDGE FUNCTION
-- ============================================
-- Nota: Requer pg_net extension habilitada
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net extension not available';
END $$;

-- Função para disparar processamento da Edge Function
CREATE OR REPLACE FUNCTION trigger_reminder_processing()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Buscar URL do projeto e service key
  -- Nota: Em produção, isso deve vir de uma configuração segura
  v_url := current_setting('app.supabase_url', true) || '/functions/v1/process-reminders';
  v_service_key := current_setting('app.supabase_service_key', true);

  -- Se temos as configurações, chamar a Edge Function
  IF v_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('queue_id', NEW.id)
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Não falhar se não conseguir chamar
  RAISE NOTICE 'Could not trigger Edge Function: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para chamar Edge Function quando item é enfileirado
DROP TRIGGER IF EXISTS trigger_process_reminder_queue ON reminder_queue;
CREATE TRIGGER trigger_process_reminder_queue
  AFTER INSERT ON reminder_queue
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reminder_processing();

-- ============================================
-- 7. COMMENTS
-- ============================================
COMMENT ON TABLE reminder_queue IS 'Fila de lembretes para processamento pela Edge Function';
COMMENT ON FUNCTION enqueue_pending_reminders() IS 'Enfileira lembretes pendentes que já passaram do horário';
COMMENT ON FUNCTION get_lead_phone(UUID) IS 'Busca telefone do lead de múltiplas fontes';
COMMENT ON FUNCTION cleanup_old_reminder_queue() IS 'Remove itens antigos da fila';

-- ============================================
-- 8. GRANT PARA SERVICE ROLE
-- ============================================
GRANT ALL ON reminder_queue TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_pending_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION get_lead_phone(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_reminder_queue() TO service_role;
