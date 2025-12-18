import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { useState, useEffect, useRef } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useExtractionData } from '../hooks/useExtractionData';
import { CheckCircle, AlertCircle, XCircle, History, Clock, Play, Trash2, Save, Loader2, Sun, Moon, Bell, Eye, ArrowRight, MapPin, Building2, Instagram } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ProfileMenu } from './ProfileMenu';
import { MoveLeadsModal } from './MoveLeadsModal';
import { supabase } from '../utils/supabase/client';
import { normalizeLocation } from '../utils/location';
import { LocationSearchInput } from './LocationSearchInput';
import { SearchTermInput, SearchTermInputRef } from './SearchTermInput';
import { CNPJExtractionView } from './CNPJExtractionView';
import { InstagramExtractionView } from './InstagramExtractionView';

interface ExtractionViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToProgress?: (runId: string) => void; // Nova prop para navegação
  onNavigateToDashboard?: () => void; // Nova prop para navegar ao Dashboard
}

interface Funnel {
  id: string;
  name: string;
}

interface FunnelColumn {
  id: string;
  title: string;
  funnel_id: string;
}

export function ExtractionView({ theme, onThemeToggle, onNavigateToSettings, onNavigateToProgress, onNavigateToDashboard }: ExtractionViewProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();
  
  const {
    extractions,
    recentRuns,
    loading,
    refresh,
    createExtraction,
    updateExtraction,
    toggleActive,
    executeExtraction
  } = useExtractionData(currentWorkspace?.id || '');

  // Estado do formulário
  const [extractionName, setExtractionName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [niche, setNiche] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [dailyQuantity, setDailyQuantity] = useState(50);
  const [extractionTime, setExtractionTime] = useState('14:30');
  
  // Funil e Coluna
  const [funnelId, setFunnelId] = useState('');
  const [columnId, setColumnId] = useState('');
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  
  // Filtros
  const [requireWebsite, setRequireWebsite] = useState(false);
  const [requirePhone, setRequirePhone] = useState(false);
  const [requireEmail, setRequireEmail] = useState(false);
  const [minReviews, setMinReviews] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [expandToState, setExpandToState] = useState(false);
  
  // UI States
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const [confirmDeleteRun, setConfirmDeleteRun] = useState<{ id: string; name: string } | null>(null);
  
  // Estado para o modal de mover leads
  const [moveLeadsModalOpen, setMoveLeadsModalOpen] = useState(false);
  const [selectedRunForMove, setSelectedRunForMove] = useState<any>(null);

  // Ref para o SearchTermInput
  const searchTermInputRef = useRef<SearchTermInputRef>(null);

  // Tab ativa (google_maps, cnpj ou instagram)
  const [activeTab, setActiveTab] = useState<'google_maps' | 'cnpj' | 'instagram'>('google_maps');

  const itemsPerPage = 10;

  // Carregar primeira extração ao montar
  useEffect(() => {
    if (extractions.length > 0 && !selectedExtractionId) {
      loadExtraction(extractions[0]);
    }
  }, [extractions]);

  // Buscar funnels do workspace
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchFunnels();
    }
  }, [currentWorkspace?.id]);

  // Buscar colunas quando o funil mudar
  useEffect(() => {
    if (funnelId) {
      fetchColumns(funnelId);
    } else {
      setColumns([]);
      setColumnId('');
    }
  }, [funnelId]);

  const fetchFunnels = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoadingFunnels(true);
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('position');

      if (error) throw error;
      setFunnels(data || []);
    } catch (error) {
      console.error('Error fetching funnels:', error);
      toast.error('Erro ao carregar funis');
    } finally {
      setLoadingFunnels(false);
    }
  };

  const fetchColumns = async (selectedFunnelId: string) => {
    try {
      const { data, error } = await supabase
        .from('funnel_columns')
        .select('id, title, funnel_id')
        .eq('funnel_id', selectedFunnelId)
        .order('position');

      if (error) throw error;
      setColumns(data || []);
    } catch (error) {
      console.error('Error fetching columns:', error);
      toast.error('Erro ao carregar colunas');
    }
  };

  const handleFunnelChange = (newFunnelId: string) => {
    setFunnelId(newFunnelId);
    setColumnId(''); // Reset column when funnel changes
  };

  // Carregar dados de uma extração
  const loadExtraction = (extraction: any) => {
    setSelectedExtractionId(extraction.id);
    setExtractionName(extraction.extraction_name);
    setSearchTerm(extraction.search_term);
    setLocation(extraction.location);
    setNiche(extraction.niche || '');
    setIsActive(extraction.is_active);
    setDailyQuantity(extraction.target_quantity);
    setExtractionTime(extraction.schedule_time || '14:30');
    setRequireWebsite(extraction.require_website);
    setRequirePhone(extraction.require_phone);
    setRequireEmail(extraction.require_email);
    setMinReviews(extraction.min_reviews);
    setMinRating(extraction.min_rating);
    setExpandToState(extraction.expand_state_search || false);
    setFunnelId(extraction.funnel_id || '');
    setColumnId(extraction.column_id || '');
  };

  // Salvar/Atualizar extração
  const handleSave = async () => {
    if (!currentWorkspace) return;

    if (!extractionName) {
      toast.error('Preencha o Nome da Extração');
      return;
    }

    // Validação de quantidade
    if (!dailyQuantity || dailyQuantity < 1 || dailyQuantity > 1000) {
      toast.error('Quantidade deve estar entre 1 e 1.000');
      return;
    }

    // Validação dos campos obrigatórios de destino
    if (!funnelId || !columnId) {
      toast.error('Selecione o Funil e a Coluna de destino');
      return;
    }

    // Validação dos campos obrigatórios de busca manual
    if (!searchTerm || !location) {
      toast.error('Preencha os campos obrigatórios: Termo de Busca e Localização');
      return;
    }

    try {
      setSaving(true);

      const data = {
        workspace_id: currentWorkspace.id,
        extraction_name: extractionName,
        search_term: searchTerm,
        location: location,
        niche: niche,
        prompt: '', // Não usamos mais ICP
        target_quantity: dailyQuantity,
        is_active: isActive,
        schedule_time: extractionTime,
        require_website: requireWebsite,
        require_phone: requirePhone,
        require_email: requireEmail,
        min_reviews: minReviews,
        min_rating: minRating,
        expand_state_search: expandToState,
        funnel_id: funnelId,
        column_id: columnId,
        extraction_mode: 'manual' // Sempre manual agora
      };

      if (selectedExtractionId) {
        await updateExtraction(selectedExtractionId, data);
        
        // Salvar termo no histórico
        if (searchTerm && searchTermInputRef.current) {
          await searchTermInputRef.current.saveToHistory();
        }
        
        toast.success('Extração atualizada com sucesso!');
      } else {
        const newExtraction = await createExtraction(data);
        setSelectedExtractionId(newExtraction.id);
        
        // Salvar termo no histórico
        if (searchTerm && searchTermInputRef.current) {
          await searchTermInputRef.current.saveToHistory();
        }
        
        toast.success('Extração criada com sucesso!');
      }
    } catch (error) {
      console.error('Error saving extraction:', error);
      toast.error('Erro ao salvar extração');
    } finally {
      setSaving(false);
    }
  };

  // Executar extração
  const handleExecute = async () => {
    if (!selectedExtractionId) {
      toast.error('Salve a extração antes de executar');
      return;
    }

    try {
      setExecuting(selectedExtractionId);
      toast.info('Iniciando extração...');
      
      const run = await executeExtraction(selectedExtractionId);
      
      // Redirecionar para tela de progresso
      if (onNavigateToProgress) {
        onNavigateToProgress(run.id);
      }
    } catch (error) {
      console.error('Error executing extraction:', error);
      toast.error('Erro ao executar extração');
      setExecuting(null);
    }
  };

  // Toggle ativo/inativo
  const handleToggleActive = async () => {
    if (!selectedExtractionId) return;

    try {
      await toggleActive(selectedExtractionId, !isActive);
      setIsActive(!isActive);
      toast.success(isActive ? 'Extração desativada' : 'Extração ativada');
    } catch (error) {
      console.error('Error toggling active:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value);
    if (isNaN(num)) {
      setDailyQuantity(1);
    } else if (num < 1) {
      setDailyQuantity(1);
    } else if (num > 1000) {
      setDailyQuantity(1000);
    } else {
      setDailyQuantity(num);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Sucesso';
      case 'partial':
        return 'Parcial';
      case 'failed':
        return 'Falha';
      case 'cancelled':
        return 'Cancelado';
      case 'running':
        return 'Executando';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Deletar execução
  const handleDeleteRun = async () => {
    if (!confirmDeleteRun) return;

    try {
      setDeletingRunId(confirmDeleteRun.id);

      // Usar a função RPC que deleta tudo relacionado à run
      const { data, error } = await supabase.rpc('delete_extraction_run', {
        p_run_id: confirmDeleteRun.id
      });

      if (error) throw error;

      // Verificar se a função retornou sucesso
      if (data?.success) {
        // Mensagem detalhada do que foi deletado
        const counts = data.deleted_counts;
        const details = [];
        
        if (counts.messages_from_queue > 0) details.push(`${counts.messages_from_queue} mensagens da fila`);
        if (counts.watchdog_logs > 0) details.push(`${counts.watchdog_logs} logs do watchdog`);
        if (counts.staging_leads > 0) details.push(`${counts.staging_leads} leads em staging`);
        if (counts.extraction_logs > 0) details.push(`${counts.extraction_logs} logs de extração`);
        if (counts.neighborhood_history > 0) details.push(`${counts.neighborhood_history} histórico de bairros`);
        
        const detailsMessage = details.length > 0 
          ? `\nDeletado: ${details.join(', ')}` 
          : '';
        
        toast.success(`Extração deletada com sucesso!${detailsMessage}`);
      } else {
        throw new Error(data?.error || 'Erro desconhecido ao deletar extração');
      }
      
      // Forçar atualização da lista
      await refresh();
      
      // Fechar modal
      setConfirmDeleteRun(null);
    } catch (error) {
      console.error('Error deleting extraction run:', error);
      toast.error(`Erro ao deletar extração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setDeletingRunId(null);
    }
  };

  const handleSelectAll = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      e.currentTarget.select();
    }
  };

  const totalPages = Math.ceil(recentRuns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistory = recentRuns.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0169D9]" />
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col transition-colors ${
      isDark ? 'bg-true-black' : 'bg-light-bg'
    }`}>
      {/* Header */}
      <div className={`h-16 border-b flex items-center justify-between px-6 transition-colors ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}>
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className={isDark ? 'text-white' : 'text-text-primary-light'}>
              Extração de Leads
            </h1>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              {activeTab === 'google_maps'
                ? 'Extraia leads do Google Maps'
                : activeTab === 'cnpj'
                  ? 'Extraia leads do banco CNPJ'
                  : 'Extraia leads do Instagram'}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {activeTab === 'google_maps' && selectedExtractionId && (
            <button
              onClick={handleExecute}
              disabled={executing !== null}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executando...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Executar Agora</span>
                </>
              )}
            </button>
          )}

          {/* Theme Toggle */}
          <button 
            onClick={onThemeToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-white/[0.05]' 
                : 'hover:bg-light-elevated-hover'
            }`}
            title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-white/50" />
            ) : (
              <Moon className="w-4 h-4 text-text-secondary-light" />
            )}
          </button>

          {/* Notifications */}
          <button className={`relative p-1.5 rounded-lg transition-colors ${
            isDark 
              ? 'hover:bg-white/[0.05]' 
              : 'hover:bg-light-elevated-hover'
          }`}>
            <Bell className={`w-4 h-4 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#0169D9] rounded-full" />
          </button>

          {/* User Profile */}
          <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Tabs de Fonte de Extração */}
          <div className={`flex gap-2 p-1 rounded-lg ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
            <button
              onClick={() => setActiveTab('google_maps')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'google_maps'
                  ? 'bg-[#0169D9] text-white shadow-sm'
                  : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Google Maps</span>
            </button>
            <button
              onClick={() => setActiveTab('cnpj')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'cnpj'
                  ? 'bg-[#0169D9] text-white shadow-sm'
                  : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Banco CNPJ</span>
            </button>
            <button
              onClick={() => setActiveTab('instagram')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'instagram'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                  : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
            </button>
          </div>

          {/* Conteúdo da Tab CNPJ */}
          {activeTab === 'cnpj' && (
            <div className={`overflow-hidden rounded-lg ${isDark ? 'bg-elevated' : 'bg-white'}`}>
              <div className={`px-6 py-3.5 border-b bg-black ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
                <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
                  Extração via Banco CNPJ
                </h2>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Busque empresas por UF, CNAE, porte e outros filtros
                </p>
              </div>
              <div className="p-6 bg-black">
                <CNPJExtractionView
                  theme={theme}
                  onNavigateToProgress={onNavigateToProgress}
                />
              </div>
            </div>
          )}

          {/* Conteúdo da Tab Instagram */}
          {activeTab === 'instagram' && (
            <div className={`overflow-hidden rounded-lg ${isDark ? 'bg-elevated' : 'bg-white'}`}>
              <div className={`px-6 py-3.5 border-b bg-black ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
                <h2 className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  <Instagram className="w-5 h-5 text-pink-500" />
                  Extração via Instagram
                </h2>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Encontre perfis comerciais por nicho e localização
                </p>
              </div>
              <div className="p-6 bg-black">
                <InstagramExtractionView
                  theme={theme}
                  onNavigateToProgress={onNavigateToProgress}
                />
              </div>
            </div>
          )}

          {/* Conteúdo da Tab Google Maps (existente) */}
          {activeTab === 'google_maps' && (
          <>
          {/* Configuration Card */}
          <div className={`overflow-hidden ${
            isDark ? 'bg-elevated' : 'bg-white'
          }`}>
            <div className={`px-6 py-3.5 border-b flex items-center justify-between bg-black ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
                Configuração da Extração
              </h2>

              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDark ? 'text-white/60' : 'text-text-secondary-light'}`}>
                  {isActive ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  onClick={handleToggleActive}
                  disabled={!selectedExtractionId}
                  className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive ? 'bg-green-500' : isDark ? 'bg-white/[0.1]' : 'bg-gray-300'
                  }`}
                  title={isActive ? 'Desativar extração automática' : 'Ativar extração automática'}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                    isActive ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-black">
              {/* Verificar se existem funis disponíveis */}
              {funnels.length === 0 ? (
                <div className={`p-6 rounded-lg border ${
                  isDark 
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium mb-2">Configuração necessária</h3>
                      <p className="text-sm mb-3">
                        Para usar o sistema de extração de leads, você precisa primeiro criar pelo menos um <strong>funil</strong> com uma <strong>coluna</strong> na seção de Pipeline.
                      </p>
                      <p className="text-sm mb-4">
                        Vá para a <strong>Pipeline</strong> e crie seu primeiro funil e coluna para começar a extrair leads.
                      </p>
                      <button
                        onClick={onNavigateToDashboard}
                        className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Ir para a Pipeline
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Nome da Extração (sempre visível) */}
                  <div>
                    <label className={`block mb-2 text-sm ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}>
                      Nome da Extração *
                    </label>
                    <input
                      type="text"
                      value={extractionName}
                      onChange={(e) => setExtractionName(e.target.value)}
                      onKeyDown={handleSelectAll}
                      placeholder="Ex: Clínicas Médicas SP"
                      className={`w-full px-4 py-2 border-b transition-all ${
                        isDark 
                          ? 'bg-black border-white/[0.2] text-white focus:bg-black focus:border-[#0169D9]' 
                          : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
                      } focus:outline-none`}
                    />
                  </div>

                  {/* MODO MANUAL: 2 Caixas Lado a Lado */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Seção 1: Parâmetros de Busca */}
                    <div>
                      <h3 className={`mb-4 font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        Parâmetros de Busca
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                            Termo de Busca *
                          </label>
                          <SearchTermInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onKeyDown={handleSelectAll}
                            workspaceId={currentWorkspace?.id || ''}
                            extractionId={selectedExtractionId || undefined}
                            isDark={isDark}
                            placeholder="Ex: clínicas médicas"
                            ref={searchTermInputRef}
                          />
                        </div>

                        <div>
                          <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                            Localização *
                          </label>
                          <LocationSearchInput
                            value={location}
                            onChange={(val) => setLocation(normalizeLocation(val))}
                            isDark={isDark}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seção 2: Filtros de Qualificação */}
                    <div>
                      <h3 className={`mb-4 font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        Filtros de Qualificação
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                              Mínimo de Avaliações
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={minReviews}
                              onChange={(e) => setMinReviews(parseInt(e.target.value) || 0)}
                              onKeyDown={handleSelectAll}
                              className={`w-full px-4 py-2 border-b transition-all ${isDark ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'} focus:outline-none`}
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                              Mínimo de estrelas
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={minRating}
                              onChange={(e) => setMinRating(parseFloat(e.target.value) || 0)}
                              onKeyDown={handleSelectAll}
                              className={`w-full px-4 py-2 border-b transition-all ${isDark ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'} focus:outline-none`}
                              placeholder="0.0"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={requireWebsite}
                              onChange={(e) => setRequireWebsite(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9]"
                            />
                            <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                              Apenas com Website
                            </span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={requirePhone}
                              onChange={(e) => setRequirePhone(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9]"
                            />
                            <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                              Apenas com Telefone
                            </span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={requireEmail}
                              onChange={(e) => setRequireEmail(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9]"
                            />
                            <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                              Apenas com E-mail
                            </span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={expandToState}
                              onChange={(e) => setExpandToState(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-[#0169D9] focus:ring-[#0169D9]"
                            />
                            <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                              Expandir busca para todo o estado
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção de Destino (sempre visível) */}
                  <div>
                    <h3 className={`mb-4 font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      Destino dos Leads
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                          Funil de Destino *
                        </label>
                        <select
                          value={funnelId}
                          onChange={(e) => handleFunnelChange(e.target.value)}
                          disabled={loadingFunnels}
                          className={`w-full px-4 py-2 border-b transition-all ${isDark ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'} focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <option value="">Selecione um funil</option>
                          {funnels.map(funnel => (
                            <option key={funnel.id} value={funnel.id}>
                              {funnel.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                          Coluna de Destino *
                        </label>
                        <select
                          value={columnId}
                          onChange={(e) => setColumnId(e.target.value)}
                          disabled={!funnelId || columns.length === 0}
                          className={`w-full px-4 py-2 border-b transition-all ${isDark ? 'bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]' : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'} focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <option value="">Selecione uma coluna</option>
                          {columns.map(column => (
                            <option key={column.id} value={column.id}>
                              {column.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Meta Diária e Horário (sempre visível) */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className={isDark ? 'block mb-2 text-sm text-white' : 'block mb-2 text-sm text-text-primary-light'}>
                        Meta Diária de Leads
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={dailyQuantity}
                          onChange={(e) => handleQuantityChange(e.target.value)}
                          onKeyDown={handleSelectAll}
                          className={isDark ? 'w-32 px-4 py-2 border-b transition-all bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9] focus:outline-none' : 'w-32 px-4 py-2 border border-border-light transition-all bg-white text-text-primary-light focus:border-[#0169D9] focus:outline-none'}
                        />
                        <span className={isDark ? 'text-sm text-white/60' : 'text-sm text-text-secondary-light'}>
                          leads/dia
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className={isDark ? 'block mb-2 text-sm text-white' : 'block mb-2 text-sm text-text-primary-light'}>
                        Horário da Extração
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Clock className={isDark ? 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40' : 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary-light'} />
                          <input
                            type="time"
                            value={extractionTime}
                            onChange={(e) => setExtractionTime(e.target.value)}
                            className={isDark ? 'w-40 pl-10 pr-4 py-2 border-b transition-all bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9] focus:outline-none' : 'w-40 pl-10 pr-4 py-2 border border-border-light transition-all bg-white text-text-primary-light focus:border-[#0169D9] focus:outline-none'}
                          />
                        </div>
                        <span className={isDark ? 'text-sm text-white/60' : 'text-sm text-text-secondary-light'}>
                          diário
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/[0.05]">
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Salvar Configuração</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* History Card */}
          <div className={`rounded-lg border overflow-hidden ${
            isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
          }`}>
            <div className={`px-6 py-3.5 border-b ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
                Histórico de Extrações
              </h2>
              <p className={`text-xs mt-0.5 ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Últimas 30 extrações realizadas
              </p>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`text-xs uppercase ${
                  isDark ? 'text-white/50 bg-white/[0.02]' : 'text-text-secondary-light bg-light-elevated'
                }`}>
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Data/Hora</th>
                    <th className="px-6 py-3 text-left font-medium">Extração</th>
                    <th className="px-6 py-3 text-left font-medium">Quantidade</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Páginas</th>
                    <th className="px-6 py-3 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className={`text-sm ${
                  isDark ? 'divide-y divide-white/[0.05]' : 'divide-y divide-border-light'
                }`}>
                  {currentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <p className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                          Nenhuma extração realizada ainda
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentHistory.map((item) => (
                      <tr key={item.id} className={`transition-all ${
                        isDark ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'hover:bg-light-elevated/50'
                      }`}>
                        <td className={`px-6 py-4 ${
                          isDark ? 'text-white/70' : 'text-text-primary-light'
                        }`}>
                          <div>
                            <div className="font-medium">{formatDate(item.created_at)}</div>
                            <div className={`text-xs ${
                              isDark ? 'text-white/40' : 'text-text-secondary-light'
                            }`}>
                              {formatTime(item.created_at)}
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${
                          isDark ? 'text-white/70' : 'text-text-primary-light'
                        }`}>
                          {item.run_name || item.extraction_name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              item.created_quantity >= item.target_quantity 
                                ? 'bg-green-500/10 text-green-500' 
                                : item.created_quantity > 0 
                                  ? 'bg-yellow-500/10 text-yellow-500' 
                                  : 'bg-red-500/10 text-red-500'
                            }`}>
                              {item.created_quantity}
                            </span>
                            <span className={isDark ? 'text-white/30' : 'text-text-secondary-light'}>/</span>
                            <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                              {item.target_quantity}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium ${
                            item.status === 'completed' 
                              ? 'bg-green-500/10 text-green-500' 
                              : item.status === 'partial' 
                                ? 'bg-yellow-500/10 text-yellow-500' 
                                : item.status === 'running'
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : 'bg-red-500/10 text-red-500'
                          }`}>
                            {getStatusIcon(item.status)}
                            <span>{getStatusText(item.status)}</span>
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${
                          isDark ? 'text-white/60' : 'text-text-secondary-light'
                        }`}>
                          {item.pages_consumed}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => onNavigateToProgress && onNavigateToProgress(item.id)}
                              className="px-3 py-1.5 text-sm rounded-lg bg-[#0169D9] hover:bg-[#0159c9] text-white flex items-center gap-1.5"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Detalhes</span>
                            </button>
                            
                            {/* Botão Mover Leads - aparece se tem leads criados (mesmo sem enrichment completo) */}
                            {item.created_quantity > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedRunForMove(item);
                                  setMoveLeadsModalOpen(true);
                                }}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                                  isDark
                                    ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                                    : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                                }`}
                                title="Mover leads para outra coluna"
                              >
                                <ArrowRight className="w-4 h-4" />
                                <span>Mover</span>
                              </button>
                            )}
                            
                            <button
                              onClick={() => setConfirmDeleteRun({ id: item.id, name: item.run_name || item.extraction_name })}
                              disabled={deletingRunId === item.id || item.status === 'completed'}
                              className={`px-2 py-1 text-sm rounded-lg transition-colors ${
                                deletingRunId === item.id
                                  ? 'bg-red-500/50 cursor-not-allowed'
                                  : item.status === 'completed'
                                  ? 'bg-zinc-500/20 cursor-not-allowed text-zinc-500'
                                  : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                              }`}
                              title={
                                item.status === 'completed'
                                  ? 'Extrações concluídas não podem ser deletadas'
                                  : 'Deletar extração'
                              }
                            >
                              {deletingRunId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {recentRuns.length > itemsPerPage && (
              <div className={`px-6 py-3.5 border-t flex items-center justify-between ${
                isDark ? 'border-white/[0.08]' : 'border-border-light'
              }`}>
                <p className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}>
                  Mostrando <span className="font-medium">{startIndex + 1} - {Math.min(endIndex, recentRuns.length)}</span> de <span className="font-medium">{recentRuns.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                      currentPage === 1
                        ? isDark ? 'bg-white/[0.02] text-white/30 cursor-not-allowed' : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
                        : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                    }`}
                  >
                    Anterior
                  </button>
                  <span className={`px-3 text-sm ${
                    isDark ? 'text-white/70' : 'text-text-primary-light'
                  }`}>
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                      currentPage === totalPages
                        ? isDark ? 'bg-white/[0.02] text-white/30 cursor-not-allowed' : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
                        : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                    }`}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {confirmDeleteRun && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 rounded-lg shadow-xl ${
            isDark ? 'bg-[#1a1a1a] border border-white/[0.08]' : 'bg-white border border-border-light'
          }`}>
            <div className={`px-6 py-4 border-b ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <h3 className={`font-medium ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Confirmar Exclusão
              </h3>
            </div>
            
            <div className="px-6 py-4">
              <p className={isDark ? 'text-white/70' : 'text-text-primary-light'}>
                Tem certeza que deseja deletar a extração <strong>"{confirmDeleteRun.name}"</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              <button
                onClick={() => setConfirmDeleteRun(null)}
                disabled={deletingRunId === confirmDeleteRun.id}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  isDark
                    ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white'
                    : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteRun}
                disabled={deletingRunId === confirmDeleteRun.id}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deletingRunId === confirmDeleteRun.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deletando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Deletar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mover Leads */}
      {selectedRunForMove && (
        <MoveLeadsModal
          theme={theme}
          runId={selectedRunForMove.id}
          runName={selectedRunForMove.run_name || selectedRunForMove.extraction_name}
          leadCount={selectedRunForMove.created_quantity || 0}
          currentFunnelId={selectedRunForMove.funnel_id || ''}
          currentFunnelName={selectedRunForMove.funnel_name || 'Kanban'}
          currentColumnId={selectedRunForMove.column_id || ''}
          currentColumnName={selectedRunForMove.column_name || 'Coluna'}
          open={moveLeadsModalOpen}
          onOpenChange={setMoveLeadsModalOpen}
          onSuccess={() => {
            refresh(); // Atualizar lista de runs
            setSelectedRunForMove(null);
          }}
        />
      )}
    </div>
  );
}