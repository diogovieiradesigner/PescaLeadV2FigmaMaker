import { useState, useEffect } from 'react';
import {
  Calendar,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Unlink,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import {
  getGoogleConnectionStatus,
  getGoogleAuthUrl,
  disconnectGoogle,
  listGoogleCalendars,
  selectCalendarsForSync,
  syncGoogleCalendar,
  openGoogleAuthPopup,
  formatLastSyncTime,
} from '../services/google-calendar-service';
import {
  GoogleConnectionStatus,
  GoogleCalendarListItem,
} from '../types/google-calendar.types';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  workspaceId: string;
  onSyncComplete?: () => void;
}

export function GoogleCalendarModal({
  isOpen,
  onClose,
  theme,
  workspaceId,
  onSyncComplete,
}: GoogleCalendarModalProps) {
  const isDark = theme === 'dark';

  // States
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'status' | 'calendars' | 'syncing'>('status');

  // Action states
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingCalendars, setSavingCalendars] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load connection status on open
  useEffect(() => {
    if (isOpen) {
      loadConnectionStatus();
    }
  }, [isOpen, workspaceId]);

  // Check for callback params
  useEffect(() => {
    // Limpar timeout de redirect se existir (usuário voltou do OAuth)
    const savedTimeoutId = sessionStorage.getItem('googleAuthTimeoutId');
    if (savedTimeoutId) {
      clearTimeout(Number(savedTimeoutId));
      sessionStorage.removeItem('googleAuthTimeoutId');
    }

    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get('google_connected');
    const googleError = params.get('google_error');

    if (googleConnected === 'true') {
      setSuccessMessage('Conta Google conectada com sucesso!');
      setConnecting(false); // Garantir que connecting é resetado
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      loadConnectionStatus();
    }

    if (googleError) {
      setError(`Erro ao conectar: ${googleError}`);
      setConnecting(false); // Garantir que connecting é resetado
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-oauth-success') {
        setSuccessMessage('Conta Google conectada com sucesso!');
        setConnecting(false);
        loadConnectionStatus();
      } else if (event.data?.type === 'google-oauth-error') {
        setError(`Erro ao conectar: ${event.data.error}`);
        setConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [workspaceId]);

  const loadConnectionStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await getGoogleConnectionStatus(workspaceId);
      setConnectionStatus(status);

      if (status.connected && status.calendars) {
        setSelectedCalendars(
          new Set(status.calendars.filter((c) => c.sync_enabled).map((c) => c.google_calendar_id))
        );
      }
    } catch (err: any) {
      console.error('Error loading connection status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const authUrl = await getGoogleAuthUrl(workspaceId);

      // Timeout de 2 minutos para detectar se o redirect falhou
      // (ex: popup bloqueado, erro de rede, etc)
      const redirectTimeout = setTimeout(() => {
        // Se ainda estamos nesta página após 2 minutos, algo deu errado
        setConnecting(false);
        setError('O processo de conexão expirou. Tente novamente ou verifique se popups estão bloqueados.');
      }, 2 * 60 * 1000);

      // Salvar timeout ID no sessionStorage para limpar se voltarmos
      sessionStorage.setItem('googleAuthTimeoutId', String(redirectTimeout));

      // Redirecionar diretamente na mesma janela (mais confiável que popup)
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Error connecting:', err);
      setError(err.message);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar sua conta Google? Todos os calendários sincronizados serão removidos.')) {
      return;
    }

    setDisconnecting(true);
    setError(null);

    try {
      await disconnectGoogle(workspaceId);
      setConnectionStatus({ connected: false });
      setCalendars([]);
      setSelectedCalendars(new Set());
      setSuccessMessage('Conta Google desconectada com sucesso');
    } catch (err: any) {
      console.error('Error disconnecting:', err);
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const loadCalendars = async () => {
    setLoading(true);
    setError(null);

    try {
      const cals = await listGoogleCalendars(workspaceId);
      setCalendars(cals);
      setSelectedCalendars(new Set(cals.filter((c) => c.is_selected).map((c) => c.id)));
      setStep('calendars');
    } catch (err: any) {
      console.error('Error loading calendars:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCalendar = (calendarId: string) => {
    const newSelected = new Set(selectedCalendars);
    if (newSelected.has(calendarId)) {
      newSelected.delete(calendarId);
    } else {
      newSelected.add(calendarId);
    }
    setSelectedCalendars(newSelected);
  };

  const handleSaveCalendars = async () => {
    setSavingCalendars(true);
    setError(null);

    try {
      await selectCalendarsForSync(workspaceId, Array.from(selectedCalendars));
      setSuccessMessage('Calendários salvos com sucesso!');
      setStep('status');
      await loadConnectionStatus();
    } catch (err: any) {
      console.error('Error saving calendars:', err);
      setError(err.message);
    } finally {
      setSavingCalendars(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setStep('syncing');

    try {
      const result = await syncGoogleCalendar(workspaceId);

      if (result.success) {
        const stats = result.stats!;
        setSuccessMessage(
          `Sincronização concluída! ${stats.created} criados, ${stats.updated} atualizados, ${stats.deleted} removidos.`
        );
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        setError(result.error || 'Erro na sincronização');
      }

      setStep('status');
      await loadConnectionStatus();
    } catch (err: any) {
      console.error('Error syncing:', err);
      setError(err.message);
      setStep('status');
    } finally {
      setSyncing(false);
    }
  };

  const handleClose = () => {
    setStep('status');
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#0A0A0A]' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-white/[0.08] bg-[#0A0A0A]' : 'border-border-light bg-white'
          }`}
        >
          <h2
            className={`text-lg font-medium flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}
          >
            <Calendar className="w-5 h-5 text-blue-500" />
            Google Calendar
          </h2>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.08] text-white/60 hover:text-white'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Carregando...
              </p>
            </div>
          )}

          {/* Step: Status */}
          {!loading && step === 'status' && (
            <div className="space-y-4">
              {!connectionStatus?.connected ? (
                // Not connected
                <div className="text-center py-8">
                  <div
                    className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                      isDark ? 'bg-white/[0.05]' : 'bg-gray-100'
                    }`}
                  >
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3
                    className={`text-lg font-medium mb-2 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Conecte seu Google Calendar
                  </h3>
                  <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    Sincronize seus eventos do Google Calendar com o Pesca Lead e mantenha tudo
                    organizado em um só lugar.
                  </p>
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Conectar com Google
                      </>
                    )}
                  </button>
                </div>
              ) : (
                // Connected
                <div className="space-y-4">
                  {/* Connection Info */}
                  <div
                    className={`p-4 rounded-lg ${
                      isDark ? 'bg-white/[0.03]' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {connectionStatus.connection?.google_email}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          {formatLastSyncTime(connectionStatus.connection?.last_sync_at || null)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Synced Calendars */}
                  {connectionStatus.calendars && connectionStatus.calendars.length > 0 && (
                    <div className={`p-4 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                      <p
                        className={`text-sm font-medium mb-2 ${
                          isDark ? 'text-white/70' : 'text-gray-600'
                        }`}
                      >
                        Calendários sincronizados ({connectionStatus.calendars.length})
                      </p>
                      <div className="space-y-1">
                        {connectionStatus.calendars.map((cal) => (
                          <div key={cal.id} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cal.google_calendar_color || '#6b7280' }}
                            />
                            <span
                              className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}
                            >
                              {cal.google_calendar_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error if any */}
                  {connectionStatus.connection?.sync_error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                      <p className="font-medium">Erro na última sincronização:</p>
                      <p>{connectionStatus.connection.sync_error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={loadCalendars}
                      className={`w-full px-4 py-2.5 rounded-lg font-medium flex items-center justify-between transition-colors ${
                        isDark
                          ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Gerenciar calendários
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Sincronizar agora
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className={`w-full px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                        isDark
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                          : 'bg-red-50 hover:bg-red-100 text-red-600'
                      }`}
                    >
                      {disconnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Desconectando...
                        </>
                      ) : (
                        <>
                          <Unlink className="w-4 h-4" />
                          Desconectar Google
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Select Calendars */}
          {!loading && step === 'calendars' && (
            <div className="space-y-4">
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Selecione os calendários que deseja sincronizar:
              </p>

              <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isDark
                        ? 'hover:bg-white/[0.05]'
                        : 'hover:bg-gray-50'
                    } ${
                      selectedCalendars.has(cal.id)
                        ? isDark
                          ? 'bg-blue-500/10 border border-blue-500/30'
                          : 'bg-blue-50 border border-blue-200'
                        : isDark
                        ? 'bg-white/[0.02] border border-white/[0.05]'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        selectedCalendars.has(cal.id)
                          ? 'bg-blue-500 text-white'
                          : isDark
                          ? 'bg-white/10'
                          : 'bg-gray-200'
                      }`}
                    >
                      {selectedCalendars.has(cal.id) && <Check className="w-3 h-3" />}
                    </div>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cal.color || '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {cal.name}
                        {cal.is_primary && (
                          <span className="ml-2 text-xs text-blue-500">(Principal)</span>
                        )}
                      </p>
                      {cal.description && (
                        <p
                          className={`text-xs truncate ${
                            isDark ? 'text-white/50' : 'text-gray-500'
                          }`}
                        >
                          {cal.description}
                        </p>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedCalendars.has(cal.id)}
                      onChange={() => handleToggleCalendar(cal.id)}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('status')}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    isDark
                      ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Voltar
                </button>
                <button
                  onClick={handleSaveCalendars}
                  disabled={savingCalendars}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {savingCalendars ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Syncing */}
          {!loading && step === 'syncing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-4">
                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Sincronizando...
              </h3>
              <p className={`text-sm text-center ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Aguarde enquanto sincronizamos seus eventos do Google Calendar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
