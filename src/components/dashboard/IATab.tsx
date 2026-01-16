import { useState } from 'react';
import { Calendar, Filter, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../ui/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useIATab } from '../../hooks/useIATab';

// Componentes
import { IAStatsCards } from './ia/IAStatsCards';
import { IAvsHumanChart } from './ia/IAvsHumanChart';
import { IASuccessDetailed } from './ia/IASuccessDetailed';
import { FollowupStats } from './ia/FollowupStats';
import { TimeSavingsSection } from './ia/TimeSavingsSection';

interface IATabProps {
  isDark: boolean;
}

export function IATab({ isDark }: IATabProps) {
  const [periodDays, setPeriodDays] = useState(30);
  const [minutesPerAIMsg] = useState(2);
  const [minutesPerFollowup] = useState(3);
  const [hourlyRate] = useState(25.00);
  
  // Pegar workspace do contexto de autenticação
  const { currentWorkspace } = useAuth();
  const workspaceId = currentWorkspace?.id || '';

  const { data, isLoading, error } = useIATab({
    workspaceId,
    periodDays,
    minutesPerAIMsg,
    minutesPerFollowup,
    hourlyRate,
  });

  // Estado de loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Loader2 className={cn(
            "w-6 h-6 animate-spin",
            isDark ? "text-zinc-400" : "text-zinc-600"
          )} />
          <p className={cn(
            isDark ? "text-zinc-400" : "text-zinc-600"
          )}>
            Carregando dados de I.A...
          </p>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className={cn(
        "rounded-xl p-6 border",
        isDark 
          ? "bg-red-500/10 border-red-500/20" 
          : "bg-red-50 border-red-200"
      )}>
        <div className="flex items-center gap-3">
          <AlertCircle className={cn(
            "w-6 h-6",
            isDark ? "text-red-400" : "text-red-600"
          )} />
          <div>
            <p className={cn(
              "font-medium",
              isDark ? "text-red-400" : "text-red-900"
            )}>
              Erro ao carregar dados
            </p>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-red-400/80" : "text-red-700"
            )}>
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sem dados
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={cn(
          isDark ? "text-zinc-400" : "text-zinc-600"
        )}>
          Nenhum dado disponível
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(
            "text-2xl font-bold",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            🤖 I.A & Automação
          </h2>
          <p className={cn(
            "text-sm mt-1",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            Análise de performance da inteligência artificial
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Período */}
          <div className="flex items-center gap-2">
            <Calendar className={cn(
              "w-4 h-4",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )} />
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              style={isDark ? { colorScheme: 'dark' } : undefined}
              className={cn(
                "px-3 py-2 rounded-lg text-sm border",
                isDark
                  ? "bg-zinc-800 border-zinc-700 text-white"
                  : "bg-white border-zinc-300 text-zinc-900"
              )}
            >
              <option value={7} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 7 dias</option>
              <option value={15} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 15 dias</option>
              <option value={30} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 30 dias</option>
              <option value={90} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 90 dias</option>
            </select>
          </div>

          {/* Filtro (placeholder) */}
          <button
            className={cn(
              "px-3 py-2 rounded-lg text-sm border flex items-center gap-2",
              isDark
                ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                : "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50"
            )}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>
      </div>

      {/* Seção 1: 4 Cards principais */}
      <IAStatsCards
        isDark={isDark}
        msgsIA={data.stats_cards.msgs_ia}
        followups={data.stats_cards.followups}
        successRate={{
          value: data.stats_cards.success_rate.value,
          change_pp: data.stats_cards.success_rate.change_pp,
        }}
        timeSaved={{
          hours: data.stats_cards.time_saved.hours,
          change_percent: data.stats_cards.time_saved.change_percent,
        }}
      />

      {/* Seção 2: Gráfico Pizza + Taxa de Sucesso Detalhada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IAvsHumanChart
          isDark={isDark}
          data={data.ia_vs_human}
        />
        
        <IASuccessDetailed
          isDark={isDark}
          data={data.success_rate}
        />
      </div>

      {/* Seção 3: Follow-ups Automáticos */}
      <FollowupStats
        isDark={isDark}
        data={data.followup_stats}
      />

      {/* Seção 4: Economia de Tempo */}
      <TimeSavingsSection
        isDark={isDark}
        data={data.time_savings}
      />
    </div>
  );
}
