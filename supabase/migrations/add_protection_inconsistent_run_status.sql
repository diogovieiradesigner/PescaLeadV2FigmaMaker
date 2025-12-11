-- =============================================================================
-- MIGRATION: Proteções para Estado Inconsistente de Extrações
-- =============================================================================
-- PROBLEMA: Extrações podem ficar com status 'running' mas finished_at preenchido,
-- causando confusão no frontend (mostra "Executando" mas já finalizou).
-- 
-- SOLUÇÃO: 
-- 1. Trigger que corrige automaticamente inconsistências
-- 2. Função RPC para corrigir casos históricos
-- 3. Validação adicional para evitar criação de estados inconsistentes
-- =============================================================================

-- =============================================================================
-- FUNÇÃO SQL: fix_inconsistent_run_status
-- =============================================================================
-- Corrige automaticamente runs que têm finished_at preenchido mas status
-- não é 'completed', 'failed' ou 'cancelled'
-- =============================================================================

CREATE OR REPLACE FUNCTION fix_inconsistent_run_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se finished_at está preenchido mas status não é completed/failed/cancelled
  -- E completed_steps = 9 (indica que finalizou), corrigir status
  IF NEW.finished_at IS NOT NULL 
     AND NEW.status NOT IN ('completed', 'failed', 'cancelled') 
     AND NEW.completed_steps = 9 THEN
    NEW.status := 'completed';
    
    -- Log da correção automática
    INSERT INTO extraction_logs (run_id, step_number, step_name, level, message, details)
    VALUES (
      NEW.id,
      9,
      'Correção Automática',
      'info',
      '✅ Status corrigido automaticamente: finished_at preenchido mas status era ' || OLD.status,
      jsonb_build_object(
        'auto_fixed', true,
        'old_status', OLD.status,
        'new_status', 'completed',
        'reason', 'finished_at_prefilled_with_wrong_status'
      )
    );
  END IF;
  
  -- Se status é 'completed' mas finished_at está NULL e completed_steps = 9,
  -- definir finished_at como NOW() se started_at existe
  IF NEW.status = 'completed'
     AND NEW.finished_at IS NULL
     AND NEW.completed_steps = 9
     AND NEW.started_at IS NOT NULL THEN
    NEW.finished_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fix_inconsistent_run_status() IS 
'Trigger function que corrige automaticamente inconsistências entre status e finished_at em lead_extraction_runs';

-- =============================================================================
-- TRIGGER: trg_fix_inconsistent_run_status
-- =============================================================================
-- Executa antes de UPDATE em lead_extraction_runs
-- Corrige automaticamente estados inconsistentes
-- =============================================================================

DROP TRIGGER IF EXISTS trg_fix_inconsistent_run_status ON lead_extraction_runs;

CREATE TRIGGER trg_fix_inconsistent_run_status
  BEFORE UPDATE ON lead_extraction_runs
  FOR EACH ROW
  WHEN (
    -- Dispara quando finished_at muda de NULL para NOT NULL
    (OLD.finished_at IS NULL AND NEW.finished_at IS NOT NULL)
    OR
    -- Ou quando status muda para completed mas finished_at está NULL
    (NEW.status = 'completed' AND NEW.finished_at IS NULL AND NEW.completed_steps = 9)
    OR
    -- Ou quando finished_at está preenchido mas status não é completed/failed/cancelled
    (NEW.finished_at IS NOT NULL AND NEW.status NOT IN ('completed', 'failed', 'cancelled') AND NEW.completed_steps = 9)
  )
  EXECUTE FUNCTION fix_inconsistent_run_status();

-- =============================================================================
-- FUNÇÃO RPC: fix_runs_with_inconsistent_status
-- =============================================================================
-- Corrige runs históricos que têm estado inconsistente
-- Pode ser chamada manualmente ou por um cron job
-- =============================================================================

