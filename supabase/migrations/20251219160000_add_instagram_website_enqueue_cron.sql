-- =============================================================================
-- MIGRATION: Configurar Cron Job para Instagram Website Enqueue
-- =============================================================================
-- Cria cron job que roda a cada 1 minuto para enfileirar websites de perfis do Instagram
-- =============================================================================

-- Habilitar extensão pg_cron se ainda não estiver
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Deletar cron job se já existir (para evitar duplicatas)
SELECT cron.unschedule('instagram-website-enqueue-cron');

-- Criar cron job que roda a cada 1 minuto
SELECT cron.schedule(
  'instagram-website-enqueue-cron',                                    -- Nome do job
  '* * * * *',                                                         -- Cron schedule: a cada 1 minuto
  $$
  SELECT
    net.http_post(
      url:='https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/instagram-website-enqueue',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - usado para crons do Instagram scraping';
