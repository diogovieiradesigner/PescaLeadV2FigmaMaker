import { MessageSquare, Settings } from 'lucide-react';

interface NoInboxNotificationProps {
  isDark: boolean;
  onNavigateToInstances?: () => void;
}

export function NoInboxNotification({ isDark, onNavigateToInstances }: NoInboxNotificationProps) {
  return (
    <div className={`p-6 rounded-lg border space-y-4 ${
      isDark 
        ? 'bg-white/[0.02] border-white/[0.08]' 
        : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="text-center space-y-3">
        <MessageSquare className={`w-12 h-12 mx-auto ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
        <p className={`${isDark ? 'text-white' : 'text-gray-900'}`}>
          Configure seu chat para começar
        </p>
        <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
          Para utilizar o sistema de atendimento, é necessário configurar pelo menos uma instância, caixa de entrada e atendente.
        </p>
        {onNavigateToInstances && (
          <button
            onClick={onNavigateToInstances}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
              isDark 
                ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08]' 
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Ir para Configurações
          </button>
        )}
      </div>
    </div>
  );
}
