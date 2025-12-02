import { useState, useMemo, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { ChatView } from './components/ChatView';
import { SettingsView } from './components/SettingsView';
import Settings from './pages/Settings';
import { EditLeadModal } from './components/EditLeadModal';
import { LeadFullViewModal } from './components/LeadFullViewModal';
import { AddFunnelModal } from './components/AddFunnelModal';
import { EditFunnelModal } from './components/EditFunnelModal';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { StatsBar } from './components/StatsBar';
import { DashboardView } from './components/DashboardView';
import { ExtractionView } from './components/ExtractionView';
import { ExtractionProgress } from './components/ExtractionProgress';
import { CampaignView } from './components/CampaignView';
import { AIServiceView } from './components/AIServiceView';
import { AgentLogsView } from './components/AgentLogsView';
import { ViewMode, CRMLead } from './types/crm';
import { useTheme } from './hooks/useTheme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthWrapper } from './components/auth/AuthWrapper';
import { useKanbanData } from './hooks/useKanbanData';
import { useKanbanRealtime } from './hooks/useKanbanRealtime';
import { useSettingsData } from './hooks/useSettingsData';
import { toast } from 'sonner';

// Create QueryClient instance outside component to avoid recreating on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { user, currentWorkspace, workspaces, createWorkspace, switchWorkspace, accessToken } = useAuth();
  const [currentView, setCurrentView] = useState<'pipeline' | 'chat' | 'dashboard' | 'settings' | 'account-settings' | 'extraction' | 'campaign' | 'ai-service' | 'extraction-progress' | 'agent-logs'>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [isAddFunnelModalOpen, setIsAddFunnelModalOpen] = useState(false);
  const [isEditFunnelModalOpen, setIsEditFunnelModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [selectedLeadColumnId, setSelectedLeadColumnId] = useState<string | null>(null); // ✅ Nova state para rastrear coluna
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit');
  const [extractionRunId, setExtractionRunId] = useState<string | null>(null);

  // Settings data (shared between ChatView and SettingsView)
  const settingsData = useSettingsData(currentWorkspace?.id || null);

  // Current funnel ID
  const [currentFunnelId, setCurrentFunnelId] = useState<string | null>(null);

  // Kanban data from backend - MUST be called before any conditional returns
  const {
    funnels,
    currentFunnel,
    columns,
    columnLeadsState,
    stats: backendStats,
    loading,
    loadMoreLeads,
    createLead: createLeadBackend,
    updateLead: updateLeadBackend,
    moveLead: moveLeadBackend,
    deleteLead: deleteLeadBackend,
    createFunnel,
    updateFunnel,
    deleteFunnel,
    refetchFunnel,
    refetchFunnels,
  } = useKanbanData(currentWorkspace?.id || null, currentFunnelId);

  // Realtime polling - MUST be called before any conditional returns
  const { trackRecentMove } = useKanbanRealtime({
    workspaceId: currentWorkspace?.id || null,
    currentUserId: user?.id || null,
    enabled: currentView === 'pipeline' && !!currentFunnelId,
    onLeadMoved: () => {
      // Refresh when other users move leads
      refetchFunnel();
    },
    onLeadCreated: () => {
      refetchFunnel();
    },
    onLeadUpdated: () => {
      refetchFunnel();
    },
    onLeadDeleted: () => {
      refetchFunnel();
    },
    onFunnelUpdated: () => {
      refetchFunnel();
    },
  });

  // Set first funnel as current when funnels load
  useEffect(() => {
    if (funnels.length > 0 && !currentFunnelId) {
      setCurrentFunnelId(funnels[0].id);
    }
  }, [funnels, currentFunnelId]);

  // Log workspace status
  console.log('[APP CONTENT] Workspace status:', {
    hasCurrentWorkspace: !!currentWorkspace,
    workspaceId: currentWorkspace?.id,
    workspaceName: currentWorkspace?.name,
    totalWorkspaces: workspaces.length,
  });

  // Calculate stats from backend data - MUST be before conditional returns
  const stats = useMemo(() => {
    console.log('[APP STATS] Calculating stats:', { 
      hasBackendStats: !!backendStats, 
      backendStats,
      columnsCount: columns.length 
    });
    
    if (backendStats) {
      // 🚀 OTIMIZADO: Usar valores da Stored Procedure (100% corretos)
      const calculatedStats = {
        totalDeals: backendStats.totalLeads || 0,
        totalValue: backendStats.totalValue || 0,
        activeLeads: backendStats.activeLeads || 0, // ✅ Agora vem do SQL
        conversionRate: backendStats.conversionRate || 0, // ✅ Agora vem do SQL
      };
      
      console.log('[APP STATS] Using backend stats:', calculatedStats);
      return calculatedStats;
    }
    
    // Fallback: calcular manualmente se não tem backend stats
    console.log('[APP STATS] Calculating manually from columns');
    const allLeads: CRMLead[] = [];
    columns.forEach(col => {
      const leads = columnLeadsState[col.id];
      if (Array.isArray(leads)) {
        allLeads.push(...leads);
      }
    });

    const totalValue = allLeads.reduce((sum, lead) => {
      if (!lead.value) return sum;
      const numValue = typeof lead.value === 'string' 
        ? parseFloat(lead.value.replace(/[^\d.-]/g, ''))
        : lead.value;
      return sum + (isNaN(numValue) ? 0 : numValue);
    }, 0);

    const wonColumn = columns.find(c => c.name?.toLowerCase().includes('ganho'));
    const wonLeads = wonColumn ? (columnLeadsState[wonColumn.id] || []).length : 0;
    const conversionRate = allLeads.length > 0 ? (wonLeads / allLeads.length) * 100 : 0;

    const calculatedStats = {
      totalDeals: allLeads.length,
      totalValue,
      activeLeads: allLeads.filter(l => !l.archived).length,
      conversionRate,
    };
    
    console.log('[APP STATS] Manual calculation result:', calculatedStats);
    return calculatedStats;
  }, [backendStats, columns, columnLeadsState]);

  // Check if user has no workspace - show create workspace screen
  if (!currentWorkspace && workspaces.length === 0) {
    return (
      <div className={`h-screen flex items-center justify-center transition-colors ${
        theme === 'dark' ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        <div className="max-w-md w-full px-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-[#0169D9] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className={`text-2xl font-semibold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-text-primary-light'
            }`}>
              Bem-vindo!
            </h1>
            <p className={theme === 'dark' ? 'text-white/60' : 'text-text-secondary-light'}>
              Crie seu primeiro workspace para começar a gerenciar seus leads
            </p>
          </div>
          
          <button
            onClick={() => setIsCreateWorkspaceModalOpen(true)}
            className="w-full px-6 py-3 bg-[#0169D9] text-white rounded-lg hover:bg-[#0169D9]/90 transition-colors font-medium"
          >
            Criar Workspace
          </button>
        </div>

        <CreateWorkspaceModal
          isOpen={isCreateWorkspaceModalOpen}
          onClose={() => setIsCreateWorkspaceModalOpen(false)}
          theme={theme}
        />
      </div>
    );
  }

  // Get all leads for list view
  const allLeads = useMemo(() => {
    return columns.flatMap((col) => col.leads);
  }, [columns]);

  // Filter leads based on search query (client-side for now, can move to backend later)
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;

    const query = searchQuery.toLowerCase();
    
    return columns.map(column => ({
      ...column,
      leads: column.leads.filter(lead => 
        lead.clientName.toLowerCase().includes(query) ||
        lead.company.toLowerCase().includes(query) ||
        lead.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }));
  }, [columns, searchQuery]);

  const filteredAllLeads = useMemo(() => {
    if (!searchQuery.trim()) return allLeads;
    
    const query = searchQuery.toLowerCase();
    return allLeads.filter(lead => 
      lead.clientName.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      lead.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [allLeads, searchQuery]);

  const handleLeadMove = useCallback(async (leadId: string, targetColumnId: string) => {
    try {
      trackRecentMove(leadId);
      await moveLeadBackend(leadId, targetColumnId, 0);
    } catch (error) {
      console.error('Failed to move lead:', error);
    }
  }, [trackRecentMove, moveLeadBackend]);

  const handleLeadMoveWithPosition = useCallback(async (leadId: string, targetColumnId: string, targetIndex: number) => {
    try {
      trackRecentMove(leadId);
      await moveLeadBackend(leadId, targetColumnId, targetIndex);
    } catch (error) {
      console.error('Failed to move lead:', error);
    }
  }, [trackRecentMove, moveLeadBackend]);

  const handleDeleteLead = useCallback(async (leadId: string) => {
    try {
      // Se o lead sendo deletado está aberto no modal, fechar o modal
      if (selectedLead?.id === leadId) {
        setIsEditLeadModalOpen(false);
        setSelectedLead(null);
      }

      // Deletar lead com cascade
      const { hardDeleteLead } = await import('./services/leads-service');
      const { error } = await hardDeleteLead(leadId);

      if (error) {
        console.error('[APP] Erro ao deletar lead:', error);
        toast.error('Erro ao deletar lead. Tente novamente.');
        return;
      }

      console.log('[APP] Lead deletado com sucesso');
      toast.success('Lead deletado com sucesso!');

      // Recarregar o funil após deletar
      await refetchFunnel();
    } catch (error) {
      console.error('[APP] Erro ao deletar lead:', error);
      toast.error('Erro ao deletar lead. Tente novamente.');
    }
  }, [refetchFunnel, selectedLead]);

  const handleDeleteAllLeads = useCallback(async (columnId: string) => {
    try {
      // Encontrar a coluna e seus leads
      const column = columns.find(col => col.id === columnId);
      if (!column) {
        toast.error('Coluna não encontrada');
        return;
      }

      // Buscar o estado da coluna para pegar o total real (incluindo os não carregados)
      const columnState = columnLeadsState[columnId];
      const totalLeads = columnState?.total || column.leads.length;

      if (totalLeads === 0) {
        toast.info('Não há leads para deletar nesta coluna');
        return;
      }

      // Se o lead selecionado está na coluna sendo deletada, fechar o modal
      if (selectedLead && column.leads.some(lead => lead.id === selectedLead.id)) {
        setIsEditLeadModalOpen(false);
        setSelectedLead(null);
      }

      // Mostrar loading toast
      const loadingToast = toast.loading(`Deletando ${totalLeads} lead${totalLeads > 1 ? 's' : ''}...`);

      // Buscar TODOS os IDs dos leads da coluna (não apenas os carregados)
      const { getLeadsByColumn } = await import('./services/leads-service');
      const { leads: allLeadsInColumn, error: fetchError } = await getLeadsByColumn(columnId);

      if (fetchError || !allLeadsInColumn) {
        toast.dismiss(loadingToast);
        toast.error('Erro ao buscar leads da coluna');
        return;
      }

      const leadIds = allLeadsInColumn.map(lead => lead.id);
      console.log(`[APP] Deletando ${leadIds.length} leads da coluna ${column.title}`);

      // Deletar todos os leads em paralelo
      const { hardDeleteLead } = await import('./services/leads-service');
      const deletePromises = leadIds.map(leadId => hardDeleteLead(leadId));
      const results = await Promise.allSettled(deletePromises);

      // Contar sucessos e falhas
      const successCount = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
      const failureCount = results.length - successCount;

      toast.dismiss(loadingToast);

      if (failureCount > 0) {
        console.warn(`[APP] ${failureCount} leads falharam ao deletar`);
        toast.warning(`${successCount} leads deletados. ${failureCount} falharam.`);
      } else {
        console.log(`[APP] ${successCount} leads deletados com sucesso`);
        toast.success(`${successCount} lead${successCount > 1 ? 's' : ''} deletado${successCount > 1 ? 's' : ''} com sucesso!`);
      }

      // Recarregar o funil após deletar
      await refetchFunnel();
    } catch (error) {
      console.error('[APP] Erro ao deletar leads da coluna:', error);
      toast.error('Erro ao deletar leads. Tente novamente.');
    }
  }, [columns, columnLeadsState, refetchFunnel, selectedLead]);

  const handleAddCard = useCallback((columnId: string) => {
    setSelectedColumnId(columnId);
    setSelectedLead(null);
    setModalMode('create');
    setIsEditLeadModalOpen(true);
  }, []);

  const handleSaveLead = useCallback(async (lead: CRMLead) => {
    try {
      console.log('[APP] handleSaveLead called:', { 
        lead, 
        modalMode, 
        selectedColumnId, 
        firstColumnId: columns[0]?.id 
      });

      if (modalMode === 'create') {
        // Create new lead
        const dataToCreate = {
          ...lead,
          columnId: selectedColumnId || columns[0]?.id,
        };
        
        console.log('[APP] Creating lead with data:', dataToCreate);
        await createLeadBackend(dataToCreate);
        
        // Fechar modal após criar
        setSelectedLead(null);
        setIsEditLeadModalOpen(false);
      } else {
        // Update existing lead - NÃO fecha o modal para permitir múltiplas edições
        console.log('[APP] Updating lead with id:', lead.id);
        console.log('[APP] Lead data being sent:', {
          clientName: lead.clientName,
          company: lead.company,
          dealValue: lead.dealValue,
          dueDate: lead.dueDate,
          notes: lead.notes,
          priority: lead.priority
        });
        
        await updateLeadBackend(lead.id, lead);
        
        console.log('[APP] Lead updated successfully, fetching updated lead...');
        
        // ✅ Buscar o lead atualizado do backend para garantir sincronização
        const { getLeadById } = await import('./services/leads-service');
        const { lead: updatedLead, error: fetchError } = await getLeadById(lead.id);
        
        if (fetchError || !updatedLead) {
          console.warn('[APP] Não foi possível buscar lead atualizado, usando dados locais:', fetchError);
          setSelectedLead(lead);
        } else {
          console.log('[APP] Lead atualizado recebido do backend:', updatedLead);
          setSelectedLead(updatedLead);
        }
      }
    } catch (error) {
      console.error('[APP] Failed to save lead:', error);
      throw error; // Re-throw para que o modal possa capturar o erro
    }
  }, [modalMode, selectedColumnId, columns, createLeadBackend, updateLeadBackend]);

  const handleLeadClick = useCallback((lead: CRMLead) => {
    console.log('[APP] handleLeadClick chamado:', { leadId: lead.id, leadName: lead.name, status: lead.status, columnId: lead.columnId });
    setSelectedLead(lead);
    setIsEditLeadModalOpen(true);
    setModalMode('edit');
    // ✅ Priorizar columnId se existir, senão usar status (mas provavelmente columnId é o correto para navegação)
    setSelectedLeadColumnId(lead.columnId || lead.status); 
  }, []);

  // ✅ Navegação entre leads tipo "stories"
  const handleNavigateToNextLead = useCallback(() => {
    if (!selectedLead || !selectedLeadColumnId) return;
    
    const currentColumn = columns.find(col => col.id === selectedLeadColumnId);
    if (!currentColumn) return;
    
    // ✅ FIX: Usar leads da coluna (array) em vez do objeto de estado
    const leads = currentColumn.leads || [];
    const currentIndex = leads.findIndex(l => l.id === selectedLead.id);
    
    if (currentIndex >= 0 && currentIndex < leads.length - 1) {
      const nextLead = leads[currentIndex + 1];
      setSelectedLead(nextLead);
    }
  }, [selectedLead, selectedLeadColumnId, columns]);

  const handleNavigateToPrevLead = useCallback(() => {
    if (!selectedLead || !selectedLeadColumnId) return;
    
    const currentColumn = columns.find(col => col.id === selectedLeadColumnId);
    if (!currentColumn) return;
    
    // ✅ FIX: Usar leads da coluna (array) em vez do objeto de estado
    const leads = currentColumn.leads || [];
    const currentIndex = leads.findIndex(l => l.id === selectedLead.id);
    
    if (currentIndex > 0) {
      const prevLead = leads[currentIndex - 1];
      setSelectedLead(prevLead);
    }
  }, [selectedLead, selectedLeadColumnId, columns]);

  // ✅ Calcular se há leads anterior/próximo
  const leadNavigationState = useMemo(() => {
    if (!selectedLead) {
      return { hasPrev: false, hasNext: false, currentIndex: -1, total: 0 };
    }

    // Tentar encontrar a coluna correta
    let targetColumnId = selectedLeadColumnId;
    let currentColumn = columns.find(col => col.id === targetColumnId);

    // Se não encontrou a coluna pelo ID armazenado, tentar encontrar onde o lead está
    if (!currentColumn) {
      console.log('[APP] Navigation: Coluna não encontrada pelo ID, procurando lead nas colunas...');
      for (const col of columns) {
        // ✅ FIX: Usar leads da coluna (array) diretamente
        if (col.leads && col.leads.some(l => l.id === selectedLead.id)) {
          currentColumn = col;
          targetColumnId = col.id;
          break;
        }
      }
    }
    
    if (!currentColumn || !targetColumnId) {
      console.log('[APP] Navigation: Coluna não encontrada para o lead:', selectedLead.id);
      return { hasPrev: false, hasNext: false, currentIndex: -1, total: 0 };
    }
    
    // ✅ FIX: Usar leads da coluna encontrada
    const leads = currentColumn.leads || [];
    const currentIndex = leads.findIndex(l => l.id === selectedLead.id);
    
    const state = {
      hasPrev: currentIndex > 0,
      hasNext: currentIndex >= 0 && currentIndex < leads.length - 1,
      currentIndex: currentIndex + 1,
      total: leads.length
    };
    
    return state;
  }, [selectedLead, selectedLeadColumnId, columns]);

  const handleSaveFunnel = useCallback(async (funnelName: string, cols: { id: string; name: string }[]) => {
    try {
      console.log('[APP] handleSaveFunnel called:', {
        funnelName,
        cols: cols.length,
        workspaceId: currentWorkspace?.id,
        hasCurrentWorkspace: !!currentWorkspace,
      });

      if (!currentWorkspace?.id) {
        console.error('[APP] ❌ Workspace não disponível ao criar funil');
        toast.error('Erro ao criar funil', {
          description: 'Workspace não disponível. Por favor, aguarde o carregamento.',
        });
        return;
      }

      const newFunnel = await createFunnel(funnelName);

      if (newFunnel) {
        console.log('[APP] ✅ Funil criado com sucesso:', newFunnel.id);
        setCurrentFunnelId(newFunnel.id);
      }
      setIsAddFunnelModalOpen(false);
    } catch (error: any) {
      console.error('[APP] ❌ Failed to create funnel:', error);
      toast.error('Erro ao criar funil', {
        description: error.message || 'Erro desconhecido',
      });
    }
  }, [currentWorkspace, createFunnel]);

  const handleEditFunnel = useCallback(async (funnelName: string, cols: { id: string; name: string }[]) => {
    try {
      if (!currentFunnelId) {
        toast.error('Nenhum funil selecionado');
        return;
      }

      console.log('[APP] Atualizando funil:', currentFunnelId, { funnelName, cols });

      await updateFunnel(currentFunnelId, {
        name: funnelName,
        columns: cols.map((col, index) => ({
          id: col.id,
          title: col.name,
          position: index,
        })),
      });

      // Recarregar funil para refletir mudanças
      console.log('[APP] Recarregando funil após atualização...');
      await refetchFunnel();
      
      // Recarregar lista de funis também
      await refetchFunnels();

      setIsEditFunnelModalOpen(false);
      toast.success('Funil atualizado com sucesso!');
    } catch (error) {
      console.error('[APP] Failed to update funnel:', error);
      toast.error('Erro ao atualizar funil', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  }, [currentFunnelId, updateFunnel, refetchFunnel, refetchFunnels]);

  const handleLoadMore = useCallback((columnId: string) => {
    loadMoreLeads(columnId);
  }, [loadMoreLeads]);

  // ✅ Callback para quando usuário clica em lead do chat (navega para o pipeline)
  const handleLeadClickFromChat = useCallback(async (leadId: string) => {
    try {
      console.log('[APP] Opening lead from chat:', leadId);
      
      // Mudar para view pipeline
      setCurrentView('pipeline');
      
      // Buscar lead específico do banco
      const { getLeadById } = await import('./services/leads-service');
      const { lead, error } = await getLeadById(leadId);
      
      if (error || !lead) {
        console.error('[APP] Erro ao buscar lead:', error);
        toast.error('Erro ao carregar lead. Tente novamente.');
        return;
      }
      
      // Abrir modal com os dados do lead
      setSelectedLead(lead);
      setModalMode('edit');
      setIsEditLeadModalOpen(true);
      
      console.log('[APP] Lead modal opened:', lead.name);
    } catch (error) {
      console.error('[APP] Erro ao abrir lead do chat:', error);
      toast.error('Erro ao abrir lead. Tente novamente.');
    }
  }, []);

  // ✅ Callback para recarregar funil atual (após adicionar lead do chat)
  const reloadCurrentFunnel = useCallback(async () => {
    if (currentFunnelId) {
      console.log('[APP] Recarregando funil atual:', currentFunnelId);
      await refetchFunnel();
    }
  }, [currentFunnelId, refetchFunnel]);

  // Loading state
  if (loading && !currentFunnel && funnels.length === 0) {
    return (
      <div className={`h-screen flex overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          theme={theme}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className={theme === 'dark' ? 'text-white' : 'text-text-primary-light'}>
            Carregando funis...
          </div>
        </div>
      </div>
    );
  }

  // No funnels state
  if (!loading && funnels.length === 0 && currentView === 'pipeline') {
    return (
      <div className={`h-screen flex overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          theme={theme}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header
            currentFunnel={''}
            funnels={[]}
            onFunnelChange={setCurrentFunnelId}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onSettingsClick={() => {}}
            theme={theme}
            onThemeToggle={toggleTheme}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onNewFunnelClick={() => setIsAddFunnelModalOpen(true)}
            onEditFunnelClick={() => setIsEditFunnelModalOpen(true)}
            onNavigateToSettings={() => setCurrentView('account-settings')}
          />

          {/* Stats Bar */}
          <StatsBar
            totalDeals={0}
            totalValue={0}
            activeLeads={0}
            conversionRate={0}
            theme={theme}
          />

          {/* Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-[#0169D9]/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#0169D9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h2 className={`text-2xl font-semibold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-text-primary-light'
              }`}>
                Nenhum funil configurado
              </h2>
              <p className={`mb-6 ${
                theme === 'dark' ? 'text-white/60' : 'text-text-secondary-light'
              }`}>
                Crie seu primeiro funil de vendas para começar a organizar e gerenciar seus leads
              </p>
              <button
                onClick={() => setIsAddFunnelModalOpen(true)}
                className="px-6 py-3 bg-[#0169D9] text-white rounded-lg hover:bg-[#0169D9]/90 transition-colors font-medium"
              >
                Criar Primeiro Funil
              </button>
            </div>
          </div>
        </div>
        <AddFunnelModal
          isOpen={isAddFunnelModalOpen}
          onClose={() => setIsAddFunnelModalOpen(false)}
          theme={theme}
          onSave={handleSaveFunnel}
        />
      </div>
    );
  }

  // Debug logs
  console.log('[APP RENDER] State:', {
    currentView,
    loading,
    hasFunnels: funnels.length > 0,
    currentFunnelId,
    currentFunnel: currentFunnel?.name,
  });

  return (
    <div className={`h-screen flex overflow-hidden transition-colors ${
      theme === 'dark' ? 'bg-true-black' : 'bg-light-bg'
    }`}>
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        theme={theme}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'account-settings' ? (
          <Settings theme={theme} onToggleTheme={toggleTheme} />
        ) : currentView === 'chat' ? (
          <ChatView 
            theme={theme} 
            onThemeToggle={toggleTheme}
            onNavigateToPipeline={handleLeadClickFromChat}
            onNavigateToSettings={() => setCurrentView('settings')}
            onKanbanRefresh={reloadCurrentFunnel} // ✅ Passar callback para refresh do kanban
            instances={settingsData.instances}
            inboxes={settingsData.inboxes}
          />
        ) : currentView === 'settings' ? (
          <SettingsView 
            theme={theme}
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
            instances={settingsData.instances}
            inboxes={settingsData.inboxes}
            members={settingsData.members}
            workspaceId={currentWorkspace?.id || ''}
            accessToken={accessToken || ''}
            createInstance={settingsData.createInstance}
            updateInstance={settingsData.updateInstance}
            deleteInstance={settingsData.deleteInstance}
            checkInstanceStatus={settingsData.checkInstanceStatus}
            getInstanceQRCode={settingsData.getInstanceQRCode}
            logoutInstance={settingsData.logoutInstance}
            restartInstance={settingsData.restartInstance}
            createInbox={settingsData.createInbox}
            updateInbox={settingsData.updateInbox}
            deleteInbox={settingsData.deleteInbox}
          />
        ) : currentView === 'dashboard' ? (
          <DashboardView
            theme={theme}
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
            stats={stats}
          />
        ) : currentView === 'extraction' ? (
          <ExtractionView 
            theme={theme} 
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
            onNavigateToProgress={(runId) => {
              setExtractionRunId(runId);
              setCurrentView('extraction-progress');
            }}
          />
        ) : currentView === 'extraction-progress' ? (
          <ExtractionProgress 
            theme={theme} 
            onThemeToggle={toggleTheme}
            runId={extractionRunId}
            onBack={() => setCurrentView('extraction')}
            onNavigateToSettings={() => setCurrentView('account-settings')}
          />
        ) : currentView === 'campaign' ? (
          <CampaignView 
            theme={theme}
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
          />
        ) : currentView === 'ai-service' ? (
          <AIServiceView 
            theme={theme} 
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
            onNavigateToLogs={() => setCurrentView('agent-logs')}
          />
        ) : currentView === 'agent-logs' ? (
          <AgentLogsView 
            theme={theme} 
            onBack={() => setCurrentView('ai-service')} 
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
          />
        ) : (
          <>
            {/* Header */}
            <Header
              currentFunnel={currentFunnelId || ''}
              funnels={funnels.map(f => ({ id: f.id, name: f.name, columns: f.columns }))}
              onFunnelChange={setCurrentFunnelId}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onSettingsClick={() => {}}
              theme={theme}
              onThemeToggle={toggleTheme}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNewFunnelClick={() => setIsAddFunnelModalOpen(true)}
              onEditFunnelClick={() => setIsEditFunnelModalOpen(true)}
              onNavigateToSettings={() => setCurrentView('account-settings')}
              onRefresh={refetchFunnel} // ✅ Recarregar leads do kanban
            />

            {/* Stats Bar */}
            <StatsBar
              totalDeals={stats.totalDeals}
              totalValue={stats.totalValue}
              activeLeads={stats.activeLeads}
              conversionRate={stats.conversionRate}
              theme={theme}
            />

            {/* View Content */}
            {viewMode === 'kanban' ? (
              <KanbanBoard
                columns={filteredColumns}
                columnStates={columnLeadsState}
                onLeadMove={handleLeadMove}
                onLeadMoveWithPosition={handleLeadMoveWithPosition}
                onAddCard={handleAddCard}
                onLeadClick={handleLeadClick}
                onLoadMore={handleLoadMore}
                onDeleteLead={handleDeleteLead}
                onDeleteAllLeads={handleDeleteAllLeads}
                theme={theme}
              />
            ) : (
              <ListView 
                leads={filteredAllLeads} 
                theme={theme}
                onLeadClick={handleLeadClick}
              />
            )}
          </>
        )}
      </div>

      {/* Edit Lead Modal / Lead Full View */}
      {(() => {
        console.log('[APP] Renderizando modal:', {
          modalMode,
          isEditLeadModalOpen,
          hasSelectedLead: !!selectedLead,
          selectedLeadId: selectedLead?.id,
          willRenderLeadFullView: modalMode !== 'create'
        });
        
        return modalMode === 'create' ? (
          <EditLeadModal
            isOpen={isEditLeadModalOpen}
            onClose={() => setIsEditLeadModalOpen(false)}
            lead={selectedLead}
            onSave={handleSaveLead}
            theme={theme}
            mode={modalMode}
            initialStatus={selectedColumnId as CRMLead['status'] | undefined}
          />
        ) : (
          <LeadFullViewModal
            isOpen={isEditLeadModalOpen}
            onClose={() => setIsEditLeadModalOpen(false)}
            lead={selectedLead}
            onSave={handleSaveLead}
            theme={theme}
            onNavigateNext={leadNavigationState.hasNext ? handleNavigateToNextLead : undefined}
            onNavigatePrev={leadNavigationState.hasPrev ? handleNavigateToPrevLead : undefined}
            navigationState={leadNavigationState}
          />
        );
      })()}

      {/* Add Funnel Modal */}
      <AddFunnelModal
        isOpen={isAddFunnelModalOpen}
        onClose={() => setIsAddFunnelModalOpen(false)}
        theme={theme}
        onSave={handleSaveFunnel}
      />

      {/* Edit Funnel Modal */}
      {currentFunnel && (
        <EditFunnelModal
          isOpen={isEditFunnelModalOpen}
          onClose={() => setIsEditFunnelModalOpen(false)}
          theme={theme}
          onSave={handleEditFunnel}
          currentFunnelName={currentFunnel.name}
          currentColumns={currentFunnel.columns.map((col) => ({
            id: col.id,
            name: col.title,
          }))}
        />
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();
  
  return (
    <AuthProvider>
      <AuthWrapper theme={theme}>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </AuthWrapper>
    </AuthProvider>
  );
}