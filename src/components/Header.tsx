import { Search, Bell, ChevronDown, LayoutGrid, List, Sun, Moon, Settings, RefreshCw } from 'lucide-react';
import { ViewMode } from '../types/crm';
import { Theme } from '../hooks/useTheme';
import { ProfileMenu } from './ProfileMenu';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useState } from 'react';

interface HeaderProps {
  currentFunnel: string;
  funnels: { id: string; name: string }[];
  onFunnelChange: (funnelId: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSettingsClick: () => void;
  theme: Theme;
  onThemeToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewFunnelClick: () => void;
  onEditFunnelClick: () => void;
  onNavigateToSettings?: () => void;
  onRefresh?: () => void; // ✅ Callback para recarregar leads
}

export function Header({
  currentFunnel,
  funnels,
  onFunnelChange,
  viewMode,
  onViewModeChange,
  theme,
  onThemeToggle,
  searchQuery,
  onSearchChange,
  onNewFunnelClick,
  onEditFunnelClick,
  onNavigateToSettings,
  onRefresh,
}: HeaderProps) {
  const isDark = theme === 'dark';
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFunnelChange = (value: string) => {
    if (value === '__new__') {
      onNewFunnelClick();
    } else {
      onFunnelChange(value);
    }
  };
  
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Mantém animação por pelo menos 500ms para feedback visual
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };
  
  return (
    <header className={`h-16 border-b flex items-center justify-between px-6 transition-colors ${
      isDark 
        ? 'bg-true-black border-white/[0.08]' 
        : 'bg-light-bg border-border-light'
    }`}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Funnel Selector */}
        <div className="relative">
          <select
            value={currentFunnel}
            onChange={(e) => handleFunnelChange(e.target.value)}
            className={`appearance-none border text-sm px-3 py-1.5 pr-9 rounded-lg cursor-pointer transition-colors focus:outline-none focus:border-[#0169D9] ${
              isDark
                ? 'bg-elevated border-white/[0.08] text-white hover:border-white/[0.15]'
                : 'bg-light-elevated border-border-light text-text-primary-light hover:border-border-light'
            }`}
          >
            {funnels.map((funnel) => (
              <option key={funnel.id} value={funnel.id}>
                {funnel.name}
              </option>
            ))}
            <option value="__new__">+ Novo Funil</option>
          </select>
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
            isDark ? 'text-white/70' : 'text-text-secondary-light'
          }`} />
        </div>

        {/* Funnel Settings Button */}
        <button
          onClick={onEditFunnelClick}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-white/[0.05] text-white/50 hover:text-white/70'
              : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
          }`}
          title="Configurações do Funil"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* View Toggle */}
        <div className={`flex items-center gap-0.5 rounded-lg p-0.5 border ${
          isDark 
            ? 'bg-elevated border-white/[0.08]' 
            : 'bg-light-elevated border-border-light'
        }`}>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`px-2.5 py-1 rounded-md transition-all duration-200 flex items-center gap-2 text-sm ${
              viewMode === 'kanban'
                ? 'bg-[#0169D9] text-white'
                : isDark
                ? 'text-white/50 hover:text-white/70'
                : 'text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Kanban</span>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-2.5 py-1 rounded-md transition-all duration-200 flex items-center gap-2 text-sm ${
              viewMode === 'list'
                ? 'bg-[#0169D9] text-white'
                : isDark
                ? 'text-white/50 hover:text-white/70'
                : 'text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Lista</span>
          </button>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isDark ? 'text-white/50' : 'text-text-secondary-light'
          }`} />
          <input
            type="text"
            placeholder="Buscar leads, empresas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full border text-sm pl-9 pr-4 py-1.5 rounded-lg focus:outline-none focus:border-[#0169D9] transition-all ${
              isDark
                ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40'
                : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
            }`}
          />
        </div>
      </div>

      {/* Right Section */}
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

        {/* Notifications */}
        <button className={`relative p-1.5 rounded-lg transition-colors ${
          isDark 
            ? 'hover:bg-white/[0.05]' 
            : 'hover:bg-light-elevated-hover'
        }`}>
          <Bell className={`w-4 h-4 ${
            isDark ? 'text-white/50' : 'text-text-secondary-light'
          }`} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#0169D9] rounded-full" />
        </button>

        {/* Refresh Leads */}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50 hover:text-white/70'
                : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
            }`}
            title="Recarregar Leads"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* User Profile */}
        <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
      </div>
    </header>
  );
}