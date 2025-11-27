export interface CRMLead {
  id: string;
  clientName: string;
  company: string;
  email?: string; // ✅ Adicionado
  phone?: string; // ✅ Adicionado
  dealValue: number;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  tags: string[];
  notes?: string; // ✅ Campo de notas
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation';
  columnId?: string; // ID da coluna do funil (stage do pipeline)
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