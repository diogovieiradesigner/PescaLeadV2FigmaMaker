import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { useState, useEffect, useRef } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useExtractionData } from '../hooks/useExtractionData';
import { CheckCircle, AlertCircle, XCircle, History, Clock, Play, Trash2, Save, Loader2, Sun, Moon, Bell, Eye } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ProfileMenu } from './ProfileMenu';
import { supabase } from '../utils/supabase/client';
import { normalizeLocation } from '../utils/location';
import { LocationSearchInput } from './LocationSearchInput';
import { SearchTermInput, SearchTermInputRef } from './SearchTermInput';

interface ExtractionViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToProgress?: (runId: string) => void; // Nova prop para navegação
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

export function ExtractionView({ theme, onThemeToggle, onNavigateToSettings, onNavigateToProgress }: ExtractionViewProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();
  
  const {
    extractions,
    recentRuns,
    loading,
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

  // Ref para o SearchTermInput
  const searchTermInputRef = useRef<SearchTermInputRef>(null);

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
              Extração Automática
            </h1>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              Configure a extração diária baseada em ICP
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {selectedExtractionId && (
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
                    <th className="px-6 py-3 text-left font-medium">Decisões da I.A</th>
                    <th className="px-6 py-3 text-center font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className={`text-sm ${
                  isDark ? 'divide-y divide-white/[0.05]' : 'divide-y divide-border-light'
                }`}>
                  {currentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center">
                        <p className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                          Nenhuma extração realizada ainda
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentHistory.map((item) => (
                      <tr key={item.id} className={`transition-all ${
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-light-elevated/50'
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
                          {item.extraction_name}
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
                        <td className={`px-6 py-4 max-w-md text-sm ${
                          isDark ? 'text-white/60' : 'text-text-secondary-light'
                        }`}>
                          {item.ai_decisions?.decision || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => onNavigateToProgress && onNavigateToProgress(item.id)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-[#0169D9] hover:bg-[#0159c9] text-white"
                          >
                            Detalhes
                          </button>
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
        </div>
      </div>
    </div>
  );
}