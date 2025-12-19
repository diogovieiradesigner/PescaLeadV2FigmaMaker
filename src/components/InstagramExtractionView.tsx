import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import {
  Instagram,
  Target,
  Loader2,
  Users,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Clock,
  Trash2,
  Save
} from 'lucide-react';
import { LocationSearchInput } from './LocationSearchInput';
import { SearchTermInput, SearchTermInputRef } from './SearchTermInput';
import {
  createInstagramExtraction,
  startDiscovery,
  listInstagramExtractions,
  deleteInstagramExtraction,
} from '../services/instagram-extraction-service';
import type { InstagramExtractionRun } from '../types/instagram.types';

interface InstagramExtractionViewProps {
  theme: Theme;
  onNavigateToProgress?: (runId: string) => void;
}

export interface InstagramExtractionViewRef {
  execute: () => Promise<void>;
  canExecute: () => boolean;
  isExecuting: () => boolean;
  save: () => Promise<void>;
  isSaving: () => boolean;
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

export const InstagramExtractionView = forwardRef<InstagramExtractionViewRef, InstagramExtractionViewProps>(
  function InstagramExtractionView({ theme, onNavigateToProgress }, ref) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();

  // Form state
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(50);
  const [funnelId, setFunnelId] = useState('');
  const [columnId, setColumnId] = useState('');

  // UI state
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionPhase, setExecutionPhase] = useState<string | null>(null);

  // Histórico state
  const [recentRuns, setRecentRuns] = useState<InstagramExtractionRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  // Delete state
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const searchTermInputRef = useRef<SearchTermInputRef>(null);

  // Ref para armazenar columnId pendente (quando carregamos config salva antes das colunas carregarem)
  const pendingColumnIdRef = useRef<string | null>(null);

  // Validação
  const canExecute = Boolean(niche && location && funnelId && columnId && targetQuantity >= 10);

  // Chave para localStorage
  const LOCAL_STORAGE_KEY = `instagram_extraction_config_${currentWorkspace?.id}`;

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

  const fetchColumns = async (selectedFunnelId: string) => {
    try {
      const { data, error } = await supabase
        .from('funnel_columns')
        .select('id, title, funnel_id')
        .eq('funnel_id', selectedFunnelId)
        .order('position');

      if (error) throw error;
      setColumns(data || []);

      // Restaurar columnId pendente se houver
      if (pendingColumnIdRef.current) {
        const pendingColumnId = pendingColumnIdRef.current;
        // Verificar se a coluna existe na lista carregada
        if (data?.some(col => col.id === pendingColumnId)) {
          setColumnId(pendingColumnId);
        }
        pendingColumnIdRef.current = null;
      }
    } catch (error) {
      console.error('Error fetching columns:', error);
      toast.error('Erro ao carregar colunas');
    }
  };

