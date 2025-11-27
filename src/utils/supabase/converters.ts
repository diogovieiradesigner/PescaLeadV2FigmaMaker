// ============================================
// CONVERSORES: snake_case ↔ camelCase
// Converte dados entre Database (snake_case) e Frontend (camelCase)
// ============================================

import type { DbLead, DbFunnel, DbFunnelColumn, DbWorkspace, DbUser, DbWorkspaceMember, DbLeadActivity } from '../../types/database';
import type { CRMLead, Funnel, KanbanColumn } from '../../types/crm';

// Re-export Funnel type for other modules
export type { Funnel } from '../../types/crm';

// ============================================
// HELPER: Converter chaves de objeto
// ============================================

/**
 * Converte snake_case para camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converte camelCase para snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converte todas as chaves de um objeto de snake_case para camelCase
 */
export function convertKeysToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamel) as any;
  if (typeof obj !== 'object') return obj;

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    converted[camelKey] = typeof value === 'object' && value !== null
      ? convertKeysToCamel(value)
      : value;
  }
  return converted;
}

/**
 * Converte todas as chaves de um objeto de camelCase para snake_case
 */
export function convertKeysToSnake<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToSnake) as any;
  if (typeof obj !== 'object') return obj;

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    converted[snakeKey] = typeof value === 'object' && value !== null
      ? convertKeysToSnake(value)
      : value;
  }
  return converted;
}

// ============================================
// LEAD: DB → Frontend
// ============================================

/**
 * Converte DbLead (snake_case) para CRMLead (camelCase)
 */
export function dbLeadToFrontend(dbLead: DbLead): CRMLead {
  return {
    id: dbLead.id,
    clientName: dbLead.client_name,
    company: dbLead.company || '',
    email: dbLead.email || undefined, // ✅ Adicionado
    phone: dbLead.phone || undefined, // ✅ Adicionado
    dealValue: Number(dbLead.deal_value),
    priority: dbLead.priority || 'medium',
    dueDate: dbLead.due_date || '',
    tags: dbLead.tags || [],
    notes: dbLead.notes || undefined, // ✅ Mapear notes
    status: mapLeadStatus(dbLead.status),
    columnId: dbLead.column_id || undefined, // ✅ Mapear column_id
    assignee: {
      name: dbLead.assignee_name || 'Sem responsável',
      avatar: dbLead.assignee_avatar || '',
    },
    avatar: dbLead.avatar_url || '',
    activities: {
      comments: dbLead.comments_count,
      attachments: dbLead.attachments_count,
      calls: dbLead.calls_count,
      emails: dbLead.emails_count,
    },
    isImportant: dbLead.is_important,
  };
}

/**
 * Mapeia status do DB para status do frontend
 */
function mapLeadStatus(dbStatus: string): CRMLead['status'] {
  const statusMap: Record<string, CRMLead['status']> = {
    'active': 'new',
    'won': 'qualified',
    'lost': 'new',
    'archived': 'new',
  };
  return statusMap[dbStatus] || 'new';
}

// ============================================
// LEAD: Frontend → DB
// ============================================

/**
 * Converte dados do formulário de lead (camelCase) para formato do DB (snake_case)
 */
export function frontendLeadToDb(
  lead: Partial<CRMLead>,
  workspaceId: string,
  funnelId: string,
  columnId: string,
  userId: string
): Partial<DbLead> {
  return {
    workspace_id: workspaceId,
    funnel_id: funnelId,
    column_id: columnId,
    client_name: lead.clientName || '',
    company: lead.company || null,
    deal_value: lead.dealValue || 0,
    priority: lead.priority || 'medium',
    due_date: lead.dueDate || null,
    tags: lead.tags || [],
    status: 'active',
    assignee_name: lead.assignee?.name || null,
    assignee_avatar: lead.assignee?.avatar || null,
    avatar_url: lead.avatar || null,
    is_important: lead.isImportant || false,
    created_by: userId,
    updated_by: userId,
  };
}

