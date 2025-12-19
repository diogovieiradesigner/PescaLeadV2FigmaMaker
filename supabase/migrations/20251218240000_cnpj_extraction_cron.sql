-- =============================================================================
-- Migration: CNPJ Extraction Cron Job
-- =============================================================================
-- Configura pg_cron para processar a fila de extração CNPJ automaticamente
-- A cada 30 segundos, chama a Edge Function cnpj-extraction-cron
-- =============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job para processar fila CNPJ a cada 30 segundos
-- Nota: pg_cron mínimo é 1 minuto, então usamos 1 minuto
SELECT cron.schedule(
  'cnpj-extraction-cron',  -- nome único do job
  '* * * * *',             -- a cada 1 minuto
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cnpj-extraction-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Comentário no job
COMMENT ON FUNCTION cron.schedule IS 'Agenda jobs periódicos. cnpj-extraction-cron processa fila CNPJ.';
