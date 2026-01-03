-- ============================================
-- REMOVE: Limite diário do AI Data Tools
-- Mantém apenas limite por minuto (100/min)
-- ============================================

CREATE OR REPLACE FUNCTION check_ai_tool_rate_limit(
  p_workspace_id UUID,
  p_max_per_minute INT DEFAULT 100,
  p_max_per_day INT DEFAULT 999999999  -- Efetivamente sem limite diário
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit ai_tool_rate_limits%ROWTYPE;
BEGIN
  -- Upsert rate limit record
  INSERT INTO ai_tool_rate_limits (workspace_id)
  VALUES (p_workspace_id)
  ON CONFLICT (workspace_id) DO UPDATE
  SET workspace_id = EXCLUDED.workspace_id
  RETURNING * INTO v_limit;

  -- Reset minute window if expired (mais de 1 minuto desde último reset)
  IF v_limit.minute_window < NOW() - INTERVAL '1 minute' THEN
    UPDATE ai_tool_rate_limits
    SET minute_count = 1, minute_window = NOW()
    WHERE workspace_id = p_workspace_id;

    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Check minute limit only (sem limite diário)
  IF v_limit.minute_count >= p_max_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'minute_limit',
      'retry_after', 60
    );
  END IF;

  -- Increment minute counter only
  UPDATE ai_tool_rate_limits
  SET minute_count = minute_count + 1
  WHERE workspace_id = p_workspace_id;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Resetar contadores existentes para permitir uso imediato
UPDATE ai_tool_rate_limits
SET minute_count = 0,
    minute_window = NOW(),
    daily_count = 0;

