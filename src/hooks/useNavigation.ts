// =============================================================================
// HOOK: useNavigation
// Navegação baseada em URL com History API (sem hash #)
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

// Tipos de view disponíveis
export type AppView =
  | 'dashboard'
  | 'pipeline'
  | 'chat'
  | 'calendar'
  | 'documents'
  | 'ai-assistant'
  | 'extraction'
  | 'campaign'
  | 'ai-service'
  | 'agent-logs'
  | 'settings'
  | 'account-settings'
  | 'extraction-progress';

// Tipos de tab de extração
export type ExtractionTab = 'google-maps' | 'cnpj' | 'instagram';

// Parâmetros de navegação
export interface NavigationParams {
  runId?: string;
  leadId?: string;
  conversationId?: string;
  eventId?: string;
  campaignRunId?: string;
  extractionTab?: ExtractionTab;
  aiConversationId?: string;
  aiAgentId?: string; // ID do agente para pré-selecionar no AI Assistant
}

// Mapeamento de URL path para view
const PATH_TO_VIEW: Record<string, AppView> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/pipeline': 'pipeline',
  '/chat': 'chat',
  '/mensagens': 'chat', // Alias para chat com conversationId
  '/calendario': 'calendar',
  '/documentos': 'documents',
  '/assistente-ia': 'ai-assistant',
  '/extracao': 'extraction',
  '/extracao/google-maps': 'extraction',
  '/extracao/cnpj': 'extraction',
  '/extracao/instagram': 'extraction',
  '/campanhas': 'campaign',
  '/ia': 'ai-service',
  '/logs': 'agent-logs',
  '/configuracoes': 'settings',
  '/conta': 'account-settings',
  '/extracao/progresso': 'extraction-progress',
};

// Mapeamento inverso: view para URL path
const VIEW_TO_PATH: Record<AppView, string> = {
  'dashboard': '/dashboard',
  'pipeline': '/pipeline',
  'chat': '/chat',
  'calendar': '/calendario',
  'documents': '/documentos',
  'ai-assistant': '/assistente-ia',
  'extraction': '/extracao',
  'campaign': '/campanhas',
  'ai-service': '/ia',
  'agent-logs': '/logs',
  'settings': '/configuracoes',
  'account-settings': '/conta',
  'extraction-progress': '/extracao/progresso',
};

// Mapeamento de sub-rotas para suas páginas pai (para verificação de acesso)
// Sub-rotas herdam a permissão da página pai
const SUB_ROUTE_TO_PARENT: Partial<Record<AppView, AppView>> = {
  'extraction-progress': 'extraction',  // /extracao/progresso requer acesso a 'extraction'
  'agent-logs': 'ai-service',           // /logs requer acesso a 'ai-service'
};

/**
 * Retorna a página pai de uma sub-rota, ou a própria view se não for sub-rota
 */
function getParentPage(view: AppView): AppView {
  return SUB_ROUTE_TO_PARENT[view] || view;
}

// Labels amigáveis para cada view (para breadcrumb/título)
export const VIEW_LABELS: Record<AppView, string> = {
  'dashboard': 'Dashboard',
  'pipeline': 'Pipeline',
  'chat': 'Chat',
  'calendar': 'Calendário',
  'documents': 'Documentos',
  'ai-assistant': 'Assistente IA',
  'extraction': 'Extração',
  'campaign': 'Campanhas',
  'ai-service': 'IA Service',
  'agent-logs': 'Logs',
  'settings': 'Configurações',
  'account-settings': 'Conta',
  'extraction-progress': 'Progresso da Extração',
};

/**
 * Extrai a view atual do pathname
 */
function getViewFromPath(pathname: string): AppView {
  // Remove trailing slash
  const normalizedPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;

  // Verifica match exato primeiro
  if (PATH_TO_VIEW[normalizedPath]) {
    return PATH_TO_VIEW[normalizedPath];
  }

  // Verifica se é uma subrota (ex: /extracao/progresso/123)
  // ✅ Ordenar paths por comprimento (maior primeiro) para garantir que rotas mais específicas sejam verificadas primeiro
  const sortedPaths = Object.entries(PATH_TO_VIEW).sort(([a], [b]) => b.length - a.length);
  for (const [path, view] of sortedPaths) {
    if (normalizedPath.startsWith(path) && path !== '/') {
      return view;
    }
  }

  // Default para dashboard
  return 'dashboard';
}

