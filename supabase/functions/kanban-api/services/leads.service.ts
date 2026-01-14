// =============================================================================
// LEADS SERVICE
// =============================================================================
// Operações relacionadas a leads - OTIMIZADO PARA PERFORMANCE
// =============================================================================

import { getSupabase } from '../database/client.ts';
import { applyFilters, validateFilters } from './filters.service.ts';
import { mapLeadFromDB } from './leads.mapper.ts';
import type { Lead, GetLeadsOptions, GetLeadsResponse } from '../types.ts';

/**
 * Busca leads de uma coluna com paginação e filtros
 * OTIMIZADO: Apenas campos necessários, queries paralelas quando possível
 */
export async function getColumnLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  options: GetLeadsOptions = {}
): Promise<GetLeadsResponse> {
  const supabase = getSupabase();
  
  const limit = Math.min(options.limit || 10, 100); // Max 100 por vez
  const offset = options.offset || 0;
  
  // Validar filtros
  validateFilters(options.filters);
  
  // ✅ CORREÇÃO CRÍTICA: Criar queries completamente separadas para COUNT e SELECT
  // O problema era que reutilizar filteredQuery estava causando conflito no select
  
  // Query base para COUNT (apenas id, head: true)
  const countBaseQuery = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active');
  
  // Query base para SELECT (todos os campos necessários - SEM instagram, será buscado via RPC)
  const selectBaseQuery = supabase
    .from('leads')
    .select('id,workspace_id,funnel_id,column_id,position,client_name,company,avatar_url,deal_value,priority,status,contact_date,expected_close_date,due_date,tags,notes,is_important,assigned_to,assignee_name,assignee_avatar,created_by,updated_by,created_at,updated_at,emails_count,calls_count,whatsapp_valid,whatsapp_jid,whatsapp_name')
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active');
  
  // Aplicar filtros em ambas as queries
  const filteredCountQuery = applyFilters(countBaseQuery, options.filters);
  const filteredSelectQuery = applyFilters(selectBaseQuery, options.filters);
  
  // Executar COUNT e SELECT em paralelo para melhor performance
  const [countResult, leadsResult] = await Promise.all([
    // COUNT query
    filteredCountQuery,
    // SELECT query com paginação
    filteredSelectQuery
      .order('position', { ascending: true })
      .range(offset, offset + limit - 1)
  ]);
  
  if (countResult.error) {
    console.error('Error counting leads:', countResult.error);
    throw new Error(`Failed to count leads: ${countResult.error.message}`);
  }
  
  if (leadsResult.error) {
    console.error('Error fetching leads:', leadsResult.error);
    throw new Error(`Failed to fetch leads: ${leadsResult.error.message}`);
  }
  
  const total = countResult.count ?? 0;
  
  // 🔍 DEBUG: Verificar se client_name está sendo retornado corretamente
  if (leadsResult.data && leadsResult.data.length > 0) {
    const firstLead = leadsResult.data[0];
    console.log('[getColumnLeads] ✅ Primeiro lead retornado:', {
      id: firstLead.id,
      client_name: firstLead.client_name,
      has_client_name: 'client_name' in firstLead,
      allKeys: Object.keys(firstLead).slice(0, 10) // Primeiros 10 campos
    });
  }
  
  // Buscar custom_fields para os leads (email, phone e instagram)
  // IMPORTANTE: Não usar lead_extraction_staging - apenas custom_fields após extração
  const leadIds = (leadsResult.data || []).map((l: any) => l.id);
  let customFieldsMap: Record<string, { email?: string; phone?: string; instagram?: string }> = {};

  if (leadIds.length > 0) {
    // Buscar email e phone dos custom fields
    const { data: customFields } = await supabase
      .from('lead_custom_values')
      .select(`
        lead_id,
        value,
        custom_fields!inner(name, field_type)
      `)
      .in('lead_id', leadIds)
      .in('custom_fields.field_type', ['email', 'phone']);

    if (customFields) {
      for (const cv of customFields) {
        const leadId = cv.lead_id;
        if (!customFieldsMap[leadId]) {
          customFieldsMap[leadId] = {};
        }

        const fieldType = cv.custom_fields?.field_type;
        const fieldName = cv.custom_fields?.name?.toLowerCase() || '';

        // Priorizar "Email Principal" e "Telefone Principal"
        const isPrincipal = fieldName.includes('principal');

        if (fieldType === 'email' || fieldName.includes('email')) {
          if (cv.value && typeof cv.value === 'string' && cv.value.includes('@')) {
            // Se já tem email e encontrou um "principal", substituir
            if (isPrincipal || !customFieldsMap[leadId].email) {
              customFieldsMap[leadId].email = cv.value.trim();
            }
          }
        } else if (fieldType === 'phone' || fieldName.includes('telefone') || fieldName.includes('phone')) {
          if (cv.value && typeof cv.value === 'string') {
            // Se já tem telefone e encontrou um "principal", substituir
            if (isPrincipal || !customFieldsMap[leadId].phone) {
              customFieldsMap[leadId].phone = cv.value.trim();
            }
          }
        }
      }
    }

    // Buscar Instagram via RPC (busca em QUALQUER custom field que contenha instagram.com)
    const { data: instagramData, error: instagramError } = await supabase
      .rpc('get_leads_instagram', { p_lead_ids: leadIds });

    if (instagramError) {
      console.warn('[getColumnLeads] ⚠️ Erro ao buscar Instagram:', instagramError.message);
    } else if (instagramData && instagramData.length > 0) {
      console.log(`[getColumnLeads] 📷 Instagram encontrado para ${instagramData.length} leads`);
      for (const ig of instagramData) {
        if (!customFieldsMap[ig.lead_id]) {
          customFieldsMap[ig.lead_id] = {};
        }
        customFieldsMap[ig.lead_id].instagram = ig.instagram_url;
      }
    }
  }
  
  // Mapear leads com custom_fields
  const leads = (leadsResult.data || []).map((lead: any) => {
    // 🔍 DEBUG: Log do lead antes do mapeamento
    if (!lead.client_name || lead.client_name === '' || lead.client_name === 'Sem nome') {
      console.warn('[getColumnLeads] ⚠️ Lead sem client_name válido no banco:', {
        id: lead.id,
        client_name: lead.client_name,
        company: lead.company,
        lead: JSON.stringify(lead).substring(0, 200)
      });
    }
    
    const customFields = customFieldsMap[lead.id];
    const mappedLead = mapLeadFromDB({ ...lead, customFields });
    
    // 🔍 DEBUG: Log do lead após mapeamento
    if (!mappedLead.clientName || mappedLead.clientName === '') {
      console.warn('[getColumnLeads] ⚠️ Lead sem clientName após mapeamento:', {
        id: mappedLead.id,
        clientName: mappedLead.clientName,
        original_client_name: lead.client_name
      });
    }
    
    return mappedLead;
  });
  
  console.log(`[getColumnLeads] Coluna ${columnId}: ${leads.length} leads encontrados de ${total} total`);
  
  return {
    leads,
    total,
    hasMore: offset + limit < total,
    limit,
    offset,
  };
}

