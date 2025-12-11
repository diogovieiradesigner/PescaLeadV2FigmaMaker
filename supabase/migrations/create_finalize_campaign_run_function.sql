-- =============================================================================
-- FUNÇÃO SQL: finalize_campaign_run_if_complete
-- =============================================================================
-- CORREÇÃO: Finalização atômica de campanha para evitar race conditions
-- Só finaliza se status = 'running' E leads_processed >= leads_total
-- =============================================================================

CREATE OR REPLACE FUNCTION finalize_campaign_run_if_complete(p_run_id UUID)
RETURNS TABLE(
  finalized BOOLEAN,
  leads_total INTEGER,
  leads_processed INTEGER
) AS $$
DECLARE
  v_run RECORD;
BEGIN
  -- Buscar run com lock para evitar race condition
  SELECT 
    id,
    status,
    leads_total,
    leads_processed
  INTO v_run
  FROM campaign_runs
  WHERE id = p_run_id
    AND status = 'running'
    AND leads_processed >= leads_total
  FOR UPDATE SKIP LOCKED; -- Lock apenas se encontrar, skip se já estiver locked
  
  -- Se encontrou e condições atendidas, finalizar
  IF v_run.id IS NOT NULL THEN
    UPDATE campaign_runs
    SET 
      status = 'completed',
      completed_at = NOW()
    WHERE id = p_run_id;
    
    RETURN QUERY SELECT TRUE, v_run.leads_total, v_run.leads_processed;
  ELSE
    -- Não finalizou (não encontrou ou condições não atendidas)
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION finalize_campaign_run_if_complete(UUID) IS 
'Finaliza campanha atomicamente se leads_processed >= leads_total. Retorna TRUE se finalizou, FALSE caso contrário.';

