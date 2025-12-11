-- ============================================
-- Função: get_and_lock_campaign_messages
-- Descrição: Busca e trava mensagens de campanha para processamento
-- Usa FOR UPDATE SKIP LOCKED para evitar race conditions
-- ============================================

CREATE OR REPLACE FUNCTION public.get_and_lock_campaign_messages(
  p_batch_size INTEGER DEFAULT 5,
  p_one_hour_ago TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 hour'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_messages JSONB;
BEGIN
  -- Buscar mensagens pendentes que já passaram do horário agendado
  -- Usa FOR UPDATE SKIP LOCKED para evitar que múltiplas instâncias processem a mesma mensagem
  WITH locked_messages AS (
    SELECT
      cm.id,
      cm.run_id,
      cm.lead_id,
      cm.phone_number,
      cm.phone_normalized,
      cm.scheduled_at,
      cm.status,
      cm.retry_count,
      cr.id AS "campaign_runs.id",
      cr.config_id AS "campaign_runs.config_id",
      cr.status AS "campaign_runs.status",
      jsonb_build_object(
        'id', cc.id,
        'workspace_id', cc.workspace_id,
        'inbox_id', cc.inbox_id,
        'source_column_id', cc.source_column_id,
        'target_column_id', cc.target_column_id,
        'ai_instructions', cc.ai_instructions,
        'split_messages', cc.split_messages,
        'max_split_parts', cc.max_split_parts,
        'start_time', cc.start_time,
        'end_time', cc.end_time,
        'timezone', cc.timezone
      ) AS "campaign_runs.campaign_configs"
    FROM campaign_messages cm
    INNER JOIN campaign_runs cr ON cr.id = cm.run_id
    INNER JOIN campaign_configs cc ON cc.id = cr.config_id
    WHERE cm.status = 'pending'
      AND cm.scheduled_at <= NOW()
      AND cm.scheduled_at > p_one_hour_ago
      AND cr.status = 'running'
    ORDER BY cm.scheduled_at ASC
    LIMIT p_batch_size
    FOR UPDATE OF cm SKIP LOCKED
  ),
  updated_messages AS (
    UPDATE campaign_messages
    SET status = 'queued'
    WHERE id IN (SELECT id FROM locked_messages)
    RETURNING id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', lm.id,
        'run_id', lm.run_id,
        'lead_id', lm.lead_id,
        'phone_number', lm.phone_number,
        'phone_normalized', lm.phone_normalized,
        'scheduled_at', lm.scheduled_at,
        'status', lm.status,
        'retry_count', lm.retry_count,
        'campaign_runs', jsonb_build_object(
          'id', lm."campaign_runs.id",
          'config_id', lm."campaign_runs.config_id",
          'status', lm."campaign_runs.status",
          'campaign_configs', lm."campaign_runs.campaign_configs"
        )
      )
    ),
    '[]'::jsonb
  ) INTO v_messages
  FROM locked_messages lm;

  RETURN v_messages;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_and_lock_campaign_messages TO service_role;
GRANT EXECUTE ON FUNCTION public.get_and_lock_campaign_messages TO authenticated;

-- Comentário
COMMENT ON FUNCTION public.get_and_lock_campaign_messages IS 'Busca e trava mensagens de campanha para processamento atômico';
