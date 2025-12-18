// ============================================
// GOOGLE CALENDAR TYPES
// Tipos para integração com Google Calendar
// ============================================

// ============================================
// CONNECTION TYPES
// ============================================

export interface GoogleCalendarConnection {
  id: string;
  user_id: string;
  workspace_id: string;
  google_email: string;
  google_user_id: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
  token_expires_soon?: boolean;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  connection?: GoogleCalendarConnection;
  calendars?: GoogleCalendarSync[];
}

// ============================================
// CALENDAR SYNC TYPES
// ============================================

export interface GoogleCalendarSync {
  id: string;
  connection_id: string;
  workspace_id: string;
  user_id: string;
  google_calendar_id: string;
  google_calendar_name: string;
  google_calendar_color: string | null;
  sync_enabled: boolean;
  sync_direction: 'to_google' | 'from_google' | 'both';
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
  // Webhook fields
  webhook_channel_id: string | null;
  webhook_resource_id: string | null;
  webhook_expiration: string | null;
  last_sync_token: string | null;
}

export interface GoogleCalendarListItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  is_primary: boolean;
  access_role: string;
  is_selected: boolean;
}

// ============================================
// SYNC LOG TYPES
// ============================================

export type SyncOperation =
  | 'full_sync'
  | 'incremental_sync'
  | 'push_to_google'
  | 'pull_from_google'
  | 'webhook_received'
  | 'token_refresh'
  | 'webhook_setup'
  | 'webhook_renew';

export type SyncStatus = 'started' | 'success' | 'error' | 'partial';

export interface GoogleSyncLog {
  id: string;
  google_calendar_sync_id: string | null;
  workspace_id: string;
  user_id: string;
  operation: SyncOperation;
  status: SyncStatus;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  events_skipped: number;
  error_message: string | null;
  error_details: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

// ============================================
// SYNC RESULT TYPES
// ============================================

export interface SyncResult {
  success: boolean;
  stats?: {
    created: number;
    updated: number;
    deleted: number;
    duration_ms: number;
  };
  error?: string;
}

// ============================================
// EVENT SOURCE TYPES
// ============================================

export type EventSource = 'internal' | 'google' | 'public_booking' | 'ai';

// Extensão do InternalEvent para incluir campos do Google
export interface InternalEventWithGoogle {
  id: string;
  workspace_id: string;
  internal_calendar_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_type: 'meeting' | 'call' | 'demo' | 'reminder';
  event_status: 'confirmed' | 'tentative' | 'cancelled';
  source: EventSource;
  google_event_id: string | null;
  google_calendar_sync_id: string | null;
  google_synced_at: string | null;
  google_etag: string | null;
  needs_google_sync: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface GoogleAuthUrlResponse {
  success: boolean;
  auth_url: string;
}

export interface GoogleCalendarsListResponse {
  success: boolean;
  calendars: GoogleCalendarListItem[];
}

export interface GoogleSelectCalendarsResponse {
  success: boolean;
  message: string;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface GoogleCalendarUIState {
  isConnecting: boolean;
  isDisconnecting: boolean;
  isSyncing: boolean;
  isLoadingCalendars: boolean;
  connectionError: string | null;
  syncError: string | null;
}

// ============================================
// CONSTANTS
// ============================================

export const GOOGLE_CALENDAR_COLORS: Record<string, string> = {
  '#039be5': 'Azul',
  '#7986cb': 'Lavanda',
  '#33b679': 'Verde',
  '#8e24aa': 'Roxo',
  '#e67c73': 'Vermelho',
  '#f6bf26': 'Amarelo',
  '#f4511e': 'Laranja',
  '#00bcd4': 'Turquesa',
  '#616161': 'Cinza',
  '#3f51b5': 'Índigo',
  '#0b8043': 'Verde Escuro',
  '#d50000': 'Vermelho Escuro',
};

// Cor padrão para eventos do Google na UI
export const GOOGLE_EVENT_DEFAULT_COLOR = '#6b7280'; // gray-500

// Ícone para eventos do Google
export const GOOGLE_CALENDAR_ICON = 'Calendar'; // Lucide icon name
