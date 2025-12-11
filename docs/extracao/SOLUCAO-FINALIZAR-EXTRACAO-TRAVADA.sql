-- =============================================================================
-- SOLUÇÃO: Finalizar Extração Travada Manualmente
-- =============================================================================
-- ATENÇÃO: Use apenas se a extração realmente está travada e não consegue mais progredir
-- Substitua 'UUID-DA-EXTRACAO-AQUI' pelo UUID real da extração
-- =============================================================================

-- OPÇÃO 1: FINALIZAR COMO COMPLETADA (Se API esgotou ou não há mais resultados)
-- =============================================================================
UPDATE lead_extraction_runs
SET 
  status = 'completed',
  completed_at = COALESCE(completed_at, NOW()),
  finished_at = COALESCE(finished_at, NOW()),
  execution_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
  current_step = 'Finalizada manualmente - API esgotou resultados ou mensagens perdidas',
  completed_steps = 9,
  total_steps = 9,
  progress_data = jsonb_set(
    COALESCE(progress_data, '{}'::jsonb),
    '{final_reason}',
    '"finalizada_manualmente_api_esgotou"'
  )
WHERE id = 'UUID-DA-EXTRACAO-AQUI'  -- SUBSTITUIR PELO UUID REAL
  AND status = 'running';

-- =============================================================================
-- OPÇÃO 2: FINALIZAR COMO FALHADA (Se houve erro crítico)
-- =============================================================================
-- Descomente se necessário:
/*
UPDATE lead_extraction_runs
SET 
  status = 'failed',
  completed_at = COALESCE(completed_at, NOW()),
  finished_at = COALESCE(finished_at, NOW()),
  execution_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
  current_step = 'Finalizada manualmente - Erro crítico detectado',
  progress_data = jsonb_set(
    COALESCE(progress_data, '{}'::jsonb),
    '{final_reason}',
    '"finalizada_manualmente_erro_critico"'
  )
WHERE id = 'UUID-DA-EXTRACAO-AQUI'  -- SUBSTITUIR PELO UUID REAL
  AND status = 'running';
*/

-- =============================================================================
-- OPÇÃO 3: DELETAR MENSAGENS PERDIDAS DA FILA (Se houver)
-- =============================================================================
-- ATENÇÃO: Execute apenas se tiver certeza de que as mensagens não serão mais processadas
-- Descomente se necessário:
/*
DELETE FROM pgmq.google_maps_queue
WHERE message->>'run_id' = 'UUID-DA-EXTRACAO-AQUI'  -- SUBSTITUIR PELO UUID REAL
  AND enqueued_at < NOW() - INTERVAL '2 hours';
*/

-- =============================================================================
-- VERIFICAÇÃO APÓS FINALIZAR
-- =============================================================================
SELECT 
  id,
  status,
  created_quantity,
  target_quantity,
  ROUND((created_quantity::float / NULLIF(target_quantity, 0) * 100)::numeric, 2) as percentage,
  completed_at,
  finished_at,
  current_step
FROM lead_extraction_runs
WHERE id = 'UUID-DA-EXTRACAO-AQUI';  -- SUBSTITUIR PELO UUID REAL

