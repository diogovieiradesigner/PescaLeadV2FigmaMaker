import { useState, useMemo } from 'react';
import { Calendar, Filter, AlertCircle } from 'lucide-react';
import { cn } from '../ui/utils';
import { subDays } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Hooks
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { useLeadsByChannel } from '../../hooks/useLeadsByChannel';
import { useFunnelAnalytics } from '../../hooks/useFunnelAnalytics';
import { useEngagementHeatmap } from '../../hooks/useEngagementHeatmap';
import { useTopRankings } from '../../hooks/useTopRankings';

// Componentes
import { StatCards } from './StatCards';
import { LeadsByChannelChart } from './LeadsByChannelChart';
import { FunnelConversion } from './FunnelConversion';
import { EngagementHeatmap } from './EngagementHeatmap';
import { TopCampaigns } from './TopCampaigns';
import { TopLeadsEngaged } from './TopLeadsEngaged';

// Types
import { DashboardFilters } from '../../types/dashboard.types';

interface OverviewTabProps {
  isDark: boolean;
}

export function OverviewTab({ isDark }: OverviewTabProps) {
  const { currentWorkspace } = useAuth();
  const [periodDays, setPeriodDays] = useState('30');
  const [funnelFilter, setFunnelFilter] = useState<'all' | 'inbound' | 'outbound'>('all');

  // Workspace ID do contexto
  const workspaceId = currentWorkspace?.id;

  // Calcular filtros baseado no período
  const filters: DashboardFilters = useMemo(() => ({
    startDate: subDays(new Date(), parseInt(periodDays)),
    endDate: new Date(),
    funnelFilter,
  }), [periodDays, funnelFilter]);

  // Hooks de dados - só executa se tiver workspaceId
  const { data: summary, isLoading: loadingSummary, error: errorSummary } = useDashboardSummary(workspaceId || '', filters);
  const { data: channelData, isLoading: loadingChannel, error: errorChannel } = useLeadsByChannel(workspaceId || '', filters);
  const { data: funnelData, isLoading: loadingFunnel, error: errorFunnel } = useFunnelAnalytics(workspaceId || '', filters);
  const { data: heatmapData, isLoading: loadingHeatmap, error: errorHeatmap } = useEngagementHeatmap(workspaceId || '', filters);
  const { data: rankings, isLoading: loadingRankings, error: errorRankings } = useTopRankings(workspaceId || '', filters);

  // Verificar se há erros
  const hasError = errorSummary || errorChannel || errorFunnel || errorHeatmap || errorRankings;

  // Handler para abrir conversa
  const handleOpenConversation = (conversationId: string) => {
    // TODO: Implementar navegação para a conversa (mudança de aba)
  };

  // Período de comparação formatado
  const comparisonText = summary?.period
    ? `Comparando com: ${new Date(summary.period.comparison_start).toLocaleDateString('pt-BR')} - ${new Date(summary.period.comparison_end).toLocaleDateString('pt-BR')}`
    : '';

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          <Calendar className={cn('w-4 h-4', isDark ? 'text-zinc-400' : 'text-zinc-600')} />
          <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
            Período:
          </span>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
            style={isDark ? { colorScheme: 'dark' } : undefined}
            className={cn(
              'h-9 px-3 py-2 rounded-lg text-sm border transition-colors',
              isDark
                ? 'bg-white/[0.05] border-white/[0.08] text-white hover:bg-white/[0.08]'
                : 'bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400'
            )}
          >
            <option value="7" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 7 dias</option>
            <option value="15" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 15 dias</option>
            <option value="30" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 30 dias</option>
            <option value="90" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 90 dias</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className={cn('w-4 h-4', isDark ? 'text-zinc-400' : 'text-zinc-600')} />
          <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
            Funil:
          </span>
          <select
            value={funnelFilter}
            onChange={(e) => setFunnelFilter(e.target.value as 'all' | 'inbound' | 'outbound')}
            style={isDark ? { colorScheme: 'dark' } : undefined}
            className={cn(
              'h-9 px-3 py-2 rounded-lg text-sm border transition-colors',
              isDark
                ? 'bg-white/[0.05] border-white/[0.08] text-white hover:bg-white/[0.08]'
                : 'bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400'
            )}
          >
            <option value="all" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Todos</option>
            <option value="inbound" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Inbound</option>
            <option value="outbound" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Outbound</option>
          </select>
        </div>

        {comparisonText && (
          <p className={cn('text-xs ml-auto', isDark ? 'text-zinc-500' : 'text-zinc-600')}>
            {comparisonText}
          </p>
        )}
      </div>

      {/* Mensagem de Erro Global */}
      {hasError && (
        <div className={cn(
          'p-4 rounded-lg border flex items-start gap-3',
          isDark 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-red-50 border-red-200'
        )}>
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className={cn('font-medium', isDark ? 'text-red-400' : 'text-red-700')}>
              Erro ao carregar dados do dashboard
            </p>
            <p className={cn('text-sm mt-1', isDark ? 'text-red-300' : 'text-red-600')}>
              Verifique se as funções RPC do Supabase estão configuradas corretamente.
            </p>
          </div>
        </div>
      )}

      {/* Cards Principais */}
      {summary && (
        <StatCards cards={summary.cards} isLoading={loadingSummary} isDark={isDark} />
      )}

      {/* Grid: Leads por Canal + Funil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {channelData && (
          <LeadsByChannelChart data={channelData} isLoading={loadingChannel} isDark={isDark} />
        )}
        {funnelData && (
          <FunnelConversion data={funnelData} isLoading={loadingFunnel} isDark={isDark} />
        )}
      </div>

      {/* Heatmap */}
      {heatmapData && (
        <EngagementHeatmap data={heatmapData} isLoading={loadingHeatmap} isDark={isDark} />
      )}

      {/* Grid: Top Campanhas + Top Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rankings && (
          <>
            <TopCampaigns 
              campaigns={rankings.campaigns || []} 
              isLoading={loadingRankings}
              isDark={isDark}
            />
            <TopLeadsEngaged 
              leads={rankings.leads_engaged || []} 
              isLoading={loadingRankings}
              isDark={isDark}
              onOpenConversation={handleOpenConversation}
            />
          </>
        )}
      </div>
    </div>
  );
}