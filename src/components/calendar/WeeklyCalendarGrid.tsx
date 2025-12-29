import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '../ui/utils';
import { Theme } from '../../hooks/useTheme';
import {
  InternalEventWithRelations,
  EventType,
  EVENT_TYPE_CONFIG,
} from '../../types/calendar.types';

interface WeeklyCalendarGridProps {
  theme: Theme;
  currentDate: Date;
  events: InternalEventWithRelations[];
  onEventClick: (event: InternalEventWithRelations) => void;
  onSlotClick: (date: Date, hour: number) => void;
  getEventColor: (event: InternalEventWithRelations) => string;
  onEventMove?: (event: InternalEventWithRelations, newStartTime: Date, newEndTime: Date) => Promise<void>;
}

// Constantes
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23
const HOUR_HEIGHT = 60; // pixels por hora
const DAYS_OF_WEEK = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.'];

// Helper para formatar hora
const formatHour = (hour: number): string => {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
};

// Helper para obter timezone offset label
const getTimezoneLabel = (): string => {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const sign = offset <= 0 ? '+' : '-';
  return `GMT${sign}${String(hours).padStart(2, '0')}`;
};

// Helper para formatar data local como YYYY-MM-DD
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper para obter dias da semana
const getWeekDays = (date: Date): Date[] => {
  const startOfWeek = new Date(date);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });
};

// Interface para eventos processados (para layout)
interface ProcessedEvent {
  event: InternalEventWithRelations;
  top: number;
  height: number;
  left: number;
  width: number;
  column: number;
  totalColumns: number;
}

