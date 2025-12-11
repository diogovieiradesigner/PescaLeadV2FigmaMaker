// ============================================
// Leads Service
// Gerencia leads do CRM
// ============================================

import { supabase } from '../utils/supabase/client';
import type { DbLead } from '../types/database';
import { dbLeadToFrontend, dbLeadsToFrontend, type Lead } from '../utils/supabase/converters';
import * as customFieldsService from './custom-fields-service';
import type { CustomField } from '../types/crm';

// ============================================
// TIPOS
// ============================================

export interface CreateLeadData {
  workspaceId: string;
  funnelId: string;
  columnId: string;
  clientName: string;
  company?: string;
  email?: string;
  phone?: string;
  dealValue?: number;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
  notes?: string;
  assignedTo?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  customFields?: CustomField[];
}

export interface UpdateLeadData {
  clientName?: string;
  company?: string;
  email?: string;
  phone?: string;
  dealValue?: number;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
  notes?: string;
  assignedTo?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  isImportant?: boolean;
  columnId?: string; // ✅ Adicionar columnId para poder mover o lead
  customFields?: CustomField[];
}

export interface MoveLeadData {
  leadId: string;
  newColumnId: string;
  newPosition: number;
  fromColumnName?: string;  // Nome da coluna de origem
  toColumnName?: string;    // Nome da coluna de destino
}

// ============================================
// GET LEADS BY WORKSPACE
// ============================================

/**
 * Busca todos os leads de um workspace
 */
