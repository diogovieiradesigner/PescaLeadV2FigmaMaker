// =============================================================================
// STATS SERVICE
// =============================================================================
// Cálculo de estatísticas do funil
// =============================================================================

import { getSupabase } from '../database/client.ts';
import type { FunnelStats } from '../types.ts';

/**
 * Calcula estatísticas do funil
 * OTIMIZADO: Queries agregadas para performance
 */
export async function getFunnelStats(
  workspaceId: string,
  funnelId: string
): Promise<FunnelStats> {
  const supabase = getSupabase();
  
  // Buscar colunas do funil
  const { data: columns } = await supabase
    .from('funnel_columns')
    .select('id, title')
    .eq('funnel_id', funnelId)
    .order('position', { ascending: true });
  
  // Query agregada para estatísticas gerais
  const { data: stats, error } = await supabase
    .from('leads')
    .select('deal_value, priority, column_id')
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('status', 'active');
  
  if (error) {
    console.error('Error fetching stats:', error);
    throw new Error(`Failed to fetch stats: ${error.error_description || error.message}`);
  }
  
  // Calcular estatísticas
  const totalLeads = stats?.length || 0;
  const totalValue = stats?.reduce((sum, lead) => sum + parseFloat(lead.deal_value || 0), 0) || 0;
  const highPriorityCount = stats?.filter(lead => lead.priority === 'high').length || 0;
  
  // Estatísticas por coluna
  const leadsByColumn = (columns || []).map(col => {
    const columnLeads = stats?.filter(lead => lead.column_id === col.id) || [];
    const columnValue = columnLeads.reduce((sum, lead) => sum + parseFloat(lead.deal_value || 0), 0);
    
    return {
      columnId: col.id,
      columnTitle: col.title,
      count: columnLeads.length,
      value: columnValue,
    };
  });
  
  // Calcular taxa de conversão (leads na última coluna / total)
  const lastColumn = columns?.[columns.length - 1];
  const convertedLeads = lastColumn 
    ? stats?.filter(lead => lead.column_id === lastColumn.id).length || 0
    : 0;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  
  return {
    totalLeads,
    totalValue,
    highPriorityCount,
    activeLeads: totalLeads,
    conversionRate: Math.round(conversionRate * 100) / 100,
    leadsByColumn,
  };
}

/**
 * Recalcula estatísticas do funil manualmente
 */
export async function recalculateStats(
  workspaceId: string,
  funnelId: string
): Promise<FunnelStats> {
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
  
  // Calcular estatísticas
  const totalLeads = leads?.length || 0;
  const totalValue = leads?.reduce((sum, lead) => sum + parseFloat(lead.deal_value || 0), 0) || 0;
  const highPriorityCount = leads?.filter(lead => lead.priority === 'high').length || 0;
  
  // Buscar colunas
  const { data: columns } = await supabase
    .from('funnel_columns')
    .select('id, title')
    .eq('funnel_id', funnelId)
    .order('position', { ascending: true });
  
  // Estatísticas por coluna
  const leadsByColumn = (columns || []).map(col => {
    const columnLeads = leads?.filter(lead => lead.column_id === col.id) || [];
    const columnValue = columnLeads.reduce((sum, lead) => sum + parseFloat(lead.deal_value || 0), 0);
    
    return {
      columnId: col.id,
      columnTitle: col.title,
      count: columnLeads.length,
      value: columnValue,
    };
  });
  
  // Calcular taxa de conversão
  const lastColumn = columns?.[columns.length - 1];
  const convertedLeads = lastColumn 
    ? leads?.filter(lead => lead.column_id === lastColumn.id).length || 0
    : 0;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  
  // Preparar column_stats para salvar
  const columnStats: Record<string, { count: number; total_value: number }> = {};
  (columns || []).forEach(col => {
    const columnLeads = leads?.filter(lead => lead.column_id === col.id) || [];
    columnStats[col.id] = {
      count: columnLeads.length,
      total_value: columnLeads.reduce((sum, lead) => sum + parseFloat(lead.deal_value || 0), 0),
    };
  });
  
  // Update stats in database
  const { error: updateError } = await supabase
    .from('funnel_stats')
    .update({
      total_leads: totalLeads,
      total_value: totalValue,
      high_priority_count: highPriorityCount,
      column_stats: columnStats,
    })
    .eq('funnel_id', funnelId)
    .eq('workspace_id', workspaceId);
  
  if (updateError) {
    console.error('Error updating stats:', updateError);
    throw new Error(`Failed to update stats: ${updateError.message}`);
  }
  
  return {
    totalLeads,
    totalValue,
    highPriorityCount,
    activeLeads: totalLeads,
    conversionRate: Math.round(conversionRate * 100) / 100,
    leadsByColumn,
  };
}

