// ========================================
// KANBAN BACKEND TYPES
// ========================================

export interface Lead {
  id: string;
  workspace_id: string;
  funnel_id: string;
  column_id: string;
  position: number;
  
  // Lead data
  clientName: string;
  company: string;
  dealValue: number;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  tags: string[];
  assignee: {
    name: string;
    avatar: string;
  };
  avatar: string;
  activities: {
    comments: number;
    attachments: number;
    calls: number;
    emails: number;
  };
  isImportant: boolean;
  customFields: CustomField[];
  
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'email' | 'phone' | 'url' | 'textarea';
  fieldValue: string;
}

export interface Column {
  id: string;
  title: string;
  color?: string;
  position: number;
}

export interface Funnel {
  id: string;
  name: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  columns: Column[];
}

export interface FunnelStats {
  total_leads: number;
  total_value: number;
  high_priority_count: number;
  last_updated: number;
  columns: {
    [columnId: string]: {
      count: number;
      total_value: number;
    };
  };
}

export interface ChangelogEntry {
  id: string;
  sequence: number;
  timestamp: number;
  type: 'lead_created' | 'lead_updated' | 'lead_moved' | 'lead_deleted' | 'funnel_updated';
  entity_id: string;
  user_id: string;
  user_name: string;
  data: any;
}

export interface Changelog {
  changes: ChangelogEntry[];
  last_sequence: number;
}
