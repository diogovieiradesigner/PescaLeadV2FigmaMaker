-- FIX v2: ai_search_leads function
-- Corrige erro "column l.email does not exist"
-- Execute este SQL no SQL Editor do Supabase

-- IMPORTANTE: Primeiro execute esta query para ver quais colunas existem na tabela leads:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads' ORDER BY ordinal_position;

-- Versão corrigida que usa SELECT * e apenas filtros de colunas básicas
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

  -- Query usando SELECT l.* para retornar todas as colunas que existem na tabela
  -- Filtros apenas em colunas que sabemos que existem: workspace_id, client_name, status, column_id, deal_value, created_at
  SELECT jsonb_agg(row_to_json(sub))
  INTO v_result
  FROM (
    SELECT
      l.*,
      fc.id as stage_column_id,
      fc.title as stage_name,
      f.id as funnel_id,
      f.name as funnel_name
    FROM leads l
    LEFT JOIN funnel_columns fc ON l.column_id = fc.id
    LEFT JOIN funnels f ON fc.funnel_id = f.id
    WHERE l.workspace_id = p_workspace_id
      -- Filtro por client_name
      AND (p_filters->>'client_name' IS NULL
           OR l.client_name ILIKE '%' || (p_filters->>'client_name') || '%')
      -- Filtro por status
      AND (p_filters->>'status' IS NULL
           OR l.status = p_filters->>'status')
      -- Filtro por funnel_id
      AND (p_filters->>'funnel_id' IS NULL
           OR f.id = (p_filters->>'funnel_id')::UUID)
      -- Filtro por column_id
      AND (p_filters->>'column_id' IS NULL
           OR l.column_id = (p_filters->>'column_id')::UUID)
      -- Filtro por deal_value
      AND (p_filters->>'min_value' IS NULL
           OR l.deal_value >= (p_filters->>'min_value')::NUMERIC)
      AND (p_filters->>'max_value' IS NULL
           OR l.deal_value <= (p_filters->>'max_value')::NUMERIC)
      -- Filtro por created_at
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

-- ============================================
-- IMPORTANTE: Também precisamos atualizar as outras funções RPC
-- que podem ter referências a colunas inexistentes
-- ============================================

-- ai_search_conversations - remover referência a phone se não existir
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

GRANT EXECUTE ON FUNCTION ai_search_conversations TO authenticated;

-- ai_get_lead_details - usar l.* em vez de colunas específicas
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
  v_lead_json JSONB;
  v_stage_name TEXT;
  v_stage_position INT;
  v_funnel_name TEXT;
  v_funnel_id UUID;
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

  -- Get lead with stage and funnel info usando row_to_json para capturar todas as colunas
  SELECT
    row_to_json(l),
    fc.title,
    fc.position,
    f.name,
    f.id
  INTO v_lead_json, v_stage_name, v_stage_position, v_funnel_name, v_funnel_id
  FROM leads l
  LEFT JOIN funnel_columns fc ON l.column_id = fc.id
  LEFT JOIN funnels f ON fc.funnel_id = f.id
  WHERE l.id = p_lead_id AND l.workspace_id = p_workspace_id;

  IF v_lead_json IS NULL THEN
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
    'lead', v_lead_json,
    'stage', v_stage_name,
    'stage_position', v_stage_position,
    'funnel', v_funnel_name,
    'funnel_id', v_funnel_id,
    'custom_fields', COALESCE(v_custom_fields, '[]'::jsonb),
    'activities', COALESCE(v_activities, '[]'::jsonb),
    'attachments', COALESCE(v_attachments, '[]'::jsonb),
    'conversations', COALESCE(v_conversations, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ai_get_lead_details TO authenticated;
