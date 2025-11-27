// ============================================
// DATABASE TYPES (snake_case)
// Tipos que mapeiam EXATAMENTE as tabelas do Supabase
// ============================================

// ============================================
// USERS
// ============================================
export interface DbUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  last_workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// WORKSPACES
// ============================================
export interface DbWorkspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================
// WORKSPACE MEMBERS
// ============================================
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface DbWorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  permissions: string[];
  invited_by: string | null;
  joined_at: string;
}

// ============================================
// WORKSPACE INVITES
// ============================================
export interface DbWorkspaceInvite {
  code: string;
  workspace_id: string;
  invited_by: string;
  role: 'admin' | 'member' | 'viewer';
  used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// ============================================
// FUNNELS
// ============================================
export interface DbFunnel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// FUNNEL COLUMNS
// ============================================
export interface DbFunnelColumn {
  id: string;
  funnel_id: string;
  title: string;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// LEADS
// ============================================
export type LeadPriority = 'low' | 'medium' | 'high';
export type LeadStatus = 'active' | 'won' | 'lost' | 'archived';

export interface DbLead {
  id: string;
  workspace_id: string;
  funnel_id: string;
  column_id: string | null;
  
  // Informações do Cliente
  client_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  
  // Detalhes do Negócio
  deal_value: number;
  priority: LeadPriority | null;
  status: LeadStatus;
  
  // Datas
  contact_date: string | null;
  expected_close_date: string | null;
  due_date: string | null;
  
  // Metadata
  tags: string[];
  notes: string | null;
  position: number;
  is_important: boolean;
  
  // Assignee (desnormalizado)
  assignee_name: string | null;
  assignee_avatar: string | null;
  
  // Contadores de atividades (desnormalizado)
  comments_count: number;
  attachments_count: number;
  calls_count: number;
  emails_count: number;
  
  // Rastreamento
  assigned_to: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

// ============================================
// LEAD ACTIVITIES
// ============================================
export type ActivityType = 
  | 'note' 
  | 'call' 
  | 'email' 
  | 'meeting' 
  | 'status_change' 
  | 'moved' 
  | 'created' 
  | 'updated';

export interface DbLeadActivity {
  id: string;
  lead_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================
// LEAD ATTACHMENTS
// ============================================
export interface DbLeadAttachment {
  id: string;
  lead_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

// ============================================
// CUSTOM FIELDS
// ============================================
export type CustomFieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'multi_select' 
  | 'checkbox' 
  | 'url' 
  | 'email' 
  | 'phone';

export interface DbCustomField {
  id: string;
  workspace_id: string;
  name: string;
  field_type: CustomFieldType;
  options: string[];
  is_required: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// LEAD CUSTOM VALUES
// ============================================
export interface DbLeadCustomValue {
  id: string;
  lead_id: string;
  custom_field_id: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// INSTANCES
// ============================================
export type InstanceProvider = 'whatsapp' | 'instagram' | 'telegram';
export type InstanceStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface DbInstance {
  id: string;
  workspace_id: string;
  name: string;
  provider: InstanceProvider;
  phone_number: string | null;
  status: InstanceStatus;
  qr_code: string | null;
  api_key: string | null;
  webhook_url: string | null;
  working_hours: {
    start: string;
    end: string;
  };
  settings: Record<string, any>;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// INBOXES
// ============================================
export interface DbInbox {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  auto_assignment: boolean;
  assigned_agents: string[];
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONVERSATIONS
// ============================================
export type ConversationStatus = 'waiting' | 'in-progress' | 'resolved';
export type ConversationChannel = 'whatsapp' | 'email' | 'chat' | 'instagram' | 'telegram';

export interface DbConversation {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  inbox_id: string | null;
  assigned_to: string | null;
  contact_name: string;
  contact_phone: string;
  avatar_url: string | null;
  status: ConversationStatus;
  channel: ConversationChannel;
  last_message: string | null;
  unread_count: number;
  total_messages: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

// ============================================
// MESSAGES
// ============================================
export type MessageContentType = 'text' | 'image' | 'audio' | 'video' | 'document';
export type MessageType = 'sent' | 'received';

export interface DbMessage {
  id: string;
  conversation_id: string;
  content_type: MessageContentType;
  message_type: MessageType;
  text_content: string | null;
  media_url: string | null;
  audio_duration: number | null;
  file_name: string | null;
  file_size: number | null;
  is_read: boolean;
  sent_by: string | null;
  created_at: string;
  deleted_at: string | null; // 🗑️ Timestamp quando foi deletada
}

// ============================================
// AUDIT LOG
// ============================================
export type AuditActionType = 
  | 'lead_created' 
  | 'lead_updated' 
  | 'lead_moved' 
  | 'lead_deleted'
  | 'funnel_created' 
  | 'funnel_updated' 
  | 'funnel_deleted'
  | 'member_added' 
  | 'member_removed' 
  | 'workspace_updated'
  | 'conversation_created' 
  | 'conversation_updated';

export type AuditEntityType = 'lead' | 'funnel' | 'workspace' | 'member' | 'conversation';

export interface DbAuditLog {
  id: string;
  workspace_id: string;
  sequence: number;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string | null;
  user_id: string | null;
  user_name: string | null;
  changes: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================
// FUNNEL STATS
// ============================================
export interface DbFunnelStats {
  funnel_id: string;
  workspace_id: string;
  total_leads: number;
  total_value: number;
  high_priority_count: number;
  column_stats: Record<string, {
    count: number;
    total_value: number;
  }>;
  last_updated: string;
  updated_at: string;
}

// ============================================
// HELPER TYPES
// ============================================

// Workspace com dados do owner
export interface DbWorkspaceWithOwner extends DbWorkspace {
  owner?: DbUser;
}

// Workspace com membership do usuário atual
export interface DbWorkspaceWithMembership extends DbWorkspace {
  membership?: DbWorkspaceMember;
}

// Lead com dados relacionados
export interface DbLeadWithRelations extends DbLead {
  column?: DbFunnelColumn;
  funnel?: DbFunnel;
  activities?: DbLeadActivity[];
  attachments?: DbLeadAttachment[];
  custom_values?: DbLeadCustomValue[];
}

// Funnel com colunas
export interface DbFunnelWithColumns extends DbFunnel {
  columns?: DbFunnelColumn[];
}

// Funnel com colunas e leads
export interface DbFunnelComplete extends DbFunnel {
  columns?: (DbFunnelColumn & {
    leads?: DbLead[];
  })[];
}