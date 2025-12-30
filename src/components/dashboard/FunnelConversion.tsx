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
  // Validar se columns é um array
  const columns = Array.isArray(data?.columns) ? data.columns : [];
  
  // DEBUG: Log completo dos dados recebidos

  if (isLoading) {
    return <div className="animate-pulse bg-zinc-800 h-96 rounded-xl" />;
  }

  // Validar se há dados
  const hasColumns = columns.length > 0;
  const totalCount = columns.reduce((sum, col) => sum + col.count, 0);
  
  const maxCount = Math.max(...(columns.map(c => c.count) || [1]));

  return (
    <Card className={cn(
      "rounded-xl",
      isDark 
        ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
        : "bg-white border border-zinc-200"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          "text-xs font-medium uppercase tracking-wider",
          isDark ? "text-zinc-500" : "text-zinc-600"
        )}>
          🎯 Funil de Conversão (Kanban)
        </CardTitle>
        <p className={cn(
          "text-xs mt-0.5",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Taxa de conversão por etapa
        </p>
      </CardHeader>

      <CardContent className="pb-4">
        {!hasColumns ? (
          <div className="space-y-2">
            <p className={cn("text-sm text-center py-4", isDark ? "text-zinc-500" : "text-zinc-600")}>
              Nenhuma coluna de funil disponível
            </p>
          </div>
        ) : (
          <>
            {/* Aviso se não há leads */}
            {totalCount === 0 && (
              <div className={cn(
                "mb-4 p-3 rounded-lg border",
                isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"
              )}>
                <p className={cn("text-xs font-medium", isDark ? "text-yellow-400" : "text-yellow-700")}>
                  ⚠️ A função RPC está retornando contagens zeradas. Verifique se os leads foram associados ao funil correto.
                </p>
              </div>
            )}
            
            {/* Barras de Progresso por Etapa */}
            <div className="space-y-4">
              {columns.map((column, index) => {
                const percentage = data.summary.total_first_stage > 0 
                  ? (column.count / data.summary.total_first_stage) * 100 
                  : 0;
                
                const widthPercentage = maxCount > 0 ? (column.count / maxCount) * 100 : 0;

                return (
                  <div key={column.column_id}>
                    {/* Label da Etapa */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: column.color }}
                        />
                        <span className={cn(
                          "text-sm font-medium",
                          isDark ? "text-zinc-300" : "text-zinc-700"
                        )}>
                          {column.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-xs",
                          isDark ? "text-zinc-500" : "text-zinc-600"
                        )}>
                          {percentage.toFixed(1)}%
                        </span>
                        <span className={cn(
                          "text-lg font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}>
                          {column.count.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className={cn(
                      "h-8 rounded-lg overflow-hidden",
                      isDark ? "bg-zinc-900/50" : "bg-zinc-100"
                    )}>
                      <div 
                        className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ 
                          width: `${widthPercentage}%`,
                          backgroundColor: column.color,
                          minWidth: column.count > 0 ? '60px' : '0px'
                        }}
                      >
                        {column.count > 0 && (
                          <span className="text-xs font-medium text-white">
                            {column.count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Seta de Conversão */}
                    {index < columns.length - 1 && data.conversion_rates?.[index] && (
                      <div className="flex items-center justify-center py-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowDown className="w-3.5 h-3.5 text-orange-400" />
                          <span className={cn(
                            "text-xs font-medium",
                            data.conversion_rates[index].rate >= 50 ? "text-emerald-400" :
                            data.conversion_rates[index].rate >= 30 ? "text-yellow-400" :
                            "text-orange-400"
                          )}>
                            {data.conversion_rates[index].rate.toFixed(1)}% de conversão
                          </span>
                          <span className={cn(
                            "text-xs",
                            isDark ? "text-zinc-600" : "text-zinc-500"
                          )}>
                            ({data.conversion_rates[index].to_count} convertidos)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Resumo Final */}
            <Separator className={cn(
              "my-4",
              isDark ? "bg-white/[0.08]" : "bg-zinc-200"
            )} />

            <div className={cn(
              "p-3 rounded-lg",
              isDark ? "bg-zinc-900/50" : "bg-zinc-50"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn(
                    "text-xs",
                    isDark ? "text-zinc-500" : "text-zinc-600"
                  )}>
                    Taxa de Conversão Total
                  </p>
                  <p className={cn(
                    "text-2xl font-bold",
                    data.summary.total_conversion_rate > 0 ? "text-emerald-500" : "text-red-400"
                  )}>
                    {data.summary.total_conversion_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-xs",
                    isDark ? "text-zinc-500" : "text-zinc-600"
                  )}>
                    {columns[0]?.title} → {columns[columns.length - 1]?.title}
                  </p>
                  <p className={cn(
                    "text-sm font-medium mt-0.5",
                    isDark ? "text-zinc-300" : "text-zinc-700"
                  )}>
                    {data.summary.total_first_stage.toLocaleString('pt-BR')} leads no topo
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}