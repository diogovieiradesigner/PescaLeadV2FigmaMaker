import { useState, useMemo } from 'react';
import { 
  MessageSquare,
  Bot,
  User,
  Clock,
  ArrowUp,
  ArrowDown,
  Calendar,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '../ui/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { subDays } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// Hooks
import { useConversationsSummary } from '../../hooks/useConversationsSummary';
import { useAiVsHumanDistribution } from '../../hooks/useAiVsHumanDistribution';
import { useResponseTimeComparison } from '../../hooks/useResponseTimeComparison';
import { useAttendantsRanking } from '../../hooks/useAttendantsRanking';

// Types
import { ConversationsFilters } from '../../types/conversations.types';

interface ConversationsTabProps {
  isDark: boolean;
}

export function ConversationsTab({ isDark }: ConversationsTabProps) {
  const { currentWorkspace } = useAuth();
  const [periodDays, setPeriodDays] = useState('30');

  // Workspace ID do contexto
  const workspaceId = currentWorkspace?.id;

  // Calcular filtros baseado no período
  const filters: ConversationsFilters = useMemo(() => ({
    startDate: subDays(new Date(), parseInt(periodDays)),
    endDate: new Date(),
  }), [periodDays]);

  // Hooks de dados - só executa se tiver workspaceId
  const { data: summary, isLoading: loadingSummary, error: errorSummary } = useConversationsSummary(workspaceId, filters);
  const { data: distribution, isLoading: loadingDistribution, error: errorDistribution } = useAiVsHumanDistribution(workspaceId, filters);
  const { data: responseTime, isLoading: loadingResponseTime, error: errorResponseTime } = useResponseTimeComparison(workspaceId, filters);
  const { data: attendants, isLoading: loadingAttendants, error: errorAttendants } = useAttendantsRanking(workspaceId, filters, 5);

  // Verificar se há erros
  const hasError = errorSummary || errorDistribution || errorResponseTime || errorAttendants;

  // Loading state
  const isLoading = loadingSummary || loadingDistribution || loadingResponseTime || loadingAttendants;

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
            className={cn(
              "h-9 px-3 py-2 rounded-md text-sm border transition-colors",
              isDark
                ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                : "bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400"
            )}
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        <p className={cn("text-sm ml-auto", isDark ? "text-zinc-500" : "text-zinc-600")}>
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
              Erro ao carregar dados de conversas
            </p>
            <p className={cn('text-sm mt-1', isDark ? 'text-red-300' : 'text-red-600')}>
              Verifique se as funções RPC do Supabase estão configuradas corretamente.
            </p>
          </div>
        </div>
      )}

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Conversas Ativas */}
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
                isDark ? "bg-green-500/10" : "bg-green-50"
              )}>
                <MessageSquare className={cn(
                  "w-5 h-5",
                  isDark ? "text-green-400" : "text-green-600"
                )} />
              </div>
            </div>
            <p className={cn(
              "text-xs font-medium uppercase tracking-wider mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              💬 Ativas
            </p>
            <p className={cn(
              "text-3xl font-bold mb-2",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {summary?.active.value || 0}
            </p>
            <div className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              summary && summary.active.change_percent >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {summary && summary.active.change_percent >= 0 ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              <span>{summary?.active.change_percent >= 0 ? '+' : ''}{summary?.active.change_percent.toFixed(1)}%</span>
              <span className={cn("text-xs font-normal", isDark ? "text-zinc-600" : "text-zinc-500")}>
                vs período
              </span>
            </div>
          </CardContent>
        </Card>

        {/* I.A */}
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
                <Bot className={cn(
                  "w-5 h-5",
                  isDark ? "text-purple-400" : "text-purple-600"
                )} />
              </div>
            </div>
            <p className={cn(
              "text-xs font-medium uppercase tracking-wider mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              🤖 I.A
            </p>
            <p className={cn(
              "text-3xl font-bold mb-2",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {summary?.ai.value || 0}
            </p>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <span className={cn(isDark ? "text-zinc-400" : "text-zinc-600")}>
                ({summary?.ai.percentage || 0}%)
              </span>
              <span className={cn(
                "flex items-center gap-1",
                summary && summary.ai.change_percent >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {summary && summary.ai.change_percent >= 0 ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {summary?.ai.change_percent >= 0 ? '+' : ''}{summary?.ai.change_percent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Humano */}
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
                <User className={cn(
                  "w-5 h-5",
                  isDark ? "text-blue-400" : "text-blue-600"
                )} />
              </div>
            </div>
            <p className={cn(
              "text-xs font-medium uppercase tracking-wider mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              👤 Humano
            </p>
            <p className={cn(
              "text-3xl font-bold mb-2",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {summary?.human.value || 0}
            </p>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <span className={cn(isDark ? "text-zinc-400" : "text-zinc-600")}>
                ({summary?.human.percentage || 0}%)
              </span>
              <span className={cn(
                "flex items-center gap-1",
                summary && summary.human.change_percent >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {summary && summary.human.change_percent >= 0 ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {summary?.human.change_percent >= 0 ? '+' : ''}{summary?.human.change_percent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tempo de Resposta */}
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
                <Clock className={cn(
                  "w-5 h-5",
                  isDark ? "text-amber-400" : "text-amber-600"
                )} />
              </div>
            </div>
            <p className={cn(
              "text-xs font-medium uppercase tracking-wider mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              ⏱️ Tempo Resp
            </p>
            <p className={cn(
              "text-3xl font-bold mb-2",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {summary?.avg_response_time.value || 0}min
            </p>
            <div className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              summary?.avg_response_time.is_improvement ? "text-green-500" : "text-red-500"
            )}>
              {summary?.avg_response_time.is_improvement ? (
                <ArrowDown className="w-4 h-4" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
              <span>{summary?.avg_response_time.change_percent >= 0 ? '+' : ''}{summary?.avg_response_time.change_percent.toFixed(1)}%</span>
              <span className={cn("text-xs font-normal", isDark ? "text-zinc-600" : "text-zinc-500")}>
                {summary?.avg_response_time.is_improvement ? '(melhor)' : '(pior)'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: I.A vs Humano + Tempo Médio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* I.A vs Humano */}
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
              🤖 I.A vs 👤 Humano
            </CardTitle>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-zinc-400" : "text-zinc-500"
            )}>
              Distribuição de atendimento
            </p>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="flex items-center justify-center mb-6 w-full" style={{ height: '200px', minHeight: '200px' }}>
              <ResponsiveContainer width="100%" height={200} minHeight={200}>
                <PieChart>
                  <Pie
                    data={distribution?.chart_data || []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {(distribution?.chart_data || []).map((entry, index) => (
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
            <div className="space-y-3">
              {(distribution?.chart_data || []).map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={cn(
                      "text-sm font-medium",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {item.name === 'I.A' ? '🤖 I.A' : '👤 Humano'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {item.value}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      ({item.percentage}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className={cn(
              "my-4",
              isDark ? "bg-white/[0.08]" : "bg-zinc-200"
            )} />
            <div className="text-center">
              <p className={cn(
                "text-xs mb-1",
                isDark ? "text-zinc-500" : "text-zinc-600"
              )}>
                Taxa de Assunção
              </p>
              <p className={cn(
                "text-2xl font-bold",
                isDark ? "text-white" : "text-zinc-900"
              )}>
                {distribution?.metrics.assumption_rate || 0}%
              </p>
              <p className={cn(
                "text-xs mt-1",
                isDark ? "text-zinc-600" : "text-zinc-500"
              )}>
                ({distribution?.metrics.assumed.value || 0} conversas assumidas por humanos)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tempo Médio de Atendimento */}
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
              ⏱️ Tempo Médio de Atendimento
            </CardTitle>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-zinc-400" : "text-zinc-500"
            )}>
              Comparação I.A vs Humano
            </p>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="space-y-6">
              {/* I.A */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isDark ? "text-white" : "text-zinc-900"
                  )}>
                    🤖 I.A
                  </span>
                  <span className={cn(
                    "text-2xl font-bold text-green-500"
                  )}>
                    {responseTime?.ai.time_minutes || 0} min
                  </span>
                </div>
                <div className={cn(
                  "h-3 rounded-full overflow-hidden",
                  isDark ? "bg-zinc-800" : "bg-zinc-100"
                )}>
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${responseTime?.ai.bar_percentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Humano */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isDark ? "text-white" : "text-zinc-900"
                  )}>
                    👤 Humano
                  </span>
                  <span className={cn(
                    "text-2xl font-bold",
                    isDark ? "text-white" : "text-zinc-900"
                  )}>
                    {responseTime?.human.time_minutes || 0} min
                  </span>
                </div>
                <div className={cn(
                  "h-3 rounded-full overflow-hidden",
                  isDark ? "bg-zinc-800" : "bg-zinc-100"
                )}>
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${responseTime?.human.bar_percentage || 100}%` }}
                  />
                </div>
              </div>
            </div>

            <Separator className={cn(
              "my-6",
              isDark ? "bg-white/[0.08]" : "bg-zinc-200"
            )} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={cn(
                  "text-xs mb-1",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>
                  Conversas Assumidas
                </p>
                <p className={cn(
                  "text-xl font-bold",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {distribution?.metrics.assumed.value || 0}
                </p>
                <p className={cn(
                  "text-xs mt-0.5",
                  isDark ? "text-zinc-600" : "text-zinc-500"
                )}>
                  ({distribution?.metrics.assumed.percentage || 0}% do total)
                </p>
              </div>
              <div>
                <p className={cn(
                  "text-xs mb-1",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>
                  Conversas Arquivadas
                </p>
                <p className={cn(
                  "text-xl font-bold",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {distribution?.metrics.archived.value || 0}
                </p>
                <p className={cn(
                  "text-xs mt-0.5",
                  isDark ? "text-zinc-600" : "text-zinc-500"
                )}>
                  ({distribution?.metrics.archived.percentage || 0}% do total)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Atendentes */}
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
            🏆 Ranking de Atendentes
          </CardTitle>
          <p className={cn(
            "text-sm mt-1",
            isDark ? "text-zinc-400" : "text-zinc-500"
          )}>
            Performance individual por número de conversas
          </p>
        </CardHeader>
        <CardContent className="pb-6">
          {/* Tabela Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={cn(
                  "border-b",
                  isDark ? "border-zinc-800" : "border-zinc-200"
                )}>
                  <th className={cn(
                    "text-left py-3 px-4 text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-zinc-500" : "text-zinc-600"
                  )}>
                    Posição
                  </th>
                  <th className={cn(
                    "text-left py-3 px-4 text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-zinc-500" : "text-zinc-600"
                  )}>
                    Atendente
                  </th>
                  <th className={cn(
                    "text-left py-3 px-4 text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-zinc-500" : "text-zinc-600"
                  )}>
                    Conversas
                  </th>
                  <th className={cn(
                    "text-left py-3 px-4 text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-zinc-500" : "text-zinc-600"
                  )}>
                    Tempo Médio
                  </th>
                  <th className={cn(
                    "text-left py-3 px-4 text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-zinc-500" : "text-zinc-600"
                  )}>
                    Taxa Conversão
                  </th>
                </tr>
              </thead>
              <tbody>
                {(attendants?.attendants || []).map((attendant, index) => (
                  <tr 
                    key={attendant.id}
                    className={cn(
                      "border-b transition-colors cursor-pointer",
                      isDark 
                        ? "border-zinc-800 hover:bg-zinc-900/50" 
                        : "border-zinc-200 hover:bg-zinc-50"
                    )}
                  >
                    <td className="py-4 px-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                        index === 0 ? "bg-amber-500/20 text-amber-500" :
                        index === 1 ? "bg-zinc-400/20 text-zinc-400" :
                        index === 2 ? "bg-orange-500/20 text-orange-500" :
                        isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                      </div>
                    </td>
                    <td className={cn(
                      "py-4 px-4 font-medium",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {attendant.name}
                    </td>
                    <td className={cn(
                      "py-4 px-4",
                      isDark ? "text-zinc-300" : "text-zinc-700"
                    )}>
                      {attendant.conversations}
                    </td>
                    <td className={cn(
                      "py-4 px-4",
                      isDark ? "text-zinc-300" : "text-zinc-700"
                    )}>
                      {attendant.avg_time_minutes} min
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium",
                          isDark ? "text-green-400" : "text-green-600"
                        )}>
                          {attendant.conversion_rate}%
                        </span>
                        <span className={cn(
                          "text-xs",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>
                          ({attendant.converted}/{attendant.conversations})
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-4">
            {(attendants?.attendants || []).map((attendant, index) => (
              <div 
                key={attendant.id}
                className={cn(
                  "p-4 rounded-lg border",
                  isDark 
                    ? "bg-zinc-900/50 border-zinc-800" 
                    : "bg-zinc-50 border-zinc-200"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold",
                    index === 0 ? "bg-amber-500/20 text-amber-500 text-lg" :
                    index === 1 ? "bg-zinc-400/20 text-zinc-400 text-lg" :
                    index === 2 ? "bg-orange-500/20 text-orange-500 text-lg" :
                    isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"
                  )}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                  </div>
                  <p className={cn(
                    "font-medium text-lg",
                    isDark ? "text-white" : "text-zinc-900"
                  )}>
                    {attendant.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={cn(
                      "text-xs mb-1",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      Conversas
                    </p>
                    <p className={cn(
                      "font-bold",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {attendant.conversations}
                    </p>
                  </div>
                  <div>
                    <p className={cn(
                      "text-xs mb-1",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      Tempo Médio
                    </p>
                    <p className={cn(
                      "font-bold",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {attendant.avg_time_minutes} min
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className={cn(
                      "text-xs mb-1",
                      isDark ? "text-zinc-500" : "text-zinc-600"
                    )}>
                      Taxa de Conversão
                    </p>
                    <p className={cn(
                      "font-bold text-green-500"
                    )}>
                      {attendant.conversion_rate}% ({attendant.converted}/{attendant.conversations})
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}