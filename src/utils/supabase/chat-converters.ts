/**
 * Converters for Chat/Conversations between Database and Frontend formats
 */

import { Conversation, Message } from '../../types/chat';
import { DbConversation, DbMessage, DbUser } from '../../types/database-chat';

// ============================================
// MESSAGE: DB → Frontend
// ============================================

export function dbMessageToFrontend(dbMessage: DbMessage): Message {
  return {
    id: dbMessage.id,
    text: dbMessage.text_content,
    contentType: dbMessage.content_type,
    imageUrl: dbMessage.content_type === 'image' ? dbMessage.media_url : undefined,
    audioUrl: dbMessage.content_type === 'audio' ? dbMessage.media_url : undefined,
    audioDuration: dbMessage.media_duration,
    // ✅ Campos para video e document
    mediaUrl: (dbMessage.content_type === 'video' || dbMessage.content_type === 'document') ? dbMessage.media_url : undefined,
    fileName: dbMessage.file_name,
    fileSize: dbMessage.file_size,
    mimeType: dbMessage.mime_type,
    type: dbMessage.message_type, // ✅ Usa diretamente message_type do banco
    status: dbMessage.message_type === 'sent' ? 'sent' : undefined, // ✅ Define status enviado para mensagens do banco
    timestamp: (() => {
      const date = new Date(dbMessage.created_at);
      const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `${time} ${dateStr}`;
    })(),
    createdAt: dbMessage.created_at, // ✅ Timestamp completo para ordenação
    read: dbMessage.is_read,
    pipelineId: dbMessage.pipeline_id, // ✅ ID do pipeline de IA
    // ✅ Campos de transcrição
    transcription: dbMessage.transcription,
    transcriptionStatus: dbMessage.transcription_status,
    transcriptionProvider: dbMessage.transcription_provider,
    transcribedAt: dbMessage.transcribed_at,
  };
}

// ============================================
// CONVERSATION: DB → Frontend
// ============================================

export function dbConversationToFrontend(
  dbConversation: DbConversation,
  messages: DbMessage[],
  assignedUser?: DbUser
): Conversation {
  // ✅ Ordenar mensagens por created_at (mais antiga primeiro, mais recente no final)
  const sortedMessages = messages
    .map(dbMessageToFrontend)
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB; // Ordem crescente: mais antiga → mais recente
    });

  // ✅ Buscar última mensagem não-deletada para preview
  const lastNonDeletedMessage = sortedMessages
    .filter((m) => m.type !== 'delete')
    .slice(-1)[0];

  const unreadCount = messages.filter(
    (m) => m.message_type === 'received' && !m.is_read // ✅ Corrigido: mensagens recebidas não lidas
  ).length;

  // Get last message preview
  let lastMessageText = '';
  if (lastNonDeletedMessage) {
    if (lastNonDeletedMessage.contentType === 'text' && lastNonDeletedMessage.text) {
      lastMessageText = lastNonDeletedMessage.text;
    } else if (lastNonDeletedMessage.contentType === 'image') {
      lastMessageText = '📷 Imagem';
    } else if (lastNonDeletedMessage.contentType === 'audio') {
      lastMessageText = '🎤 Áudio';
    } else if (lastNonDeletedMessage.contentType === 'video') {
      lastMessageText = '🎬 Vídeo';
    } else if (lastNonDeletedMessage.contentType === 'document') {
      lastMessageText = `📎 ${lastNonDeletedMessage.fileName || 'Documento'}`;
    }
  }

  // Format timestamp
  const lastMessageDate = dbConversation.last_message_at
    ? new Date(dbConversation.last_message_at)
    : new Date(dbConversation.updated_at);

  const now = new Date();
  const diffInMs = now.getTime() - lastMessageDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  let timestamp = '';
  if (diffInMinutes < 1) {
    timestamp = 'Agora';
  } else if (diffInMinutes < 60) {
    timestamp = `${diffInMinutes}min`;
  } else if (diffInHours < 24) {
    timestamp = `${diffInHours}h`;
  } else {
    timestamp = `${diffInDays}d`;
  }

  return {
    id: dbConversation.id,
    contactName: dbConversation.contact_name,
    contactPhone: dbConversation.contact_phone,
    avatar: dbConversation.contact_avatar || '',
    lastMessage: lastMessageText,
    timestamp,
    status: dbConversation.status,
    unreadCount,
    assignedTo: dbConversation.assigned_to || null, // ✅ UUID ou null
    assignedToName: assignedUser?.name || 'Não atribuído', // ✅ Nome para exibição
    channel: dbConversation.channel,
    messages: sortedMessages,
    totalMessages: dbConversation.total_messages || messages.length, // ✅ Usar campo do banco
    lastUpdate: lastMessageDate.toLocaleString('pt-BR'),
    tags: dbConversation.tags || [],
    leadId: dbConversation.lead_id,
    leadExtractionRunId: dbConversation.lead_extraction_run_id || null, // ✅ ID da run de extração para filtro
    campaignRunId: dbConversation.campaign_run_id || null, // ✅ ID da run de campanha para filtro
    attendantType: dbConversation.attendant_type || 'human', // ✅ Tipo de atendente
    workspaceId: dbConversation.workspace_id, // ✅ Workspace ID para filtrar realtime
  };
}

// ============================================
// MESSAGE: Frontend → DB
// ============================================

export interface CreateMessageData {
  conversation_id: string;
  sent_by?: string; // user_id que enviou
  message_type: 'sent' | 'received' | 'delete'; // ✅ Corrigido: banco usa message_type
  content_type: 'text' | 'image' | 'audio' | 'video' | 'document'; // ✅ Adicionado video e document
  text_content?: string;
  media_url?: string;
  media_duration?: number;
  file_name?: string;   // ✅ Nome do arquivo (para documentos)
  file_size?: number;   // ✅ Tamanho em bytes
  mime_type?: string;   // ✅ MIME type
}

// ============================================
// CONVERSATION: Frontend → DB
// ============================================

export interface CreateConversationData {
  workspace_id: string;
  inbox_id: string;
  contact_name: string;
  contact_phone: string;
  status: 'waiting' | 'in-progress' | 'resolved';
  assigned_to?: string;
  channel: 'whatsapp' | 'email' | 'chat';
  tags?: string[];
  lead_id?: string;
}

export interface UpdateConversationData {
  status?: 'waiting' | 'in-progress' | 'resolved';
  assigned_to?: string;
  tags?: string[];
  last_message_at?: string;
  attendant_type?: 'human' | 'ai'; // ✅ Tipo de atendente
}