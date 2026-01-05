-- FIX: ai_search_leads function
-- Execute este SQL no SQL Editor do Supabase para corrigir o erro

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

  -- Execute query with all filters (removed l.tags as it may not exist)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ai_search_leads TO authenticated;
