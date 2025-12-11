-- =============================================================================
-- QUERIES DE DIAGNÓSTICO: Extração Travada
-- =============================================================================
-- Substitua 'UUID-DA-EXTRACAO-AQUI' pelo UUID real da extração
-- =============================================================================

-- 1. VERIFICAR STATUS DA EXTRACAÇÃO
-- =============================================================================
SELECT 
  id,
  status,
  created_quantity,
  target_quantity,
  ROUND((created_quantity::float / NULLIF(target_quantity, 0) * 100)::numeric, 2) as percentage,
  started_at,
  completed_at,
  finished_at,
  current_step,
  pages_consumed,
  execution_time_ms,
  progress_data
FROM lead_extraction_runs
WHERE id = 'UUID-DA-EXTRACAO-AQUI'  -- SUBSTITUIR PELO UUID REAL
ORDER BY started_at DESC
LIMIT 1;

-- =============================================================================
-- 2. VERIFICAR MENSAGENS NA FILA PARA ESTA EXTRACAÇÃO
-- =============================================================================
SELECT 
  msg_id,
  message->>'run_id' as run_id,
  message->>'page' as page,
  message->>'is_last_page' as is_last_page,
  message->>'is_compensation' as is_compensation,
  message->>'is_segmented' as is_segmented,
  message->>'segment_neighborhood' as segment_neighborhood,
  enqueued_at,
  vt,
  read_ct,
  EXTRACT(EPOCH FROM (NOW() - enqueued_at))/60 as minutes_old
FROM pgmq.google_maps_queue
WHERE message->>'run_id' = 'UUID-DA-EXTRACAO-AQUI'  -- SUBSTITUIR PELO UUID REAL
ORDER BY enqueued_at DESC;

-- =============================================================================
-- 3. VERIFICAR LOGS DA EXTRACAÇÃO
-- =============================================================================
SELECT 
  id,
  step_name,
  level,
  message,
  details,
  created_at
FROM extraction_logs
WHERE run_id = 'UUID-DA-EXTRACAO-AQUI'  -- SUBSTITUIR PELO UUID REAL
ORDER BY created_at DESC
LIMIT 50;

-- =============================================================================
-- 4. VERIFICAR PROGRESS_DATA (DADOS DE PROGRESSO)
-- =============================================================================
SELECT 
  id,
  progress_data->>'api_exhausted' as api_exhausted,
  progress_data->>'compensation_count' as compensation_count,
  progress_data->>'compensation_pages_queued' as compensation_pages_queued,
  progress_data->>'compensation_enqueued_at' as compensation_enqueued_at,
  progress_data->>'segmented_searches_enqueued' as segmented_searches_enqueued,
  progress_data->>'segmented_searches_completed' as segmented_searches_completed,
  progress_data->>'segmentation_started_at' as segmentation_started_at,
  progress_data->>'last_compensation_page' as last_compensation_page,
  progress_data->>'pages_consumed' as pages_consumed
FROM lead_extraction_runs
WHERE id = 'UUID-DA-EXTRACAO-AQUI';  -- SUBSTITUIR PELO UUID REAL

-- =============================================================================
-- 5. VERIFICAR LEADS CRIADOS NESTA EXTRACAÇÃO
-- =============================================================================
SELECT 
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE filter_passed = true) as passed_filters,
  COUNT(*) FILTER (WHERE filter_passed = false) as rejected_filters,
  COUNT(*) FILTER (WHERE should_migrate = true) as should_migrate,
  COUNT(*) FILTER (WHERE migrated_at IS NOT NULL) as migrated
FROM lead_extraction_staging
WHERE lead_extraction_run_id = 'UUID-DA-EXTRACAO-AQUI';  -- SUBSTITUIR PELO UUID REAL

-- =============================================================================
-- 6. VERIFICAR SE HÁ MENSAGENS PERDIDAS (ANTIGAS)
-- =============================================================================
SELECT 
  COUNT(*) as mensagens_antigas,
  MIN(enqueued_at) as mais_antiga,
  MAX(enqueued_at) as mais_recente,
  EXTRACT(EPOCH FROM (NOW() - MIN(enqueued_at)))/60 as minutos_da_mais_antiga
FROM pgmq.google_maps_queue
WHERE message->>'run_id' = 'UUID-DA-EXTRACAO-AQUI'  -- SUBSTITUIR PELO UUID REAL
  AND enqueued_at < NOW() - INTERVAL '30 minutes';

