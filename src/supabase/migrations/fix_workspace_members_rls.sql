-- ============================================
-- FIX: Workspace Members RLS Permissions
-- ============================================
-- Este arquivo resolve o erro:
-- "permission denied for table workspace_members"
--
-- CAUSA: A tabela workspace_members tem RLS ativado mas não tem
-- políticas que permitam o SERVICE_ROLE_KEY acessar.
--
-- SOLUÇÃO: Criar função RPC que bypass RLS ou adicionar políticas
-- ============================================

-- Opção 1: Criar função RPC para get workspace members (RECOMENDADO)
-- Esta função roda com permissões de SECURITY DEFINER (bypass RLS)
CREATE OR REPLACE FUNCTION get_workspace_members(p_workspace_id UUID)
RETURNS TABLE (
  workspace_id UUID,
  user_id UUID,
  role TEXT,
  permissions JSONB,
  joined_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID,
  user_name TEXT,
  user_email TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.workspace_id,
    wm.user_id,
    wm.role,
    wm.permissions,
    wm.joined_at,
    wm.invited_by,
    u.name as user_name,
    u.email as user_email
  FROM workspace_members wm
  LEFT JOIN users u ON u.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id;
END;
$$;

-- Dar permissão para usar a função
GRANT EXECUTE ON FUNCTION get_workspace_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_members(UUID) TO service_role;

-- ============================================
-- Opção 2: Desabilitar RLS para SERVICE_ROLE_KEY (ALTERNATIVA)
-- ============================================
-- Esta opção desabilita RLS apenas para service_role
-- Descomente as linhas abaixo se preferir esta abordagem:

-- ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Service role has full access to workspace_members"
--   ON workspace_members
--   FOR ALL
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- ============================================
-- Opção 3: Políticas RLS Granulares (MAIS SEGURO)
-- ============================================
-- Se você quiser manter RLS ativo mas dar acesso apropriado:

-- Permitir usuários ver membros dos workspaces que eles pertencem
CREATE POLICY IF NOT EXISTS "Users can view members of their workspaces"
  ON workspace_members
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Permitir admins/owners gerenciar membros
CREATE POLICY IF NOT EXISTS "Admins can manage workspace members"
  ON workspace_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Service role bypass all policies (IMPORTANTE!)
CREATE POLICY IF NOT EXISTS "Service role bypass RLS"
  ON workspace_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Verificações
-- ============================================

-- Verificar se RLS está ativado
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'workspace_members' 
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE '✅ Tabela workspace_members existe';
    
    IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'workspace_members') THEN
      RAISE NOTICE '✅ RLS está ATIVADO na tabela workspace_members';
    ELSE
      RAISE NOTICE '⚠️  RLS está DESATIVADO na tabela workspace_members';
    END IF;
  ELSE
    RAISE NOTICE '❌ Tabela workspace_members não existe';
  END IF;
END $$;

-- Listar políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'workspace_members';
