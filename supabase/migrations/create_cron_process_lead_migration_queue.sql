-- =============================================================================
-- MIGRATION: Cron Job para Processar Fila de Movimentação de Leads
-- =============================================================================
-- PROBLEMA: Movimentações de leads precisam ser processadas assincronamente
--
-- SOLUÇÃO: Cron job que chama a Edge Function process-lead-migration-queue
--          para garantir processamento contínuo da fila
-- =============================================================================

-- =============================================================================
-- HABILITAR EXTENSÃO pg_net (se ainda não estiver habilitada)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- CRON JOB: Chamar Edge Function process-lead-migration-queue
-- =============================================================================
-- Executa a cada 30 segundos
-- Chama a Edge Function process-lead-migration-queue via net.http_post
-- =============================================================================

-- Remover cron job existente se houver
SELECT cron.unschedule('process-lead-migration-queue');

-- Criar cron job que chama a Edge Function
SELECT cron.schedule(
  'process-lead-migration-queue',           -- Nome do job
  '*/30 * * * * *',                        -- A cada 30 segundos
  $$
    SELECT net.http_post(
        url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-lead-migration-queue',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('batch_size', 100)
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
  active
FROM cron.job
WHERE jobname = 'process-lead-migration-queue';

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON FUNCTION net.http_post(url text, headers jsonb, body jsonb) IS
'Função para realizar requisições HTTP POST. Usada para acionar Edge Functions.';

