-- =============================================================================
-- MIGRATION: Corrigir Cron Job da Fila de Transcrição
-- =============================================================================
-- PROBLEMA: Cron job está configurado com schedule "10 seconds", que NÃO É
--           válido para pg_cron. pg_cron não suporta intervalos menores que
--           1 minuto e não aceita formato "10 seconds".
--
-- SOLUÇÃO: Remover cron job inválido e criar novo com schedule correto
--          (formato cron padrão: */1 * * * * = a cada 1 minuto)
-- =============================================================================

-- =============================================================================
-- HABILITAR EXTENSÃO pg_net (se ainda não estiver habilitada)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- REMOVER CRON JOB INVÁLIDO
-- =============================================================================
SELECT cron.unschedule('ai-transcription-queue');

-- =============================================================================
-- CRIAR NOVO CRON JOB COM SCHEDULE CORRETO
-- =============================================================================
-- Schedule: */1 * * * * = A cada 1 minuto (formato cron válido)
-- pg_cron não suporta intervalos menores que 1 minuto
SELECT cron.schedule(
  'ai-transcription-queue-v2',           -- Nome do job
  '*/1 * * * *',                         -- ✅ A cada 1 minuto (formato cron válido)
  $$
    SELECT net.http_post(
        url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/ai-transcription-queue',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
        ),
        body := '{}'::jsonb
    );
  $$
);

-- =============================================================================
-- VERIFICAR CRON JOBS CONFIGURADOS
-- =============================================================================
SELECT 
    jobid,
    schedule,
    command,
    active,
    jobname
FROM cron.job
WHERE jobname LIKE '%transcription%'
ORDER BY jobname;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON EXTENSION pg_net IS
'Extensão para fazer requisições HTTP de dentro do PostgreSQL. Usada para chamar Edge Functions via cron.';

-- =============================================================================
-- NOTA IMPORTANTE
-- =============================================================================
-- pg_cron NÃO SUPORTA:
-- - Intervalos em segundos ("10 seconds", "30 seconds", etc.)
-- - Formato de intervalo direto
--
-- pg_cron ACEITA APENAS:
-- - Formato cron padrão: "*/1 * * * *" (a cada 1 minuto)
-- - Formato cron padrão: "*/2 * * * *" (a cada 2 minutos)
-- - Formato cron padrão: "*/5 * * * *" (a cada 5 minutos)
-- - Formato cron padrão: "0 * * * *" (a cada hora)
--
-- Para intervalos menores que 1 minuto, seria necessário:
-- - Usar Edge Function com cron externo (GitHub Actions, etc.)
-- - Ou usar pg_net com loop interno (não recomendado)
-- =============================================================================

