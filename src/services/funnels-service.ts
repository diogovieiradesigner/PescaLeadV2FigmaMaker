// ============================================
// FUNNELS SERVICE
// Gerencia funis de vendas
// ============================================

import { supabase } from '../utils/supabase/client';
import type { DbFunnel } from '../types/database';
import { dbFunnelToFrontend, dbFunnelsToFrontend, type Funnel } from '../utils/supabase/converters';
import * as customFieldsService from './custom-fields-service';

// ============================================
// TIPOS
// ============================================

export interface CreateFunnelData {
  workspaceId: string;
  name: string;
  description?: string;
  position?: number;
  columns?: { name: string; color?: string }[]; // ✅ Colunas customizadas opcionais
}

export interface UpdateFunnelData {
  name?: string;
  description?: string;
  isActive?: boolean;
  position?: number;
  columns?: Array<{
    id: string;
    title: string;
    position: number;
  }>;
}

// ============================================
// GET FUNNELS BY WORKSPACE
// ============================================

/**
 * Busca todos os funis de um workspace com colunas e leads
 */
export async function getFunnelsByWorkspace(workspaceId: string): Promise<{
  funnels: Funnel[];
  error: Error | null;
}> {
  try {
    console.log('[FUNNELS] Iniciando busca de funis para workspace:', workspaceId);
    
    // 1. Buscar funis
    const { data: funnels, error: funnelsError } = await supabase
      .from('funnels')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('position');

    if (funnelsError) {
      console.error('[FUNNELS] Erro ao buscar funis:', funnelsError);
      return { funnels: [], error: funnelsError };
    }

    if (!funnels || funnels.length === 0) {
      console.log('[FUNNELS] Nenhum funil encontrado para este workspace');
      return { funnels: [], error: null };
    }

    console.log('[FUNNELS] Encontrados', funnels.length, 'funil(is)');

    // 2. Buscar colunas dos funis
    const funnelIds = funnels.map(f => f.id);
    console.log('[FUNNELS] Buscando colunas para funis:', funnelIds);
    
    const { data: columns, error: columnsError } = await supabase
      .from('funnel_columns')
      .select('*')
      .in('funnel_id', funnelIds)
      .order('position');

    if (columnsError) {
      console.error('[FUNNELS] Erro ao buscar colunas:', columnsError);
      return { funnels: [], error: columnsError };
    }

    console.log('[FUNNELS] Encontradas', columns?.length || 0, 'coluna(s)');

    // 3. Buscar leads dos funis
    console.log('[FUNNELS] Buscando leads para funis:', funnelIds);
    
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('funnel_id', funnelIds)
      .eq('status', 'active')
      .order('position');

    if (leadsError) {
      console.error('[FUNNELS] Erro ao buscar leads:', leadsError);
      return { funnels: [], error: leadsError };
    }

    console.log('[FUNNELS] Encontrados', leads?.length || 0, 'lead(s)');

    // 4. Converter para formato do frontend
    console.log('[FUNNELS] Convertendo dados para formato do frontend...');
    const frontendFunnels = dbFunnelsToFrontend(
      funnels as DbFunnel[],
      columns as DbFunnelColumn[] || [],
      leads as DbLead[] || []
    );

    // 🚀 OTIMIZAÇÃO: Removido carregamento de custom fields na listagem inicial
    // Custom fields serão carregados individualmente quando o lead for aberto
    // Isso evita fazer centenas de queries ao banco de dados desnecessariamente

    console.log(`[FUNNELS] ✅ ${frontendFunnels.length} funil(is) carregado(s) com sucesso`);
    return { funnels: frontendFunnels, error: null };

  } catch (error) {
    console.error('[FUNNELS] ❌ Erro inesperado ao carregar funis:', error);
    return { funnels: [], error: error as Error };
  }
}

// ============================================
// GET FUNNEL BY ID
// ============================================

/**
 * Busca funil específico com colunas e leads paginados
 */