export async function getLeadsByWorkspace(workspaceId: string): Promise<{
  leads: Lead[];
  error: Error | null;
}> {
  try {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .order('position');

    if (leadsError) {
      console.error('[LEADS] Erro ao buscar leads:', leadsError);
      return { leads: [], error: leadsError };
    }

    const frontendLeads = dbLeadsToFrontend(leads as DbLead[] || []);
    console.log(`[LEADS] ${frontendLeads.length} lead(s) carregado(s)`);
    return { leads: frontendLeads, error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { leads: [], error: error as Error };
  }
}

// ============================================
// GET LEADS BY COLUMN
// ============================================

/**
 * Busca leads de uma coluna específica
 */
export async function getLeadsByColumn(columnId: string): Promise<{
  leads: Lead[];
  error: Error | null;
}> {
  try {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('column_id', columnId)
      .eq('status', 'active')
      .order('position');

    if (leadsError) {
      console.error('[LEADS] Erro ao buscar leads da coluna:', leadsError);
      return { leads: [], error: leadsError };
    }

    const frontendLeads = dbLeadsToFrontend(leads as DbLead[] || []);
    return { leads: frontendLeads, error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { leads: [], error: error as Error };
  }
}

// ============================================
// GET LEAD BY ID
// ============================================

/**
 * Busca lead específico
 */
export async function getLeadById(leadId: string): Promise<{
  lead: Lead | null;
  error: Error | null;
}> {
  try {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('[LEADS] Lead não encontrado:', leadError);
      return { lead: null, error: leadError || new Error('Lead não encontrado') };
    }

    const frontendLead = dbLeadToFrontend(lead as DbLead);
    
    // Carregar custom fields
    const { customFields } = await customFieldsService.loadCustomFieldsForLead(
      leadId,
      lead.workspace_id
    );
    frontendLead.customFields = customFields;

    // Popula email/phone com dados dos custom fields se estiverem vazios
    if (!frontendLead.email) {
      const emailField = customFields.find(f => f.fieldType === 'email' || f.fieldName.toLowerCase() === 'email');
      if (emailField) frontendLead.email = emailField.fieldValue;
    }
    if (!frontendLead.phone) {
      const phoneField = customFields.find(f => f.fieldType === 'phone' || f.fieldName.toLowerCase() === 'telefone');
      if (phoneField) frontendLead.phone = phoneField.fieldValue;
    }
    
    return { lead: frontendLead, error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { lead: null, error: error as Error };
  }
}

// ============================================
// LOG ACTIVITY
// ============================================

/**
 * Registra uma atividade no histórico do lead
 */
export async function createLeadActivity(
  leadId: string, 
  description: string, 
  type: 'system' | 'user' | 'status_change' | 'field_update' = 'user'
): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:185',message:'createLeadActivity ENTRY',data:{leadId,description,type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:192',message:'User not authenticated',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.warn('[LEADS] Usuário não autenticado, pulando registro de atividade');
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:198',message:'BEFORE insert lead_activities',data:{userId:user.id,leadId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // ✅ Verificar se o lead existe e pertence a um workspace acessível
    // A política RLS with_check verifica isso, mas vamos fazer uma verificação prévia para debug
    const { data: leadCheck, error: leadCheckError } = await supabase
      .from('leads')
      .select('id, workspace_id')
      .eq('id', leadId)
      .single();

    if (leadCheckError || !leadCheck) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:203',message:'Lead not found or not accessible',data:{leadId,leadCheckError:leadCheckError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.warn('[LEADS] ⚠️ Lead não encontrado ou não acessível:', leadId, leadCheckError);
      console.warn('[LEADS] ⚠️ Não será possível registrar atividade (RLS bloqueando)');
      return; // Não bloquear operação principal
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:210',message:'Lead found, attempting insert',data:{leadId,workspaceId:(leadCheck as any).workspace_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // ✅ Tabela confirmada via MCP: lead_activities existe no banco
    // Usando activity_type e user_id conforme definição do banco (DbLeadActivity)
    // A política RLS with_check verifica se lead_id pertence a workspace acessível
    const { error } = await (supabase.from('lead_activities') as any).insert({
      lead_id: leadId,
      description: description,
      activity_type: type, 
      user_id: user.id,
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:212',message:'AFTER insert lead_activities',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,errorStatus:error?.status,errorDetails:JSON.stringify(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (error) {
      // Log detalhado do erro para debug
      console.warn('[LEADS] ⚠️ Erro ao registrar atividade:', {
        code: error.code,
        status: error.status,
        message: error.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        fullError: error
      });

      // Erro específico: lead_extraction_staging não existe (pode ser problema de trigger)
      if (error.message?.includes('lead_extraction_staging')) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:223',message:'lead_extraction_staging error in trigger',data:{errorCode:error.code,errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.warn('[LEADS] ⚠️ Erro relacionado a lead_extraction_staging (provavelmente em trigger)');
        console.warn('[LEADS] ⚠️ A atividade não foi registrada, mas o movimento do lead foi bem-sucedido');
        console.warn('[LEADS] ⚠️ Este erro não bloqueia a operação principal');
        return; // Não bloquear operação principal
      }

      // Erro 404 ou 42P01: pode ser problema de RLS ou tabela não acessível
      const errorStatus = (error as any)?.status;
      if (errorStatus === 404 || error.code === '42P01' || error.code === 'PGRST116') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:223',message:'RLS or table access error',data:{errorCode:error.code,errorStatus:error.status,errorMessage:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.warn('[LEADS] ⚠️ Erro 404/42P01: Pode ser problema de RLS (Row Level Security)');
        console.warn('[LEADS] ⚠️ A política de INSERT pode estar bloqueando o acesso');
        console.warn('[LEADS] ⚠️ Verifique se o lead pertence a um workspace acessível pelo usuário');
        console.warn('[LEADS] ⚠️ Movimento do lead não será bloqueado por este erro');
        return; // Não bloquear operação principal
      }

      // Erro 42703: coluna não existe (schema diferente)
      if (error.code === '42703') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:232',message:'Column error, trying fallback schema',data:{errorCode:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.warn('[LEADS] Coluna não existe, tentando fallback com schema antigo...', error);
        const { error: fallbackError } = await (supabase.from('lead_activities') as any).insert({
          lead_id: leadId,
          description: description,
          type: type,
          created_by: user.id
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:238',message:'Fallback insert result',data:{hasError:!!fallbackError,errorCode:fallbackError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        if (fallbackError) {
          console.warn('[LEADS] ⚠️ Fallback também falhou, mas não bloqueando operação:', fallbackError);
        }
        return; // Não bloquear operação principal mesmo se fallback falhar
      }

      // Outros erros: logar mas não bloquear
      console.warn('[LEADS] ⚠️ Erro ao registrar atividade (não bloqueante):', error);
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:250',message:'Activity registered successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('[LEADS] ✅ Atividade registrada com sucesso');
    }
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:254',message:'Unexpected error in createLeadActivity',data:{errorMessage:error?.message,errorStack:error?.stack,errorDetails:error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    // Erro inesperado: logar mas não bloquear operação principal
    console.warn('[LEADS] ⚠️ Erro inesperado ao registrar atividade (não bloqueante):', error);
    // Não re-throw: atividades são secundárias, não devem bloquear operações principais
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/11f18f3f-1c25-4599-80fb-48a3ba88b98d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leads-service.ts:260',message:'createLeadActivity EXIT',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
}


