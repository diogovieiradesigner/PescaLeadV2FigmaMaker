import { useState, useEffect } from 'react';
import { Theme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import {
  Instagram,
  Search,
  MapPin,
  Target,
  Play,
  Loader2,
  Users,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import {
  createInstagramExtraction,
  startDiscovery,
  startEnrichment,
  checkEnrichment,
  startMigration,
  listInstagramExtractions,
} from '../services/instagram-extraction-service';
import { SUGGESTED_NICHES, SUGGESTED_LOCATIONS } from '../types/instagram.types';

interface InstagramExtractionViewProps {
  theme: Theme;
  onNavigateToProgress?: (runId: string) => void;
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

export function InstagramExtractionView({ theme, onNavigateToProgress }: InstagramExtractionViewProps) {
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

  // Recent runs
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  // Fetch funnels
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchFunnels();
      fetchRecentRuns();
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

  const fetchRecentRuns = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoadingRuns(true);
      const { runs } = await listInstagramExtractions(currentWorkspace.id, 5, 0);
      setRecentRuns(runs);
    } catch (error) {
      console.error('Error fetching runs:', error);
    } finally {
      setLoadingRuns(false);
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
      setExecutionPhase('Descobrindo perfis...');

      // 2. Start discovery
      const discoveryResult = await startDiscovery(run.id);
      toast.success(`Descoberta concluída: ${discoveryResult.discovery?.unique_profiles || 0} perfis encontrados`);

      // 3. Start enrichment
      setExecutionPhase('Enriquecendo perfis...');
      await startEnrichment(run.id);

      // 4. Poll enrichment status
      let enrichmentDone = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (!enrichmentDone && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;

        const status = await checkEnrichment(run.id);
        setExecutionPhase(`Enriquecendo: ${status.progress || 0}%`);

        if (status.status === 'completed' || status.status === 'failed') {
          enrichmentDone = true;
          if (status.status === 'completed') {
            toast.success(`Enriquecimento concluído: ${status.enriched || 0} perfis`);
          }
        }
      }

      // 5. Start migration
      setExecutionPhase('Migrando para leads...');
      let hasMore = true;
      let totalCreated = 0;

      while (hasMore) {
        const migrationResult = await startMigration(run.id, 50);
        totalCreated += migrationResult.batch?.leads_created || 0;
        hasMore = migrationResult.has_more || false;
        setExecutionPhase(`Migrados: ${totalCreated} leads`);
      }

      toast.success(`Extração concluída! ${totalCreated} leads criados`);

      // Refresh runs list
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
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'running':
      case 'discovering':
      case 'enriching':
      case 'migrating': return 'text-blue-500 bg-blue-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      default: return 'text-yellow-500 bg-yellow-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'running':
      case 'discovering':
      case 'enriching':
      case 'migrating': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
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

          {/* Niche */}
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Nicho / Segmento *
            </label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: dentista, restaurante, academia..."
                list="niche-suggestions"
                className={`w-full pl-10 pr-4 py-2 border-b transition-all ${
                  isDark
                    ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                    : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
                } focus:outline-none`}
              />
              <datalist id="niche-suggestions">
                {SUGGESTED_NICHES.map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={`block mb-2 text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              Localização *
            </label>
            <div className="relative">
              <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: São Paulo, Rio de Janeiro..."
                list="location-suggestions"
                className={`w-full pl-10 pr-4 py-2 border-b transition-all ${
                  isDark
                    ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                    : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
                } focus:outline-none`}
              />
              <datalist id="location-suggestions">
                {SUGGESTED_LOCATIONS.map(l => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
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
                min={10}
                max={500}
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(Math.min(500, Math.max(10, parseInt(e.target.value) || 50)))}
                className={`w-full pl-10 pr-4 py-2 border-b transition-all ${
                  isDark
                    ? 'bg-black border-white/[0.2] text-white focus:border-[#0169D9]'
                    : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
                } focus:outline-none`}
              />
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Mínimo 10, máximo 500 perfis
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

          {/* Info Box */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
            <div className="flex items-start gap-3">
              <Instagram className={`w-5 h-5 mt-0.5 ${isDark ? 'text-pink-400' : 'text-pink-500'}`} />
              <div>
                <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Como funciona
                </h4>
                <ul className={`mt-2 space-y-1 text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  <li className="flex items-center gap-2">
                    <Search className="w-3 h-3" />
                    Busca perfis no Google (Serper.dev)
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Enriquece dados via Instagram (Bright Data)
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    Extrai email, telefone e WhatsApp
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    Cria leads automaticamente no funil
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execute Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-white/[0.05]">
        <button
          onClick={handleExecute}
          disabled={executing || !niche || !location || !funnelId || !columnId}
          className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {executing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{executionPhase || 'Executando...'}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Iniciar Extração</span>
            </>
          )}
        </button>

        {executing && (
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Este processo pode levar alguns minutos...
          </p>
        )}
      </div>

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
          <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Extrações Recentes
          </h4>
          <div className="space-y-2">
            {recentRuns.map(run => (
              <div
                key={run.id}
                onClick={() => onNavigateToProgress?.(run.id)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-white/[0.03] hover:bg-white/[0.05]'
                    : 'bg-white hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Instagram className={`w-4 h-4 ${isDark ? 'text-pink-400' : 'text-pink-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {run.niche} - {run.location}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {new Date(run.created_at).toLocaleDateString('pt-BR')} • {run.leads_created || 0} leads
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getStatusColor(run.status)}`}>
                  {getStatusIcon(run.status)}
                  <span>{run.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
