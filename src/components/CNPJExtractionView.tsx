// =============================================================================
// COMPONENT: CNPJExtractionView
// UI principal para extração de leads via banco CNPJ
// =============================================================================

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useCNPJFilters, useCNPJExtraction } from '../hooks/useCNPJFilters';
import { CNPJFiltersForm } from './CNPJFiltersForm';
import { supabase } from '../utils/supabase/client';
import { SUPABASE_URL } from '../utils/api-config';
import { toast } from 'sonner@2.0.3';
import {
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  XCircle,
  Eye,
  Clock
} from 'lucide-react';
import type { StatsPreview } from '../types/cnpj-extraction';

interface CNPJExtractionViewProps {
  theme: Theme;
  onNavigateToProgress?: (runId: string) => void;
}

export interface CNPJExtractionViewRef {
  execute: () => Promise<void>;
  canExecute: () => boolean;
  isExecuting: () => boolean;
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

export const CNPJExtractionView = forwardRef<CNPJExtractionViewRef, CNPJExtractionViewProps>(
  function CNPJExtractionView({ theme, onNavigateToProgress }, ref) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();

  // Hooks
  const { filters: apiFilters, loading: filtersLoading, getStats, statsLoading, cnaes, cnaesLoading, searchCNAEs } = useCNPJFilters();
  const {
    state,
    setExtractionName,
    updateFilter,
    setTargetQuantity,
    setFunnelId,
    setColumnId,
    isValid,
    validationErrors,
  } = useCNPJExtraction();

  // Estado local
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stats, setStats] = useState<StatsPreview | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Histórico state
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  // Funções de fetch - definidas antes dos useEffect que as usam
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

