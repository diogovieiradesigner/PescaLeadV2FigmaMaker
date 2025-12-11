import { createClient } from "npm:@supabase/supabase-js@2";
import { Lead, Funnel, FunnelStats, Column } from "./types.ts";

// Create Supabase client
const getSupabase = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ========================================
// FUNNEL OPERATIONS
// ========================================

export async function getFunnels(workspaceId: string): Promise<Funnel[]> {
  const supabase = getSupabase();
  
  const { data: funnels, error } = await supabase
    .from('funnels')
    .select(`
      id,
      name,
      description,
      is_active,
      position,
      workspace_id,
      created_by,
      created_at,
      updated_at,
      funnel_columns (
        id,
        title,
        position,
        color,
        created_at,
        updated_at
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('position', { ascending: true });
  
  if (error) {
    console.error('Error fetching funnels:', error);
    throw new Error(`Failed to fetch funnels: ${error.message}`);
  }
  
  return (funnels || []).map(funnel => ({
    id: funnel.id,
    name: funnel.name,
    workspace_id: funnel.workspace_id,
    description: funnel.description,
    is_active: funnel.is_active,
    position: funnel.position,
    created_by: funnel.created_by,
    created_at: funnel.created_at,
    updated_at: funnel.updated_at,
    columns: (funnel.funnel_columns || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((col: any) => ({
        id: col.id,
        title: col.title,
        position: col.position,
        color: col.color,
        created_at: col.created_at,
        updated_at: col.updated_at,
      }))
  }));
}

export async function getFunnel(workspaceId: string, funnelId: string): Promise<Funnel | null> {
  const supabase = getSupabase();
  
  const { data: funnel, error } = await supabase
    .from('funnels')
    .select(`
      id,
      name,
      description,
      is_active,
      position,
      workspace_id,
      created_by,
      created_at,
      updated_at,
      funnel_columns (
        id,
        title,
        position,
        color,
        created_at,
        updated_at
      )
    `)
    .eq('id', funnelId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching funnel:', error);
    throw new Error(`Failed to fetch funnel: ${error.message}`);
  }
  
  if (!funnel) return null;
  
  return {
    id: funnel.id,
    name: funnel.name,
    workspace_id: funnel.workspace_id,
    description: funnel.description,
    is_active: funnel.is_active,
    position: funnel.position,
    created_by: funnel.created_by,
    created_at: funnel.created_at,
    updated_at: funnel.updated_at,
    columns: (funnel.funnel_columns || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((col: any) => ({
        id: col.id,
        title: col.title,
        position: col.position,
        color: col.color,
        created_at: col.created_at,
        updated_at: col.updated_at,
      }))
  };
}

export async function createFunnel(
  workspaceId: string,
  name: string,
  userId: string,
  description?: string
): Promise<Funnel> {
  const supabase = getSupabase();
  
  // Get max position
  const { data: maxPos } = await supabase
    .from('funnels')
    .select('position')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: false })
    .limit(1)
    .single();
  
  const position = (maxPos?.position ?? -1) + 1;
  
  // Create funnel
  const { data: funnel, error: funnelError } = await supabase
    .from('funnels')
    .insert({
      workspace_id: workspaceId,
      name,
      description,
      is_active: true,
      position,
      created_by: userId,
    })
    .select()
    .single();
  
  if (funnelError) {
    console.error('Error creating funnel:', funnelError);
    throw new Error(`Failed to create funnel: ${funnelError.message}`);
  }
  
  // Create default columns
  const defaultColumns = [
    { title: 'Novo Lead', position: 0 },
    { title: 'Contato Inicial', position: 1 },
    { title: 'Proposta', position: 2 },
    { title: 'Negociação', position: 3 },
    { title: 'Fechado', position: 4 },
  ];
  
  const { data: columns, error: columnsError } = await supabase
    .from('funnel_columns')
    .insert(
      defaultColumns.map(col => ({
        funnel_id: funnel.id,
        title: col.title,
        position: col.position,
      }))
    )
    .select();
  
  if (columnsError) {
    console.error('Error creating columns:', columnsError);
    throw new Error(`Failed to create columns: ${columnsError.message}`);
  }
  
  // Initialize stats
  const { error: statsError } = await supabase
    .from('funnel_stats')
    .insert({
      funnel_id: funnel.id,
      workspace_id: workspaceId,
      total_leads: 0,
      total_value: 0,
      high_priority_count: 0,
      column_stats: {},
    });
  
  if (statsError) {
    console.error('Error initializing stats:', statsError);
    throw new Error(`Failed to initialize stats: ${statsError.message}`);
  }
  
  return {
    id: funnel.id,
    name: funnel.name,
    workspace_id: funnel.workspace_id,
    description: funnel.description,
    is_active: funnel.is_active,
    position: funnel.position,
    created_by: funnel.created_by,
    created_at: funnel.created_at,
    updated_at: funnel.updated_at,
    columns: (columns || [])
      .sort((a, b) => a.position - b.position)
      .map(col => ({
        id: col.id,
        title: col.title,
        position: col.position,
        color: col.color,
        created_at: col.created_at,
        updated_at: col.updated_at,
      }))
  };
}

export async function updateFunnel(
  workspaceId: string,
  funnelId: string,
  updates: {
    name?: string;
    description?: string;
    columns?: { id: string; title: string; position: number }[];
  }
): Promise<void> {
  const supabase = getSupabase();
  
  // Update funnel
  if (updates.name || updates.description) {
    const { error } = await supabase
      .from('funnels')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.description && { description: updates.description }),
      })
      .eq('id', funnelId)
      .eq('workspace_id', workspaceId);
    
    if (error) {
      console.error('Error updating funnel:', error);
      throw new Error(`Failed to update funnel: ${error.message}`);
    }
  }
  
  // Update columns if provided
  if (updates.columns && updates.columns.length > 0) {
    console.log('[KANBAN HELPERS] Atualizando colunas:', {
      receivedColumnsCount: updates.columns.length,
      receivedColumns: updates.columns.map(c => ({ id: c.id, title: c.title }))
    });
    
    // 1. Get existing columns from database (with positions)
    const { data: existingColumns, error: fetchError } = await supabase
      .from('funnel_columns')
      .select('id, position')
      .eq('funnel_id', funnelId);
    
    if (fetchError) {
      console.error('Error fetching existing columns:', fetchError);
      throw new Error(`Failed to fetch existing columns: ${fetchError.message}`);
    }
    
    const existingColumnIds = (existingColumns || []).map((col: any) => col.id);
    // Create a map of existing column IDs to their old positions
    const existingColumnMap = new Map((existingColumns || []).map((col: any) => [col.id, col.position]));
    const existingPositions = new Set((existingColumns || []).map((col: any) => col.position));
    const updatedColumnIds = updates.columns.map(col => col.id);
    
    console.log('[KANBAN HELPERS] Comparação de colunas:', {
      existingCount: existingColumnIds.length,
      existingIds: existingColumnIds,
      existingPositions: Array.from(existingPositions),
      updatedCount: updatedColumnIds.length,
      updatedIds: updatedColumnIds
    });
    
    // 2. Delete columns that are no longer in the list
    const columnsToDelete = existingColumnIds.filter(id => !updatedColumnIds.includes(id));
    
    console.log('[KANBAN HELPERS] Colunas para deletar:', {
      count: columnsToDelete.length,
      ids: columnsToDelete
    });
    
    if (columnsToDelete.length > 0) {
      // Before deleting columns, we need to handle leads in those columns
      // Option 1: Prevent deletion if there are leads
      // Option 2: Move leads to another column
      // For now, let's prevent deletion if there are leads
      
      for (const columnId of columnsToDelete) {
        const { count, error: countError } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('funnel_id', funnelId)
          .eq('column_id', columnId)
          .eq('status', 'active');
        
        if (countError) {
          console.error('Error counting leads in column:', countError);
          throw new Error(`Failed to count leads: ${countError.message}`);
        }
        
        if (count && count > 0) {
          throw new Error(`Não é possível deletar coluna com ${count} lead(s). Mova os leads antes de deletar.`);
        }
      }
      
      // Now safe to delete
      const { error: deleteError } = await supabase
        .from('funnel_columns')
        .delete()
        .in('id', columnsToDelete);
      
      if (deleteError) {
        console.error('Error deleting columns:', deleteError);
        throw new Error(`Failed to delete columns: ${deleteError.message}`);
      }
      
      // Remove deleted columns' positions from tracking
      const deletedColumns = (existingColumns || []).filter((col: any) => columnsToDelete.includes(col.id));
      deletedColumns.forEach((col: any) => existingPositions.delete(col.position));
    }
    
    // 3. First, update existing columns (to free positions that might conflict)
    // We'll update positions first, then insert new ones
    const columnsToUpdate = updates.columns.filter(col => existingColumnIds.includes(col.id));
    const columnsToInsert = updates.columns.filter(col => !existingColumnIds.includes(col.id));
    
    // Update existing columns first
    for (const col of columnsToUpdate) {
      // Get the old position before updating
      const oldPosition = existingColumnMap.get(col.id);
      
      // Remove old position from tracking if it exists
      if (oldPosition !== undefined) {
        existingPositions.delete(oldPosition);
      }
      
      // Check if new position is already taken by another column
      let finalPosition = col.position;
      if (existingPositions.has(finalPosition)) {
        // Position is taken, find next available
        let nextPosition = finalPosition;
        while (existingPositions.has(nextPosition)) {
          nextPosition++;
        }
        finalPosition = nextPosition;
        console.log(`[KANBAN HELPERS] Posição ${col.position} ocupada, usando ${finalPosition} para coluna existente "${col.title}"`);
      }
      
      const { error } = await supabase
        .from('funnel_columns')
        .update({
          title: col.title,
          position: finalPosition,
        })
        .eq('id', col.id)
        .eq('funnel_id', funnelId);
      
      if (error) {
        console.error('Error updating column:', error);
        throw new Error(`Failed to update column: ${error.message}`);
      }
      
      // Track new position as used
      existingPositions.add(finalPosition);
    }
    
    // 4. Insert new columns, checking for position conflicts
    for (const col of columnsToInsert) {
      let finalPosition = col.position;
      
      // If position is already taken, find next available position
      if (existingPositions.has(finalPosition)) {
        // Find next available position
        let nextPosition = finalPosition;
        while (existingPositions.has(nextPosition)) {
          nextPosition++;
        }
        finalPosition = nextPosition;
        console.log(`[KANBAN HELPERS] Posição ${col.position} ocupada, usando ${finalPosition} para coluna "${col.title}"`);
      }
      
      // Insert new column
      const { error } = await supabase
        .from('funnel_columns')
        .insert({
          funnel_id: funnelId,
          title: col.title,
          position: finalPosition,
        });
      
      if (error) {
        console.error('Error inserting column:', error);
        throw new Error(`Failed to insert column: ${error.message}`);
      }
      
      // Track this position as used
      existingPositions.add(finalPosition);
    }
  }
}

export async function deleteFunnel(workspaceId: string, funnelId: string): Promise<void> {
  const supabase = getSupabase();
  
  // Soft delete (mark as inactive)
  const { error } = await supabase
    .from('funnels')
    .update({ is_active: false })
    .eq('id', funnelId)
    .eq('workspace_id', workspaceId);
  
  if (error) {
    console.error('Error deleting funnel:', error);
    throw new Error(`Failed to delete funnel: ${error.message}`);
  }
}

// ========================================
// LEAD OPERATIONS
// ========================================

export async function getColumnLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ leads: Lead[]; total: number; hasMore: boolean }> {
  const supabase = getSupabase();
  
  // Get total count
  const { count, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active');
  
  if (countError) {
    console.error('Error counting leads:', countError);
    throw new Error(`Failed to count leads: ${countError.message}`);
  }
  
  const total = count ?? 0;
  
  // Get leads
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active')
    .order('position', { ascending: true })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('Error fetching leads:', error);
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }
  
  return {
    leads: (leads || []).map(mapLeadFromDB),
    total,
    hasMore: offset + limit < total,
  };
}

export async function getLead(workspaceId: string, leadId: string): Promise<Lead | null> {
  const supabase = getSupabase();
  
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching lead:', error);
    throw new Error(`Failed to fetch lead: ${error.message}`);
  }
  
  if (!lead) return null;
  
  return mapLeadFromDB(lead);
}

export async function createLead(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  lead: Partial<Lead>,
  userId: string
): Promise<Lead> {
  const supabase = getSupabase();
  
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
  
  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      workspace_id: workspaceId,
      funnel_id: funnelId,
      column_id: columnId,
      client_name: lead.clientName || 'Sem nome',
      company: lead.company || '',
      email: lead.email || null,
      phone: lead.phone || null,
      avatar_url: lead.avatar || null,
      deal_value: lead.dealValue || 0,
      priority: lead.priority || 'medium',
      status: 'active',
      contact_date: lead.contactDate || null,
      expected_close_date: lead.expectedCloseDate || null,
      due_date: lead.dueDate || null,
      tags: lead.tags || [],
      notes: lead.notes || null,
      position,
      is_important: lead.isImportant || false,
      assignee_name: lead.assignee?.name || null,
      assignee_avatar: lead.assignee?.avatar || null,
      assigned_to: lead.assignee?.id || null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating lead:', error);
    throw new Error(`Failed to create lead: ${error.message}`);
  }
  
  // Update stats
  await updateStatsOnCreate(workspaceId, funnelId, columnId, newLead);
  
  return mapLeadFromDB(newLead);
}

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
  
  const { data: updatedLead, error } = await supabase
    .from('leads')
    .update({
      ...(updates.clientName && { client_name: updates.clientName }),
      ...(updates.company !== undefined && { company: updates.company }),
      ...(updates.email !== undefined && { email: updates.email }),
      ...(updates.phone !== undefined && { phone: updates.phone }),
      ...(updates.avatar !== undefined && { avatar_url: updates.avatar }),
      ...(updates.dealValue !== undefined && { deal_value: updates.dealValue }),
      ...(updates.priority && { priority: updates.priority }),
      ...(updates.contactDate !== undefined && { contact_date: updates.contactDate }),
      ...(updates.expectedCloseDate !== undefined && { expected_close_date: updates.expectedCloseDate }),
      ...(updates.dueDate !== undefined && { due_date: updates.dueDate }),
      ...(updates.tags && { tags: updates.tags }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.isImportant !== undefined && { is_important: updates.isImportant }),
      ...(updates.assignee && {
        assignee_name: updates.assignee.name,
        assignee_avatar: updates.assignee.avatar,
        assigned_to: updates.assignee.id,
      }),
      updated_by: userId,
    })
    .eq('id', leadId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating lead:', error);
    throw new Error(`Failed to update lead: ${error.message}`);
  }
  
  // Update stats if values changed
  if (existing.dealValue !== updates.dealValue || existing.priority !== updates.priority) {
    await updateStatsOnUpdate(workspaceId, existing, mapLeadFromDB(updatedLead));
  }
  
  return mapLeadFromDB(updatedLead);
}

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
  
  // Update stats if moved between columns
  if (fromColumnId !== toColumnId) {
    try {
      await updateStatsOnMove(workspaceId, lead.funnel_id, fromColumnId, toColumnId, lead.dealValue);
    } catch (statsError) {
      // ✅ Silenciar erros de stats (não devem bloquear o movimento do lead)
      console.warn('⚠️ Failed to update stats on move (non-critical):', statsError);
    }
  }
  
  return mapLeadFromDB(updatedLead);
}

export async function deleteLead(
  workspaceId: string,
  leadId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabase();
  
  // Get lead for stats
  const lead = await getLead(workspaceId, leadId);
  if (!lead) throw new Error('Lead not found');
  
  // Soft delete
  const { error } = await supabase
    .from('leads')
    .update({
      status: 'deleted',
      updated_by: userId,
    })
    .eq('id', leadId)
    .eq('workspace_id', workspaceId);
  
  if (error) {
    console.error('Error deleting lead:', error);
    throw new Error(`Failed to delete lead: ${error.message}`);
  }
  
  // Update stats
  await updateStatsOnDelete(workspaceId, lead);
}

// ============================================
// HARD DELETE LEAD (Permanent deletion with CASCADE)
// ============================================

/**
 * Deleta lead permanentemente com CASCADE
 * Remove automaticamente todos os registros relacionados
 * Usa SERVICE_ROLE_KEY para bypassar RLS
 */
export async function hardDeleteLead(
  workspaceId: string,
  leadId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabase(); // Já usa SERVICE_ROLE_KEY
  
  console.log(`[HARD-DELETE] 🔥 Iniciando deleção permanente do lead: ${leadId}`);
  
  // Get lead for stats (before deleting)
  const lead = await getLead(workspaceId, leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }
  
  try {
    // 1. Deletar custom field values
    console.log('[HARD-DELETE] 1️⃣ Deletando custom values...');
    const { error: customValuesError } = await supabase
      .from('lead_custom_values')
      .delete()
      .eq('lead_id', leadId);
    
    if (customValuesError) {
      console.error('[HARD-DELETE] ❌ Erro ao deletar custom values:', customValuesError);
      throw customValuesError;
    }
    console.log('[HARD-DELETE] ✅ Custom values deletados');
    
    // 2. Deletar atividades
    console.log('[HARD-DELETE] 2️⃣ Deletando activities...');
    const { error: activitiesError } = await supabase
      .from('lead_activities')
      .delete()
      .eq('lead_id', leadId);
    
    if (activitiesError) {
      console.warn('[HARD-DELETE] ⚠️ Erro ao deletar activities (não crítico):', activitiesError);
    } else {
      console.log('[HARD-DELETE] ✅ Activities deletados');
    }
    
    // 3. Deletar anexos
    console.log('[HARD-DELETE] 3️⃣ Deletando attachments...');
    const { error: attachmentsError } = await supabase
      .from('lead_attachments')
      .delete()
      .eq('lead_id', leadId);
    
    if (attachmentsError) {
      console.warn('[HARD-DELETE] ⚠️ Erro ao deletar attachments (não crítico):', attachmentsError);
    } else {
      console.log('[HARD-DELETE] ✅ Attachments deletados');
    }
    
    // 4. Deletar logs de campanha
    console.log('[HARD-DELETE] 4️⃣ Deletando campaign logs...');
    const { error: campaignLogsError } = await supabase
      .from('campaign_logs')
      .delete()
      .eq('lead_id', leadId);
    
    if (campaignLogsError) {
      console.warn('[HARD-DELETE] ⚠️ Erro ao deletar campaign logs (não crítico):', campaignLogsError);
    } else {
      console.log('[HARD-DELETE] ✅ Campaign logs deletados');
    }
    
    // 5. Deletar mensagens de campanha
    console.log('[HARD-DELETE] 5️⃣ Deletando campaign messages...');
    const { error: campaignMessagesError } = await supabase
      .from('campaign_messages')
      .delete()
      .eq('lead_id', leadId);
    
    if (campaignMessagesError) {
      console.warn('[HARD-DELETE] ⚠️ Erro ao deletar campaign messages (não crítico):', campaignMessagesError);
    } else {
      console.log('[HARD-DELETE] ✅ Campaign messages deletados');
    }
    
    // 6. Desvincular conversas (não deletar, apenas setar NULL)
    console.log('[HARD-DELETE] 6️⃣ Desvinculando conversas...');
    const { error: conversationsError } = await supabase
      .from('conversations')
      .update({ lead_id: null })
      .eq('lead_id', leadId);
    
    if (conversationsError) {
      console.error('[HARD-DELETE] ❌ Erro ao desvincular conversas:', conversationsError);
      throw conversationsError;
    }
    console.log('[HARD-DELETE] ✅ Conversas desvinculadas');
    
    // 7. Finalmente, deletar o lead
    console.log('[HARD-DELETE] 7️⃣ Deletando lead principal...');
    const { error: deleteError, data: deleteData } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('workspace_id', workspaceId)
      .select();
    
    if (deleteError) {
      console.error('[HARD-DELETE] ❌ Erro ao deletar lead:', {
        error: deleteError,
        message: deleteError.message,
        code: deleteError.code,
      });
      throw deleteError;
    }
    
    if (!deleteData || deleteData.length === 0) {
      console.error('[HARD-DELETE] ❌ Lead não foi deletado (nenhuma linha afetada)');
      throw new Error('Lead não foi deletado. Verifique se o lead existe.');
    }
    
    console.log('[HARD-DELETE] ✅ Lead deletado permanentemente com sucesso');
    
    // 8. Update stats
    await updateStatsOnDelete(workspaceId, lead);
    console.log('[HARD-DELETE] ✅ Stats atualizados');
    
  } catch (error) {
    console.error('[HARD-DELETE] ❌ Erro durante hard delete:', error);
    throw error;
  }
}

// ========================================
// STATS OPERATIONS
// ========================================

export async function getStats(workspaceId: string, funnelId: string): Promise<FunnelStats | null> {
  const supabase = getSupabase();
  
  const { data: stats, error } = await supabase
    .from('funnel_stats')
    .select('*')
    .eq('funnel_id', funnelId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching stats:', error);
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }
  
  if (!stats) return null;
  
  return {
    total_leads: stats.total_leads,
    total_value: parseFloat(stats.total_value),
    high_priority_count: stats.high_priority_count,
    last_updated: new Date(stats.last_updated).getTime(),
    columns: stats.column_stats || {},
  };
}

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

// ========================================
// CHANGELOG OPERATIONS
// ========================================

export async function getChangelogSince(workspaceId: string, since: number): Promise<any[]> {
  // TODO: Implement changelog table if needed
  return [];
}

export async function getLastSequence(workspaceId: string): Promise<number> {
  // TODO: Implement changelog table if needed
  return 0;
}

// ========================================
// SEARCH OPERATIONS
// ========================================

export async function searchLeads(
  workspaceId: string,
  funnelId: string,
  query?: string,
  priority?: string,
  assignee?: string,
  tags?: string[]
): Promise<Lead[]> {
  const supabase = getSupabase();
  
  let queryBuilder = supabase
    .from('leads')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('status', 'active');
  
  // ✅ CORREÇÃO SQL INJECTION: Sanitizar input antes de usar .or()
  if (query) {
    // Escapar caracteres especiais que poderiam causar SQL injection
    // PostgREST/Supabase aceita % como wildcard mas precisa sanitizar ' " \ 
    const sanitized = query
      .replace(/\\/g, '\\\\')  // Escapar backslash
      .replace(/'/g, "''")      // Escapar aspas simples
      .replace(/"/g, '\\"');    // Escapar aspas duplas
    
    queryBuilder = queryBuilder.or(
      `client_name.ilike.%${sanitized}%,company.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`
    );
  }
  
  if (priority) {
    queryBuilder = queryBuilder.eq('priority', priority);
  }
  
  if (assignee) {
    queryBuilder = queryBuilder.eq('assignee_name', assignee);
  }
  
  if (tags && tags.length > 0) {
    queryBuilder = queryBuilder.contains('tags', tags);
  }
  
  const { data: leads, error } = await queryBuilder;
  
  if (error) {
    console.error('Error searching leads:', error);
    throw new Error(`Failed to search leads: ${error.message}`);
  }
  
  return (leads || []).map(mapLeadFromDB);
}

export async function recalculateStats(workspaceId: string, funnelId: string): Promise<FunnelStats> {
  const supabase = getSupabase();
  
  // Get all leads for this funnel
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('status', 'active');
  
  if (error) {
    console.error('Error fetching leads for recalculation:', error);
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }
  
  const stats: FunnelStats = {
    total_leads: 0,
    total_value: 0,
    high_priority_count: 0,
    last_updated: Date.now(),
    columns: {},
  };
  
  // Calculate stats
  (leads || []).forEach(lead => {
    stats.total_leads += 1;
    stats.total_value += parseFloat(lead.deal_value || 0);
    if (lead.priority === 'high') stats.high_priority_count += 1;
    
    const columnId = lead.column_id;
    if (!stats.columns[columnId]) {
      stats.columns[columnId] = { count: 0, total_value: 0 };
    }
    stats.columns[columnId].count += 1;
    stats.columns[columnId].total_value += parseFloat(lead.deal_value || 0);
  });
  
  // Update stats in database
  await supabase
    .from('funnel_stats')
    .update({
      total_leads: stats.total_leads,
      total_value: stats.total_value,
      high_priority_count: stats.high_priority_count,
      column_stats: stats.columns,
    })
    .eq('funnel_id', funnelId)
    .eq('workspace_id', workspaceId);
  
  return stats;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function mapLeadFromDB(dbLead: any): Lead {
  return {
    id: dbLead.id,
    workspace_id: dbLead.workspace_id,
    funnel_id: dbLead.funnel_id,
    column_id: dbLead.column_id,
    clientName: dbLead.client_name,
    company: dbLead.company || '',
    email: dbLead.email || '',
    phone: dbLead.phone || '',
    avatar: dbLead.avatar_url || '',
    dealValue: parseFloat(dbLead.deal_value || 0),
    priority: dbLead.priority || 'medium',
    status: dbLead.status || 'active',
    contactDate: dbLead.contact_date,
    expectedCloseDate: dbLead.expected_close_date,
    dueDate: dbLead.due_date,
    tags: dbLead.tags || [],
    notes: dbLead.notes || '',
    position: dbLead.position,
    isImportant: dbLead.is_important || false,
    assignee: {
      id: dbLead.assigned_to || '',
      name: dbLead.assignee_name || 'Não atribuído',
      avatar: dbLead.assignee_avatar || '',
    },
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