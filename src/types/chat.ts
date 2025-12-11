export type MessageType = 'sent' | 'received' | 'delete';

export type MessageContentType = 'text' | 'image' | 'audio';

export type ConversationStatus = 'waiting' | 'in-progress' | 'resolved';

export type MessageStatus = 'sending' | 'sent' | 'error';

export type TranscriptionStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed' | 'disabled';

export interface Message {
  id: string;
  text?: string;
  contentType: MessageContentType;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  type: MessageType;
  timestamp: string; // Formatado para exibição (HH:MM)
  createdAt?: string; // ISO timestamp completo para ordenação
  read?: boolean;
  status?: MessageStatus; // Status de envio da mensagem
  conversationId?: string; // ID da conversa
  sender?: 'agent' | 'contact'; // Quem enviou
  pipelineId?: string; // ✅ ID do pipeline de IA (para logs RAG, tools, guardrails)
  // ✅ Campos de transcrição
  transcription?: string; // Transcrição/descrição da mídia
  transcriptionStatus?: TranscriptionStatus; // Status da transcrição
  transcriptionProvider?: string; // Provider usado (groq, openrouter, etc)
  transcribedAt?: string; // Timestamp da transcrição
}

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  status: ConversationStatus;
  unreadCount: number;
  assignedTo: string | null; // ✅ UUID do agente ou null
  assignedToName?: string; // ✅ Nome do agente para exibição
  channel: 'whatsapp' | 'email' | 'chat';
  messages: Message[];
  totalMessages: number;
  lastUpdate: string;
  tags?: string[];
  leadId?: string; // Link para o lead no pipeline
  leadExtractionId?: string | null; // ✅ ID da extração que gerou o lead (para filtro)
  leadCustomFields?: Array<{ // ✅ Campos personalizados do lead
    id: string;
    fieldName: string;
    fieldType: 'text' | 'number' | 'date' | 'email' | 'phone' | 'url' | 'textarea';
    fieldValue: string;
  }>;
  attendantType?: 'human' | 'ai'; // ✅ Tipo de atendente
  workspaceId?: string; // ✅ ID do workspace para filtrar realtime
}