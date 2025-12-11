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
    
    // 4. Find or Create Conversation
    console.log('🔍 [CHAT-SERVICE] Step 3: Looking up conversation...');
    console.log('   Contact phone:', msg.remoteJid);
    
    let conversationId: string;

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, unread_count, total_messages, status, contact_name')
      .eq('workspace_id', instanceRecord.workspace_id)
      .eq('contact_phone', msg.remoteJid)
      .single();

    if (existingConv) {
      console.log('✅ [CHAT-SERVICE] Existing conversation found:');
      console.log('   Conversation ID:', existingConv.id);
      console.log('   Current contact_name:', existingConv.contact_name);
      console.log('   Current unread count:', existingConv.unread_count);
      console.log('   Current total messages:', existingConv.total_messages);
      console.log('   Current status:', existingConv.status);
      
      conversationId = existingConv.id;
      
      const updates: any = {
        last_message: msg.content || `[${msg.contentType}]`,
        last_message_at: now,
        updated_at: now,
        total_messages: (existingConv.total_messages || 0) + 1
      };

      if (dbMessageType === 'received') {
        updates.unread_count = (existingConv.unread_count || 0) + 1;
        if (existingConv.status === 'resolved') {
          updates.status = 'waiting';
        }
      }
      
      // ✅ CORREÇÃO: Se fromMe=true e o nome parece ser genérico (só números ou pushName da instância),
      // buscar o nome real do contato via Evolution API
      const currentName = existingConv.contact_name || '';
      const isGenericName = /^\d+$/.test(currentName) || currentName === msg.pushName;
      
      console.log('🔍 [CHAT-SERVICE] Checking if name needs update...');
      console.log('   Current name:', currentName);
      console.log('   Message pushName:', msg.pushName);
      console.log('   Is generic?', isGenericName);
      console.log('   Message type:', dbMessageType);
      
      if (isGenericName) {
        console.log('🔍 [CHAT-SERVICE] Detected generic contact name, fetching real name from Evolution API...');
        
        // ✅ Obter token dinâmico via ProviderFactory
        const ProviderFactory = (await import('./provider-factory.ts')).default;
        const provider = await ProviderFactory.getProviderForInstance(instanceRecord.id);
        const token = await ProviderFactory.getTokenForInstance(instanceRecord.id);
        
        if (token) {
          try {
            console.log('   Calling fetchProfile with number:', msg.remoteJid);
            
            const profile = await provider.fetchProfile({
              instanceName: msg.instanceName,
              token: token,
              number: msg.remoteJid
            });
            
            console.log('   Profile response:', profile);
            
            if (profile && profile.name && profile.name !== currentName) {
              updates.contact_name = profile.name;
              console.log('✅ [CHAT-SERVICE] Updated contact name from', currentName, 'to', profile.name);
            } else {
              console.log('⚠️  [CHAT-SERVICE] No new name in profile or same name');
            }
          } catch (error) {
            console.warn('⚠️  [CHAT-SERVICE] Failed to fetch profile:', error);
          }
        } else {
          console.warn('⚠️  [CHAT-SERVICE] No API token configured for this instance');
        }
      }

      console.log('🔄 [CHAT-SERVICE] Updating conversation with:', updates);
      
      await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId);
      
      console.log('✅ [CHAT-SERVICE] Conversation updated successfully');

    } else {
      console.log('🆕 [CHAT-SERVICE] Creating new conversation...');
      
      // ✅ CORREÇÃO CRÍTICA: 
      // - fromMe=false: pushName é o nome do contato (quem enviou) ✅
      // - fromMe=true: pushName é o nome da INSTÂNCIA (seu nome) ❌ NÃO USE!
      
      let contactName = msg.remoteJid.split('@')[0]; // Fallback inicial: apenas o número
      
      // ✅ Obter token dinâmico via ProviderFactory
      const ProviderFactory = (await import('./provider-factory.ts')).default;
      const provider = await ProviderFactory.getProviderForInstance(instanceRecord.id);
      const token = await ProviderFactory.getTokenForInstance(instanceRecord.id);
      
      if (token) {
        console.log('🔍 [CHAT-SERVICE] Fetching real contact name from Evolution API...');
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
            console.log('⚠️  [CHAT-SERVICE] No name in profile');
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
      
      const conversationData = {
        workspace_id: instanceRecord.workspace_id,
        inbox_id: inboxId,
        contact_phone: msg.remoteJid,
        contact_name: contactName, // ✅ Nome correto do contato, NUNCA o nome da instância
        channel: 'whatsapp',
        status: 'waiting',
        last_message: msg.content || `[${msg.contentType}]`,
        last_message_at: now,
        unread_count: dbMessageType === 'received' ? 1 : 0,
        total_messages: 1
      };
      
      console.log('   Conversation data:', conversationData);
      console.log('   Attempting insert with Service Role Key...');
      
      // Test: Check if we can read from conversations first
      const { data: testRead, error: testReadError } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);
      
      console.log('   RLS Test - Can read conversations?', testReadError ? '❌ NO' : '✅ YES');
      if (testReadError) {
        console.log('   Read error:', testReadError);
      }
      
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (createError) {
        console.error('❌ [CHAT-SERVICE] Failed to create conversation');
        console.error('   Error Code:', createError.code);
        console.error('   Error Message:', createError.message);
        console.error('   Error Details:', createError.details);
        console.error('   Error Hint:', createError.hint);
        
        // If permission denied, it confirms RLS/Role issue
        if (createError.code === '42501') {
            console.error('   🚨 PERMISSION DENIED (RLS). Service Role Key might be invalid or RLS policy excludes service_role.');
        }
        
        return { status: 'error', error: createError.message, code: 500 };
      }

      if (!newConv) {
         console.error('❌ [CHAT-SERVICE] Created conversation but returned null');
         return { status: 'error', reason: 'Conversation creation returned null', code: 500 };
      }
      
      conversationId = newConv.id;
      console.log('✅ [CHAT-SERVICE] New conversation created with ID:', conversationId);
    }

    // 5. Insert Message (with soft deduplication)
    console.log('🔍 [CHAT-SERVICE] Step 4: Checking for duplicates...');
    
    const { data: potentialDupes } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('text_content', msg.content)
      .eq('message_type', dbMessageType)
      // Check last 10 seconds to be safe
      .gt('created_at', new Date(Date.now() - 10000).toISOString()) 
      .limit(1);

    if (potentialDupes && potentialDupes.length > 0) {
      console.log('⏭️  [CHAT-SERVICE] Duplicate message detected, skipping...');
      return { status: 'skipped', reason: 'Duplicate detected' };
    }

    console.log('✅ [CHAT-SERVICE] No duplicates found, inserting message...');
    
    const messageData: any = {
      conversation_id: conversationId,
      content_type: msg.contentType,
      message_type: dbMessageType,
      text_content: msg.content,
      media_url: msg.mediaUrl,
      is_read: dbMessageType === 'sent',
      created_at: now,
      provider_message_id: msg.messageId || null // ✅ Salvar ID do provider para permitir deletar no WhatsApp
    };
    
    console.log('   Message data:', messageData);
    console.log(`   ✅ Provider message ID saved: ${msg.messageId || 'N/A'}`);

    const { error: msgError } = await supabase
      .from('messages')
      .insert(messageData);

    if (msgError) {
      console.error('❌ [CHAT-SERVICE] Failed to insert message:', msgError);
      return { status: 'error', error: msgError.message, code: 500 };
    }

    console.log('✅ [CHAT-SERVICE] Message inserted successfully');
    console.log('==============================================');
    console.log('✅ [CHAT-SERVICE] Processing complete!');
    console.log('   Conversation ID:', conversationId);
    console.log('==============================================\n');

    return { status: 'success', conversationId };

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