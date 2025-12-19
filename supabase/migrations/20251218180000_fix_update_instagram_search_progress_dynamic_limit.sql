-- =============================================================================
-- Migration: Fix Dynamic Query Exhaustion Limit
-- =============================================================================
-- Problema: A função usa >= 5 hardcoded para marcar como "totalmente esgotado",
-- mas o sistema gera 10 queries (MAX_QUERIES_PER_RUN = 10).
-- Isso faz com que 50% das queries sejam ignoradas prematuramente.
--
-- Solução: Adicionar parâmetro p_total_queries para comparação dinâmica.
-- =============================================================================

-- Drop da função existente
DROP FUNCTION IF EXISTS update_instagram_search_progress(UUID, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN);

-- Recriar com parâmetro dinâmico para total de queries
CREATE OR REPLACE FUNCTION update_instagram_search_progress(
  p_workspace_id UUID,
  p_query_hash TEXT,
  p_query TEXT,
  p_page INTEGER,
  p_results_count INTEGER,
  p_is_exhausted BOOLEAN DEFAULT FALSE,
  p_total_queries INTEGER DEFAULT 10  -- Novo parâmetro: total de queries da busca
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_exhausted_queries JSONB;
  v_exhausted_count INTEGER;
BEGIN
  -- Atualizar progresso
  UPDATE instagram_search_progress
  SET
    last_page_by_query = jsonb_set(
      COALESCE(last_page_by_query, '{}'::jsonb),
      ARRAY[p_query],
      to_jsonb(p_page)
    ),
    total_pages_consumed = total_pages_consumed + 1,
    total_results_found = total_results_found + p_results_count,
    exhausted_queries = CASE
      WHEN p_is_exhausted AND NOT (exhausted_queries ? p_query)
      THEN exhausted_queries || to_jsonb(p_query)
      ELSE exhausted_queries
    END,
    last_search_at = NOW()
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  -- Verificar se todas as queries estão esgotadas
  SELECT exhausted_queries INTO v_exhausted_queries
  FROM instagram_search_progress
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  -- Contar queries esgotadas
  v_exhausted_count := jsonb_array_length(COALESCE(v_exhausted_queries, '[]'::jsonb));

  -- Marcar como totalmente esgotado APENAS se >= total de queries
  -- Usa p_total_queries em vez de hardcoded 5
  IF v_exhausted_count >= p_total_queries THEN
    UPDATE instagram_search_progress
    SET is_fully_exhausted = TRUE
    WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;
  END IF;
END;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION update_instagram_search_progress IS
'Atualiza o progresso de busca Instagram após cada query executada.
- p_total_queries: total de queries da busca atual (padrão: 10)
- Marca como totalmente esgotado apenas quando todas as queries forem esgotadas';
