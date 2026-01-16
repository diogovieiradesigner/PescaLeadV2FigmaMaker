/**
 * Calendar Service - Gerenciamento de calendários e eventos internos
 */

import { supabase } from '../utils/supabase/client.tsx';
import {
  InternalCalendar,
  InternalCalendarCreate,
  InternalCalendarUpdate,
  InternalEvent,
  InternalEventCreate,
  InternalEventUpdate,
  InternalEventWithRelations,
  CalendarSettings,
  CalendarSettingsCreate,
  CalendarSettingsUpdate,
  EventType,
  WeeklyAvailability,
  AvailabilitySlot,
  EventReminder,
  EventReminderCreate,
  EventReminderUpdate,
} from '../types/calendar.types';

// ============================================
// INTERNAL CALENDARS
// ============================================

/**
 * Busca todos os calendários internos de um workspace
 */
export async function fetchCalendars(workspaceId: string): Promise<InternalCalendar[]> {
  const { data, error } = await supabase
    .from('internal_calendars')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[calendar-service] Error fetching calendars:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca um calendário por ID
 */
export async function fetchCalendarById(calendarId: string): Promise<InternalCalendar | null> {
  const { data, error } = await supabase
    .from('internal_calendars')
    .select('*')
    .eq('id', calendarId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[calendar-service] Error fetching calendar:', error);
    throw error;
  }

  return data;
}

/**
 * Cria um novo calendário interno
 */
export async function createCalendar(data: InternalCalendarCreate): Promise<InternalCalendar> {
  const { data: calendar, error } = await supabase
    .from('internal_calendars')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error creating calendar:', error);
    throw error;
  }

  return calendar;
}

/**
 * Atualiza um calendário
 */
export async function updateCalendar(
  calendarId: string,
  data: InternalCalendarUpdate
): Promise<InternalCalendar> {
  const { data: calendar, error } = await supabase
    .from('internal_calendars')
    .update(data)
    .eq('id', calendarId)
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error updating calendar:', error);
    throw error;
  }

  return calendar;
}

/**
 * Deleta (desativa) um calendário
 */
export async function deleteCalendar(calendarId: string): Promise<void> {
  const { error } = await supabase
    .from('internal_calendars')
    .update({ is_active: false })
    .eq('id', calendarId);

  if (error) {
    console.error('[calendar-service] Error deleting calendar:', error);
    throw error;
  }
}

// ============================================
// INTERNAL EVENTS
// ============================================

/**
 * Busca eventos de um calendário em um período
 */