export async function getFunnelById(
  funnelId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<{
  funnel: Funnel | null;
  error: Error | null;
}> {
  try {
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    // 1. Buscar funil
    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .select('*')
      .eq('id', funnelId)
      .single();

    if (funnelError || !funnel) {
      console.error('[FUNNELS] Funil não encontrado:', funnelError);
      return { funnel: null, error: funnelError || new Error('Funil não encontrado') };
    }

    // 2. Buscar colunas
    const { data: columns, error: columnsError } = await supabase
      .from('funnel_columns')
      .select('*')
      .eq('funnel_id', funnelId)
      .order('position');

    if (columnsError) {
      console.error('[FUNNELS] Erro ao buscar colunas:', columnsError);
      return { funnel: null, error: columnsError };
    }

    // 3. Buscar leads paginados
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('funnel_id', funnelId)
      .eq('status', 'active')
      .order('position')
      .range(offset, offset + limit - 1);

    if (leadsError) {
      console.error('[FUNNELS] Erro ao buscar leads:', leadsError);
      return { funnel: null, error: leadsError };
    }

    console.log(`[FUNNELS] Carregados ${leads?.length || 0} leads (offset: ${offset}, limit: ${limit})`);

    // 4. Converter para formato do frontend
    const frontendFunnel = dbFunnelToFrontend(
      funnel as DbFunnel,
      columns as DbFunnelColumn[] || [],
      leads as DbLead[] || []
    );

    // 5. Carregar custom fields para os leads carregados
    if (leads && leads.length > 0) {
      console.log('[FUNNELS] Carregando custom fields para', leads.length, 'leads...');
      
      for (const column of frontendFunnel.columns) {
        for (const lead of column.leads) {
          const { customFields } = await customFieldsService.loadCustomFieldsForLead(
            lead.id,
            funnel.workspace_id
          );
          lead.customFields = customFields;
        }
      }
      
      console.log('[FUNNELS] Custom fields carregados');
    }

    return { funnel: frontendFunnel, error: null };

  } catch (error) {
    console.error('[FUNNELS] Erro inesperado:', error);
    return { funnel: null, error: error as Error };
  }
}

// ============================================
// GET LEADS BY COLUMN (Pagination)
// ============================================

/**
 * Busca leads de uma coluna específica com paginação
 */
export async function getLeadsByColumn(
  columnId: string,
  workspaceId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<{
  leads: any[];
  total: number;
  error: Error | null;
}> {
  try {
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    // 1. Contar total de leads na coluna
    const { count, error: countError } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('column_id', columnId)
      .eq('status', 'active');

    if (countError) {
      console.error('[FUNNELS] Erro ao contar leads:', countError);
      return { leads: [], total: 0, error: countError };
    }

    // 2. Buscar leads paginados
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('column_id', columnId)
      .eq('status', 'active')
      .order('position')
      .range(offset, offset + limit - 1);

    if (leadsError) {
      console.error('[FUNNELS] Erro ao buscar leads:', leadsError);
      return { leads: [], total: 0, error: leadsError };
    }

    console.log(`[FUNNELS] Carregados ${leads?.length || 0} leads da coluna (total: ${count || 0})`);

    // 🚀 OTIMIZAÇÃO: Carregar custom fields em batch (uma única query)
    let customFieldsMap = new Map<string, any[]>();
    
    if (leads && leads.length > 0) {
      const leadIds = leads.map(l => l.id);
      
      // Buscar todos os custom fields de uma vez
      const { data: allCustomFieldsData, error: customFieldsError } = await supabase
        .from('lead_custom_values')
        .select(`
          id,
          lead_id,
          custom_field_id,
          value,
          custom_fields (
            id,
            name,
            field_type
          )
        `)
        .in('lead_id', leadIds);

      // Organizar custom fields por lead_id
      if (!customFieldsError && allCustomFieldsData) {
        for (const cf of allCustomFieldsData) {
          if (!customFieldsMap.has(cf.lead_id)) {
            customFieldsMap.set(cf.lead_id, []);
          }
          customFieldsMap.get(cf.lead_id)!.push({
            id: cf.custom_field_id,
            fieldName: cf.custom_fields?.name || '',
            fieldType: cf.custom_fields?.field_type || 'text',
            fieldValue: cf.value || '',
          });
        }
      }
    }

    // 3. Converter leads para formato frontend
    const convertedLeads: any[] = (leads || []).map((lead: any) => ({
      id: lead.id,
      clientName: lead.client_name,
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      dealValue: Number(lead.deal_value) || 0,
      priority: lead.priority || 'medium',
      dueDate: lead.due_date || '',
      tags: lead.tags || [],
      notes: lead.notes || '',
      status: lead.status || 'active',
      columnId: lead.column_id,
      assignedTo: lead.assigned_to || null,
      assigneeName: lead.assignee_name || '',
      assigneeAvatar: lead.assignee_avatar || '',
      assignee: {
        name: lead.assignee_name || 'Sem responsável',
        avatar: lead.assignee_avatar || '',
      },
      avatar: lead.avatar_url || '',
      activities: {
        comments: lead.comments_count || 0,
        attachments: lead.attachments_count || 0,
        calls: lead.calls_count || 0,
        emails: lead.emails_count || 0,
      },
      isImportant: lead.is_important || false,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
      customFields: customFieldsMap.get(lead.id) || [],
    }));

    return { leads: convertedLeads, total: count || 0, error: null };

  } catch (error) {
    console.error('[FUNNELS] Erro inesperado:', error);
    return { leads: [], total: 0, error: error as Error };
  }
}

// ============================================
// CREATE FUNNEL
// ============================================

/**
 * Cria novo funil com colunas padrão
 */
export async function createFunnel(data: CreateFunnelData): Promise<{
  funnel: Funnel | null;
  error: Error | null;
}> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { funnel: null, error: authError || new Error('Não autenticado') };
    }

    // 1. Criar funil
    const { data: newFunnel, error: funnelError } = await supabase
      .from('funnels')
      .insert({
        workspace_id: data.workspaceId,
        name: data.name,
        description: data.description || null,
        position: data.position || 0,
        is_active: true,
        created_by: authUser.id,
      })
      .select()
      .single();

    if (funnelError || !newFunnel) {
      console.error('[FUNNELS] Erro ao criar funil:', funnelError);
      return { funnel: null, error: funnelError || new Error('Erro ao criar funil') };
    }

    // 2. Criar colunas padrão ou customizadas
    const columnsData = data.columns
      ? data.columns.map((col, index) => ({
          funnel_id: newFunnel.id,
          title: col.name,
          position: index,
          color: col.color || '#10B981', // Cor padrão se não for fornecida
        }))
      : [
          { title: 'Novo Lead', position: 0, color: '#10B981' },
          { title: 'Contactado', position: 1, color: '#3B82F6' },
          { title: 'Proposta', position: 2, color: '#F59E0B' },
          { title: 'Negociação', position: 3, color: '#8B5CF6' },
          { title: 'Ganho', position: 4, color: '#22C55E' },
        ];

    const { data: columns, error: columnsError } = await supabase
      .from('funnel_columns')
      .insert(
        columnsData.map(col => ({
          funnel_id: newFunnel.id,
          title: col.title,
          position: col.position,
          color: col.color,
        }))
      )
      .select();

    if (columnsError) {
      console.error('[FUNNELS] Erro ao criar colunas padrão:', columnsError);
      // Deletar funil criado
      await supabase.from('funnels').delete().eq('id', newFunnel.id);
      return { funnel: null, error: columnsError };
    }

    // 3. Converter para formato do frontend
    const frontendFunnel = dbFunnelToFrontend(
      newFunnel as DbFunnel,
      columns as DbFunnelColumn[] || [],
      []
    );

    console.log('[FUNNELS] Funil criado com sucesso:', frontendFunnel.name);
    return { funnel: frontendFunnel, error: null };

  } catch (error) {
    console.error('[FUNNELS] Erro inesperado:', error);
    return { funnel: null, error: error as Error };
  }
}

