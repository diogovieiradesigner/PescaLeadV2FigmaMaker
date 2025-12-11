-- =============================================================================
-- MIGRAÇÃO: Adicionar status 'paused' ao CHECK CONSTRAINT de campaign_runs
-- =============================================================================
-- PROBLEMA: CHECK CONSTRAINT não permite status 'paused', causando erro ao pausar campanha
-- SOLUÇÃO: Atualizar constraint para incluir 'paused'
-- =============================================================================

-- Remover constraint antigo
ALTER TABLE campaign_runs
DROP CONSTRAINT IF EXISTS campaign_runs_status_check;

-- Criar novo constraint com 'paused' incluído
ALTER TABLE campaign_runs
ADD CONSTRAINT campaign_runs_status_check
CHECK (status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'paused'::text]));

-- Comentário
COMMENT ON CONSTRAINT campaign_runs_status_check ON campaign_runs IS 
'Valores permitidos para status: running, completed, failed, cancelled, paused';

