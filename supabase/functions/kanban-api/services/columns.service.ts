// =============================================================================
// COLUMNS SERVICE
// =============================================================================
// Operações relacionadas a colunas do kanban
// =============================================================================

import { getSupabase } from '../database/client.ts';
import type { Column } from '../types.ts';

export async function getColumns(workspaceId: string, funnelId: string): Promise<Column[]> {
  const supabase = getSupabase();
  
  const { data: columns, error } = await supabase
    .from('funnel_columns')
    .select('*')
    .eq('funnel_id', funnelId)
    .order('position', { ascending: true });
  
  if (error) {
    console.error('Error fetching columns:', error);
    throw new Error(`Failed to fetch columns: ${error.message}`);
  }
  
  return (columns || []).map(col => ({
    id: col.id,
    title: col.title,
    position: col.position,
    color: col.color,
    funnel_id: col.funnel_id,
    created_at: col.created_at,
    updated_at: col.updated_at,
  }));
}

export async function getColumn(workspaceId: string, funnelId: string, columnId: string): Promise<Column | null> {
  const supabase = getSupabase();
  
  const { data: column, error } = await supabase
    .from('funnel_columns')
    .select('*')
    .eq('id', columnId)
    .eq('funnel_id', funnelId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching column:', error);
    throw new Error(`Failed to fetch column: ${error.message}`);
  }
  
  if (!column) return null;
  
  return {
    id: column.id,
    title: column.title,
    position: column.position,
    color: column.color,
    funnel_id: column.funnel_id,
    created_at: column.created_at,
    updated_at: column.updated_at,
  };
}

