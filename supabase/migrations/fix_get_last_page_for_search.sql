-- =============================================================================
-- CORREÇÃO: Função get_last_page_for_search
-- =============================================================================
-- PROBLEMA: Função estava SOMANDO pages_consumed de todas as extrações
-- SOLUÇÃO: Retornar MÁXIMA página processada considerando todas as fontes
-- =============================================================================

CREATE OR REPLACE FUNCTION get_last_page_for_search(
  p_workspace_id UUID,
  p_search_term TEXT,
  p_location TEXT
)
RETURNS INTEGER AS $$
DECLARE
  max_page INTEGER := 0;
  page_target INTEGER;
  page_compensation INTEGER;
  page_filter_compensation INTEGER;
BEGIN
  -- Buscar a MÁXIMA página processada (não somar!)
  -- Considera:
  -- 1. last_page_target (páginas iniciais)
  -- 2. last_compensation_page (compensação)
  -- 3. last_filter_compensation_page (compensação por filtros)
  -- 4. pages_consumed (fallback)
  
  -- Usar tratamento seguro para evitar erros de cast
  SELECT MAX(
    GREATEST(
      -- Tratamento seguro: tenta converter, se falhar usa 0
      COALESCE(
        CASE 
          WHEN (progress_data->>'last_page_target') ~ '^[0-9]+$' 
          THEN (progress_data->>'last_page_target')::INTEGER
          ELSE 0
        END,
        0
      ),
      COALESCE(
        CASE 
          WHEN (progress_data->>'last_compensation_page') ~ '^[0-9]+$' 
          THEN (progress_data->>'last_compensation_page')::INTEGER
          ELSE 0
        END,
        0
      ),
      COALESCE(
        CASE 
          WHEN (progress_data->>'last_filter_compensation_page') ~ '^[0-9]+$' 
          THEN (progress_data->>'last_filter_compensation_page')::INTEGER
          ELSE 0
        END,
        0
      ),
      COALESCE(pages_consumed, 0)
    )
  )
  INTO max_page
  FROM lead_extraction_runs
  WHERE workspace_id = p_workspace_id
    -- CRÍTICO: Comparação EXATA de termo e localização (normalizado)
    -- IMPORTANTE: Apenas extrações com EXATAMENTE o mesmo termo e localização são consideradas
    -- Normalização: Remove espaços no início/fim e converte para minúsculas
    -- Isso garante que "Rio de Janeiro" = "rio de janeiro" = "Rio de Janeiro " (após normalização)
    -- Mas "Rio de Janeiro" ≠ "São Paulo" (localizações diferentes)
    AND LOWER(TRIM(BOTH ' ' FROM search_term)) = LOWER(TRIM(BOTH ' ' FROM p_search_term))
    AND LOWER(TRIM(BOTH ' ' FROM location)) = LOWER(TRIM(BOTH ' ' FROM p_location))
    AND status IN ('completed', 'cancelled', 'failed', 'running')  -- Incluir 'running' para considerar extrações em andamento
    AND pages_consumed > 0;
  
  RETURN COALESCE(max_page, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Comentário da função
COMMENT ON FUNCTION get_last_page_for_search(UUID, TEXT, TEXT) IS 
'Retorna a MÁXIMA página processada para uma busca específica, considerando páginas iniciais, compensação e compensação por filtros. CORRIGIDO: Não soma mais, retorna máximo.';