export async function fetchEvents(
  calendarId: string,
  startDate: Date,
  endDate: Date
): Promise<InternalEvent[]> {
  const { data, error } = await supabase
    .from('internal_events')
    .select('*')
    .eq('internal_calendar_id', calendarId)
    .gte('start_time', startDate.toISOString())
    .lte('end_time', endDate.toISOString())
    .neq('event_status', 'cancelled')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[calendar-service] Error fetching events:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca eventos de um workspace em um período (todos os calendários)
 */
export async function fetchEventsByWorkspace(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    eventType?: EventType;
    leadId?: string;
    assignedTo?: string;
    includeRelations?: boolean;
  }
): Promise<InternalEvent[] | InternalEventWithRelations[]> {
  let query = supabase
    .from('internal_events')
    .select(options?.includeRelations ? `
      *,
      calendar:internal_calendar_id (id, name, color),
      lead:lead_id (id, client_name, company),
      conversation:conversation_id (id, contact_name, contact_phone),
      creator:created_by (id, name, avatar_url),
      assignee:assigned_to (id, name, avatar_url)
    ` : '*')
    .eq('workspace_id', workspaceId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (options?.eventType) {
    query = query.eq('event_type', options.eventType);
  }

  if (options?.leadId) {
    query = query.eq('lead_id', options.leadId);
  }

  if (options?.assignedTo) {
    query = query.eq('assigned_to', options.assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[calendar-service] Error fetching events by workspace:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca um evento por ID
 */
export async function fetchEventById(
  eventId: string,
  includeRelations: boolean = false
): Promise<InternalEvent | InternalEventWithRelations | null> {
  const { data, error } = await supabase
    .from('internal_events')
    .select(includeRelations ? `
      *,
      calendar:internal_calendar_id (id, name, color),
      lead:lead_id (id, client_name, company),
      conversation:conversation_id (id, contact_name, contact_phone),
      creator:created_by (id, name, avatar_url),
      assignee:assigned_to (id, name, avatar_url)
    ` : '*')
    .eq('id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[calendar-service] Error fetching event:', error);
    throw error;
  }

  return data;
}

/**
 * Cria um novo evento
 */
export async function createEvent(data: InternalEventCreate): Promise<InternalEvent> {
  const { data: event, error } = await supabase
    .from('internal_events')
    .insert({
      ...data,
      attendees: data.attendees || [],
      event_status: data.event_status || 'confirmed',
      show_as: data.show_as || 'busy',
    })
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error creating event:', error);
    throw error;
  }

  return event;
}

/**
 * Atualiza um evento
 */
export async function updateEvent(
  eventId: string,
  data: InternalEventUpdate
): Promise<InternalEvent> {
  const { data: event, error } = await supabase
    .from('internal_events')
    .update(data)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error updating event:', error);
    throw error;
  }

  return event;
}

/**
 * Cancela um evento
 */
export async function cancelEvent(
  eventId: string,
  reason?: string
): Promise<InternalEvent> {
  const { data: event, error } = await supabase
    .from('internal_events')
    .update({
      event_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason,
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error cancelling event:', error);
    throw error;
  }

  return event;
}

/**
 * Confirma um evento
 */
export async function confirmEvent(
  eventId: string,
  method: 'manual' | 'whatsapp' | 'email' | 'ai'
): Promise<InternalEvent> {
  const { data: event, error } = await supabase
    .from('internal_events')
    .update({
      event_status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_via: method,
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error confirming event:', error);
    throw error;
  }

  return event;
}

/**
 * Deleta um evento permanentemente
 * Se o evento estiver sincronizado com Google Calendar, também deleta no Google
 */
export async function deleteEvent(eventId: string, workspaceId?: string): Promise<void> {
  // Primeiro, buscar o evento para verificar se tem google_event_id
  const { data: event, error: fetchError } = await supabase
    .from('internal_events')
    .select('id, google_event_id, google_calendar_sync_id, workspace_id')
    .eq('id', eventId)
    .single();

  if (fetchError) {
    console.error('[calendar-service] Error fetching event for delete:', fetchError);
    throw fetchError;
  }

  // Se o evento está sincronizado com Google, tentar deletar lá também
  if (event?.google_event_id && event?.workspace_id) {
    try {
      // Importar dinamicamente para evitar dependência circular
      const { deleteGoogleEvent } = await import('./google-calendar-service');
      await deleteGoogleEvent(eventId, event.workspace_id);
    } catch (googleError: any) {
      // Log mas não falhar - o evento pode já ter sido deletado no Google
    }
  }

  // Deletar evento local
  const { error } = await supabase
    .from('internal_events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('[calendar-service] Error deleting event:', error);
    throw error;
  }
}

// ============================================
// CALENDAR SETTINGS
// ============================================

/**
 * Busca configurações do calendário
 */
export async function fetchCalendarSettings(
  workspaceId: string,
  calendarId?: string
): Promise<CalendarSettings | null> {

  let query = supabase
    .from('calendar_settings')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (calendarId) {
    query = query.eq('internal_calendar_id', calendarId);
  } else {
    query = query.is('internal_calendar_id', null);
  }

  const { data, error } = await query.maybeSingle();


  if (error) {
    console.error('[calendar-service] Error fetching settings:', error);
    throw error;
  }

  return data;
}

/**
 * Cria ou atualiza configurações do calendário
 */
export async function upsertCalendarSettings(
  data: CalendarSettingsCreate
): Promise<CalendarSettings> {

  // Primeiro, tentar buscar configuração existente
  // Usar a mesma lógica do fetchCalendarSettings para consistência
  let query = supabase
    .from('calendar_settings')
    .select('*')
    .eq('workspace_id', data.workspace_id);

  if (data.internal_calendar_id) {
    query = query.eq('internal_calendar_id', data.internal_calendar_id);
  } else {
    query = query.is('internal_calendar_id', null);
  }

  const { data: existing, error: fetchError } = await query.maybeSingle();


  if (existing) {
    // Atualizar existente
    const { data: settings, error } = await supabase
      .from('calendar_settings')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single();


    if (error) {
      console.error('[calendar-service] Error updating settings:', error);
      throw error;
    }

    return settings;
  } else {
    // Criar novo
    const { data: settings, error } = await supabase
      .from('calendar_settings')
      .insert(data)
      .select()
      .single();


    if (error) {
      console.error('[calendar-service] Error creating settings:', error);
      throw error;
    }

    return settings;
  }
}

/**
 * Atualiza configurações do calendário
 */
export async function updateCalendarSettings(
  settingsId: string,
  data: CalendarSettingsUpdate
): Promise<CalendarSettings> {
  const { data: settings, error } = await supabase
    .from('calendar_settings')
    .update(data)
    .eq('id', settingsId)
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error updating settings:', error);
    throw error;
  }

  return settings;
}

// ============================================
// AVAILABILITY CHECK
// ============================================

/**
 * Verifica disponibilidade em um período
 */
export async function checkAvailability(
  workspaceId: string,
  calendarId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  // Buscar eventos que conflitam com o período
  const { data: conflicts, error } = await supabase
    .from('internal_events')
    .select('id')
    .eq('internal_calendar_id', calendarId)
    .neq('event_status', 'cancelled')
    .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

  if (error) {
    console.error('[calendar-service] Error checking availability:', error);
    throw error;
  }

  // Buscar configurações para verificar horário de funcionamento
  const settings = await fetchCalendarSettings(workspaceId, calendarId);

  if (settings) {
    const dayOfWeek = startTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklyAvailability;
    const daySlots = settings.availability[dayOfWeek];

    if (!daySlots || daySlots.length === 0) {
      return false; // Dia não disponível
    }

    const startHour = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
    const endHour = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

    // Verificar se está dentro de algum slot disponível
    const isWithinSlot = daySlots.some(
      slot => startHour >= slot.start && endHour <= slot.end
    );

    if (!isWithinSlot) {
      return false;
    }
  }

  return !conflicts || conflicts.length === 0;
}

/**
 * Busca slots disponíveis para um dia
 */
export async function getAvailableSlots(
  workspaceId: string,
  calendarId: string,
  date: Date,
  durationMinutes: number
): Promise<AvailabilitySlot[]> {
  const settings = await fetchCalendarSettings(workspaceId, calendarId);

  if (!settings) {
    return [];
  }

  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklyAvailability;
  const daySlots = settings.availability[dayOfWeek];

  if (!daySlots || daySlots.length === 0) {
    return [];
  }

  // Buscar eventos do dia
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const events = await fetchEvents(calendarId, dayStart, dayEnd);

  const slots: AvailabilitySlot[] = [];
  const bufferMinutes = settings.buffer_between_events || 0;

  // Para cada slot de disponibilidade do dia
  for (const slot of daySlots) {
    const [startHour, startMin] = slot.start.split(':').map(Number);
    const [endHour, endMin] = slot.end.split(':').map(Number);

    let currentSlotStart = new Date(date);
    currentSlotStart.setHours(startHour, startMin, 0, 0);

    const slotEnd = new Date(date);
    slotEnd.setHours(endHour, endMin, 0, 0);

    // Gerar slots de duração específica
    while (currentSlotStart < slotEnd) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMinutes * 60000);

      if (currentSlotEnd > slotEnd) break;

      // Verificar se conflita com algum evento
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);

        // Adicionar buffer
        const bufferedStart = new Date(eventStart.getTime() - bufferMinutes * 60000);
        const bufferedEnd = new Date(eventEnd.getTime() + bufferMinutes * 60000);

        return currentSlotStart < bufferedEnd && currentSlotEnd > bufferedStart;
      });

      slots.push({
        start: new Date(currentSlotStart),
        end: new Date(currentSlotEnd),
        isAvailable: !hasConflict,
      });

      // Próximo slot (incremento de 15 minutos para granularidade)
      currentSlotStart = new Date(currentSlotStart.getTime() + 15 * 60000);
    }
  }

  return slots;
}

