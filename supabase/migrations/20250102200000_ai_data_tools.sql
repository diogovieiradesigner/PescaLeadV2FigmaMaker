-- Migration: AI Data Tools
-- Implements secure RPC functions for AI assistant to query/update workspace data
-- Security: SECURITY DEFINER, rate limiting, role-based permissions, audit logging

-- ============================================
-- 1. COLUNA DE CONFIG
-- ============================================
ALTER TABLE ai_configuration
ADD COLUMN IF NOT EXISTS data_tools_enabled BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. TABELA DE RATE LIMITING
-- ============================================
CREATE TABLE IF NOT EXISTS ai_tool_rate_limits (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  minute_count INT DEFAULT 0,
  minute_window TIMESTAMPTZ DEFAULT NOW(),
  daily_count INT DEFAULT 0,
  daily_window DATE DEFAULT CURRENT_DATE
);

-- ============================================
-- 3. TABELA DE AUDITORIA
-- ============================================
CREATE TABLE IF NOT EXISTS ai_tool_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  result_summary JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_audit_workspace ON ai_tool_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_audit_created ON ai_tool_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tool_audit_user ON ai_tool_audit_log(user_id);

-- ============================================
-- 4. FUNÇÃO DE RATE LIMIT
-- ============================================
CREATE OR REPLACE FUNCTION check_ai_tool_rate_limit(
  p_workspace_id UUID,
  p_max_per_minute INT DEFAULT 100,
  p_max_per_day INT DEFAULT 1000
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

  -- Reset minute window if expired
  IF v_limit.minute_window < NOW() - INTERVAL '1 minute' THEN
    UPDATE ai_tool_rate_limits
    SET minute_count = 1, minute_window = NOW()
    WHERE workspace_id = p_workspace_id;

    -- Also check/reset daily
    IF v_limit.daily_window < CURRENT_DATE THEN
      UPDATE ai_tool_rate_limits
      SET daily_count = 1, daily_window = CURRENT_DATE
      WHERE workspace_id = p_workspace_id;
    ELSE
      UPDATE ai_tool_rate_limits
      SET daily_count = daily_count + 1
      WHERE workspace_id = p_workspace_id;

      IF v_limit.daily_count >= p_max_per_day THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'retry_after', 86400);
      END IF;
    END IF;

    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Check minute limit
  IF v_limit.minute_count >= p_max_per_minute THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'minute_limit', 'retry_after', 60);
  END IF;

  -- Reset daily window if new day
  IF v_limit.daily_window < CURRENT_DATE THEN
    UPDATE ai_tool_rate_limits
    SET daily_count = 1, daily_window = CURRENT_DATE, minute_count = minute_count + 1
    WHERE workspace_id = p_workspace_id;
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Check daily limit
  IF v_limit.daily_count >= p_max_per_day THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'retry_after', 86400);
  END IF;

  -- Increment counters
  UPDATE ai_tool_rate_limits
  SET minute_count = minute_count + 1, daily_count = daily_count + 1
  WHERE workspace_id = p_workspace_id;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ============================================
