-- =============================================================================
-- Migration: Corrigir RLS nas tabelas Instagram
-- Modelo: instagram_search_progress (migration 20251218190000)
-- Auditoria: Edge Functions usam SERVICE_ROLE_KEY (bypass RLS)
-- Auditoria: Frontend usa workspace_members pattern
-- =============================================================================

-- Drop policies antigas genéricas
DROP POLICY IF EXISTS "Full access instagram_discovery_results" ON instagram_discovery_results;
DROP POLICY IF EXISTS "Full access instagram_enriched_profiles" ON instagram_enriched_profiles;

-- =============================================================================
-- TABELA: instagram_discovery_results
-- Modelo: instagram_search_progress com todas as operações
-- =============================================================================
ALTER TABLE instagram_discovery_results ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Edge Functions)
CREATE POLICY "service_role_instagram_discovery_all"
  ON instagram_discovery_results FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- SELECT: Membros do workspace
CREATE POLICY "workspace_members_select_instagram_discovery"
  ON instagram_discovery_results FOR SELECT TO authenticated
  USING (
    run_id IN (
      SELECT id FROM lead_extraction_runs
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: Membros do workspace
CREATE POLICY "workspace_members_insert_instagram_discovery"
  ON instagram_discovery_results FOR INSERT TO authenticated
  WITH CHECK (
    run_id IN (
      SELECT id FROM lead_extraction_runs
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE: Membros do workspace (NOVO - faltava)
CREATE POLICY "workspace_members_update_instagram_discovery"
  ON instagram_discovery_results FOR UPDATE TO authenticated
  USING (
    run_id IN (
      SELECT id FROM lead_extraction_runs
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    run_id IN (
      SELECT id FROM lead_extraction_runs
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE: Apenas admins (NOVO - padrão instagram_search_progress)
CREATE POLICY "workspace_admins_delete_instagram_discovery"
  ON instagram_discovery_results FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN lead_extraction_runs ler ON ler.workspace_id = wm.workspace_id
      WHERE ler.id = instagram_discovery_results.run_id
        AND wm.user_id = auth.uid()
        AND wm.role = ANY(ARRAY['owner', 'admin'])
    )
  );

-- =============================================================================
-- TABELA: instagram_enriched_profiles
-- Modelo: instagram_search_progress com todas as operações
-- =============================================================================
ALTER TABLE instagram_enriched_profiles ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_instagram_enriched_all"
  ON instagram_enriched_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- SELECT: Membros do workspace
CREATE POLICY "workspace_members_select_instagram_enriched"
  ON instagram_enriched_profiles FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Membros do workspace
CREATE POLICY "workspace_members_insert_instagram_enriched"
  ON instagram_enriched_profiles FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Membros do workspace
CREATE POLICY "workspace_members_update_instagram_enriched"
  ON instagram_enriched_profiles FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: Apenas admins (NOVO - padrão instagram_search_progress)
CREATE POLICY "workspace_admins_delete_instagram_enriched"
  ON instagram_enriched_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = instagram_enriched_profiles.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = ANY(ARRAY['owner', 'admin'])
    )
  );

-- =============================================================================
-- TABELA: instagram_query_cache
-- NOTA: É um cache GLOBAL baseado em hash de query (niche + location)
-- NÃO tem run_id nem workspace_id - é acessado apenas via functions SECURITY DEFINER
-- A policy "Service role full access" já existe (migration 20251218160000)
-- Nenhuma alteração necessária
-- =============================================================================

-- Comentários
COMMENT ON TABLE instagram_discovery_results IS 'Perfis descobertos via Serper.dev - RLS habilitado';
COMMENT ON TABLE instagram_enriched_profiles IS 'Perfis enriquecidos via Bright Data - RLS habilitado';
COMMENT ON TABLE instagram_query_cache IS 'Cache de queries para paginação - RLS habilitado';
