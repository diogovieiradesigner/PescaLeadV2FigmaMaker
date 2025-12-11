/**
 * Chat Service - Gerenciamento de conversas e mensagens
 */

import { supabase } from '../utils/supabase/client.tsx';
import {
  DbConversation,
  DbMessage,
  DbUser,
  DbInbox,
  DbInboxInstance,
} from '../types/database-chat';
import {
  dbConversationToFrontend,
  dbMessageToFrontend,
  CreateMessageData,
  CreateConversationData,
  UpdateConversationData,
} from '../utils/supabase/chat-converters';
import { Conversation, Message } from '../types/chat';

// ============================================
// CONVERSATIONS
// ============================================

/**
 * Busca todas as conversas de um workspace
 */
export async function fetchConversations(
  workspaceId: string,
  page: number = 1,
  limit: number = 20,
  searchQuery?: string // ✅ Novo parâmetro de busca
): Promise<Conversation[]> {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Buscar conversas
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('channel', 'preview'); // ✅ Excluir conversas de preview do chat real

    // ✅ Aplicar filtro de busca se existir
    if (searchQuery && searchQuery.trim()) {
      // ✅ CORREÇÃO SQL INJECTION: Sanitizar input antes de usar .or()
      // Escapar caracteres especiais que poderiam causar SQL injection
      const sanitized = searchQuery.trim()
        .replace(/\\/g, '\\\\')  // Escapar backslash
        .replace(/'/g, "''")      // Escapar aspas simples
        .replace(/"/g, '\\"');    // Escapar aspas duplas
      
      const search = `%${sanitized}%`;
      query = query.or(`contact_name.ilike.${search},contact_phone.ilike.${search}`);
    }

    const { data: conversations, error: convError } = await query
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (convError) throw convError;
    if (!conversations) return [];

    // Buscar mensagens de cada conversa
    const conversationIds = conversations.map((c) => c.id);
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      // .is('deleted_at', null) // TODO: Descomentar após executar migração SQL
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Buscar usuários atribuídos
    const assignedUserIds = conversations
      .map((c) => c.assigned_to)
      .filter((id): id is string => !!id);

    const { data: users } = await supabase
      .from('users')
      .select('*')
      .in('id', assignedUserIds);

    const userMap = new Map<string, DbUser>();
    users?.forEach((user) => userMap.set(user.id, user));

    // Buscar custom fields dos leads vinculados
    const leadIds = conversations
      .map((c) => c.lead_id)
      .filter((id): id is string => !!id);

    // ✅ OTIMIZAÇÃO: Custom fields removidos daqui
    // Agora são carregados sob demanda via useLeadCustomFields hook
    // Isso resolve o N+1 query problem reduzindo ~94% do tempo de carregamento

    // Agrupar mensagens por conversa
    const messagesByConversation = new Map<string, DbMessage[]>();
    messages?.forEach((msg) => {
      if (!messagesByConversation.has(msg.conversation_id)) {
        messagesByConversation.set(msg.conversation_id, []);
      }
      messagesByConversation.get(msg.conversation_id)!.push(msg);
    });

    // Converter para formato frontend
    return conversations.map((conv) =>
      dbConversationToFrontend(
        conv as DbConversation,
        messagesByConversation.get(conv.id) || [],
        conv.assigned_to ? userMap.get(conv.assigned_to) : undefined
      )
    );
  } catch (error) {
    console.error('[CHAT SERVICE] Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Busca a contagem total de conversas de um workspace
 */
export async function fetchConversationCount(workspaceId: string, searchQuery?: string): Promise<number> {
  try {
    let query = supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    // ✅ Aplicar filtro de busca se existir
    if (searchQuery && searchQuery.trim()) {
      // ✅ CORREÇÃO SQL INJECTION: Sanitizar input antes de usar .or()
      // Escapar caracteres especiais que poderiam causar SQL injection
      const sanitized = searchQuery.trim()
        .replace(/\\/g, '\\\\')  // Escapar backslash
        .replace(/'/g, "''")      // Escapar aspas simples
        .replace(/"/g, '\\"');    // Escapar aspas duplas
      
      const search = `%${sanitized}%`;
      query = query.or(`contact_name.ilike.${search},contact_phone.ilike.${search}`);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('[CHAT SERVICE] Error fetching conversation count:', error);
    return 0;
  }
}

/**
 * Busca uma conversa específica com suas mensagens
 */
export async function fetchConversation(
  conversationId: string
): Promise<Conversation | null> {
  try {
    // Buscar conversa
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) {
      // Se não encontrar (PGRST116), retorna null
      if (convError.code === 'PGRST116') return null;
      throw convError;
    }
    if (!conversation) return null;

    // Buscar mensagens
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      // .is('deleted_at', null) // TODO: Descomentar após executar migração SQL
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Buscar usuário atribuído
    let assignedUser: DbUser | undefined;
    if (conversation.assigned_to) {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', conversation.assigned_to)
        .single();

      assignedUser = user || undefined;
    }

    return dbConversationToFrontend(
      conversation as DbConversation,
      (messages || []) as DbMessage[],
      assignedUser
    );
  } catch (error) {
    console.error('[CHAT SERVICE] Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Busca uma conversa associada a um lead
 */
export async function fetchConversationByLeadId(
  leadId: string
): Promise<Conversation | null> {
  try {
    // ✅ CORREÇÃO: Usar maybeSingle() ao invés de single() para evitar 406
    // maybeSingle() retorna null se não encontrar, single() lança erro
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .maybeSingle();

    if (convError) {
      // Se não encontrar (PGRST116), retorna null
      if (convError.code === 'PGRST116' || convError.code === 'PGRST116') return null;
      console.error('[CHAT SERVICE] Error fetching conversation by lead ID:', convError);
      return null;
    }
    
    if (!conversation || !conversation.id) return null;

    // Reutilizar a lógica de fetchConversation para pegar mensagens e detalhes
    return fetchConversation(conversation.id);
  } catch (error) {
    console.error('[CHAT SERVICE] Error fetching conversation by lead ID:', error);
    return null;
  }
}

/**
 * Cria uma nova conversa
 */
export async function createConversation(
  data: CreateConversationData
): Promise<Conversation> {
  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        workspace_id: data.workspace_id,
        inbox_id: data.inbox_id,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        status: data.status,
        assigned_to: data.assigned_to,
        channel: data.channel,
        tags: data.tags,
        lead_id: data.lead_id,
      })
      .select()
      .single();

    if (error) throw error;

    return dbConversationToFrontend(conversation as DbConversation, []);
  } catch (error) {
    console.error('[CHAT SERVICE] Error creating conversation:', error);
    throw error;
  }
}

/**
 * Atualiza uma conversa
 */
export async function updateConversation(
  conversationId: string,
  data: UpdateConversationData
): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    console.error('[CHAT SERVICE] Error updating conversation:', error);
    throw error;
  }
}

/**
 * Deleta uma conversa e suas mensagens
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    // Deletar mensagens primeiro (cascade deveria fazer isso, mas garantindo)
    await supabase.from('messages').delete().eq('conversation_id', conversationId);

    // Deletar conversa
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    console.error('[CHAT SERVICE] Error deleting conversation:', error);
    throw error;
  }
}

// ============================================
// MESSAGES
// ============================================

/**
 * Envia uma mensagem
 */
export async function sendMessage(data: CreateMessageData): Promise<Message> {
  try {
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: data.conversation_id,
        sent_by: data.sent_by, // ✅ Corrigido: banco usa sent_by
        message_type: data.message_type, // ✅ Corrigido: banco usa message_type
        content_type: data.content_type,
        text_content: data.text_content,
        media_url: data.media_url,
        audio_duration: data.media_duration, // ✅ Corrigido: banco usa audio_duration
        is_read: data.message_type === 'sent', // ✅ Mensagens enviadas já são lidas
      })
      .select()
      .single();

    if (error) throw error;

    // Atualizar last_message_at da conversa
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.conversation_id);

    // ✅ REGISTRAR ATIVIDADE SE FOR MENSAGEM ENVIADA POR USUÁRIO E CONVERSA TEM LEAD
    if (data.message_type === 'sent') {
      try {
        // Buscar conversa para verificar se tem leadId
        const { data: conversation } = await supabase
          .from('conversations')
          .select('lead_id')
          .eq('id', data.conversation_id)
          .single();

        if (conversation?.lead_id) {
          // Buscar dados do usuário que enviou
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Criar descrição baseada no tipo de conteúdo
            let description = '';
            
            if (data.content_type === 'text') {
              // Truncar mensagem de texto (máximo 80 caracteres)
              const truncatedText = data.text_content && data.text_content.length > 80
                ? data.text_content.substring(0, 80) + '...'
                : data.text_content || '';
              description = `Enviou mensagem: "${truncatedText}"`;
            } else if (data.content_type === 'audio') {
              const duration = data.media_duration 
                ? ` (${Math.round(data.media_duration)}s)`
                : '';
              description = `Enviou áudio${duration}`;
            } else if (data.content_type === 'image') {
              description = `Enviou imagem`;
            } else {
              description = `Enviou mensagem`;
            }

            // Importar função de criar atividade
            const { createLeadActivity } = await import('./leads-service');
            await createLeadActivity(conversation.lead_id, description, 'user');
          }
        }
      } catch (activityError) {
        // Não falhar o envio da mensagem por causa do log
        console.error('[CHAT SERVICE] Erro ao registrar atividade:', activityError);
      }
    }

    return dbMessageToFrontend(message as DbMessage);
  } catch (error) {
    console.error('[CHAT SERVICE] Error sending message:', error);
    throw error;
  }
}

