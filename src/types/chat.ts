export type MessageType = 'sent' | 'received';

export type MessageContentType = 'text' | 'image' | 'audio';

export type ConversationStatus = 'waiting' | 'in-progress' | 'resolved';

export interface Message {
  id: string;
  text?: string;
  contentType: MessageContentType;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  type: MessageType;
  timestamp: string;
  read?: boolean;
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
  assignedTo: string;
  channel: 'whatsapp' | 'email' | 'chat';
  messages: Message[];
  totalMessages: number;
  lastUpdate: string;
}