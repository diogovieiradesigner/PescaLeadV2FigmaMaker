/**
 * Hook para gerenciamento do calendário interno
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  InternalCalendar,
  InternalEvent,
  InternalEventCreate,
  InternalEventUpdate,
  InternalEventWithRelations,
  CalendarSettings,
  CalendarSettingsUpdate,
  EventType,
  AvailabilitySlot,
} from '../types/calendar.types';
import * as calendarService from '../services/calendar-service';

interface UseCalendarOptions {
  workspaceId: string;
  calendarId?: string;
  initialDate?: Date;
  initialAssigneeFilter?: string;
}

export function useCalendar({ workspaceId, calendarId, initialDate, initialAssigneeFilter }: UseCalendarOptions) {
  const queryClient = useQueryClient();

  // Estado local
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedEvent, setSelectedEvent] = useState<InternalEventWithRelations | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(initialAssigneeFilter || null);

  // Calcular range do mês atual
  const dateRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }, [currentDate]);

  // ============================================
  // QUERIES
  // ============================================

  // Buscar ou criar calendário padrão do workspace
  const {
    data: calendars = [],
    isLoading: isLoadingCalendars,
    error: calendarsError,
  } = useQuery({
    queryKey: ['calendars', workspaceId],
    queryFn: async () => {
      // Buscar calendários existentes
      const existing = await calendarService.fetchCalendars(workspaceId);

      // Se não houver calendário, criar o padrão
      if (existing.length === 0) {
        const defaultCalendar = await calendarService.ensureDefaultCalendar(workspaceId);
        return [defaultCalendar];
      }

      return existing;
    },
    enabled: !!workspaceId,
  });

  // Calendário ativo (primeiro ou selecionado)
  const activeCalendarId = calendarId || calendars[0]?.id;
  const activeCalendar = calendars.find(c => c.id === activeCalendarId);

  // Buscar membros do workspace para filtro
  const {
    data: workspaceMembers = [],
    isLoading: isLoadingMembers,
  } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => calendarService.fetchWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
  });

  // Buscar eventos do mês
  const {
    data: events = [],
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['calendar-events', workspaceId, dateRange.start.toISOString(), dateRange.end.toISOString(), assigneeFilter],
    queryFn: () => calendarService.fetchEventsByWorkspace(
      workspaceId,
      dateRange.start,
      dateRange.end,
      {
        includeRelations: true,
        assignedTo: assigneeFilter || undefined,
      }
    ),
    enabled: !!workspaceId,
  });

  // Buscar configurações do calendário (por workspace, não por calendário específico)
  const {
    data: settings,
    isLoading: isLoadingSettings,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['calendar-settings', workspaceId],
    queryFn: async () => {
      // Buscar settings do workspace (sem filtro de calendário específico)
      const result = await calendarService.fetchCalendarSettings(workspaceId);
      return result;
    },
    enabled: !!workspaceId,
  });

  // DEBUG: Log quando settings muda

  // ============================================
  // MUTATIONS
  // ============================================

  // Criar evento
  const createEventMutation = useMutation({
    mutationFn: (data: InternalEventCreate) => calendarService.createEvent(data),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] });
      toast.success('Evento criado com sucesso!');
      setIsEventModalOpen(false);
      return event;
    },
    onError: (error: any) => {
      console.error('[useCalendar] Error creating event:', error);
      toast.error('Erro ao criar evento');
    },
  });

  // Atualizar evento
  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: InternalEventUpdate }) =>
      calendarService.updateEvent(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] });
      toast.success('Evento atualizado!');
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      console.error('[useCalendar] Error updating event:', error);
      toast.error('Erro ao atualizar evento');
    },
  });

  // Cancelar evento
  const cancelEventMutation = useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason?: string }) =>
      calendarService.cancelEvent(eventId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] });
      toast.success('Evento cancelado');
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      console.error('[useCalendar] Error cancelling event:', error);
      toast.error('Erro ao cancelar evento');
    },
  });

  // Retomar evento cancelado
  const resumeEventMutation = useMutation({
    mutationFn: (eventId: string) =>
      calendarService.updateEvent(eventId, {
        event_status: 'tentative',
        cancelled_at: undefined,
        cancelled_reason: undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] });
      toast.success('Evento retomado!');
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      console.error('[useCalendar] Error resuming event:', error);
      toast.error('Erro ao retomar evento');
    },
  });

  // Confirmar evento
  const confirmEventMutation = useMutation({
    mutationFn: ({ eventId, method }: { eventId: string; method: 'manual' | 'whatsapp' | 'email' | 'ai' }) =>
      calendarService.confirmEvent(eventId, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] });
      toast.success('Evento confirmado!');
    },
    onError: (error: any) => {
      console.error('[useCalendar] Error confirming event:', error);
      toast.error('Erro ao confirmar evento');
    },
  });

  // Deletar evento
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => calendarService.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events', workspaceId] });
      toast.success('Evento excluído');
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      console.error('[useCalendar] Error deleting event:', error);
      toast.error('Erro ao excluir evento');
    },
  });

  // Atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: ({ settingsId, data }: { settingsId: string; data: CalendarSettingsUpdate }) =>
      calendarService.updateCalendarSettings(settingsId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-settings', workspaceId] });
      toast.success('Configurações salvas!');
    },
    onError: (error: any) => {
      console.error('[useCalendar] Error updating settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  // ============================================
  // ACTIONS
  // ============================================

  // Navegar para mês anterior
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  // Navegar para próximo mês
  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Ir para hoje
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Ir para uma data específica
  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // Abrir modal para criar evento
  const openCreateEventModal = useCallback((date?: Date) => {
    setSelectedEvent(null);
    if (date) {
      setCurrentDate(date);
    }
    setIsEventModalOpen(true);
  }, []);

  // Abrir modal para editar evento
  const openEditEventModal = useCallback((event: InternalEventWithRelations) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  }, []);

  // Fechar modal de evento
  const closeEventModal = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  }, []);

  // Criar evento
  const createEvent = useCallback(async (
    data: Omit<InternalEventCreate, 'workspace_id' | 'internal_calendar_id'>,
    reminders?: { remind_before_minutes: number; inbox_id?: string; message_template?: string }[]
  ): Promise<InternalEvent | null> => {
    if (!activeCalendarId) {
      toast.error('Nenhum calendário disponível');
      return null;
    }

    const event = await createEventMutation.mutateAsync({
      ...data,
      workspace_id: workspaceId,
      internal_calendar_id: activeCalendarId,
    });

    // Salvar lembretes se houver
    if (reminders && reminders.length > 0 && event?.id) {
      try {
        await calendarService.createEventReminders(event.id, workspaceId, reminders);
      } catch (error) {
        console.error('[useCalendar] Error creating reminders:', error);
        toast.error('Evento criado, mas houve erro ao salvar lembretes');
      }
    }

    return event;
  }, [workspaceId, activeCalendarId, createEventMutation]);

  // Atualizar evento
  const updateEvent = useCallback(async (eventId: string, data: InternalEventUpdate) => {
    await updateEventMutation.mutateAsync({ eventId, data });
  }, [updateEventMutation]);

  // Cancelar evento
  const cancelEvent = useCallback(async (eventId: string, reason?: string) => {
    await cancelEventMutation.mutateAsync({ eventId, reason });
  }, [cancelEventMutation]);

  // Retomar evento cancelado
  const resumeEvent = useCallback(async (eventId: string) => {
    await resumeEventMutation.mutateAsync(eventId);
  }, [resumeEventMutation]);

  // Confirmar evento
  const confirmEvent = useCallback(async (eventId: string, method: 'manual' | 'whatsapp' | 'email' | 'ai' = 'manual') => {
    await confirmEventMutation.mutateAsync({ eventId, method });
  }, [confirmEventMutation]);

  // Deletar evento
  const deleteEvent = useCallback(async (eventId: string) => {
    await deleteEventMutation.mutateAsync(eventId);
  }, [deleteEventMutation]);

  // Verificar disponibilidade
  const checkAvailability = useCallback(async (startTime: Date, endTime: Date): Promise<boolean> => {
    if (!activeCalendarId) return false;
    return calendarService.checkAvailability(workspaceId, activeCalendarId, startTime, endTime);
  }, [workspaceId, activeCalendarId]);

  // Buscar slots disponíveis
  const getAvailableSlots = useCallback(async (date: Date, durationMinutes: number): Promise<AvailabilitySlot[]> => {
    if (!activeCalendarId) return [];
    return calendarService.getAvailableSlots(workspaceId, activeCalendarId, date, durationMinutes);
  }, [workspaceId, activeCalendarId]);

  // ============================================
  // COMPUTED
  // ============================================

  // Helper para formatar data local como YYYY-MM-DD
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Agrupar eventos por data (para view mensal)
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, InternalEventWithRelations[]> = {};

    (events as InternalEventWithRelations[]).forEach(event => {
      // Usar data local para agrupar eventos
      const eventDate = new Date(event.start_time);
      const dateKey = formatLocalDate(eventDate);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  // Eventos do dia selecionado
  const eventsForSelectedDate = useMemo(() => {
    const dateKey = formatLocalDate(currentDate);
    return eventsByDate[dateKey] || [];
  }, [eventsByDate, currentDate]);

  // Próximos eventos (próximos 7 dias)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return (events as InternalEventWithRelations[])
      .filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate >= now && eventDate <= weekFromNow;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events]);

  // ============================================
  // LOADING STATE
  // ============================================
  const isLoading = isLoadingCalendars || isLoadingEvents || isLoadingSettings || isLoadingMembers;
  const isMutating = createEventMutation.isPending ||
                     updateEventMutation.isPending ||
                     cancelEventMutation.isPending ||
                     deleteEventMutation.isPending;

  return {
    // State
    currentDate,
    selectedEvent,
    isEventModalOpen,
    assigneeFilter,

    // Data
    calendars,
    activeCalendar,
    events: events as InternalEventWithRelations[],
    eventsByDate,
    eventsForSelectedDate,
    upcomingEvents,
    settings,
    workspaceMembers,

    // Loading
    isLoading,
    isMutating,
    isLoadingCalendars,
    isLoadingEvents,
    isLoadingSettings,
    isLoadingMembers,

    // Errors
    calendarsError,
    eventsError,

    // Navigation
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,

    // Modal
    openCreateEventModal,
    openEditEventModal,
    closeEventModal,

    // Filter
    setAssigneeFilter,

    // Actions
    createEvent,
    updateEvent,
    cancelEvent,
    resumeEvent,
    confirmEvent,
    deleteEvent,
    checkAvailability,
    getAvailableSlots,
    refetchEvents,
  };
}

// ============================================
// HOOK PARA EVENTOS DE UM LEAD
// ============================================

export function useLeadEvents(leadId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lead-events', leadId],
    queryFn: () => calendarService.fetchEventsByLead(leadId!),
    enabled: !!leadId,
  });

  const {
    data: nextEvent,
  } = useQuery({
    queryKey: ['lead-next-event', leadId],
    queryFn: () => calendarService.fetchNextEventByLead(leadId!),
    enabled: !!leadId,
  });

  return {
    events,
    nextEvent,
    isLoading,
    error,
    refetch,
  };
}
