-- ============================================
-- RPC Function: save_incoming_message
-- ============================================
-- Salva uma mensagem recebida do WhatsApp e cria/atualiza a conversa automaticamente
-- Retorna: { conversation_id, message_id, conversation_is_new, attendant_type, agent_id }

CREATE OR REPLACE FUNCTION save_incoming_message(
  p_workspace_id uuid,
  p_inbox_id uuid,
  p_contact_phone text,
  p_contact_name text,
  p_content_type text,
  p_text_content text,
  p_media_url text DEFAULT NULL,
  p_audio_duration integer DEFAULT NULL,
  p_file_name text DEFAULT NULL,
  p_file_size integer DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL,
  p_lead_id uuid DEFAULT NULL,
  p_message_timestamp bigint DEFAULT NULL,
  p_from_me boolean DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id uuid;
  v_message_id uuid;
  v_is_new_conversation boolean := false;
  v_attendant_type text;
  v_agent_id uuid := null;
  v_clean_phone text;
  v_message_created_at timestamp with time zone;
BEGIN
  -- Limpar número de telefone (remover @s.whatsapp.net e caracteres especiais)
  v_clean_phone := regexp_replace(p_contact_phone, '@.*$', '');
  v_clean_phone := regexp_replace(v_clean_phone, '[^0-9]', '', 'g');
  
  RAISE NOTICE '[save_incoming_message] Cleaning phone: % -> %', p_contact_phone, v_clean_phone;
  
  -- Converter timestamp para timestamp with time zone
  IF p_message_timestamp IS NOT NULL THEN
    v_message_created_at := to_timestamp(p_message_timestamp / 1000.0) AT TIME ZONE 'America/Sao_Paulo';
  ELSE
    v_message_created_at := now() AT TIME ZONE 'America/Sao_Paulo';
  END IF;
  
  RAISE NOTICE '[save_incoming_message] Message timestamp: %', v_message_created_at;
  RAISE NOTICE '[save_incoming_message] fromMe: %', p_from_me;
  
  -- 1. Procurar conversa existente (mesmo workspace + inbox + phone)
  SELECT id, attendant_type INTO v_conversation_id, v_attendant_type
  FROM conversations
  WHERE workspace_id = p_workspace_id
    AND (inbox_id = p_inbox_id OR p_inbox_id IS NULL)
    AND contact_phone = v_clean_phone
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 2. Se não encontrou conversa, criar nova
  IF v_conversation_id IS NULL THEN
    RAISE NOTICE '[save_incoming_message] Creating new conversation for phone: %', v_clean_phone;
    
    v_is_new_conversation := true;
    
    -- Inserir nova conversa
    INSERT INTO conversations (
      workspace_id,
      inbox_id,
      lead_id,
      contact_name,
      contact_phone,
      status,
      channel,
      last_message,
      last_message_at,
      unread_count,
      total_messages,
      created_at,
      updated_at
    )
    VALUES (
      p_workspace_id,
      p_inbox_id,
      p_lead_id,
      p_contact_name,
      v_clean_phone,
      'waiting',  -- status inicial
      'whatsapp',  -- canal
      p_text_content,
      v_message_created_at,
      CASE WHEN p_from_me THEN 0 ELSE 1 END,  -- Se fromMe=true, não incrementa unread
      1,  -- primeira mensagem
      v_message_created_at,
      v_message_created_at
    )
    RETURNING id, attendant_type INTO v_conversation_id, v_attendant_type;
    
    RAISE NOTICE '[save_incoming_message] New conversation created: %', v_conversation_id;
    RAISE NOTICE '[save_incoming_message] Attendant type: %', v_attendant_type;
    
    -- Verificar se há agente ativo
    IF v_attendant_type = 'ai' THEN
      -- Buscar agent_id da conversa (pode ter sido definido pelo trigger)
      SELECT ai_sessions.agent_id INTO v_agent_id
      FROM ai_conversation_sessions ai_sessions
      WHERE ai_sessions.conversation_id = v_conversation_id
        AND ai_sessions.status = 'active'
      ORDER BY ai_sessions.started_at DESC
      LIMIT 1;
      
      RAISE NOTICE '[save_incoming_message] AI Agent ID: %', v_agent_id;
    END IF;
    
  ELSE
    -- Conversa já existe
    RAISE NOTICE '[save_incoming_message] Using existing conversation: %', v_conversation_id;
    
    -- Atualizar conversa existente
    UPDATE conversations
    SET 
      last_message = p_text_content,
      last_message_at = v_message_created_at,
      updated_at = v_message_created_at,
      total_messages = total_messages + 1,
      unread_count = CASE 
        WHEN p_from_me THEN unread_count  -- fromMe=true não incrementa
        ELSE unread_count + 1  -- fromMe=false incrementa
      END,
      contact_name = CASE 
        WHEN p_contact_name != '' THEN p_contact_name 
        ELSE contact_name 
      END
    WHERE id = v_conversation_id;
    
    -- Verificar se há agente ativo
    IF v_attendant_type = 'ai' THEN
      SELECT ai_sessions.agent_id INTO v_agent_id
      FROM ai_conversation_sessions ai_sessions
      WHERE ai_sessions.conversation_id = v_conversation_id
        AND ai_sessions.status = 'active'
      ORDER BY ai_sessions.started_at DESC
      LIMIT 1;
      
      RAISE NOTICE '[save_incoming_message] AI Agent ID: %', v_agent_id;
    END IF;
  END IF;
  
  -- 3. Inserir mensagem
  RAISE NOTICE '[save_incoming_message] Inserting message...';
  
  INSERT INTO messages (
    conversation_id,
    content_type,
    message_type,
    text_content,
    media_url,
    audio_duration,
    file_name,
    file_size,
    is_read,
    provider_message_id,
    created_at
  )
  VALUES (
    v_conversation_id,
    p_content_type,
    CASE WHEN p_from_me THEN 'sent' ELSE 'received' END,  -- fromMe=true -> sent, false -> received
    p_text_content,
    p_media_url,
    p_audio_duration,
    p_file_name,
    p_file_size,
    p_from_me,  -- Se fromMe=true, marcar como lida
    p_provider_message_id,
    v_message_created_at
  )
  RETURNING id INTO v_message_id;
  
  RAISE NOTICE '[save_incoming_message] Message inserted: %', v_message_id;
  
  -- 4. Retornar resultado
  RETURN jsonb_build_object(
    'conversation_id', v_conversation_id,
    'message_id', v_message_id,
    'conversation_is_new', v_is_new_conversation,
    'attendant_type', v_attendant_type,
    'agent_id', v_agent_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[save_incoming_message] Error: % - %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_incoming_message TO authenticated;
GRANT EXECUTE ON FUNCTION save_incoming_message TO service_role;

-- Add comment
COMMENT ON FUNCTION save_incoming_message IS 'Salva mensagem recebida do WhatsApp e cria/atualiza conversa automaticamente';
