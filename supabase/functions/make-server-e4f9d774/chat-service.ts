import { createClient } from "jsr:@supabase/supabase-js@2";
import { UnifiedMessage } from "./chat-types.ts";
import EvolutionProvider from "./provider-evolution.ts";
import { getSupabaseServiceClient } from './supabase-client.ts';

// Setup Supabase Client (usar singleton)
const supabase = getSupabaseServiceClient(); // ✅ Usando singleton!

// Validar que variáveis de ambiente existem
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('🚨 [CHAT-SERVICE] CRITICAL: Missing Supabase configuration');
  console.error('   SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
}

export const processIncomingMessage = async (msg: UnifiedMessage) => {
  console.log('\n==============================================');
  console.log('🔄 [CHAT-SERVICE] Processing incoming message');
  console.log('==============================================');
  console.log('📨 Message details:', JSON.stringify(msg, null, 2));
  
  try {
    // 1. Find Instance & Workspace
    console.log('🔍 [CHAT-SERVICE] Step 1: Looking up instance...');
    console.log('   Instance name:', msg.instanceName);
    
    const { data: instanceRecord, error: instanceError } = await supabase
      .from('instances')
      .select('id, workspace_id')
      .eq('name', msg.instanceName)
      .single();

    if (instanceError || !instanceRecord) {
      console.error('❌ [CHAT-SERVICE] Instance not found:', msg.instanceName);
      console.error('   Error:', instanceError);
      return { status: 'error', reason: 'Instance not found', code: 404 };
    }

    console.log('✅ [CHAT-SERVICE] Instance found:');
    console.log('   Instance ID:', instanceRecord.id);
    console.log('   Workspace ID:', instanceRecord.workspace_id);

    // 2. Find Inbox (via Junction Table)
    console.log('🔍 [CHAT-SERVICE] Step 2: Looking up inbox...');
    
    const { data: inboxLink } = await supabase
      .from('inbox_instances')
      .select('inbox_id')
      .eq('instance_id', instanceRecord.id)
      .limit(1)
      .single();

    const inboxId = inboxLink?.inbox_id || null;
    console.log('📥 [CHAT-SERVICE] Inbox:', inboxId || 'None (will use default)');

    // 3. Prepare Data
    const dbMessageType = msg.fromMe ? 'sent' : 'received';
    const now = new Date().toISOString(); // Or use msg.timestamp
    
    console.log('📝 [CHAT-SERVICE] Message type:', dbMessageType);
    console.log('⏰ [CHAT-SERVICE] Timestamp:', now);
    
    // 4. Determinar nome do contato
    let contactName = msg.remoteJid.split('@')[0]; // Fallback inicial: apenas o número
    
    // ✅ Obter token dinâmico via ProviderFactory para buscar nome real
    const ProviderFactory = (await import('./provider-factory.ts')).default;
    const provider = await ProviderFactory.getProviderForInstance(instanceRecord.id);
    const token = await ProviderFactory.getTokenForInstance(instanceRecord.id);
    
    if (token) {
      console.log('🔍 [CHAT-SERVICE] Fetching contact name from API...');
      console.log('   fromMe:', msg.fromMe);
      console.log('   pushName:', msg.pushName);
      console.log('   remoteJid:', msg.remoteJid);
      
      try {
        const profile = await provider.fetchProfile({
          instanceName: msg.instanceName,
          token: token,
          number: msg.remoteJid
        });
        
        if (profile && profile.name) {
          contactName = profile.name;
          console.log('✅ [CHAT-SERVICE] Real contact name found:', contactName);
        } else {
          // Se fromMe=false E não achou via API, usar pushName como fallback
          if (!msg.fromMe && msg.pushName) {
            contactName = msg.pushName;
            console.log('   Using pushName as fallback:', contactName);
          } else {
            console.log('   Using phone number as fallback:', contactName);
          }
        }
      } catch (error) {
        console.warn('⚠️  [CHAT-SERVICE] Failed to fetch profile, using fallback:', error);
        // Se fromMe=false E falhou a API, usar pushName como fallback
        if (!msg.fromMe && msg.pushName) {
          contactName = msg.pushName;
        }
      }
    } else {
      console.warn('⚠️  [CHAT-SERVICE] No API token configured for this instance');
      // Se não tem token E fromMe=false, usar pushName
      if (!msg.fromMe && msg.pushName) {
        contactName = msg.pushName;
      }
    }
    
    console.log('📝 [CHAT-SERVICE] Final contact_name:', contactName);
    
    // 5. ✅ Usar função RPC save_incoming_message (cria conversa + mensagem em uma única chamada)
    console.log('🔍 [CHAT-SERVICE] Step 3: Calling save_incoming_message RPC...');
    
    // ✅ Converter timestamp de segundos para milissegundos
    const messageTimestamp = msg.timestamp ? Math.floor(msg.timestamp * 1000) : null;
    console.log('⏰ [CHAT-SERVICE] Message timestamp (ms):', messageTimestamp);
    console.log('🔄 [CHAT-SERVICE] fromMe value being sent to RPC:', msg.fromMe, typeof msg.fromMe);
    
    const { data: result, error: rpcError } = await supabase.rpc('save_incoming_message', {
      p_workspace_id: instanceRecord.workspace_id,
      p_inbox_id: inboxId,
      p_contact_phone: msg.remoteJid, // Aceita com ou sem @s.whatsapp.net
      p_contact_name: contactName,
      p_content_type: msg.contentType,
      p_text_content: msg.content || `[${msg.contentType}]`,
      p_media_url: msg.mediaUrl || null,
      p_audio_duration: null, // TODO: extrair duração se for áudio
      p_file_name: null, // TODO: extrair nome do arquivo se for documento
      p_file_size: null, // TODO: extrair tamanho do arquivo
      p_provider_message_id: msg.messageId || null,
      p_lead_id: null,
      p_message_timestamp: messageTimestamp, // ✅ timestamp correto do webhook
      p_from_me: msg.fromMe // ✅ NOVO: identifica se foi enviada pelo atendente (WhatsApp Web/celular)
    });
    
    if (rpcError) {
      console.error('❌ [CHAT-SERVICE] RPC save_incoming_message failed');
      console.error('   Error Code:', rpcError.code);
      console.error('   Error Message:', rpcError.message);
      console.error('   Error Details:', rpcError.details);
      return { status: 'error', error: rpcError.message, code: 500 };
    }
    
    if (!result) {
      console.error('❌ [CHAT-SERVICE] RPC returned null');
      return { status: 'error', reason: 'RPC returned null', code: 500 };
    }

    console.log('✅ [CHAT-SERVICE] Message saved successfully via RPC');
    console.log('   Message ID:', result.message_id);
    console.log('   Conversation ID:', result.conversation_id);
    console.log('   Is new conversation?', result.conversation_is_new);
    console.log('   Attendant type:', result.attendant_type);
    console.log('   Agent ID:', result.agent_id || 'N/A');
    console.log('==============================================');
    console.log('✅ [CHAT-SERVICE] Processing complete!');
    console.log('==============================================\n');

    // ✅ NOVA FUNCIONALIDADE: Detecção automática de mensagens externas
    // Se fromMe=true (mensagem do atendente via WhatsApp Web/celular) e conversa está em AI
    if (msg.fromMe === true && result.attendant_type === 'ai') {
      try {
        console.log('🤖→👤 [CHAT-SERVICE] Mensagem do atendente detectada via WhatsApp Web/celular');
        console.log(`🔄 [CHAT-SERVICE] Alterando tipo de atendimento de AI para humano na conversa ${result.conversation_id}...`);
        
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ attendant_type: 'human' })
          .eq('id', result.conversation_id);
        
        if (updateError) {
          console.error('❌ [CHAT-SERVICE] Erro ao alterar tipo de atendimento:', updateError);
        } else {
          console.log('✅ [CHAT-SERVICE] Tipo de atendimento alterado para humano com sucesso');
        }
      } catch (error) {
        console.error('❌ [CHAT-SERVICE] Erro ao processar detecção de mensagem externa:', error);
        // Não bloquear o processamento da mensagem por causa deste erro
      }
    } else if (msg.fromMe === true && result.attendant_type === 'human') {
      console.log(`ℹ️ [CHAT-SERVICE] Conversa ${result.conversation_id} já está em modo humano, não precisa alterar`);
    }

    return { 
      status: 'success', 
      conversationId: result.conversation_id,
      messageId: result.message_id,
      isNew: result.conversation_is_new,
      agentId: result.agent_id
    };

  } catch (error) {
    console.error('\n==============================================');
    console.error('❌ [CHAT-SERVICE] ERROR occurred');
    console.error('==============================================');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('==============================================\n');
    return { status: 'error', message: error.message, code: 500 };
  }
};