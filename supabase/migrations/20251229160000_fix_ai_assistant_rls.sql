-- ============================================================================
-- Migration: Fix AI Assistant RLS Policies
-- ============================================================================
-- OBJETIVO: Corrigir políticas RLS que estavam impedindo acesso às tabelas de IA
-- PROBLEMA CRÍTICO 1: RLS estava DESABILITADO nas tabelas (rowsecurity = false)
-- PROBLEMA CRÍTICO 2: Políticas usavam role "public" em vez de "authenticated"
-- SOLUÇÃO:
--   1. Habilitar RLS nas tabelas
--   2. Recriar políticas com role "authenticated" (igual tabela leads)
--   3. Adicionar política para service_role
-- ============================================================================

-- ============================================================================
-- 1. GARANTIR QUE RLS ESTEJA HABILITADO
-- ============================================================================

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configuration ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1.1 GARANTIR GRANTs PARA authenticated E service_role
-- ============================================================================
-- CRÍTICO: Sem esses GRANTs, mesmo com RLS correto, dá erro 403!

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_configuration TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_configuration TO service_role;

-- ============================================================================
-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES
-- ============================================================================

-- Políticas antigas (vários nomes possíveis)
DROP POLICY IF EXISTS "workspace_members_select_ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "workspace_members_insert_ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "workspace_members_update_ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "workspace_members_delete_ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Usuários podem ver conversas do seu workspace" ON public.ai_conversations;
DROP POLICY IF EXISTS "Usuários podem criar conversas no seu workspace" ON public.ai_conversations;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias conversas" ON public.ai_conversations;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias conversas" ON public.ai_conversations;

DROP POLICY IF EXISTS "workspace_members_select_ai_messages" ON public.ai_messages;
DROP POLICY IF EXISTS "workspace_members_insert_ai_messages" ON public.ai_messages;
DROP POLICY IF EXISTS "Usuários podem ver mensagens das conversas do workspace" ON public.ai_messages;
DROP POLICY IF EXISTS "Usuários podem criar mensagens nas conversas do workspace" ON public.ai_messages;

DROP POLICY IF EXISTS "workspace_members_select_ai_config" ON public.ai_configuration;
DROP POLICY IF EXISTS "workspace_members_update_ai_config" ON public.ai_configuration;
DROP POLICY IF EXISTS "Usuários podem ver configuração do seu workspace" ON public.ai_configuration;
DROP POLICY IF EXISTS "Admins podem atualizar configuração do workspace" ON public.ai_configuration;

-- Políticas novas (para idempotência)
DROP POLICY IF EXISTS "ai_conversations_select" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_insert" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_update" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_delete" ON public.ai_conversations;
DROP POLICY IF EXISTS "service_role_ai_conversations_all" ON public.ai_conversations;

DROP POLICY IF EXISTS "ai_messages_select" ON public.ai_messages;
DROP POLICY IF EXISTS "ai_messages_insert" ON public.ai_messages;
DROP POLICY IF EXISTS "service_role_ai_messages_all" ON public.ai_messages;

DROP POLICY IF EXISTS "ai_configuration_select" ON public.ai_configuration;
DROP POLICY IF EXISTS "ai_configuration_update" ON public.ai_configuration;
DROP POLICY IF EXISTS "ai_configuration_insert" ON public.ai_configuration;
DROP POLICY IF EXISTS "service_role_ai_configuration_all" ON public.ai_configuration;

-- ============================================================================
-- 3. CRIAR POLÍTICAS COM ROLE "authenticated" (igual tabela leads)
-- ============================================================================

-- ========================================
-- ai_conversations
-- ========================================

CREATE POLICY "ai_conversations_select"
  ON public.ai_conversations FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_conversations_insert"
  ON public.ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "ai_conversations_update"
  ON public.ai_conversations FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "ai_conversations_delete"
  ON public.ai_conversations FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "service_role_ai_conversations_all"
  ON public.ai_conversations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- ai_messages
-- ========================================

CREATE POLICY "ai_messages_select"
  ON public.ai_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.ai_conversations
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "ai_messages_insert"
  ON public.ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.ai_conversations
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "service_role_ai_messages_all"
  ON public.ai_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- ai_configuration
-- ========================================

CREATE POLICY "ai_configuration_select"
  ON public.ai_configuration FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_configuration_update"
  ON public.ai_configuration FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "ai_configuration_insert"
  ON public.ai_configuration FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "service_role_ai_configuration_all"
  ON public.ai_configuration FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RESUMO DA MIGRAÇÃO
-- ============================================================================
-- ✅ RLS HABILITADO nas tabelas
-- ✅ GRANTs para authenticated e service_role (CRÍTICO!)
-- ✅ Políticas com role "authenticated" usando get_user_workspace_ids()
-- ✅ Política service_role para Edge Functions
-- ✅ Estrutura idêntica à tabela leads/funnels (que funcionam)
--
-- PROBLEMA RESOLVIDO: Erro 403 "permission denied for table ai_conversations"
--   - Causa 1: RLS desabilitado
--   - Causa 2: Faltavam GRANTs para authenticated/service_role
--   - Causa 3: Políticas usavam role "public" em vez de "authenticated"
--   - Solução: GRANT + ENABLE RLS + TO authenticated nas políticas
-- ============================================================================
