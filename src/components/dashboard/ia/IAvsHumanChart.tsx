import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { cn } from '../../ui/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { IAvsHumanData } from '../../../types/ia-tab.types';

interface IAvsHumanChartProps {
  isDark: boolean;
  data: IAvsHumanData;
}

export function IAvsHumanChart({ isDark, data }: IAvsHumanChartProps) {
  if (!data.has_data || data.total === 0) {
    return (
      <Card className={cn(
        "rounded-xl border-0",
        isDark 
          ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
          : "bg-white border border-zinc-200"
      )}>
        <CardContent className="pt-6 pb-6">
          <h3 className={cn(
            "text-xs font-medium uppercase tracking-wider mb-6 flex items-center gap-2",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            <BarChart3 className="w-4 h-4" /> MENSAGENS I.A VS HUMANO
          </h3>
          <div className="flex items-center justify-center h-48">
            <p className={cn("text-sm", isDark ? "text-zinc-600" : "text-zinc-500")}>
              Nenhum dado disponível
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "rounded-xl border-0",
      isDark 
        ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
        : "bg-white border border-zinc-200"
    )}>
      <CardContent className="pt-6 pb-6">
        <h3 className={cn(
          "text-xs font-medium uppercase tracking-wider mb-6 flex items-center gap-2",
          isDark ? "text-zinc-500" : "text-zinc-600"
        )}>
          <BarChart3 className="w-4 h-4" /> MENSAGENS I.A VS HUMANO
        </h3>
        
        <div className="flex items-center gap-8">
          {/* Gráfico Pizza */}
          <div className="flex-shrink-0">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={data.chart_data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {data.chart_data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
                    borderRadius: '8px',
                    color: isDark ? '#ffffff' : '#18181b'
                  }}
                  formatter={(value: number) => value.toLocaleString()}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legenda lateral */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <span className={cn(
                "font-medium",
                isDark ? "text-white" : "text-zinc-900"
              )}>
                I.A {data.ia.percentage.toFixed(1)}%
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <span className={cn(
                isDark ? "text-zinc-400" : "text-zinc-600"
              )}>
                Humano {data.human.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Legenda inferior detalhada */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: data.ia.color }}
              />
              <span className={cn(
                "text-sm",
                isDark ? "text-zinc-400" : "text-zinc-600"
              )}>
                🤖 I.A
              </span>
            </div>
            <span className={cn(
              "text-sm font-medium",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {data.ia.value.toLocaleString()} ({data.ia.percentage.toFixed(1)}%)
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: data.human.color }}
              />
              <span className={cn(
                "text-sm",
                isDark ? "text-zinc-400" : "text-zinc-600"
              )}>
                👤 Humano
              </span>
            </div>
            <span className={cn(
              "text-sm font-medium",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {data.human.value.toLocaleString()} ({data.human.percentage.toFixed(1)}%)
            </span>
          </div>
          
          <div className={cn(
            "flex items-center justify-between pt-2 border-t",
            isDark ? "border-zinc-800" : "border-zinc-200"
          )}>
            <span className={cn(
              "text-sm",
              isDark ? "text-zinc-400" : "text-zinc-600"
            )}>
              Total
            </span>
            <span className={cn(
              "text-sm font-medium",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {data.total.toLocaleString()} mensagens
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
