-- =====================================================
-- RPCs para transferência de conversa para humano
-- =====================================================

-- RPC: get_agent_attendants
-- Retorna os atendentes configurados para um agente de IA
CREATE OR REPLACE FUNCTION get_agent_attendants(p_agent_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  is_available BOOLEAN,
  current_conversations INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as user_name,
    u.email as user_email,
    TRUE as is_available, -- Por enquanto sempre disponível
    (
      SELECT COUNT(*)::INT
      FROM conversations c
      WHERE c.assigned_to = u.id
      AND c.status IN ('open', 'waiting')
    ) as current_conversations
  FROM ai_agent_attendants aa
  JOIN auth.users u ON u.id = aa.user_id
  WHERE aa.agent_id = p_agent_id
  AND aa.is_active = TRUE
  ORDER BY current_conversations ASC, u.created_at ASC;
END;
$$;

-- RPC: transfer_conversation_to_human
-- Transfere uma conversa para um atendente humano
CREATE OR REPLACE FUNCTION transfer_conversation_to_human(
  p_conversation_id UUID,
  p_attendant_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Transferência solicitada',
  p_context_summary TEXT DEFAULT NULL,
  p_message_to_customer TEXT DEFAULT NULL,
  p_message_to_attendant TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_attendant RECORD;
  v_notification_id UUID;
  v_generic_transfer BOOLEAN := FALSE;
BEGIN
  -- Buscar conversa
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conversa não encontrada'
    );
  END IF;

  -- Se não foi especificado atendente, pegar o primeiro disponível do workspace
  IF p_attendant_user_id IS NULL THEN
    SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email) as name
    INTO v_attendant
    FROM workspace_members wm
    JOIN auth.users u ON u.id = wm.user_id
    WHERE wm.workspace_id = v_conversation.workspace_id
    AND wm.role IN ('owner', 'admin', 'member')
    ORDER BY (
      SELECT COUNT(*) FROM conversations c
      WHERE c.assigned_to = u.id AND c.status IN ('open', 'waiting')
    ) ASC
    LIMIT 1;

    v_generic_transfer := TRUE;
  ELSE
    SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email) as name
    INTO v_attendant
    FROM auth.users u
    WHERE u.id = p_attendant_user_id;
  END IF;

  IF v_attendant.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhum atendente disponível'
    );
  END IF;

  -- Atualizar conversa
  UPDATE conversations
  SET
    attendant_type = 'human',
    status = 'waiting',
    assigned_to = v_attendant.id,
    updated_at = NOW()
  WHERE id = p_conversation_id;

  -- Atualizar sessão AI se existir
  UPDATE ai_conversation_sessions
  SET
    status = 'transferred',
    end_reason = p_reason,
    context_summary = COALESCE(p_context_summary, context_summary),
    ended_at = NOW()
  WHERE conversation_id = p_conversation_id
  AND status = 'active';

  -- Criar notificação para o atendente
  INSERT INTO notifications (
    id,
    workspace_id,
    user_id,
    type,
    title,
    message,
    data,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_conversation.workspace_id,
    v_attendant.id,
    'conversation_transfer',
    'Nova conversa transferida',
    COALESCE(p_message_to_attendant, 'Uma conversa foi transferida para você. Motivo: ' || p_reason),
    jsonb_build_object(
      'conversation_id', p_conversation_id,
      'reason', p_reason,
      'context_summary', p_context_summary
    ),
    NOW()
  )
  RETURNING id INTO v_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'attendant_id', v_attendant.id,
    'attendant_name', v_attendant.name,
    'notification_id', v_notification_id,
    'generic_transfer', v_generic_transfer
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION get_agent_attendants(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION transfer_conversation_to_human(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