// ============================================
// HELPER: SAVE CONTACT AS CUSTOM FIELD
// ============================================

async function saveContactAsCustomField(
  leadId: string,
  workspaceId: string,
  fieldName: string,
  fieldType: string,
  value: string
) {
  try {
    // Buscar custom field do workspace
    let { data: field, error: cfError } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('field_type', fieldType)
      .limit(1)
      .maybeSingle();

    // Se não encontrou, buscar por nome
    if (!field) {
      const { data: fieldByName } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('workspace_id', workspaceId)
        .ilike('name', fieldName)
        .limit(1)
        .maybeSingle();
      field = fieldByName;
    }

    // Se ainda não encontrou, criar
    if (!field) {
      const { data: newField, error: createError } = await supabase
        .from('custom_fields')
        .insert({
          workspace_id: workspaceId,
          name: fieldName,
          field_type: fieldType as any,
          is_required: false,
          position: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error(`[LEADS] Erro ao criar custom field ${fieldName}:`, createError);
        return;
      }
      field = newField;
    }

    // Salvar valor
    if (field) {
      // Verificar se já existe valor para atualizar
      const { data: existingValue } = await supabase
        .from('lead_custom_values')
        .select('id')
        .eq('lead_id', leadId)
        .eq('custom_field_id', field.id)
        .maybeSingle();

      if (existingValue) {
        await supabase
          .from('lead_custom_values')
          .update({ value })
          .eq('id', existingValue.id);
      } else {
        await supabase
          .from('lead_custom_values')
          .insert({
            lead_id: leadId,
            custom_field_id: field.id,
            value,
          });
      }
    }
  } catch (error) {
    console.error(`[LEADS] Erro ao salvar ${fieldName} como custom field:`, error);
  }
}

// ============================================
// CREATE LEAD
// ============================================

/**
 * Cria novo lead
 */
export async function createLead(data: CreateLeadData): Promise<{
  lead: Lead | null;
  error: Error | null;
}> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { lead: null, error: authError || new Error('Não autenticado') };
    }

    // 1. Buscar próxima posição na coluna
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('column_id', data.columnId);

    const nextPosition = (count || 0);

    // 2. Criar lead
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        workspace_id: data.workspaceId,
        funnel_id: data.funnelId,
        column_id: data.columnId,
        client_name: data.clientName,
        company: data.company || null,
        // REMOVIDO: email e phone pois podem não existir na tabela
        // email: data.email || null,
        // phone: data.phone || null,
        deal_value: data.dealValue || 0,
        priority: data.priority || 'medium',
        status: 'active',
        position: nextPosition,
        tags: data.tags || [], 
        notes: data.notes || null,
        due_date: data.dueDate || null,
        assigned_to: data.assignedTo || null,
        assignee_name: data.assigneeName || null,
        assignee_avatar: data.assigneeAvatar || null,
        created_by: authUser.id,
        updated_by: authUser.id,
      })
      .select()
      .single();

    if (leadError || !newLead) {
      console.error('[LEADS] Erro ao criar lead:', leadError);
      return { lead: null, error: leadError || new Error('Erro ao criar lead') };
    }

    // 2.1 Salvar Email e Telefone como Custom Fields (Fallback)
    if (data.email) {
      await saveContactAsCustomField(newLead.id, data.workspaceId, 'Email', 'email', data.email);
    }
    if (data.phone) {
      await saveContactAsCustomField(newLead.id, data.workspaceId, 'Telefone', 'phone', data.phone);
    }

    // 3. Salvar custom fields se existirem
    if (data.customFields && data.customFields.length > 0) {
      const { error: customFieldsError } = await customFieldsService.saveCustomFieldValues(
        newLead.id,
        data.customFields,
        data.workspaceId
      );

      if (customFieldsError) {
        console.error('[LEADS] Erro ao salvar custom fields:', customFieldsError);
        // Não falha a criação do lead por causa dos custom fields
      }
    }

    // Log activity
    await createLeadActivity(newLead.id, 'Lead criado manualmente', 'system');

    console.log('[LEADS] Lead criado com sucesso:', newLead.id);
    return { lead: dbLeadToFrontend(newLead), error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { lead: null, error: error as Error };
  }
}

