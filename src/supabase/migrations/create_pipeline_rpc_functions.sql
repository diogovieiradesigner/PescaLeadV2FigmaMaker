-- =============================================================================
-- MIGRATION: Create RPC Functions for AI Pipeline Logging
-- =============================================================================
-- Stored procedures usadas pela Edge Function ai-process-conversation
-- =============================================================================

-- =========================================================================
-- FUNÇÃO: log_pipeline_start
-- =========================================================================
-- Cria um novo pipeline log e retorna o ID
-- =========================================================================

CREATE OR REPLACE FUNCTION log_pipeline_start(
  p_conversation_id UUID,
  p_debouncer_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL,
  p_message_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pipeline_id UUID;
  v_agent_name TEXT;
  v_workspace_id UUID;
  v_contact_name TEXT;
  v_contact_phone TEXT;
BEGIN
  -- Gerar UUID para o pipeline
  v_pipeline_id := gen_random_uuid();
  
  -- Buscar informações do agente
  IF p_agent_id IS NOT NULL THEN
    SELECT name, workspace_id
    INTO v_agent_name, v_workspace_id
    FROM ai_agents
    WHERE id = p_agent_id;
  END IF;
  
  -- Buscar informações da conversa
  SELECT contact_name, contact_phone
  INTO v_contact_name, v_contact_phone
  FROM conversations
  WHERE id = p_conversation_id;
  
  -- Inserir registro do pipeline
  INSERT INTO ai_pipeline_logs (
    id,
    conversation_id,
    debouncer_id,
    agent_id,
    workspace_id,
    contact_name,
    contact_phone,
    agent_name,
    status,
    status_message,
    started_at,
    steps_completed,
    response_sent
  ) VALUES (
    v_pipeline_id,
    p_conversation_id,
    p_debouncer_id,
    p_agent_id,
    v_workspace_id,
    v_contact_name,
    v_contact_phone,
    v_agent_name,
    'running',
    'Pipeline iniciado',
    NOW(),
    0,
    false
  );
  
  RETURN v_pipeline_id;
END;
$$;

-- =========================================================================
-- FUNÇÃO: log_pipeline_step
-- =========================================================================
-- Registra um step do pipeline
-- =========================================================================

CREATE OR REPLACE FUNCTION log_pipeline_step(
  p_pipeline_id UUID,
  p_step_key TEXT,
  p_step_name TEXT,
  p_step_icon TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'running',
  p_status_message TEXT DEFAULT NULL,
  p_config JSONB DEFAULT NULL,
  p_input_summary TEXT DEFAULT NULL,
  p_input_data JSONB DEFAULT NULL,
  p_output_summary TEXT DEFAULT NULL,
  p_output_data JSONB DEFAULT NULL,
  p_tokens_input INTEGER DEFAULT NULL,
  p_tokens_output INTEGER DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_step_id UUID;
  v_step_number INTEGER;
  v_tokens_total INTEGER;
  v_cost_estimate DECIMAL(10, 6);
BEGIN
  -- Gerar UUID para o step
  v_step_id := gen_random_uuid();
  
  -- Calcular próximo número de step
  SELECT COALESCE(MAX(step_number), 0) + 1
  INTO v_step_number
  FROM ai_pipeline_steps
  WHERE pipeline_log_id = p_pipeline_id;
  
  -- Calcular tokens totais
  v_tokens_total := COALESCE(p_tokens_input, 0) + COALESCE(p_tokens_output, 0);
  
  -- Estimar custo (exemplo simplificado: $0.000001 por token)
  IF v_tokens_total > 0 THEN
    v_cost_estimate := v_tokens_total * 0.000001;
  END IF;
  
  -- Inserir step
  INSERT INTO ai_pipeline_steps (
    id,
    pipeline_log_id,
    step_number,
    step_key,
    step_name,
    step_icon,
    status,
    status_message,
    started_at,
    completed_at,
    duration_ms,
    config,
    input_summary,
    input_data,
    output_summary,
    output_data,
    tokens_input,
    tokens_output,
    tokens_total,
    cost_estimate,
    error_message
  ) VALUES (
    v_step_id,
    p_pipeline_id,
    v_step_number,
    p_step_key,
    p_step_name,
    p_step_icon,
    p_status,
    p_status_message,
    NOW(),
    CASE WHEN p_status IN ('success', 'error', 'blocked', 'skipped') THEN NOW() ELSE NULL END,
    p_duration_ms,
    p_config,
    p_input_summary,
    p_input_data,
    p_output_summary,
    p_output_data,
    p_tokens_input,
    p_tokens_output,
    v_tokens_total,
    v_cost_estimate,
    p_error_message
  );
  
  -- Atualizar contador de steps completados no pipeline
  IF p_status = 'success' THEN
    UPDATE ai_pipeline_logs
    SET steps_completed = steps_completed + 1
    WHERE id = p_pipeline_id;
  END IF;
  
  RETURN v_step_id;
END;
$$;

-- =========================================================================
-- FUNÇÃO: log_pipeline_complete
-- =========================================================================
-- Finaliza um pipeline log
-- =========================================================================

CREATE OR REPLACE FUNCTION log_pipeline_complete(
  p_pipeline_id UUID,
  p_status TEXT,
  p_status_message TEXT DEFAULT NULL,
  p_response_text TEXT DEFAULT NULL,
  p_response_sent BOOLEAN DEFAULT false,
  p_provider_message_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_step TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_total_duration_ms INTEGER;
  v_total_tokens INTEGER;
  v_total_cost DECIMAL(10, 6);
BEGIN
  -- Buscar timestamp de início
  SELECT started_at
  INTO v_started_at
  FROM ai_pipeline_logs
  WHERE id = p_pipeline_id;
  
  -- Calcular duração total
  v_total_duration_ms := EXTRACT(EPOCH FROM (NOW() - v_started_at)) * 1000;
  
  -- Calcular totais de tokens e custo dos steps
  SELECT 
    COALESCE(SUM(tokens_total), 0),
    COALESCE(SUM(cost_estimate), 0)
  INTO v_total_tokens, v_total_cost
  FROM ai_pipeline_steps
  WHERE pipeline_log_id = p_pipeline_id;
  
  -- Atualizar pipeline log
  UPDATE ai_pipeline_logs
  SET 
    status = p_status,
    status_message = p_status_message,
    completed_at = NOW(),
    total_duration_ms = v_total_duration_ms,
    total_tokens_used = v_total_tokens,
    total_cost_estimate = v_total_cost,
    response_text = p_response_text,
    response_sent = p_response_sent,
    provider_message_id = p_provider_message_id,
    error_message = p_error_message,
    error_step = p_error_step
  WHERE id = p_pipeline_id;
  
  RETURN FOUND;
END;
$$;

-- =========================================================================
-- FUNÇÃO AUXILIAR: get_pipeline_with_steps
-- =========================================================================
-- Busca pipeline completo com todos os steps (útil para debug)
-- =========================================================================

CREATE OR REPLACE FUNCTION get_pipeline_with_steps(p_pipeline_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pipeline', row_to_json(pl.*),
    'steps', (
      SELECT jsonb_agg(row_to_json(ps.*) ORDER BY ps.step_number)
      FROM ai_pipeline_steps ps
      WHERE ps.pipeline_log_id = p_pipeline_id
    )
  )
  INTO v_result
  FROM ai_pipeline_logs pl
  WHERE pl.id = p_pipeline_id;
  
  RETURN v_result;
END;
$$;

-- =========================================================================
-- COMENTÁRIOS
-- =========================================================================

COMMENT ON FUNCTION log_pipeline_start IS 'Inicia um novo pipeline log e retorna o UUID';
COMMENT ON FUNCTION log_pipeline_step IS 'Registra um step do pipeline (guardrail, RAG, LLM, tools, etc)';
COMMENT ON FUNCTION log_pipeline_complete IS 'Finaliza o pipeline log com métricas totais';
COMMENT ON FUNCTION get_pipeline_with_steps IS 'Busca pipeline completo com todos os steps (debug)';

-- =========================================================================
-- GRANTS (Garantir que service_role pode executar)
-- =========================================================================

GRANT EXECUTE ON FUNCTION log_pipeline_start TO service_role;
GRANT EXECUTE ON FUNCTION log_pipeline_step TO service_role;
GRANT EXECUTE ON FUNCTION log_pipeline_complete TO service_role;
GRANT EXECUTE ON FUNCTION get_pipeline_with_steps TO service_role;
GRANT EXECUTE ON FUNCTION log_pipeline_start TO authenticated;
GRANT EXECUTE ON FUNCTION get_pipeline_with_steps TO authenticated;