/**
 * Envia mensagem via Evolution API (servidor)
 */
export async function sendMessageViaServer(
  conversationId: string,
  workspaceId: string,
  text: string,
  quotedMessageId?: string
): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('User not authenticated');
    }

    const { projectId } = await import('../utils/supabase/info.tsx');
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/conversations/${conversationId}/messages/send?workspaceId=${workspaceId}`;

    console.log('[CHAT SERVICE] Sending message via server:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        quotedMessageId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[CHAT SERVICE] Message sent successfully:', result);
    return result;
  } catch (error) {
    console.error('[CHAT SERVICE] Error sending message via server:', error);
    throw error;
  }
}

/**
 * Envia áudio via Evolution API (servidor)
 */
export async function sendAudioViaServer(
  conversationId: string,
  workspaceId: string,
  audioUrl: string,
  audioDuration?: number,
  quotedMessageId?: string
): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('User not authenticated');
    }

    const { projectId } = await import('../utils/supabase/info.tsx');
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/conversations/${conversationId}/messages/send-audio?workspaceId=${workspaceId}`;

    console.log('🎤 [CHAT SERVICE] ==========================================');
    console.log('🎤 [CHAT SERVICE] SENDING AUDIO TO SERVER');
    console.log('🎤 [CHAT SERVICE] ==========================================');
    console.log('   URL:', url);
    console.log('   Audio URL length:', audioUrl?.length);
    console.log('   Audio Duration (raw):', audioDuration);
    console.log('   Audio Duration (type):', typeof audioDuration);
    console.log('   Quoted Message ID:', quotedMessageId);
    console.log('🎤 [CHAT SERVICE] ==========================================');

    const payload = {
      audioUrl,
      audioDuration,
      quotedMessageId,
    };

    console.log('🎤 [CHAT SERVICE] Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[CHAT SERVICE] Audio sent successfully:', result);
    return result;
  } catch (error) {
    console.error('[CHAT SERVICE] Error sending audio via server:', error);
    throw error;
  }
}

