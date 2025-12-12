import { useState, useMemo } from 'react';
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
  Clock,
  MapPin,
  User,
  Menu,
  Settings,
  MoreVertical,
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
import { cn } from './ui/utils';

interface CalendarViewProps {
  theme: Theme;
  onThemeToggle: () => void;
  onNavigateToSettings: () => void;
  onMobileMenuClick?: () => void;
}

// Ícones por tipo de evento
const EVENT_ICONS: Record<EventType, React.ElementType> = {
  meeting: Users,
  call: Phone,
  demo: Monitor,
  reminder: Bell,
};

export function CalendarView({
  theme,
  onThemeToggle,
  onNavigateToSettings,
  onMobileMenuClick,
}: CalendarViewProps) {
  const isDark = theme === 'dark';
  const { currentWorkspace } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    currentDate,
    events,
    eventsByDate,
    eventsForSelectedDate,
    upcomingEvents,
    settings,
    isLoading,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    openCreateEventModal,
    openEditEventModal,
    closeEventModal,
    isEventModalOpen,
    selectedEvent,
    createEvent,
    updateEvent,
    cancelEvent,
    resumeEvent,
    deleteEvent,
  } = useCalendar({
    workspaceId: currentWorkspace?.id || '',
  });

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

  // Renderizar evento no calendário
  const renderEventDot = (event: InternalEventWithRelations) => {
    const config = EVENT_TYPE_CONFIG[event.event_type];
    return (
      <div
        key={event.id}
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
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

    return (
      <div
        key={event.id}
        onClick={() => openEditEventModal(event)}
        className={cn(
          'p-3 rounded-lg cursor-pointer transition-all',
          isCancelled && 'opacity-60',
          isDark
            ? 'bg-white/5 hover:bg-white/10 border border-white/10'
            : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: isCancelled ? (isDark ? 'rgba(107,114,128,0.2)' : 'rgba(156,163,175,0.2)') : `${config.color}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: isCancelled ? '#9ca3af' : config.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4
                className={cn(
                  'font-medium truncate',
                  isCancelled && 'line-through',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                {event.title}
              </h4>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
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
              <span className={cn('text-xs', isCancelled && 'line-through', isDark ? 'text-white/50' : 'text-gray-500')}>
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
        'h-16 flex items-center justify-between px-4 md:px-6 border-b flex-shrink-0',
        isDark ? 'border-white/10' : 'border-gray-200'
      )}>
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMobileMenuClick}
            className={cn(
              'md:hidden p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
            )}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <CalendarIcon className={cn('w-6 h-6', isDark ? 'text-white' : 'text-gray-900')} />
            <h1 className={cn(
              'text-xl font-semibold hidden sm:block',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              Calendário
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-white/5 text-white/70' : 'hover:bg-gray-100 text-gray-500'
            )}
            title="Configurações do calendário"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={onThemeToggle}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
            )}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-white/70" />
            ) : (
              <Moon className="w-5 h-5 text-gray-500" />
            )}
          </button>

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
                onClick={goToPreviousMonth}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                )}
              >
                <ChevronLeft className={cn('w-5 h-5', isDark ? 'text-white' : 'text-gray-700')} />
              </button>

              <h2 className={cn(
                'text-lg font-semibold capitalize min-w-[180px] text-center',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                {monthName}
              </h2>

              <button
                onClick={goToNextMonth}
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
            </div>

            <button
              onClick={() => openCreateEventModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Evento</span>
            </button>
          </div>

          {/* Calendar Grid */}
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

                return (
                  <div
                    key={index}
                    onClick={() => goToDate(date)}
                    className={cn(
                      'min-h-[80px] md:min-h-[110px] p-1 md:p-2 border-b border-r cursor-pointer transition-colors overflow-hidden',
                      isDark ? 'border-white/5' : 'border-gray-100',
                      !isCurrentMonth && (isDark ? 'bg-white/[0.02]' : 'bg-gray-50'),
                      isSelected && (isDark ? 'bg-blue-500/10' : 'bg-blue-50'),
                      isToday && 'ring-1 ring-inset ring-blue-500'
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
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditEventModal(event);
                            }}
                            className={cn(
                              'text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80',
                              isCancelled
                                ? 'line-through opacity-60'
                                : 'text-white font-medium'
                            )}
                            style={{
                              backgroundColor: isCancelled
                                ? (isDark ? 'rgba(107, 114, 128, 0.5)' : 'rgba(156, 163, 175, 0.5)')
                                : config.color,
                              color: isCancelled
                                ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(75, 85, 99, 1)')
                                : 'white'
                            }}
                            title={`${formatTime(event.start_time)} - ${event.title}${isCancelled ? ' (Cancelado)' : ''}`}
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
        </div>

        {/* Sidebar - Events for selected day */}
        <div className={cn(
          'w-80 border-l flex-col hidden lg:flex',
          isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'
        )}>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  return (
                    <div
                      key={event.id}
                      onClick={() => openEditEventModal(event)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: config.color }}
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
          onClose={closeEventModal}
          event={selectedEvent}
          selectedDate={currentDate}
          settings={settings}
          workspaceId={currentWorkspace?.id || ''}
          onCreate={createEvent}
          onUpdate={updateEvent}
          onCancel={cancelEvent}
          onResume={resumeEvent}
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
        />
      )}
    </div>
  );
}
