-- ============================================================================
-- Migration: Create AI Assistant Tables
-- ============================================================================
-- OBJETIVO: Sistema completo de chat com IA (estilo ChatGPT) usando Chutes.ai
-- MUDANÇAS:
--   1. ai_conversations - Conversas do usuário com a IA
--   2. ai_messages - Mensagens individuais (system/user/assistant)
--   3. ai_configuration - Configuração por workspace (modelo dinâmico via API)
-- ============================================================================

-- ============================================================================
-- 1. TABELA: ai_conversations
-- ============================================================================
CREATE TABLE public.ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova Conversa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_ai_conversations_workspace ON public.ai_conversations(workspace_id);
CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_updated ON public.ai_conversations(updated_at DESC);

COMMENT ON TABLE public.ai_conversations IS
'Conversas do assistente IA (threads estilo ChatGPT)';

-- ============================================================================
-- 2. TABELA: ai_messages
-- ============================================================================
CREATE TABLE public.ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice composto para queries rápidas de mensagens por conversa
CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at ASC);

COMMENT ON TABLE public.ai_messages IS
'Mensagens individuais nas conversas de IA (system/user/assistant)';

-- ============================================================================
-- 3. TABELA: ai_configuration
-- ============================================================================
CREATE TABLE public.ai_configuration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  model_id TEXT DEFAULT 'llama-3.2-1b-instruct',
  system_message TEXT DEFAULT 'Você é um assistente útil treinado para responder em português do Brasil. Seja conciso e direto.',
  temperature NUMERIC(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 500 CHECK (max_tokens > 0 AND max_tokens <= 4096),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para lookup rápido por workspace
CREATE INDEX idx_ai_configuration_workspace ON public.ai_configuration(workspace_id);

COMMENT ON TABLE public.ai_configuration IS
'Configuração do assistente IA por workspace (modelo dinâmico via https://llm.chutes.ai/v1/models)';

COMMENT ON COLUMN public.ai_configuration.model_id IS
'ID do modelo (buscado dinamicamente de https://llm.chutes.ai/v1/models)';

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configuration ENABLE ROW LEVEL SECURITY;

-- Policies para ai_conversations
CREATE POLICY "Usuários podem ver conversas do seu workspace"
  ON public.ai_conversations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem criar conversas no seu workspace"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ) AND user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas próprias conversas"
  ON public.ai_conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas próprias conversas"
  ON public.ai_conversations FOR DELETE
  USING (user_id = auth.uid());

-- Policies para ai_messages
CREATE POLICY "Usuários podem ver mensagens das conversas do workspace"
  ON public.ai_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.ai_conversations
    WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Usuários podem criar mensagens nas conversas do workspace"
  ON public.ai_messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.ai_conversations
    WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Policies para ai_configuration
CREATE POLICY "Usuários podem ver configuração do seu workspace"
  ON public.ai_configuration FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins podem atualizar configuração do workspace"
  ON public.ai_configuration FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ============================================================================
-- 5. TRIGGERS E FUNCTIONS
-- ============================================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER ai_configuration_updated_at
  BEFORE UPDATE ON public.ai_configuration
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

-- Trigger para gerar título da conversa automaticamente
CREATE OR REPLACE FUNCTION auto_generate_conversation_title()
RETURNS TRIGGER AS $$
DECLARE
  first_message TEXT;
  generated_title TEXT;
BEGIN
  -- Apenas para primeira mensagem de usuário
  IF NEW.role = 'user' THEN
    SELECT content INTO first_message
    FROM public.ai_messages
    WHERE conversation_id = NEW.conversation_id AND role = 'user'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Se esta for a primeira mensagem, gerar título
    IF first_message = NEW.content THEN
      generated_title := LEFT(NEW.content, 50);
      IF LENGTH(NEW.content) > 50 THEN
        generated_title := generated_title || '...';
      END IF;

      UPDATE public.ai_conversations
      SET title = generated_title, updated_at = NOW()
      WHERE id = NEW.conversation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_title_on_first_message
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_conversation_title();

-- ============================================================================
-- 6. DADOS INICIAIS
-- ============================================================================

-- Inserir configuração padrão para todos os workspaces existentes
INSERT INTO public.ai_configuration (workspace_id)
SELECT id FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

-- ============================================================================
-- RESUMO DA MIGRAÇÃO
-- ============================================================================
-- ✅ ai_conversations - Threads de conversa (título auto-gerado)
-- ✅ ai_messages - Mensagens individuais (system/user/assistant)
-- ✅ ai_configuration - Config por workspace (modelo dinâmico)
-- ✅ RLS policies - Segurança por workspace
-- ✅ Auto-update timestamps - Triggers para updated_at
-- ✅ Auto-title generation - Título gerado da primeira mensagem
-- ✅ Configuração padrão - Inserida para workspaces existentes
-- ============================================================================
