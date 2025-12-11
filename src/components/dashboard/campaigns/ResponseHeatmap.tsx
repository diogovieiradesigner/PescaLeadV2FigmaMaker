import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { cn } from '../../ui/utils';

interface HeatmapSlot {
  hour: string;
  hour_idx: number;
  rate: number;
  sent: number;
  received: number;
  level: 'low' | 'medium' | 'high' | 'very_high';
  color: string;
}

interface HeatmapDay {
  day: string;
  day_idx: number;
  slots: HeatmapSlot[];
}

interface ResponseHeatmapProps {
  isDark: boolean;
  matrix: HeatmapDay[];
  bestSlot: {
    day: string;
    hours: string;
    rate: number;
    insight: string;
  };
  avoidInsight: string;
  legend: Array<{ label: string; color: string }>;
  hasData: boolean;
}

export function ResponseHeatmap({ 
  isDark,
  matrix, 
  bestSlot, 
  avoidInsight, 
  legend,
  hasData 
}: ResponseHeatmapProps) {
  if (!hasData) {
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
            Melhor Horário de Envio
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex items-center justify-center h-64">
            <p className={cn(
              "text-sm",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              Sem dados suficientes para análise
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hourLabels = ['00h', '03h', '06h', '09h', '12h', '15h', '18h', '21h'];

  return (
    <Card className={cn(
      "rounded-xl",
      isDark 
        ? "bg-gradient-to-br from-zinc-950 to-black border-0" 
        : "bg-white border border-zinc-200"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <CardTitle className={cn(
            "text-xs font-medium uppercase tracking-wider",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            Melhor Horário de Envio - Taxa de Resposta por Horário
          </CardTitle>
        </div>
        <p className={cn(
          "text-sm",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Matriz de performance por dia da semana e período do dia
        </p>
      </CardHeader>

      <CardContent className="pb-6">
        {/* Header com horas */}
        <div className="grid grid-cols-9 gap-1 mb-2">
          <div /> {/* Célula vazia */}
          {hourLabels.map((hour) => (
            <div 
              key={hour} 
              className={cn(
                "text-center text-xs",
                isDark ? "text-zinc-500" : "text-zinc-600"
              )}
            >
              {hour}
            </div>
          ))}
        </div>

        {/* Matrix */}
        {matrix.map((day) => (
          <div key={day.day} className="grid grid-cols-9 gap-1 mb-1">
            <div className={cn(
              "flex items-center text-sm font-medium",
              isDark ? "text-zinc-400" : "text-zinc-600"
            )}>
              {day.day}
            </div>
            {day.slots.map((slot) => (
              <div
                key={`${day.day}-${slot.hour}`}
                className={cn(
                  "h-10 rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-105 cursor-pointer",
                  isDark ? "hover:ring-2 hover:ring-white/20" : "hover:ring-2 hover:ring-zinc-300"
                )}
                style={{ 
                  backgroundColor: slot.color + '40', 
                  color: slot.color 
                }}
                title={`${day.day} ${slot.hour}: ${slot.rate}% (${slot.received}/${slot.sent})`}
              >
                {slot.rate}%
              </div>
            ))}
          </div>
        ))}

        {/* Legenda */}
        <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: item.color }}
              />
              <span className={cn(
                "text-xs",
                isDark ? "text-zinc-400" : "text-zinc-600"
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div className="mt-6 space-y-3">
          <div className={cn(
            "flex items-center gap-3 rounded-lg p-4 border",
            isDark 
              ? "bg-green-500/10 border-green-500/20" 
              : "bg-green-50 border-green-200"
          )}>
            <Lightbulb className={cn("h-5 w-5", isDark ? "text-yellow-500" : "text-yellow-600")} />
            <span className={cn(
              "text-sm",
              isDark ? "text-green-400" : "text-green-700"
            )}>
              {bestSlot.insight}
            </span>
          </div>
          
          <div className={cn(
            "flex items-center gap-3 rounded-lg p-4 border",
            isDark 
              ? "bg-red-500/10 border-red-500/20" 
              : "bg-red-50 border-red-200"
          )}>
            <Lightbulb className={cn("h-5 w-5", isDark ? "text-yellow-500" : "text-yellow-600")} />
            <span className={cn(
              "text-sm",
              isDark ? "text-red-400" : "text-red-700"
            )}>
              {avoidInsight}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