// ============================================
// UPDATE FUNNEL
// ============================================

/**
 * Atualiza dados do funil
 */
export async function updateFunnel(
  funnelId: string,
  data: UpdateFunnelData
): Promise<{ error: Error | null }> {
  try {
    console.log('[FUNNELS SERVICE] Atualizando funil:', funnelId, data);
    
    // Get workspace ID
    const { data: funnelData } = await supabase
      .from('funnels')
      .select('workspace_id')
      .eq('id', funnelId)
      .single();
    
    if (!funnelData) {
      return { error: new Error('Funil não encontrado') };
    }
    
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: new Error('Não autenticado') };
    }
    
    const workspaceId = funnelData.workspace_id;
    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
    
    // Use backend API to update funnel (handles column deletion)
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${workspaceId}/funnels/${funnelId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          columns: data.columns,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('[FUNNELS SERVICE] Erro do servidor:', error);
      return { error: new Error(error.error || 'Erro ao atualizar funil') };
    }
    
    console.log('[FUNNELS SERVICE] ✅ Funil atualizado com sucesso');
    return { error: null };

  } catch (error) {
    console.error('[FUNNELS SERVICE] ❌ Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// DELETE FUNNEL
// ============================================

/**
 * Deleta funil (apenas se não tiver leads)
 */
export async function deleteFunnel(funnelId: string): Promise<{ error: Error | null }> {
  try {
    // 1. Verificar se tem leads
    const { count, error: countError } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('funnel_id', funnelId);

    if (countError) {
      console.error('[FUNNELS] Erro ao verificar leads:', countError);
      return { error: countError };
    }

    if (count && count > 0) {
      return { error: new Error(`Este funil tem ${count} lead(s). Delete-os primeiro.`) };
    }

    // 2. Deletar funil (cascade deleta colunas)
    const { error: deleteError } = await supabase
      .from('funnels')
      .delete()
      .eq('id', funnelId);

    if (deleteError) {
      console.error('[FUNNELS] Erro ao deletar funil:', deleteError);
      return { error: deleteError };
    }

    console.log('[FUNNELS] Funil deletado com sucesso');
    return { error: null };

  } catch (error) {
    console.error('[FUNNELS] Erro inesperado:', error);
    return { error: error as Error };
  }
}

// ============================================
// ARCHIVE FUNNEL
// ============================================

/**
 * Arquiva funil (marca como inativo)
 */
export async function archiveFunnel(funnelId: string): Promise<{ error: Error | null }> {
  return updateFunnel(funnelId, { isActive: false });
}

// ============================================
// RESTORE FUNNEL
// ============================================

/**
 * Restaura funil arquivado
 */
export async function restoreFunnel(funnelId: string): Promise<{ error: Error | null }> {
  return updateFunnel(funnelId, { isActive: true });
}

// ============================================
// GET FUNNEL STATS (OPTIMIZED WITH STORED PROCEDURES)
// ============================================

/**
 * Busca estatísticas otimizadas do funil usando Stored Procedures
 * Performance: ~100ms (vs ~1000ms do método antigo)
 * Escalabilidade: Funciona com qualquer quantidade de leads (sem limite de 1000)
 */
export async function getFunnelStats(funnelId: string): Promise<{
  stats: {
    totalLeads: number;
    totalValue: number;
    highPriorityCount: number;
    activeLeads: number;
    conversionRate: number;
    columnBreakdown: Array<{
      columnId: string;
      columnTitle: string;
      leadCount: number;
      totalValue: number;
    }>;
  } | null;
  error: Error | null;
}> {
  try {
    console.log('[FUNNELS STATS] 🚀 Buscando stats otimizadas para funil:', funnelId);

    // 1️⃣ Buscar estatísticas globais usando Stored Procedure (1 query)
    const { data: globalStats, error: globalError } = await supabase
      .rpc('get_funnel_stats', { 
        p_funnel_id: funnelId 
      });

    if (globalError) {
      console.error('[FUNNELS STATS] ❌ Erro ao buscar stats globais:', globalError);
      return { stats: null, error: globalError };
    }

    console.log('[FUNNELS STATS] ✅ Stats globais recebidas:', globalStats);

    // 2️⃣ Buscar breakdown por coluna usando Stored Procedure (1 query)
    const { data: columnStats, error: columnError } = await supabase
      .rpc('get_funnel_column_stats', { 
        p_funnel_id: funnelId 
      });

    if (columnError) {
      console.error('[FUNNELS STATS] ❌ Erro ao buscar column stats:', columnError);
      return { stats: null, error: columnError };
    }

    console.log('[FUNNELS STATS] ✅ Stats por coluna recebidas:', columnStats);

    // RPC com RETURNS TABLE retorna um array com 1 elemento
    const global = Array.isArray(globalStats) && globalStats.length > 0 
      ? globalStats[0] 
      : globalStats;

    const result = {
      totalLeads: Number(global?.total_leads || 0),
      totalValue: Number(global?.total_value || 0),
      highPriorityCount: Number(global?.high_priority_count || 0),
      activeLeads: Number(global?.active_leads || 0),
      conversionRate: Number(global?.conversion_rate || 0),
      columnBreakdown: (columnStats || []).map((col: any) => ({
        columnId: col.column_id,
        columnTitle: col.column_title,
        leadCount: Number(col.lead_count || 0),
        totalValue: Number(col.total_value || 0),
      })),
    };

    console.log('[FUNNELS STATS] 📊 Stats finais calculadas:', result);

    return {
      stats: result,
      error: null,
    };
  } catch (error: any) {
    console.error('[FUNNELS STATS] ❌ Erro inesperado:', error);
    return { stats: null, error };
  }
}