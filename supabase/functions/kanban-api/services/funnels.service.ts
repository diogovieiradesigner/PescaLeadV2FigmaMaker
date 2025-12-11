// =============================================================================
// FUNNELS SERVICE
// =============================================================================
// Operações relacionadas a funis (kanbans)
// =============================================================================

import { getSupabase } from '../database/client.ts';
import type { Funnel } from '../types.ts';

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
        funnel_id: funnel.id,
        created_at: col.created_at,
        updated_at: col.updated_at,
      }))
  }));
}

/**
 * Cria um novo funil
 */
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
        funnel_id: funnel.id,
        created_at: col.created_at,
        updated_at: col.updated_at,
      }))
  };
}

/**
 * Atualiza um funil
 */
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
    // 1. Get existing columns from database
    const { data: existingColumns, error: fetchError } = await supabase
      .from('funnel_columns')
      .select('id, position')
      .eq('funnel_id', funnelId);
    
    if (fetchError) {
      console.error('Error fetching existing columns:', fetchError);
      throw new Error(`Failed to fetch existing columns: ${fetchError.message}`);
    }
    
    const existingColumnIds = (existingColumns || []).map((col: any) => col.id);
    const existingColumnMap = new Map((existingColumns || []).map((col: any) => [col.id, col.position]));
    const existingPositions = new Set((existingColumns || []).map((col: any) => col.position));
    const updatedColumnIds = updates.columns.map(col => col.id);
    
    // 2. Delete columns that are no longer in the list
    const columnsToDelete = existingColumnIds.filter(id => !updatedColumnIds.includes(id));
    
    if (columnsToDelete.length > 0) {
      // Prevent deletion if there are leads
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
    
    // 3. Update existing columns first
    const columnsToUpdate = updates.columns.filter(col => existingColumnIds.includes(col.id));
    const columnsToInsert = updates.columns.filter(col => !existingColumnIds.includes(col.id));
    
    for (const col of columnsToUpdate) {
      const oldPosition = existingColumnMap.get(col.id);
      if (oldPosition !== undefined) {
        existingPositions.delete(oldPosition);
      }
      
      let finalPosition = col.position;
      while (existingPositions.has(finalPosition)) {
        finalPosition++;
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
      
      existingPositions.add(finalPosition);
    }
    
    // 4. Insert new columns
    for (const col of columnsToInsert) {
      let finalPosition = col.position;
      while (existingPositions.has(finalPosition)) {
        finalPosition++;
      }
      
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
      
      existingPositions.add(finalPosition);
    }
  }
}

/**
 * Deleta um funil (soft delete)
 */
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
        funnel_id: funnel.id,
        created_at: col.created_at,
        updated_at: col.updated_at,
      }))
  };
}

