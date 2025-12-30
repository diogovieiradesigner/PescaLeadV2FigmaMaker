-- =============================================================================
-- Migration: AI Transcription Queue Cron Job
-- =============================================================================
-- Configura pg_cron para processar a fila de transcrição de mídia do AI Assistant
-- Processa imagens e áudios enviados para análise/transcrição
-- =============================================================================

-- Habilitar extensões necessárias (já devem existir, mas garantir)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover jobs antigos se existirem
DO $$
BEGIN
  PERFORM cron.unschedule(jobname)
  FROM cron.job
  WHERE jobname LIKE 'ai-transcription-cron%';
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignorar erros se não existirem
END $$;

-- Criar job para processar fila de transcrição a cada 5 segundos
-- Como pg_cron não suporta menos que 1 minuto, usamos uma função wrapper
-- que é chamada a cada minuto e processa várias vezes

-- Criar função que chama a edge function
CREATE OR REPLACE FUNCTION call_ai_transcription_queue()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-transcription-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Job principal - a cada minuto
SELECT cron.schedule(
  'ai-transcription-cron',
  '* * * * *',  -- a cada 1 minuto
  $$SELECT call_ai_transcription_queue();$$
);

-- Comentário informativo
COMMENT ON FUNCTION call_ai_transcription_queue IS 'Chama a edge function ai-transcription-queue para processar mídia (imagens/áudios)';
