-- ============================================
-- FIX: Detectar corretamente mensagens fromMe
-- ============================================
-- PROBLEMA: Quando usuário envia mensagem pelo WhatsApp Web/celular,
--           o sistema salva como 'received' (do cliente) quando 
--           deveria salvar como 'sent' (do atendente)
-- 
-- SOLUÇÃO: Adicionar parâmetro p_from_me para identificar corretamente
-- ============================================

-- ✅ DROPAR VERSÃO ANTIGA
DROP FUNCTION IF EXISTS public.save_incoming_message(uuid,uuid,text,text,text,text,text,integer,text,integer,text,uuid,bigint);

-- ✅ RECRIAR COM NOVO PARÂMETRO p_from_me
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
    p_message_timestamp BIGINT DEFAULT NULL,
    p_from_me BOOLEAN DEFAULT false  -- ✅ NOVO: identifica se mensagem foi enviada pelo atendente
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
    v_message_type TEXT;
BEGIN
    -- ✅ Usar timestamp do webhook ou horário de Brasília
    IF p_message_timestamp IS NOT NULL THEN
        v_now := to_timestamp(p_message_timestamp / 1000.0);
    ELSE
        v_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
    END IF;
    
    -- ✅ Determinar tipo de mensagem baseado em fromMe
    -- fromMe = true  → 'sent' (enviada pelo atendente via WhatsApp Web/celular/sistema)
    -- fromMe = false → 'received' (recebida do cliente)
    v_message_type := CASE 
        WHEN p_from_me THEN 'sent'
        ELSE 'received'
    END;
    
    RAISE NOTICE 'save_incoming_message: fromMe=%, messageType=%', p_from_me, v_message_type;
    
    -- Normalizar telefone
    v_normalized_phone := normalize_phone_number(p_contact_phone);
    
    -- ✅ Buscar conversa existente
    SELECT id, attendant_type
    INTO v_conversation_id, v_attendant_type
    FROM conversations
    WHERE workspace_id = p_workspace_id
      AND contact_phone = v_normalized_phone
    LIMIT 1;
    
    RAISE NOTICE 'save_incoming_message: Conversa existente? %, attendant_type atual: %', v_conversation_id IS NOT NULL, v_attendant_type;
    
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
            CASE WHEN p_from_me THEN 0 ELSE 1 END,  -- ✅ Só incrementa unread se for do cliente
            1,
            p_lead_id,
            v_now,
            v_now
        )
        RETURNING id, attendant_type INTO v_conversation_id, v_attendant_type;
        
        RAISE NOTICE 'save_incoming_message: NOVA CONVERSA criada - attendant_type=human';
        
    ELSE
        -- ✅ Atualizar conversa existente
        RAISE NOTICE 'save_incoming_message: ANTES DO UPDATE - p_from_me=%, attendant_type atual=%', p_from_me, v_attendant_type;
        
        UPDATE conversations SET
            last_message = COALESCE(p_text_content, '[' || p_content_type || ']'),
            last_message_at = v_now,
            unread_count = CASE 
                WHEN p_from_me THEN unread_count  -- ✅ Não incrementa se for mensagem do atendente
                ELSE unread_count + 1 
            END,
            total_messages = total_messages + 1,
            status = CASE 
                WHEN status = 'resolved' THEN 'waiting' 
                ELSE status 
            END,
            -- ✅ NOVO: Se fromMe=true, significa que atendente humano respondeu pelo WhatsApp
            --    Então muda de 'ai' para 'human' automaticamente
            attendant_type = CASE
                WHEN p_from_me AND attendant_type = 'ai' THEN 'human'
                ELSE attendant_type
            END,
            updated_at = v_now,
            contact_name = CASE
                WHEN p_contact_name IS NOT NULL 
                     AND p_contact_name != '' 
                     AND p_contact_name ~ '[a-zA-Z]'
                THEN p_contact_name
                ELSE contact_name
            END
        WHERE id = v_conversation_id
        RETURNING attendant_type INTO v_attendant_type;  -- ✅ Pegar valor atualizado
        
        RAISE NOTICE 'save_incoming_message: DEPOIS DO UPDATE - attendant_type agora=%', v_attendant_type;
        
        -- ✅ LOG: Informar se houve mudança de AI → HUMAN
        IF p_from_me AND v_attendant_type = 'human' THEN
            RAISE NOTICE 'save_incoming_message: ✅✅✅ CONVERSA MUDOU de AI → HUMAN (atendente respondeu pelo WhatsApp)';
        END IF;
    END IF;
    
    -- ✅ Status de transcrição
    v_transcription_status := CASE 
        WHEN p_content_type IN ('audio', 'image', 'video') THEN 'pending'
        ELSE 'none'
    END;
    
    -- ✅ INSERIR MENSAGEM COM TIPO CORRETO
    INSERT INTO messages (
        conversation_id,
        message_type,  -- ✅ Agora usa v_message_type calculado ('sent' ou 'received')
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
        v_message_type,  -- ✅ 'sent' se fromMe=true, 'received' se fromMe=false
        p_content_type,
        p_text_content,
        p_media_url,
        p_audio_duration,
        p_file_name,
        p_file_size,
        p_provider_message_id,
        v_transcription_status,
        p_from_me,  -- ✅ Mensagens do atendente já vêm lidas
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
        'agent_id', v_agent_id,
        'message_type', v_message_type
    );
END;
$$;

-- ✅ Permissões
GRANT EXECUTE ON FUNCTION public.save_incoming_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_incoming_message TO service_role;

-- ✅ Comentário
COMMENT ON FUNCTION public.save_incoming_message IS 
'Salva mensagem do webhook. Detecta corretamente se foi enviada pelo atendente (fromMe=true) ou recebida do cliente (fromMe=false).';