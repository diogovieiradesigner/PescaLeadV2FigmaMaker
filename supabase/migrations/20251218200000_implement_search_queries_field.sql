-- =============================================================================
-- Migration: Implement search_queries Field Usage
-- =============================================================================
-- Problema: O campo search_queries existe mas não é usado (sempre []).
--
-- Solução: Atualizar a função get_or_create para receber e salvar as queries.
-- Também atualizar update_instagram_search_progress para adicionar novas queries.
-- =============================================================================

-- Drop da função existente
DROP FUNCTION IF EXISTS get_or_create_instagram_search_progress(UUID, TEXT, TEXT, TEXT);

-- Recriar com parâmetro para queries
CREATE OR REPLACE FUNCTION get_or_create_instagram_search_progress(
  p_workspace_id UUID,
  p_niche TEXT,
  p_location TEXT,
  p_query_hash TEXT,
  p_queries JSONB DEFAULT '[]'::jsonb  -- Novo parâmetro: lista de queries
)
RETURNS instagram_search_progress
LANGUAGE plpgsql
AS $$
DECLARE
  v_progress instagram_search_progress;
BEGIN
  -- Tentar inserir primeiro (operação atômica)
  INSERT INTO instagram_search_progress (workspace_id, query_hash, niche, location, search_queries)
  VALUES (p_workspace_id, p_query_hash, p_niche, p_location, COALESCE(p_queries, '[]'::jsonb))
  ON CONFLICT (workspace_id, query_hash) DO UPDATE
    SET search_queries = CASE
      -- Se já tem queries, manter; se não, usar as novas
      WHEN jsonb_array_length(instagram_search_progress.search_queries) > 0
      THEN instagram_search_progress.search_queries
      ELSE COALESCE(EXCLUDED.search_queries, '[]'::jsonb)
    END
  RETURNING * INTO v_progress;

  RETURN v_progress;
END;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION get_or_create_instagram_search_progress IS
'Obtém ou cria registro de progresso de busca Instagram.
- p_queries: lista de queries de busca (opcional)
- Usa INSERT ON CONFLICT para evitar race conditions
- Preserva queries existentes se já houver';

-- =============================================================================
-- Também criar função auxiliar para obter queries salvas
-- =============================================================================
CREATE OR REPLACE FUNCTION get_instagram_search_queries(
  p_workspace_id UUID,
  p_query_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_queries JSONB;
BEGIN
  SELECT search_queries INTO v_queries
  FROM instagram_search_progress
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  RETURN COALESCE(v_queries, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_instagram_search_queries IS
'Retorna as queries de busca salvas para um workspace/hash específico.';
