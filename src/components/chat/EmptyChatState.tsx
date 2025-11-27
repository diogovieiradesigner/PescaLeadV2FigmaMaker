import { MessageSquare, Settings } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';

interface EmptyChatStateProps {
  theme: Theme;
  onNavigateToSettings: () => void;
}

export function EmptyChatState({ theme, onNavigateToSettings }: EmptyChatStateProps) {
  const isDark = theme === 'dark';

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isDark ? 'bg-white/[0.05]' : 'bg-light-elevated'
          }`}
        >
          <MessageSquare
            className={`w-10 h-10 ${isDark ? 'text-white/30' : 'text-text-secondary-light'}`}
          />
        </div>

        {/* Title */}
        <h2
          className={`text-xl mb-3 ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}
        >
          Configure seu chat para começar
        </h2>

        {/* Description */}
        <p
          className={`text-sm mb-6 ${
            isDark ? 'text-white/60' : 'text-text-secondary-light'
          }`}
        >
          Para utilizar o sistema de atendimento, é necessário configurar pelo menos uma
          instância, caixa de entrada e atendente.
        </p>

        {/* Button */}
        <button
          onClick={onNavigateToSettings}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
            isDark
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Ir para Configurações</span>
        </button>
      </div>
    </div>
  );
}
