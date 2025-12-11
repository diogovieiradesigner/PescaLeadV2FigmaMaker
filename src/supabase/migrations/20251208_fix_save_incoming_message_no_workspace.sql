-- ============================================
-- FIX CRÍTICO: Remover workspace_id da tabela messages
-- ============================================
-- ERRO: column "workspace_id" of relation "messages" does not exist
-- CAUSA: Função estava tentando inserir workspace_id em messages
-- SOLUÇÃO: Remover workspace_id (só existe em conversations)
-- ============================================

-- ✅ DROPAR TODAS AS VERSÕES DA FUNÇÃO
DROP FUNCTION IF EXISTS public.save_incoming_message(uuid,uuid,text,text,text,text,text,integer,text,integer,text,uuid);
DROP FUNCTION IF EXISTS public.save_incoming_message(uuid,uuid,text,text,text,text,text,integer,text,integer,text,uuid,bigint);

-- ✅ RECRIAR FUNÇÃO CORRIGIDA (SEM workspace_id em messages)
CREATE OR REPLACE FUNCTION public.save_incoming_message(
    p_workspace_id UUID,
    p_inbox_id UUID,
    p_contact_phone TEXT,
    p_contact_name TEXT DEFAULT NULL,
    p_content_type TEXT DEFAULT 'text',
    p_text_content TEXT DEFAULT NULL,
    p_media_url TEXT DEFAULT NULL,
    p_audio_duration INTEGER DEFAULT NULL,
    p_file_name TEXT DEFAULT NULL,
    p_file_size INTEGER DEFAULT NULL,
    p_provider_message_id TEXT DEFAULT NULL,
    p_lead_id UUID DEFAULT NULL,
    p_message_timestamp BIGINT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conversation_id UUID;
    v_conversation_is_new BOOLEAN := false;
    v_message_id UUID;
    v_transcription_status TEXT;
    v_agent_id UUID;
    v_attendant_type TEXT;
    v_now TIMESTAMPTZ;
    v_normalized_phone TEXT;
BEGIN
    -- ✅ Usar timestamp do webhook ou horário de Brasília
    IF p_message_timestamp IS NOT NULL THEN
        v_now := to_timestamp(p_message_timestamp / 1000.0);
    ELSE
        v_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
    END IF;
    
    -- Normalizar telefone
    v_normalized_phone := normalize_phone_number(p_contact_phone);
    
    -- ✅ Buscar conversa existente
    SELECT id, attendant_type
    INTO v_conversation_id, v_attendant_type
    FROM conversations
    WHERE workspace_id = p_workspace_id
      AND contact_phone = v_normalized_phone
    LIMIT 1;
    
    -- ✅ Criar nova conversa se não existir
    IF v_conversation_id IS NULL THEN
        v_conversation_is_new := true;
        
        INSERT INTO conversations (
            workspace_id,
            inbox_id,
            contact_phone,
            contact_name,
            channel,
            status,
            attendant_type,
            last_message,
            last_message_at,
            unread_count,
            total_messages,
            lead_id,
            created_at,
            updated_at
        ) VALUES (
            p_workspace_id,
            p_inbox_id,
            v_normalized_phone,
            COALESCE(p_contact_name, v_normalized_phone),
            'whatsapp',
            'waiting',
            'human',
            COALESCE(p_text_content, '[' || p_content_type || ']'),
            v_now,
            1,
            1,
            p_lead_id,
            v_now,
            v_now
        )
        RETURNING id, attendant_type INTO v_conversation_id, v_attendant_type;
        
    ELSE
        -- ✅ Atualizar conversa existente
        UPDATE conversations SET
            last_message = COALESCE(p_text_content, '[' || p_content_type || ']'),
            last_message_at = v_now,
            unread_count = unread_count + 1,
            total_messages = total_messages + 1,
            status = CASE 
                WHEN status = 'resolved' THEN 'waiting' 
                ELSE status 
            END,
            updated_at = v_now,
            contact_name = CASE
                WHEN p_contact_name IS NOT NULL 
                     AND p_contact_name != '' 
                     AND p_contact_name ~ '[a-zA-Z]'
                THEN p_contact_name
                ELSE contact_name
            END
        WHERE id = v_conversation_id;
    END IF;
    
    -- ✅ Status de transcrição
    v_transcription_status := CASE 
        WHEN p_content_type IN ('audio', 'image', 'video') THEN 'pending'
        ELSE 'none'
    END;
    
    -- ✅ INSERIR MENSAGEM (SEM workspace_id!)
    INSERT INTO messages (
        conversation_id,
        message_type,
        content_type,
        text_content,
        media_url,
        audio_duration,
        file_name,
        file_size,
        provider_message_id,
        transcription_status,
        is_read,
        created_at
    ) VALUES (
        v_conversation_id,
        'received',
        p_content_type,
        p_text_content,
        p_media_url,
        p_audio_duration,
        p_file_name,
        p_file_size,
        p_provider_message_id,
        v_transcription_status,
        false,
        v_now
    )
    RETURNING id INTO v_message_id;
    
    -- ✅ Buscar agent_id se IA
    IF v_attendant_type = 'ai' THEN
        SELECT id INTO v_agent_id
        FROM ai_agents
        WHERE workspace_id = p_workspace_id
          AND is_active = true
        LIMIT 1;
    END IF;
    
    -- ✅ Retornar resultado
    RETURN json_build_object(
        'message_id', v_message_id,
        'conversation_id', v_conversation_id,
        'conversation_is_new', v_conversation_is_new,
        'attendant_type', v_attendant_type,
        'agent_id', v_agent_id
    );
END;
$$;

-- ✅ Permissões
GRANT EXECUTE ON FUNCTION public.save_incoming_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_incoming_message TO service_role;

-- ✅ Comentário
COMMENT ON FUNCTION public.save_incoming_message IS 
'Salva mensagem recebida do webhook. CORRIGIDO: Sem workspace_id em messages (só existe em conversations).';
