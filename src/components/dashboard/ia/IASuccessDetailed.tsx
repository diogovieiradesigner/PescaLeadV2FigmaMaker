import { Bot, UserCheck, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { cn } from '../../ui/utils';
import { IASuccessRateData } from '../../../types/ia-tab.types';

interface IASuccessDetailedProps {
  isDark: boolean;
  data: IASuccessRateData;
}

export function IASuccessDetailed({ isDark, data }: IASuccessDetailedProps) {
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
            <CheckSquare className={cn("w-4 h-4", isDark ? "text-green-400" : "text-green-600")} /> 
            TAXA DE SUCESSO DA I.A
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
          <CheckSquare className={cn("w-4 h-4", isDark ? "text-green-400" : "text-green-600")} /> 
          TAXA DE SUCESSO DA I.A
        </h3>
        
        <div className="space-y-4">
          {/* Conversas 100% IA */}
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bot className={cn(
                  "w-5 h-5",
                  isDark ? "text-purple-400" : "text-purple-600"
                )} />
                <span className={cn(
                  "font-medium",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {data.ia_only.label}
                </span>
              </div>
              <span className={cn(
                "text-2xl font-bold",
                isDark ? "text-white" : "text-zinc-900"
              )}>
                {data.ia_only.value}
              </span>
            </div>
            <p className={cn(
              "text-sm mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {data.ia_only.description}
            </p>
            <div className={cn(
              "w-full rounded-full h-2",
              isDark ? "bg-zinc-700" : "bg-zinc-200"
            )}>
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${data.ia_only.percentage}%` }}
              />
            </div>
            <p className={cn(
              "text-sm mt-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {data.ia_only.percentage.toFixed(1)}% do total
            </p>
          </div>
          
          {/* Conversas com Assunção */}
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UserCheck className={cn(
                  "w-5 h-5",
                  isDark ? "text-zinc-400" : "text-zinc-600"
                )} />
                <span className={cn(
                  "font-medium",
                  isDark ? "text-white" : "text-zinc-900"
                )}>
                  {data.with_human.label}
                </span>
              </div>
              <span className={cn(
                "text-2xl font-bold",
                isDark ? "text-white" : "text-zinc-900"
              )}>
                {data.with_human.value}
              </span>
            </div>
            <p className={cn(
              "text-sm mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {data.with_human.description}
            </p>
            <div className={cn(
              "w-full rounded-full h-2",
              isDark ? "bg-zinc-700" : "bg-zinc-200"
            )}>
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  isDark ? "bg-zinc-500" : "bg-zinc-400"
                )}
                style={{ width: `${data.with_human.percentage}%` }}
              />
            </div>
            <p className={cn(
              "text-sm mt-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {data.with_human.percentage.toFixed(1)}% do total
            </p>
          </div>
        </div>
        
        {/* Taxa de Sucesso */}
        <div className={cn(
          "mt-6 flex items-center justify-between pt-4 border-t",
          isDark ? "border-zinc-800" : "border-zinc-200"
        )}>
          <span className={cn(
            isDark ? "text-zinc-400" : "text-zinc-600"
          )}>
            Taxa de Sucesso
          </span>
          <span className={cn(
            "text-3xl font-bold",
            isDark ? "text-green-400" : "text-green-600"
          )}>
            {data.success_rate.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
