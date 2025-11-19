import { Moon, Sun, User } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';

interface ChatHeaderProps {
  theme: Theme;
  onThemeToggle: () => void;
}

export function ChatHeader({ theme, onThemeToggle }: ChatHeaderProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`h-16 border-b flex items-center justify-between px-6 transition-colors ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}
    >
      {/* Title */}
      <div>
        <h1 className={isDark ? 'text-white' : 'text-text-primary-light'}>
          Atendimentos
        </h1>
        <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
          Gerencie suas conversas com clientes
        </p>
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
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-white/[0.05] text-white/70'
              : 'hover:bg-light-elevated text-text-secondary-light'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isDark ? 'bg-white/[0.1]' : 'bg-light-elevated'
            }`}
          >
            <User className="w-4 h-4" />
          </div>
          <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            Admin
          </span>
        </button>
      </div>
    </div>
  );
}
