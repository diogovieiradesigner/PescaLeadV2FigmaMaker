// =============================================================================
// LEADS MAPPER
// =============================================================================
// Mapeia dados do banco para formato da API
// =============================================================================

import type { Lead } from '../types.ts';

/**
 * Mapeia lead do banco de dados para formato da API
 * IMPORTANTE: Não usa lead_extraction_staging - apenas custom_fields após extração
 */
export function mapLeadFromDB(dbLead: any): Lead {
  // Extrair email de custom_fields (passado separadamente)
  // Prioridade: "Email Principal" > qualquer outro email
  let email = '';
  if (dbLead.customFields?.email) {
    email = dbLead.customFields.email;
  }
  
  // Extrair telefone de custom_fields (passado separadamente)
  // Prioridade: "Telefone Principal" > qualquer outro telefone
  let phone = '';
  if (dbLead.customFields?.phone) {
    phone = dbLead.customFields.phone;
  }
  
  // 🔍 DEBUG: Log se client_name estiver vazio/null
  if (!dbLead.client_name || dbLead.client_name === '' || dbLead.client_name === 'Sem nome') {
    console.warn('[LEADS MAPPER] ⚠️ Lead sem client_name válido:', {
      id: dbLead.id,
      client_name: dbLead.client_name,
      company: dbLead.company
    });
  }
  
  return {
    id: dbLead.id,
    workspace_id: dbLead.workspace_id,
    funnel_id: dbLead.funnel_id,
    column_id: dbLead.column_id,
    position: dbLead.position,
    // ✅ Garantir que sempre retorne string (não null/undefined)
    clientName: (dbLead.client_name && dbLead.client_name !== 'Sem nome') ? dbLead.client_name : '',
    company: dbLead.company || '',
    email: email,
    phone: phone,
    avatar: dbLead.avatar_url || '',
    dealValue: parseFloat(dbLead.deal_value || 0),
    priority: dbLead.priority || 'medium',
    status: dbLead.status || 'active',
    contactDate: dbLead.contact_date,
    expectedCloseDate: dbLead.expected_close_date,
    dueDate: dbLead.due_date,
    tags: dbLead.tags || [],
    notes: dbLead.notes || '',
    isImportant: dbLead.is_important || false,
    assignee: dbLead.assigned_to ? {
      id: dbLead.assigned_to,
      name: dbLead.assignee_name || 'Não atribuído',
      avatar: dbLead.assignee_avatar || '',
    } : undefined,
    commentsCount: dbLead.comments_count || 0,
    attachmentsCount: dbLead.attachments_count || 0,
    callsCount: dbLead.calls_count || 0,
    emailsCount: dbLead.emails_count || 0,
    created_by: dbLead.created_by,
    updated_by: dbLead.updated_by,
    created_at: dbLead.created_at,
    updated_at: dbLead.updated_at,
  };
}

