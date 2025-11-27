// 1. EVOLUTION SPECIFIC TYPES
export interface EvolutionWebhookPayload {
  event: string;
  instance: string; // Name of the instance in Evolution
  data: {
    // Format A: Array of messages
    messages?: Array<EvolutionMessage>;
    
    // Format B: Single message object (data IS the message)
    key?: EvolutionMessageKey;
    message?: any;
    messageTimestamp?: number | string;
    pushName?: string;
    status?: string;
    
    // Common
    type?: string;
  };
  sender?: string;
}

export interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface EvolutionMessage {
  key: EvolutionMessageKey;
  message?: any;
  messageTimestamp?: number | string;
  pushName?: string;
  status?: string;
}

// 2. GENERIC SYSTEM TYPES (Our Abstraction Layer)
export interface UnifiedMessage {
  instanceName: string;
  remoteJid: string; // The contact's ID/Phone
  fromMe: boolean;
  messageId: string; // The provider's ID for the message
  pushName: string; // Contact name provided by API
  content: string;
  contentType: 'text' | 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  timestamp: number; // Unix timestamp
}

// 3. DATABASE TYPES
export interface DbInstance {
  id: string;
  name: string;
  workspace_id: string;
  status: string;
}

export interface DbConversation {
  id: string;
  workspace_id: string;
  inbox_id?: string;
  lead_id?: string;
  contact_name: string;
  contact_phone: string;
  last_message: string;
  unread_count: number;
  total_messages: number;
  status: 'waiting' | 'in-progress' | 'resolved';
  channel: 'whatsapp' | 'email' | 'chat' | 'instagram' | 'telegram';
  updated_at: string;
  last_message_at: string;
}

export interface DbMessage {
  id?: string;
  conversation_id: string;
  content_type: 'text' | 'image' | 'audio' | 'video' | 'document';
  message_type: 'sent' | 'received';
  text_content?: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

// 4. INSTANCE MANAGEMENT TYPES
export interface CreateInstancePayload {
  workspaceId: string;
  instanceName: string;
  provider: 'evolution' | 'z-api';
  phone?: string; // Optional, depends on provider
}

export interface InstanceConnectionResult {
  instanceId: string;
  instanceName: string;
  token?: string;
  qrCode?: string; // Base64
  providerConfig: any;
  apiKey: string; // The global key used
}

// 5. PROVIDER INTERFACE (Strategy Pattern)
export interface IWhatsAppProvider {
  createInstance(params: { name: string; token: string; phone?: string }): Promise<InstanceConnectionResult>;
  
  getInstanceStatus(params: { instanceName: string; token: string }): Promise<{
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    raw?: any;
  }>;
  
  getQRCode(params: { instanceName: string; token: string }): Promise<{
    base64?: string;
    code?: string;
  }>;
  
  logout(params: { instanceName: string; token: string }): Promise<boolean>;
  
  delete(params: { instanceName: string; token: string }): Promise<boolean>;

  restart(params: { instanceName: string; token: string }): Promise<boolean>;

  // ✅ NOVO: Método connect() específico para Uazapi (e outros que precisem)
  connect?(params: { instanceName: string; token: string; phone: string }): Promise<{
    qrcode?: string;
    paircode?: string;
    base64?: string;
    pairingCode?: string;
    connected: boolean;
    raw?: any;
  }>;

  fetchProfilePictureUrl(params: { instanceName: string; token: string; number: string }): Promise<string | null>; // ✅ CORRIGIDO: "phone" → "number"

  // ✅ Método para deletar mensagens no WhatsApp
  deleteMessage(params: { 
    instanceName: string; 
    token: string; 
    messageId: string;
    remoteJid: string;
    fromMe: boolean;
    participant?: string;
  }): Promise<any>;
}