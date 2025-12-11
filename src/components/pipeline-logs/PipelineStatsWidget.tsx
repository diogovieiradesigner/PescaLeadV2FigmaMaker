import { PipelineStats } from '../../types/pipeline-logs';
import { Card, CardContent } from '../ui/card';
import { cn } from '../ui/utils';
import { Activity, CheckCircle2, XCircle, Ban, Clock, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PipelineStatsWidgetProps {
  stats: PipelineStats | null;
  loading: boolean;
  isDark: boolean;
}

export function PipelineStatsWidget({ stats, loading, isDark }: PipelineStatsWidgetProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className={cn("h-24 animate-pulse", isDark ? "bg-zinc-900/50 border-white/10" : "bg-white border-zinc-200")} />
        ))}
      </div>
    );
  }

  const cardClass = isDark ? "bg-zinc-900/50 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900";
  const subTextClass = isDark ? "text-zinc-400" : "text-muted-foreground";

  // Prepare chart data
  const chartData = (stats?.pipelines_by_day || []).map(day => ({
    date: new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    success: day.success,
    error: day.error,
    total: day.total
  })).reverse();

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total / Success Rate */}
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className={cn("text-sm font-medium mb-1", subTextClass)}>Total de Execuções</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{stats?.total_pipelines || 0}</h3>
                <span className={cn("text-xs font-medium", (stats?.success_rate || 0) > 90 ? "text-green-500" : "text-yellow-500")}>
                  {(stats?.success_rate || 0).toFixed(1)}% sucesso
                </span>
              </div>
            </div>
            <div className={cn("p-3 rounded-full", isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")}>
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Success / Error Counts */}
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className={cn("text-sm font-medium mb-1", subTextClass)}>Status</p>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium">{stats?.success_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-medium">{stats?.error_count || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="font-medium">{stats?.blocked_count || 0}</span>
                </div>
              </div>
            </div>
            <div className={cn("p-3 rounded-full", isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600")}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className={cn("text-sm font-medium mb-1", subTextClass)}>Tempo Médio</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{((stats?.avg_duration_ms || 0) / 1000).toFixed(1)}s</h3>
              </div>
            </div>
            <div className={cn("p-3 rounded-full", isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600")}>
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Token Usage */}
        <Card className={cardClass}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className={cn("text-sm font-medium mb-1", subTextClass)}>Consumo de Tokens</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{((stats?.total_tokens || 0) / 1000).toFixed(1)}k</h3>
                <span className={cn("text-xs", subTextClass)}>
                  ~{Math.round(stats?.avg_tokens_per_pipeline || 0)}/req
                </span>
              </div>
            </div>
            <div className={cn("p-3 rounded-full", isDark ? "bg-yellow-500/10 text-yellow-400" : "bg-yellow-50 text-yellow-600")}>
              <Database className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart Section - Only visible if we have data */}
      {chartData.length > 0 && (
        <Card className={cn("h-48 w-full hidden sm:block", cardClass)}>
          <CardContent className="p-4 h-full">
            <div className="w-full h-full" style={{ minHeight: '160px' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={160}>
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    stroke={isDark ? "#52525b" : "#a1a1aa"} 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#18181b' : '#fff', 
                      borderColor: isDark ? '#27272a' : '#e4e4e7',
                      color: isDark ? '#fff' : '#000',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} barSize={20} />
                  <Bar dataKey="error" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
