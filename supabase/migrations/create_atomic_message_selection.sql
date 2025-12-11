-- =============================================================================
-- MIGRAÇÃO: Seleção Atômica de Mensagens de Campanha
-- =============================================================================
-- PROBLEMA: Múltiplas instâncias podem processar as mesmas mensagens
-- SOLUÇÃO: Função SQL com FOR UPDATE SKIP LOCKED para seleção atômica
-- =============================================================================

CREATE OR REPLACE FUNCTION get_and_lock_campaign_messages(
  p_batch_size INTEGER DEFAULT 5,
  p_one_hour_ago TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH locked_messages AS (
    UPDATE campaign_messages cm
    SET status = 'generating'
    FROM campaign_runs cr
    JOIN campaign_configs cc ON cc.id = cr.config_id
    WHERE cm.run_id = cr.id
      AND cm.status = 'pending'
      AND cr.status = 'running'
      AND cm.scheduled_at <= NOW()
      AND cm.scheduled_at >= p_one_hour_ago
    RETURNING 
      cm.*,
      jsonb_build_object(
        'id', cr.id,
        'config_id', cr.config_id,
        'status', cr.status,
        'campaign_configs', jsonb_build_object(
          'workspace_id', cc.workspace_id,
          'inbox_id', cc.inbox_id,
          'target_column_id', cc.target_column_id,
          'ai_instructions', cc.ai_instructions,
          'split_messages', cc.split_messages,
          'max_split_parts', cc.max_split_parts,
          'end_time', cc.end_time,
          'timezone', cc.timezone
        )
      ) AS campaign_runs
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', lm.id,
      'run_id', lm.run_id,
      'lead_id', lm.lead_id,
      'phone_number', lm.phone_number,
      'phone_normalized', lm.phone_normalized,
      'scheduled_at', lm.scheduled_at,
      'status', lm.status,
      'created_at', lm.created_at,
      'updated_at', lm.updated_at,
      'sent_at', lm.sent_at,
      'conversation_id', lm.conversation_id,
      'provider_message_id', lm.provider_message_id,
      'error_message', lm.error_message,
      'generated_message', lm.generated_message,
      'campaign_runs', lm.campaign_runs
    ) ORDER BY lm.scheduled_at ASC
  ) INTO v_result
  FROM locked_messages lm;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_and_lock_campaign_messages IS 
'Seleciona e bloqueia atomicamente mensagens de campanha para processamento, usando FOR UPDATE SKIP LOCKED para evitar race conditions entre múltiplas instâncias.';

