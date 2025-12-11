-- =============================================================================
-- MIGRATION: Cron Job para Corrigir Runs Inconsistentes
-- =============================================================================
-- PROBLEMA: Runs podem ficar com estado inconsistente entre status e finished_at
-- 
-- SOLUÇÃO: Cron job que executa periodicamente a função de correção
-- =============================================================================

-- =============================================================================
-- HABILITAR EXTENSÃO pg_cron (se ainda não estiver habilitada)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================================================
-- CRON JOB: Executar correção de runs inconsistentes
-- =============================================================================
-- Executa a cada 1 hora (00 minutos de cada hora)
-- Chama a Edge Function que executa fix_runs_with_inconsistent_status()
-- =============================================================================

-- Remover cron job existente se houver
SELECT cron.unschedule('fix-inconsistent-runs-hourly');

-- Criar cron job que executa a função SQL diretamente
-- Versão simplificada: executa a função e deixa logs automáticos
SELECT cron.schedule(
  'fix-inconsistent-runs-hourly',           -- Nome do job
  '0 * * * *',                              -- A cada hora (00 minutos)
  'SELECT * FROM fix_runs_with_inconsistent_status()'  -- Executa função SQL diretamente
);

-- =============================================================================
-- VERIFICAR CRON JOBS CONFIGURADOS
-- =============================================================================

-- Listar todos os cron jobs
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'fix-inconsistent-runs-hourly';

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON EXTENSION pg_cron IS 
'Extensão para agendar tarefas periódicas no PostgreSQL. Usada para corrigir runs inconsistentes automaticamente.';

-- =============================================================================
-- ALTERNATIVA: Se pg_cron não estiver disponível, usar Supabase Edge Function
-- =============================================================================
-- 
-- Para usar Edge Function com cron externo (ex: GitHub Actions, cron do servidor):
-- 
-- 1. Deploy da Edge Function: supabase functions deploy fix-inconsistent-runs
-- 
-- 2. Configurar cron externo para chamar:
--    curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/fix-inconsistent-runs \
--      -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
--      -H "Content-Type: application/json"
-- 
-- 3. Ou usar Supabase Dashboard > Database > Cron Jobs (se disponível)
-- =============================================================================