// ============================================
// CREATE LEAD FROM CONVERSATION
// ============================================

/**
 * Cria novo lead a partir de uma conversa do chat
 */
export async function createLeadFromConversation(data: {
  workspaceId: string;
  funnelId: string;
  columnId: string;
  clientName: string;
  phone?: string;
  email?: string;
  description?: string;
  website?: string;
}): Promise<{
  leadId: string;
  error: Error | null;
}> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { leadId: '', error: authError || new Error('Não autenticado') };
    }

    // 1. Buscar próxima posição na coluna
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('column_id', data.columnId);

    const nextPosition = (count || 0);

    // 2. Criar lead
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert({
        workspace_id: data.workspaceId,
        funnel_id: data.funnelId,
        column_id: data.columnId,
        client_name: data.clientName,
        deal_value: 0,
        priority: 'medium',
        status: 'active',
        position: nextPosition,
        tags: ['Whatsapp Inbound'],
        created_by: authUser.id,
        updated_by: authUser.id,
      })
      .select()
      .single();

    if (leadError || !newLead) {
      console.error('[LEADS] Erro ao criar lead:', leadError);
      return { leadId: '', error: leadError || new Error('Erro ao criar lead') };
    }

    // 3. Se tem telefone, buscar custom field de telefone e salvar
    if (data.phone) {
      try {
        console.log('[LEADS] Tentando salvar telefone como custom field:', data.phone);
        
        // Buscar custom field de telefone do workspace (busca por tipo e nome comum)
        let { data: phoneField, error: cfError } = await supabase
          .from('custom_fields')
          .select('*')
          .eq('workspace_id', data.workspaceId)
          .eq('field_type', 'phone')
          .limit(1)
          .maybeSingle();

        // Se não encontrou, buscar por nome (case insensitive)
        if (!phoneField) {
          console.log('[LEADS] Nenhum custom field tipo phone encontrado, buscando por nome...');
          
          const { data: fieldByName, error: nameError } = await supabase
            .from('custom_fields')
            .select('*')
            .eq('workspace_id', data.workspaceId)
            .ilike('name', 'telefone')
            .limit(1)
            .maybeSingle();
          
          phoneField = fieldByName;
          cfError = nameError;
        }

        // Se ainda não encontrou, criar o custom field
        if (!phoneField) {
          console.log('[LEADS] Custom field de telefone não existe, criando...');
          
          const { data: newPhoneField, error: createError } = await supabase
            .from('custom_fields')
            .insert({
              workspace_id: data.workspaceId,
              name: 'Telefone',
              field_type: 'phone',
              is_required: false,
              position: 0,
            })
            .select()
            .single();

          if (createError) {
            console.error('[LEADS] Erro ao criar custom field de telefone:', createError);
            throw createError;
          }

          phoneField = newPhoneField;
          console.log('[LEADS] Custom field de telefone criado:', phoneField.id);
        } else {
          console.log('[LEADS] Custom field de telefone encontrado:', phoneField.id);
        }

        if (phoneField) {
          // Salvar valor do telefone
          const { error: valueError } = await supabase
            .from('lead_custom_values')
            .insert({
              lead_id: newLead.id,
              custom_field_id: phoneField.id,
              value: data.phone,
            });

          if (valueError) {
            console.error('[LEADS] Erro ao salvar telefone como custom field:', valueError);
          } else {
            console.log('[LEADS] Telefone salvo como custom field com sucesso!');
          }
        }
      } catch (cfErr) {
        console.error('[LEADS] Erro ao processar custom field de telefone:', cfErr);
        // Não falha a criação do lead por causa do custom field
      }
    }

    // 4. Salvar campos personalizados adicionais (email, description, website)
    const additionalFields: Array<{ name: string; type: string; value: string }> = [];
    
    if (data.email) {
      additionalFields.push({ name: 'Email', type: 'email', value: data.email });
    }
    
    if (data.description) {
      additionalFields.push({ name: 'Descrição', type: 'textarea', value: data.description });
    }
    
    if (data.website) {
      additionalFields.push({ name: 'Website', type: 'url', value: data.website });
    }

    // Processar cada campo personalizado adicional
    for (const field of additionalFields) {
      try {
        console.log(`[LEADS] Processando custom field: ${field.name}`);
        
        // Buscar ou criar o custom field
        let { data: customField } = await supabase
          .from('custom_fields')
          .select('*')
          .eq('workspace_id', data.workspaceId)
          .eq('field_type', field.type)
          .ilike('name', field.name)
          .limit(1)
          .maybeSingle();

        // Se não encontrou, criar
        if (!customField) {
          console.log(`[LEADS] Criando custom field: ${field.name}`);
          
          const { data: newField, error: createError } = await supabase
            .from('custom_fields')
            .insert({
              workspace_id: data.workspaceId,
              name: field.name,
              field_type: field.type,
              is_required: false,
              position: 0,
            })
            .select()
            .single();

          if (createError) {
            console.error(`[LEADS] Erro ao criar custom field ${field.name}:`, createError);
            continue; // Continuar com os próximos campos
          }

          customField = newField;
        }

        // Salvar valor do custom field
        if (customField) {
          const { error: valueError } = await supabase
            .from('lead_custom_values')
            .insert({
              lead_id: newLead.id,
              custom_field_id: customField.id,
              value: field.value,
            });

          if (valueError) {
            console.error(`[LEADS] Erro ao salvar ${field.name}:`, valueError);
          } else {
            console.log(`[LEADS] ${field.name} salvo com sucesso!`);
          }
        }
      } catch (fieldErr) {
        console.error(`[LEADS] Erro ao processar custom field ${field.name}:`, fieldErr);
        // Não falha a criação do lead por causa do custom field
      }
    }

    // Log activity
    await createLeadActivity(newLead.id, 'Lead criado a partir de conversa', 'system');

    console.log('[LEADS] Lead criado com sucesso a partir da conversa:', newLead.id);
    return { leadId: newLead.id, error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { leadId: '', error: error as Error };
  }
}