// ============================================
// EVENTS BY LEAD
// ============================================

/**
 * Busca eventos de um lead específico
 */
export async function fetchEventsByLead(leadId: string): Promise<InternalEvent[]> {
  const { data, error } = await supabase
    .from('internal_events')
    .select('*')
    .eq('lead_id', leadId)
    .neq('event_status', 'cancelled')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[calendar-service] Error fetching events by lead:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca próximo evento de um lead
 */
export async function fetchNextEventByLead(leadId: string): Promise<InternalEvent | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('internal_events')
    .select('*')
    .eq('lead_id', leadId)
    .eq('event_status', 'confirmed')
    .gte('start_time', now)
    .order('start_time', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[calendar-service] Error fetching next event:', error);
    throw error;
  }

  return data;
}

// ============================================
// ENSURE DEFAULT CALENDAR EXISTS
// ============================================

/**
 * Garante que existe um calendário padrão para o workspace
 */
export async function ensureDefaultCalendar(workspaceId: string): Promise<InternalCalendar> {
  // Verificar se já existe
  const calendars = await fetchCalendars(workspaceId);

  if (calendars.length > 0) {
    return calendars[0];
  }

  // Criar calendário padrão
  const calendar = await createCalendar({
    workspace_id: workspaceId,
    name: 'Calendário Principal',
    description: 'Calendário padrão do workspace',
    calendar_type: 'appointments',
    color: '#1976d2',
  });

  // Criar configurações padrão
  await upsertCalendarSettings({
    workspace_id: workspaceId,
    internal_calendar_id: calendar.id,
  });

  return calendar;
}