/**
 * Busca um lead específico
 */
export async function getLead(workspaceId: string, leadId: string): Promise<Lead | null> {
  const supabase = getSupabase();
  
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching lead:', error);
    throw new Error(`Failed to fetch lead: ${error.message}`);
  }
  
  if (!lead) return null;
  
  return mapLeadFromDB(lead);
}

/**
 * Busca leads de todas as colunas de um funil (para inicialização rápida)
 * OTIMIZADO: Queries paralelas para todas as colunas
 */
export async function getFunnelLeadsInitial(
  workspaceId: string,
  funnelId: string,
  columnIds: string[],
  options?: GetLeadsOptions
): Promise<Record<string, GetLeadsResponse>> {
  const limit = options?.limit || 10; // Padrão 10, mas aceita customização
  const offset = options?.offset || 0;
  const filters = options?.filters;
  
  // Executar queries em paralelo para todas as colunas
  const promises = columnIds.map(columnId =>
    getColumnLeads(workspaceId, funnelId, columnId, {
      limit,
      offset,
      filters,
    })
  );
  
  const results = await Promise.all(promises);
  
  // Mapear resultados por columnId
  const mapped: Record<string, GetLeadsResponse> = {};
  columnIds.forEach((columnId, index) => {
    mapped[columnId] = results[index];
  });
  
  return mapped;
}

