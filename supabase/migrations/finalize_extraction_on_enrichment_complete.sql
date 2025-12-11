-- =============================================================================
-- MIGRATION: Finalização Automática de Extrações quando Enriquecimento Completa
-- =============================================================================
-- PROBLEMA: Extrações ficam em status 'enriching' indefinidamente mesmo quando
-- todos os leads já completaram o enriquecimento.
-- 
-- SOLUÇÃO: Trigger automático que verifica quando todos os leads completam
-- enriquecimento e finaliza a extração automaticamente.
-- =============================================================================

-- =============================================================================
-- FUNÇÃO SQL: finalize_extraction_if_enrichment_complete
-- =============================================================================
-- Finaliza automaticamente extrações em status 'enriching' quando todos os
-- leads em staging têm status_enrichment = 'completed' ou foram migrados
-- =============================================================================

CREATE OR REPLACE FUNCTION finalize_extraction_if_enrichment_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_run_id UUID;
  v_pending_count INTEGER;
  v_total_staging INTEGER;
  v_run_status TEXT;
BEGIN
  -- Obter run_id do lead que foi atualizado
  v_run_id := NEW.extraction_run_id;
  
  -- Verificar se a run está em status 'enriching'
  SELECT status INTO v_run_status
  FROM lead_extraction_runs 
  WHERE id = v_run_id;
  
  IF v_run_status = 'enriching' THEN
    -- Contar leads em staging que ainda não completaram enriquecimento
    SELECT 
      COUNT(*) FILTER (WHERE status_enrichment != 'completed'),
      COUNT(*)
    INTO v_pending_count, v_total_staging
    FROM lead_extraction_staging
    WHERE extraction_run_id = v_run_id;
    
    -- Se não há leads pendentes OU não há leads em staging, finalizar
    IF v_pending_count = 0 THEN
      -- Todos os leads completaram enriquecimento - finalizar extração
      UPDATE lead_extraction_runs
      SET 
        status = 'completed',
        finished_at = COALESCE(finished_at, NOW()),
        execution_time_ms = CASE 
          WHEN execution_time_ms IS NULL AND started_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000::BIGINT
          ELSE execution_time_ms
        END,
        current_step = 'Extração concluída',
        completed_steps = 9,
        progress_data = jsonb_set(
          COALESCE(progress_data, '{}'::jsonb),
          '{enrichment_completed_at}',
          to_jsonb(NOW()::text)
        )
      WHERE id = v_run_id
        AND status = 'enriching';
      
      -- Log de finalização automática
      INSERT INTO extraction_logs (run_id, step_number, step_name, level, message, details)
      VALUES (
        v_run_id,
        9,
        'Finalização',
        'success',
        '✅ Extração finalizada automaticamente: todos os leads completaram enriquecimento',
        jsonb_build_object(
          'auto_finalized', true,
          'reason', 'all_enrichments_complete',
          'total_staging', v_total_staging,
          'pending_before', v_pending_count
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER: trg_finalize_extraction_on_enrichment_complete
-- =============================================================================
-- Executa quando status_enrichment muda para 'completed'
-- Verifica se todos os leads da extração completaram e finaliza automaticamente
-- =============================================================================

DROP TRIGGER IF EXISTS trg_finalize_extraction_on_enrichment_complete ON lead_extraction_staging;

CREATE TRIGGER trg_finalize_extraction_on_enrichment_complete
  AFTER UPDATE OF status_enrichment ON lead_extraction_staging
  FOR EACH ROW
  WHEN (NEW.status_enrichment = 'completed' AND OLD.status_enrichment != 'completed')
  EXECUTE FUNCTION finalize_extraction_if_enrichment_complete();

-- =============================================================================
-- FUNÇÃO RPC: finalize_stuck_enriching_extractions
-- =============================================================================
-- Corrige extrações que estão em 'enriching' mas todos os leads já completaram
-- Pode ser chamada manualmente ou por um cron job
-- =============================================================================

CREATE OR REPLACE FUNCTION finalize_stuck_enriching_extractions()
RETURNS TABLE(
  run_id UUID,
  finalized BOOLEAN,
  reason TEXT,
  pending_count INTEGER,
  total_staging INTEGER
) AS $$
DECLARE
  v_run RECORD;
  v_pending_count INTEGER;
  v_total_staging INTEGER;
BEGIN
  -- Buscar todas as extrações em 'enriching'
  FOR v_run IN 
    SELECT id, started_at
    FROM lead_extraction_runs
    WHERE status = 'enriching'
  LOOP
    -- Contar leads pendentes
    SELECT 
      COUNT(*) FILTER (WHERE status_enrichment != 'completed'),
      COUNT(*)
    INTO v_pending_count, v_total_staging
    FROM lead_extraction_staging
    WHERE extraction_run_id = v_run.id;
    
    -- Se não há pendentes, finalizar
    IF v_pending_count = 0 THEN
      UPDATE lead_extraction_runs
      SET 
        status = 'completed',
        finished_at = COALESCE(finished_at, NOW()),
        execution_time_ms = CASE 
          WHEN execution_time_ms IS NULL AND v_run.started_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (NOW() - v_run.started_at)) * 1000::BIGINT
          ELSE execution_time_ms
        END,
        current_step = 'Extração concluída',
        completed_steps = 9,
        progress_data = jsonb_set(
          COALESCE(progress_data, '{}'::jsonb),
          '{enrichment_completed_at}',
          to_jsonb(NOW()::text),
          '{auto_finalized_by_function}',
          'true'::jsonb
        )
      WHERE id = v_run.id;
      
      -- Log de finalização
      INSERT INTO extraction_logs (run_id, step_number, step_name, level, message, details)
      VALUES (
        v_run.id,
        9,
        'Finalização',
        'success',
        '✅ Extração finalizada pela função finalize_stuck_enriching_extractions',
        jsonb_build_object(
          'auto_finalized', true,
          'reason', 'all_enrichments_complete',
          'total_staging', v_total_staging,
          'function', 'finalize_stuck_enriching_extractions'
        )
      );
      
      RETURN QUERY SELECT 
        v_run.id,
        TRUE,
        'all_enrichments_complete'::TEXT,
        v_pending_count,
        v_total_staging;
    ELSE
      RETURN QUERY SELECT 
        v_run.id,
        FALSE,
        'still_pending'::TEXT,
        v_pending_count,
        v_total_staging;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION finalize_extraction_if_enrichment_complete() IS 
'Trigger function que finaliza automaticamente extrações em enriching quando todos os leads completam enriquecimento';

COMMENT ON FUNCTION finalize_stuck_enriching_extractions() IS 
'Função RPC para corrigir extrações travadas em enriching. Retorna lista de runs processadas e se foram finalizadas.';