// Options for useNavigation hook
export interface UseNavigationOptions {
  defaultView?: AppView;
  hasPageAccess?: (pageId: string) => boolean;
}

/**
 * Hook para gerenciar navegação baseada em URL
 */
export function useNavigation(optionsOrDefaultView: AppView | UseNavigationOptions = 'dashboard') {
  // Handle both legacy and new options format
  const options: UseNavigationOptions = typeof optionsOrDefaultView === 'string'
    ? { defaultView: optionsOrDefaultView }
    : optionsOrDefaultView;

  const defaultView = options.defaultView || 'dashboard';
  const hasPageAccess = options.hasPageAccess;
  // Inicializa com a view baseada na URL atual
  const [currentView, setCurrentViewState] = useState<AppView>(() => {
    if (typeof window === 'undefined') return defaultView;

    const pathname = window.location.pathname;
    // Ignora rotas públicas
    if (pathname.startsWith('/agendar/') || pathname.startsWith('/chat/')) {
      return defaultView;
    }

    return getViewFromPath(pathname);
  });

  // Estado extra para extraction progress (runId)
  const [extractionRunId, setExtractionRunId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/extracao\/progresso\/([^/]+)/);
    return match ? match[1] : null;
  });

  // Estado para lead aberto via URL (/pipeline/lead/:leadId)
  const [leadId, setLeadId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/pipeline\/lead\/([^/]+)/);
    return match ? match[1] : null;
  });

  // Estado para conversa aberta via URL (/mensagens/:conversationId)
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/mensagens\/([^/]+)/);
    return match ? match[1] : null;
  });

  // Estado para evento aberto via URL (/calendario/evento/:eventId)
  const [eventId, setEventId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/calendario\/evento\/([^/]+)/);
    return match ? match[1] : null;
  });

  // Estado para campanha run aberta via URL (/campanhas/:campaignRunId)
  const [campaignRunId, setCampaignRunId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/campanhas\/([^/]+)/);
    return match ? match[1] : null;
  });

  // Estado para tab de extração via URL (/extracao/:tab)
  const [extractionTab, setExtractionTab] = useState<ExtractionTab | null>(() => {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/extracao\/(google-maps|cnpj|instagram)$/);
    return match ? (match[1] as ExtractionTab) : null;
  });

  // Estado para conversa IA aberta via URL (/assistente-ia/:aiConversationId)
  const [aiConversationId, setAiConversationId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/assistente-ia\/([^/]+)/);
    return match ? match[1] : null;
  });

  // Estado para agente IA pré-selecionado via query param (?agent=xxx)
  const [aiAgentId, setAiAgentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;

    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('agent');
  });

  /**
   * Navega para uma view, atualizando URL e estado
   */
  const navigate = useCallback((view: AppView, params?: NavigationParams) => {
    // Check page access if hasPageAccess function is provided
    // Sub-rotas verificam acesso pela página pai (ex: extraction-progress verifica 'extraction')
    if (hasPageAccess && view !== 'dashboard' && view !== 'settings' && view !== 'account-settings') {
      const pageToCheck = getParentPage(view);
      if (!hasPageAccess(pageToCheck)) {
        // Redirect to dashboard if access is not allowed
        const dashboardPath = VIEW_TO_PATH['dashboard'];
        window.history.pushState({ view: 'dashboard' }, '', dashboardPath);
        setCurrentViewState('dashboard');
        return;
      }
    }

    let path = VIEW_TO_PATH[view];

    // Adiciona parâmetros específicos
    if (view === 'extraction-progress' && params?.runId) {
      path = `/extracao/progresso/${params.runId}`;
      setExtractionRunId(params.runId);
    } else if (view !== 'extraction-progress') {
      setExtractionRunId(null);
    }

    // Lead ID para pipeline
    if (view === 'pipeline' && params?.leadId) {
      path = `/pipeline/lead/${params.leadId}`;
      setLeadId(params.leadId);
    } else if (view !== 'pipeline') {
      setLeadId(null);
    }

    // Conversation ID para chat
    if (view === 'chat' && params?.conversationId) {
      path = `/mensagens/${params.conversationId}`;
      setConversationId(params.conversationId);
    } else if (view !== 'chat') {
      setConversationId(null);
    }

    // Event ID para calendar
    if (view === 'calendar' && params?.eventId) {
      path = `/calendario/evento/${params.eventId}`;
      setEventId(params.eventId);
    } else if (view !== 'calendar') {
      setEventId(null);
    }

    // Campaign Run ID para campanhas
    if (view === 'campaign' && params?.campaignRunId) {
      path = `/campanhas/${params.campaignRunId}`;
      setCampaignRunId(params.campaignRunId);
    } else if (view !== 'campaign') {
      setCampaignRunId(null);
    }

    // Extraction Tab para extração
    if (view === 'extraction' && params?.extractionTab) {
      path = `/extracao/${params.extractionTab}`;
      setExtractionTab(params.extractionTab);
    } else if (view !== 'extraction') {
      setExtractionTab(null);
    }

    // AI Conversation ID para assistente-ia
    if (view === 'ai-assistant' && params?.aiConversationId) {
      path = `/assistente-ia/${params.aiConversationId}`;
      setAiConversationId(params.aiConversationId);
    } else if (view !== 'ai-assistant') {
      setAiConversationId(null);
    }

    // AI Agent ID para assistente-ia (query param)
    if (view === 'ai-assistant' && params?.aiAgentId) {
      // Adiciona query param ao path
      const separator = path.includes('?') ? '&' : '?';
      path = `${path}${separator}agent=${params.aiAgentId}`;
      setAiAgentId(params.aiAgentId);
    } else if (view !== 'ai-assistant') {
      setAiAgentId(null);
    }

    // Atualiza URL sem recarregar página
    window.history.pushState({ view, ...params }, '', path);
    setCurrentViewState(view);
  }, [hasPageAccess]);

  /**
   * Substitui a entrada atual no histórico (para redirecionamentos)
   */
  const replaceView = useCallback((view: AppView, params?: NavigationParams) => {
    // Check page access if hasPageAccess function is provided
    // Sub-rotas verificam acesso pela página pai (ex: extraction-progress verifica 'extraction')
    if (hasPageAccess && view !== 'dashboard' && view !== 'settings' && view !== 'account-settings') {
      const pageToCheck = getParentPage(view);
      if (!hasPageAccess(pageToCheck)) {
        // Redirect to dashboard if access is not allowed
        const dashboardPath = VIEW_TO_PATH['dashboard'];
        window.history.replaceState({ view: 'dashboard' }, '', dashboardPath);
        setCurrentViewState('dashboard');
        return;
      }
    }

    let path = VIEW_TO_PATH[view];

    if (view === 'extraction-progress' && params?.runId) {
      path = `/extracao/progresso/${params.runId}`;
      setExtractionRunId(params.runId);
    } else if (view !== 'extraction-progress') {
      setExtractionRunId(null);
    }

    // Lead ID para pipeline
    if (view === 'pipeline' && params?.leadId) {
      path = `/pipeline/lead/${params.leadId}`;
      setLeadId(params.leadId);
    } else if (view !== 'pipeline') {
      setLeadId(null);
    }

    // Conversation ID para chat
    if (view === 'chat' && params?.conversationId) {
      path = `/mensagens/${params.conversationId}`;
      setConversationId(params.conversationId);
    } else if (view !== 'chat') {
      setConversationId(null);
    }

    // Event ID para calendar
    if (view === 'calendar' && params?.eventId) {
      path = `/calendario/evento/${params.eventId}`;
      setEventId(params.eventId);
    } else if (view !== 'calendar') {
      setEventId(null);
    }

    // Campaign Run ID para campanhas
    if (view === 'campaign' && params?.campaignRunId) {
      path = `/campanhas/${params.campaignRunId}`;
      setCampaignRunId(params.campaignRunId);
    } else if (view !== 'campaign') {
      setCampaignRunId(null);
    }

    // Extraction Tab para extração
    if (view === 'extraction' && params?.extractionTab) {
      path = `/extracao/${params.extractionTab}`;
      setExtractionTab(params.extractionTab);
    } else if (view !== 'extraction') {
      setExtractionTab(null);
    }

    // AI Conversation ID para assistente-ia
    if (view === 'ai-assistant' && params?.aiConversationId) {
      path = `/assistente-ia/${params.aiConversationId}`;
      setAiConversationId(params.aiConversationId);
    } else if (view !== 'ai-assistant') {
      setAiConversationId(null);
    }

    // AI Agent ID para assistente-ia (query param)
    if (view === 'ai-assistant' && params?.aiAgentId) {
      const separator = path.includes('?') ? '&' : '?';
      path = `${path}${separator}agent=${params.aiAgentId}`;
      setAiAgentId(params.aiAgentId);
    } else if (view !== 'ai-assistant') {
      setAiAgentId(null);
    }

    window.history.replaceState({ view, ...params }, '', path);
    setCurrentViewState(view);
  }, [hasPageAccess]);

  /**
   * Handler para navegação via sidebar (wrapper conveniente)
   */
  const setCurrentView = useCallback((view: AppView) => {
    navigate(view);
  }, [navigate]);

  // Listener para botões voltar/avançar do browser
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setCurrentViewState(event.state.view);
        // Extraction runId
        if (event.state.runId) {
          setExtractionRunId(event.state.runId);
        } else {
          setExtractionRunId(null);
        }
        // Lead ID
        if (event.state.leadId) {
          setLeadId(event.state.leadId);
        } else {
          setLeadId(null);
        }
        // Conversation ID
        if (event.state.conversationId) {
          setConversationId(event.state.conversationId);
        } else {
          setConversationId(null);
        }
        // Event ID
        if (event.state.eventId) {
          setEventId(event.state.eventId);
        } else {
          setEventId(null);
        }
        // Campaign Run ID
        if (event.state.campaignRunId) {
          setCampaignRunId(event.state.campaignRunId);
        } else {
          setCampaignRunId(null);
        }
        // Extraction Tab
        if (event.state.extractionTab) {
          setExtractionTab(event.state.extractionTab);
        } else {
          setExtractionTab(null);
        }
        // AI Conversation ID
        if (event.state.aiConversationId) {
          setAiConversationId(event.state.aiConversationId);
        } else {
          setAiConversationId(null);
        }
        // AI Agent ID
        if (event.state.aiAgentId) {
          setAiAgentId(event.state.aiAgentId);
        } else {
          setAiAgentId(null);
        }
      } else {
        // Fallback: extrai da URL
        const pathname = window.location.pathname;
        const view = getViewFromPath(pathname);
        setCurrentViewState(view);

        // Extraction progress
        const extractionMatch = pathname.match(/\/extracao\/progresso\/([^/]+)/);
        setExtractionRunId(extractionMatch ? extractionMatch[1] : null);

        // Lead ID
        const leadMatch = pathname.match(/\/pipeline\/lead\/([^/]+)/);
        setLeadId(leadMatch ? leadMatch[1] : null);

        // Conversation ID
        const conversationMatch = pathname.match(/\/mensagens\/([^/]+)/);
        setConversationId(conversationMatch ? conversationMatch[1] : null);

        // Event ID
        const eventMatch = pathname.match(/\/calendario\/evento\/([^/]+)/);
        setEventId(eventMatch ? eventMatch[1] : null);

        // Campaign Run ID
        const campaignMatch = pathname.match(/\/campanhas\/([^/]+)/);
        setCampaignRunId(campaignMatch ? campaignMatch[1] : null);

        // Extraction Tab
        const extractionTabMatch = pathname.match(/\/extracao\/(google-maps|cnpj|instagram)$/);
        setExtractionTab(extractionTabMatch ? (extractionTabMatch[1] as ExtractionTab) : null);

        // AI Conversation ID
        const aiConversationMatch = pathname.match(/\/assistente-ia\/([^/]+)/);
        setAiConversationId(aiConversationMatch ? aiConversationMatch[1] : null);

        // AI Agent ID (query param)
        const searchParams = new URLSearchParams(window.location.search);
        setAiAgentId(searchParams.get('agent'));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sincroniza URL inicial se necessário e verifica acesso
  useEffect(() => {
    const pathname = window.location.pathname;

    // Ignora rotas públicas
    if (pathname.startsWith('/agendar/') || pathname.startsWith('/chat/')) {
      return;
    }

    // Se está na raiz, redireciona para /dashboard
    if (pathname === '/' || pathname === '') {
      replaceView('dashboard');
      return;
    }

    // Check access to current page on initial load
    // Sub-rotas verificam acesso pela página pai
    if (hasPageAccess && currentView !== 'dashboard' && currentView !== 'settings' && currentView !== 'account-settings') {
      const pageToCheck = getParentPage(currentView);
      if (!hasPageAccess(pageToCheck)) {
        replaceView('dashboard');
      }
    }
  }, [replaceView, hasPageAccess, currentView]);

  /**
   * Limpa o leadId da URL (volta para /pipeline)
   */
  const clearLeadId = useCallback(() => {
    if (currentView === 'pipeline') {
      setLeadId(null);
      window.history.replaceState({ view: 'pipeline' }, '', '/pipeline');
    }
  }, [currentView]);

  /**
   * Limpa o conversationId da URL (volta para /chat)
   */
  const clearConversationId = useCallback(() => {
    if (currentView === 'chat') {
      setConversationId(null);
      window.history.replaceState({ view: 'chat' }, '', '/chat');
    }
  }, [currentView]);

  /**
   * Limpa o eventId da URL (volta para /calendario)
   */
  const clearEventId = useCallback(() => {
    if (currentView === 'calendar') {
      setEventId(null);
      window.history.replaceState({ view: 'calendar' }, '', '/calendario');
    }
  }, [currentView]);

  /**
   * Limpa o campaignRunId da URL (volta para /campanhas)
   */
  const clearCampaignRunId = useCallback(() => {
    if (currentView === 'campaign') {
      setCampaignRunId(null);
      window.history.replaceState({ view: 'campaign' }, '', '/campanhas');
    }
  }, [currentView]);

  /**
   * Limpa o aiConversationId da URL (volta para /assistente-ia)
   */
  const clearAiConversationId = useCallback(() => {
    if (currentView === 'ai-assistant') {
      setAiConversationId(null);
      window.history.replaceState({ view: 'ai-assistant' }, '', '/assistente-ia');
    }
  }, [currentView]);

  /**
   * Limpa o aiAgentId da URL (remove query param ?agent=xxx)
   */
  const clearAiAgentId = useCallback(() => {
    if (currentView === 'ai-assistant') {
      setAiAgentId(null);
      // Remove apenas o query param, mantém o path atual
      const pathname = window.location.pathname;
      window.history.replaceState({ view: 'ai-assistant' }, '', pathname);
    }
  }, [currentView]);

  return {
    currentView,
    setCurrentView,
    navigate,
    replaceView,
    extractionRunId,
    setExtractionRunId,
    leadId,
    setLeadId,
    clearLeadId,
    conversationId,
    setConversationId,
    clearConversationId,
    eventId,
    setEventId,
    clearEventId,
    campaignRunId,
    setCampaignRunId,
    clearCampaignRunId,
    extractionTab,
    setExtractionTab,
    aiConversationId,
    setAiConversationId,
    clearAiConversationId,
    aiAgentId,
    setAiAgentId,
    clearAiAgentId,
    // Utilitários
    getPathForView: (view: AppView) => VIEW_TO_PATH[view],
    getLabelForView: (view: AppView) => VIEW_LABELS[view],
  };
}
