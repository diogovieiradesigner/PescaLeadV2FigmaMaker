-- ============================================
-- AI SYSTEM TOOLS
-- Migration: Create AI tools system for function calling
-- ============================================

-- ============================================
-- 1. AI SYSTEM TOOLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_system_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  required_params TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  requires_calendar BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_system_tools_workspace ON ai_system_tools(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_system_tools_name ON ai_system_tools(name);
CREATE INDEX IF NOT EXISTS idx_ai_system_tools_active ON ai_system_tools(workspace_id, is_active);

-- Constraint único para evitar tools duplicadas por workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_system_tools_unique
ON ai_system_tools(workspace_id, name);

-- ============================================
-- 2. RPC FUNCTION: get_agent_tools
-- Retorna tools no formato OpenAI function calling
-- ============================================
CREATE OR REPLACE FUNCTION get_agent_tools(p_agent_id UUID)
RETURNS JSONB[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id UUID;
  v_has_calendar BOOLEAN;
  v_tools JSONB[];
BEGIN
  -- Buscar workspace do agente
  SELECT a.workspace_id INTO v_workspace_id
  FROM ai_agents a
  WHERE a.id = p_agent_id;

  IF v_workspace_id IS NULL THEN
    RETURN ARRAY[]::JSONB[];
  END IF;

  -- Verificar se workspace tem calendário configurado
  SELECT EXISTS(
    SELECT 1 FROM calendar_settings cs
    WHERE cs.workspace_id = v_workspace_id
    AND cs.is_active = true
  ) INTO v_has_calendar;

  -- Buscar tools ativas do workspace
  SELECT ARRAY_AGG(
    jsonb_build_object(
      'type', 'function',
      'function', jsonb_build_object(
        'name', t.name,
        'description', t.description,
        'parameters', jsonb_build_object(
          'type', 'object',
          'properties', COALESCE(t.parameters, '{}'::jsonb),
          'required', COALESCE(t.required_params, ARRAY[]::text[])
        )
      )
    )
  )
  INTO v_tools
  FROM ai_system_tools t
  WHERE t.workspace_id = v_workspace_id
  AND t.is_active = true
  AND (t.requires_calendar = false OR v_has_calendar = true);

  RETURN COALESCE(v_tools, ARRAY[]::JSONB[]);
END;
$$;

-- ============================================
-- 3. DEFAULT TOOLS - Inserir tools padrão para workspaces
-- ============================================

-- Função para criar tools padrão para um workspace
CREATE OR REPLACE FUNCTION create_default_ai_tools(p_workspace_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Tool: agendar_reuniao
  INSERT INTO ai_system_tools (workspace_id, name, description, parameters, required_params, requires_calendar)
  VALUES (
    p_workspace_id,
    'agendar_reuniao',
    'Agenda uma reunião/compromisso no calendário. Use quando o cliente quiser marcar uma reunião, visita, demonstração ou qualquer tipo de compromisso.',
    '{
      "titulo": {"type": "string", "description": "Título do evento"},
      "data": {"type": "string", "description": "Data no formato YYYY-MM-DD"},
      "horario": {"type": "string", "description": "Horário no formato HH:MM"},
      "duracao_minutos": {"type": "integer", "description": "Duração em minutos (padrão: 60)"},
      "tipo": {"type": "string", "enum": ["meeting", "call", "demo", "reminder"], "description": "Tipo do evento"},
      "descricao": {"type": "string", "description": "Descrição adicional (opcional)"},
      "local": {"type": "string", "description": "Local ou link da reunião (opcional)"}
    }'::jsonb,
    ARRAY['titulo', 'data', 'horario'],
    true
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Tool: consultar_disponibilidade
  INSERT INTO ai_system_tools (workspace_id, name, description, parameters, required_params, requires_calendar)
  VALUES (
    p_workspace_id,
    'consultar_disponibilidade',
    'Consulta horários disponíveis no calendário para agendamento. Use quando o cliente perguntar sobre horários disponíveis.',
    '{
      "data": {"type": "string", "description": "Data para consultar no formato YYYY-MM-DD"},
      "duracao_minutos": {"type": "integer", "description": "Duração desejada em minutos (padrão: 60)"}
    }'::jsonb,
    ARRAY['data'],
    true
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Tool: transferir_para_humano
  INSERT INTO ai_system_tools (workspace_id, name, description, parameters, required_params, requires_calendar)
  VALUES (
    p_workspace_id,
    'transferir_para_humano',
    'Transfere o atendimento para um atendente humano. Use quando o cliente solicitar falar com uma pessoa, quando não conseguir ajudar, ou em situações delicadas.',
    '{
      "motivo": {"type": "string", "description": "Motivo da transferência"},
      "urgencia": {"type": "string", "enum": ["baixa", "media", "alta"], "description": "Nível de urgência"}
    }'::jsonb,
    ARRAY['motivo'],
    false
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Tool: finalizar_atendimento
  INSERT INTO ai_system_tools (workspace_id, name, description, parameters, required_params, requires_calendar)
  VALUES (
    p_workspace_id,
    'finalizar_atendimento',
    'Finaliza o atendimento com o cliente. Use quando a conversa chegou ao fim natural, o cliente foi atendido ou não deseja mais continuar.',
    '{
      "motivo": {"type": "string", "description": "Motivo do encerramento"},
      "resumo": {"type": "string", "description": "Resumo do atendimento"}
    }'::jsonb,
    ARRAY['motivo'],
    false
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Tool: buscar_informacoes_lead
  INSERT INTO ai_system_tools (workspace_id, name, description, parameters, required_params, requires_calendar)
  VALUES (
    p_workspace_id,
    'buscar_informacoes_lead',
    'Busca informações sobre o lead/cliente atual na base de dados. Use para obter histórico, dados de contato ou informações anteriores.',
    '{}'::jsonb,
    ARRAY[]::text[],
    false
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;

  -- Tool: atualizar_informacoes_lead
  INSERT INTO ai_system_tools (workspace_id, name, description, parameters, required_params, requires_calendar)
  VALUES (
    p_workspace_id,
    'atualizar_informacoes_lead',
    'Atualiza informações do lead/cliente. Use quando o cliente fornecer novos dados como email, telefone ou empresa.',
    '{
      "email": {"type": "string", "description": "Email do cliente"},
      "telefone": {"type": "string", "description": "Telefone do cliente"},
      "empresa": {"type": "string", "description": "Empresa do cliente"},
      "cargo": {"type": "string", "description": "Cargo do cliente"},
      "notas": {"type": "string", "description": "Notas adicionais"}
    }'::jsonb,
    ARRAY[]::text[],
    false
  )
  ON CONFLICT (workspace_id, name) DO NOTHING;
END;
$$;

-- ============================================
-- 4. TRIGGER: Criar tools padrão ao criar workspace
-- ============================================
CREATE OR REPLACE FUNCTION trigger_create_default_ai_tools()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_ai_tools(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspace_default_ai_tools ON workspaces;
CREATE TRIGGER trigger_workspace_default_ai_tools
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_ai_tools();

-- ============================================
-- 5. RLS POLICIES
-- ============================================
ALTER TABLE ai_system_tools ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários podem ver tools do seu workspace
DROP POLICY IF EXISTS "Users can view workspace ai tools" ON ai_system_tools;
CREATE POLICY "Users can view workspace ai tools"
  ON ai_system_tools FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Usuários podem criar tools no seu workspace
DROP POLICY IF EXISTS "Users can create workspace ai tools" ON ai_system_tools;
CREATE POLICY "Users can create workspace ai tools"
  ON ai_system_tools FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Usuários podem atualizar tools do seu workspace
DROP POLICY IF EXISTS "Users can update workspace ai tools" ON ai_system_tools;
CREATE POLICY "Users can update workspace ai tools"
  ON ai_system_tools FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: Usuários podem deletar tools do seu workspace
DROP POLICY IF EXISTS "Users can delete workspace ai tools" ON ai_system_tools;
CREATE POLICY "Users can delete workspace ai tools"
  ON ai_system_tools FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 6. SERVICE ROLE ACCESS (para edge functions)
-- ============================================
-- Permitir que service role acesse as tools
DROP POLICY IF EXISTS "Service role can access all ai tools" ON ai_system_tools;
CREATE POLICY "Service role can access all ai tools"
  ON ai_system_tools FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 7. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE ai_system_tools IS 'Ferramentas/funções disponíveis para a IA usar durante conversas';
COMMENT ON FUNCTION get_agent_tools(UUID) IS 'Retorna as tools disponíveis para um agente no formato OpenAI function calling';
COMMENT ON FUNCTION create_default_ai_tools(UUID) IS 'Cria as tools padrão para um workspace';
