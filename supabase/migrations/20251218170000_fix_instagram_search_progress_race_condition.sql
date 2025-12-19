-- =============================================================================
-- Migration: Fix Race Condition in instagram_search_progress
-- =============================================================================
-- Problema: A função get_or_create_instagram_search_progress usa SELECT → INSERT
-- sem lock, permitindo que duas chamadas simultâneas tentem inserir o mesmo registro.
--
-- Solução: Usar INSERT ... ON CONFLICT para operação atômica.
-- =============================================================================

-- Drop da função existente
DROP FUNCTION IF EXISTS get_or_create_instagram_search_progress(UUID, TEXT, TEXT, TEXT);

-- Recriar com INSERT ON CONFLICT (race condition safe)
CREATE OR REPLACE FUNCTION get_or_create_instagram_search_progress(
  p_workspace_id UUID,
  p_niche TEXT,
  p_location TEXT,
  p_query_hash TEXT
)
RETURNS instagram_search_progress
LANGUAGE plpgsql
AS $$
DECLARE
  v_progress instagram_search_progress;
BEGIN
  -- Tentar inserir primeiro (operação atômica)
  INSERT INTO instagram_search_progress (workspace_id, query_hash, niche, location)
  VALUES (p_workspace_id, p_query_hash, p_niche, p_location)
  ON CONFLICT (workspace_id, query_hash) DO NOTHING
  RETURNING * INTO v_progress;

  -- Se não inseriu (já existia), buscar o registro existente
  IF v_progress IS NULL THEN
    SELECT * INTO v_progress
    FROM instagram_search_progress
    WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;
  END IF;

  RETURN v_progress;
END;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION get_or_create_instagram_search_progress IS
'Obtém ou cria registro de progresso de busca Instagram.
Usa INSERT ON CONFLICT para evitar race conditions em chamadas simultâneas.';
