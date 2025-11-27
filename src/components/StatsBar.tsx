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
    <div className={`grid grid-cols-4 gap-6 px-6 py-4 border-b transition-colors ${
      isDark ? 'border-white/[0.08]' : 'border-border-light'
    }`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-white/[0.03]' : 'bg-light-elevated'
          }`}>
            <stat.icon className={`w-5 h-5 ${
              isDark ? 'text-white/40' : 'text-text-secondary-light'
            }`} />
          </div>
          <div>
            <div className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
              {stat.label}
            </div>
            <div className={isDark ? 'text-white' : 'text-text-primary-light'}>
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}