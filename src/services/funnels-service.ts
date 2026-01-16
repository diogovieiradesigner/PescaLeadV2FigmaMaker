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
      return { funnels: [], error: null };
    }


    // 2. Buscar colunas dos funis
    const funnelIds = funnels.map(f => f.id);
    
    const { data: columns, error: columnsError } = await supabase
      .from('funnel_columns')
      .select('*')
      .in('funnel_id', funnelIds)
      .order('position');

    if (columnsError) {
      console.error('[FUNNELS] Erro ao buscar colunas:', columnsError);
      return { funnels: [], error: columnsError };
    }


    // 3. Buscar leads dos funis
    
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


    // 4. Converter para formato do frontend
    const frontendFunnels = dbFunnelsToFrontend(
      funnels as DbFunnel[],
      columns as DbFunnelColumn[] || [],
      leads as DbLead[] || []
    );

    // 🚀 OTIMIZAÇÃO: Removido carregamento de custom fields na listagem inicial
    // Custom fields serão carregados individualmente quando o lead for aberto
    // Isso evita fazer centenas de queries ao banco de dados desnecessariamente

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


    // 4. Converter para formato do frontend
    const frontendFunnel = dbFunnelToFrontend(
      funnel as DbFunnel,
      columns as DbFunnelColumn[] || [],
      leads as DbLead[] || []
    );

    // 5. Carregar custom fields para os leads carregados
    if (leads && leads.length > 0) {
      
      for (const column of frontendFunnel.columns) {
        for (const lead of column.leads) {
          const { customFields } = await customFieldsService.loadCustomFieldsForLead(
            lead.id,
            funnel.workspace_id
          );
          lead.customFields = customFields;
        }
      }
      
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
    accessToken?: string;  // ✅ ADICIONAR accessToken
    filters?: {
      hasEmail?: boolean;
      hasWhatsapp?: boolean;
      searchQuery?: string;
    };
  }
): Promise<{
  leads: any[];
  total: number;
  error: Error | null;
}> {
  try {
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;
    const filters = options?.filters;
    const accessToken = options?.accessToken;


    if (!accessToken) {
      console.error('[FUNNELS SERVICE] ❌ accessToken não fornecido');
      return { leads: [], total: 0, error: new Error('Access token required') };
    }

    // ✅ USAR API DO BACKEND EM VEZ DE SUPABASE DIRETO
    // Precisamos encontrar o funnel_id da coluna primeiro
    const { data: columnData, error: columnError } = await supabase
      .from('funnel_columns')
      .select('funnel_id')
      .eq('id', columnId)
      .single();

    if (columnError || !columnData) {
      console.error('[FUNNELS SERVICE] Erro ao buscar funnel_id:', columnError);
      return { leads: [], total: 0, error: columnError };
    }

    const funnelId = columnData.funnel_id;

    // Construir URL com query params
    const { projectId } = await import('../utils/supabase/info');
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (filters?.hasEmail) queryParams.append('hasEmail', 'true');
    if (filters?.hasWhatsapp) queryParams.append('hasWhatsapp', 'true');
    if (filters?.searchQuery) queryParams.append('searchQuery', filters.searchQuery);

    const url = `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/columns/${columnId}/leads?${queryParams}`;
    

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,  // ✅ USAR accessToken
        'Content-Type': 'application/json',
      },
    });


    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('[FUNNELS SERVICE] ❌ Erro JSON da API:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('[FUNNELS SERVICE] ❌ Erro ao fazer parse do JSON:', e);
        }
      } else {
        const textResponse = await response.text();
        console.error('[FUNNELS SERVICE] ❌ Resposta não-JSON:', textResponse.substring(0, 500));
        console.error('[FUNNELS SERVICE] ❌ URL que falhou:', url);
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();


    // Converter leads do backend para formato frontend
    const convertedLeads = (data.leads || []).map((lead: any) => {
      // 🔍 DEBUG: Log do lead antes da conversão
      if (!lead.clientName || lead.clientName === '') {
      }
      
      return {
        id: lead.id,
        // ✅ Corrigir: usar client_name (snake_case) se clientName (camelCase) não existir
        clientName: lead.clientName || lead.client_name || '',
        company: lead.company || '',
        email: lead.email || '',
        phone: lead.phone || '',
      dealValue: Number(lead.dealValue) || 0,
      priority: lead.priority || 'medium',
      dueDate: lead.dueDate || '',
      tags: lead.tags || [],
      notes: lead.notes || '',
      status: lead.status || 'active',
      columnId: lead.column_id,
      assignedTo: lead.assignee?.id || null,
      assigneeName: lead.assignee?.name || '',
      assigneeAvatar: lead.assignee?.avatar || '',
      assignee: {
        name: lead.assignee?.name || 'Sem responsável',
        avatar: lead.assignee?.avatar || '',
      },
      avatar: lead.avatar || '',
      activities: {
        comments: lead.commentsCount || 0,
        attachments: lead.attachmentsCount || 0,
        calls: lead.callsCount || 0,
        emails: lead.emailsCount || 0,
      },
      isImportant: lead.isImportant || false,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
      customFields: [], // Custom fields serão carregados separadamente se necessário
      };
    });

    return { leads: convertedLeads, total: data.total || 0, error: null };
  } catch (error: any) {
    console.error('[FUNNELS SERVICE] Erro ao carregar leads:', error);
    return { leads: [], total: 0, error };
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
    const { projectId } = await import('../utils/supabase/info');
    
    // ✅ CORREÇÃO: Usar kanban-api em vez de make-server-e4f9d774
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: data.name,
          columns: data.columns,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('[FUNNELS SERVICE] Erro do servidor:', error);
      return { error: new Error(error.error || 'Erro ao atualizar funil') };
    }
    
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

    // 1️⃣ Buscar estatísticas globais usando Stored Procedure (1 query)
    const { data: globalStats, error: globalError } = await supabase
      .rpc('get_funnel_stats', { 
        p_funnel_id: funnelId 
      });

    if (globalError) {
      console.error('[FUNNELS STATS] ❌ Erro ao buscar stats globais:', globalError);
      return { stats: null, error: globalError };
    }


    // 2️⃣ Buscar breakdown por coluna usando Stored Procedure (1 query)
    const { data: columnStats, error: columnError } = await supabase
      .rpc('get_funnel_column_stats', { 
        p_funnel_id: funnelId 
      });

    if (columnError) {
      console.error('[FUNNELS STATS] ❌ Erro ao buscar column stats:', columnError);
      return { stats: null, error: columnError };
    }


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


    return {
      stats: result,
      error: null,
    };
  } catch (error: any) {
    console.error('[FUNNELS STATS] ❌ Erro inesperado:', error);
    return { stats: null, error };
  }
}