export function WeeklyCalendarGrid({
  theme,
  currentDate,
  events,
  onEventClick,
  onSlotClick,
  getEventColor,
  onEventMove,
}: WeeklyCalendarGridProps) {
  const isDark = theme === 'dark';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // Drag and drop state
  const [draggedEvent, setDraggedEvent] = useState<InternalEventWithRelations | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIndex: number; hour: number; minutes: number } | null>(null);

  // Estado para atualização otimista (mantém evento na posição enquanto API responde)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, { start_time: string; end_time: string }>>(new Map());

  // Resize state
  const [resizingEvent, setResizingEvent] = useState<InternalEventWithRelations | null>(null);
  const [resizeStartY, setResizeStartY] = useState<number>(0);
  const [resizeOriginalHeight, setResizeOriginalHeight] = useState<number>(0);
  const [resizeCurrentHeight, setResizeCurrentHeight] = useState<number>(0);

  // Flag para prevenir click após drag/resize
  const justDraggedRef = useRef<boolean>(false);

  // Dias da semana atual
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Verificar se um dia é hoje
  const isToday = useCallback((date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Calcular posição atual do tempo
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return (hours + minutes / 60) * HOUR_HEIGHT;
  }, []);

  // Verificar se a semana atual contém hoje
  const weekContainsToday = useMemo(() => {
    return weekDays.some(isToday);
  }, [weekDays, isToday]);

  // Índice do dia de hoje na semana (0-6, ou -1 se não estiver na semana)
  const todayIndex = useMemo(() => {
    return weekDays.findIndex(isToday);
  }, [weekDays, isToday]);

  // Agrupar eventos por dia (com atualizações otimistas)
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, InternalEventWithRelations[]> = {};

    weekDays.forEach(day => {
      const dateKey = formatLocalDate(day);
      grouped[dateKey] = [];
    });

    events.forEach(event => {
      // Verificar se há uma atualização otimista para este evento
      const optimisticUpdate = optimisticUpdates.get(event.id);
      const effectiveStartTime = optimisticUpdate ? optimisticUpdate.start_time : event.start_time;

      const eventDate = new Date(effectiveStartTime);
      const dateKey = formatLocalDate(eventDate);
      if (grouped[dateKey]) {
        // Se houver atualização otimista, criar uma versão modificada do evento
        if (optimisticUpdate) {
          grouped[dateKey].push({
            ...event,
            start_time: optimisticUpdate.start_time,
            end_time: optimisticUpdate.end_time,
          });
        } else {
          grouped[dateKey].push(event);
        }
      }
    });

    return grouped;
  }, [events, weekDays, optimisticUpdates]);

  // Processar eventos para layout (posição e tamanho)
  const processEventsForDay = useCallback((dayEvents: InternalEventWithRelations[]): ProcessedEvent[] => {
    if (dayEvents.length === 0) return [];

    // Ordenar por hora de início
    const sorted = [...dayEvents].sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Detectar sobreposições e calcular colunas
    const processed: ProcessedEvent[] = [];
    const columns: { end: number; events: ProcessedEvent[] }[] = [];

    sorted.forEach(event => {
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);

      const startHours = startTime.getHours() + startTime.getMinutes() / 60;
      const endHours = endTime.getHours() + endTime.getMinutes() / 60;
      const duration = endHours - startHours;

      const top = startHours * HOUR_HEIGHT;
      const height = Math.max(duration * HOUR_HEIGHT, 20); // Mínimo 20px

      // Encontrar coluna disponível
      let columnIndex = 0;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].end <= startHours) {
          columnIndex = i;
          break;
        }
        columnIndex = i + 1;
      }

      // Criar ou atualizar coluna
      if (!columns[columnIndex]) {
        columns[columnIndex] = { end: endHours, events: [] };
      } else {
        columns[columnIndex].end = Math.max(columns[columnIndex].end, endHours);
      }

      const processedEvent: ProcessedEvent = {
        event,
        top,
        height,
        left: 0, // Será calculado depois
        width: 100, // Será calculado depois
        column: columnIndex,
        totalColumns: 1, // Será atualizado depois
      };

      columns[columnIndex].events.push(processedEvent);
      processed.push(processedEvent);
    });

    // Atualizar larguras e posições baseado no número de colunas
    const totalColumns = columns.length;
    processed.forEach(pe => {
      pe.totalColumns = totalColumns;
      pe.width = 100 / totalColumns;
      pe.left = pe.column * pe.width;
    });

    return processed;
  }, []);

  // Scroll para horário atual ao montar
  useEffect(() => {
    if (scrollContainerRef.current && weekContainsToday) {
      const now = new Date();
      const currentHour = now.getHours();
      // Scroll para 1 hora antes do horário atual
      const scrollTo = Math.max(0, (currentHour - 1) * HOUR_HEIGHT);
      scrollContainerRef.current.scrollTop = scrollTo;
    }
  }, [weekContainsToday]);

  // Atualizar linha de tempo atual a cada minuto
  useEffect(() => {
    const updateCurrentTime = () => {
      if (currentTimeRef.current) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const position = (hours + minutes / 60) * HOUR_HEIGHT;
        currentTimeRef.current.style.top = `${position}px`;
      }
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, []);

  // Handler para clique em slot
  const handleSlotClick = useCallback((dayIndex: number, hour: number) => {
    const date = new Date(weekDays[dayIndex]);
    date.setHours(hour, 0, 0, 0);
    onSlotClick(date, hour);
  }, [weekDays, onSlotClick]);

  // ============================================
  // DRAG AND DROP HANDLERS
  // ============================================

  // Iniciar drag de evento
  const handleDragStart = useCallback((e: React.DragEvent, event: InternalEventWithRelations) => {
    // Não permitir arrastar eventos cancelados ou concluídos
    if (event.event_status === 'cancelled' || event.event_status === 'completed') {
      e.preventDefault();
      return;
    }

    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);

    // Adicionar classe visual ao elemento sendo arrastado
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  // Finalizar drag
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Marcar que houve drag para prevenir click
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 100);

    setDraggedEvent(null);
    setDragOverSlot(null);

    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  }, []);

  // Evento sobre um slot - calcula minutos baseado na posição Y do mouse
  const handleDragOver = useCallback((e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Calcular posição relativa do mouse dentro do slot para determinar os minutos
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const percentInSlot = relativeY / HOUR_HEIGHT;

    // Arredondar para intervalos de 15 minutos (0, 15, 30, 45)
    const rawMinutes = percentInSlot * 60;
    const snappedMinutes = Math.round(rawMinutes / 15) * 15;
    const minutes = Math.max(0, Math.min(45, snappedMinutes)); // Limitar entre 0-45

    setDragOverSlot({ dayIndex, hour, minutes });
  }, []);

  // Sair de um slot
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Verificar se realmente saiu do elemento (não apenas para um filho)
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverSlot(null);
    }
  }, []);

  // Soltar evento em um slot
  const handleDrop = useCallback(async (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();

    // Usar os minutos do dragOverSlot se disponível, senão calcular da posição do mouse
    let minutes = 0;
    if (dragOverSlot && dragOverSlot.dayIndex === dayIndex && dragOverSlot.hour === hour) {
      minutes = dragOverSlot.minutes;
    } else {
      // Fallback: calcular da posição do mouse
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentInSlot = relativeY / HOUR_HEIGHT;
      const rawMinutes = percentInSlot * 60;
      const snappedMinutes = Math.round(rawMinutes / 15) * 15;
      minutes = Math.max(0, Math.min(45, snappedMinutes));
    }

    setDragOverSlot(null);

    if (!draggedEvent || !onEventMove) {
      setDraggedEvent(null);
      return;
    }

    // Calcular nova data/hora de início COM os minutos precisos
    const newStartTime = new Date(weekDays[dayIndex]);
    newStartTime.setHours(hour, minutes, 0, 0);

    // Calcular duração original do evento
    const originalStart = new Date(draggedEvent.start_time);
    const originalEnd = new Date(draggedEvent.end_time);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    // Calcular nova hora de término mantendo a duração
    const newEndTime = new Date(newStartTime.getTime() + durationMs);

    const eventId = draggedEvent.id;
    setDraggedEvent(null);

    // Verificar se o novo horário é diferente do original
    if (newStartTime.getTime() !== originalStart.getTime()) {
      // Aplicar atualização otimista ANTES de chamar a API
      setOptimisticUpdates(prev => {
        const next = new Map(prev);
        next.set(eventId, {
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
        });
        return next;
      });

      try {
        await onEventMove({ ...draggedEvent, id: eventId }, newStartTime, newEndTime);
      } finally {
        // Limpar atualização otimista após a API responder (sucesso ou erro)
        setOptimisticUpdates(prev => {
          const next = new Map(prev);
          next.delete(eventId);
          return next;
        });
      }
    }
  }, [draggedEvent, dragOverSlot, weekDays, onEventMove]);

  // ============================================
  // RESIZE HANDLERS
  // ============================================

  // Iniciar resize do evento
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    event: InternalEventWithRelations,
    currentHeight: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Não permitir redimensionar eventos cancelados ou concluídos
    if (event.event_status === 'cancelled' || event.event_status === 'completed') {
      return;
    }

    setResizingEvent(event);
    setResizeStartY(e.clientY);
    setResizeOriginalHeight(currentHeight);
    setResizeCurrentHeight(currentHeight);
  }, []);

  // Durante o resize (mouse move)
  useEffect(() => {
    if (!resizingEvent) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY;
      // Arredondar para intervalos de 15 minutos (15px)
      const snapInterval = HOUR_HEIGHT / 4; // 15 minutos = 15px
      const snappedDelta = Math.round(deltaY / snapInterval) * snapInterval;
      const newHeight = Math.max(snapInterval, resizeOriginalHeight + snappedDelta); // Mínimo 15 minutos
      setResizeCurrentHeight(newHeight);
    };

    const handleMouseUp = async () => {
      // Marcar que houve resize para prevenir click
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 100);

      if (resizingEvent && onEventMove) {
        // Calcular nova duração baseada na altura
        const newDurationHours = resizeCurrentHeight / HOUR_HEIGHT;
        const newDurationMs = newDurationHours * 60 * 60 * 1000;

        const startTime = new Date(resizingEvent.start_time);
        const newEndTime = new Date(startTime.getTime() + newDurationMs);
        const originalEnd = new Date(resizingEvent.end_time);

        const eventId = resizingEvent.id;

        // Limpar estado de resize
        setResizingEvent(null);
        setResizeStartY(0);
        setResizeOriginalHeight(0);
        setResizeCurrentHeight(0);

        // Só atualizar se a duração mudou
        if (newEndTime.getTime() !== originalEnd.getTime()) {
          // Aplicar atualização otimista ANTES de chamar a API
          setOptimisticUpdates(prev => {
            const next = new Map(prev);
            next.set(eventId, {
              start_time: startTime.toISOString(),
              end_time: newEndTime.toISOString(),
            });
            return next;
          });

          try {
            await onEventMove(resizingEvent, startTime, newEndTime);
          } finally {
            // Limpar atualização otimista após a API responder
            setOptimisticUpdates(prev => {
              const next = new Map(prev);
              next.delete(eventId);
              return next;
            });
          }
        }
      } else {
        setResizingEvent(null);
        setResizeStartY(0);
        setResizeOriginalHeight(0);
        setResizeCurrentHeight(0);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingEvent, resizeStartY, resizeOriginalHeight, resizeCurrentHeight, onEventMove]);

  return (
    <div className={cn(
      'flex-1 flex flex-col rounded-xl border overflow-hidden',
      isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'
    )}>
      {/* Header com dias da semana */}
      <div className={cn(
        'flex border-b sticky top-0 z-10 overflow-y-scroll',
        isDark ? 'border-white/10 bg-zinc-900' : 'border-gray-200 bg-white'
      )}
      style={{ scrollbarGutter: 'stable' }}
      >
        {/* Coluna de timezone */}
        <div className={cn(
          'w-16 flex-shrink-0 p-2 text-xs text-center border-r',
          isDark ? 'border-white/10 text-white/50' : 'border-gray-200 text-gray-500'
        )}>
          {getTimezoneLabel()}
        </div>

        {/* Colunas dos dias */}
        {weekDays.map((day, index) => {
          const dayIsToday = isToday(day);
          return (
            <div
              key={index}
              className={cn(
                'flex-1 p-2 text-center border-r last:border-r-0',
                isDark ? 'border-white/10' : 'border-gray-200'
              )}
            >
              <div className={cn(
                'text-xs font-medium',
                isDark ? 'text-white/50' : 'text-gray-500'
              )}>
                {DAYS_OF_WEEK[index]}
              </div>
              <div className={cn(
                'text-2xl font-semibold mt-1 w-10 h-10 mx-auto flex items-center justify-center rounded-full',
                dayIsToday && 'bg-blue-600 text-white',
                !dayIsToday && (isDark ? 'text-white' : 'text-gray-900')
              )}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid scrollável */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-scroll overflow-x-hidden"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="flex relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Coluna de horas */}
          <div className={cn(
            'w-16 flex-shrink-0 border-r relative',
            isDark ? 'border-white/10' : 'border-gray-200'
          )}>
            {HOURS.map(hour => (
              <div
                key={hour}
                className={cn(
                  'absolute right-2 text-xs transform -translate-y-1/2',
                  isDark ? 'text-white/50' : 'text-gray-500'
                )}
                style={{ top: hour * HOUR_HEIGHT }}
              >
                {hour === 0 ? '' : formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Colunas dos dias com eventos */}
          {weekDays.map((day, dayIndex) => {
            const dateKey = formatLocalDate(day);
            const dayEvents = eventsByDay[dateKey] || [];
            const processedEvents = processEventsForDay(dayEvents);
            const dayIsToday = isToday(day);

            return (
              <div
                key={dayIndex}
                className={cn(
                  'flex-1 border-r last:border-r-0 relative',
                  isDark ? 'border-white/10' : 'border-gray-200'
                )}
              >
                {/* Linhas de hora */}
                {HOURS.map(hour => {
                  const isDropTarget = dragOverSlot?.dayIndex === dayIndex && dragOverSlot?.hour === hour;
                  const dropMinutes = isDropTarget ? dragOverSlot.minutes : 0;
                  const dropIndicatorTop = (dropMinutes / 60) * HOUR_HEIGHT;

                  return (
                    <div
                      key={hour}
                      onClick={() => handleSlotClick(dayIndex, hour)}
                      onDragOver={(e) => handleDragOver(e, dayIndex, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dayIndex, hour)}
                      className={cn(
                        'absolute w-full border-t cursor-pointer transition-colors',
                        isDark
                          ? 'border-white/5 hover:bg-white/5'
                          : 'border-gray-100 hover:bg-gray-50',
                        // Highlight suave do slot quando está sendo arrastado sobre ele
                        isDropTarget && (isDark
                          ? 'bg-blue-500/10'
                          : 'bg-blue-50')
                      )}
                      style={{
                        top: hour * HOUR_HEIGHT,
                        height: HOUR_HEIGHT
                      }}
                    >
                      {/* Indicador visual de onde o evento será solto */}
                      {isDropTarget && (
                        <div
                          className="absolute left-0 right-0 pointer-events-none z-20"
                          style={{ top: dropIndicatorTop }}
                        >
                          <div className="relative flex items-center">
                            {/* Bolinha indicadora */}
                            <div className="absolute -left-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                            {/* Linha indicadora */}
                            <div className="w-full h-[2px] bg-blue-500 shadow-sm" />
                            {/* Label com o horário */}
                            <div className={cn(
                              'absolute -top-5 left-3 text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm',
                              'bg-blue-500 text-white'
                            )}>
                              {String(hour).padStart(2, '0')}:{String(dropMinutes).padStart(2, '0')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Linha de tempo atual */}
                {dayIsToday && weekContainsToday && (
                  <div
                    ref={dayIndex === todayIndex ? currentTimeRef : undefined}
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: currentTimePosition }}
                  >
                    <div className="relative">
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                      <div className="h-[2px] bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Eventos */}
                {processedEvents.map(({ event, top, height, left, width }) => {
                  const eventColor = getEventColor(event);
                  const isCancelled = event.event_status === 'cancelled';
                  const isCompleted = event.event_status === 'completed';
                  const isInactive = isCancelled || isCompleted;
                  const isDraggable = !isInactive && !!onEventMove;
                  const isResizable = !isInactive && !!onEventMove;
                  const isBeingDragged = draggedEvent?.id === event.id;
                  const isBeingResized = resizingEvent?.id === event.id;
                  const startTime = new Date(event.start_time);
                  const endTime = new Date(event.end_time);

                  // Usar altura dinâmica durante o resize
                  const displayHeight = isBeingResized ? resizeCurrentHeight : height;

                  // Calcular hora de término durante resize para exibição
                  const displayEndTime = isBeingResized
                    ? new Date(startTime.getTime() + (resizeCurrentHeight / HOUR_HEIGHT) * 60 * 60 * 1000)
                    : endTime;

                  return (
                    <div
                      key={event.id}
                      draggable={isDraggable && !isBeingResized}
                      onDragStart={(e) => isDraggable && !isBeingResized && handleDragStart(e, event)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Não abrir modal se acabou de fazer drag ou resize
                        if (!isBeingResized && !justDraggedRef.current) {
                          onEventClick(event);
                        }
                      }}
                      className={cn(
                        'absolute rounded-md px-2 py-1 overflow-hidden',
                        !isBeingResized && 'transition-all',
                        'hover:ring-2 hover:ring-white/30 hover:z-20',
                        isInactive && 'opacity-60 cursor-pointer',
                        isDraggable && !isBeingResized && 'cursor-grab active:cursor-grabbing',
                        isBeingDragged && 'opacity-50 ring-2 ring-white',
                        isBeingResized && 'ring-2 ring-white z-30'
                      )}
                      style={{
                        top: top + 1,
                        height: displayHeight - 2,
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        backgroundColor: isCancelled
                          ? (isDark ? 'rgba(107, 114, 128, 0.7)' : 'rgba(156, 163, 175, 0.7)')
                          : eventColor,
                      }}
                      title={`${event.title}\n${startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${isDraggable ? '\nArraste para mover' : ''}${isResizable ? '\nArraste a borda inferior para redimensionar' : ''}`}
                    >
                      <div className={cn(
                        'text-xs font-medium text-white truncate',
                        (isCancelled || isCompleted) && 'line-through'
                      )}>
                        {event.title}
                      </div>
                      {displayHeight > 30 && (
                        <div className="text-[10px] text-white/80 truncate">
                          {startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {displayEndTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {displayHeight > 50 && event.location && (
                        <div className="text-[10px] text-white/70 truncate mt-0.5">
                          {event.location}
                        </div>
                      )}

                      {/* Handle de resize na borda inferior */}
                      {isResizable && (
                        <div
                          onMouseDown={(e) => handleResizeStart(e, event, height)}
                          className={cn(
                            'absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize',
                            'flex items-center justify-center',
                            'hover:bg-white/20 transition-colors',
                            'group'
                          )}
                          title="Arraste para alterar a duração"
                        >
                          {/* Linha visual do handle */}
                          <div className={cn(
                            'w-8 h-1 rounded-full bg-white/40',
                            'group-hover:bg-white/70 transition-colors'
                          )} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
