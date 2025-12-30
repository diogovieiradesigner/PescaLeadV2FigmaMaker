/**
 * Google Calendar Service - Integração com Google Calendar
 * Gerencia conexão OAuth, sincronização e operações de calendário
 */

import { supabase } from '../utils/supabase/client.tsx';
import {
  GoogleConnectionStatus,
  GoogleCalendarListItem,
  SyncResult,
  GoogleAuthUrlResponse,
  GoogleCalendarsListResponse,
  GoogleSelectCalendarsResponse,
} from '../types/google-calendar.types';

// URL base das Edge Functions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nlbcwaxkeaddfocigwuk.supabase.co';
const FUNCTIONS_URL = SUPABASE_URL.replace('.supabase.co', '.supabase.co/functions/v1');

// Timeout padrão para requisições (30 segundos)
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Helper para fazer requisições autenticadas às Edge Functions
 * Inclui timeout automático para evitar loading infinito
 */
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const url = `${FUNCTIONS_URL}${endpoint}`;

  // Extrair timeoutMs das options
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  // Criar AbortController para timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.error(`[google-calendar-service] Request timeout after ${timeoutMs}ms:`, url);
  }, timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...fetchOptions.headers,
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    // Log response status for debugging
    if (!response.ok) {
      console.error('[google-calendar-service] Error response:', response.status, response.statusText);
    }

    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout: A requisição demorou mais de ${timeoutMs / 1000} segundos`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// CONNECTION FUNCTIONS
// ============================================

/**
 * Verifica status da conexão com Google Calendar
 */
export async function getGoogleConnectionStatus(
  workspaceId: string
): Promise<GoogleConnectionStatus> {
  const response = await fetchWithAuth(
    `/google-oauth/status?workspace_id=${workspaceId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao verificar conexão');
  }

  return response.json();
}

/**
 * Gera URL de autorização OAuth do Google
 */
export async function getGoogleAuthUrl(workspaceId: string): Promise<string> {
  const response = await fetchWithAuth(
    `/google-oauth/auth-url?workspace_id=${workspaceId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao gerar URL de autorização');
  }

  const data = await response.json();

  // Log debug info if available
  if (data.debug) {
  }

  return data.auth_url;
}

/**
 * Desconecta conta Google
 */
export async function disconnectGoogle(workspaceId: string): Promise<void> {
  const response = await fetchWithAuth('/google-oauth/disconnect', {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao desconectar Google');
  }
}

// ============================================
// CALENDAR FUNCTIONS
// ============================================

/**
 * Lista calendários disponíveis na conta Google
 */
export async function listGoogleCalendars(
  workspaceId: string
): Promise<GoogleCalendarListItem[]> {
  const response = await fetchWithAuth(
    `/google-calendar/list-calendars?workspace_id=${workspaceId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao listar calendários');
  }

  const data: GoogleCalendarsListResponse = await response.json();
  return data.calendars;
}

/**
 * Seleciona calendários para sincronização
 */
export async function selectCalendarsForSync(
  workspaceId: string,
  calendarIds: string[]
): Promise<void> {
  const response = await fetchWithAuth('/google-calendar/select-calendars', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      calendar_ids: calendarIds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao selecionar calendários');
  }
}

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Executa sincronização com Google Calendar
 */
export async function syncGoogleCalendar(
  workspaceId: string,
  options?: {
    syncId?: string;
    fullSync?: boolean;
  }
): Promise<SyncResult> {
  const response = await fetchWithAuth('/google-calendar/sync', {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: workspaceId,
      sync_id: options?.syncId,
      full_sync: options?.fullSync || false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.error || 'Erro ao sincronizar',
    };
  }

  return {
    success: true,
    stats: data.stats,
  };
}

/**
 * Deleta um evento do Google Calendar
 */
export async function deleteGoogleEvent(
  eventId: string,
  workspaceId: string
): Promise<void> {
  const response = await fetchWithAuth('/google-calendar/event', {
    method: 'DELETE',
    body: JSON.stringify({
      event_id: eventId,
      workspace_id: workspaceId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao deletar evento');
  }
}

// ============================================
// LOCAL DATABASE FUNCTIONS
// ============================================

/**
 * Busca conexões Google do usuário atual
 */
export async function fetchUserGoogleConnections(workspaceId: string) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('google_calendar_connections')
    .select(`
      *,
      syncs:google_calendar_sync (
        id,
        google_calendar_id,
        google_calendar_name,
        google_calendar_color,
        sync_enabled,
        last_sync_at
      )
    `)
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[google-calendar-service] Error fetching connections:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca logs de sincronização
 */
export async function fetchSyncLogs(
  workspaceId: string,
  options?: {
    limit?: number;
    syncId?: string;
  }
) {
  let query = supabase
    .from('google_sync_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('started_at', { ascending: false });

  if (options?.syncId) {
    query = query.eq('google_calendar_sync_id', options.syncId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[google-calendar-service] Error fetching sync logs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Atualiza configuração de sync de um calendário
 */
export async function updateCalendarSyncSettings(
  syncId: string,
  updates: {
    sync_enabled?: boolean;
    sync_direction?: 'to_google' | 'from_google' | 'both';
  }
) {
  const { data, error } = await supabase
    .from('google_calendar_sync')
    .update(updates)
    .eq('id', syncId)
    .select()
    .single();

  if (error) {
    console.error('[google-calendar-service] Error updating sync settings:', error);
    throw error;
  }

  return data;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verifica se um evento é do Google Calendar
 */
export function isGoogleEvent(event: any): boolean {
  return event.source === 'google' || !!event.google_event_id;
}

/**
 * Formata data/hora do último sync
 */
export function formatLastSyncTime(lastSyncAt: string | null): string {
  if (!lastSyncAt) {
    return 'Nunca sincronizado';
  }

  const date = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Agora mesmo';
  } else if (diffMinutes < 60) {
    return `Há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * Abre popup para conectar com Google (melhor UX)
 */
export function openGoogleAuthPopup(authUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'google-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      // Popup bloqueado, redirecionar diretamente
      window.location.href = authUrl;
      return;
    }

    // Verificar quando o popup fecha
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        resolve(true);
      }
    }, 500);

    // Timeout após 5 minutos
    setTimeout(() => {
      clearInterval(checkClosed);
      if (!popup.closed) {
        popup.close();
      }
      resolve(false);
    }, 5 * 60 * 1000);
  });
}
