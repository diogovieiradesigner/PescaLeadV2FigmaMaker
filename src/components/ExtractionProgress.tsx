import { useEffect, useState } from 'react';
import { Theme } from '../hooks/useTheme';
import { supabase } from '../utils/supabase/client';
import { 
  cancelExtractionRun,
  getExtractionStatistics,
  getExtractionMetricsCard
} from '../services/extraction-service';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  ArrowLeft, 
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ExtractionProgressProps {
  theme: Theme;
  runId: string | null;
  onBack?: () => void;
}

export function ExtractionProgress({ theme, runId, onBack }: ExtractionProgressProps) {
  const isDark = theme === 'dark';

  const [statistics, setStatistics] = useState<any>(null);
  const [metricsCards, setMetricsCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Buscar dados iniciais
  useEffect(() => {
    if (!runId) return;
    fetchData();
  }, [runId]);

  // Realtime para atualizar progresso
  useEffect(() => {
    if (!runId || !statistics?.run_info) return;
    
    const status = statistics.run_info.status;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') return;

    const channel = supabase
      .channel(`run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lead_extraction_runs',
          filter: `id=eq.${runId}`
        },
        (payload) => {
          console.log('🔄 Run atualizado via Realtime:', payload.new);
          fetchData(); // Recarregar tudo
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, statistics?.run_info?.status]);

  // Polling de fallback (caso Realtime não funcione)
  useEffect(() => {
    if (!runId || !statistics?.run_info) return;
    
    const status = statistics.run_info.status;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') return;

    const interval = setInterval(() => {
      fetchData();
    }, 3000); // Poll a cada 3 segundos

    return () => clearInterval(interval);
  }, [runId, statistics?.run_info?.status]);

  const fetchData = async () => {
    if (!runId) return;

    try {
      setLoading(true);

      const [stats, metrics] = await Promise.all([
        getExtractionStatistics(runId),
        getExtractionMetricsCard(runId)
      ]);

      setStatistics(stats);
      setMetricsCards(metrics);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar progresso');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!runId || !statistics) return;

    try {
      setCancelling(true);
      await cancelExtractionRun(runId);
      toast.success('Extração cancelada');
      fetchData();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar extração');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusConfig = () => {
    if (!statistics?.run_info) return null;

    const statusMap = {
      pending: { 
        icon: Clock, 
        text: '⏳ Aguardando...', 
        description: 'A extração vai começar em breve',
        color: 'bg-gray-500/10 text-gray-500', 
        iconClass: '' 
      },
      running: { 
        icon: Zap, 
        text: '🚀 Buscando leads...', 
        description: 'Estamos trabalhando para você',
        color: 'bg-blue-500/10 text-blue-500', 
        iconClass: 'animate-pulse' 
      },
      completed: { 
        icon: CheckCircle, 
        text: '✅ Pronto!', 
        description: 'Extração concluída com sucesso',
        color: 'bg-green-500/10 text-green-500', 
        iconClass: '' 
      },
      failed: { 
        icon: XCircle, 
        text: '❌ Algo deu errado', 
        description: 'A extração encontrou um problema',
        color: 'bg-red-500/10 text-red-500', 
        iconClass: '' 
      },
      cancelled: { 
        icon: AlertCircle, 
        text: '⚠️ Cancelado', 
        description: 'Você cancelou esta extração',
        color: 'bg-yellow-500/10 text-yellow-500', 
        iconClass: '' 
      },
      partial: { 
        icon: AlertCircle, 
        text: '⚠️ Parcialmente concluído', 
        description: 'Alguns leads foram extraídos',
        color: 'bg-yellow-500/10 text-yellow-500', 
        iconClass: '' 
      }
    };

    return statusMap[statistics.run_info.status as keyof typeof statusMap] || statusMap.pending;
  };

  if (loading && !statistics) {
    return (
      <div className={`h-screen flex items-center justify-center ${
        isDark ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0169D9] mx-auto mb-4" />
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
            Carregando detalhes...
          </p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center ${
        isDark ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className={`text-xl mb-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Extração não encontrada
        </h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
          Não conseguimos encontrar os dados desta extração
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159c9] transition-all"
          >
            Voltar para extrações
          </button>
        )}
      </div>
    );
  }

  const runInfo = statistics.run_info;
  const statusConfig = getStatusConfig();

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
      {/* Header */}
      <div className={`border-b shrink-0 ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-white border-border-light'
      }`}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/[0.05] text-white/70' : 'hover:bg-light-elevated text-text-secondary-light'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            {runInfo.status === 'running' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Cancelar Extração
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          {/* Header Card */}
          <div className={`rounded-xl border p-6 ${
            isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
          }`}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className={`text-2xl mb-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {runInfo.search_term} em {runInfo.location}
                </h1>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Iniciada em {new Date(runInfo.started_at || runInfo.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {runInfo.duration_formatted && ` • Duração: ${runInfo.duration_formatted}`}
                </p>
              </div>
              
              {statusConfig && (
                <div className={`inline-flex flex-col items-end gap-1`}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusConfig.color}`}>
                    <statusConfig.icon className={`w-5 h-5 ${statusConfig.iconClass}`} />
                    <span className="font-medium">{statusConfig.text}</span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                    {statusConfig.description}
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar com mensagem motivacional */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className={`w-4 h-4 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
                  <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                    {runInfo.captured} de {runInfo.target} leads capturados
                  </span>
                </div>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  {runInfo.taxa_sucesso.toFixed(1)}%
                </span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${
                isDark ? 'bg-white/[0.05]' : 'bg-gray-200'
              }`}>
                <div
                  className="h-full bg-gradient-to-r from-[#0169D9] to-blue-400 transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${Math.min(100, runInfo.taxa_sucesso)}%` }}
                >
                  {runInfo.status === 'running' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  )}
                </div>
              </div>
              {runInfo.status === 'running' && (
                <p className={`text-xs mt-2 text-center ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  Estamos trabalhando duro para encontrar os melhores leads para você! 💪
                </p>
              )}
              {runInfo.status === 'completed' && (
                <p className={`text-xs mt-2 text-center ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  Extração concluída com sucesso! Seus leads estão prontos. 🎉
                </p>
              )}
            </div>

            {/* Métricas em Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {metricsCards.map((metric, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all hover:scale-105 ${
                    isDark 
                      ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]' 
                      : 'bg-light-elevated border-border-light hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{metric.metric_icon}</span>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      {metric.metric_name}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-medium ${
                      metric.metric_value > 0 
                        ? isDark ? 'text-white' : 'text-text-primary-light'
                        : isDark ? 'text-white/30' : 'text-text-secondary-light'
                    }`}>
                      {metric.metric_value}
                    </p>
                    {metric.metric_percentage < 100 && (
                      <span className={`text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                        {metric.metric_percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo de Qualidade */}
          {statistics.metrics && (
            <div className={`rounded-xl border p-6 ${
              isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className={`w-5 h-5 ${isDark ? 'text-white' : 'text-text-primary-light'}`} />
                <h2 className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Qualidade dos Leads
                </h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg ${isDark ? 'bg-white/[0.02]' : 'bg-light-elevated'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    🏢 Empresas Identificadas
                  </p>
                  <p className={`text-xl font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {statistics.metrics.com_cnpj || 0}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                    {statistics.metrics.percentuais?.com_cnpj?.toFixed(1) || 0}% do total
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-white/[0.02]' : 'bg-light-elevated'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    📧 Com Email Disponível
                  </p>
                  <p className={`text-xl font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {statistics.metrics.com_email || 0}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                    {statistics.metrics.percentuais?.com_email?.toFixed(1) || 0}% do total
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-white/[0.02]' : 'bg-light-elevated'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    📱 Com WhatsApp
                  </p>
                  <p className={`text-xl font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {statistics.metrics.com_whatsapp || 0}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                    {statistics.metrics.percentuais?.com_whatsapp?.toFixed(1) || 0}% do total
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${isDark ? 'bg-white/[0.02]' : 'bg-light-elevated'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    🌐 Com Site
                  </p>
                  <p className={`text-xl font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {statistics.metrics.com_website || 0}
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                    {statistics.metrics.percentuais?.com_website?.toFixed(1) || 0}% do total
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline (Collapsible) */}
          {statistics.timeline && statistics.timeline.length > 0 && (
            <div className={`rounded-xl border ${
              isDark ? 'bg-elevated border-white/[0.08]' : 'bg-white border-border-light'
            }`}>
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                  isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-light-elevated'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${isDark ? 'text-white' : 'text-text-primary-light'}`} />
                  <h2 className={`font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    O que aconteceu? ({statistics.timeline.length} eventos)
                  </h2>
                </div>
                {showTimeline ? (
                  <ChevronUp className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
                )}
              </button>

              {showTimeline && (
                <div className="px-6 pb-6 space-y-3 max-h-96 overflow-y-auto">
                  {statistics.timeline.map((event: any, index: number) => {
                    const levelColors = {
                      info: isDark ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-500/10',
                      success: isDark ? 'text-green-400 bg-green-500/10' : 'text-green-600 bg-green-500/10',
                      warning: isDark ? 'text-yellow-400 bg-yellow-500/10' : 'text-yellow-600 bg-yellow-500/10',
                      error: isDark ? 'text-red-400 bg-red-500/10' : 'text-red-600 bg-red-500/10'
                    };

                    const colorClass = levelColors[event.level as keyof typeof levelColors] || levelColors.info;

                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-light-elevated border-border-light'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{event.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass}`}>
                                {event.step}
                              </span>
                              <span className={`text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                                {event.timestamp}
                              </span>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                              {event.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {(runInfo.status === 'completed' || runInfo.status === 'failed' || runInfo.status === 'cancelled') && onBack && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={onBack}
                className={`px-8 py-3 rounded-lg transition-all font-medium ${
                  isDark 
                    ? 'bg-white/[0.05] text-white hover:bg-white/[0.08]'
                    : 'bg-light-elevated text-text-primary-light hover:bg-gray-200'
                }`}
              >
                Voltar para Extrações
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
