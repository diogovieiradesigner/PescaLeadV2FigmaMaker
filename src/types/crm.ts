export interface CRMLead {
  id: string;
  clientName: string;
  company: string;
  dealValue: number;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  tags: string[];
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation';
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
  isImportant?: boolean;
  customFields?: CustomField[];
}

export interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'date' | 'email' | 'phone' | 'url' | 'textarea';
  fieldValue: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  leads: CRMLead[];
  color?: string;
}

export interface Funnel {
  id: string;
  name: string;
  columns: KanbanColumn[];
}

export type ViewMode = 'kanban' | 'list';