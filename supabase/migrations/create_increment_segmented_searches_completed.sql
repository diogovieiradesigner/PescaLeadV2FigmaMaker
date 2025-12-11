-- =============================================================================
-- FUNÇÃO SQL: increment_segmented_searches_completed
-- =============================================================================
-- V16: Incrementa atomicamente o campo segmented_searches_completed em progress_data
-- Resolve race condition quando múltiplas páginas segmentadas processam simultaneamente
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_segmented_searches_completed(p_run_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_value INTEGER;
BEGIN
  -- Incremento atômico usando UPDATE com RETURNING
  UPDATE lead_extraction_runs
  SET progress_data = jsonb_set(
    progress_data,
    '{segmented_searches_completed}',
    to_jsonb(
      COALESCE((progress_data->>'segmented_searches_completed')::INTEGER, 0) + 1
    )
  )
  WHERE id = p_run_id
  RETURNING (progress_data->>'segmented_searches_completed')::INTEGER INTO v_new_value;
  
  -- Se não encontrou o registro, retornar 0
  IF v_new_value IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN v_new_value;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION increment_segmented_searches_completed(UUID) IS 
'V16: Incrementa atomicamente segmented_searches_completed em progress_data para evitar race conditions';