-- 5. FUNÇÃO DE CHECK PERMISSION
-- ============================================
CREATE OR REPLACE FUNCTION ai_check_write_permission(
  p_workspace_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;

  -- Owner, admin, member podem escrever; viewer não pode
  RETURN COALESCE(v_role IN ('owner', 'admin', 'member'), FALSE);
END;
$$;

-- ============================================
-- 6. SEARCH LEADS (SEGURO)
-- ============================================
CREATE OR REPLACE FUNCTION ai_search_leads(
  p_workspace_id UUID,
  p_filters JSONB DEFAULT '{}',
  p_sort JSONB DEFAULT '{"field": "created_at", "order": "desc"}',
  p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_limit INT := LEAST(COALESCE(p_limit, 50), 100);
  v_rate_check JSONB;
  v_sort_field TEXT;
  v_sort_order TEXT;
BEGIN
  -- Rate limit check
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Rate limit: ' || (v_rate_check->>'reason'), 'retry_after', v_rate_check->'retry_after');
  END IF;

  -- Parse sort options
  v_sort_field := COALESCE(p_sort->>'field', 'created_at');
  v_sort_order := COALESCE(p_sort->>'order', 'desc');

  -- Execute query with all filters
  SELECT jsonb_agg(row_to_json(sub))
  INTO v_result
  FROM (
    SELECT
      l.id,
      l.client_name,
      l.phone,
      l.email,
      l.deal_value,
      l.status,
      l.created_at,
      l.updated_at,
      fc.id as column_id,
      fc.title as stage_name,
      f.id as funnel_id,
      f.name as funnel_name
    FROM leads l
    LEFT JOIN funnel_columns fc ON l.column_id = fc.id
    LEFT JOIN funnels f ON fc.funnel_id = f.id
    WHERE l.workspace_id = p_workspace_id
      AND (p_filters->>'client_name' IS NULL
           OR l.client_name ILIKE '%' || (p_filters->>'client_name') || '%')
      AND (p_filters->>'phone' IS NULL
           OR l.phone ILIKE '%' || (p_filters->>'phone') || '%')
      AND (p_filters->>'email' IS NULL
           OR l.email ILIKE '%' || (p_filters->>'email') || '%')
      AND (p_filters->>'status' IS NULL
           OR l.status = p_filters->>'status')
      AND (p_filters->>'funnel_id' IS NULL
           OR f.id = (p_filters->>'funnel_id')::UUID)
      AND (p_filters->>'column_id' IS NULL
           OR l.column_id = (p_filters->>'column_id')::UUID)
      AND (p_filters->>'min_value' IS NULL
           OR l.deal_value >= (p_filters->>'min_value')::NUMERIC)
      AND (p_filters->>'max_value' IS NULL
           OR l.deal_value <= (p_filters->>'max_value')::NUMERIC)
      AND (p_filters->>'created_after' IS NULL
           OR l.created_at >= (p_filters->>'created_after')::TIMESTAMPTZ)
      AND (p_filters->>'created_before' IS NULL
           OR l.created_at <= (p_filters->>'created_before')::TIMESTAMPTZ)
    ORDER BY
      CASE WHEN v_sort_field = 'created_at' AND v_sort_order = 'asc' THEN l.created_at END ASC,
      CASE WHEN v_sort_field = 'created_at' AND v_sort_order = 'desc' THEN l.created_at END DESC,
      CASE WHEN v_sort_field = 'updated_at' AND v_sort_order = 'asc' THEN l.updated_at END ASC,
      CASE WHEN v_sort_field = 'updated_at' AND v_sort_order = 'desc' THEN l.updated_at END DESC,
      CASE WHEN v_sort_field = 'deal_value' AND v_sort_order = 'asc' THEN l.deal_value END ASC,
      CASE WHEN v_sort_field = 'deal_value' AND v_sort_order = 'desc' THEN l.deal_value END DESC,
      CASE WHEN v_sort_field = 'client_name' AND v_sort_order = 'asc' THEN l.client_name END ASC,
      CASE WHEN v_sort_field = 'client_name' AND v_sort_order = 'desc' THEN l.client_name END DESC
    LIMIT v_limit
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_result, '[]'::jsonb),
    'count', COALESCE(jsonb_array_length(v_result), 0)
  );
END;
$$;

-- ============================================
-- 7. PIPELINE STATS (SEGURO)
-- ============================================
CREATE OR REPLACE FUNCTION ai_get_pipeline_stats(
  p_workspace_id UUID,
  p_funnel_id UUID DEFAULT NULL,
  p_date_start DATE DEFAULT NULL,
  p_date_end DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_rate_check JSONB;
  v_total_leads INT;
  v_total_value NUMERIC;
  v_by_stage JSONB;
  v_by_status JSONB;
BEGIN
  -- Rate limit check
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Rate limit: ' || (v_rate_check->>'reason'));
  END IF;

  -- Get totals
  SELECT COUNT(*), COALESCE(SUM(l.deal_value), 0)
  INTO v_total_leads, v_total_value
  FROM leads l
  LEFT JOIN funnel_columns fc ON l.column_id = fc.id
  WHERE l.workspace_id = p_workspace_id
    AND (p_funnel_id IS NULL OR fc.funnel_id = p_funnel_id)
    AND (p_date_start IS NULL OR l.created_at >= p_date_start)
    AND (p_date_end IS NULL OR l.created_at <= p_date_end);

  -- Get by stage
  SELECT jsonb_agg(jsonb_build_object(
    'stage_id', fc.id,
    'stage_name', fc.title,
    'funnel_name', f.name,
    'count', stage_data.cnt,
    'value', stage_data.total_value,
    'position', fc.position
  ) ORDER BY f.name, fc.position)
  INTO v_by_stage
  FROM (
    SELECT
      l.column_id,
      COUNT(*) as cnt,
      COALESCE(SUM(l.deal_value), 0) as total_value
    FROM leads l
    LEFT JOIN funnel_columns fc2 ON l.column_id = fc2.id
    WHERE l.workspace_id = p_workspace_id
      AND (p_funnel_id IS NULL OR fc2.funnel_id = p_funnel_id)
      AND (p_date_start IS NULL OR l.created_at >= p_date_start)
      AND (p_date_end IS NULL OR l.created_at <= p_date_end)
    GROUP BY l.column_id
  ) stage_data
  JOIN funnel_columns fc ON stage_data.column_id = fc.id
  JOIN funnels f ON fc.funnel_id = f.id;

  -- Get by status
  SELECT jsonb_agg(jsonb_build_object(
    'status', status,
    'count', cnt,
    'value', total_value
  ))
  INTO v_by_status
  FROM (
    SELECT
      l.status,
      COUNT(*) as cnt,
      COALESCE(SUM(l.deal_value), 0) as total_value
    FROM leads l
    LEFT JOIN funnel_columns fc ON l.column_id = fc.id
    WHERE l.workspace_id = p_workspace_id
      AND (p_funnel_id IS NULL OR fc.funnel_id = p_funnel_id)
      AND (p_date_start IS NULL OR l.created_at >= p_date_start)
      AND (p_date_end IS NULL OR l.created_at <= p_date_end)
    GROUP BY l.status
  ) status_data;

  RETURN jsonb_build_object(
    'success', true,
    'total_leads', v_total_leads,
    'total_value', v_total_value,
    'by_stage', COALESCE(v_by_stage, '[]'::jsonb),
    'by_status', COALESCE(v_by_status, '[]'::jsonb)
  );
END;
$$;

-- ============================================
-- 8. UPDATE LEAD (SEGURO)
-- ============================================
CREATE OR REPLACE FUNCTION ai_update_lead(
  p_workspace_id UUID,
  p_user_id UUID,
  p_lead_id UUID,
  p_updates JSONB,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_rate_check JSONB;
  v_old_values JSONB;
BEGIN
  -- 1. Rate limit
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit: ' || (v_rate_check->>'reason'));
  END IF;

  -- 2. Permission check
  IF NOT ai_check_write_permission(p_workspace_id, p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied. Viewers cannot update leads.');
  END IF;

  -- 3. Verificar lead pertence ao workspace
  SELECT * INTO v_lead FROM leads
  WHERE id = p_lead_id AND workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found in this workspace');
  END IF;

  -- Store old values for audit
  v_old_values := jsonb_build_object(
    'deal_value', v_lead.deal_value,
    'column_id', v_lead.column_id,
    'status', v_lead.status
  );

  -- 4. Validar deal_value >= 0
  IF (p_updates->>'deal_value') IS NOT NULL AND (p_updates->>'deal_value')::NUMERIC < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deal value cannot be negative');
  END IF;

  -- 5. Validar column_id pertence ao workspace
  IF (p_updates->>'column_id') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM funnel_columns fc
      JOIN funnels f ON fc.funnel_id = f.id
      WHERE fc.id = (p_updates->>'column_id')::UUID
        AND f.workspace_id = p_workspace_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid column - does not belong to this workspace');
    END IF;
  END IF;

  -- 6. Validar status
  IF (p_updates->>'status') IS NOT NULL THEN
    IF (p_updates->>'status') NOT IN ('active', 'won', 'lost', 'archived') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid status. Must be: active, won, lost, or archived');
    END IF;
  END IF;

  -- 7. Executar update
  UPDATE leads SET
    deal_value = COALESCE((p_updates->>'deal_value')::NUMERIC, deal_value),
    column_id = COALESCE((p_updates->>'column_id')::UUID, column_id),
    status = COALESCE(p_updates->>'status', status),
    updated_at = NOW()
  WHERE id = p_lead_id AND workspace_id = p_workspace_id;

  -- 8. Log activity
  INSERT INTO lead_activities (
    lead_id,
    workspace_id,
    activity_type,
    description,
    metadata,
    created_by
  ) VALUES (
    p_lead_id,
    p_workspace_id,
    'ai_update',
    'Lead updated by AI: ' || p_reason,
    jsonb_build_object(
      'old_values', v_old_values,
      'new_values', p_updates,
      'reason', p_reason
    ),
    p_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'client_name', v_lead.client_name,
    'updated_fields', (SELECT array_agg(key) FROM jsonb_object_keys(p_updates) AS key)
  );
END;
$$;

-- ============================================
-- 9. SEARCH CONVERSATIONS (SEGURO)
-- ============================================
CREATE OR REPLACE FUNCTION ai_search_conversations(
  p_workspace_id UUID,
  p_filters JSONB DEFAULT '{}',
  p_include_messages BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_limit INT := LEAST(COALESCE(p_limit, 20), 50);
  v_rate_check JSONB;
BEGIN
  -- Rate limit check
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Rate limit: ' || (v_rate_check->>'reason'));
  END IF;

  SELECT jsonb_agg(row_to_json(sub))
  INTO v_result
  FROM (
    SELECT
      c.id,
      c.lead_id,
      l.client_name as lead_name,
      l.phone as lead_phone,
      c.last_message_at,
      c.unread_count,
      c.status as conversation_status,
      i.name as inbox_name,
      CASE WHEN p_include_messages THEN (
        SELECT jsonb_agg(row_to_json(m) ORDER BY m.created_at DESC)
        FROM (
          SELECT msg.content, msg.sender_type, msg.created_at
          FROM messages msg
          WHERE msg.conversation_id = c.id
          ORDER BY msg.created_at DESC
          LIMIT 5
        ) m
      ) END as recent_messages
    FROM conversations c
    JOIN leads l ON c.lead_id = l.id
    LEFT JOIN inboxes i ON c.inbox_id = i.id
    WHERE c.workspace_id = p_workspace_id
      AND (p_filters->>'lead_id' IS NULL OR c.lead_id = (p_filters->>'lead_id')::UUID)
      AND (p_filters->>'lead_name' IS NULL
           OR l.client_name ILIKE '%' || (p_filters->>'lead_name') || '%')
      AND (p_filters->>'inbox_id' IS NULL
           OR c.inbox_id = (p_filters->>'inbox_id')::UUID)
      AND (p_filters->>'has_unread' IS NULL
           OR (p_filters->>'has_unread')::BOOLEAN = (c.unread_count > 0))
      AND (p_filters->>'date_after' IS NULL
           OR c.last_message_at >= (p_filters->>'date_after')::TIMESTAMPTZ)
      AND (p_filters->>'date_before' IS NULL
           OR c.last_message_at <= (p_filters->>'date_before')::TIMESTAMPTZ)
    ORDER BY c.last_message_at DESC
    LIMIT v_limit
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_result, '[]'::jsonb),
    'count', COALESCE(jsonb_array_length(v_result), 0)
  );
END;
$$;

-- ============================================
-- 10. GET LEAD DETAILS (SEGURO)
-- ============================================
CREATE OR REPLACE FUNCTION ai_get_lead_details(
  p_workspace_id UUID,
  p_lead_id UUID,
  p_include TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_rate_check JSONB;
  v_lead RECORD;
  v_custom_fields JSONB;
  v_activities JSONB;
  v_attachments JSONB;
  v_conversations JSONB;
BEGIN
  -- Rate limit check
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Rate limit: ' || (v_rate_check->>'reason'));
  END IF;

  -- Get lead with stage and funnel info
  SELECT
    l.*,
    fc.title as stage_name,
    fc.position as stage_position,
    f.name as funnel_name,
    f.id as funnel_id
  INTO v_lead
  FROM leads l
  LEFT JOIN funnel_columns fc ON l.column_id = fc.id
  LEFT JOIN funnels f ON fc.funnel_id = f.id
  WHERE l.id = p_lead_id AND l.workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found in this workspace');
  END IF;

  -- Get custom fields if requested
  IF 'custom_fields' = ANY(p_include) THEN
    SELECT jsonb_agg(jsonb_build_object(
      'field_id', cf.id,
      'field_name', cf.name,
      'field_type', cf.field_type,
      'value', lcv.value
    ))
    INTO v_custom_fields
    FROM lead_custom_values lcv
    JOIN custom_fields cf ON lcv.custom_field_id = cf.id
    WHERE lcv.lead_id = p_lead_id;
  END IF;

  -- Get activities if requested
  IF 'activities' = ANY(p_include) THEN
    SELECT jsonb_agg(row_to_json(la) ORDER BY la.created_at DESC)
    INTO v_activities
    FROM (
      SELECT id, activity_type, description, created_at
      FROM lead_activities
      WHERE lead_id = p_lead_id
      ORDER BY created_at DESC
      LIMIT 20
    ) la;
  END IF;

  -- Get attachments if requested
  IF 'attachments' = ANY(p_include) THEN
    SELECT jsonb_agg(jsonb_build_object(
      'id', la.id,
      'file_name', la.file_name,
      'file_type', la.file_type,
      'file_size', la.file_size,
      'created_at', la.created_at
    ))
    INTO v_attachments
    FROM lead_attachments la
    WHERE la.lead_id = p_lead_id;
  END IF;

  -- Get conversations if requested
  IF 'conversations' = ANY(p_include) THEN
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'inbox_name', i.name,
      'last_message_at', c.last_message_at,
      'unread_count', c.unread_count,
      'status', c.status
    ))
    INTO v_conversations
    FROM conversations c
    LEFT JOIN inboxes i ON c.inbox_id = i.id
    WHERE c.lead_id = p_lead_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lead', jsonb_build_object(
      'id', v_lead.id,
      'client_name', v_lead.client_name,
      'phone', v_lead.phone,
      'email', v_lead.email,
      'deal_value', v_lead.deal_value,
      'status', v_lead.status,
      'tags', v_lead.tags,
      'notes', v_lead.notes,
      'created_at', v_lead.created_at,
      'updated_at', v_lead.updated_at
    ),
    'stage', v_lead.stage_name,
    'stage_position', v_lead.stage_position,
    'funnel', v_lead.funnel_name,
    'funnel_id', v_lead.funnel_id,
    'custom_fields', COALESCE(v_custom_fields, '[]'::jsonb),
    'activities', COALESCE(v_activities, '[]'::jsonb),
    'attachments', COALESCE(v_attachments, '[]'::jsonb),
    'conversations', COALESCE(v_conversations, '[]'::jsonb)
  );
END;
$$;

-- ============================================
-- 11. GET FUNNELS AND COLUMNS (SEGURO)
-- ============================================
CREATE OR REPLACE FUNCTION ai_get_funnels(
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_rate_check JSONB;
BEGIN
  -- Rate limit check
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Rate limit: ' || (v_rate_check->>'reason'));
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'description', f.description,
    'columns', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', fc.id,
        'title', fc.title,
        'position', fc.position,
        'color', fc.color
      ) ORDER BY fc.position)
      FROM funnel_columns fc
      WHERE fc.funnel_id = f.id
    )
  ))
  INTO v_result
  FROM funnels f
  WHERE f.workspace_id = p_workspace_id;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

-- ============================================
-- 12. GRANTS
-- ============================================
GRANT EXECUTE ON FUNCTION check_ai_tool_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION ai_check_write_permission TO authenticated;
GRANT EXECUTE ON FUNCTION ai_search_leads TO authenticated;
GRANT EXECUTE ON FUNCTION ai_get_pipeline_stats TO authenticated;
GRANT EXECUTE ON FUNCTION ai_update_lead TO authenticated;
GRANT EXECUTE ON FUNCTION ai_search_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION ai_get_lead_details TO authenticated;
GRANT EXECUTE ON FUNCTION ai_get_funnels TO authenticated;

-- RLS for audit log
ALTER TABLE ai_tool_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_tool_audit_log_workspace_access" ON ai_tool_audit_log
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- RLS for rate limits (service role only writes, authenticated can read own)
ALTER TABLE ai_tool_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_tool_rate_limits_workspace_access" ON ai_tool_rate_limits
  FOR ALL
  TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Grant insert/update on rate limits for the RPC functions
GRANT ALL ON TABLE ai_tool_rate_limits TO authenticated;
GRANT ALL ON TABLE ai_tool_audit_log TO authenticated;
