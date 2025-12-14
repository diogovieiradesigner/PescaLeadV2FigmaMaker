// ============================================
// CALENDAR TYPES
// Tipos para o sistema de calendário interno
// ============================================

// ============================================
// EVENT TYPES
// ============================================
export type EventType = 'meeting' | 'call' | 'demo' | 'reminder';

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export type ShowAs = 'busy' | 'free';

export type ConfirmationMethod = 'manual' | 'whatsapp' | 'email' | 'ai';

export type BookingPageTheme = 'light' | 'dark' | 'auto';

// ============================================
// INTERNAL CALENDAR
// ============================================
export interface InternalCalendar {
  id: string;
  workspace_id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  calendar_type: string;
  color: string;
  timezone: string;
  is_active: boolean;
  ai_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InternalCalendarCreate {
  workspace_id: string;
  owner_id?: string;
  name: string;
  description?: string;
  calendar_type?: string;
  color?: string;
  timezone?: string;
}

export interface InternalCalendarUpdate {
  name?: string;
  description?: string;
  color?: string;
  timezone?: string;
  is_active?: boolean;
}

// ============================================
// INTERNAL EVENT
// ============================================
export interface InternalEvent {
  id: string;
  workspace_id: string;
  internal_calendar_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_type: EventType;
  organizer_email: string | null;
  attendees: EventAttendee[];
  location: string | null;
  event_status: EventStatus;
  show_as: ShowAs;
  recurrence_rule: string | null;
  is_meeting: boolean;
  lead_id: string | null;
  conversation_id: string | null;
  inbox_id: string | null; // Caixa de entrada para lembretes WhatsApp
  assigned_to: string | null; // Responsável pelo evento (user_id)
  created_by: string | null;
  confirmed_at: string | null;
  confirmed_via: ConfirmationMethod | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  name?: string;
  email?: string;
  phone?: string;
  status?: 'pending' | 'accepted' | 'declined' | 'tentative';
}

export interface InternalEventCreate {
  workspace_id: string;
  internal_calendar_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: EventType;
  organizer_email?: string;
  attendees?: EventAttendee[];
  location?: string;
  event_status?: EventStatus;
  show_as?: ShowAs;
  is_meeting?: boolean;
  lead_id?: string;
  conversation_id?: string;
  inbox_id?: string;
  assigned_to?: string;
  created_by?: string;
}

export interface InternalEventUpdate {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  event_type?: EventType;
  organizer_email?: string;
  attendees?: EventAttendee[];
  location?: string;
  event_status?: EventStatus;
  show_as?: ShowAs;
  is_meeting?: boolean;
  lead_id?: string;
  conversation_id?: string;
  inbox_id?: string;
  assigned_to?: string;
  confirmed_at?: string;
  confirmed_via?: ConfirmationMethod;
  cancelled_at?: string;
  cancelled_reason?: string;
  reminder_sent_at?: string;
}

// ============================================
// EVENT WITH RELATIONS
// ============================================
export interface InternalEventWithRelations extends InternalEvent {
  calendar?: InternalCalendar;
  lead?: {
    id: string;
    client_name: string;
    company: string | null;
  };
  conversation?: {
    id: string;
    contact_name: string;
    contact_phone: string;
  };
  creator?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  assignee?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

// ============================================
// CALENDAR SETTINGS
// ============================================
export interface TimeSlot {
  start: string; // "08:00"
  end: string;   // "12:00"
}

export interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface DefaultDurations {
  meeting: number;  // minutos
  call: number;
  demo: number;
  reminder: number;
}

export interface CalendarSettings {
  id: string;
  workspace_id: string;
  internal_calendar_id: string | null;
  availability: WeeklyAvailability;
  default_durations: DefaultDurations;
  buffer_between_events: number;
  min_booking_notice_hours: number;
  max_booking_days_ahead: number;
  timezone: string;
  allow_overlapping: boolean;
  whatsapp_confirmation_enabled: boolean;
  whatsapp_reminder_enabled: boolean;
  whatsapp_reminder_hours_before: number;
  booking_page_theme: BookingPageTheme;
  booking_page_logo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarSettingsCreate {
  workspace_id: string;
  internal_calendar_id?: string;
  availability?: WeeklyAvailability;
  default_durations?: DefaultDurations;
  buffer_between_events?: number;
  min_booking_notice_hours?: number;
  max_booking_days_ahead?: number;
  timezone?: string;
  allow_overlapping?: boolean;
  whatsapp_confirmation_enabled?: boolean;
  whatsapp_reminder_enabled?: boolean;
  whatsapp_reminder_hours_before?: number;
  booking_page_theme?: BookingPageTheme;
  booking_page_logo?: string | null;
}

export interface CalendarSettingsUpdate {
  availability?: WeeklyAvailability;
  default_durations?: DefaultDurations;
  buffer_between_events?: number;
  min_booking_notice_hours?: number;
  max_booking_days_ahead?: number;
  timezone?: string;
  allow_overlapping?: boolean;
  whatsapp_confirmation_enabled?: boolean;
  whatsapp_reminder_enabled?: boolean;
  whatsapp_reminder_hours_before?: number;
  booking_page_theme?: BookingPageTheme;
  booking_page_logo?: string | null;
  is_active?: boolean;
}

// ============================================
// AVAILABILITY SLOT (para UI)
// ============================================
export interface AvailabilitySlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
}

// ============================================
// CALENDAR VIEW TYPES
// ============================================
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarDateRange {
  start: Date;
  end: Date;
}

// ============================================
// EVENT TYPE METADATA (para UI)
// ============================================
export const EVENT_TYPE_CONFIG: Record<EventType, {
  label: string;
  icon: string;
  color: string;
  defaultDuration: number;
}> = {
  meeting: {
    label: 'Reunião',
    icon: 'Users',
    color: '#3b82f6', // blue
    defaultDuration: 60
  },
  call: {
    label: 'Ligação',
    icon: 'Phone',
    color: '#22c55e', // green
    defaultDuration: 30
  },
  demo: {
    label: 'Demonstração',
    icon: 'Monitor',
    color: '#8b5cf6', // purple
    defaultDuration: 45
  },
  reminder: {
    label: 'Lembrete',
    icon: 'Bell',
    color: '#f59e0b', // amber
    defaultDuration: 15
  }
};

export const EVENT_STATUS_CONFIG: Record<EventStatus, {
  label: string;
  color: string;
}> = {
  confirmed: {
    label: 'Confirmado',
    color: '#22c55e'
  },
  tentative: {
    label: 'Pendente',
    color: '#f59e0b'
  },
  cancelled: {
    label: 'Cancelado',
    color: '#ef4444'
  }
};

// ============================================
// DURATION OPTIONS (para UI)
// ============================================
export const DURATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
];

// ============================================
// DAYS OF WEEK (para UI)
// ============================================
export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
] as const;

