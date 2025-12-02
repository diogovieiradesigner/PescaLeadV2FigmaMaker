import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { EngagementHeatmap as HeatmapType } from '../../types/dashboard.types';
import { Lightbulb } from 'lucide-react';
import { cn } from '../ui/utils';

interface EngagementHeatmapProps {
  data: HeatmapType;
  isLoading?: boolean;
  isDark?: boolean;
}

const DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
const HOURS = ['00h', '03h', '06h', '09h', '12h', '15h', '18h', '21h'];

// Mapeia dow para o índice correto (0=DOM, 1=SEG, etc.)
const DOW_MAP: Record<number, string> = {
  0: 'DOM',
  1: 'SEG',
  2: 'TER',
  3: 'QUA',
  4: 'QUI',
  5: 'SEX',
  6: 'SAB',
};

export function EngagementHeatmap({ data, isLoading, isDark = true }: EngagementHeatmapProps) {
  if (isLoading) {
    return <div className="animate-pulse bg-zinc-800 h-96 rounded-xl" />;
  }

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return isDark ? 'bg-zinc-800' : 'bg-zinc-200';
      case 1: return isDark ? 'bg-zinc-700' : 'bg-zinc-300';
      case 2: return 'bg-amber-600';
      case 3: return 'bg-green-600';
      case 4: return 'bg-green-500';
      default: return isDark ? 'bg-zinc-800' : 'bg-zinc-200';
    }
  };

  // Reorganizar para SEG-DOM
  const orderedDays = [1, 2, 3, 4, 5, 6, 0]; // SEG=1, ..., DOM=0

  return (
    <Card className={cn(
      "rounded-xl",
      isDark 
        ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
        : "bg-white border border-zinc-200"
    )}>
      <CardHeader className="pb-4">
        <CardTitle className={cn(
          "text-xs font-medium uppercase tracking-wider flex items-center gap-2",
          isDark ? "text-zinc-500" : "text-zinc-600"
        )}>
          <span className="w-2 h-2 rounded-full bg-green-500" />
          📈 Melhor Horário para Engajamento (Heatmap)
        </CardTitle>
        <p className={cn(
          "text-sm mt-1",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Taxa de resposta por dia e horário
        </p>
      </CardHeader>

      <CardContent className="pb-6">
        {/* Grid do Heatmap */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header com horas */}
            <div className="flex">
              <div className="w-12" /> {/* Espaço para labels dos dias */}
              {HOURS.map((hour) => (
                <div key={hour} className={cn(
                  "flex-1 text-center text-xs pb-2",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>
                  {hour}
                </div>
              ))}
            </div>

            {/* Linhas do heatmap */}
            {orderedDays.map((dow) => (
              <div key={dow} className="flex items-center mb-1">
                <div className={cn(
                  "w-12 text-xs",
                  isDark ? "text-zinc-500" : "text-zinc-600"
                )}>
                  {DOW_MAP[dow]}
                </div>
                <div className="flex-1 flex gap-1">
                  {Array.from({ length: 8 }).map((_, hourIndex) => {
                    const hour = hourIndex * 3;
                    const cell = data.heatmap?.[dow]?.[hour];
                    const level = cell?.level || 0;

                    return (
                      <div
                        key={hourIndex}
                        className={cn(
                          'flex-1 h-8 rounded',
                          getLevelColor(level)
                        )}
                        title={`${DOW_MAP[dow]} ${hour}h: ${cell?.value || 0} mensagens`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs">
          {data.legend.map((item) => (
            <div key={item.level} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded', getLevelColor(item.level))} />
              <span className={cn(isDark ? "text-zinc-500" : "text-zinc-600")}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Insight */}
        {data.insight && (
          <div className={cn(
            "mt-4 p-3 rounded-lg flex items-center gap-2",
            isDark ? "bg-zinc-800" : "bg-zinc-100"
          )}>
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-green-400">
              💡 Insight: {data.insight}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}