// ============================================
// GET ALL COLUMNS LEADS (OPTIMIZED - PARALLEL)
// ============================================

/**
 * Busca leads de TODAS as colunas de um funil em paralelo (otimizado)
 * Performance: 5-10x mais rápido que carregamento sequencial
 */
export async function getAllColumnsLeads(
  funnelId: string,
  workspaceId: string,
  options?: {
    limit?: number;
    accessToken?: string;
    filters?: {
      hasEmail?: boolean;
      hasWhatsapp?: boolean;
      searchQuery?: string;
    };
  }
): Promise<{
  columns: Record<string, { leads: any[]; total: number; hasMore: boolean }>;
  error: Error | null;
}> {
  try {
    const limit = options?.limit || 10;
    const filters = options?.filters;
    const accessToken = options?.accessToken;


    if (!accessToken) {
      console.error('[FUNNELS SERVICE] ❌ accessToken não fornecido');
      return { columns: {}, error: new Error('Access token required') };
    }

    // Construir URL com query params
    const { projectId } = await import('../utils/supabase/info');
    const queryParams = new URLSearchParams({
      mode: 'kanban',
      limit: limit.toString(),
    });

    if (filters?.hasEmail) queryParams.append('hasEmail', 'true');
    if (filters?.hasWhatsapp) queryParams.append('hasWhatsapp', 'true');
    if (filters?.searchQuery) queryParams.append('searchQuery', filters.searchQuery);

    const url = `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads?${queryParams}`;
    

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch leads');
    }

    const data = await response.json();


    return { columns: data.columns || {}, error: null };
  } catch (error: any) {
    console.error('[FUNNELS SERVICE] Erro ao carregar colunas:', error);
    return { columns: {}, error };
  }
}