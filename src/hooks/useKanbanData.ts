import { useState, useEffect, useCallback, useMemo } from 'react';
import { Funnel, CRMLead, KanbanColumn } from '../types/crm';
import * as funnelsService from '../services/funnels-service';
import * as leadsService from '../services/leads-service';
import { toast } from 'sonner@2.0.3';

interface ColumnLeadsState {
  [columnId: string]: {
    leads: CRMLead[];
    offset: number;
    total: number;
    hasMore: boolean;
    loading: boolean;
  };
}

export function useKanbanData(workspaceId: string | null, currentFunnelId: string | null) {
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
      console.log('[KANBAN] Carregando funnel:', funnelId);
      
      // Load funnel with columns (sem leads ainda)
      const { funnel, error } = await funnelsService.getFunnelById(funnelId, { limit: 0, offset: 0 });
      
      if (error || !funnel) {
        console.error('[KANBAN] Erro ao carregar funil:', error);
        throw error || new Error('Funil não encontrado');
      }

      console.log('[KANBAN] Funnel carregado:', funnel.name, 'com', funnel.columns.length, 'colunas');
      setCurrentFunnel(funnel);

      // Inicializar estado das colunas e carregar primeiros leads
      const newColumnState: ColumnLeadsState = {};
      
      for (const column of funnel.columns) {
        // Carregar primeiros 10 leads de cada coluna
        const { leads: columnLeads, total, error: leadsError } = await funnelsService.getLeadsByColumn(
          column.id,
          workspaceId,
          { limit: 10, offset: 0 }
        );

        if (leadsError) {
          console.error('[KANBAN] Erro ao carregar leads da coluna', column.title, ':', leadsError);
          // Continua mesmo com erro
        }

        newColumnState[column.id] = {
          leads: columnLeads || [],
          offset: columnLeads?.length || 0,
          total: total || 0,
          hasMore: (columnLeads?.length || 0) < (total || 0),
          loading: false,
        };
      }

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
  }, [workspaceId]);

  // ============================================
  // LOAD MORE LEADS (Pagination)
  // ============================================
  const loadMoreLeads = useCallback(async (columnId: string) => {
    if (!workspaceId) {
      console.log('[KANBAN] loadMoreLeads: No workspace');
      return;
    }

    const columnState = columnLeadsState[columnId];
    if (!columnState || !columnState.hasMore || columnState.loading) {
      console.log('[KANBAN] loadMoreLeads: Nada para carregar', { 
        hasState: !!columnState, 
        hasMore: columnState?.hasMore,
        loading: columnState?.loading 
      });
      return;
    }

    try {
      // Marcar como loading
      setColumnLeadsState(prev => ({
        ...prev,
        [columnId]: {
          ...prev[columnId],
          loading: true,
        },
      }));

      console.log('[KANBAN] Carregando mais leads para coluna:', columnId, 'offset:', columnState.offset);

      const { leads: newLeads, total, error } = await funnelsService.getLeadsByColumn(
        columnId,
        workspaceId,
        { limit: 10, offset: columnState.offset }
      );

      if (error) {
        throw error;
      }

      console.log('[KANBAN] Carregados mais', newLeads.length, 'leads');

      // Atualizar estado
      setColumnLeadsState(prev => ({
        ...prev,
        [columnId]: {
          ...prev[columnId],
          leads: [...prev[columnId].leads, ...newLeads],
          offset: prev[columnId].offset + newLeads.length,
          total,
          hasMore: prev[columnId].offset + newLeads.length < total,
          loading: false,
        },
      }));

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
  }, [workspaceId, columnLeadsState]);

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
    let previousState = columnLeadsState;

    setColumnLeadsState(prev => {
      const newState = { ...prev };
      
      // Find and remove from source column
      for (const columnId in newState) {
        const leadIndex = newState[columnId].leads.findIndex(l => l.id === leadId);
        if (leadIndex !== -1) {
          fromColumnId = columnId;
          movedLead = { ...newState[columnId].leads[leadIndex] };
          
          const newLeads = [...newState[columnId].leads];
          newLeads.splice(leadIndex, 1);
          newState[columnId] = {
            ...newState[columnId],
            leads: newLeads,
            total: newState[columnId].total - 1,
          };
          break;
        }
      }

      // Add to target column
      if (movedLead && newState[toColumnId]) {
        const newLeads = [...newState[toColumnId].leads];
        newLeads.splice(toPosition, 0, movedLead);
        newState[toColumnId] = {
          ...newState[toColumnId],
          leads: newLeads,
          total: newState[toColumnId].total + 1,
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

      // Buscar lead atualizado
      const { lead: updatedLead } = await leadsService.getLeadById(leadId);

      if (updatedLead) {
        setColumnLeadsState(prev => {
          const newState = { ...prev };
          if (newState[toColumnId]) {
            const leadIndex = newState[toColumnId].leads.findIndex(l => l.id === leadId);
            if (leadIndex !== -1) {
              const newLeads = [...newState[toColumnId].leads];
              newLeads[leadIndex] = updatedLead;
              newState[toColumnId] = {
                ...newState[toColumnId],
                leads: newLeads,
              };
            }
          }
          return newState;
        });
      }

      // ✅ Recarregar stats após mover lead (pode mudar taxa de conversão)
      await reloadStats();

      return updatedLead;
    } catch (error: any) {
      console.error('Failed to move lead:', error);
      toast.error('Erro ao mover lead', { description: error.message });
      
      // Rollback optimistic update
      setColumnLeadsState(previousState);
      
      throw error;
    }
  }, [workspaceId, columnLeadsState, reloadStats]);

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
  const createFunnel = useCallback(async (name: string, description?: string) => {
    console.log('[KANBAN] createFunnel called:', {
      name,
      description,
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
      const { error } = await funnelsService.deleteFunnel(funnelId);

      if (error) {
        throw error;
      }

      setFunnels(prev => prev.filter(f => f.id !== funnelId));
      toast.success('Funil deletado com sucesso');
    } catch (error: any) {
      console.error('Failed to delete funnel:', error);
      toast.error('Erro ao deletar funil', { description: error.message });
      throw error;
    }
  }, [workspaceId]);

  // ============================================
  // EFFECTS
  // ============================================

  // Initial load - funnels
  useEffect(() => {
    console.log('[KANBAN] useEffect funnels triggered:', { workspaceId, hasWorkspace: !!workspaceId });
    if (workspaceId) {
      loadFunnels();
    } else {
      console.log('[KANBAN] No workspace ID, setting loading to false');
      setLoading(false);
      setFunnelsLoading(false);
    }
  }, [workspaceId, loadFunnels]);

  // Load funnel when currentFunnelId changes
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
  }, [currentFunnelId, workspaceId, loadFunnel, funnelsLoading]);

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
    refetchFunnel: () => currentFunnelId && loadFunnel(currentFunnelId),
    reloadStats,
  };
}