import { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { getGoogleConnectionStatus } from '../services/google-calendar-service';

/**
 * Badge indicator para mostrar no header do calendário
 * Mostra o status da conexão com Google Calendar de forma compacta
 */
export function GoogleSyncBadge({
  workspaceId,
  theme,
  onConnect,
}: {
  workspaceId: string;
  theme: Theme;
  onConnect?: () => void;
}) {
  const isDark = theme === 'dark';
  const [connected, setConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const status = await getGoogleConnectionStatus(workspaceId);
        setConnected(status.connected);
        setHasError(!!status.connection?.sync_error);
      } catch (err) {
        console.error('[GoogleSyncBadge] Error checking status:', err);
        setConnected(false);
        setHasError(false);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, [workspaceId]);

  // Enquanto carrega, mostrar indicador de carregamento
  if (loading) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
          isDark
            ? 'bg-white/[0.05] text-white/40'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Google</span>
      </div>
    );
  }

  // Não conectado - mostrar botão para conectar
  if (!connected) {
    return (
      <button
        onClick={onConnect}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
          isDark
            ? 'bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
        }`}
        title="Conectar Google Calendar"
      >
        <Calendar className="w-3 h-3" />
        <span>Google</span>
      </button>
    );
  }

  // Conectado - mostrar status
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
        hasError
          ? 'bg-red-500/10 text-red-500'
          : 'bg-green-500/10 text-green-500'
      }`}
      title={hasError ? 'Erro na sincronização com Google' : 'Sincronizado com Google Calendar'}
    >
      {hasError ? (
        <AlertCircle className="w-3 h-3" />
      ) : (
        <CheckCircle className="w-3 h-3" />
      )}
      <span>Google</span>
    </div>
  );
}
