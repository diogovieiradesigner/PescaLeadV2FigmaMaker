import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { MobileSidebar } from './components/MobileSidebar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { KanbanFilters, LeadFilters } from './components/KanbanFilters';
import { ListView } from './components/ListView';
import { ChatView } from './components/ChatView';
import { SettingsView } from './components/SettingsView';
import Settings from './pages/Settings';
import { EditLeadModal } from './components/EditLeadModal';
import { LeadFullViewModal } from './components/LeadFullViewModal';
import { AddFunnelModal } from './components/AddFunnelModal';
import { EditFunnelModal } from './components/EditFunnelModal';
import { DeleteFunnelModal } from './components/DeleteFunnelModal';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { WorkspaceMembersModal } from './components/WorkspaceMembersModal';
import { StatsBar } from './components/StatsBar';
import { DashboardView } from './components/DashboardView';
import { ExtractionView } from './components/ExtractionView';
import { ExtractionProgress } from './components/ExtractionProgress';
import { CampaignView } from './components/CampaignView';
import { AIServiceView } from './components/AIServiceView';
import { AgentLogsView } from './components/AgentLogsView';
import { CalendarView } from './components/CalendarView';
import { DocumentsView } from './components/DocumentsView';
import { AIAssistantView } from './components/AIAssistantView';
import { MoveColumnLeadsModal } from './components/MoveColumnLeadsModal';
import { ViewMode, CRMLead } from './types/crm';
import { useTheme } from './hooks/useTheme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthWrapper } from './components/auth/AuthWrapper';
import { AudioManagerProvider } from './contexts/AudioManagerContext'; // ✅ IMPORTAR PROVIDER
import { useKanbanData } from './hooks/useKanbanData';
import { useKanbanRealtime } from './hooks/useKanbanRealtime';
import { useSettingsData } from './hooks/useSettingsData';
import { useDebounce } from './hooks/useDebounce';
import { useNavigation, AppView } from './hooks/useNavigation';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

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
  const { user, currentWorkspace, workspaces, createWorkspace, switchWorkspace, accessToken, logout, refreshWorkspaces, hasPageAccess } = useAuth();

  // ✅ Navegação baseada em URL (sem hash #)
  const { currentView, setCurrentView, navigate, extractionRunId, setExtractionRunId, leadId, clearLeadId, documentId, navigateToDocument, clearDocumentId, conversationId, clearConversationId, eventId, clearEventId, campaignRunId, clearCampaignRunId, extractionTab, funnelId: urlFunnelId, setFunnelId: setUrlFunnelId } = useNavigation('dashboard');

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [isAddFunnelModalOpen, setIsAddFunnelModalOpen] = useState(false);
  const [isEditFunnelModalOpen, setIsEditFunnelModalOpen] = useState(false);
  const [isDeleteFunnelModalOpen, setIsDeleteFunnelModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [isWorkspaceMembersOpen, setIsWorkspaceMembersOpen] = useState(false);
  const [isMoveColumnLeadsModalOpen, setIsMoveColumnLeadsModalOpen] = useState(false);
  const [moveColumnLeadsData, setMoveColumnLeadsData] = useState<{
    columnId: string;
    columnTitle: string;
    funnelId: string;
    funnelName: string;
    leadCount: number;
    filters?: {
      hasEmail?: boolean;
      hasWhatsapp?: boolean;
      searchQuery?: string;
    };
  } | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // ✅ NOVO: Estado do drawer mobile
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [selectedLeadColumnId, setSelectedLeadColumnId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit');
  const [leadFilters, setLeadFilters] = useState<LeadFilters>({
    hasEmail: false,
    hasWhatsapp: false,
  });
  const [showFilters, setShowFilters] = useState(false); // ✅ Estado para controlar visibilidade dos filtros

  // Settings data (shared between ChatView and SettingsView)
  const settingsData = useSettingsData(currentWorkspace?.id || null);

  // Current funnel ID - inicializa com o ID da URL se disponível
  const [currentFunnelId, setCurrentFunnelIdState] = useState<string | null>(urlFunnelId);

  // ✅ Wrapper para atualizar o estado E a URL quando o funil mudar
  const setCurrentFunnelId = useCallback((funnelId: string | null) => {
    setCurrentFunnelIdState(funnelId);
    // Atualiza URL apenas se estiver na view pipeline
    if (currentView === 'pipeline' && funnelId) {
      setUrlFunnelId(funnelId);
      window.history.replaceState({ view: 'pipeline', funnelId }, '', `/pipeline/${funnelId}`);
    }
  }, [currentView, setUrlFunnelId]);

  // ✅ Debounce no searchQuery (300ms) para evitar queries excessivas durante digitação
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // ✅ Preparar filtros para o hook (incluindo searchQuery com debounce)
  const hookFilters = useMemo(() => ({
    hasEmail: leadFilters.hasEmail,
    hasWhatsapp: leadFilters.hasWhatsapp,
    searchQuery: debouncedSearchQuery.trim() || undefined,
  }), [leadFilters.hasEmail, leadFilters.hasWhatsapp, debouncedSearchQuery]);

  // Kanban data from backend COM FILTROS - MUST be called before any conditional returns
  const {
    funnels,
    currentFunnel,
    columns,
    columnLeadsState,
    stats: backendStats,
    loading,
    funnelsLoading, // ✅ Estado de loading específico para funis
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
  } = useKanbanData(currentWorkspace?.id || null, currentFunnelId, hookFilters);

  // ✅ Estado de loading específico para filtros
  const [isFiltering, setIsFiltering] = useState(false);

  // ✅ OTIMIZADO: Recarregar leads quando filtros mudarem (incluindo quando são removidos)
  const prevFiltersRef = useRef(hookFilters);
  
  useEffect(() => {
    // Só recarregar se o funil estiver carregado E os filtros mudaram
    if (!currentFunnelId) return;
    
    const filtersChanged = 
      prevFiltersRef.current.hasEmail !== hookFilters.hasEmail ||
      prevFiltersRef.current.hasWhatsapp !== hookFilters.hasWhatsapp ||
      prevFiltersRef.current.searchQuery !== hookFilters.searchQuery;
    
    if (filtersChanged) {
      prevFiltersRef.current = hookFilters;
      
      // ✅ Mostrar loading ao aplicar filtros
      setIsFiltering(true);
      
      // Aguardar refetchFunnel completar
      refetchFunnel().finally(() => {
        setIsFiltering(false);
      });
    }
  }, [currentFunnelId, hookFilters, refetchFunnel]);

  // ✅ Criar ref para refetchFunnel (evita reconexões do realtime)
  const refetchFunnelRef = useRef(refetchFunnel);
  
  useEffect(() => {
    refetchFunnelRef.current = refetchFunnel;
  }, [refetchFunnel]);

  // ✅ Reset funnel quando workspace muda (força reload completo)
  // ⚠️ IMPORTANTE: NÃO chamar refetchFunnels aqui - o useKanbanData já faz isso automaticamente
  const previousWorkspaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    const workspaceChanged = previousWorkspaceIdRef.current !== null &&
                             previousWorkspaceIdRef.current !== currentWorkspace?.id;

    if (workspaceChanged) {
      // Apenas resetar estados locais - useKanbanData cuida do carregamento
      setCurrentFunnelId(null);
      setSelectedLead(null);
      setSelectedLeadColumnId(null);
      setIsEditLeadModalOpen(false);
    }

    previousWorkspaceIdRef.current = currentWorkspace?.id || null;
  }, [currentWorkspace?.id]);

  // ✅ Callbacks estáveis para realtime (não causam reconexões)
  const handleLeadMoved = useCallback(() => {
    refetchFunnelRef.current();
  }, []);

  const handleLeadCreated = useCallback(() => {
    refetchFunnelRef.current();
  }, []);

  const handleLeadUpdated = useCallback(() => {
    refetchFunnelRef.current();
  }, []);

  const handleLeadDeleted = useCallback(() => {
    refetchFunnelRef.current();
  }, []);

  const handleFunnelUpdated = useCallback(() => {
    refetchFunnelRef.current();
  }, []);

  // Realtime polling - MUST be called before any conditional returns
  const { trackRecentMove } = useKanbanRealtime({
    workspaceId: currentWorkspace?.id || null,
    currentUserId: user?.id || null,
    enabled: currentView === 'pipeline' && !!currentFunnelId,
    onLeadMoved: handleLeadMoved,
    onLeadCreated: handleLeadCreated,
    onLeadUpdated: handleLeadUpdated,
    onLeadDeleted: handleLeadDeleted,
    onFunnelUpdated: handleFunnelUpdated,
  });

  // Set funnel from URL or first funnel when funnels load
  useEffect(() => {
    if (funnels.length === 0) {
      // Se não há funis, limpar seleção
      if (currentFunnelId) {
        console.log('[APP] ❌ Não há mais funis, limpando seleção');
        setCurrentFunnelIdState(null);
      }
      return;
    }

    // Se tem funnelId na URL, usar ele (se existir na lista de funis)
    if (urlFunnelId && !currentFunnelId) {
      const funnelFromUrl = funnels.find(f => f.id === urlFunnelId);
      if (funnelFromUrl) {
        console.log('[APP] 🔗 Usando funil da URL:', urlFunnelId);
        setCurrentFunnelIdState(urlFunnelId);
        return;
      }
    }

    // Se não há funil selecionado, selecionar o primeiro
    if (!currentFunnelId) {
      console.log('[APP] 📌 Nenhum funil selecionado, selecionando primeiro:', funnels[0].id);
      setCurrentFunnelId(funnels[0].id);
      return;
    }

    // Se o funil atual não existe mais na lista (foi deletado), selecionar outro
    const funnelExists = funnels.some(f => f.id === currentFunnelId);
    if (!funnelExists) {
      console.log('[APP] ⚠️ Funil atual não existe mais, selecionando primeiro:', funnels[0].id);
      setCurrentFunnelId(funnels[0].id);
    }
  }, [funnels, currentFunnelId, urlFunnelId, setCurrentFunnelId]);

  // ✅ Sincronizar quando urlFunnelId mudar (ex: botão voltar do browser)
  useEffect(() => {
    if (urlFunnelId && urlFunnelId !== currentFunnelId && funnels.length > 0) {
      const funnelExists = funnels.some(f => f.id === urlFunnelId);
      if (funnelExists) {
        console.log('[APP] 🔙 Sincronizando funil da URL (popstate):', urlFunnelId);
        setCurrentFunnelIdState(urlFunnelId);
      }
    }
  }, [urlFunnelId, currentFunnelId, funnels]);

  // ✅ Listener para navegação customizada (ex: botão "Ir para Configurações" do AgentConfigForm)
  useEffect(() => {
    const handleNavigateToSettings = () => {
      setCurrentView('settings');
    };

    window.addEventListener('navigate-to-settings', handleNavigateToSettings);
    return () => {
      window.removeEventListener('navigate-to-settings', handleNavigateToSettings);
    };
  }, []);

  // ✅ Abrir lead automaticamente quando há leadId na URL (/pipeline/lead/:leadId)
  useEffect(() => {
    if (leadId && currentView === 'pipeline' && !isEditLeadModalOpen) {

      // Buscar lead do banco e abrir modal
      const openLeadFromUrl = async () => {
        try {
          const { getLeadById } = await import('./services/leads-service');
          const { lead, error } = await getLeadById(leadId);

          if (error || !lead) {
            console.error('[APP] ❌ Lead não encontrado:', leadId, error);
            toast.error('Lead não encontrado');
            clearLeadId(); // Limpa a URL se o lead não existir
            return;
          }

          setSelectedLead(lead);
          setSelectedLeadColumnId(lead.columnId || lead.status);
          setModalMode('edit');
          setIsEditLeadModalOpen(true);
        } catch (error) {
          console.error('[APP] ❌ Erro ao buscar lead da URL:', error);
          toast.error('Erro ao carregar lead');
          clearLeadId();
        }
      };

      openLeadFromUrl();
    }
  }, [leadId, currentView, isEditLeadModalOpen, clearLeadId]);

  // ✅ Recarregar dados APENAS quando voltar para Pipeline de outra view
  // ⚠️ NÃO recarrega quando currentFunnelId muda (isso é feito pelo useKanbanData)
  const previousViewRef = useRef<string | null>(null);

  useEffect(() => {
    const returningToPipeline = previousViewRef.current !== null &&
                                previousViewRef.current !== 'pipeline' &&
                                currentView === 'pipeline';

    if (returningToPipeline && currentFunnelId) {
      refetchFunnel();
    }

    previousViewRef.current = currentView;
  }, [currentView, currentFunnelId, refetchFunnel]);

  // ✅ NOVO: Recarregar dados quando voltar para a tela de Dashboard
  useEffect(() => {
    if (currentView === 'dashboard') {
      // Invalidar queries do dashboard para forçar refetch
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  }, [currentView]);

  // Log workspace status

  // Calculate stats from backend data - MUST be before conditional returns
  const stats = useMemo(() => {
    
    if (backendStats) {
      // 🚀 OTIMIZADO: Usar valores da Stored Procedure (100% corretos)
      const calculatedStats = {
        totalDeals: backendStats.totalLeads || 0,
        totalValue: backendStats.totalValue || 0,
        activeLeads: backendStats.activeLeads || 0, // ✅ Agora vem do SQL
        conversionRate: backendStats.conversionRate || 0, // ✅ Agora vem do SQL
      };
      
      return calculatedStats;
    }
    
    // Fallback: calcular manualmente se não tem backend stats
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
        ? parseFloat(lead.value.replace(/[^\\d.-]/g, ''))
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
    
    return calculatedStats;
  }, [backendStats]); // ✅ OTIMIZAÇÃO: Removido columns e columnLeadsState - stats só recalcula quando backend retorna novos valores

  // Get all leads for list view - MUST be before conditional returns
  const allLeads = useMemo(() => {
    return columns.flatMap((col) => col.leads);
  }, [columns]);

  // ✅ REMOVIDO: Filtros agora são aplicados no backend
  // Os dados já vêm filtrados do hook useKanbanData
  // Não precisa mais filtrar no frontend

  // ALL CALLBACKS MUST BE BEFORE ANY CONDITIONAL RETURNS
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

      toast.success('Lead deletado com sucesso!');

      // Recarregar o funil após deletar
      await refetchFunnel();
    } catch (error) {
      console.error('[APP] Erro ao deletar lead:', error);
      toast.error('Erro ao deletar lead. Tente novamente.');
    }
  }, [refetchFunnel, selectedLead]);

  const handleMoveColumnLeads = useCallback((columnId: string, columnTitle: string, funnelId: string, funnelName: string, leadCount: number) => {
    // Capturar os filtros ativos no momento da chamada
    const activeFilters = {
      hasEmail: leadFilters.hasEmail || undefined,
      hasWhatsapp: leadFilters.hasWhatsapp || undefined,
      searchQuery: debouncedSearchQuery.trim() || undefined,
    };

    // Verificar se há algum filtro ativo
    const hasActiveFilters = activeFilters.hasEmail || activeFilters.hasWhatsapp || activeFilters.searchQuery;

    setMoveColumnLeadsData({
      columnId,
      columnTitle,
      funnelId,
      funnelName,
      leadCount,
      filters: hasActiveFilters ? activeFilters : undefined,
    });
    setIsMoveColumnLeadsModalOpen(true);
  }, [leadFilters, debouncedSearchQuery]);

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
        console.error('[APP] ❌ Erro ao buscar leads da coluna:', fetchError);
        toast.dismiss(loadingToast);
        toast.error('Erro ao buscar leads da coluna');
        return;
      }

      const leadIds = allLeadsInColumn.map(lead => lead.id);

      // Deletar todos os leads em paralelo
      const { hardDeleteLead } = await import('./services/leads-service');
      const deletePromises = leadIds.map(async (leadId) => {
        const result = await hardDeleteLead(leadId);
        if (result.error) {
          console.error(`[APP] ❌ Erro ao deletar lead ${leadId}:`, result.error);
        } else {
        }
        return result;
      });
      const results = await Promise.allSettled(deletePromises);

      // Contar sucessos e falhas
      const successCount = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
      const failureCount = results.length - successCount;

      // Log detalhado dos erros
      if (failureCount > 0) {
        console.error('[APP] ❌ Resumo de erros:');
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.error) {
            console.error(`  - Lead ${leadIds[index]}: ${result.value.error.message}`);
          } else if (result.status === 'rejected') {
            console.error(`  - Lead ${leadIds[index]}: ${result.reason}`);
          }
        });
      }

      toast.dismiss(loadingToast);

      if (failureCount > 0) {
        toast.warning(`${successCount} leads deletados. ${failureCount} falharam.`);
      } else {
        toast.success(`${successCount} lead${successCount > 1 ? 's' : ''} deletado${successCount > 1 ? 's' : ''} com sucesso!`);
      }

      // Recarregar o funil após deletar
      await refetchFunnel();
    } catch (error) {
      console.error('[APP] ❌ Erro inesperado ao deletar leads da coluna:', error);
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

      if (modalMode === 'create') {
        // Create new lead
        const dataToCreate = {
          ...lead,
          columnId: selectedColumnId || columns[0]?.id,
        };
        
        await createLeadBackend(dataToCreate);
        
        // Fechar modal após criar
        setSelectedLead(null);
        setIsEditLeadModalOpen(false);
      } else {
        // Update existing lead - NÃO fecha o modal para permitir múltiplas edições
        
        await updateLeadBackend(lead.id, lead);
        
        
        // ✅ Buscar o lead atualizado do backend para garantir sincronização
        const { getLeadById } = await import('./services/leads-service');
        const { lead: updatedLead, error: fetchError } = await getLeadById(lead.id);
        
        if (fetchError || !updatedLead) {
          setSelectedLead(lead);
        } else {
          setSelectedLead(updatedLead);
        }
      }
    } catch (error) {
      console.error('[APP] Failed to save lead:', error);
      throw error; // Re-throw para que o modal possa capturar o erro
    }
  }, [modalMode, selectedColumnId, columns, createLeadBackend, updateLeadBackend]);

  // ✅ Fechar modal de lead e limpar URL
  const handleCloseLeadModal = useCallback(() => {
    setIsEditLeadModalOpen(false);
    setSelectedLead(null);
    // Limpa o leadId da URL (volta para /pipeline)
    clearLeadId();
  }, [clearLeadId]);

  const handleLeadClick = useCallback((lead: CRMLead) => {
    setSelectedLead(lead);
    setIsEditLeadModalOpen(true);
    setModalMode('edit');
    // ✅ Priorizar columnId se existir, senão usar status (mas provavelmente columnId é o correto para navegação)
    setSelectedLeadColumnId(lead.columnId || lead.status);

    // ✅ Atualiza URL para /pipeline/lead/:leadId
    navigate('pipeline', { leadId: lead.id });
  }, [navigate]);

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
      // ✅ Atualiza URL com novo lead
      navigate('pipeline', { leadId: nextLead.id });
    }
  }, [selectedLead, selectedLeadColumnId, columns, navigate]);

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
      // ✅ Atualiza URL com novo lead
      navigate('pipeline', { leadId: prevLead.id });
    }
  }, [selectedLead, selectedLeadColumnId, columns, navigate]);

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

      if (!currentWorkspace?.id) {
        console.error('[APP] ❌ Workspace não disponível ao criar funil');
        toast.error('Erro ao criar funil', {
          description: 'Workspace não disponível. Por favor, aguarde o carregamento.',
        });
        return;
      }

      // ✅ Converter colunas para o formato esperado pelo backend
      const columns = cols.map(col => ({
        name: col.name,
        color: '#10B981', // Cor padrão - pode ser customizado depois
      }));

      const newFunnel = await createFunnel(funnelName, undefined, columns);

      if (newFunnel) {
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


      await updateFunnel(currentFunnelId, {
        name: funnelName,
        columns: cols.map((col, index) => ({
          id: col.id,
          title: col.name,
          position: index,
        })),
      });

      // Recarregar funil para refletir mudanças
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

  const handleDeleteFunnel = useCallback(async () => {
    try {
      if (!currentFunnelId) {
        toast.error('Nenhum funil selecionado');
        return;
      }


      // ✅ ANTES de deletar, mudar para outro funil se este for o ativo
      if (funnels.length > 1) {
        // Encontrar outro funil que não seja o atual
        const otherFunnel = funnels.find(f => f.id !== currentFunnelId);
        if (otherFunnel) {
          setCurrentFunnelId(otherFunnel.id);
          // Aguardar um pouco para o estado atualizar
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      await deleteFunnel(currentFunnelId);

      // Recarregar lista de funis
      await refetchFunnels();

      // ✅ O useEffect vai detectar automaticamente que o funil não existe mais
      // e vai selecionar outro funil disponível

      setIsDeleteFunnelModalOpen(false);
      toast.success('Funil deletado com sucesso!');
    } catch (error) {
      console.error('[APP] Failed to delete funnel:', error);
      toast.error('Erro ao deletar funil', { 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  }, [currentFunnelId, deleteFunnel, refetchFunnels, funnels]);

  const handleLoadMore = useCallback((columnId: string) => {
    loadMoreLeads(columnId);
  }, [loadMoreLeads]);

  // ✅ Callback para quando usuário clica em lead do chat (navega para o pipeline)
  const handleLeadClickFromChat = useCallback(async (leadId: string) => {
    try {
      
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

      // Definir lead selecionado e sua coluna
      setSelectedLead(lead);
      setSelectedLeadColumnId(lead.columnId || lead.status);
      
      // Abrir modal full view
      setIsEditLeadModalOpen(true);
      setModalMode('edit');
    } catch (error) {
      console.error('[APP] Erro ao abrir lead do chat:', error);
      toast.error('Erro ao carregar lead. Tente novamente.');
    }
  }, []);

  // ✅ Callback para recarregar funil atual (após adicionar lead do chat)
  const reloadCurrentFunnel = useCallback(async () => {
    if (currentFunnelId) {
      await refetchFunnel();
    }
  }, [currentFunnelId, refetchFunnel]);

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
          
          <button
            onClick={logout}
            className={`w-full mt-4 px-6 py-3 rounded-lg transition-colors font-medium ${
              theme === 'dark' 
                ? 'text-white/60 hover:text-white hover:bg-white/5' 
                : 'text-text-secondary-light hover:text-text-primary-light hover:bg-black/5'
            }`}
          >
            Sair da conta
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

  // Loading state - AFTER ALL HOOKS
  // ✅ Mostrar loading se os funis estão carregando OU se loading geral está ativo
  if ((loading || funnelsLoading) && !currentFunnel && funnels.length === 0) {
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

  // No funnels state - AFTER ALL HOOKS
  // ✅ Só mostrar "nenhum funil" se NÃO está carregando funis
  if (!loading && !funnelsLoading && funnels.length === 0 && currentView === 'pipeline') {
    return (
      <div className={`h-screen flex overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            theme={theme}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        </div>

        {/* Mobile Sidebar */}
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          theme={theme}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - mesmo sem funis, mostra o header padrão */}
          <Header
            currentFunnel=""
            funnels={[]}
            onFunnelChange={() => {}}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onSettingsClick={() => {}}
            theme={theme}
            onThemeToggle={toggleTheme}
            searchQuery=""
            onSearchChange={() => {}}
            onNewFunnelClick={() => setIsAddFunnelModalOpen(true)}
            onEditFunnelClick={() => {}}
            onNavigateToSettings={() => setCurrentView('account-settings')}
            onRefresh={() => {}}
            onManageMembersClick={() => setIsWorkspaceMembersOpen(true)}
            onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
            onFiltersToggle={() => {}}
            showFilters={false}
          />

          {/* Empty State Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-xl bg-[#0169D9] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-text-primary-light'
              }`}>
                Nenhum funil encontrado
              </h2>
              <p className={`mb-6 ${
                theme === 'dark' ? 'text-white/60' : 'text-text-secondary-light'
              }`}>
                Crie seu primeiro funil para começar a gerenciar seus leads
              </p>
              <button
                onClick={() => {
                  setIsAddFunnelModalOpen(true);
                }}
                className="px-6 py-3 bg-[#0169D9] text-white rounded-lg hover:bg-[#0169D9]/90 transition-colors font-medium"
              >
                Criar Primeiro Funil
              </button>
            </div>
          </div>
        </div>

        {/* Add Funnel Modal - MUST BE HERE for no-funnels state */}
        <AddFunnelModal
          isOpen={isAddFunnelModalOpen}
          onClose={() => setIsAddFunnelModalOpen(false)}
          theme={theme}
          onSave={handleSaveFunnel}
        />
      </div>
    );
  }

  // Log current funnel info - AFTER ALL HOOKS

  return (
    <div className={`h-screen flex overflow-hidden transition-colors ${
      theme === 'dark' ? 'bg-true-black' : 'bg-light-bg'
    }`}>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          theme={theme}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        theme={theme}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'account-settings' ? (
          <Settings 
            theme={theme} 
            onToggleTheme={toggleTheme}
            onManageMembersClick={() => setIsWorkspaceMembersOpen(true)}
          />
        ) : currentView === 'chat' ? (
          <ChatView
            theme={theme}
            onThemeToggle={toggleTheme}
            onNavigateToPipeline={handleLeadClickFromChat}
            onNavigateToSettings={() => setCurrentView('settings')}
            onKanbanRefresh={reloadCurrentFunnel} // ✅ Passar callback para refresh do kanban
            instances={settingsData.instances}
            inboxes={settingsData.inboxes}
            urlConversationId={conversationId}
            onConversationChange={(convId) => {
              if (convId) {
                navigate('chat', { conversationId: convId });
              } else {
                clearConversationId();
              }
            }}
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
            onManageMembersClick={() => setIsWorkspaceMembersOpen(true)}
            onMobileMenuClick={() => setIsMobileSidebarOpen(true)} // ✅ NOVO
            stats={stats}
          />
        ) : currentView === 'extraction' ? (
          <ExtractionView
            theme={theme}
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
            onNavigateToProgress={(runId) => {
              // ✅ Usa navigate com parâmetro runId para atualizar URL
              navigate('extraction-progress', { runId });
            }}
            onNavigateToDashboard={() => setCurrentView('pipeline')}
            urlTab={extractionTab}
            onTabChange={(tab) => {
              navigate('extraction', { extractionTab: tab });
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
            onNavigateToPipeline={() => setCurrentView('pipeline')}
            urlRunId={campaignRunId}
            onRunChange={(runId) => {
              if (runId) {
                navigate('campaign', { campaignRunId: runId });
              } else {
                clearCampaignRunId();
              }
            }}
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
        ) : currentView === 'calendar' ? (
          <CalendarView
            theme={theme}
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
            onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
            urlEventId={eventId}
            onEventChange={(evtId) => {
              if (evtId) {
                navigate('calendar', { eventId: evtId });
              } else {
                clearEventId();
              }
            }}
          />
        ) : currentView === 'documents' ? (
          <DocumentsView
            theme={theme}
            workspaceId={currentWorkspace?.id || ''}
            userId={user?.id || ''}
            leads={allLeads}
            onNavigateToLead={(leadId) => {
              // Navigate to pipeline view and open lead modal
              setCurrentView('pipeline');
              const lead = allLeads.find(l => l.id === leadId);
              if (lead) {
                handleLeadClick(lead, lead.column_id);
              }
            }}
          />
        ) : currentView === 'ai-assistant' ? (
          <AIAssistantView
            theme={theme}
            workspaceId={currentWorkspace?.id || ''}
            userId={user?.id || ''}
            onThemeToggle={toggleTheme}
            onNavigateToSettings={() => setCurrentView('account-settings')}
            onManageMembersClick={() => setIsWorkspaceMembersOpen(true)}
            onMobileMenuClick={() => setIsMobileSidebarOpen(true)}
            initialConversationId={aiConversationId}
            initialAgentId={aiAgentId}
            onConversationChange={(conversationId) => {
              if (conversationId) {
                navigate('ai-assistant', { aiConversationId: conversationId });
              } else {
                navigate('ai-assistant');
              }
            }}
            onAgentUsed={() => {
              // Limpa o agentId da URL após usar (para não re-selecionar ao navegar)
              clearAiAgentId();
            }}
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
              onManageMembersClick={() => setIsWorkspaceMembersOpen(true)}
              onMobileMenuClick={() => setIsMobileSidebarOpen(true)} // ✅ NOVO: Abrir drawer mobile
              onFiltersToggle={() => setShowFilters(!showFilters)} // ✅ Toggle dos filtros
              showFilters={showFilters} // ✅ Estado de visibilidade dos filtros
            />

            {/* Stats Bar */}
            <StatsBar
              totalDeals={stats.totalDeals}
              totalValue={stats.totalValue}
              activeLeads={stats.activeLeads}
              conversionRate={stats.conversionRate}
              theme={theme}
            />

            {/* Kanban Filters - only show in kanban view and when showFilters is true */}
            {viewMode === 'kanban' && showFilters && (
              <KanbanFilters
                theme={theme}
                filters={leadFilters}
                onFiltersChange={setLeadFilters}
              />
            )}

            {/* View Content */}
            {viewMode === 'kanban' ? (
              <div className="relative flex-1">
              <KanbanBoard
                columns={columns}
                columnStates={columnLeadsState}
                  funnelId={currentFunnelId || undefined}
                  funnelName={currentFunnel?.name || undefined}
                onLeadMove={handleLeadMove}
                onLeadMoveWithPosition={handleLeadMoveWithPosition}
                onAddCard={handleAddCard}
                onLeadClick={handleLeadClick}
                onLoadMore={handleLoadMore}
                onDeleteLead={handleDeleteLead}
                onDeleteAllLeads={handleDeleteAllLeads}
                  onMoveColumnLeads={handleMoveColumnLeads}
                theme={theme}
              />
                {/* ✅ Overlay de loading apenas quando filtros estão sendo aplicados */}
                {isFiltering && (
                  <div className={`absolute inset-0 flex items-center justify-center z-50 backdrop-blur-sm`}>
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className={`w-8 h-8 animate-spin ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                      <p className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Aplicando filtros...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <ListView 
                leads={allLeads}
                theme={theme}
                onLeadClick={handleLeadClick}
              />
            )}
          </>
        )}
      </div>

      {/* Edit Lead Modal / Lead Full View */}
      {(() => {
        
        return modalMode === 'create' ? (
          <EditLeadModal
            isOpen={isEditLeadModalOpen}
            onClose={handleCloseLeadModal}
            lead={selectedLead}
            onSave={handleSaveLead}
            theme={theme}
            mode={modalMode}
            initialStatus={selectedColumnId as CRMLead['status'] | undefined}
          />
        ) : (
          <LeadFullViewModal
            isOpen={isEditLeadModalOpen}
            onClose={handleCloseLeadModal}
            lead={selectedLead}
            onSave={handleSaveLead}
            theme={theme}
            onNavigateNext={leadNavigationState.hasNext ? handleNavigateToNextLead : undefined}
            onNavigatePrev={leadNavigationState.hasPrev ? handleNavigateToPrevLead : undefined}
            onNavigateToInstances={() => {
              handleCloseLeadModal();
              setCurrentView('settings');
            }}
            navigationState={leadNavigationState}
            urlDocumentId={documentId}
            onDocumentOpen={(docId) => selectedLead && navigateToDocument(selectedLead.id, docId)}
            onDocumentClose={clearDocumentId}
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
          onDeleteFunnel={() => {
            setIsEditFunnelModalOpen(false);
            setIsDeleteFunnelModalOpen(true);
          }}
          currentFunnelName={currentFunnel.name}
          currentColumns={currentFunnel.columns.map((col) => ({
            id: col.id,
            name: col.title,
          }))}
          currentRole={currentWorkspace?.role}
        />
      )}

      {/* Delete Funnel Modal */}
      {currentFunnel && currentFunnelId && (
        <DeleteFunnelModal
          isOpen={isDeleteFunnelModalOpen}
          onClose={() => setIsDeleteFunnelModalOpen(false)}
          theme={theme}
          onConfirm={handleDeleteFunnel}
          funnelId={currentFunnelId}
          funnelName={currentFunnel.name}
        />
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
        theme={theme}
      />

      {/* Workspace Members Modal */}
      <WorkspaceMembersModal
        isOpen={isWorkspaceMembersOpen}
        onClose={() => setIsWorkspaceMembersOpen(false)}
        theme={theme}
        workspaceId={currentWorkspace?.id || null}
        workspaceName={currentWorkspace?.name || ''}
        accessToken={accessToken}
        currentUserId={user?.id || ''}
      />

      {/* Move Column Leads Modal */}
      {moveColumnLeadsData && (
        <MoveColumnLeadsModal
          open={isMoveColumnLeadsModalOpen}
          onOpenChange={setIsMoveColumnLeadsModalOpen}
          theme={theme}
          sourceColumnId={moveColumnLeadsData.columnId}
          sourceColumnTitle={moveColumnLeadsData.columnTitle}
          sourceFunnelId={moveColumnLeadsData.funnelId}
          sourceFunnelName={moveColumnLeadsData.funnelName}
          leadCount={moveColumnLeadsData.leadCount}
          filters={moveColumnLeadsData.filters}
          onSuccess={() => {
            // Recarregar dados após movimentação
            refetchFunnel();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();
  
  return (
    <AuthProvider>
      <AuthWrapper theme={theme}>
        <QueryClientProvider client={queryClient}>
          <AudioManagerProvider>
            <AppContent />
            <Toaster />
          </AudioManagerProvider>
        </QueryClientProvider>
      </AuthWrapper>
    </AuthProvider>
  );
}