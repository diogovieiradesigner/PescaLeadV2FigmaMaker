import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sun,
  Moon,
  Users,
  Phone,
  Monitor,
  Bell,
  Zap,
  CheckSquare,
  Square,
  CheckCircle,
  Clock,
  MapPin,
  User,
  UserCheck,
  Menu,
  Settings,
  GripVertical,
  Trash2,
  Filter,
  X,
  ChevronDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { ProfileMenu } from './ProfileMenu';
import { useCalendar } from '../hooks/useCalendar';
import { useAuth } from '../contexts/AuthContext';
import {
  InternalEventWithRelations,
  EventType,
  EVENT_TYPE_CONFIG,
  EVENT_STATUS_CONFIG,
} from '../types/calendar.types';
import { EventModal } from './calendar/EventModal';
import { CalendarSettingsModal } from './calendar/CalendarSettingsModal';
import { ConfirmDialog } from './ui/confirm-dialog';
import { cn } from './ui/utils';
import { GoogleCalendarModal } from './GoogleCalendarModal';
import { GoogleSyncBadge } from './CalendarSyncStatus';
import { GOOGLE_EVENT_DEFAULT_COLOR } from '../types/google-calendar.types';
import { isGoogleEvent } from '../services/google-calendar-service';
import { WeeklyCalendarGrid } from './calendar/WeeklyCalendarGrid';

// Tipo de visualização do calendário
type CalendarViewMode = 'month' | 'week';

interface CalendarViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
  onMobileMenuClick?: () => void;
  urlEventId?: string | null;
  onEventChange?: (eventId: string | null) => void;
}

// Ícones por tipo de evento
const EVENT_ICONS: Record<EventType, React.ElementType> = {
  meeting: Users,
  call: Phone,
  demo: Monitor,
  reminder: Bell,
  action: Zap,
  task: CheckSquare,
};

// Cores predefinidas para responsáveis
const ASSIGNEE_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#6366F1', // indigo-500
  '#14B8A6', // teal-500
  '#A855F7', // purple-500
];

// Função para obter cor consistente por assignee
function getAssigneeColor(assigneeId: string, colorMap: Map<string, string>): string {
  if (!colorMap.has(assigneeId)) {
    const colorIndex = colorMap.size % ASSIGNEE_COLORS.length;
    colorMap.set(assigneeId, ASSIGNEE_COLORS[colorIndex]);
  }
  return colorMap.get(assigneeId)!;
}

// Função para obter cor do evento (considerando Google)
function getEventColor(event: any, assigneeColorMap: Map<string, string>): string {
  // Eventos do Google usam cor cinza
  if (isGoogleEvent(event)) {
    return GOOGLE_EVENT_DEFAULT_COLOR;
  }
  // Se tem responsável, usar cor do responsável
  if (event.assigned_to) {
    return getAssigneeColor(event.assigned_to, assigneeColorMap);
  }
  // Senão usar cor do tipo de evento
  return EVENT_TYPE_CONFIG[event.event_type as EventType]?.color || '#3b82f6';
}

