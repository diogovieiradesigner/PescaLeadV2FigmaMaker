import { useState, useEffect, useCallback, useMemo } from 'react';
import { Funnel, CRMLead, KanbanColumn } from '../types/crm';
import * as funnelsService from '../services/funnels-service';
import * as leadsService from '../services/leads-service';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';

interface ColumnLeadsState {
  [columnId: string]: {
    leads: CRMLead[];
    offset: number;
    total: number;
    hasMore: boolean;
    loading: boolean;
  };
}

export interface LeadFilters {
  hasEmail?: boolean;
  hasWhatsapp?: boolean;
  searchQuery?: string;
}

export function useKanbanData(
  workspaceId: string | null, 
  currentFunnelId: string | null,
  filters?: LeadFilters  // ✅ NOVO: Receber filtros como parâmetro
) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [currentFunnel, setCurrentFunnel] = useState<Funnel | null>(null);
  const [columnLeadsState, setColumnLeadsState] = useState<ColumnLeadsState>({});
  const [loading, setLoading] = useState(true);
  const [funnelsLoading, setFunnelsLoading] = useState(true); // Loading separado para lista de funis
  const [stats, setStats] = useState<any>(null);

  // 🔥 OTIMIZAÇÃO: Indexação O(1) de leads por ID usando Map
  const leadsMap = useMemo(() => {
    const map = new Map<string, CRMLead>();
    Object.values(columnLeadsState).forEach(column => {
      column.leads.forEach(lead => {
        map.set(lead.id, lead);
      });
    });
    return map;
  }, [columnLeadsState]);

  // 🔥 OTIMIZAÇÃO: Índice reverso leadId -> columnId
  const leadToColumnMap = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(columnLeadsState).forEach(([columnId, column]) => {
      column.leads.forEach(lead => {
        map.set(lead.id, columnId);
      });
    });
    return map;
  }, [columnLeadsState]);

  // ============================================
  // LOAD FUNNELS
  // ============================================
  const loadFunnels = useCallback(async () => {
    if (!workspaceId) {
      console.log('[KANBAN] loadFunnels: No workspace, skipping');
      setFunnelsLoading(false);
      setLoading(false);
      return;
    }

    try {
      setFunnelsLoading(true);
      console.log('[KANBAN] Carregando funis do workspace:', workspaceId);
      const { funnels: loadedFunnels, error } = await funnelsService.getFunnelsByWorkspace(workspaceId);
      
      if (error) {
        console.error('[KANBAN] Erro ao carregar funis:', error);
        throw error;
      }

      console.log('[KANBAN] Funis carregados:', loadedFunnels?.length || 0);
      setFunnels(loadedFunnels || []);
    } catch (error: any) {
      console.error('[KANBAN] Failed to load funnels:', error);
      toast.error('Erro ao carregar funis', { description: error.message });
      setFunnels([]); // Garante que não fica travado
    } finally {
      setFunnelsLoading(false);
    }
  }, [workspaceId]); // Removido currentFunnelId desta dependência

  // ============================================
  // LOAD FUNNEL
  // ============================================
  const loadFunnel = useCallback(async (funnelId: string) => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[KANBAN] 🔍 Carregando funnel com filtros:', funnelId, filters);
      
      // Load funnel with columns (sem leads ainda)
      const { funnel, error } = await funnelsService.getFunnelById(funnelId, { limit: 0, offset: 0 });
      
      if (error || !funnel) {
        console.error('[KANBAN] Erro ao carregar funil:', error);
        throw error || new Error('Funil não encontrado');
      }

      console.log('[KANBAN] Funnel carregado:', funnel.name, 'com', funnel.columns.length, 'colunas');
      setCurrentFunnel(funnel);

      // ✅ OTIMIZAÇÃO: Carregar leads de TODAS as colunas em paralelo (1 requisição)
      console.log('[KANBAN] 🚀 Carregando leads de todas as colunas em paralelo...');
      
      // Obter accessToken do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        throw new Error('Access token não disponível');
      }
      
      // Construir URL com query params
      const { projectId } = await import('../utils/supabase/info');
      const queryParams = new URLSearchParams({
        mode: 'kanban',
        limit: '10',
      });
      
      if (filters?.hasEmail) queryParams.append('hasEmail', 'true');
      if (filters?.hasWhatsapp) queryParams.append('hasWhatsapp', 'true');
      if (filters?.searchQuery) queryParams.append('searchQuery', filters.searchQuery);
      
      const url = `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads?${queryParams}`;
      
      console.log('[KANBAN] 📡 Chamando API otimizada:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[KANBAN] 📊 Response status:', response.status, response.statusText);
      console.log('[KANBAN] 📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        // Verificar se a resposta é JSON antes de fazer parse
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = null;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            console.error('[KANBAN] ❌ Erro JSON da API:', errorData);
            errorMessage = errorData.error || errorMessage;
            errorDetails = errorData;
          } catch (e) {
            console.error('[KANBAN] Erro ao fazer parse do JSON de erro:', e);
          }
        } else {
          // Resposta não é JSON (provavelmente HTML de erro 404)
          const textResponse = await response.text();
          console.error('[KANBAN] ❌ Resposta não-JSON completa:', textResponse);
          console.error('[KANBAN] ❌ URL que falhou:', url);
          console.error('[KANBAN] ❌ Status HTTP:', response.status);
          errorMessage = `API retornou ${response.status}. Verifique se a rota existe na edge function kanban-api`;
        }
        
        throw new Error(errorMessage);
      }
      
      const { columns: leadsByColumn } = await response.json();
      
      console.log('[KANBAN] ✅ Leads carregados para', Object.keys(leadsByColumn || {}).length, 'colunas');
      
      // Mapear para o formato do estado
      const newColumnState: ColumnLeadsState = {};
      
      funnel.columns.forEach(column => {
        const columnData = leadsByColumn[column.id] || { leads: [], total: 0, hasMore: false };
        
        // Converter leads do backend para formato frontend
        const convertedLeads = (columnData.leads || []).map((lead: any) => {
          // 🔍 DEBUG: Log do lead antes da conversão
          if (!lead.clientName || lead.clientName === '') {
            console.warn('[KANBAN DATA] ⚠️ Lead sem clientName:', {
              id: lead.id,
              clientName: lead.clientName,
              client_name: lead.client_name, // Verificar se vem com underscore
              lead: lead
            });
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
          customFields: [],
          };
        });
        
        newColumnState[column.id] = {
          leads: convertedLeads,
          offset: convertedLeads.length,
          total: columnData.total || 0,
          hasMore: columnData.hasMore || false,
          loading: false,
        };
      });

      setColumnLeadsState(newColumnState);

      // 🚀 OTIMIZAÇÃO: Buscar estatísticas usando Stored Procedures
      // Performance: ~100ms (vs ~1000ms do método antigo com 10 queries)
      // Escalabilidade: Funciona com qualquer quantidade de leads (sem limite de 1000)
      console.log('[KANBAN DATA] 🚀 Buscando stats otimizadas via Stored Procedures...');
      
      const { stats: optimizedStats, error: statsError } = await funnelsService.getFunnelStats(funnel.id);

      if (statsError) {
        console.error('[KANBAN DATA] ❌ Erro ao buscar stats otimizadas:', statsError);
        // Fallback: usar stats zerados se houver erro
        setStats({ 
          totalLeads: 0, 
          totalValue: 0, 
          highPriorityCount: 0 
        });
      } else {
        console.log('[KANBAN DATA] ✅ Stats otimizadas carregadas:', optimizedStats);
        setStats({
          totalLeads: optimizedStats?.totalLeads || 0,
          totalValue: optimizedStats?.totalValue || 0,
          highPriorityCount: optimizedStats?.highPriorityCount || 0,
          activeLeads: optimizedStats?.activeLeads || 0,
          conversionRate: optimizedStats?.conversionRate || 0,
        });
      }

    } catch (error: any) {
      console.error('[KANBAN] Failed to load funnel:', error);
      toast.error('Erro ao carregar funil', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filters]);  // ✅ ADICIONAR filters nas dependências

  // ============================================
  // LOAD MORE LEADS (Pagination)
  // ============================================
  const loadMoreLeads = useCallback(async (columnId: string) => {
    if (!workspaceId) {
      console.log('[KANBAN] loadMoreLeads: No workspace');
      return;
    }

    // ✅ Usar função de callback para acessar estado atual (evita dependência)
    setColumnLeadsState(prev => {
      const columnState = prev[columnId];
      if (!columnState || !columnState.hasMore || columnState.loading) {
        console.log('[KANBAN] loadMoreLeads: Nada para carregar', { 
          hasState: !!columnState, 
          hasMore: columnState?.hasMore,
          loading: columnState?.loading 
        });
        return prev; // Não muda nada
      }

      // Marcar como loading e iniciar carregamento
      const offset = columnState.offset;
      
      // Executar carregamento de forma assíncrona
      (async () => {
        try {
          console.log('[KANBAN] Carregando mais leads para coluna:', columnId, 'offset:', offset, 'com filtros:', filters);

          // ✅ Obter accessToken do Supabase
          const { data: { session } } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          const { leads: newLeads, total, error } = await funnelsService.getLeadsByColumn(
            columnId,
            workspaceId,
            { 
              limit: 10, 
              offset,
              accessToken,  // ✅ PASSAR accessToken
              filters: filters  // ✅ PASSAR FILTROS PARA O BACKEND
            }
          );

          if (error) {
            throw error;
          }

          console.log('[KANBAN] Carregados mais', newLeads.length, 'leads');

          // Atualizar estado e filtrar duplicatas
          setColumnLeadsState(prev => {
            // ✅ Filtrar duplicatas antes de adicionar (silenciosamente - duplicatas são esperadas após movimentações)
            const existingIds = new Set(prev[columnId].leads.map(l => l.id));
            const uniqueNewLeads = newLeads.filter(lead => !existingIds.has(lead.id));

            const newOffset = prev[columnId].offset + newLeads.length;

            return {
              ...prev,
              [columnId]: {
                ...prev[columnId],
                leads: [...prev[columnId].leads, ...uniqueNewLeads],
                offset: newOffset,
                total,
                hasMore: newOffset < total,
                loading: false,
              },
            };
          });

        } catch (error: any) {
          console.error('[KANBAN] Failed to load more leads:', error);
          toast.error('Erro ao carregar mais leads', { description: error.message });
          
          // Resetar loading
          setColumnLeadsState(prev => ({
            ...prev,
            [columnId]: {
              ...prev[columnId],
              loading: false,
            },
          }));
        }
      })();

      // Retornar estado com loading=true imediatamente
      return {
        ...prev,
        [columnId]: {
          ...prev[columnId],
          loading: true,
        },
      };
    });
  }, [workspaceId, filters]); // ✅ ADICIONAR filters nas dependências

  // ============================================
  // CREATE LEAD
  // ============================================
  const createLead = useCallback(async (leadData: any) => {
    if (!workspaceId || !currentFunnelId) {
      throw new Error('Workspace ou funnel não selecionado');
    }

    try {
      const { lead: newLead, error } = await leadsService.createLead({
        workspaceId,
        funnelId: currentFunnelId,
        columnId: leadData.columnId,
        clientName: leadData.clientName,
        company: leadData.company,
        email: leadData.email,
        phone: leadData.phone,
        dealValue: leadData.dealValue,
        priority: leadData.priority,
        dueDate: leadData.dueDate,
        tags: leadData.tags,
        notes: leadData.notes,
        assignedTo: leadData.assignedTo,
        assigneeName: leadData.assigneeName,
        assigneeAvatar: leadData.assigneeAvatar,
        customFields: leadData.customFields,
      });

      if (error || !newLead) {
        throw error || new Error('Erro ao criar lead');
      }

      // Add to local state
      setColumnLeadsState(prev => {
        const columnId = leadData.columnId;
        if (!prev[columnId]) return prev;

        return {
          ...prev,
          [columnId]: {
            ...prev[columnId],
            leads: [newLead, ...prev[columnId].leads],
            total: prev[columnId].total + 1,
            offset: prev[columnId].offset + 1,
          },
        };
      });

      // Update stats
      setStats((prev: any) => ({
        ...prev,
        totalLeads: (prev?.totalLeads || 0) + 1,
        totalValue: (prev?.totalValue || 0) + (newLead.dealValue || 0),
        highPriorityCount: (prev?.highPriorityCount || 0) + (newLead.priority === 'high' ? 1 : 0),
      }));

      toast.success('Lead criado com sucesso');
      return newLead;
    } catch (error: any) {
      console.error('Failed to create lead:', error);
      toast.error('Erro ao criar lead', { description: error.message });
      throw error;
    }
  }, [workspaceId, currentFunnelId]);

  // ============================================
  // UPDATE LEAD
  // ============================================
  const updateLead = useCallback(async (leadId: string, updates: any) => {
    if (!workspaceId) {
      throw new Error('Workspace não selecionado');
    }

    try {
      const { error } = await leadsService.updateLead(leadId, {
        clientName: updates.clientName,
        company: updates.company,
        email: updates.email,
        phone: updates.phone,
        dealValue: updates.dealValue,
        priority: updates.priority,
        dueDate: updates.dueDate,
        tags: updates.tags,
        notes: updates.notes,
        assignedTo: updates.assignedTo,
        assigneeName: updates.assigneeName,
        assigneeAvatar: updates.assigneeAvatar,
        isImportant: updates.isImportant,
        columnId: updates.columnId, // ✅ Adicionar columnId para mover o lead
        customFields: updates.customFields,
      }, workspaceId);

      if (error) {
        throw error;
      }

      // Buscar lead atualizado
      const { lead: updatedLead, error: fetchError } = await leadsService.getLeadById(leadId);
      
      if (fetchError || !updatedLead) {
        throw fetchError || new Error('Erro ao buscar lead atualizado');
      }

      // 🔥 Update in local state - detectar mudança de coluna
      setColumnLeadsState(prev => {
        const newState = { ...prev };
        let oldColumnId: string | null = null;
        const newColumnId = updates.columnId;
        
        // 1. Encontrar e remover da coluna antiga
        for (const columnId in newState) {
          const leadIndex = newState[columnId].leads.findIndex(l => l.id === leadId);
          if (leadIndex !== -1) {
            oldColumnId = columnId;
            
            // Se mudou de coluna, remover da antiga
            if (newColumnId && oldColumnId !== newColumnId) {
              console.log('[KANBAN] 🔄 Movendo lead de', oldColumnId, 'para', newColumnId);
              const newLeads = [...newState[columnId].leads];
              newLeads.splice(leadIndex, 1);
              newState[columnId] = {
                ...newState[columnId],
                leads: newLeads,
                total: newState[columnId].total - 1,
              };
            } else {
              // Mesma coluna, apenas atualizar
              const newLeads = [...newState[columnId].leads];
              newLeads[leadIndex] = updatedLead;
              newState[columnId] = {
                ...newState[columnId],
                leads: newLeads,
              };
            }
            break;
          }
        }
        
        // 2. Se mudou de coluna, adicionar na nova
        if (newColumnId && oldColumnId && oldColumnId !== newColumnId && newState[newColumnId]) {
          const newLeads = [updatedLead, ...newState[newColumnId].leads];
          newState[newColumnId] = {
            ...newState[newColumnId],
            leads: newLeads,
            total: newState[newColumnId].total + 1,
          };
        }
        
        return newState;
      });

      // 🚀 OTIMIZAÇÃO: Não recalcular stats manualmente
      // Stats serão atualizadas quando o usuário recarregar ou via realtime

      toast.success('Lead atualizado com sucesso');
      return updatedLead;
    } catch (error: any) {
      console.error('Failed to update lead:', error);
      toast.error('Erro ao atualizar lead', { description: error.message });
      throw error;
    }
  }, [workspaceId]);

  // ============================================
  // RELOAD STATS (Para usar após mudanças)
  // ============================================
  const reloadStats = useCallback(async () => {
    if (!currentFunnel?.id) {
      console.log('[KANBAN DATA] reloadStats: No current funnel');
      return;
    }

    console.log('[KANBAN DATA] 🔄 Recarregando stats...');
    
    const { stats: optimizedStats, error: statsError } = await funnelsService.getFunnelStats(currentFunnel.id);

    if (statsError) {
      console.error('[KANBAN DATA] ❌ Erro ao recarregar stats:', statsError);
    } else {
      console.log('[KANBAN DATA] ✅ Stats recarregadas:', optimizedStats);
      setStats({
        totalLeads: optimizedStats?.totalLeads || 0,
        totalValue: optimizedStats?.totalValue || 0,
        highPriorityCount: optimizedStats?.highPriorityCount || 0,
        activeLeads: optimizedStats?.activeLeads || 0,
        conversionRate: optimizedStats?.conversionRate || 0,
      });
    }
  }, [currentFunnel?.id]);

  // ============================================
  // MOVE LEAD (Drag & Drop)
  // ============================================
  const moveLead = useCallback(async (leadId: string, toColumnId: string, toPosition: number) => {
    if (!workspaceId) {
      throw new Error('Workspace não selecionado');
    }

    // Optimistic update
    let fromColumnId: string | null = null;
    let fromColumnName: string | null = null;
    let toColumnName: string | null = null;
    let movedLead: CRMLead | null = null;
    let previousState: ColumnLeadsState | null = null;

    setColumnLeadsState(prev => {
      // ✅ Guardar estado anterior para rollback
      previousState = prev;
      
      const newState = { ...prev };
      
      // ✅ DEDUPLICAÇÃO: Primeiro remover o lead de TODAS as colunas (caso esteja duplicado)
      for (const columnId in newState) {
        newState[columnId] = {
          ...newState[columnId],
          leads: newState[columnId].leads.filter(l => l.id !== leadId),
        };
      }
      
      // Find lead data from original state
      for (const columnId in prev) {
        const leadIndex = prev[columnId].leads.findIndex(l => l.id === leadId);
        if (leadIndex !== -1) {
          fromColumnId = columnId;
          movedLead = { ...prev[columnId].leads[leadIndex] };
          
          // ✅ Atualizar total e offset da coluna de origem
          newState[columnId] = {
            ...newState[columnId],
            total: Math.max(0, prev[columnId].total - 1),
            // ✅ Decrementar offset se o lead estava nos primeiros carregados
            offset: leadIndex < prev[columnId].offset ? Math.max(0, prev[columnId].offset - 1) : prev[columnId].offset,
          };
          break;
        }
      }

      // Add to target column at position
      if (movedLead && newState[toColumnId]) {
        const newLeads = [...newState[toColumnId].leads];
        newLeads.splice(toPosition, 0, movedLead);
        
        newState[toColumnId] = {
          ...newState[toColumnId],
          leads: newLeads,
          total: newState[toColumnId].total + 1,
          // ✅ Incrementar offset pois adicionamos um lead na visualização
          offset: Math.min(newState[toColumnId].total + 1, newState[toColumnId].offset + 1),
        };
      }

      return newState;
    });

    // Buscar nomes das colunas
    if (currentFunnel) {
      if (fromColumnId) {
        const fromColumn = currentFunnel.columns.find(col => col.id === fromColumnId);
        fromColumnName = fromColumn?.title || null;
      }
      const toColumn = currentFunnel.columns.find(col => col.id === toColumnId);
      toColumnName = toColumn?.title || null;
    }

    try {
      // ✅ Enviar para backend em paralelo (não bloqueia UI)
      const { error } = await leadsService.moveLead({
        leadId,
        newColumnId: toColumnId,
        newPosition: toPosition,
        fromColumnName: fromColumnName || undefined,
        toColumnName: toColumnName || undefined,
      });

      if (error) {
        throw error;
      }

      // ✅ NÃO buscar lead novamente - evita flickering
      // ✅ NÃO recarregar stats - evita re-renders desnecessários

      return movedLead;
    } catch (error: any) {
      console.error('❌ [KANBAN] Failed to move lead:', error);
      toast.error('Erro ao mover lead', { description: error.message });
      
      // Rollback optimistic update
      if (previousState) {
        setColumnLeadsState(previousState);
      }
      
      throw error;
    }
  }, [workspaceId, currentFunnel]); // ✅ Removido reloadStats das dependências

  // ============================================
  // DELETE LEAD
  // ============================================
  const deleteLead = useCallback(async (leadId: string) => {
    if (!workspaceId) {
      throw new Error('Workspace não selecionado');
    }

    try {
      const { error } = await leadsService.deleteLead(leadId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setColumnLeadsState(prev => {
        const newState = { ...prev };
        
        for (const columnId in newState) {
          const leadIndex = newState[columnId].leads.findIndex(l => l.id === leadId);
          if (leadIndex !== -1) {
            const newLeads = [...newState[columnId].leads];
            const deletedLead = newLeads[leadIndex];
            newLeads.splice(leadIndex, 1);
            
            newState[columnId] = {
              ...newState[columnId],
              leads: newLeads,
              total: newState[columnId].total - 1,
            };

            // Update stats
            setStats((prev: any) => ({
              ...prev,
              totalLeads: (prev?.totalLeads || 1) - 1,
              totalValue: (prev?.totalValue || deletedLead.dealValue || 0) - (deletedLead.dealValue || 0),
              highPriorityCount: (prev?.highPriorityCount || 0) - (deletedLead.priority === 'high' ? 1 : 0),
            }));

            break;
          }
        }
        
        return newState;
      });

      toast.success('Lead deletado com sucesso');
    } catch (error: any) {
      console.error('Failed to delete lead:', error);
      toast.error('Erro ao deletar lead', { description: error.message });
      throw error;
    }
  }, [workspaceId]);

  // ============================================
  // CREATE FUNNEL
  // ============================================
  const createFunnel = useCallback(async (
    name: string, 
    description?: string,
    columns?: { name: string; color?: string }[]
  ) => {
    console.log('[KANBAN] createFunnel called:', {
      name,
      description,
      columns: columns?.length || 0,
      workspaceId,
      hasWorkspaceId: !!workspaceId,
    });

    if (!workspaceId) {
      console.error('[KANBAN] ❌ createFunnel: workspaceId is null/undefined');
      throw new Error('Workspace não selecionado');
    }

    try {
      const { funnel: newFunnel, error } = await funnelsService.createFunnel({
        workspaceId,
        name,
        description,
        columns, // ✅ Passar colunas customizadas
      });

      if (error || !newFunnel) {
        throw error || new Error('Erro ao criar funil');
      }

      setFunnels(prev => [...prev, newFunnel]);
      toast.success('Funil criado com sucesso');
      
      return newFunnel;
    } catch (error: any) {
      console.error('Failed to create funnel:', error);
      toast.error('Erro ao criar funil', { description: error.message });
      throw error;
    }
  }, [workspaceId]);

  // ============================================
  // UPDATE FUNNEL
  // ============================================
  const updateFunnel = useCallback(async (funnelId: string, updates: { 
    name?: string; 
    description?: string;
    columns?: Array<{ id: string; title: string; position: number }>;
  }) => {
    if (!workspaceId) {
      throw new Error('Workspace não selecionado');
    }

    try {
      console.log('[KANBAN] Atualizando funil:', funnelId, updates);

      const { error } = await funnelsService.updateFunnel(funnelId, {
        name: updates.name,
        description: updates.description,
        columns: updates.columns,
      });

      if (error) {
        throw error;
      }

      console.log('[KANBAN] ✅ Funil atualizado com sucesso');

      // Recarregar funil atualizado
      const { funnel: updatedFunnel } = await funnelsService.getFunnelById(funnelId);

      if (updatedFunnel) {
        setFunnels(prev => prev.map(f => f.id === funnelId ? updatedFunnel : f));
        
        if (currentFunnelId === funnelId) {
          setCurrentFunnel(updatedFunnel);
        }
      }

      toast.success('Funil atualizado com sucesso');
      return updatedFunnel;
    } catch (error: any) {
      console.error('[KANBAN] Failed to update funnel:', error);
      toast.error('Erro ao atualizar funil', { description: error.message });
      throw error;
    }
  }, [workspaceId, currentFunnelId]);

  // ============================================
  // DELETE FUNNEL
  // ============================================
  const deleteFunnel = useCallback(async (funnelId: string) => {
    if (!workspaceId) {
      throw new Error('Workspace não selecionado');
    }

    try {
      console.log('[KANBAN DATA] Deletando funil:', funnelId);

      // Chamar RPC para deletar funil de forma segura
      const { data, error } = await supabase.rpc('delete_funnel_safe', {
        p_funnel_id: funnelId,
      });

      if (error) {
        console.error('[KANBAN DATA] Erro ao deletar funil:', error);
        throw error;
      }

      if (!data.success) {
        console.error('[KANBAN DATA] Falha ao deletar funil:', data.error);
        throw new Error(data.error || 'Erro ao deletar funil');
      }

      console.log('[KANBAN DATA] Funil deletado:', data);

      // Atualizar lista de funis
      setFunnels(prev => prev.filter(f => f.id !== funnelId));

      const leadsMessage = data.leads_migrated > 0 
        ? ` ${data.leads_migrated} lead(s) migrados.` 
        : '';
      
      toast.success(`Funil deletado com sucesso.${leadsMessage}`);
    } catch (error: any) {
      console.error('[KANBAN DATA] Failed to delete funnel:', error);
      toast.error('Erro ao deletar funil', { description: error.message });
      throw error;
    }
  }, [workspaceId]);

  // ============================================
  // EFFECTS
  // ============================================

  // Initial load - funnels - ✅ EXECUTAR APENAS UMA VEZ
  useEffect(() => {
    console.log('[KANBAN] useEffect funnels triggered:', { workspaceId, hasWorkspace: !!workspaceId });
    
    // ✅ CRÍTICO: Limpar estado ao trocar de workspace
    if (workspaceId) {
      console.log('[KANBAN] 🔄 Workspace mudou, limpando estado e carregando funis...');
      
      // Resetar estados para evitar mostrar dados do workspace anterior
      setCurrentFunnel(null);
      setColumnLeadsState({});
      setStats(null);
      
      loadFunnels();
    } else {
      console.log('[KANBAN] No workspace ID, setting loading to false');
      setLoading(false);
      setFunnelsLoading(false);
      
      // Limpar estados quando não há workspace
      setFunnels([]);
      setCurrentFunnel(null);
      setColumnLeadsState({});
      setStats(null);
    }
    // ✅ CRÍTICO: Remover loadFunnels das dependências para evitar loop infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Load funnel when currentFunnelId changes - ✅ EXECUTAR APENAS QUANDO ID MUDA
  useEffect(() => {
    console.log('[KANBAN] useEffect funnel triggered:', { 
      currentFunnelId, 
      workspaceId, 
      hasBoth: !!(currentFunnelId && workspaceId) 
    });
    
    if (currentFunnelId && workspaceId) {
      loadFunnel(currentFunnelId);
    } else if (!currentFunnelId && funnelsLoading === false) {
      // Se não tem funnel selecionado mas os funis já carregaram, pode desligar loading
      console.log('[KANBAN] No funnel selected, turning off loading');
      setLoading(false);
    }
    // ✅ CRÍTICO: Remover loadFunnel das dependências para evitar loop infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFunnelId, workspaceId, funnelsLoading]);

  // ============================================
  // CONVERT TO COLUMNS FORMAT
  // ============================================
  const columns: KanbanColumn[] = currentFunnel?.columns.map(col => ({
    ...col,
    leads: columnLeadsState[col.id]?.leads || [],
  })) || [];

  // ============================================
  // RETURN
  // ============================================
  return {
    funnels,
    currentFunnel,
    columns,
    columnLeadsState,
    stats,
    loading,
    loadMoreLeads,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    createFunnel,
    updateFunnel,
    deleteFunnel,
    refetchFunnels: loadFunnels,
    // ✅ CRÍTICO: Não depender de loadFunnel (evita recriações em cadeia)
    refetchFunnel: useCallback(async () => {
      if (!currentFunnelId || !workspaceId) {
        console.log('[KANBAN DATA] refetchFunnel: Missing IDs');
        return;
      }

      try {
        setLoading(true);
        console.log('[KANBAN] 🔄 Recarregando funnel:', currentFunnelId);
        
        // Load funnel with columns (sem leads ainda)
        const { funnel, error } = await funnelsService.getFunnelById(currentFunnelId, { limit: 0, offset: 0 });
        
        if (error || !funnel) {
          console.error('[KANBAN] Erro ao recarregar funil:', error);
          return;
        }

        console.log('[KANBAN] Funnel recarregado:', funnel.name, 'com', funnel.columns.length, 'colunas');
        setCurrentFunnel(funnel);

        // ✅ OTIMIZAÇÃO: Carregar leads de TODAS as colunas em paralelo (1 requisição)
        console.log('[KANBAN] 🚀 Recarregando leads de todas as colunas em paralelo...');
        
        // Obter accessToken do Supabase
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        
        if (!accessToken) {
          console.error('[KANBAN] ❌ Não foi possível obter accessToken para refetchFunnel');
          toast.error('Erro de autenticação', { description: 'Faça login novamente' });
          return;
        }
        
        // Construir URL com query params
        const { projectId } = await import('../utils/supabase/info');
        const queryParams = new URLSearchParams({
          mode: 'kanban',
          limit: '10',
        });
        
        if (filters?.hasEmail) queryParams.append('hasEmail', 'true');
        if (filters?.hasWhatsapp) queryParams.append('hasWhatsapp', 'true');
        if (filters?.searchQuery) queryParams.append('searchQuery', filters.searchQuery);
        
        const url = `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${currentFunnelId}/leads?${queryParams}`;
        
        console.log('[KANBAN] 📡 Chamando API otimizada para refetch:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('[KANBAN] 📊 Response status:', response.status, response.statusText);
        console.log('[KANBAN] 📊 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          // Verificar se a resposta é JSON antes de fazer parse
          const contentType = response.headers.get('content-type');
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          let errorDetails = null;
          
          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              console.error('[KANBAN] ❌ Erro JSON da API:', errorData);
              errorMessage = errorData.error || errorMessage;
              errorDetails = errorData;
            } catch (e) {
              console.error('[KANBAN] Erro ao fazer parse do JSON de erro:', e);
            }
          } else {
            // Resposta não é JSON (provavelmente HTML de erro 404)
            const textResponse = await response.text();
            console.error('[KANBAN] ❌ Resposta não-JSON completa:', textResponse);
            console.error('[KANBAN] ❌ URL que falhou:', url);
            console.error('[KANBAN] ❌ Status HTTP:', response.status);
            errorMessage = `API retornou ${response.status}. Verifique se a rota existe na edge function kanban-api`;
          }
          
          throw new Error(errorMessage);
        }
        
        const { columns: leadsByColumn } = await response.json();
        
        console.log('[KANBAN] ✅ Leads recarregados para', Object.keys(leadsByColumn || {}).length, 'colunas');
        
        // Mapear para o formato do estado
        const newColumnState: ColumnLeadsState = {};
        
        funnel.columns.forEach(column => {
          const columnData = leadsByColumn[column.id] || { leads: [], total: 0, hasMore: false };
          
          // Converter leads do backend para formato frontend
          const convertedLeads = (columnData.leads || []).map((lead: any) => ({
            id: lead.id,
            clientName: lead.clientName,
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
            customFields: [],
          }));
          
          newColumnState[column.id] = {
            leads: convertedLeads,
            offset: convertedLeads.length,
            total: columnData.total || 0,
            hasMore: columnData.hasMore || false,
            loading: false,
          };
        });

        setColumnLeadsState(newColumnState);

        // Buscar estatísticas
        console.log('[KANBAN DATA] 🚀 Buscando stats...');
        
        const { stats: optimizedStats, error: statsError } = await funnelsService.getFunnelStats(funnel.id);

        if (statsError) {
          console.error('[KANBAN DATA] ❌ Erro ao buscar stats:', statsError);
          // Fallback: usar stats zerados se houver erro
          setStats({ 
            totalLeads: 0, 
            totalValue: 0, 
            highPriorityCount: 0 
          });
        } else {
          console.log('[KANBAN DATA] ✅ Stats carregadas:', optimizedStats);
          setStats({
            totalLeads: optimizedStats?.totalLeads || 0,
            totalValue: optimizedStats?.totalValue || 0,
            highPriorityCount: optimizedStats?.highPriorityCount || 0,
            activeLeads: optimizedStats?.activeLeads || 0,
            conversionRate: optimizedStats?.conversionRate || 0,
          });
        }

      } catch (error: any) {
        console.error('[KANBAN] Failed to refetch funnel:', error);
        toast.error('Erro ao recarregar funil', { description: error.message });
      } finally {
        setLoading(false);
      }
    }, [currentFunnelId, workspaceId, filters]), // ✅ CRÍTICO: NÃO depender de loadFunnel
    reloadStats,
  };
}