// ============================================
// FUNNEL COLUMN: DB → Frontend
// ============================================

/**
 * Converte DbFunnelColumn + leads para KanbanColumn
 */
export function dbColumnToFrontend(
  dbColumn: DbFunnelColumn,
  dbLeads: DbLead[]
): KanbanColumn {
  return {
    id: dbColumn.id,
    title: dbColumn.title,
    color: dbColumn.color || undefined,
    leads: dbLeads
      .filter(lead => lead.column_id === dbColumn.id)
      .sort((a, b) => a.position - b.position)
      .map(dbLeadToFrontend),
  };
}

// ============================================
// FUNNEL: DB → Frontend
// ============================================

/**
 * Converte DbFunnel + columns + leads para Funnel completo
 */
export function dbFunnelToFrontend(
  dbFunnel: DbFunnel,
  dbColumns: DbFunnelColumn[],
  dbLeads: DbLead[]
): Funnel {
  return {
    id: dbFunnel.id,
    name: dbFunnel.name,
    columns: dbColumns
      .sort((a, b) => a.position - b.position)
      .map(col => dbColumnToFrontend(col, dbLeads)),
  };
}

// ============================================
// WORKSPACE: DB → Frontend
// ============================================

export interface FrontendWorkspace {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  ownerId: string;
}

/**
 * Converte DbWorkspace + membership para formato do frontend
 */
export function dbWorkspaceToFrontend(
  dbWorkspace: DbWorkspace,
  membership: DbWorkspaceMember
): FrontendWorkspace {
  return {
    id: dbWorkspace.id,
    name: dbWorkspace.name,
    slug: dbWorkspace.slug,
    role: membership.role,
    ownerId: dbWorkspace.owner_id,
  };
}

// ============================================
// USER: DB → Frontend
// ============================================

export interface FrontendUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  lastWorkspaceId: string | null;
}

/**
 * Converte DbUser para formato do frontend
 */
export function dbUserToFrontend(dbUser: DbUser): FrontendUser {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    avatar: dbUser.avatar_url,
    lastWorkspaceId: dbUser.last_workspace_id,
  };
}

// ============================================
// ACTIVITY: DB → Frontend
// ============================================

export interface FrontendActivity {
  id: string;
  type: string;
  description: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Converte DbLeadActivity para formato do frontend
 */
export function dbActivityToFrontend(
  activity: DbLeadActivity,
  userName?: string,
  userAvatar?: string
): FrontendActivity {
  return {
    id: activity.id,
    type: activity.activity_type,
    description: activity.description || '',
    userName: userName || 'Sistema',
    userAvatar: userAvatar || '',
    timestamp: activity.created_at,
    metadata: activity.metadata,
  };
}

// ============================================
// BATCH CONVERSIONS
// ============================================

/**
 * Converte array de DbLeads para CRMLeads
 */
export function dbLeadsToFrontend(dbLeads: DbLead[]): CRMLead[] {
  return dbLeads.map(dbLeadToFrontend);
}

/**
 * Converte array de DbFunnels para Funnels
 */
export function dbFunnelsToFrontend(
  dbFunnels: DbFunnel[],
  dbColumns: DbFunnelColumn[],
  dbLeads: DbLead[]
): Funnel[] {
  return dbFunnels.map(funnel => 
    dbFunnelToFrontend(
      funnel,
      dbColumns.filter(col => col.funnel_id === funnel.id),
      dbLeads.filter(lead => lead.funnel_id === funnel.id)
    )
  );
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Valida se um objeto tem todas as propriedades obrigatórias de um lead
 */
export function validateLeadData(data: any): data is Partial<DbLead> {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data.client_name === undefined || typeof data.client_name === 'string')
  );
}

/**
 * Remove propriedades undefined/null de um objeto (útil antes de enviar ao DB)
 */
export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}