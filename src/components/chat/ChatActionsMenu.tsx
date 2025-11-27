import { useState, useRef, useEffect } from 'react';
import { ExternalLink, Trash2, RotateCcw, MoreVertical } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';

interface ChatActionsMenuProps {
  theme: Theme;
  onViewInPipeline: () => void;
  onClearHistory: () => void;
  onDeleteConversation: () => void;
  hasLead?: boolean; // ✅ Indica se a conversa tem lead associado
}

export function ChatActionsMenu({
  theme,
  onViewInPipeline,
  onClearHistory,
  onDeleteConversation,
  hasLead = false, // ✅ Default: false
}: ChatActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${
          isDark
            ? 'hover:bg-white/[0.05] text-white/50'
            : 'hover:bg-light-elevated text-text-secondary-light'
        }`}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-64 rounded-lg border shadow-lg z-50 ${
            isDark
              ? 'bg-elevated border-white/[0.08]'
              : 'bg-white border-border-light'
          }`}
        >
          <div className="py-1">
            {/* Ver perfil completo - só mostra se houver lead associado */}
            {hasLead && (
              <button
                onClick={() => handleAction(onViewInPipeline)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white'
                    : 'hover:bg-light-elevated text-text-primary-light'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">Perfil completo</span>
              </button>
            )}

            {/* Limpar histórico */}
            <button
              onClick={() => handleAction(onClearHistory)}
              className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05] text-white'
                  : 'hover:bg-light-elevated text-text-primary-light'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Limpar histórico</span>
            </button>

            {/* Apagar conversa */}
            <button
              onClick={() => handleAction(onDeleteConversation)}
              className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-red-500 ${
                isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-500/5'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Apagar conversa</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}