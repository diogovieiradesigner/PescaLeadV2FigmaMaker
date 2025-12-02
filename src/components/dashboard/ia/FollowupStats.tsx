import { Clock } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { cn } from '../../ui/utils';
import { FollowupStatsData } from '../../../types/ia-tab.types';

interface FollowupStatsProps {
  isDark: boolean;
  data: FollowupStatsData;
}

export function FollowupStats({ isDark, data }: FollowupStatsProps) {
  if (!data.has_data || data.total_sent === 0) {
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
            <span className="text-lg">🤖</span> FOLLOW-UPS AUTOMÁTICOS
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
          <span className="text-lg">🤖</span> FOLLOW-UPS AUTOMÁTICOS
        </h3>
        
        {/* 3 Cards de estatísticas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <p className={cn(
              "text-sm",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              Total Enviados
            </p>
            <p className={cn(
              "text-3xl font-bold mt-1",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {data.total_sent.toLocaleString()}
            </p>
          </div>
          
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <p className={cn(
              "text-sm",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              Geraram Resposta
            </p>
            <p className={cn(
              "text-3xl font-bold mt-1",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {data.with_response.value}
              <span className={cn(
                "text-lg ml-1",
                isDark ? "text-zinc-500" : "text-zinc-600"
              )}>
                ({data.with_response.percentage.toFixed(1)}%)
              </span>
            </p>
          </div>
          
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <p className={cn(
              "text-sm",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              Sem Resposta
            </p>
            <p className={cn(
              "text-3xl font-bold mt-1",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {data.without_response.value.toLocaleString()}
              <span className={cn(
                "text-lg ml-1",
                isDark ? "text-zinc-500" : "text-zinc-600"
              )}>
                ({data.without_response.percentage.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>
        
        {/* Categorias mais usadas */}
        {data.categories && data.categories.length > 0 && (
          <div className="mb-6">
            <h4 className={cn(
              "text-sm font-medium mb-4",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              Categorias Mais Usadas:
            </h4>
            <div className="space-y-3">
              {data.categories.map((cat) => (
                <div 
                  key={cat.position}
                  className={cn(
                    "flex items-center justify-between rounded-lg p-3",
                    isDark ? "bg-zinc-800/30" : "bg-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-sm",
                      isDark ? "bg-zinc-700 text-zinc-400" : "bg-zinc-200 text-zinc-600"
                    )}>
                      {cat.position}
                    </span>
                    <span className={cn(
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {cat.name}
                    </span>
                  </div>
                  <span className={cn(
                    isDark ? "text-zinc-400" : "text-zinc-600"
                  )}>
                    {cat.sent} envios
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Tempo médio */}
        <div className={cn(
          "flex items-center gap-2 rounded-lg p-4",
          isDark ? "bg-zinc-800/30" : "bg-zinc-100"
        )}>
          <Clock className={cn(
            "w-5 h-5",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )} />
          <span className={cn(
            isDark ? "text-zinc-400" : "text-zinc-600"
          )}>
            Tempo Médio até Resposta (quando responde):
          </span>
          <span className={cn(
            "font-medium ml-auto",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            {data.avg_response_time_hours.toFixed(1)} horas
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
