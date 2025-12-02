import { Users, MessageSquare, Mail, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { DashboardCards } from '../../types/dashboard.types';
import { cn } from '../ui/utils';

interface StatCardsProps {
  cards: DashboardCards;
  isLoading?: boolean;
  isDark?: boolean;
}

export function StatCards({ cards, isLoading, isDark = true }: StatCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-zinc-800 h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: 'LEADS',
      emoji: '📥',
      value: cards.leads.value,
      change: cards.leads.change_percent,
      icon: Users,
      iconBg: 'bg-blue-500/10',
      iconColor: isDark ? 'text-blue-400' : 'text-blue-600',
    },
    {
      title: 'CONVERSAS',
      emoji: '💬',
      value: cards.conversations.value,
      change: cards.conversations.change_percent,
      icon: MessageSquare,
      iconBg: 'bg-green-500/10',
      iconColor: isDark ? 'text-green-400' : 'text-green-600',
    },
    {
      title: 'MENSAGENS',
      emoji: '✉️',
      value: cards.messages.value,
      change: cards.messages.change_percent,
      icon: Mail,
      iconBg: 'bg-purple-500/10',
      iconColor: isDark ? 'text-purple-400' : 'text-purple-600',
    },
    {
      title: 'ECONOMIA',
      emoji: '⏱️',
      value: `${cards.economy_hours.value}h`,
      change: cards.economy_hours.change_percent,
      icon: Clock,
      iconBg: 'bg-amber-500/10',
      iconColor: isDark ? 'text-amber-400' : 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item) => {
        const Icon = item.icon;
        const isPositive = item.change >= 0;

        return (
          <Card 
            key={item.title} 
            className={cn(
              "rounded-xl border-0",
              isDark 
                ? "bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800/50" 
                : "bg-white border border-zinc-200"
            )}
          >
            <CardContent className="pt-6 pb-6">
              {/* Ícone e Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={cn('p-2.5 rounded-lg', item.iconBg)}>
                  <Icon className={cn('w-5 h-5', item.iconColor)} />
                </div>
                <Badge className={cn(
                  "gap-1 border",
                  isPositive 
                    ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                )}>
                  {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span className="text-xs font-medium">{Math.abs(item.change).toFixed(1)}%</span>
                </Badge>
              </div>

              {/* Label com emoji */}
              <p className={cn(
                "text-xs font-medium uppercase tracking-wider mb-2",
                isDark ? "text-zinc-500" : "text-zinc-600"
              )}>
                {item.emoji} {item.title}
              </p>

              {/* Valor */}
              <p className={cn(
                "text-3xl font-bold mb-1",
                isDark ? "text-white" : "text-zinc-900"
              )}>
                {typeof item.value === 'number' 
                  ? item.value.toLocaleString('pt-BR') 
                  : item.value
                }
              </p>

              {/* Texto de comparação */}
              <p className={cn(
                "text-xs",
                isDark ? "text-zinc-500" : "text-zinc-600"
              )}>
                vs. período anterior
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}