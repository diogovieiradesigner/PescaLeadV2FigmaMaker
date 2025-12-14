-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/sql/new
-- =====================================================

-- Função RPC para validar acesso ao chat público
-- Chamada pelo frontend PublicChat.tsx para verificar slug + código de acesso

CREATE OR REPLACE FUNCTION validate_public_chat_access(
  p_slug TEXT,
  p_access_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link RECORD;
  v_agent RECORD;
BEGIN
  -- Buscar link pelo slug
  SELECT * INTO v_link
  FROM ai_public_chat_links
  WHERE public_slug = p_slug
  AND is_active = true;

  -- Verificar se link existe
  IF v_link IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Link não encontrado ou inativo'
    );
  END IF;

  -- Verificar código de acesso (case insensitive)
  IF UPPER(v_link.access_code) != UPPER(p_access_code) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Senha incorreta'
    );
  END IF;

  -- Verificar expiração
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Link expirado'
    );
  END IF;

  -- Verificar limite de conversas
  IF v_link.max_conversations IS NOT NULL AND v_link.current_conversations >= v_link.max_conversations THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Limite de conversas atingido'
    );
  END IF;

  -- Buscar informações do agente
  SELECT name INTO v_agent
  FROM ai_agents
  WHERE id = v_link.agent_id;

  -- Retornar sucesso com dados necessários
  RETURN json_build_object(
    'success', true,
    'link_id', v_link.id,
    'agent_id', v_link.agent_id,
    'workspace_id', v_link.workspace_id,
    'chat_title', COALESCE(v_link.chat_title, v_agent.name, 'Assistente Virtual'),
    'chat_subtitle', v_link.chat_subtitle,
    'welcome_message', v_link.welcome_message
  );
END;
$$;

-- Permitir execução anônima (para usuários não autenticados)
GRANT EXECUTE ON FUNCTION validate_public_chat_access(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_public_chat_access(TEXT, TEXT) TO authenticated;

-- Garantir que a coluna reset_count existe
ALTER TABLE ai_public_chat_links ADD COLUMN IF NOT EXISTS reset_count INTEGER DEFAULT 0;

-- Garantir que as colunas de personalização existem
ALTER TABLE ai_public_chat_links ADD COLUMN IF NOT EXISTS chat_title TEXT;
ALTER TABLE ai_public_chat_links ADD COLUMN IF NOT EXISTS chat_subtitle TEXT;

-- Verificar se foi criado
SELECT 'Função criada com sucesso!' as status;
