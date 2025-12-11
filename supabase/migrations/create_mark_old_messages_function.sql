-- =============================================================================
-- MIGRAÇÃO: Função para Marcar Mensagens Antigas como Skipped
-- =============================================================================
-- PROBLEMA: Query de mensagens antigas executada sempre, mesmo sem necessidade
-- SOLUÇÃO: Função SQL otimizada que retorna count de mensagens marcadas
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_old_campaign_messages_as_skipped(
  p_one_hour_ago TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE campaign_messages cm
    SET 
      status = 'skipped',
      error_message = 'Mensagem agendada há mais de 1 hora - muito antiga para processar',
      updated_at = NOW()
    FROM campaign_runs cr
    WHERE cm.run_id = cr.id
      AND cm.status = 'pending'
      AND cr.status = 'running'
      AND cm.scheduled_at < p_one_hour_ago
    RETURNING cm.id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_old_campaign_messages_as_skipped IS 
'Marca mensagens de campanha antigas (> 1 hora) como skipped. Retorna número de mensagens marcadas. Otimizada para executar apenas quando necessário.';