// ============================================
// UPDATE LEAD
// ============================================

/**
 * Atualiza dados do lead
 */
export async function updateLead(
  leadId: string,
  data: UpdateLeadData,
  workspaceId?: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { error: authError || new Error('Não autenticado') };
    }

    // ✅ 1. BUSCAR LEAD ANTIGO PARA COMPARAÇÃO
    const { data: oldLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !oldLead) {
      console.error('[LEADS] Erro ao buscar lead antigo:', fetchError);
      return { error: fetchError || new Error('Lead não encontrado') };
    }

    const updateData: Partial<DbLead> = { updated_by: authUser.id };

    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.company !== undefined) updateData.company = data.company;
    // REMOVIDO: email e phone pois podem não existir na tabela
    // if (data.email !== undefined) updateData.email = data.email;
    // if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.dealValue !== undefined) updateData.deal_value = data.dealValue;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate || null; 
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;
    if (data.assigneeName !== undefined) updateData.assignee_name = data.assigneeName;
    if (data.assigneeAvatar !== undefined) updateData.assignee_avatar = data.assigneeAvatar;
    if (data.isImportant !== undefined) updateData.is_important = data.isImportant;
    if (data.columnId !== undefined) updateData.column_id = data.columnId; 

    const { error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (updateError) {
      console.error('[LEADS] Erro ao atualizar lead:', updateError);
      return { error: updateError };
    }

    // 2.1 Salvar Email e Telefone como Custom Fields (Fallback)
    // Precisamos do workspaceId. Se não vier, buscamos o lead.
    if ((data.email !== undefined || data.phone !== undefined)) {
      let targetWorkspaceId = workspaceId;
      
      if (!targetWorkspaceId) {
        const { data: lead } = await supabase.from('leads').select('workspace_id').eq('id', leadId).single();
        if (lead) targetWorkspaceId = lead.workspace_id;
      }

      if (targetWorkspaceId) {
        if (data.email !== undefined) {
          await saveContactAsCustomField(leadId, targetWorkspaceId, 'Email', 'email', data.email);
        }
        if (data.phone !== undefined) {
          await saveContactAsCustomField(leadId, targetWorkspaceId, 'Telefone', 'phone', data.phone);
        }
      }
    }

    // ✅ 2. CRIAR LOGS DETALHADOS COMPARANDO VALORES ANTIGOS E NOVOS
    const detailedChanges: string[] = [];
    
    // Helper para formatar valores
    const formatValue = (value: any): string => {
      if (value === null || value === undefined || value === '') return '(vazio)';
      if (typeof value === 'number') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      if (Array.isArray(value)) return value.join(', ') || '(vazio)';
      return String(value);
    };

    // Helper para comparar valores
    const hasChanged = (oldVal: any, newVal: any): boolean => {
      // Normalizar valores vazios
      const normalizedOld = oldVal === null || oldVal === undefined || oldVal === '' ? null : oldVal;
      const normalizedNew = newVal === null || newVal === undefined || newVal === '' ? null : newVal;
      
      // Comparar arrays
      if (Array.isArray(normalizedOld) && Array.isArray(normalizedNew)) {
        return JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew);
      }
      
      return normalizedOld !== normalizedNew;
    };

    // Comparar cada campo
    if (data.clientName !== undefined && hasChanged(oldLead.client_name, data.clientName)) {
      detailedChanges.push(`Nome alterado: "${formatValue(oldLead.client_name)}" → "${formatValue(data.clientName)}"`);
    }
    
    if (data.company !== undefined && hasChanged(oldLead.company, data.company)) {
      detailedChanges.push(`Empresa alterada: "${formatValue(oldLead.company)}" → "${formatValue(data.company)}"`);
    }
    
    if (data.dealValue !== undefined && hasChanged(oldLead.deal_value, data.dealValue)) {
      detailedChanges.push(`Valor alterado: ${formatValue(oldLead.deal_value)} → ${formatValue(data.dealValue)}`);
    }
    
    if (data.priority !== undefined && hasChanged(oldLead.priority, data.priority)) {
      const priorityMap: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
      detailedChanges.push(`Prioridade alterada: ${priorityMap[oldLead.priority || 'medium']} → ${priorityMap[data.priority]}`);
    }
    
    if (data.dueDate !== undefined && hasChanged(oldLead.due_date, data.dueDate)) {
      const formatDate = (date: string | null) => {
        if (!date) return '(sem data)';
        try {
          return new Date(date).toLocaleDateString('pt-BR');
        } catch {
          return date;
        }
      };
      detailedChanges.push(`Data de previsão alterada: ${formatDate(oldLead.due_date)} → ${formatDate(data.dueDate || null)}`);
    }
    
    if (data.tags !== undefined && hasChanged(oldLead.tags, data.tags)) {
      detailedChanges.push(`Tags alteradas: ${formatValue(oldLead.tags)} → ${formatValue(data.tags)}`);
    }
    
    if (data.notes !== undefined && hasChanged(oldLead.notes, data.notes)) {
      const truncate = (str: string, max: number = 50) => {
        if (!str || str.length <= max) return str;
        return str.substring(0, max) + '...';
      };
      detailedChanges.push(`Notas alteradas: "${truncate(oldLead.notes || '')}" → "${truncate(data.notes || '')}"`);
    }
    
    if (data.assignedTo !== undefined && hasChanged(oldLead.assigned_to, data.assignedTo)) {
      detailedChanges.push(`Responsável alterado: ${formatValue(oldLead.assignee_name)} → ${formatValue(data.assigneeName)}`);
    }
    
    if (data.isImportant !== undefined && hasChanged(oldLead.is_important, data.isImportant)) {
      detailedChanges.push(`Status Importante: ${oldLead.is_important ? 'Sim' : 'Não'} → ${data.isImportant ? 'Sim' : 'Não'}`);
    }

    // ✅ 3. REGISTRAR CADA ALTERAÇÃO COMO UMA ATIVIDADE SEPARADA
    if (detailedChanges.length > 0) {
      console.log('[LEADS] Campos alterados:', detailedChanges);
      
      // Registrar cada mudança como uma atividade separada
      for (const change of detailedChanges) {
        await createLeadActivity(leadId, change, 'field_update');
      }
    } else {
      console.log('[LEADS] Nenhuma alteração detectada nos campos principais');
    }

    // Atualizar custom fields se fornecidos
    if (data.customFields !== undefined && workspaceId) {
      const { error: customFieldsError } = await customFieldsService.saveCustomFieldValues(
        leadId,
        data.customFields,
        workspaceId
      );

      if (customFieldsError) {
        console.error('[LEADS] Erro ao atualizar custom fields:', customFieldsError);
        // Não falha a atualização por causa dos custom fields
      }
    }

    console.log('[LEADS] Lead atualizado com sucesso');
    return { error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// MOVE LEAD (Drag & Drop)
// ============================================

/**
 * Move lead para outra coluna/posição
 */
export async function moveLead(data: MoveLeadData): Promise<{ error: Error | null }> {
  try {
    // ✅ CORREÇÃO: Usar kanban-api em vez de make-server-e4f9d774
    const { projectId } = await import('../utils/supabase/info');
    
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { error: authError || new Error('Não autenticado') };
    }

    // ✅ Obter workspace ID e funnel ID do lead que está sendo movido
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('workspace_id, funnel_id')
      .eq('id', data.leadId)
      .single();

    if (leadError || !leadData?.workspace_id || !leadData?.funnel_id) {
      console.error('[LEADS] Erro ao buscar dados do lead:', leadError);
      return { error: new Error('Lead não encontrado ou dados inválidos') };
    }

    const workspaceId = leadData.workspace_id;
    const funnelId = leadData.funnel_id;

    // ✅ Chamar kanban-api para mover lead
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      return { error: sessionError || new Error('Sessão não encontrada') };
    }

    // ✅ CORREÇÃO: Usar rota correta da kanban-api
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads/${data.leadId}/move`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          toColumnId: data.newColumnId,
          toPosition: data.newPosition,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      console.error('[LEADS] Erro ao mover lead via kanban-api:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return { error: new Error(errorData.error || `Erro ao mover lead (${response.status})`) };
    }

    // Criar mensagem de atividade mais descritiva
    let description = 'Moveu o lead de etapa';
    
    if (data.fromColumnName && data.toColumnName) {
      description = `Moveu de "${data.fromColumnName}" para "${data.toColumnName}"`;
    } else if (data.toColumnName) {
      description = `Moveu para "${data.toColumnName}"`;
    }

    // ✅ Registrar atividade de forma não bloqueante
    // Se falhar, não deve impedir o movimento do lead
    try {
      await createLeadActivity(data.leadId, description, 'status_change');
    } catch (activityError) {
      // Logar mas não bloquear movimento
      console.warn('[LEADS] ⚠️ Falha ao registrar atividade (não bloqueante):', activityError);
    }

    console.log('[LEADS] ✅ Lead movido com sucesso via kanban-api');
    return { error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// TOGGLE IMPORTANT
// ============================================

/**
 * Marca/desmarca lead como importante
 */
export async function toggleImportant(
  leadId: string,
  isImportant: boolean
): Promise<{ error: Error | null }> {
  return updateLead(leadId, { isImportant });
}

// ============================================
// DELETE LEAD
// ============================================

/**
 * Deleta lead (soft delete - marca como archived)
 */
export async function deleteLead(leadId: string): Promise<{ error: Error | null }> {
  try {
    const { error: deleteError } = await supabase
      .from('leads')
      .update({ status: 'archived' })
      .eq('id', leadId);

    if (deleteError) {
      console.error('[LEADS] Erro ao deletar lead:', deleteError);
      return { error: deleteError };
    }

    console.log('[LEADS] Lead deletado com sucesso');
    return { error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// HARD DELETE LEAD
// ============================================

/**
 * Deleta lead permanentemente com CASCADE
 * Remove automaticamente:
 * - lead_custom_values (valores de custom fields)
 * - lead_activities (atividades)
 * - lead_attachments (anexos)
 * - Desvincula whatsapp_conversations (seta lead_id como NULL)
 */
export async function hardDeleteLead(leadId: string): Promise<{ error: Error | null }> {
  try {
    console.log('[LEADS] 🔥 Iniciando hard delete via backend:', leadId);

    // ✅ Obter workspace ID e funnel ID do lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('workspace_id, funnel_id')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData?.workspace_id || !leadData?.funnel_id) {
      console.error('[LEADS] ❌ Erro ao buscar dados do lead:', leadError);
      return { error: new Error('Lead não encontrado ou dados inválidos') };
    }

    const workspaceId = leadData.workspace_id;
    const funnelId = leadData.funnel_id;

    // ✅ CORREÇÃO: Usar kanban-api em vez de make-server-e4f9d774
    const { projectId } = await import('../utils/supabase/info');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.error('[LEADS] ❌ Erro ao obter sessão:', sessionError);
      return { error: sessionError || new Error('Sessão não encontrada') };
    }

    console.log('[LEADS] 🌐 Chamando kanban-api para deletar lead...');
    // ✅ CORREÇÃO: Usar rota correta da kanban-api
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[LEADS] ❌ Erro do backend:', errorData);
      return { error: new Error(errorData.error || 'Erro ao deletar lead') };
    }

    console.log('[LEADS] ✅ Lead deletado permanentemente com sucesso via backend');
    return { error: null };

  } catch (error) {
    console.error('[LEADS] ❌ Erro inesperado ao deletar lead:', error);
    return { error: error as Error };
  }
}

// ============================================
// RESTORE LEAD
// ============================================

/**
 * Restaura lead arquivado
 */
export async function restoreLead(leadId: string): Promise<{ error: Error | null }> {
  try {
    const { error: restoreError } = await supabase
      .from('leads')
      .update({ status: 'active' })
      .eq('id', leadId);

    if (restoreError) {
      console.error('[LEADS] Erro ao restaurar lead:', restoreError);
      return { error: restoreError };
    }

    console.log('[LEADS] Lead restaurado com sucesso');
    return { error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// SEARCH LEADS
// ============================================

/**
 * Busca leads por texto (full-text search)
 */
export async function searchLeads(workspaceId: string, query: string): Promise<{
  leads: Lead[];
  error: Error | null;
}> {
  try {
    const { data: leads, error: searchError } = await supabase
      .from('leads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .or(`client_name.ilike.%${query}%,company.ilike.%${query}%,notes.ilike.%${query}%`)
      .limit(50);

    if (searchError) {
      console.error('[LEADS] Erro ao buscar leads:', searchError);
      return { leads: [], error: searchError };
    }

    const frontendLeads = dbLeadsToFrontend(leads as DbLead[] || []);
    return { leads: frontendLeads, error: null };

  } catch (error) {
    console.error('[LEADS] Erro inesperado:', error);
    return { leads: [], error: error as Error };
  }
}

// ============================================
// LEAD ACTIVITIES
// ============================================

/**
 * Busca atividades de um lead
 */
export async function getLeadActivities(leadId: string): Promise<{
  activities: any[];
  error: Error | null;
}> {
  try {
    const { data: activities, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        users (
          id,
          name,
          avatar_url
        )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { activities: activities || [], error: null };
  } catch (error) {
    console.error('[LEADS] Erro ao buscar atividades:', error);
    return { activities: [], error: error as Error };
  }
}