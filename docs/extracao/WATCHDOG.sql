-- =============================================================================
-- SYSTEM WATCHDOG (Cão de Guarda)
-- Automatiza a recuperação de extrações travadas e limpeza de estados inválidos
-- =============================================================================

-- 1. Tabela de Logs do Watchdog (para auditoria)
CREATE TABLE IF NOT EXISTS watchdog_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES lead_extraction_runs(id),
  action_type TEXT NOT NULL, -- 're_enqueue', 'finalize', 'alert'
  reason TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Função para identificar extrações travadas (Stuck Extractions)
-- Critério: Status 'running' E last_activity_at > 15 minutos atrás
CREATE OR REPLACE FUNCTION get_stuck_extractions(p_minutes_inactive INTEGER DEFAULT 15)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  search_term TEXT,
  location TEXT,
  started_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  progress_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ler.id,
    ler.workspace_id,
    ler.search_term,
    ler.location,
    ler.started_at,
    (ler.progress_data->>'last_activity_at')::TIMESTAMPTZ,
    ler.progress_data
  FROM lead_extraction_runs ler
  WHERE ler.status = 'running'
    AND (
      ler.progress_data->>'last_activity_at' IS NULL 
      OR (ler.progress_data->>'last_activity_at')::TIMESTAMPTZ < (now() - (p_minutes_inactive || ' minutes')::INTERVAL)
    )
    AND ler.started_at > (now() - INTERVAL '24 hours') -- Ignorar muito antigas
  ORDER BY ler.started_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. Função para verificar estado da fila (se está vazia para um run)
-- Requer extensão pg_mq
CREATE OR REPLACE FUNCTION check_queue_status(p_run_id UUID)
RETURNS TABLE (
  queue_name TEXT,
  msg_count INTEGER
) AS $$
DECLARE
  v_queue_name TEXT := 'google_maps_queue';
BEGIN
  -- Esta função é aproximada, pois PGMQ não tem filtro fácil por payload msg->>'run_id'
  -- sem ler as mensagens. O Watchdog fará isso via Edge Function lendo a fila com vt=0
  -- Mas podemos verificar o tamanho total da fila para saber se o worker está drenando.
  
  RETURN QUERY
  SELECT 
    v_queue_name,
    (SELECT count(*)::INTEGER FROM pgmq.q_google_maps_queue) AS msg_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para re-enfileirar próxima página de um bairro
CREATE OR REPLACE FUNCTION re_enqueue_next_page(
  p_run_id UUID,
  p_workspace_id UUID,
  p_search_term TEXT,
  p_location_formatted TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_last_page INTEGER;
  v_next_page INTEGER;
  v_msg_id BIGINT;
  v_payload JSONB;
BEGIN
  -- Obter última página pesquisada
  SELECT last_page_searched INTO v_last_page
  FROM neighborhood_search_history
  WHERE workspace_id = p_workspace_id
    AND LOWER(TRIM(search_term)) = LOWER(TRIM(p_search_term))
    AND LOWER(TRIM(location_formatted)) = LOWER(TRIM(p_location_formatted));
    
  v_next_page := COALESCE(v_last_page, 0) + 1;
  
  -- Montar payload
  v_payload := jsonb_build_object(
    'page', v_next_page,
    'location', p_location_formatted,
    'search_term', p_search_term,
    'workspace_id', p_workspace_id,
    'run_id', p_run_id,
    'is_segmented', true,
    'segment_neighborhood', split_part(p_location_formatted, ',', 1), -- Simplificação
    'is_watchdog_recovery', true
  );
  
  RETURN v_payload;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para forçar atualização de last_activity_at (Heartbeat)
CREATE OR REPLACE FUNCTION heartbeat_extraction(p_run_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE lead_extraction_runs
  SET progress_data = jsonb_set(
    COALESCE(progress_data, '{}'::jsonb),
    '{last_activity_at}',
    to_jsonb(now())
  )
  WHERE id = p_run_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Helper para enviar mensagem PGMQ (Wrapper)
CREATE OR REPLACE FUNCTION send_watchdog_message(
  p_queue_name TEXT,
  p_message JSONB
)
RETURNS BIGINT AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  SELECT * INTO v_msg_id FROM pgmq.send(p_queue_name, p_message);
  RETURN v_msg_id;
END;
$$ LANGUAGE plpgsql;
