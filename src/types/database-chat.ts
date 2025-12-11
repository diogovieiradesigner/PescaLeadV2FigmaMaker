/**
 * Database types for Chat/Conversations (snake_case)
 */

export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbConversation {
  id: string;
  workspace_id: string;
  inbox_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  contact_avatar?: string;
  status: 'waiting' | 'in-progress' | 'resolved';
  assigned_to?: string; // user_id
  channel: 'whatsapp' | 'email' | 'chat';
  tags?: string[];
  lead_id?: string;
  lead_extraction_run_id?: string | null; // ✅ ID da run de extração (vem do lead via JOIN)
  attendant_type?: 'human' | 'ai'; // ✅ Tipo de atendente
  unread_count?: number; // ✅ Contador de mensagens não lidas
  total_messages?: number; // ✅ Total de mensagens na conversa
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  content_type: 'text' | 'image' | 'audio';
  message_type: 'sent' | 'received'; // ✅ Corrigido: banco usa message_type
  text_content?: string;
  media_url?: string;
  media_duration?: number; // for audio
  is_read: boolean;
  sent_by?: string; // user_id (quem enviou)
  pipeline_id?: string; // ✅ ID do pipeline de IA
  created_at: string;
  // ✅ Campos de transcrição
  transcription?: string;
  transcription_status?: 'none' | 'pending' | 'processing' | 'completed' | 'failed' | 'disabled';
  transcription_provider?: string;
  transcribed_at?: string;
}

export interface DbInbox {
  id: string;
  workspace_id: string;
  name: string;
  channel: 'whatsapp' | 'email' | 'chat';
  instance_id?: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DbInboxInstance {
  id: string;
  workspace_id: string;
  name: string;
  instance_key: string;
  phone_number?: string;
  status: 'active' | 'inactive' | 'error';
  provider: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}