export function CalendarView({
  theme,
  onThemeToggle,
  onNavigateToSettings,
  onMobileMenuClick,
  urlEventId,
  onEventChange,
}: CalendarViewProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<InternalEventWithRelations | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; event: InternalEventWithRelations | null; isLoading: boolean }>({
    isOpen: false,
    event: null,
    isLoading: false,
  });
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);

  // View mode state (month or week)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Sidebar resize state
  const SIDEBAR_MIN_WIDTH = 280;
  const SIDEBAR_MAX_WIDTH = 500;
  const SIDEBAR_DEFAULT_WIDTH = 320;
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check for Google Calendar callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true' || params.get('google_error')) {
      setIsGoogleModalOpen(true);
    }
  }, []);

  const {
    currentDate,
    events,
    eventsByDate,
    eventsForSelectedDate,
    upcomingEvents,
    settings,
    isLoading,
    workspaceMembers,
    assigneeFilter,
    setAssigneeFilter,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    openCreateEventModal,
    openEditEventModal,
    closeEventModal,
    isEventModalOpen,
    selectedEvent,
    selectedDateForModal,
    createEvent,
    updateEvent,
    cancelEvent,
    resumeEvent,
    completeEvent,
    deleteEvent,
    refetchEvents,
  } = useCalendar({
    workspaceId: currentWorkspace?.id || '',
  });

  // ✅ Abrir evento automaticamente quando há eventId na URL (/calendario/evento/:eventId)
  useEffect(() => {
    if (urlEventId && events.length > 0 && !isEventModalOpen) {
      const eventFromUrl = events.find(e => e.id === urlEventId);
      if (eventFromUrl) {
        openEditEventModal(eventFromUrl);
      } else {
        // Limpa a URL se o evento não existir
        onEventChange?.(null);
      }
    }
  }, [urlEventId, events, isEventModalOpen, openEditEventModal, onEventChange]);

  // ✅ Wrapper para openEditEventModal que também atualiza a URL
  const handleOpenEditEventModal = useCallback((event: InternalEventWithRelations) => {
    openEditEventModal(event);
    onEventChange?.(event.id);
  }, [openEditEventModal, onEventChange]);

  // ✅ Wrapper para closeEventModal que também limpa a URL
  const handleCloseEventModal = useCallback(() => {
    closeEventModal();
    onEventChange?.(null);
  }, [closeEventModal, onEventChange]);

  // Navegação semanal
  const goToPreviousWeek = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    goToDate(newDate);
  }, [currentDate, goToDate]);

  const goToNextWeek = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    goToDate(newDate);
  }, [currentDate, goToDate]);

  // Navegação unificada baseada no viewMode
  const goToPrevious = useCallback(() => {
    if (viewMode === 'week') {
      goToPreviousWeek();
    } else {
      goToPreviousMonth();
    }
  }, [viewMode, goToPreviousWeek, goToPreviousMonth]);

  const goToNext = useCallback(() => {
    if (viewMode === 'week') {
      goToNextWeek();
    } else {
      goToNextMonth();
    }
  }, [viewMode, goToNextWeek, goToNextMonth]);

  // Handler para clique em slot do grid semanal
  const handleWeekSlotClick = useCallback((date: Date, hour: number) => {
    // Criar novo Date com a hora específica
    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);
    openCreateEventModal(slotDate);
  }, [openCreateEventModal]);

  // Sidebar resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const containerRect = sidebarRef.current?.parentElement?.getBoundingClientRect();
    if (!containerRect) return;

    // Calculate new width from the right edge
    const newWidth = containerRect.right - e.clientX;
    const clampedWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, newWidth));
    setSidebarWidth(clampedWidth);
  }, [isResizing, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Mapa de cores por responsável (memoizado)
  const assigneeColorMap = useMemo(() => {
    const colorMap = new Map<string, string>();
    // Pré-popular com membros do workspace para manter cores consistentes
    workspaceMembers.forEach((member) => {
      getAssigneeColor(member.id, colorMap);
    });
    return colorMap;
  }, [workspaceMembers]);

  // Nome do responsável filtrado
  const filteredAssigneeName = useMemo(() => {
    if (!assigneeFilter) return null;
    const member = workspaceMembers.find(m => m.id === assigneeFilter);
    return member?.name || 'Desconhecido';
  }, [assigneeFilter, workspaceMembers]);

  // Dias do mês atual
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Dias do mês anterior para preencher a primeira semana
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, isToday: false });
    }

    // Dias do mês atual
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      days.push({ date, isCurrentMonth: true, isToday });
    }

    // Dias do próximo mês para completar a última semana
    const remainingDays = 42 - days.length; // 6 semanas * 7 dias
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [currentDate]);

  // Nome do mês
  const monthName = currentDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  // Nome da semana (para visualização semanal)
  const weekName = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startMonth = startOfWeek.toLocaleDateString('pt-BR', { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString('pt-BR', { month: 'short' });
    const year = endOfWeek.getFullYear();

    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
      return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${endMonth} ${year}`;
    }
    return `${startOfWeek.getDate()} de ${startMonth} - ${endOfWeek.getDate()} de ${endMonth} ${year}`;
  }, [currentDate]);

  // Label de navegação baseado no viewMode
  const navigationLabel = viewMode === 'week' ? weekName : monthName;

  // Função para obter cor do evento (exposta para o WeeklyCalendarGrid)
  const getEventColorForGrid = useCallback((event: InternalEventWithRelations): string => {
    if (isGoogleEvent(event)) {
      return GOOGLE_EVENT_DEFAULT_COLOR;
    }
    if (event.assigned_to) {
      return getAssigneeColor(event.assigned_to, assigneeColorMap);
    }
    return EVENT_TYPE_CONFIG[event.event_type as EventType]?.color || '#3b82f6';
  }, [assigneeColorMap]);

  // Handler para mover eventos na visualização semanal (drag and drop)
  const handleWeeklyEventMove = useCallback(async (
    event: InternalEventWithRelations,
    newStartTime: Date,
    newEndTime: Date
  ) => {
    try {
      await updateEvent(event.id, {
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
      });
    } catch (error) {
      console.error('[CalendarView] Erro ao mover evento:', error);
    }
  }, [updateEvent]);

  // Formatar hora
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper para formatar data local como YYYY-MM-DD
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Eventos de um dia específico
  const getEventsForDay = (date: Date): InternalEventWithRelations[] => {
    const dateKey = formatLocalDate(date);
    return eventsByDate[dateKey] || [];
  };

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, event: InternalEventWithRelations) => {
    e.stopPropagation();
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
    // Add a slight delay to show the dragging state
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedEvent(null);
    setDragOverDate(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateKey) {
      setDragOverDate(dateKey);
    }
  }, [dragOverDate]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if leaving the cell entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverDate(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);

    if (!draggedEvent) return;

    // Calculate the new start and end times
    const originalStart = new Date(draggedEvent.start_time);
    const originalEnd = new Date(draggedEvent.end_time);
    const duration = originalEnd.getTime() - originalStart.getTime();

    // Keep the same time, just change the date
    const newStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      originalStart.getHours(),
      originalStart.getMinutes(),
      originalStart.getSeconds()
    );
    const newEnd = new Date(newStart.getTime() + duration);

    // Don't update if dropped on the same day
    if (formatLocalDate(originalStart) === formatLocalDate(targetDate)) {
      setDraggedEvent(null);
      return;
    }

    try {
      await updateEvent(draggedEvent.id, {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      });
    } catch (error) {
      console.error('[CalendarView] Error moving event:', error);
    }

    setDraggedEvent(null);
  }, [draggedEvent, updateEvent, formatLocalDate]);

  // Renderizar evento no calendário
  const renderEventDot = (event: InternalEventWithRelations) => {
    const config = EVENT_TYPE_CONFIG[event.event_type];
    // Usar cor do responsável se tiver, senão usar cor do tipo
    const eventColor = event.assigned_to
      ? getAssigneeColor(event.assigned_to, assigneeColorMap)
      : config.color;
    return (
      <div
        key={event.id}
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: eventColor }}
        title={event.title}
      />
    );
  };

  // Renderizar evento na lista lateral
  const renderEventCard = (event: InternalEventWithRelations) => {
    const config = EVENT_TYPE_CONFIG[event.event_type];
    const statusConfig = EVENT_STATUS_CONFIG[event.event_status];
    const Icon = EVENT_ICONS[event.event_type];
    const isCancelled = event.event_status === 'cancelled';
    const isCompleted = event.event_status === 'completed';
    const isInactive = isCancelled || isCompleted;
    const isToggling = togglingEventId === event.id;
    // Usar cor do responsável se tiver, senão usar cor do tipo
    const eventColor = event.assigned_to
      ? getAssigneeColor(event.assigned_to, assigneeColorMap)
      : config.color;

    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteConfirm({ isOpen: true, event, isLoading: false });
    };

    // Handler para toggle de concluído/pendente (na sidebar, não fecha modal)
    const handleToggleComplete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCancelled || isToggling) return;

      setTogglingEventId(event.id);
      try {
        if (isCompleted) {
          await resumeEvent(event.id, false); // false = não fechar modal
        } else {
          await completeEvent(event.id, false); // false = não fechar modal
        }
      } finally {
        setTogglingEventId(null);
      }
    };

    return (
      <div
        key={event.id}
        className={cn(
          'p-3 rounded-lg transition-all group relative',
          isInactive && 'opacity-60',
          isDark
            ? 'bg-white/5 hover:bg-white/10 border border-white/10'
            : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'
        )}
      >
        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10',
            isDark
              ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300'
              : 'hover:bg-red-50 text-red-400 hover:text-red-500'
          )}
          title="Excluir evento"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          {/* Checkbox para concluir/reabrir evento */}
          <button
            onClick={handleToggleComplete}
            disabled={isCancelled || isToggling}
            className={cn(
              'p-2 rounded-lg transition-all flex-shrink-0',
              isCancelled
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:scale-110',
              isCompleted
                ? isDark
                  ? 'bg-green-500/20 hover:bg-green-500/30'
                  : 'bg-green-100 hover:bg-green-200'
                : isDark
                  ? 'bg-white/5 hover:bg-white/10'
                  : 'bg-gray-100 hover:bg-gray-200'
            )}
            style={{
              backgroundColor: !isCancelled && !isCompleted
                ? (isDark ? 'rgba(107,114,128,0.2)' : 'rgba(156,163,175,0.2)')
                : undefined
            }}
            title={isCancelled ? 'Evento cancelado' : isCompleted ? 'Reabrir evento' : 'Marcar como concluído'}
          >
            {isToggling ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: eventColor }} />
            ) : isCompleted ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : isCancelled ? (
              <X className="w-4 h-4 text-gray-400" />
            ) : (
              <Square className="w-4 h-4" style={{ color: eventColor }} />
            )}
          </button>

          {/* Conteúdo do evento (clicável para abrir modal) */}
          <div
            onClick={() => handleOpenEditEventModal(event)}
            className="cursor-pointer flex-1 min-w-0 pr-6"
          >
            <div className="flex items-center justify-between gap-2">
              <h4
                className={cn(
                  'font-medium truncate',
                  isCancelled && 'line-through',
                  isCompleted && 'line-through',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                {event.title}
              </h4>
              <span
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: `${statusConfig.color}20`,
                  color: statusConfig.color,
                }}
              >
                {statusConfig.label}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Clock className={cn('w-3 h-3', isDark ? 'text-white/50' : 'text-gray-400')} />
              <span className={cn('text-xs', isInactive && 'line-through', isDark ? 'text-white/50' : 'text-gray-500')}>
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </span>
            </div>

            {event.lead && (
              <div className="flex items-center gap-2 mt-1">
                <User className={cn('w-3 h-3', isDark ? 'text-white/50' : 'text-gray-400')} />
                <span className={cn('text-xs truncate', isDark ? 'text-white/50' : 'text-gray-500')}>
                  {event.lead.client_name}
                </span>
              </div>
            )}

            {event.assignee && (
              <div className="flex items-center gap-2 mt-1">
                <UserCheck className={cn('w-3 h-3', isDark ? 'text-blue-400' : 'text-blue-500')} />
                <span className={cn('text-xs truncate', isDark ? 'text-blue-400' : 'text-blue-600')}>
                  {event.assignee.name}
                </span>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-2 mt-1">
                <MapPin className={cn('w-3 h-3', isDark ? 'text-white/50' : 'text-gray-400')} />
                <span className={cn('text-xs truncate', isDark ? 'text-white/50' : 'text-gray-500')}>
                  {event.location}
                </span>
              </div>
            )}

            {isCancelled && event.cancelled_reason && (
              <div className={cn('text-xs mt-2 italic', isDark ? 'text-white/40' : 'text-gray-400')}>
                Motivo: {event.cancelled_reason}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!currentWorkspace) {
    return (
      <div className={cn(
        'flex-1 flex items-center justify-center',
        isDark ? 'bg-true-black text-white' : 'bg-light-bg text-gray-900'
      )}>
        Selecione um workspace
      </div>
    );
  }

  return (
    <div className={cn(
      'flex-1 flex flex-col h-screen overflow-hidden',
      isDark ? 'bg-true-black' : 'bg-light-bg'
    )}>
      {/* Header */}
      <header className={cn(
        'h-16 border-b flex items-center justify-between px-4 md:px-6 transition-colors',
        isDark ? 'bg-black border-white/[0.08]' : 'bg-white border-zinc-200'
      )}>
        {/* Left Section */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Menu Button */}
          {onMobileMenuClick && (
            <button
              onClick={onMobileMenuClick}
              className={cn(
                'md:hidden h-9 w-9 rounded-lg transition-colors flex items-center justify-center',
                isDark
                  ? 'hover:bg-white/10 text-white/70 hover:text-white'
                  : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
              )}
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Title and Description - First */}
          <div>
            <h1 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-zinc-900')}>
              Calendário
            </h1>
            <p className={cn('text-xs mt-0.5 hidden sm:block', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              Gerencie seus eventos e compromissos
            </p>
          </div>

          {/* Separator */}
          <div className={cn('hidden sm:block h-6 w-px mx-1', isDark ? 'bg-white/10' : 'bg-zinc-200')} />

          {/* Calendar Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              'h-9 w-9 rounded-lg transition-colors flex items-center justify-center',
              isDark
                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
            )}
            title="Configurações do calendário"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Google Calendar Sync Button */}
          {currentWorkspace && (
            <button
              onClick={() => setIsGoogleModalOpen(true)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isDark
                  ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white/70 hover:text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
              )}
              title="Sincronizar com Google Calendar"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Sincronizar calendários</span>
            </button>
          )}

          {/* Google Calendar Status Badge - Last */}
          {currentWorkspace && (
            <GoogleSyncBadge
              workspaceId={currentWorkspace.id}
              theme={theme}
              onConnect={() => setIsGoogleModalOpen(true)}
            />
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className={cn(
              'h-9 w-9 rounded-lg transition-colors flex items-center justify-center',
              isDark
                ? 'hover:bg-white/10 text-white/70 hover:text-white'
                : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
            )}
            title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* User Profile */}
          <ProfileMenu theme={theme} onNavigateToSettings={onNavigateToSettings} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevious}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                )}
              >
                <ChevronLeft className={cn('w-5 h-5', isDark ? 'text-white' : 'text-gray-700')} />
              </button>

              <h2 className={cn(
                'text-lg font-semibold capitalize min-w-[220px] text-center',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                {navigationLabel}
              </h2>

              <button
                onClick={goToNext}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                )}
              >
                <ChevronRight className={cn('w-5 h-5', isDark ? 'text-white' : 'text-gray-700')} />
              </button>

              <button
                onClick={goToToday}
                className={cn(
                  'ml-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                )}
              >
                Hoje
              </button>

              {/* View Mode Selector */}
              <div className={cn(
                'flex items-center rounded-lg p-0.5 ml-2',
                isDark ? 'bg-white/5' : 'bg-gray-100'
              )}>
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    viewMode === 'month'
                      ? 'bg-blue-600 text-white'
                      : isDark
                        ? 'text-white/70 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    viewMode === 'week'
                      ? 'bg-blue-600 text-white'
                      : isDark
                        ? 'text-white/70 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  Semanal
                </button>
              </div>

              {/* Filtro por responsável */}
              <div className="relative ml-2">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                    assigneeFilter
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : isDark
                        ? 'bg-white/5 hover:bg-white/10 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  )}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {assigneeFilter ? filteredAssigneeName : 'Responsável'}
                  </span>
                  <ChevronDown className={cn('w-3 h-3 transition-transform', isFilterOpen && 'rotate-180')} />
                </button>

                {/* Dropdown de membros */}
                {isFilterOpen && (
                  <>
                    {/* Backdrop para fechar o dropdown */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsFilterOpen(false)}
                    />
                    <div className={cn(
                      'absolute top-full left-0 mt-1 w-56 rounded-lg border shadow-lg z-20 max-h-64 overflow-y-auto scrollbar-thin',
                      isDark
                        ? 'bg-zinc-900 border-white/10'
                        : 'bg-white border-gray-200'
                    )}>
                      {/* Opção para limpar filtro */}
                      <button
                        onClick={() => {
                          setAssigneeFilter(null);
                          setIsFilterOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                          isDark
                            ? 'hover:bg-white/5 text-white/70'
                            : 'hover:bg-gray-50 text-gray-600',
                          !assigneeFilter && (isDark ? 'bg-white/5' : 'bg-gray-50')
                        )}
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-400/20 flex items-center justify-center">
                          <Users className="w-3 h-3" />
                        </div>
                        <span>Todos os responsáveis</span>
                        {!assigneeFilter && <span className="ml-auto text-blue-500">✓</span>}
                      </button>

                      <div className={cn('h-px my-1', isDark ? 'bg-white/10' : 'bg-gray-200')} />

                      {/* Lista de membros */}
                      {workspaceMembers.map((member) => {
                        const memberColor = getAssigneeColor(member.id, assigneeColorMap);
                        const isSelected = assigneeFilter === member.id;
                        return (
                          <button
                            key={member.id}
                            onClick={() => {
                              setAssigneeFilter(member.id);
                              setIsFilterOpen(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                              isDark
                                ? 'hover:bg-white/5'
                                : 'hover:bg-gray-50',
                              isSelected && (isDark ? 'bg-white/5' : 'bg-gray-50')
                            )}
                          >
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                style={{ backgroundColor: memberColor }}
                              >
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={cn(
                              'truncate',
                              isDark ? 'text-white' : 'text-gray-900'
                            )}>
                              {member.name}
                            </span>
                            <div
                              className="w-2 h-2 rounded-full ml-auto"
                              style={{ backgroundColor: memberColor }}
                            />
                            {isSelected && <span className="text-blue-500">✓</span>}
                          </button>
                        );
                      })}

                      {workspaceMembers.length === 0 && (
                        <div className={cn(
                          'px-3 py-4 text-sm text-center',
                          isDark ? 'text-white/50' : 'text-gray-500'
                        )}>
                          Nenhum membro encontrado
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Badge de filtro ativo */}
              {assigneeFilter && (
                <button
                  onClick={() => setAssigneeFilter(null)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors',
                    isDark
                      ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  )}
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>

            <button
              onClick={() => openCreateEventModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Evento</span>
            </button>
          </div>

          {/* Calendar Grid - Conditional render based on viewMode */}
          {viewMode === 'month' ? (
            <div className={cn(
              'flex-1 rounded-xl border overflow-hidden',
              isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'
            )}>
              {/* Weekday Headers */}
              <div className={cn(
                'grid grid-cols-7 border-b',
                isDark ? 'border-white/10' : 'border-gray-200'
              )}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div
                    key={day}
                    className={cn(
                      'p-2 text-center text-sm font-medium',
                      isDark ? 'text-white/50' : 'text-gray-500'
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 flex-1">
                {calendarDays.map(({ date, isCurrentMonth, isToday }, index) => {
                  const dayEvents = getEventsForDay(date);
                  const isSelected =
                    date.toDateString() === currentDate.toDateString();
                  const maxVisibleEvents = 2; // Número máximo de eventos visíveis por dia
                  const dateKey = formatLocalDate(date);
                  const isDragOver = dragOverDate === dateKey;

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        goToDate(date);
                        // Abrir modal de criação ao clicar no dia
                        openCreateEventModal(date);
                      }}
                      onDragOver={(e) => handleDragOver(e, dateKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, date)}
                      className={cn(
                        'min-h-[80px] md:min-h-[110px] p-1 md:p-2 border-b border-r cursor-pointer transition-all overflow-hidden',
                        isDark ? 'border-white/5' : 'border-gray-100',
                        !isCurrentMonth && (isDark ? 'bg-white/[0.02]' : 'bg-gray-50'),
                        isSelected && (isDark ? 'bg-blue-500/10' : 'bg-blue-50'),
                        isToday && 'ring-1 ring-inset ring-blue-500',
                        isDragOver && (isDark ? 'bg-blue-500/20 ring-2 ring-blue-500' : 'bg-blue-100 ring-2 ring-blue-500')
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
                            isToday && 'bg-blue-600 text-white',
                            !isToday && !isCurrentMonth && (isDark ? 'text-white/30' : 'text-gray-400'),
                            !isToday && isCurrentMonth && (isDark ? 'text-white' : 'text-gray-900')
                          )}
                        >
                          {date.getDate()}
                        </span>
                      </div>

                      {/* Event lines */}
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, maxVisibleEvents).map((event) => {
                          const config = EVENT_TYPE_CONFIG[event.event_type];
                          const isCancelled = event.event_status === 'cancelled';
                          const isDraggable = !isCancelled;
                          // Usar cor do responsável se tiver, senão usar cor do tipo
                          const eventColor = event.assigned_to
                            ? getAssigneeColor(event.assigned_to, assigneeColorMap)
                            : config.color;
                          return (
                            <div
                              key={event.id}
                              draggable={isDraggable}
                              onDragStart={(e) => isDraggable && handleDragStart(e, event)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditEventModal(event);
                              }}
                              className={cn(
                                'text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate transition-all group',
                                isCancelled
                                  ? 'line-through opacity-60 cursor-pointer'
                                  : 'text-white font-medium cursor-grab active:cursor-grabbing hover:opacity-90',
                                draggedEvent?.id === event.id && 'opacity-50 ring-2 ring-white'
                              )}
                              style={{
                                backgroundColor: isCancelled
                                  ? (isDark ? 'rgba(107, 114, 128, 0.5)' : 'rgba(156, 163, 175, 0.5)')
                                  : eventColor,
                                color: isCancelled
                                  ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(75, 85, 99, 1)')
                                  : 'white'
                              }}
                              title={`${formatTime(event.start_time)} - ${event.title}${event.assignee ? ` (${event.assignee.name})` : ''}${isCancelled ? ' (Cancelado)' : ''}\n${isDraggable ? 'Arraste para mover' : ''}`}
                            >
                              <span className="hidden md:inline">{formatTime(event.start_time)} </span>
                              {event.title}
                              {isCancelled && <span className="ml-1 text-[8px] md:text-[10px]">✕</span>}
                            </div>
                          );
                        })}
                        {dayEvents.length > maxVisibleEvents && (
                          <div className={cn(
                            'text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate',
                            isDark ? 'bg-white/10 text-white/70' : 'bg-gray-200 text-gray-600'
                          )}>
                            +{dayEvents.length - maxVisibleEvents} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <WeeklyCalendarGrid
              theme={theme}
              currentDate={currentDate}
              events={events}
              onEventClick={handleOpenEditEventModal}
              onSlotClick={handleWeekSlotClick}
              getEventColor={getEventColorForGrid}
              onEventMove={handleWeeklyEventMove}
            />
          )}
        </div>

        {/* Sidebar - Events for selected day */}
        <div
          ref={sidebarRef}
          className={cn(
            'border-l flex-col hidden lg:flex relative',
            isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'
          )}
          style={{ width: sidebarWidth }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 group',
              'hover:bg-blue-500/50 transition-colors',
              isResizing && 'bg-blue-500'
            )}
            title="Arraste para redimensionar"
          >
            {/* Visual indicator line */}
            <div className={cn(
              'absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity',
              isDark ? 'bg-blue-400' : 'bg-blue-500',
              isResizing && 'opacity-100'
            )} />
          </div>

          {/* Selected Day Header */}
          <div className={cn(
            'p-4 border-b',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}>
            <h3 className={cn(
              'font-semibold',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              {currentDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <p className={cn(
              'text-sm mt-1',
              isDark ? 'text-white/50' : 'text-gray-500'
            )}>
              {eventsForSelectedDate.length} evento(s)
            </p>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {isLoading ? (
              <div className={cn(
                'text-center py-8',
                isDark ? 'text-white/50' : 'text-gray-500'
              )}>
                Carregando...
              </div>
            ) : eventsForSelectedDate.length === 0 ? (
              <div className={cn(
                'text-center py-8',
                isDark ? 'text-white/50' : 'text-gray-500'
              )}>
                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum evento neste dia</p>
                <button
                  onClick={() => openCreateEventModal(currentDate)}
                  className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
                >
                  Criar evento
                </button>
              </div>
            ) : (
              eventsForSelectedDate.map(renderEventCard)
            )}
          </div>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className={cn(
              'border-t p-4',
              isDark ? 'border-white/10' : 'border-gray-200'
            )}>
              <h4 className={cn(
                'text-sm font-medium mb-3',
                isDark ? 'text-white/70' : 'text-gray-600'
              )}>
                Próximos eventos
              </h4>
              <div className="space-y-2">
                {upcomingEvents.slice(0, 3).map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.event_type];
                  // Usar cor do responsável se tiver, senão usar cor do tipo
                  const eventColor = event.assigned_to
                    ? getAssigneeColor(event.assigned_to, assigneeColorMap)
                    : config.color;
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleOpenEditEventModal(event)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: eventColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm truncate',
                          isDark ? 'text-white' : 'text-gray-900'
                        )}>
                          {event.title}
                        </p>
                        <p className={cn(
                          'text-xs',
                          isDark ? 'text-white/50' : 'text-gray-500'
                        )}>
                          {new Date(event.start_time).toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: 'numeric',
                          })} às {formatTime(event.start_time)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {isEventModalOpen && (
        <EventModal
          theme={theme}
          isOpen={isEventModalOpen}
          onClose={handleCloseEventModal}
          event={selectedEvent}
          selectedDate={selectedDateForModal}
          settings={settings}
          workspaceId={currentWorkspace?.id || ''}
          onCreate={createEvent}
          onUpdate={updateEvent}
          onCancel={cancelEvent}
          onResume={resumeEvent}
          onComplete={completeEvent}
          onDelete={deleteEvent}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <CalendarSettingsModal
          theme={theme}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          workspaceId={currentWorkspace?.id || ''}
          workspaceSlug={currentWorkspace?.slug}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, event: null, isLoading: false })}
        onConfirm={async () => {
          if (deleteConfirm.event) {
            setDeleteConfirm(prev => ({ ...prev, isLoading: true }));
            await deleteEvent(deleteConfirm.event.id);
            setDeleteConfirm({ isOpen: false, event: null, isLoading: false });
          }
        }}
        title="Excluir evento"
        description={`Tem certeza que deseja excluir "${deleteConfirm.event?.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isDark={isDark}
        isLoading={deleteConfirm.isLoading}
      />

      {/* Google Calendar Modal */}
      <GoogleCalendarModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        theme={theme}
        workspaceId={currentWorkspace?.id || ''}
        onSyncComplete={() => {
          // Re-fetch events after sync (sem reload da página)
          refetchEvents();
        }}
      />
    </div>
  );
}