CREATE OR REPLACE FUNCTION fix_runs_with_inconsistent_status()
RETURNS TABLE(
  run_id UUID,
  run_name TEXT,
  old_status TEXT,
  fixed BOOLEAN,
  reason TEXT,
  fixed_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_run RECORD;
  v_fixed_count INTEGER := 0;
BEGIN
  -- Buscar todas as runs com estado inconsistente
  FOR v_run IN 
    SELECT 
      ler.id,
      ler.run_name,
      ler.status,
      ler.finished_at,
      ler.completed_steps,
      ler.started_at
    FROM lead_extraction_runs ler
    WHERE (
      -- Caso 1: finished_at preenchido mas status não é completed/failed/cancelled
      (finished_at IS NOT NULL 
       AND status NOT IN ('completed', 'failed', 'cancelled')
       AND completed_steps = 9)
      OR
      -- Caso 2: status é completed mas finished_at está NULL
      (status = 'completed'
       AND finished_at IS NULL
       AND completed_steps = 9
       AND started_at IS NOT NULL)
    )
  LOOP
    -- Corrigir status
    IF v_run.finished_at IS NOT NULL 
       AND v_run.status NOT IN ('completed', 'failed', 'cancelled')
       AND v_run.completed_steps = 9 THEN
      -- Caso 1: finished_at preenchido mas status errado
      UPDATE lead_extraction_runs
      SET status = 'completed'
      WHERE id = v_run.id;
      
      -- Log da correção
      INSERT INTO extraction_logs (run_id, step_number, step_name, level, message, details)
      VALUES (
        v_run.id,
        9,
        'Correção Manual',
        'info',
        '✅ Status corrigido pela função fix_runs_with_inconsistent_status',
        jsonb_build_object(
          'auto_fixed', true,
          'old_status', v_run.status,
          'new_status', 'completed',
          'reason', 'finished_at_prefilled_with_wrong_status',
          'function', 'fix_runs_with_inconsistent_status'
        )
      );
      
      RETURN QUERY SELECT 
        v_run.id,
        v_run.run_name,
        v_run.status,
        TRUE,
        'finished_at preenchido mas status era ' || v_run.status,
        NOW();
        
      v_fixed_count := v_fixed_count + 1;
      
    ELSIF v_run.status = 'completed'
          AND v_run.finished_at IS NULL
          AND v_run.completed_steps = 9
          AND v_run.started_at IS NOT NULL THEN
      -- Caso 2: status completed mas finished_at NULL
      UPDATE lead_extraction_runs
      SET finished_at = COALESCE(finished_at, NOW())
      WHERE id = v_run.id;
      
      -- Log da correção
      INSERT INTO extraction_logs (run_id, step_number, step_name, level, message, details)
      VALUES (
        v_run.id,
        9,
        'Correção Manual',
        'info',
        '✅ finished_at corrigido pela função fix_runs_with_inconsistent_status',
        jsonb_build_object(
          'auto_fixed', true,
          'reason', 'status_completed_but_finished_at_null',
          'function', 'fix_runs_with_inconsistent_status'
        )
      );
      
      RETURN QUERY SELECT 
        v_run.id,
        v_run.run_name,
        v_run.status,
        TRUE,
        'status completed mas finished_at estava NULL',
        NOW();
        
      v_fixed_count := v_fixed_count + 1;
    END IF;
  END LOOP;
  
  -- Se não encontrou nenhuma, retornar mensagem
  IF v_fixed_count = 0 THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      'Nenhuma run inconsistente encontrada'::TEXT,
      NULL::TEXT,
      FALSE,
      'Nenhuma correção necessária'::TEXT,
      NOW();
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fix_runs_with_inconsistent_status() IS 
'Função RPC para corrigir runs históricas com estado inconsistente entre status e finished_at. Retorna lista de runs corrigidas.';

-- =============================================================================
-- CORREÇÃO IMEDIATA: Aplicar correção nas runs existentes
-- =============================================================================

-- Executar função para corrigir runs existentes
SELECT * FROM fix_runs_with_inconsistent_status();