/**
 * Cria um novo lead
 */
export async function createLead(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  leadData: Partial<Lead>,
  userId: string
): Promise<Lead> {
  const supabase = getSupabase();
  
  // Validar campos obrigatórios
  if (!leadData.clientName || !columnId) {
    throw new Error('clientName and column_id are required');
  }
  
  // Get max position in column
  const { data: maxPos } = await supabase
    .from('leads')
    .select('position')
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active')
    .order('position', { ascending: false })
    .limit(1)
    .single();
  
  const position = (maxPos?.position ?? -1) + 1;
  
  // Criar lead
  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      workspace_id: workspaceId,
      funnel_id: funnelId,
      column_id: columnId,
      client_name: leadData.clientName || 'Sem nome',
      company: leadData.company || '',
      email: leadData.email || null,
      phone: leadData.phone || null,
      avatar_url: leadData.avatar || null,
      deal_value: leadData.dealValue || 0,
      priority: leadData.priority || 'medium',
      status: 'active',
      contact_date: leadData.contactDate || null,
      expected_close_date: leadData.expectedCloseDate || null,
      due_date: leadData.dueDate || null,
      tags: leadData.tags || [],
      notes: leadData.notes || null,
      position,
      is_important: leadData.isImportant || false,
      assignee_name: leadData.assignee?.name || null,
      assignee_avatar: leadData.assignee?.avatar || null,
      assigned_to: leadData.assignee?.id || null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating lead:', error);
    throw new Error(`Failed to create lead: ${error.message}`);
  }
  
  // Update stats (não crítico, silenciar erros)
  try {
    await updateStatsOnCreate(workspaceId, funnelId, columnId, newLead);
  } catch (statsError) {
    console.warn('⚠️ Failed to update stats on create (non-critical):', statsError);
  }
  
  return mapLeadFromDB(newLead);
}

/**
 * Atualiza um lead
 */
export async function updateLead(
  workspaceId: string,
  leadId: string,
  updates: Partial<Lead>,
  userId: string
): Promise<Lead> {
  const supabase = getSupabase();
  
  // Get existing lead for stats comparison
  const existing = await getLead(workspaceId, leadId);
  if (!existing) throw new Error('Lead not found');
  
  // Preparar dados de atualização
  const updateData: any = {
    updated_by: userId,
  };
  
  if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
  if (updates.company !== undefined) updateData.company = updates.company;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;
  if (updates.dealValue !== undefined) updateData.deal_value = updates.dealValue;
  if (updates.priority) updateData.priority = updates.priority;
  if (updates.contactDate !== undefined) updateData.contact_date = updates.contactDate;
  if (updates.expectedCloseDate !== undefined) updateData.expected_close_date = updates.expectedCloseDate;
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
  if (updates.tags) updateData.tags = updates.tags;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.isImportant !== undefined) updateData.is_important = updates.isImportant;
  if (updates.assignee) {
    updateData.assignee_name = updates.assignee.name;
    updateData.assignee_avatar = updates.assignee.avatar;
    updateData.assigned_to = updates.assignee.id;
  }
  
  const { data: updatedLead, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating lead:', error);
    throw new Error(`Failed to update lead: ${error.message}`);
  }
  
  // Update stats if values changed (não crítico)
  if (existing.dealValue !== updates.dealValue || existing.priority !== updates.priority) {
    try {
      await updateStatsOnUpdate(workspaceId, existing, mapLeadFromDB(updatedLead));
    } catch (statsError) {
      console.warn('⚠️ Failed to update stats on update (non-critical):', statsError);
    }
  }
  
  return mapLeadFromDB(updatedLead);
}

