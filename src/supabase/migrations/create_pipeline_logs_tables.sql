-- =============================================================================
-- MIGRATION: Create AI Pipeline Logs Tables
-- =============================================================================
-- Tabelas para armazenar logs detalhados da execução dos agentes de IA
-- =============================================================================

-- =========================================================================
-- Tabela: ai_pipeline_logs
-- =========================================================================
-- Armazena informações gerais sobre cada execução do pipeline de IA
-- =========================================================================

CREATE TABLE IF NOT EXISTS ai_pipeline_logs (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Informações do contato
  contact_name TEXT,
  contact_phone TEXT,
  agent_name TEXT,
  
  -- Status do pipeline
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error', 'blocked', 'partial')),
  status_message TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_duration_ms INTEGER,
  
  -- Métricas
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_estimate DECIMAL(10, 6) DEFAULT 0,
  steps_completed INTEGER DEFAULT 0,
  
  -- Resposta
  response_text TEXT,
  response_sent BOOLEAN DEFAULT FALSE,
  provider_message_id TEXT, -- ID da mensagem no WhatsApp
  
  -- Erro (se houver)
  error_message TEXT,
  error_step TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_conversation 
  ON ai_pipeline_logs(conversation_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_agent 
  ON ai_pipeline_logs(agent_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_workspace 
  ON ai_pipeline_logs(workspace_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_status 
  ON ai_pipeline_logs(status);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_started_at 
  ON ai_pipeline_logs(started_at DESC);

-- =========================================================================
-- Tabela: ai_pipeline_steps
-- =========================================================================
-- Armazena informações detalhadas sobre cada step de um pipeline
-- =========================================================================

CREATE TABLE IF NOT EXISTS ai_pipeline_steps (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_log_id UUID NOT NULL REFERENCES ai_pipeline_logs(id) ON DELETE CASCADE,
  
  -- Step info
  step_number INTEGER NOT NULL,
  step_key TEXT NOT NULL, -- guardrail_input, rag_retrieval, llm_generation, tools_execution, guardrail_output
  step_name TEXT NOT NULL,
  step_icon TEXT, -- Emoji ou ícone para UI
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped', 'blocked', 'running')),
  status_message TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Configuração (JSON flexível para cada tipo de step)
  config JSONB,
  
  -- Input/Output
  input_summary TEXT, -- Resumo legível para UI
  input_data JSONB, -- Dados completos (opcional)
  output_summary TEXT, -- Resumo legível para UI
  output_data JSONB, -- Dados completos (opcional)
  
  -- Tokens (se aplicável)
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10, 6),
  
  -- Erro (se houver)
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_pipeline 
  ON ai_pipeline_steps(pipeline_log_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_steps_step_number 
  ON ai_pipeline_steps(step_number);

CREATE INDEX IF NOT EXISTS idx_pipeline_steps_status 
  ON ai_pipeline_steps(status);

-- Índice composto para buscar steps de um pipeline ordenados
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_pipeline_ordered 
  ON ai_pipeline_steps(pipeline_log_id, step_number);

-- =========================================================================
-- Função: Atualizar updated_at automaticamente
-- =========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_pipeline_logs_updated_at
  BEFORE UPDATE ON ai_pipeline_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_steps_updated_at
  BEFORE UPDATE ON ai_pipeline_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- RLS (Row Level Security)
-- =========================================================================

-- Habilitar RLS
ALTER TABLE ai_pipeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pipeline_steps ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_pipeline_logs
-- Service role tem acesso total (necessário para Edge Functions)
CREATE POLICY "Service role has full access to pipeline logs"
  ON ai_pipeline_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários podem ver logs do seu workspace
CREATE POLICY "Users can view pipeline logs from their workspace"
  ON ai_pipeline_logs
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para ai_pipeline_steps
-- Service role tem acesso total
CREATE POLICY "Service role has full access to pipeline steps"
  ON ai_pipeline_steps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários podem ver steps dos logs do seu workspace
CREATE POLICY "Users can view pipeline steps from their workspace"
  ON ai_pipeline_steps
  FOR SELECT
  TO authenticated
  USING (
    pipeline_log_id IN (
      SELECT id 
      FROM ai_pipeline_logs 
      WHERE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =========================================================================
-- Comentários para documentação
-- =========================================================================

COMMENT ON TABLE ai_pipeline_logs IS 'Logs gerais da execução dos pipelines de IA';
COMMENT ON TABLE ai_pipeline_steps IS 'Steps detalhados de cada pipeline (RAG, LLM, tools, guardrails)';

COMMENT ON COLUMN ai_pipeline_logs.status IS 'running | success | error | blocked | partial';
COMMENT ON COLUMN ai_pipeline_steps.step_key IS 'guardrail_input | rag_retrieval | llm_generation | tools_execution | guardrail_output';
COMMENT ON COLUMN ai_pipeline_steps.status IS 'success | error | skipped | blocked | running';
