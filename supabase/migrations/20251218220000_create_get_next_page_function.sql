-- =============================================================================
-- Migration: Create get_next_page_for_instagram_query Function
-- =============================================================================
-- Problema: O código TypeScript chama get_next_page_for_instagram_query()
-- mas essa função nunca foi criada. Resultado: sempre retorna NULL (página 1).
--
-- Solução: Criar a função que retorna a próxima página a ser buscada
-- para cada query específica, baseado no histórico salvo em last_page_by_query.
-- =============================================================================

-- Função para obter próxima página de uma query específica
CREATE OR REPLACE FUNCTION get_next_page_for_instagram_query(
  p_workspace_id UUID,
  p_query_hash TEXT,
  p_query TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_page INTEGER;
  v_exhausted_queries JSONB;
  v_is_exhausted BOOLEAN;
BEGIN
  -- Verificar se a query está na lista de esgotadas
  SELECT exhausted_queries INTO v_exhausted_queries
  FROM instagram_search_progress
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  -- Se a query está marcada como esgotada, retornar -1
  IF v_exhausted_queries ? p_query THEN
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
Usado pelo loop de busca do instagram-discovery para paginação correta.';

-- =============================================================================
-- Índice para otimizar busca por query específica no JSONB
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_instagram_search_progress_query_hash_workspace
  ON instagram_search_progress (workspace_id, query_hash);
