import { useState, useMemo } from 'react';
import { 
  Users, 
  ArrowUp, 
  ArrowDown,
  Target,
  Search,
  TrendingUp,
  Calendar,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { cn } from '../ui/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { subDays, format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Hooks
import { useLeadsSummary } from '../../hooks/useLeadsSummary';
import { useFunnelDetailed } from '../../hooks/useFunnelDetailed';
import { useLeadsByChannel } from '../../hooks/useLeadsByChannel';
import { useTopSourcesConversion } from '../../hooks/useTopSourcesConversion';
import { useLeadsCaptureEvolution } from '../../hooks/useLeadsCaptureEvolution';
import { useFunnels } from '../../hooks/useFunnels';

// Types
import { LeadsFilters } from '../../types/leads.types';

interface LeadsTabProps {
  isDark: boolean;
}

export function LeadsTab({ isDark }: LeadsTabProps) {
  const { currentWorkspace } = useAuth();
  const [periodDays, setPeriodDays] = useState('30');
  const [funnelId, setFunnelId] = useState<string | null>(null);

  // Workspace ID do contexto
  const workspaceId = currentWorkspace?.id;

  // Calcular filtros baseado no período
  const filters: LeadsFilters = useMemo(() => ({
    startDate: subDays(new Date(), parseInt(periodDays)),
    endDate: new Date(),
    funnelId,
  }), [periodDays, funnelId]);

  // Hooks de dados - só executa se tiver workspaceId
  const { data: summary, isLoading: loadingSummary, error: errorSummary } = useLeadsSummary(workspaceId || '', filters);
  const { data: funnelData, isLoading: loadingFunnel, error: errorFunnel } = useFunnelDetailed(workspaceId || '', filters);
  const { data: channelData, isLoading: loadingChannel, error: errorChannel } = useLeadsByChannel(workspaceId || '', filters);
  const { data: topSources, isLoading: loadingTopSources, error: errorTopSources } = useTopSourcesConversion(workspaceId || '', filters, 5);
  const { data: evolutionData, isLoading: loadingEvolution, error: errorEvolution } = useLeadsCaptureEvolution(workspaceId || '', 7);
  const { data: funnelsResult, isLoading: loadingFunnels, error: errorFunnels } = useFunnels(workspaceId);

  // Extrair lista de funis do resultado
  const funnelsList = funnelsResult?.funnels || [];

  // Normalizar funnelData para garantir que stages seja sempre um array
  const normalizedFunnelData = useMemo(() => {
    if (!funnelData) return null;
    
    // Se stages não for um array, converter ou retornar array vazio
    const stages = Array.isArray(funnelData.stages) 
      ? funnelData.stages 
      : [];
    
    return {
      ...funnelData,
      stages
    };
  }, [funnelData]);

  // DEBUG: Logs completos dos dados

  // Verificar se há erros
  const hasError = errorSummary || errorFunnel || errorChannel || errorTopSources || errorEvolution || errorFunnels || funnelsResult?.error;

  // Período de comparação formatado
  const comparisonText = summary?.period
    ? `Comparando com: ${new Date(summary.period.comparison_start).toLocaleDateString('pt-BR')} - ${new Date(summary.period.comparison_end).toLocaleDateString('pt-BR')}`
    : 'Comparando com: Período anterior';

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 py-2">
        <div className="flex items-center gap-2">
          <Calendar className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-zinc-600")} />
          <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-zinc-900")}>
            Período:
          </span>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
            style={isDark ? { colorScheme: 'dark' } : undefined}
            className={cn(
              "h-9 px-3 py-2 rounded-lg text-sm border transition-colors",
              isDark
                ? "bg-white/[0.05] border-white/[0.08] text-white hover:bg-white/[0.08]"
                : "bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400"
            )}
          >
            <option value="7" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 7 dias</option>
            <option value="15" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 15 dias</option>
            <option value="30" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 30 dias</option>
            <option value="90" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Últimos 90 dias</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-zinc-600")} />
          <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-zinc-900")}>
            Funil:
          </span>
          <select
            value={funnelId || 'all'}
            onChange={(e) => setFunnelId(e.target.value === 'all' ? null : e.target.value)}
            style={isDark ? { colorScheme: 'dark' } : undefined}
            className={cn(
              "h-9 px-3 py-2 rounded-lg text-sm border transition-colors",
              isDark
                ? "bg-white/[0.05] border-white/[0.08] text-white hover:bg-white/[0.08]"
                : "bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400"
            )}
          >
            <option value="all" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Todos</option>
            {funnelsList.map((funnel) => (
              <option key={funnel.id} value={funnel.id} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>{funnel.name}</option>
            ))}
          </select>
        </div>

        <p className={cn("text-xs ml-auto", isDark ? "text-zinc-500" : "text-zinc-600")}>
          {comparisonText}
        </p>
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
              Erro ao carregar dados de leads
            </p>
            <p className={cn('text-sm mt-1', isDark ? 'text-red-300' : 'text-red-600')}>
              {errorSummary?.message || errorFunnel?.message || errorChannel?.message || 'Verifique se as funções RPC do Supabase estão configuradas corretamente.'}
            </p>
          </div>
        </div>
      )}

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leads Captados */}
        <Card className={cn(
          "rounded-xl border-0",
          isDark 
            ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
            : "bg-white border border-zinc-200"
        )}>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-2.5 rounded-lg",
                isDark ? "bg-blue-500/10" : "bg-blue-50"
              )}>
                <Users className={cn(
                  "w-5 h-5",
                  isDark ? "text-blue-400" : "text-blue-600"
                )} />
              </div>
            </div>
            <p className={cn(
              "text-xs font-medium uppercase tracking-wider mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              📥 Captados
            </p>
            {loadingSummary ? (
              <div className="animate-pulse space-y-2">
                <div className="h-9 bg-zinc-700 rounded w-24" />
                <div className="h-4 bg-zinc-700 rounded w-32" />
              </div>
            ) : (
              <>
                <p className={cn(
                  "text-3xl font-bold mb-2",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {summary?.captured.value.toLocaleString('pt-BR')}
                </p>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  summary && summary.captured.change_percent >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {summary && summary.captured.change_percent >= 0 ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  <span>{summary?.captured.change_percent >= 0 ? '+' : ''}{summary?.captured.change_percent.toFixed(1)}%</span>
                  <span className={cn("text-xs font-normal", isDark ? "text-zinc-600" : "text-zinc-500")}>
                    vs período
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Por Etapa */}
        <Card className={cn(
          "rounded-xl border-0",
          isDark 
            ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
            : "bg-white border border-zinc-200"
        )}>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-2.5 rounded-lg",
                isDark ? "bg-purple-500/10" : "bg-purple-50"
              )}>
                <Target className={cn(
                  "w-5 h-5",
                  isDark ? "text-purple-400" : "text-purple-600"
                )} />
              </div>
            </div>
            <p className={cn(
              "text-xs font-medium uppercase tracking-wider mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              📊 Por Etapa
            </p>
            {loadingSummary ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-zinc-700 rounded w-full" />
                <div className="h-4 bg-zinc-700 rounded w-full" />
                <div className="h-4 bg-zinc-700 rounded w-full" />
              </div>
            ) : (
              <div className="space-y-1 mb-2">
                {summary?.by_stage.length === 0 ? (
                  <p className={cn("text-sm italic", isDark ? "text-zinc-600" : "text-zinc-500")}>
                    Sem etapas
                  </p>
                ) : (
                  summary?.by_stage.slice(0, 3).map((stage) => (
                    <p key={stage.name} className={cn("text-sm", isDark ? "text-zinc-400" : "text-zinc-600")}>
                      {stage.name}: <span className={cn("font-semibold", isDark ? "text-white" : "text-zinc-900")}>{stage.count}</span>
                    </p>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por Fonte */}
        <Card className={cn(
          "rounded-xl border-0",
          isDark 
            ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
            : "bg-white border border-zinc-200"
        )}>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-2.5 rounded-lg",
                isDark ? "bg-amber-500/10" : "bg-amber-50"
              )}>
                <Search className={cn(
                  "w-5 h-5",
                  isDark ? "text-amber-400" : "text-amber-600"
                )} />
              </div>
            </div>
            <p className={cn(
              "text-xs font-medium uppercase tracking-wider mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              🔍 Por Fonte
            </p>
            {loadingSummary ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-zinc-700 rounded w-full" />
                <div className="h-4 bg-zinc-700 rounded w-full" />
                <div className="h-4 bg-zinc-700 rounded w-full" />
              </div>
            ) : (
              <div className="space-y-1 mb-2">
                {summary?.by_source.length === 0 ? (
                  <p className={cn("text-sm italic", isDark ? "text-zinc-600" : "text-zinc-500")}>
                    Sem fontes
                  </p>
                ) : (
                  summary?.by_source.slice(0, 3).map((source) => (
                    <p key={source.name} className={cn("text-sm", isDark ? "text-zinc-400" : "text-zinc-600")}>
                      {source.name}: <span className={cn("font-semibold", isDark ? "text-white" : "text-zinc-900")}>{source.count}</span>
                    </p>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funil de Conversão Detalhado */}
      <Card className={cn(
        "rounded-xl",
        isDark 
          ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
          : "bg-white border border-zinc-200"
      )}>
        <CardHeader className="pb-4">
          <CardTitle className={cn(
            "text-xs font-medium uppercase tracking-wider",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            🎯 Funil de Conversão Detalhado
          </CardTitle>
          <p className={cn(
            "text-sm mt-1",
            isDark ? "text-zinc-400" : "text-zinc-500"
          )}>
            Taxa de conversão entre etapas
          </p>
        </CardHeader>
        <CardContent className="pb-6">
          {loadingFunnel ? (
            <div className="animate-pulse space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-6 bg-zinc-700 rounded w-48" />
                  <div className="h-8 bg-zinc-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {normalizedFunnelData?.stages.length === 0 && (
                <div className={cn(
                  "mb-4 p-3 rounded-lg border",
                  isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"
                )}>
                  <p className={cn("text-xs font-medium", isDark ? "text-yellow-400" : "text-yellow-700")}>
                    ⚠️ RPC retornou 0 etapas. Verifique se há dados no funil selecionado.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {(normalizedFunnelData?.stages || []).map((stage, index) => {
                  const maxCount = (normalizedFunnelData?.stages || [])[0]?.count || 1;
                  const barWidth = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={stage.title}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-sm font-medium",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          {stage.title}
                        </span>
                        <span className={cn(
                          "text-lg font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          {stage.count} leads
                        </span>
                      </div>
                      {/* Barra de progresso */}
                      <div className={cn(
                        "h-8 rounded-lg overflow-hidden",
                        isDark ? "bg-zinc-800/50" : "bg-zinc-100"
                      )}>
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center px-4 transition-all"
                          style={{ width: `${Math.max(barWidth, stage.count > 0 ? 10 : 0)}%` }}
                        >
                          {stage.count > 0 && (
                            <span className="text-xs font-medium text-white">
                              {stage.count}
                            </span>
                          )}
                        </div>
                      </div>
                      {stage.conversion_rate > 0 && (
                        <div className="flex items-center gap-2 text-sm mt-2">
                          <ArrowDown className="w-4 h-4 text-blue-500" />
                          <span className={cn(
                            isDark ? "text-zinc-400" : "text-zinc-600"
                          )}>
                            {stage.conversion_rate.toFixed(1)}% ({stage.converted_count} converteram)
                          </span>
                        </div>
                      )}
                      {index < (normalizedFunnelData?.stages.length || 0) - 1 && (
                        <Separator className={cn(
                          "mt-4",
                          isDark ? "bg-white/[0.08]" : "bg-zinc-200"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>

              {normalizedFunnelData && normalizedFunnelData.stages.length > 0 && (
                <>
                  <Separator className={cn(
                    "my-6",
                    isDark ? "bg-white/[0.08]" : "bg-zinc-200"
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center">
                      <p className={cn(
                        "text-xs mb-1",
                        isDark ? "text-zinc-500" : "text-zinc-600"
                      )}>
                        Taxa de Conversão Geral
                      </p>
                      <p className="text-2xl font-bold text-green-500">
                        {normalizedFunnelData.summary.conversion_rate.toFixed(1)}%
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        isDark ? "text-zinc-600" : "text-zinc-500"
                      )}>
                        ({normalizedFunnelData.stages[0]?.title} → {normalizedFunnelData.stages[normalizedFunnelData.stages.length - 1]?.title})
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        "text-xs mb-1",
                        isDark ? "text-zinc-500" : "text-zinc-600"
                      )}>
                        Tempo Médio no Funil
                      </p>
                      <p className={cn(
                        "text-2xl font-bold",
                        isDark ? "text-white" : "text-zinc-900"
                      )}>
                        {normalizedFunnelData.summary.avg_time_days} dias
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        isDark ? "text-zinc-600" : "text-zinc-500"
                      )}>
                        (Captação → Fechamento)
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Grid: Leads por Canal + Evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads por Canal */}
        <Card className={cn(
          "rounded-xl",
          isDark 
            ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
            : "bg-white border border-zinc-200"
        )}>
          <CardHeader className="pb-4">
            <CardTitle className={cn(
              "text-xs font-medium uppercase tracking-wider",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              📊 Leads por Canal
            </CardTitle>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-zinc-400" : "text-zinc-500"
            )}>
              Distribuição por canal de entrada
            </p>
          </CardHeader>
          <CardContent className="pb-6">
            {loadingChannel ? (
              <div className="animate-pulse space-y-4">
                <div className="h-48 bg-zinc-700 rounded-full mx-auto w-48" />
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-700 rounded" />
                  <div className="h-4 bg-zinc-700 rounded" />
                </div>
              </div>
            ) : (
              <>
                {channelData?.chart_data?.length === 0 && (
                  <div className={cn(
                    "mb-4 p-3 rounded-lg border",
                    isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"
                  )}>
                    <p className={cn("text-xs font-medium", isDark ? "text-yellow-400" : "text-yellow-700")}>
                      ⚠️ RPC retornou 0 canais. Verifique se há leads no período selecionado.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-center mb-6 w-full" style={{ height: '200px', minHeight: '200px' }}>
                  <ResponsiveContainer width="100%" height={200} minHeight={200}>
                    <PieChart>
                      <Pie
                        data={channelData?.chart_data || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {channelData?.chart_data?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDark ? '#18181b' : '#ffffff',
                          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e4e4e7',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: isDark ? '#ffffff' : '#18181b',
                        }}
                        labelStyle={{
                          color: isDark ? '#ffffff' : '#18181b',
                        }}
                        itemStyle={{
                          color: isDark ? '#e4e4e7' : '#3f3f46',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {channelData?.chart_data?.map((channel) => (
                    <div key={channel.name} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: channel.color }}
                      />
                      <div>
                        <p className={cn(
                          "text-sm font-medium",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          {channel.name}
                        </p>
                        <p className={cn(
                          "text-xs",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>
                          {channel.value} ({channel.percentage}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className={cn(
                  "my-4",
                  isDark ? "bg-white/[0.08]" : "bg-zinc-200"
                )} />
                <p className={cn(
                  "text-sm font-medium text-center",
                  isDark ? "text-zinc-400" : "text-zinc-600"
                )}>
                  Total: {channelData?.total.toLocaleString('pt-BR')} leads
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Evolução de Captação */}
        <Card className={cn(
          "rounded-xl",
          isDark 
            ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
            : "bg-white border border-zinc-200"
        )}>
          <CardHeader className="pb-4">
            <CardTitle className={cn(
              "text-xs font-medium uppercase tracking-wider",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              📈 Evolução de Captação
            </CardTitle>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-zinc-400" : "text-zinc-500"
            )}>
              Últimos 7 dias
            </p>
          </CardHeader>
          <CardContent className="pb-6">
            {loadingEvolution ? (
              <div className="animate-pulse space-y-4">
                <div className="h-48 bg-zinc-700 rounded" />
              </div>
            ) : (
              <>
                {evolutionData?.evolution?.length === 0 && (
                  <div className={cn(
                    "mb-4 p-3 rounded-lg border",
                    isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"
                  )}>
                    <p className={cn("text-xs font-medium", isDark ? "text-yellow-400" : "text-yellow-700")}>
                      ⚠️ RPC retornou 0 dias de evolução. Verifique se há captações recentes.
                    </p>
                  </div>
                )}

                <div className="w-full" style={{ height: '250px', minHeight: '250px' }}>
                  <ResponsiveContainer width="100%" height={250} minHeight={250}>
                    <BarChart data={evolutionData?.evolution || []}>
                    <XAxis 
                      dataKey="day_short" 
                      stroke={isDark ? '#52525b' : '#a1a1aa'}
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke={isDark ? '#52525b' : '#a1a1aa'}
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 'dataMax + 20']}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#18181b' : '#ffffff',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e4e4e7',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                      formatter={(value) => [`${value} leads`, 'Captados']}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                  </ResponsiveContainer>
                </div>

                <Separator className={cn(
                  "my-4",
                  isDark ? "bg-white/[0.08]" : "bg-zinc-200"
                )} />
                <p className={cn(
                  "text-sm font-medium text-center",
                  isDark ? "text-zinc-400" : "text-zinc-600"
                )}>
                  Total: {evolutionData?.total.toLocaleString('pt-BR')} leads
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Fontes com Melhor Conversão */}
      <Card className={cn(
        "rounded-xl",
        isDark 
          ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
          : "bg-white border border-zinc-200"
      )}>
        <CardHeader className="pb-4">
          <CardTitle className={cn(
            "text-xs font-medium uppercase tracking-wider",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            🏆 Top 5 Fontes com Melhor Conversão
          </CardTitle>
          <p className={cn(
            "text-sm mt-1",
            isDark ? "text-zinc-400" : "text-zinc-500"
          )}>
            Ranking por taxa de conversão até fechamento
          </p>
        </CardHeader>
        <CardContent className="pb-6">
          {loadingTopSources ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-700 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-700 rounded w-3/4" />
                    <div className="h-3 bg-zinc-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {topSources?.sources?.length === 0 && (
                <div className={cn(
                  "mb-4 p-3 rounded-lg border",
                  isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"
                )}>
                  <p className={cn("text-xs font-medium", isDark ? "text-yellow-400" : "text-yellow-700")}>
                    ⚠️ RPC retornou 0 fontes. Verifique se há leads com fontes cadastradas.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {topSources?.sources?.map((source, index) => (
                  <div key={source.name}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0",
                        index === 0 ? "bg-amber-500/20 text-amber-500" :
                        index === 1 ? "bg-zinc-400/20 text-zinc-400" :
                        index === 2 ? "bg-orange-500/20 text-orange-500" :
                        isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {source.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium mb-1",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          {source.name}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            {source.conversion_rate}% conversão
                          </Badge>
                          <span className={cn(
                            "text-xs",
                            isDark ? "text-zinc-500" : "text-zinc-600"
                          )}>
                            ({source.converted}/{source.total})
                          </span>
                        </div>
                      </div>
                    </div>
                    {index < (topSources?.sources?.length || 0) - 1 && (
                      <Separator className={cn(
                        "mt-4",
                        isDark ? "bg-white/[0.08]" : "bg-zinc-200"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}