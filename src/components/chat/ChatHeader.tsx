import { Moon, Sun, Settings } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { ProfileMenu } from '../ProfileMenu';

interface ChatHeaderProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
}

export function ChatHeader({ theme, onThemeToggle, onNavigateToSettings }: ChatHeaderProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`h-16 border-b flex items-center justify-between px-6 transition-colors ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}
    >
      {/* Left section: Settings + Title */}
      <div className="flex items-center gap-4">
        {/* Settings Button */}
        <button
          onClick={onNavigateToSettings}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-white/[0.05] text-white/70 hover:text-white'
              : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
          }`}
          title="Configurações"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Title */}
        <div>
          <h1 className={`text-xl ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            Atendimentos
          </h1>
          <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
            Gerencie suas conversas com clientes
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={onThemeToggle}
          className={`p-2 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-white/[0.05] text-white/70'
              : 'hover:bg-light-elevated text-text-secondary-light'
          }`}
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Profile */}
        <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
      </div>
    </div>
  );
}