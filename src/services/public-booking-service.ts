// Public Booking Service
// Serviço para agendamento público (sem autenticação)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface PublicWorkspaceInfo {
  id: string;
  name: string;
  slug: string;
}

export interface CalendarAvailability {
  [day: string]: { start: string; end: string }[];
}

export type BookingPageTheme = 'light' | 'dark' | 'auto';

export interface PublicCalendarSettings {
  availability: CalendarAvailability;
  default_durations: {
    meeting: number;
    call: number;
    demo: number;
    reminder: number;
  };
  buffer_between_events: number;
  min_booking_notice_hours: number;
  max_booking_days_ahead: number;
  timezone: string;
  booking_page_theme?: BookingPageTheme;
  booking_page_logo?: string | null;
}

export interface AvailableSlot {
  start: string;
  end: string;
}

export interface BookingData {
  workspace_id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  date: string;
  start_time: string;
  event_type?: 'meeting' | 'call' | 'demo';
  notes?: string;
}

export interface BookingResult {
  success: boolean;
  message: string;
  event?: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
  };
  lead_id?: string;
  error?: string;
}

const API_URL = `${SUPABASE_URL}/functions/v1/public-booking`;

/**
 * Busca informações do workspace pelo slug
 */
export async function getWorkspaceBySlug(slug: string): Promise<{
  workspace: PublicWorkspaceInfo;
  settings: PublicCalendarSettings;
} | null> {
  try {
    const response = await fetch(`${API_URL}?slug=${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch workspace:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.success) {
      return null;
    }

    return {
      workspace: data.workspace,
      settings: data.settings,
    };
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return null;
  }
}

/**
 * Busca slots disponíveis para uma data específica
 */
export async function getAvailableSlots(
  workspaceId: string,
  date: string,
  eventType: string = 'meeting'
): Promise<{
  slots: AvailableSlot[];
  slotDuration: number;
} | null> {
  try {
    const params = new URLSearchParams({
      workspace_id: workspaceId,
      date: date,
      event_type: eventType,
    });

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch availability:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      slots: data.available_slots || [],
      slotDuration: data.slot_duration || 60,
    };
  } catch (error) {
    console.error('Error fetching availability:', error);
    return null;
  }
}

/**
 * Cria um agendamento público
 */
export async function createPublicBooking(booking: BookingData): Promise<BookingResult> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(booking),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'Erro ao criar agendamento',
        error: data.error,
      };
    }

    return {
      success: true,
      message: data.message || 'Agendamento realizado com sucesso!',
      event: data.event,
      lead_id: data.lead_id,
    };
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return {
      success: false,
      message: error.message || 'Erro ao criar agendamento',
      error: error.message,
    };
  }
}

/**
 * Gera datas disponíveis para agendamento
 */
export function getAvailableDates(
  settings: PublicCalendarSettings,
  maxDays: number = 30
): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (let i = 0; i < maxDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayName = dayNames[date.getDay()];
    const dayAvailability = settings.availability[dayName];

    // Só adiciona se o dia tem horário de expediente
    if (dayAvailability && dayAvailability.length > 0) {
      dates.push(date);
    }
  }

  return dates;
}

/**
 * Formata telefone para exibição
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}
