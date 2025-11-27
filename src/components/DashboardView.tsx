import { Target, Users, DollarSign, TrendingUp, TrendingDown, Award, Calendar, Clock, ChevronRight, Sun, Moon } from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { ProfileMenu } from './ProfileMenu';

interface DashboardViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
  stats?: {
    totalDeals: number;
    totalValue: number;
    activeLeads: number;
    conversionRate: number;
  };
}

export function DashboardView({ theme, onThemeToggle, onNavigateToSettings, stats: propStats }: DashboardViewProps) {
  const isDark = theme === 'dark';

  // Usar stats recebidas como props ou valores padrão
  const stats = propStats || {
    totalDeals: 0,
    totalValue: 0,
    activeLeads: 0,
    conversionRate: 0,
  };

  const statCards = [
    {
      title: 'Total de Negócios',
      value: stats.totalDeals.toString(),
      icon: Target,
      color: '#0169D9',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Valor Total',
      value: `R$ ${stats.totalValue.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: '#10B981',
      trend: '+23%',
      trendUp: true,
    },
    {
      title: 'Leads Ativos',
      value: stats.activeLeads.toString(),
      icon: Users,
      color: '#F59E0B',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats.conversionRate}%`,
      icon: Award,
      color: '#8B5CF6',
      trend: '-2%',
      trendUp: false,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className={`h-16 border-b flex items-center justify-between px-6 transition-colors ${
        isDark 
          ? 'bg-true-black border-white/[0.08]' 
          : 'bg-light-bg border-border-light'
      }`}>
        <h1 className={`text-xl ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
          Dashboard
        </h1>
        
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={onThemeToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark 
                ? 'hover:bg-white/[0.05]' 
                : 'hover:bg-light-elevated-hover'
            }`}
            title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-white/50" />
            ) : (
              <Moon className="w-4 h-4 text-text-secondary-light" />
            )}
          </button>

          {/* User Profile */}
          <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
        </div>
      </header>

      {/* Content */}
      <div className={`flex-1 overflow-auto ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
        {/* Stats Grid */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.title}
                  className={`rounded-xl p-6 border transition-colors ${
                    isDark
                      ? 'bg-elevated border-white/[0.08] hover:border-white/[0.15]'
                      : 'bg-light-elevated border-border-light hover:border-border-light/80'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: stat.color }} />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
                        stat.trendUp
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {stat.trendUp ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{stat.trend}</span>
                    </div>
                  </div>
                  <p className={`text-sm mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    {stat.title}
                  </p>
                  <p className={`text-2xl ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="mt-8">
            <h2 className={`text-xl mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Atividade Recente
            </h2>
            <div
              className={`rounded-xl border p-6 ${
                isDark
                  ? 'bg-elevated border-white/[0.08]'
                  : 'bg-light-elevated border-border-light'
              }`}
            >
              <div className="text-center py-12">
                <p className={isDark ? 'text-white/50' : 'text-text-secondary-light'}>
                  Nenhuma atividade recente
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}