-- Migration: Update preview conversation RPCs to use workspace from context
-- This ensures events created in preview mode appear in the correct workspace's calendar

-- Drop and recreate create_preview_conversation to accept p_workspace_id
DROP FUNCTION IF EXISTS create_preview_conversation(uuid, text);
DROP FUNCTION IF EXISTS create_preview_conversation(uuid, text, uuid);

CREATE OR REPLACE FUNCTION create_preview_conversation(
  p_agent_id uuid,
  p_template_message text DEFAULT NULL,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_conversation_id uuid;
  v_message_id uuid;
  v_created_at timestamptz;
BEGIN
  -- Use provided workspace_id, or fall back to agent's workspace
  IF p_workspace_id IS NOT NULL THEN
    v_workspace_id := p_workspace_id;
  ELSE
    -- Fallback: get workspace from agent
    SELECT workspace_id INTO v_workspace_id
    FROM ai_agents
    WHERE id = p_agent_id;
  END IF;

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Workspace not found for agent'
    );
  END IF;

  -- Create new conversation
  v_created_at := now();
  INSERT INTO conversations (
    workspace_id,
    inbox_id,
    channel,
    contact_phone,
    contact_name,
    status,
    attendant_type,
    created_at,
    updated_at
  ) VALUES (
    v_workspace_id,
    NULL, -- inbox_id can be NULL for preview
    'preview',
    p_agent_id::text, -- Use agent_id as contact_phone for identification
    'Preview ' || to_char(v_created_at, 'DD/MM/YYYY HH24:MI'),
    'in-progress',
    'ai',
    v_created_at,
    v_created_at
  )
  RETURNING id INTO v_conversation_id;

  -- If template message provided, create it
  IF p_template_message IS NOT NULL AND trim(p_template_message) <> '' THEN
    INSERT INTO messages (
      conversation_id,
      content_type,
      message_type,
      text_content,
      is_read,
      created_at
    ) VALUES (
      v_conversation_id,
      'text',
      'sent', -- 'sent' = message from AI/bot
      p_template_message,
      false,
      v_created_at
    )
    RETURNING id INTO v_message_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', v_conversation_id,
    'message_id', v_message_id,
    'created_at', v_created_at,
    'workspace_id', v_workspace_id
  );
END;
$$;

-- Update list_preview_conversations to optionally filter by workspace
DROP FUNCTION IF EXISTS list_preview_conversations(uuid);
DROP FUNCTION IF EXISTS list_preview_conversations(uuid, uuid);

CREATE OR REPLACE FUNCTION list_preview_conversations(
  p_agent_id uuid,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversations jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(conv ORDER BY conv.created_at DESC), '[]'::jsonb)
  INTO v_conversations
  FROM (
    SELECT
      c.id,
      c.contact_name,
      c.created_at,
      c.updated_at,
      c.workspace_id,
      (
        SELECT m.text_content
        FROM messages m
        WHERE m.conversation_id = c.id
          AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT 1
      ) as last_message,
      (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.conversation_id = c.id
          AND m.deleted_at IS NULL
      ) as total_messages
    FROM conversations c
    WHERE c.channel = 'preview'
      AND c.contact_phone = p_agent_id::text
      AND c.deleted_at IS NULL
      -- Filter by workspace if provided
      AND (p_workspace_id IS NULL OR c.workspace_id = p_workspace_id)
  ) conv;

  RETURN v_conversations;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_preview_conversation(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION list_preview_conversations(uuid, uuid) TO authenticated;