// ============================================
// EVENT REMINDERS
// ============================================
export type ReminderStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled';

export interface EventReminder {
  id: string;
  event_id: string;
  workspace_id: string;
  inbox_id: string | null;
  remind_before_minutes: number;
  remind_at: string | null;
  message_template: string | null;
  status: ReminderStatus;
  sent_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface EventReminderCreate {
  event_id: string;
  workspace_id: string;
  inbox_id?: string;
  remind_before_minutes: number;
  message_template?: string;
}

export interface EventReminderUpdate {
  inbox_id?: string;
  remind_before_minutes?: number;
  message_template?: string;
  status?: ReminderStatus;
}

// Opções de lembrete pré-definidas
export const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 dia antes' },
  { value: 2880, label: '2 dias antes' },
  { value: 10080, label: '1 semana antes' },
] as const;

// Template padrão de lembrete
export const DEFAULT_REMINDER_TEMPLATE = `Olá {nome}! 👋

Lembrando que você tem um(a) *{tipo}* agendado(a):

📅 *{titulo}*
🗓 Data: {data}
🕐 Horário: {hora}
📍 Local: {local}

Caso tenha algum imprevisto, nos avise com antecedência.

Até breve! 😊`;

// Variáveis disponíveis para templates
export const REMINDER_TEMPLATE_VARIABLES = [
  { key: '{nome}', description: 'Nome do lead' },
  { key: '{empresa}', description: 'Empresa do lead' },
  { key: '{titulo}', description: 'Título do evento' },
  { key: '{tipo}', description: 'Tipo do evento (Reunião, Ligação, etc.)' },
  { key: '{data}', description: 'Data do evento (DD/MM/YYYY)' },
  { key: '{hora}', description: 'Hora do evento (HH:mm)' },
  { key: '{local}', description: 'Local/link do evento' },
] as const;