  const fetchRecentRuns = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoadingRuns(true);
      const { runs } = await listInstagramExtractions(currentWorkspace.id, 10, 0);
      setRecentRuns(runs);
    } catch (error) {
      console.error('Error fetching recent runs:', error);
    } finally {
      setLoadingRuns(false);
    }
  };

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    execute: handleExecute,
    canExecute: () => canExecute && !executing,
    isExecuting: () => executing,
    save: handleSave,
    isSaving: () => saving,
  }));

  // Fetch funnels e histórico
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchFunnels();
      fetchRecentRuns();

      // Carregar configurações salvas do localStorage
      const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          if (config.niche) setNiche(config.niche);
          if (config.location) setLocation(config.location);
          if (config.targetQuantity) setTargetQuantity(config.targetQuantity);
          if (config.funnelId) setFunnelId(config.funnelId);
          // Armazenar columnId na ref para restaurar após carregar as colunas
          if (config.columnId) {
            pendingColumnIdRef.current = config.columnId;
          }
        } catch (e) {
          console.error('Erro ao carregar configurações salvas:', e);
        }
      }
    }
  }, [currentWorkspace?.id]);

  // Fetch columns when funnel changes
  useEffect(() => {
    if (funnelId) {
      fetchColumns(funnelId);
    } else {
      setColumns([]);
      setColumnId('');
    }
  }, [funnelId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'discovering':
      case 'enriching':
      case 'migrating':
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
      case 'discovering': return 'Descobrindo';
      case 'enriching': return 'Enriquecendo';
      case 'migrating': return 'Migrando';
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

  // Salvar configurações
  const handleSave = async () => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace não encontrado');
      return;
    }

    if (!niche.trim()) {
      toast.error('Informe o termo de busca');
      return;
    }

    if (!location.trim()) {
      toast.error('Informe a localização');
      return;
    }

    if (!funnelId || !columnId) {
      toast.error('Selecione o funil e coluna de destino');
      return;
    }

    if (targetQuantity < 10 || targetQuantity > 1000) {
      toast.error('Quantidade deve estar entre 10 e 1.000');
      return;
    }

    try {
      setSaving(true);

      // Salvar no localStorage
      const config = {
        niche: niche.trim(),
        location: location.trim(),
        targetQuantity,
        funnelId,
        columnId,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));

      // Salvar termo no histórico (se houver ref)
      if (searchTermInputRef.current) {
        await searchTermInputRef.current.saveToHistory();
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!currentWorkspace?.id) {
      toast.error('Workspace não encontrado');
      return;
    }

    if (!niche.trim()) {
      toast.error('Informe o nicho de busca');
      return;
    }

    if (!location.trim()) {
      toast.error('Informe a localização');
      return;
    }

    if (!funnelId || !columnId) {
      toast.error('Selecione o funil e coluna de destino');
      return;
    }

    try {
      setExecuting(true);
      setExecutionPhase('Criando extração...');

      // 1. Create extraction
      const run = await createInstagramExtraction({
        workspaceId: currentWorkspace.id,
        funnelId,
        columnId,
        niche: niche.trim(),
        location: location.trim(),
        targetQuantity,
      });

      toast.success('Extração criada! Iniciando descoberta...');

      // Atualizar lista imediatamente para mostrar a nova extração
      await fetchRecentRuns();

      setExecutionPhase('Descobrindo perfis...');

      // 2. Start discovery - O backend controla automaticamente o resto do fluxo
      // (discovery → enrichment → migration)
      const discoveryResult = await startDiscovery(run.id);
      const profilesFound = discoveryResult.discovery?.unique_profiles || 0;

      toast.success(`Descoberta concluída: ${profilesFound} perfis encontrados`);

      if (profilesFound > 0) {
        toast.info('Enriquecimento e migração iniciados automaticamente. Acompanhe o progresso no histórico.');
      }

      // Atualizar histórico
      await fetchRecentRuns();

      // Navigate to progress if available
      if (onNavigateToProgress) {
        onNavigateToProgress(run.id);
      }

    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(`Erro na extração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setExecuting(false);
      setExecutionPhase(null);
      // Refresh runs mesmo em caso de erro
      fetchRecentRuns();
    }
  };

  const handleDelete = async (runId: string) => {
    try {
      setDeleting(true);
      const result = await deleteInstagramExtraction(runId);

      // Mostrar detalhes do que foi deletado
      const counts = result.deleted_counts;
      const details = [];
      if (counts?.discovery_results && counts.discovery_results > 0) details.push(`${counts.discovery_results} perfis descobertos`);
      if (counts?.enriched_profiles && counts.enriched_profiles > 0) details.push(`${counts.enriched_profiles} perfis enriquecidos`);
      if (counts?.logs && counts.logs > 0) details.push(`${counts.logs} logs`);
      if (counts?.staging && counts.staging > 0) details.push(`${counts.staging} registros em staging`);

      const detailsMessage = details.length > 0
        ? `\nDeletado: ${details.join(', ')}`
        : '';

      toast.success(`Extração excluída com sucesso!${detailsMessage}`);
      setDeleteRunId(null);
      await fetchRecentRuns();
    } catch (error) {
      console.error('Error deleting extraction:', error);
      toast.error(`Erro ao excluir extração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setDeleting(false);
    }
  };

  const getRunDescription = (run: InstagramExtractionRun) => {
    return `${run.niche} - ${run.location}`;
  };

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Search Parameters */}
        <div className="space-y-4">
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            Parâmetros de Busca
          </h3>

          {/* Termo de Busca (Niche) */}
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Termo de Busca *
            </label>
            <SearchTermInput
              ref={searchTermInputRef}
              value={niche}
              onChange={setNiche}
              workspaceId={currentWorkspace?.id || ''}
              isDark={isDark}
              placeholder="Ex: dentista, restaurante, academia..."
              source="instagram"
            />
          </div>

          {/* Location */}
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Localização *
            </label>
            <LocationSearchInput
              value={location}
              onChange={setLocation}
              isDark={isDark}
            />
          </div>

          {/* Target Quantity */}
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Quantidade Alvo
            </label>
            <div className="relative">
              <Target className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
              <input
                type="number"
                min={0}
                max={1000}
                step={10}
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(Math.min(1000, Math.max(0, parseInt(e.target.value) || 0)))}
                className={`w-full pl-10 pr-4 py-2 border-b transition-all ${
                  isDark
                    ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                    : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
                } focus:outline-none`}
              />
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Máximo 1000 perfis
            </p>
          </div>
        </div>

        {/* Right Column - Destination */}
        <div className="space-y-4">
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            Destino dos Leads
          </h3>

          {/* Funnel */}
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Funil de Destino *
            </label>
            <select
              value={funnelId}
              onChange={(e) => {
                setFunnelId(e.target.value);
                setColumnId('');
              }}
              disabled={loadingFunnels}
              className={`w-full px-4 py-2 border-b transition-all ${
                isDark
                  ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                  : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
              } focus:outline-none disabled:opacity-50`}
            >
              <option value="">Selecione um funil</option>
              {funnels.map(funnel => (
                <option key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </option>
              ))}
            </select>
          </div>

          {/* Column */}
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Coluna de Destino *
            </label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              disabled={!funnelId || columns.length === 0}
              className={`w-full px-4 py-2 border-b transition-all ${
                isDark
                  ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                  : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
              } focus:outline-none disabled:opacity-50`}
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

      {/* Histórico de Extrações */}
      <div className={`mt-6 rounded-lg border overflow-hidden ${isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'}`}>
        <div className={`px-6 py-3.5 border-b ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            Histórico de Extrações Instagram
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
                <th className="px-6 py-3 text-left font-medium">Perfis</th>
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
                      Nenhuma extração Instagram realizada ainda
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
                        <div className="font-medium">{run.niche}</div>
                        <div className={`text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                          {run.location}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          run.discovery_profiles_unique > 0
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {run.discovery_profiles_unique || 0}
                        </span>
                        <span className={isDark ? 'text-white/30' : 'text-text-secondary-light'}>/</span>
                        <span className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                          {run.target_quantity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        (run.created_quantity || run.leads_created || 0) > 0
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {run.created_quantity || run.leads_created || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium ${
                        run.status === 'completed'
                          ? 'bg-green-500/10 text-green-500'
                          : run.status === 'partial'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : ['discovering', 'enriching', 'migrating'].includes(run.status)
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
                        <button
                          onClick={() => setDeleteRunId(run.id)}
                          disabled={['discovering', 'enriching', 'migrating'].includes(run.status)}
                          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                            ['discovering', 'enriching', 'migrating'].includes(run.status)
                              ? 'bg-gray-500/10 text-gray-400 cursor-not-allowed'
                              : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          }`}
                          title={['discovering', 'enriching', 'migrating'].includes(run.status) ? 'Não é possível excluir enquanto em execução' : 'Excluir extração'}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal de confirmação de exclusão */}
      {deleteRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-md p-6 rounded-xl shadow-xl ${isDark ? 'bg-elevated' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Confirmar Exclusão
            </h3>
            <p className={`mb-4 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Tem certeza que deseja excluir esta extração?
            </p>
            <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              <strong>Extração:</strong> {recentRuns.find(r => r.id === deleteRunId)?.niche} - {recentRuns.find(r => r.id === deleteRunId)?.location}
            </p>
            <p className={`text-sm mb-6 p-3 rounded-lg ${isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
              ⚠️ Os dados da extração serão removidos, mas os leads criados serão mantidos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteRunId(null)}
                disabled={deleting}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteRunId)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});
