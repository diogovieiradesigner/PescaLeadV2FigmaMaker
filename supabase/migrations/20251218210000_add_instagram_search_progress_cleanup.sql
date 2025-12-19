-- =============================================================================
-- Migration: Add Cleanup for instagram_search_progress
-- =============================================================================
-- Problema: Registros de progresso de busca podem acumular indefinidamente,
-- ocupando espaço com dados obsoletos.
--
-- Solução: Criar função de cleanup e índice para registros antigos.
-- =============================================================================

-- =============================================================================
-- Índice para otimizar busca por registros antigos (índice simples)
-- Nota: Não usar WHERE com NOW() pois funções não-imutáveis não são permitidas
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_instagram_search_progress_last_search_at
  ON instagram_search_progress (last_search_at);

-- =============================================================================
-- Função de cleanup para registros antigos (> 30 dias sem atividade)
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_instagram_search_progress(
  p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM instagram_search_progress
  WHERE last_search_at < NOW() - (p_days_old || ' days')::INTERVAL;

  -- Retornar quantidade deletada
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_instagram_search_progress IS
'Remove registros de progresso de busca Instagram com mais de X dias sem atividade.
Padrão: 30 dias. Pode ser chamado via cron job ou manualmente.';

-- =============================================================================
-- Função para resetar progresso de uma busca específica
-- (útil quando usuário quer recomeçar do zero)
-- =============================================================================
CREATE OR REPLACE FUNCTION reset_instagram_search_progress(
  p_workspace_id UUID,
  p_query_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE instagram_search_progress
  SET
    last_page_by_query = '{}'::jsonb,
    exhausted_queries = '[]'::jsonb,
    is_fully_exhausted = FALSE,
    total_pages_consumed = 0,
    total_results_found = 0,
    last_search_at = NOW()
  WHERE workspace_id = p_workspace_id AND query_hash = p_query_hash;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION reset_instagram_search_progress IS
'Reseta o progresso de uma busca específica, permitindo recomeçar do zero.
Útil quando usuário quer refazer uma busca que estava esgotada.';

-- =============================================================================
-- Conceder permissão para service_role executar cleanup
-- =============================================================================
GRANT EXECUTE ON FUNCTION cleanup_old_instagram_search_progress TO service_role;
GRANT EXECUTE ON FUNCTION reset_instagram_search_progress TO service_role;
GRANT EXECUTE ON FUNCTION reset_instagram_search_progress TO authenticated;
