-- =============================================================================
-- Migration: Enable RLS on instagram_search_progress
-- =============================================================================
-- Problema: RLS está desabilitado, permitindo acesso não autorizado via API.
--
-- Solução: Habilitar RLS e criar políticas seguindo o padrão de lead_extraction_runs.
-- =============================================================================

-- Habilitar RLS
ALTER TABLE instagram_search_progress ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Política 1: Service role bypass (para Edge Functions)
-- =============================================================================
CREATE POLICY "service_role_instagram_search_progress_all"
  ON instagram_search_progress
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- Política 2: SELECT - Membros do workspace podem ver progresso
-- =============================================================================
CREATE POLICY "workspace_members_select_instagram_search_progress"
  ON instagram_search_progress
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- Política 3: INSERT - Membros do workspace podem criar progresso
-- =============================================================================
CREATE POLICY "workspace_members_insert_instagram_search_progress"
  ON instagram_search_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- Política 4: UPDATE - Membros do workspace podem atualizar progresso
-- =============================================================================
CREATE POLICY "workspace_members_update_instagram_search_progress"
  ON instagram_search_progress
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- Política 5: DELETE - Apenas admins do workspace podem deletar
-- =============================================================================
CREATE POLICY "workspace_admins_delete_instagram_search_progress"
  ON instagram_search_progress
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_members
      WHERE workspace_members.workspace_id = instagram_search_progress.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = ANY(ARRAY['owner', 'admin'])
    )
  );

-- Adicionar comentário
COMMENT ON TABLE instagram_search_progress IS
'Armazena progresso de paginação persistente para buscas Instagram.
RLS habilitado - acesso restrito a membros do workspace.';
