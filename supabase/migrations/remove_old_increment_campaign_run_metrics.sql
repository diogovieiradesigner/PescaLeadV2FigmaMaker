-- =============================================================================
-- MIGRAÇÃO: Remover versão antiga de increment_campaign_run_metrics
-- =============================================================================
-- PROBLEMA: Existem 2 versões da função no banco, causando comportamento imprevisível
-- SOLUÇÃO: Remover versão antiga (p_field, p_increment) e manter apenas a nova
-- =============================================================================

-- Verificar se versão antiga existe antes de remover
DO $$
BEGIN
  -- Remover versão antiga: increment_campaign_run_metrics(p_run_id uuid, p_field text, p_increment integer)
  -- Esta versão usa EXECUTE format() e é menos segura
  DROP FUNCTION IF EXISTS public.increment_campaign_run_metrics(uuid, text, integer);
  
  RAISE NOTICE 'Versão antiga de increment_campaign_run_metrics removida (se existia)';
END $$;

-- Verificar que apenas a versão nova existe
-- Versão nova: increment_campaign_run_metrics(p_run_id uuid, p_success integer DEFAULT 0, p_failed integer DEFAULT 0, p_skipped integer DEFAULT 0)
-- Esta versão é a correta e está sendo usada pelo código

-- Comentário de confirmação
COMMENT ON FUNCTION public.increment_campaign_run_metrics(uuid, integer, integer, integer) IS 
'Incrementa métricas de campanha atomicamente. Parâmetros: p_success, p_failed, p_skipped são INCREMENTOS (não valores absolutos).';