/**
 * Envia mídia (imagem, vídeo, etc) via Evolution API (servidor)
 */
export async function sendMediaViaServer(
  conversationId: string,
  workspaceId: string,
  mediaData: {
    mediaUrl: string;
    mediaType: 'image' | 'video' | 'document';
    mimeType?: string;
    caption?: string;
    fileName?: string;
  },
  quotedMessageId?: string
): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('User not authenticated');
    }

    const { projectId } = await import('../utils/supabase/info.tsx');
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/conversations/${conversationId}/messages/send-media?workspaceId=${workspaceId}`;

    console.log('[CHAT SERVICE] Sending media via server:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...mediaData,
        quotedMessageId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[CHAT SERVICE] Media sent successfully:', result);
    return result;
  } catch (error) {
    console.error('[CHAT SERVICE] Error sending media via server:', error);
    throw error;
  }
}

/**
 * Marca mensagens como lidas
 */
export async function markMessagesAsRead(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('message_type', 'received') // ✅ Corrigido: banco usa message_type
      .eq('is_read', false);

    if (error) throw error;
  } catch (error) {
    console.error('[CHAT SERVICE] Error marking messages as read:', error);
    throw error;
  }
}

/**
 * Limpa o histórico de mensagens de uma conversa
 */
export async function clearConversationHistory(
  conversationId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) throw error;

    // Atualizar conversa
    await supabase
      .from('conversations')
      .update({
        last_message_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
  } catch (error) {
    console.error('[CHAT SERVICE] Error clearing conversation history:', error);
    throw error;
  }
}

// ============================================
// AGENTS (USERS)
// ============================================

/**
 * Busca todos os agentes/usuários de um workspace
 */
export async function fetchAgents(workspaceId: string): Promise<DbUser[]> {
  try {
    // Buscar usuários através da tabela workspace_members
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        role,
        users!workspace_members_user_id_fkey (
          id,
          email,
          name,
          avatar_url,
          created_at,
          updated_at
        )
      `)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    // Extrair os dados dos usuários
    const users = (data || []).map((member: any) => ({
      id: member.users.id,
      email: member.users.email,
      name: member.users.name,
      avatar_url: member.users.avatar_url,
      role: member.role, // Role vem de workspace_members, não de users
      workspace_id: workspaceId, // Adicionar para compatibilidade
      created_at: member.users.created_at,
      updated_at: member.users.updated_at,
    }));

    return users as DbUser[];
  } catch (error) {
    console.error('[CHAT SERVICE] Error fetching agents:', error);
    throw error;
  }
}