/**
 * Move lead entre colunas (drag & drop)
 */
export async function moveLead(
  workspaceId: string,
  leadId: string,
  toColumnId: string,
  toPosition: number,
  userId: string
): Promise<Lead> {
  const supabase = getSupabase();
  
  // Get existing lead
  const lead = await getLead(workspaceId, leadId);
  if (!lead) throw new Error('Lead not found');
  
  const fromColumnId = lead.column_id;
  
  // Update lead
  const { data: updatedLead, error } = await supabase
    .from('leads')
    .update({
      column_id: toColumnId,
      position: toPosition,
      updated_by: userId,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();
  
  if (error) {
    console.error('Error moving lead:', error);
    throw new Error(`Failed to move lead: ${error.message}`);
  }
  
  // Update stats if moved between columns (não crítico)
  if (fromColumnId !== toColumnId) {
    try {
      await updateStatsOnMove(workspaceId, lead.funnel_id, fromColumnId, toColumnId, lead.dealValue);
    } catch (statsError) {
      console.warn('⚠️ Failed to update stats on move (non-critical):', statsError);
    }
  }
  
  return mapLeadFromDB(updatedLead);
}

/**
 * Move múltiplos leads de uma vez
 */
export async function batchMoveLeads(
  workspaceId: string,
  moves: Array<{ leadId: string; toColumnId: string; toPosition: number }>,
  userId: string
): Promise<Array<{ success: boolean; leadId: string; lead?: Lead; error?: string }>> {
  const results = [];
  
  for (const move of moves) {
    try {
      const updatedLead = await moveLead(
        workspaceId,
        move.leadId,
        move.toColumnId,
        move.toPosition,
        userId
      );
      results.push({ success: true, leadId: move.leadId, lead: updatedLead });
    } catch (error: any) {
      results.push({ success: false, leadId: move.leadId, error: error.message });
    }
  }
  
  return results;
}

/**
 * Deleta lead (hard delete com CASCADE)
 */
export async function deleteLead(
  workspaceId: string,
  leadId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabase();
  
  // Get lead for stats
  const lead = await getLead(workspaceId, leadId);
  if (!lead) throw new Error('Lead not found');
  
  try {
    // 1. Deletar custom field values
    const { error: customValuesError } = await supabase
      .from('lead_custom_values')
      .delete()
      .eq('lead_id', leadId);
    
    if (customValuesError) {
      console.error('Error deleting custom values:', customValuesError);
      throw customValuesError;
    }
    
    // 2. Deletar atividades
    await supabase
      .from('lead_activities')
      .delete()
      .eq('lead_id', leadId);
    
    // 3. Deletar anexos
    await supabase
      .from('lead_attachments')
      .delete()
      .eq('lead_id', leadId);
    
    // 4. Deletar logs de campanha
    await supabase
      .from('campaign_logs')
      .delete()
      .eq('lead_id', leadId);
    
    // 5. Deletar mensagens de campanha
    await supabase
      .from('campaign_messages')
      .delete()
      .eq('lead_id', leadId);
    
    // 6. Desvincular conversas
    await supabase
      .from('conversations')
      .update({ lead_id: null })
      .eq('lead_id', leadId);
    
    // 7. Deletar o lead
    const { error: deleteError, data: deleteData } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('workspace_id', workspaceId)
      .select();
    
    if (deleteError) {
      console.error('Error deleting lead:', deleteError);
      throw deleteError;
    }
    
    if (!deleteData || deleteData.length === 0) {
      throw new Error('Lead não foi deletado. Verifique se o lead existe.');
    }
    
    // 8. Update stats (não crítico)
    try {
      await updateStatsOnDelete(workspaceId, lead);
    } catch (statsError) {
      console.warn('⚠️ Failed to update stats on delete (non-critical):', statsError);
    }
  } catch (error) {
    console.error('Error during hard delete:', error);
    throw error;
  }
}

// =============================================================================
// STATS HELPERS (não exportadas, apenas para uso interno)
// =============================================================================

async function updateStatsOnCreate(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  lead: any
): Promise<void> {
  const supabase = getSupabase();
  
  const { data: stats } = await supabase
    .from('funnel_stats')
    .select('*')
    .eq('funnel_id', funnelId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (!stats) return;
  
  const columnStats = stats.column_stats || {};
  if (!columnStats[columnId]) {
    columnStats[columnId] = { count: 0, total_value: 0 };
  }
  
  columnStats[columnId].count += 1;
  columnStats[columnId].total_value += parseFloat(lead.deal_value || 0);
  
  await supabase
    .from('funnel_stats')
    .update({
      total_leads: stats.total_leads + 1,
      total_value: parseFloat(stats.total_value) + parseFloat(lead.deal_value || 0),
      high_priority_count: stats.high_priority_count + (lead.priority === 'high' ? 1 : 0),
      column_stats: columnStats,
    })
    .eq('funnel_id', funnelId)
    .eq('workspace_id', workspaceId);
}

async function updateStatsOnUpdate(
  workspaceId: string,
  oldLead: Lead,
  newLead: Lead
): Promise<void> {
  const supabase = getSupabase();
  
  const { data: stats } = await supabase
    .from('funnel_stats')
    .select('*')
    .eq('funnel_id', newLead.funnel_id)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (!stats) return;
  
  const columnStats = stats.column_stats || {};
  const columnId = newLead.column_id;
  
  if (columnStats[columnId]) {
    columnStats[columnId].total_value += (newLead.dealValue - oldLead.dealValue);
  }
  
  let highPriorityDelta = 0;
  if (oldLead.priority === 'high' && newLead.priority !== 'high') highPriorityDelta = -1;
  if (oldLead.priority !== 'high' && newLead.priority === 'high') highPriorityDelta = 1;
  
  await supabase
    .from('funnel_stats')
    .update({
      total_value: parseFloat(stats.total_value) + (newLead.dealValue - oldLead.dealValue),
      high_priority_count: stats.high_priority_count + highPriorityDelta,
      column_stats: columnStats,
    })
    .eq('funnel_id', newLead.funnel_id)
    .eq('workspace_id', workspaceId);
}

async function updateStatsOnMove(
  workspaceId: string,
  funnelId: string,
  fromColumnId: string,
  toColumnId: string,
  dealValue: number
): Promise<void> {
  const supabase = getSupabase();
  
  const { data: stats } = await supabase
    .from('funnel_stats')
    .select('*')
    .eq('funnel_id', funnelId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (!stats) return;
  
  const columnStats = stats.column_stats || {};
  
  // Remove from source column
  if (columnStats[fromColumnId]) {
    columnStats[fromColumnId].count -= 1;
    columnStats[fromColumnId].total_value -= dealValue;
  }
  
  // Add to target column
  if (!columnStats[toColumnId]) {
    columnStats[toColumnId] = { count: 0, total_value: 0 };
  }
  columnStats[toColumnId].count += 1;
  columnStats[toColumnId].total_value += dealValue;
  
  await supabase
    .from('funnel_stats')
    .update({ column_stats: columnStats })
    .eq('funnel_id', funnelId)
    .eq('workspace_id', workspaceId);
}

async function updateStatsOnDelete(workspaceId: string, lead: Lead): Promise<void> {
  const supabase = getSupabase();
  
  const { data: stats } = await supabase
    .from('funnel_stats')
    .select('*')
    .eq('funnel_id', lead.funnel_id)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (!stats) return;
  
  const columnStats = stats.column_stats || {};
  const columnId = lead.column_id;
  
  if (columnStats[columnId]) {
    columnStats[columnId].count -= 1;
    columnStats[columnId].total_value -= lead.dealValue;
  }
  
  await supabase
    .from('funnel_stats')
    .update({
      total_leads: stats.total_leads - 1,
      total_value: parseFloat(stats.total_value) - lead.dealValue,
      high_priority_count: stats.high_priority_count - (lead.priority === 'high' ? 1 : 0),
      column_stats: columnStats,
    })
    .eq('funnel_id', lead.funnel_id)
    .eq('workspace_id', workspaceId);
}