  const fetchRecentRuns = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoadingRuns(true);
      const { data, error } = await supabase
        .from('lead_extraction_runs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('source', 'cnpj')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentRuns(data || []);
    } catch (error) {
      console.error('Error fetching recent CNPJ runs:', error);
    } finally {
      setLoadingRuns(false);
    }
  };

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    execute: handleExecute,
    canExecute: () => isValid && !executing,
    isExecuting: () => executing,
  }));

  // Carregar funis e histórico
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchFunnels();
      fetchRecentRuns();
    }
  }, [currentWorkspace?.id]);

  // Carregar colunas quando funil mudar
  useEffect(() => {
    if (state.funnelId) {
      fetchColumns(state.funnelId);
    } else {
      setColumns([]);
    }
  }, [state.funnelId]);

  // Buscar stats quando filtros mudarem (debounced)
  useEffect(() => {
    const hasFilters = state.filters.localizacao?.trim() || state.filters.uf?.length || state.filters.cnae?.length;
    if (hasFilters) {
      const timeout = setTimeout(() => {
        fetchStats();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [state.filters]);

  const fetchColumns = async (funnelId: string) => {
    try {
      const { data, error } = await supabase
        .from('funnel_columns')
        .select('id, title, funnel_id')
        .eq('funnel_id', funnelId)
        .order('position');

      if (error) throw error;
      setColumns(data || []);
    } catch (error) {
      console.error('Error fetching columns:', error);
    }
  };

  const fetchStats = async () => {
    const preview = await getStats(state.filters);
    if (preview) {
      setStats(preview);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'partial': return 'Parcial';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      case 'pending': return 'Pendente';
      case 'running': return 'Executando';
      case 'processing': return 'Processando';
      default: return status;
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

  // Salvar configuração
  const handleSave = async () => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace não encontrado');
      return;
    }

    if (!isValid) {
      setShowValidation(true);
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);

      // Salvar configuração no banco (insert simples, sem upsert)
      const { data, error } = await supabase
        .from('lead_extractions')
        .insert({
          workspace_id: currentWorkspace.id,
          extraction_name: state.extractionName,
          source: 'cnpj',
          search_term: state.filters.localizacao || '',
          location: state.filters.localizacao || '',
          niche: state.filters.cnae?.join(', ') || '',
          target_quantity: state.targetQuantity,
          funnel_id: state.funnelId,
          column_id: state.columnId,
          is_active: true,
          // Salvar filtros completos no campo filters_json
          filters_json: state.filters
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace não encontrado');
      return;
    }

    if (!isValid) {
      setShowValidation(true);
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      setExecuting(true);
      toast.info('Iniciando extração CNPJ...');

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/start-cnpj-extraction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            workspace_id: currentWorkspace.id,
            extraction_name: state.extractionName,
            filters: state.filters,
            target_quantity: state.targetQuantity,
            funnel_id: state.funnelId,
            column_id: state.columnId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao iniciar extração');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.found_quantity} empresas encontradas!`);

        // Atualizar histórico
        await fetchRecentRuns();

        // Navegar para progresso
        if (onNavigateToProgress && result.run_id) {
          onNavigateToProgress(result.run_id);
        }
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error executing extraction:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao executar extração');
    } finally {
      setExecuting(false);
      // Refresh runs mesmo em caso de erro
      fetchRecentRuns();
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  // Se não há funis, mostrar aviso
  if (funnels.length === 0 && !loadingFunnels) {
    return (
      <div className={`p-6 rounded-lg border ${
        isDark
          ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium mb-2">Configuração necessária</h3>
            <p className="text-sm">
              Para usar a extração CNPJ, você precisa primeiro criar um <strong>funil</strong> com uma <strong>coluna</strong> na Pipeline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Stats */}
      {stats && (
        <div className={`grid grid-cols-4 gap-4 p-4 rounded-lg ${
          isDark ? 'bg-white/[0.02]' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Total Encontrado</div>
              <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {statsLoading ? '...' : formatNumber(stats.total_matches)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
              <Mail className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Com Email</div>
              <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {statsLoading ? '...' : formatNumber(stats.com_email)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
              <Phone className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Com Telefone</div>
              <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {statsLoading ? '...' : formatNumber(stats.com_telefone)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>
              <TrendingUp className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Email + Telefone</div>
              <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {statsLoading ? '...' : formatNumber(stats.com_email_e_telefone)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nome da Extração */}
      <div>
        <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Nome da Extração *
        </label>
        <input
          type="text"
          value={state.extractionName}
          onChange={(e) => setExtractionName(e.target.value)}
          placeholder="Ex: Restaurantes SP - Dezembro 2025"
          className={`w-full px-4 py-2 border-b transition-all ${
            isDark
              ? 'bg-black border-white/[0.2] text-white focus:bg-black focus:border-[#0169D9]'
              : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
          } focus:outline-none ${showValidation && !state.extractionName ? 'border-red-500' : ''}`}
        />
      </div>

      {/* Filtros */}
      <div className={`p-6 rounded-lg border ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
        <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Filtros de Busca
        </h3>

        <CNPJFiltersForm
          theme={theme}
          filters={state.filters}
          onFilterChange={updateFilter}
          cnaeOptions={cnaes}
          loading={filtersLoading || cnaesLoading}
          onCNAESearch={searchCNAEs}
        />
      </div>

      {/* Destino dos Leads */}
      <div>
        <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Destino dos Leads
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Funil de Destino *
            </label>
            <select
              value={state.funnelId}
              onChange={(e) => setFunnelId(e.target.value)}
              disabled={loadingFunnels}
              className={`w-full px-4 py-2 border-b transition-all ${
                isDark
                  ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                  : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
              } focus:outline-none disabled:opacity-50 ${showValidation && !state.funnelId ? 'border-red-500' : ''}`}
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
              value={state.columnId}
              onChange={(e) => setColumnId(e.target.value)}
              disabled={!state.funnelId || columns.length === 0}
              className={`w-full px-4 py-2 border-b transition-all ${
                isDark
                  ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                  : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
              } focus:outline-none disabled:opacity-50 ${showValidation && !state.columnId ? 'border-red-500' : ''}`}
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

      {/* Quantidade */}
      <div>
        <label className={`block mb-2 text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Quantidade de Leads
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="1"
            max="10000"
            value={state.targetQuantity}
            onChange={(e) => setTargetQuantity(Number(e.target.value))}
            className={`w-32 px-4 py-2 border-b transition-all ${
              isDark
                ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                : 'bg-white border border-border-light text-text-primary-light focus:border-[#0169D9]'
            } focus:outline-none`}
          />
          <span className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            leads (máx. 10.000)
          </span>

          {stats && stats.total_matches > 0 && (
            <span className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              <CheckCircle className="w-4 h-4 inline mr-1" />
              {formatNumber(Math.min(state.targetQuantity, stats.total_matches))} disponíveis
            </span>
          )}
        </div>
      </div>

      {/* Validação Errors - Sempre visível quando há erros */}
      {validationErrors.length > 0 && (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'} border ${isDark ? 'border-yellow-500/20' : 'border-yellow-200'}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <div>
              <p className={`font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                Campos obrigatórios:
              </p>
              <ul className={`mt-1 text-sm ${isDark ? 'text-yellow-400/80' : 'text-yellow-600'} list-disc list-inside`}>
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className={`flex items-center justify-between pt-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
        <button
          onClick={fetchStats}
          disabled={statsLoading || !(state.filters.localizacao?.trim() || state.filters.uf?.length || state.filters.cnae?.length)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            isDark
              ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white disabled:opacity-50'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar Preview</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Botão Salvar - igual ao Google Maps */}
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
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

      {/* Histórico de Extrações */}
      <div className={`mt-6 rounded-lg border overflow-hidden ${isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'}`}>
        <div className={`px-6 py-3.5 border-b ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            Histórico de Extrações CNPJ
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
            Últimas 10 extrações realizadas
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`text-xs uppercase ${isDark ? 'text-white/50 bg-white/[0.02]' : 'text-text-secondary-light bg-light-elevated'}`}>
              <tr>
                <th className="px-6 py-3 text-left font-medium">Data/Hora</th>
                <th className="px-6 py-3 text-left font-medium">Busca</th>
                <th className="px-6 py-3 text-left font-medium">Encontrados</th>
                <th className="px-6 py-3 text-left font-medium">Leads</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-center font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className={`text-sm ${isDark ? 'divide-y divide-white/[0.05]' : 'divide-y divide-border-light'}`}>
              {loadingRuns ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loader2 className={`w-6 h-6 animate-spin mx-auto ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
                  </td>
                </tr>
              ) : recentRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <p className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                      Nenhuma extração CNPJ realizada ainda
                    </p>
                  </td>
                </tr>
              ) : (
                recentRuns.map((run) => (
                  <tr key={run.id} className={`transition-all ${isDark ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'hover:bg-light-elevated/50'}`}>
                    <td className={`px-6 py-4 ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                      <div>
                        <div className="font-medium">{formatDate(run.created_at)}</div>
                        <div className={`text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                          {formatTime(run.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                      <div>
                        <div className="font-medium">{run.niche || run.search_term || '-'}</div>
                        <div className={`text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                          {run.location || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          (run.found_quantity || 0) > 0
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {formatNumber(run.found_quantity || 0)}
                        </span>
                        <span className={isDark ? 'text-white/30' : 'text-text-secondary-light'}>/</span>
                        <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                          {formatNumber(run.target_quantity || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        (run.leads_created || 0) > 0
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {formatNumber(run.leads_created || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium ${
                        run.status === 'completed'
                          ? 'bg-green-500/10 text-green-500'
                          : run.status === 'partial'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : ['running', 'processing'].includes(run.status)
                              ? 'bg-blue-500/10 text-blue-500'
                              : run.status === 'failed' || run.status === 'cancelled'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {getStatusIcon(run.status)}
                        <span>{getStatusText(run.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => onNavigateToProgress && onNavigateToProgress(run.id)}
                          className="px-3 py-1.5 text-sm rounded-lg bg-[#0169D9] hover:bg-[#0159c9] text-white flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Detalhes</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
