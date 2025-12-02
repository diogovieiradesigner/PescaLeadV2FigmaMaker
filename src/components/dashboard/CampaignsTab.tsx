import { useState } from 'react';
import { Calendar, Filter, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../ui/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaignsTab } from '../../hooks/useCampaignsTab';
import { CampaignsStatsCards } from './campaigns/CampaignsStatsCards';
import { CampaignsRanking } from './campaigns/CampaignsRanking';
import { ResponseHeatmap } from './campaigns/ResponseHeatmap';

interface CampaignsTabProps {
  isDark: boolean;
}

// Skeleton para loading
function CampaignsTabSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl h-32 animate-pulse",
              isDark ? "bg-zinc-900/50" : "bg-zinc-200"
            )}
          />
        ))}
      </div>
      <div
        className={cn(
          "rounded-xl h-96 animate-pulse",
          isDark ? "bg-zinc-900/50" : "bg-zinc-200"
        )}
      />
      <div
        className={cn(
          "rounded-xl h-96 animate-pulse",
          isDark ? "bg-zinc-900/50" : "bg-zinc-200"
        )}
      />
    </div>
  );
}

// Estado de erro
function ErrorState({ isDark, message }: { isDark: boolean; message: string }) {
  return (
    <div className="max-w-[1600px] mx-auto">
      <div
        className={cn(
          "rounded-xl p-8 flex items-center justify-center gap-4 border",
          isDark
            ? "bg-red-500/10 border-red-500/20"
            : "bg-red-50 border-red-200"
        )}
      >
        <AlertCircle
          className={cn("w-6 h-6", isDark ? "text-red-400" : "text-red-600")}
        />
        <p
          className={cn(
            "text-sm font-medium",
            isDark ? "text-red-400" : "text-red-700"
          )}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

export function CampaignsTab({ isDark }: CampaignsTabProps) {
  const [periodDays, setPeriodDays] = useState(30);
  const [funnel, setFunnel] = useState('all');
  
  // Pegar workspace do contexto de autenticação
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id || '';

  const { data, isLoading, error } = useCampaignsTab({
    workspaceId,
    periodDays,
    rankingLimit: 10,
  });

  if (isLoading) {
    return <CampaignsTabSkeleton isDark={isDark} />;
  }

  if (error) {
    console.error('Erro na aba de campanhas:', error);
    return (
      <ErrorState
        isDark={isDark}
        message="Erro ao carregar dados de campanhas. Verifique o console para mais detalhes."
      />
    );
  }

  if (!data) {
    return (
      <ErrorState
        isDark={isDark}
        message="Nenhum dado disponível no momento."
      />
    );
  }

  const { stats_cards, ranking, response_heatmap } = data;

  // Verificar se os dados são válidos
  if (!stats_cards || !ranking || !response_heatmap) {
    console.error('Dados incompletos:', { stats_cards, ranking, response_heatmap });
    return (
      <ErrorState
        isDark={isDark}
        message="Dados incompletos retornados pelo servidor."
      />
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          <Calendar
            className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-zinc-600")}
          />
          <span
            className={cn(
              "text-sm font-medium",
              isDark ? "text-white" : "text-zinc-900"
            )}
          >
            Período:
          </span>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className={cn(
              "h-9 px-3 py-2 rounded-md text-sm border transition-colors",
              isDark
                ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                : "bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400"
            )}
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={15}>Últimos 15 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter
            className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-zinc-600")}
          />
          <span
            className={cn(
              "text-sm font-medium",
              isDark ? "text-white" : "text-zinc-900"
            )}
          >
            Funil:
          </span>
          <select
            value={funnel}
            onChange={(e) => setFunnel(e.target.value)}
            className={cn(
              "h-9 px-3 py-2 rounded-md text-sm border transition-colors",
              isDark
                ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                : "bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400"
            )}
          >
            <option value="all">Todos</option>
            <option value="vendas">Vendas</option>
            <option value="suporte">Suporte</option>
          </select>
        </div>

        <p
          className={cn(
            "text-sm ml-auto",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}
        >
          Comparando com: {stats_cards.period.comparison_start} a{' '}
          {stats_cards.period.comparison_end}
        </p>
      </div>

      {/* 4 Cards de Estatísticas */}
      <CampaignsStatsCards
        isDark={isDark}
        sent={stats_cards.sent}
        messages={stats_cards.messages}
        responseRate={stats_cards.response_rate}
        bestSlot={stats_cards.best_slot}
      />

      {/* Tabela de Ranking */}
      <CampaignsRanking isDark={isDark} campaigns={ranking.campaigns} />

      {/* Heatmap */}
      <ResponseHeatmap
        isDark={isDark}
        matrix={response_heatmap.matrix}
        bestSlot={response_heatmap.best_slot}
        avoidInsight={response_heatmap.avoid_insight}
        legend={response_heatmap.legend}
        hasData={response_heatmap.has_data}
      />
    </div>
  );
}