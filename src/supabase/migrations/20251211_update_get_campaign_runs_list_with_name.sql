-- Primeiro remover a função existente
DROP FUNCTION IF EXISTS get_campaign_runs_list(UUID, INTEGER, INTEGER);

-- Recriar função get_campaign_runs_list para incluir o campo name das runs
CREATE OR REPLACE FUNCTION get_campaign_runs_list(
  p_workspace_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  v_total INTEGER;
  v_runs JSON;
BEGIN
  -- Contar total de runs para este workspace
  SELECT COUNT(*)
  INTO v_total
  FROM campaign_runs cr
  JOIN campaign_configs cc ON cc.id = cr.config_id
  WHERE cc.workspace_id = p_workspace_id;

  -- Buscar runs com estatísticas
  SELECT COALESCE(json_agg(run_data ORDER BY run_data.run_date DESC), '[]'::json)
  INTO v_runs
  FROM (
    SELECT
      cr.id,
      cr.name,
      cr.run_date,
      cr.status,
      cr.started_at,
      cr.completed_at,
      COALESCE((
        SELECT COUNT(*)
        FROM campaign_messages cm
        WHERE cm.run_id = cr.id
      ), 0) as leads_total,
      COALESCE((
        SELECT COUNT(*)
        FROM campaign_messages cm
        WHERE cm.run_id = cr.id AND cm.status = 'sent'
      ), 0) as leads_success,
      COALESCE((
        SELECT COUNT(*)
        FROM campaign_messages cm
        WHERE cm.run_id = cr.id AND cm.status = 'failed'
      ), 0) as leads_failed,
      COALESCE((
        SELECT COUNT(*)
        FROM campaign_messages cm
        WHERE cm.run_id = cr.id AND cm.replied = true
      ), 0) as replied_count,
      CASE
        WHEN cr.completed_at IS NOT NULL AND cr.started_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at))::INTEGER
        ELSE 0
      END as duration_seconds,
      CASE
        WHEN cr.completed_at IS NOT NULL AND cr.started_at IS NOT NULL THEN
          CASE
            WHEN EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at)) < 60
              THEN EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at))::INTEGER || 's'
            WHEN EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at)) < 3600
              THEN (EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at)) / 60)::INTEGER || 'min'
            ELSE (EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at)) / 3600)::INTEGER || 'h ' ||
                 ((EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at))::INTEGER % 3600) / 60) || 'min'
          END
        ELSE '-'
      END as duration_formatted,
      CASE
        WHEN (SELECT COUNT(*) FROM campaign_messages cm WHERE cm.run_id = cr.id) > 0
        THEN ROUND(
          (SELECT COUNT(*) FROM campaign_messages cm WHERE cm.run_id = cr.id AND cm.status = 'sent')::NUMERIC /
          (SELECT COUNT(*) FROM campaign_messages cm WHERE cm.run_id = cr.id)::NUMERIC * 100
        , 1)
        ELSE 0
      END as success_rate
    FROM campaign_runs cr
    JOIN campaign_configs cc ON cc.id = cr.config_id
    WHERE cc.workspace_id = p_workspace_id
    ORDER BY cr.run_date DESC
    LIMIT p_limit
    OFFSET p_offset
  ) run_data;

  RETURN json_build_object(
    'total', v_total,
    'runs', v_runs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
