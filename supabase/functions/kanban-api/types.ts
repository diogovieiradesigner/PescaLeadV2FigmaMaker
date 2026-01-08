// =============================================================================
// TIPOS - Kanban API
// =============================================================================

export interface Lead {
  id: string;
  workspace_id: string;
  funnel_id: string;
  column_id: string;
  position: number;
  
  // Lead data
  clientName: string;
  company: string;
  email?: string;
  phone?: string;
  instagram?: string;
  avatar?: string;
  dealValue: number;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'archived' | 'deleted';
  
  // Dates
  contactDate?: string;
  expectedCloseDate?: string;
  dueDate?: string;
  
  // Metadata
  tags: string[];
  notes?: string;
  isImportant: boolean;
  
  // Assignee
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  
  // Activities count
  commentsCount?: number;
  attachmentsCount?: number;
  callsCount?: number;
  emailsCount?: number;
  
  // Custom fields
  customFields?: CustomField[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'textarea';
  fieldValue: string;
}

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  is_active: boolean;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  columns: Column[];
}

export interface Column {
  id: string;
  title: string;
  position: number;
  color?: string;
  funnel_id: string;
  created_at: string;
  updated_at: string;
}

export interface FunnelStats {
  totalLeads: number;
  totalValue: number;
  highPriorityCount: number;
  activeLeads: number;
  conversionRate: number;
  leadsByColumn: {
    columnId: string;
    columnTitle: string;
    count: number;
    value: number;
  }[];
}

export interface LeadFilters {
  hasEmail?: boolean;
  hasWhatsapp?: boolean;
  searchQuery?: string;
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
  assigneeId?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface GetLeadsOptions extends PaginationOptions {
  filters?: LeadFilters;
}

export interface GetLeadsResponse {
  leads: Lead[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

