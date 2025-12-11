import { Bot, Mail, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { cn } from '../../ui/utils';
import { TimeSavingsData } from '../../../types/ia-tab.types';

interface TimeSavingsSectionProps {
  isDark: boolean;
  data: TimeSavingsData;
}

export function TimeSavingsSection({ isDark, data }: TimeSavingsSectionProps) {
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
          <span className="w-3 h-3 rounded-full bg-green-500" /> 
          CÁLCULO DE ECONOMIA DE TEMPO
        </h3>
        
        {/* 2 Cards de breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Mensagens IA */}
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Bot className={cn(
                "w-5 h-5",
                isDark ? "text-purple-400" : "text-purple-600"
              )} />
              <span className={cn(
                isDark ? "text-white" : "text-zinc-900"
              )}>
                🤖 Mensagens I.A
              </span>
            </div>
            <p className={cn(
              "text-sm mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {data.ai_messages.formula}
            </p>
            <p className={cn(
              "text-2xl font-bold",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {data.ai_messages.hours.toFixed(1)} horas
            </p>
          </div>
          
          {/* Follow-ups */}
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Mail className={cn(
                "w-5 h-5",
                isDark ? "text-blue-400" : "text-blue-600"
              )} />
              <span className={cn(
                isDark ? "text-white" : "text-zinc-900"
              )}>
                🤖 Follow-ups Automáticos
              </span>
            </div>
            <p className={cn(
              "text-sm mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {data.followups.formula}
            </p>
            <p className={cn(
              "text-2xl font-bold",
              isDark ? "text-white" : "text-zinc-900"
            )}>
              {data.followups.hours.toFixed(1)} horas
            </p>
          </div>
        </div>
        
        {/* Total economizado */}
        <div className={cn(
          "rounded-lg p-6 mb-6 border",
          isDark 
            ? "bg-green-500/10 border-green-500/20" 
            : "bg-green-50 border-green-200"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "p-2 rounded-lg",
              isDark ? "bg-green-500/20" : "bg-green-100"
            )}>
              <TrendingUp className={cn(
                "w-6 h-6",
                isDark ? "text-green-400" : "text-green-600"
              )} />
            </div>
            <span className={cn(
              "text-sm uppercase tracking-wider",
              isDark ? "text-zinc-400" : "text-zinc-600"
            )}>
              TOTAL ECONOMIZADO
            </span>
          </div>
          <p className={cn(
            "text-5xl font-bold",
            isDark ? "text-white" : "text-zinc-900"
          )}>
            {data.total.hours.toFixed(1)} horas
          </p>
          <p className={cn(
            "mt-1",
            isDark ? "text-zinc-500" : "text-zinc-600"
          )}>
            {data.total.minutes.toLocaleString()} minutos
          </p>
        </div>
        
        {/* 2 Cards: Dinheiro e Comparação */}
        <div className="grid grid-cols-2 gap-4">
          {/* Em custos */}
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={cn(
                "w-5 h-5",
                isDark ? "text-yellow-400" : "text-yellow-600"
              )} />
              <span className={cn(
                "text-sm",
                isDark ? "text-zinc-400" : "text-zinc-600"
              )}>
                💰 Em custos (baseado em R$ {data.money.hourly_rate.toFixed(2)}/hora):
              </span>
            </div>
            <p className={cn(
              "text-sm mb-2",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              {data.money.formula}
            </p>
            <p className={cn(
              "text-3xl font-bold",
              isDark ? "text-green-400" : "text-green-600"
            )}>
              R$ {data.money.total_saved.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}
            </p>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              economizados neste período
            </p>
          </div>
          
          {/* Comparação */}
          <div className={cn(
            "rounded-lg p-4",
            isDark ? "bg-zinc-800/50" : "bg-zinc-50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={cn(
                "w-5 h-5",
                isDark ? "text-green-400" : "text-green-600"
              )} />
              <span className={cn(
                "text-sm",
                isDark ? "text-zinc-400" : "text-zinc-600"
              )}>
                📊 Comparado com período anterior:
              </span>
            </div>
            <p className={cn(
              "text-3xl font-bold mt-4",
              data.comparison.change_percent >= 0
                ? isDark ? "text-green-400" : "text-green-600"
                : isDark ? "text-red-400" : "text-red-600"
            )}>
              {data.comparison.change_percent >= 0 ? '↗' : '↘'} {Math.abs(data.comparison.change_percent).toFixed(1)}% de economia
            </p>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-zinc-500" : "text-zinc-600"
            )}>
              (anterior: {data.comparison.previous_hours.toFixed(1)}h)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
