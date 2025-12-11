import { TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface StatsBarProps {
  totalDeals: number;
  totalValue: number;
  activeLeads: number;
  conversionRate: number;
  theme: Theme;
}

export function StatsBar({ totalDeals, totalValue, activeLeads, conversionRate, theme }: StatsBarProps) {
  const isDark = theme === 'dark';
  
  // Debug log
  console.log('[STATS BAR] Received props:', { totalDeals, totalValue, activeLeads, conversionRate });
  
  const stats = [
    {
      icon: Target,
      label: 'Total de Negócios',
      value: totalDeals.toString(),
    },
    {
      icon: DollarSign,
      label: 'Valor do Pipeline',
      value: `R$ ${totalValue.toLocaleString('pt-BR')}`,
    },
    {
      icon: Users,
      label: 'Leads Ativos',
      value: activeLeads.toString(),
    },
    {
      icon: TrendingUp,
      label: 'Taxa de Conversão',
      value: `${conversionRate}%`,
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 px-4 md:px-6 py-3 md:py-4 border-b transition-colors ${
      isDark ? 'border-white/[0.08]' : 'border-border-light'
    }`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-2 md:gap-3"
        >
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-white/[0.03]' : 'bg-light-elevated'
          }`}>
            <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${
              isDark ? 'text-white/40' : 'text-text-secondary-light'
            }`} />
          </div>
          <div className="min-w-0">
            <div className={`text-xs md:text-sm truncate ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              {stat.label}
            </div>
            <div className={`text-sm md:text-base font-medium truncate ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}