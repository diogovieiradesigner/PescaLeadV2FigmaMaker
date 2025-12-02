import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { FunnelAnalytics } from '../../types/dashboard.types';
import { ArrowDown } from 'lucide-react';
import { cn } from '../ui/utils';

interface FunnelConversionProps {
  data: FunnelAnalytics;
  isLoading?: boolean;
  isDark?: boolean;
}

export function FunnelConversion({ data, isLoading, isDark = true }: FunnelConversionProps) {
  if (isLoading) {
    return <div className="animate-pulse bg-zinc-800 h-96 rounded-xl" />;
  }

  return (
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
          🎯 Funil de Conversão (Kanban)
        </CardTitle>
        <p className={cn(
          "text-sm mt-1",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Taxa de conversão por etapa
        </p>
      </CardHeader>

      <CardContent className="pb-6">
        {data.columns.length === 0 ? (
          <p className={cn("text-sm text-center py-8", isDark ? "text-zinc-500" : "text-zinc-600")}>
            Nenhum dado de funil disponível
          </p>
        ) : (
          <>
            <div className="space-y-6">
              {data.columns.map((column, index) => {
                const conversionRate = data.conversion_rates.find(
                  (cr) => cr.from_position === column.position
                );

                return (
                  <div key={column.column_id}>
                    {/* Etapa */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-sm font-medium",
                        isDark ? "text-white" : "text-zinc-900"
                      )}>
                        {column.title}
                      </span>
                      <span className={cn(
                        "text-lg font-bold tabular-nums",
                        isDark ? "text-white" : "text-zinc-900"
                      )}>
                        {column.count.toLocaleString('pt-BR')} leads
                      </span>
                    </div>

                    {/* Barra de progresso */}
                    <div className={cn(
                      "h-8 rounded-lg overflow-hidden",
                      isDark ? "bg-zinc-800/50" : "bg-zinc-100"
                    )}>
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center px-4 transition-all"
                        style={{ 
                          width: `${data.summary.total_first_stage > 0 ? (column.count / data.summary.total_first_stage) * 100 : 0}%` 
                        }}
                      >
                        <span className="text-xs font-medium text-white">
                          {column.count}
                        </span>
                      </div>
                    </div>

                    {/* Taxa de conversão para próxima etapa */}
                    {conversionRate && (
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <ArrowDown className="w-4 h-4 text-blue-500" />
                        <span className={cn(isDark ? "text-zinc-400" : "text-zinc-600")}>
                          {conversionRate.rate.toFixed(1)}% ({conversionRate.to_count} converteram)
                        </span>
                      </div>
                    )}

                    {/* Divisor */}
                    {index < data.columns.length - 1 && (
                      <Separator className={cn(
                        "mt-4",
                        isDark ? "bg-white/[0.08]" : "bg-zinc-200"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Conversão Total */}
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
                  {data.summary.total_conversion_rate.toFixed(1)}%
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  isDark ? "text-zinc-600" : "text-zinc-500"
                )}>
                  ({data.columns[0]?.title} → {data.columns[data.columns.length - 1]?.title})
                </p>
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-xs mb-1",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>
                  Leads no Funil
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {data.summary.total_first_stage.toLocaleString('pt-BR')}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  isDark ? "text-zinc-600" : "text-zinc-500"
                )}>
                  Total no início
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}