// ============================================
// EVENT REMINDERS
// ============================================

/**
 * Busca lembretes de um evento
 */
export async function fetchEventReminders(eventId: string): Promise<EventReminder[]> {
  const { data, error } = await supabase
    .from('event_reminders')
    .select('*')
    .eq('event_id', eventId)
    .order('remind_before_minutes', { ascending: true });

  if (error) {
    console.error('[calendar-service] Error fetching event reminders:', error);
    throw error;
  }

  return data || [];
}

/**
 * Cria um novo lembrete para um evento
 */
export async function createEventReminder(data: EventReminderCreate): Promise<EventReminder> {
  const { data: reminder, error } = await supabase
    .from('event_reminders')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error creating event reminder:', error);
    throw error;
  }

  return reminder;
}

/**
 * Atualiza um lembrete
 */
export async function updateEventReminder(
  reminderId: string,
  data: EventReminderUpdate
): Promise<EventReminder> {
  const { data: reminder, error } = await supabase
    .from('event_reminders')
    .update(data)
    .eq('id', reminderId)
    .select()
    .single();

  if (error) {
    console.error('[calendar-service] Error updating event reminder:', error);
    throw error;
  }

  return reminder;
}

/**
 * Deleta um lembrete
 */
export async function deleteEventReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('event_reminders')
    .delete()
    .eq('id', reminderId);

  if (error) {
    console.error('[calendar-service] Error deleting event reminder:', error);
    throw error;
  }
}

/**
 * Cria múltiplos lembretes para um evento
 */
export async function createEventReminders(
  eventId: string,
  workspaceId: string,
  reminders: { remind_before_minutes: number; inbox_id?: string; message_template?: string }[]
): Promise<EventReminder[]> {
  if (reminders.length === 0) return [];

  const remindersToCreate = reminders.map(r => ({
    event_id: eventId,
    workspace_id: workspaceId,
    remind_before_minutes: r.remind_before_minutes,
    inbox_id: r.inbox_id,
    message_template: r.message_template,
  }));

  const { data, error } = await supabase
    .from('event_reminders')
    .insert(remindersToCreate)
    .select();

  if (error) {
    console.error('[calendar-service] Error creating event reminders:', error);
    throw error;
  }

  return data || [];
}

/**
 * Substitui todos os lembretes de um evento
 */
export async function replaceEventReminders(
  eventId: string,
  workspaceId: string,
  reminders: { remind_before_minutes: number; inbox_id?: string; message_template?: string }[]
): Promise<EventReminder[]> {
  // Deletar lembretes existentes (apenas pendentes)
  const { error: deleteError } = await supabase
    .from('event_reminders')
    .delete()
    .eq('event_id', eventId)
    .eq('status', 'pending');

  if (deleteError) {
    console.error('[calendar-service] Error deleting existing reminders:', deleteError);
    throw deleteError;
  }

  // Criar novos lembretes
  return createEventReminders(eventId, workspaceId, reminders);
}

/**
 * Busca caixas de entrada do workspace para seleção
 */
export async function fetchWorkspaceInboxes(workspaceId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('inboxes')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .order('name');

  if (error) {
    console.error('[calendar-service] Error fetching inboxes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca membros do workspace para seleção de responsável
 */
export async function fetchWorkspaceMembers(workspaceId: string): Promise<{ id: string; name: string; avatar_url: string | null }[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      users:user_id (id, name, avatar_url)
    `)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[calendar-service] Error fetching workspace members:', error);
    throw error;
  }

  // Transform the data to flatten the nested user object
  return (data || []).map((member: any) => ({
    id: member.users.id,
    name: member.users.name || 'Usuário sem nome',
    avatar_url: member.users.avatar_url,
  }));
}
