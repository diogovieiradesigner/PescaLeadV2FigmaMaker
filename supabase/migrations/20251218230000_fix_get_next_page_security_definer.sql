-- =============================================================================
-- Migration: Fix get_next_page_for_instagram_query SECURITY DEFINER
-- =============================================================================
-- Problema: A função get_next_page_for_instagram_query não tinha SECURITY DEFINER
-- e por isso não conseguia ler a tabela instagram_search_progress com RLS ativo.
-- Resultado: A função retornava NULL, e o código usava página 1, mas o lastPage
-- era inicializado como startPage - 1 = 0, mostrando "página 0" nos logs.
-- =============================================================================

-- Recriar a função COM SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_next_page_for_instagram_query(
  p_workspace_id UUID,
  p_query_hash TEXT,
  p_query TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_page INTEGER;
  v_exhausted_queries JSONB;
BEGIN
  -- Verificar se a query está na lista de esgotadas
  SELECT exhausted_queries INTO v_exhausted_queries
  FROM instagram_search_progress
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  -- Se a query está marcada como esgotada, retornar -1
  IF v_exhausted_queries IS NOT NULL AND v_exhausted_queries ? p_query THEN
    RETURN -1;
  END IF;

  -- Buscar última página processada para esta query
  SELECT (last_page_by_query->>p_query)::INTEGER INTO v_last_page
  FROM instagram_search_progress
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  -- Se não tem registro, retornar 1 (primeira página)
  IF v_last_page IS NULL THEN
    RETURN 1;
  END IF;

  -- Retornar próxima página (última + 1)
  RETURN v_last_page + 1;
END;
$$;

COMMENT ON FUNCTION get_next_page_for_instagram_query IS
'Retorna a próxima página a ser buscada para uma query específica.
- Retorna 1 se nunca foi buscada
- Retorna -1 se a query está esgotada
- Retorna last_page + 1 caso contrário
IMPORTANTE: Usa SECURITY DEFINER para bypassar RLS.
Usado pelo loop de busca do instagram-discovery para paginação correta.';
