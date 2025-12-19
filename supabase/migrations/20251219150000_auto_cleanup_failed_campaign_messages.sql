-- Migration: Auto cleanup failed campaign messages
-- Created: 2025-12-19
-- Description: Automatically deletes messages from campaigns that were cancelled, failed, or completed
--              but never sent. Messages from paused campaigns are preserved (can be resumed).
--              This prevents leads from being "stuck" with messages that will never be sent.

-- Função para limpar mensagens de campanhas que nunca serão enviadas
CREATE OR REPLACE FUNCTION cleanup_failed_campaign_messages()
RETURNS TABLE(
  deleted_count bigint,
  freed_leads_count bigint
) AS $$
DECLARE
  v_deleted_count bigint;
  v_freed_leads_count bigint;
BEGIN
  -- Deletar mensagens de campanhas cancelled/completed/failed que nunca foram enviadas
  WITH deleted AS (
    DELETE FROM campaign_messages cm
    USING campaign_runs cr
    WHERE cm.run_id = cr.id
      AND cm.status IN ('pending', 'queued', 'generating', 'sending', 'skipped')
      AND cr.status IN ('completed', 'cancelled', 'failed')
    RETURNING cm.id, cm.lead_id
  )
  SELECT
    COUNT(*) as total_deleted,
    COUNT(DISTINCT lead_id) as total_freed_leads
  INTO v_deleted_count, v_freed_leads_count
  FROM deleted;

  deleted_count := COALESCE(v_deleted_count, 0);
  freed_leads_count := COALESCE(v_freed_leads_count, 0);

  RETURN QUERY SELECT deleted_count, freed_leads_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger automático que limpa mensagens quando uma campanha é finalizada/cancelada
CREATE OR REPLACE FUNCTION trigger_cleanup_on_campaign_end()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a campanha mudou para cancelled, completed ou failed
  IF (OLD.status != NEW.status) AND
     (NEW.status IN ('completed', 'cancelled', 'failed')) THEN

    -- Deletar todas as mensagens que não foram enviadas
    DELETE FROM campaign_messages
    WHERE run_id = NEW.id
      AND status IN ('pending', 'queued', 'generating', 'sending', 'skipped');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_cleanup_on_campaign_end ON campaign_runs;

CREATE TRIGGER trg_cleanup_on_campaign_end
  AFTER UPDATE ON campaign_runs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_on_campaign_end();

-- Executar limpeza inicial das mensagens já existentes
SELECT * FROM cleanup_failed_campaign_messages();