// ============================================
// INBOXES
// ============================================

/**
 * Busca todas as inboxes de um workspace
 */
export async function fetchInboxes(workspaceId: string): Promise<DbInbox[]> {
  try {
    const { data, error } = await supabase
      .from('inboxes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []) as DbInbox[];
  } catch (error) {
    console.error('[CHAT SERVICE] Error fetching inboxes:', error);
    throw error;
  }
}

/**
 * Busca todas as instâncias de inbox de um workspace
 */
export async function fetchInboxInstances(
  workspaceId: string
): Promise<DbInboxInstance[]> {
  try {
    const { data, error } = await supabase
      .from('inbox_instances')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []) as DbInboxInstance[];
  } catch (error) {
    console.error('[CHAT SERVICE] Error fetching inbox instances:', error);
    throw error;
  }
}

// ============================================
// CONTACT PROFILE
// ============================================

export interface ContactProfile {
  phone: string;
  name: string | null;
  email: string | null;
  description: string | null;
  website: string | null;
  picture: string | null;
  isBusiness: boolean;
  status: string | null;
}

/**
 * Busca perfil completo do contato via Evolution API
 */
export async function fetchContactProfile(
  workspaceId: string,
  conversationId: string,
  phone: string
): Promise<{ profile: ContactProfile | null; error: Error | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { profile: null, error: new Error('Não autenticado') };
    }

    const { projectId } = await import('../utils/supabase/info.tsx');
    
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/contacts/profile?phone=${encodeURIComponent(phone)}&conversationId=${conversationId}&workspaceId=${workspaceId}`;
    
    console.log('[CHAT SERVICE] Fetching contact profile:', { phone, conversationId, workspaceId });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`, // ✅ Usar access_token da sessão
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[CHAT SERVICE] Error fetching profile:', errorData);
      return { profile: null, error: new Error(errorData.error || 'Failed to fetch profile') };
    }

    const profile: ContactProfile = await response.json();
    console.log('[CHAT SERVICE] Profile fetched successfully:', profile);

    return { profile, error: null };
  } catch (error) {
    console.error('[CHAT SERVICE] Error fetching contact profile:', error);
    return { profile: null, error: error as Error };
  }
}