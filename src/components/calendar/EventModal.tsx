import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  Phone,
  Monitor,
  Bell,
  Zap,
  CheckSquare,
  CheckCircle,
  MapPin,
  User,
  UserCheck,
  FileText,
  Trash2,
  XCircle,
  Search,
  Loader2,
  RotateCcw,
  Plus,
  MessageSquare,
  Inbox,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Theme } from '../../hooks/useTheme';
import {
  InternalEventWithRelations,
  InternalEventCreate,
  InternalEventUpdate,
  EventType,
  CalendarSettings,
  EVENT_TYPE_CONFIG,
  DURATION_OPTIONS,
  REMINDER_OPTIONS,
  EventReminder,
} from '../../types/calendar.types';
import { cn } from '../ui/utils';
import { supabase } from '../../utils/supabase/client';
import { useDebounce } from '../../hooks/useDebounce';
import {
  fetchEventReminders,
  fetchWorkspaceInboxes,
  fetchWorkspaceMembers,
  replaceEventReminders,
} from '../../services/calendar-service';

interface LeadOption {
  id: string;
  client_name: string;
  company: string | null;
}

interface InboxOption {
  id: string;
  name: string;
}

interface MemberOption {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ReminderItem {
  id?: string;
  remind_before_minutes: number;
  message_template?: string;
  status?: string;
}

interface EventModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  event: InternalEventWithRelations | null;
  selectedDate: Date;
  settings: CalendarSettings | null;
  workspaceId: string;
  onCreate: (
    data: Omit<InternalEventCreate, 'workspace_id' | 'internal_calendar_id'>,
    reminders?: { remind_before_minutes: number; inbox_id?: string; message_template?: string }[]
  ) => Promise<void>;
  onUpdate: (eventId: string, data: InternalEventUpdate) => Promise<void>;
  onCancel: (eventId: string, reason?: string) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  onResume?: (eventId: string) => Promise<void>;
  onComplete?: (eventId: string) => Promise<void>;
}

const EVENT_ICONS: Record<EventType, React.ElementType> = {
  meeting: Users,
  call: Phone,
  demo: Monitor,
  reminder: Bell,
  action: Zap,
  task: CheckSquare,
};

export function EventModal({
  theme,
  isOpen,
  onClose,
  event,
  selectedDate,
  settings,
  workspaceId,
  onCreate,
  onUpdate,
  onCancel,
  onDelete,
  onResume,
  onComplete,
}: EventModalProps) {
  const isDark = theme === 'dark';
  const isEditing = !!event;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('meeting');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Lead search state
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadSearchResults, setLeadSearchResults] = useState<LeadOption[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const debouncedLeadSearch = useDebounce(leadSearchQuery, 300);

  // Reminders state
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [inboxes, setInboxes] = useState<InboxOption[]>([]);
  const [isLoadingInboxes, setIsLoadingInboxes] = useState(false);
  const [showRemindersSection, setShowRemindersSection] = useState(false);
  const [customMessageIndex, setCustomMessageIndex] = useState<number | null>(null);

  // Assignee state
  const [selectedAssignee, setSelectedAssignee] = useState<MemberOption | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Search leads
  const searchLeads = useCallback(async (query: string) => {
    if (!query.trim() || !workspaceId) {
      setLeadSearchResults([]);
      return;
    }

    setIsSearchingLeads(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, client_name, company')
        .eq('workspace_id', workspaceId)
        .ilike('client_name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setLeadSearchResults(data || []);
    } catch (err) {
      console.error('[EventModal] Error searching leads:', err);
      setLeadSearchResults([]);
    } finally {
      setIsSearchingLeads(false);
    }
  }, [workspaceId]);

  // Trigger search when debounced query changes
  useEffect(() => {
    searchLeads(debouncedLeadSearch);
  }, [debouncedLeadSearch, searchLeads]);

  // Load inboxes for workspace
  const loadInboxes = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingInboxes(true);
    try {
      const data = await fetchWorkspaceInboxes(workspaceId);
      setInboxes(data);
      // Auto-select first inbox if available
      if (data.length > 0 && !selectedInboxId) {
        setSelectedInboxId(data[0].id);
      }
    } catch (err) {
      console.error('[EventModal] Error loading inboxes:', err);
    } finally {
      setIsLoadingInboxes(false);
    }
  }, [workspaceId, selectedInboxId]);

  // Load existing reminders when editing
  const loadReminders = useCallback(async (eventId: string) => {
    try {
      const data = await fetchEventReminders(eventId);
      setReminders(data.map(r => ({
        id: r.id,
        remind_before_minutes: r.remind_before_minutes,
        message_template: r.message_template || undefined,
        status: r.status,
      })));
      // Set inbox from first reminder if exists
      if (data.length > 0 && data[0].inbox_id) {
        setSelectedInboxId(data[0].inbox_id);
      }
      // Show section if there are reminders
      if (data.length > 0) {
        setShowRemindersSection(true);
      }
    } catch (err) {
      console.error('[EventModal] Error loading reminders:', err);
    }
  }, []);

  // Load workspace members for assignee selection
  const loadMembers = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingMembers(true);
    try {
      const data = await fetchWorkspaceMembers(workspaceId);
      setMembers(data);
    } catch (err) {
      console.error('[EventModal] Error loading members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [workspaceId]);

  // Load inboxes when modal opens with a lead selected
  useEffect(() => {
    if (isOpen && selectedLead) {
      loadInboxes();
    }
  }, [isOpen, selectedLead, loadInboxes]);

  // Load members when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, loadMembers]);

  // Initialize form
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.event_type);
      setDate(new Date(event.start_time).toISOString().split('T')[0]);
      setStartTime(
        new Date(event.start_time).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const durationMs = end.getTime() - start.getTime();
      setDuration(Math.round(durationMs / 60000));
      setLocation(event.location || '');
      // Set lead if exists
      if (event.lead) {
        setSelectedLead({
          id: event.lead.id,
          client_name: event.lead.client_name,
          company: event.lead.company,
        });
      } else {
        setSelectedLead(null);
      }
      // Set assignee if exists
      if (event.assignee) {
        setSelectedAssignee({
          id: event.assignee.id,
          name: event.assignee.name,
          avatar_url: event.assignee.avatar_url,
        });
      } else {
        setSelectedAssignee(null);
      }
      // Load reminders for existing event
      loadReminders(event.id);
    } else {
      setTitle('');
      setDescription('');
      setEventType('meeting');

      // Use today's date and next valid time for new events
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

      // Check if selectedDate has a specific time set (not midnight default)
      const selectedHours = selectedDate.getHours();
      const selectedMinutes = selectedDate.getMinutes();
      const hasSpecificTime = selectedHours !== 0 || selectedMinutes !== 0;

      // If selected date is today or in the past, use today with appropriate time
      if (selectedDateStr <= todayStr) {
        setDate(todayStr);

        if (hasSpecificTime) {
          // Use the specific time from selectedDate if it's in the future
          const selectedTimeStr = `${String(selectedHours).padStart(2, '0')}:${String(selectedMinutes).padStart(2, '0')}`;
          const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          if (selectedDateStr === todayStr && selectedTimeStr >= currentTimeStr) {
            setStartTime(selectedTimeStr);
          } else {
            // Round up to next 15-minute interval
            const minutes = now.getMinutes();
            const roundedMinutes = Math.ceil(minutes / 15) * 15;
            if (roundedMinutes >= 60) {
              now.setHours(now.getHours() + 1);
              now.setMinutes(0);
            } else {
              now.setMinutes(roundedMinutes);
            }
            setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
          }
        } else {
          // Round up to next 15-minute interval
          const minutes = now.getMinutes();
          const roundedMinutes = Math.ceil(minutes / 15) * 15;
          if (roundedMinutes >= 60) {
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
          } else {
            now.setMinutes(roundedMinutes);
          }
          setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }
      } else {
        // Future date selected
        setDate(selectedDateStr);
        if (hasSpecificTime) {
          // Use the specific time from selectedDate
          setStartTime(`${String(selectedHours).padStart(2, '0')}:${String(selectedMinutes).padStart(2, '0')}`);
        } else {
          // Default to 09:00
          setStartTime('09:00');
        }
      }

      setDuration(settings?.default_durations?.meeting || 60);
      setLocation('');
      setSelectedLead(null);
      setSelectedAssignee(null);
      // Reset reminders state
      setReminders([]);
      setShowRemindersSection(false);
      setCustomMessageIndex(null);
    }
    setLeadSearchQuery('');
    setLeadSearchResults([]);
    setShowLeadDropdown(false);
    setDateError(null);
    setTimeError(null);
  }, [event, selectedDate, settings, loadReminders]);

  // Update duration when event type changes
  useEffect(() => {
    if (!isEditing && settings?.default_durations) {
      setDuration(settings.default_durations[eventType] || 60);
    }
  }, [eventType, settings, isEditing]);

  // Helper: Get today's date string in YYYY-MM-DD format
  const getTodayString = useCallback(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  // Helper: Get current time string in HH:MM format
  const getCurrentTimeString = useCallback(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }, []);

  // Helper: Get next valid time (rounds up to next 15-minute interval)
  const getNextValidTime = useCallback(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;

    if (roundedMinutes >= 60) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    } else {
      now.setMinutes(roundedMinutes);
    }

    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }, []);

  // Helper: Check if a date string is in the past (comparing only dates, not times)
  const isDateInPast = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const today = getTodayString();
    return dateStr < today;
  }, [getTodayString]);

  // Helper: Check if a date is today
  const isToday = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    return dateStr === getTodayString();
  }, [getTodayString]);

  // Helper: Check if a time is in the past for today's date
  const isTimeInPastForToday = useCallback((timeStr: string, dateStr: string) => {
    if (!timeStr || !dateStr) return false;
    if (!isToday(dateStr)) return false;
    return timeStr < getCurrentTimeString();
  }, [isToday, getCurrentTimeString]);

  // Helper: Handle date change with validation
  const handleDateChange = useCallback((newDate: string) => {
    if (!isEditing && isDateInPast(newDate)) {
      setDateError('Não é possível selecionar datas passadas');
      // Don't update the date if it's in the past
      return;
    }
    setDateError(null);
    setDate(newDate);

    // Re-validate time when date changes
    if (!isEditing && isToday(newDate) && isTimeInPastForToday(startTime, newDate)) {
      setTimeError('Não é possível selecionar horários passados');
    } else {
      setTimeError(null);
    }
  }, [isEditing, isDateInPast, isToday, isTimeInPastForToday, startTime]);

  // Helper: Handle time change with validation
  const handleTimeChange = useCallback((newTime: string) => {
    if (!isEditing && isTimeInPastForToday(newTime, date)) {
      setTimeError('Não é possível selecionar horários passados');
      // Still update time but show error
      setStartTime(newTime);
      return;
    }
    setTimeError(null);
    setStartTime(newTime);
  }, [isEditing, isTimeInPastForToday, date]);

  // Helper: Check if event date/time is in the past
  const isEventInPast = useCallback(() => {
    if (!date || !startTime) return false;
    const [hours, minutes] = startTime.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const eventDateTime = new Date(year, month - 1, day, hours, minutes);
    return eventDateTime < new Date();
  }, [date, startTime]);

  // Helper: Check if a reminder time would be in the past
  const isReminderInPast = useCallback((reminderMinutes: number) => {
    if (!date || !startTime) return false;
    const [hours, minutes] = startTime.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const eventDateTime = new Date(year, month - 1, day, hours, minutes);
    const reminderDateTime = new Date(eventDateTime.getTime() - reminderMinutes * 60000);
    return reminderDateTime < new Date();
  }, [date, startTime]);

  // Helper: Get available reminder options (filter out past ones)
  const getAvailableReminderOptions = useCallback(() => {
    return REMINDER_OPTIONS.filter(opt => {
      // Already added
      if (reminders.some(r => r.remind_before_minutes === opt.value)) {
        return false;
      }
      // Would be in the past
      if (isReminderInPast(opt.value)) {
        return false;
      }
      return true;
    });
  }, [reminders, isReminderInPast]);

  // Helper: Add reminder
  const addReminder = (minutes: number) => {
    // Don't add duplicate
    if (reminders.some(r => r.remind_before_minutes === minutes)) {
      return;
    }
    // Don't add if it would be in the past
    if (isReminderInPast(minutes)) {
      return;
    }
    setReminders(prev => [...prev, { remind_before_minutes: minutes }]);
  };

  // Helper: Remove reminder
  const removeReminder = (index: number) => {
    setReminders(prev => prev.filter((_, i) => i !== index));
    if (customMessageIndex === index) {
      setCustomMessageIndex(null);
    }
  };

  // Helper: Update reminder message
  const updateReminderMessage = (index: number, message: string) => {
    setReminders(prev => prev.map((r, i) =>
      i === index ? { ...r, message_template: message || undefined } : r
    ));
  };

  // Helper: Get reminder label
  const getReminderLabel = (minutes: number) => {
    const option = REMINDER_OPTIONS.find(o => o.value === minutes);
    return option?.label || `${minutes} minutos antes`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      // Parsear a data corretamente no fuso horário local
      const [year, month, day] = date.split('-').map(Number);
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

      // Validar que não está criando evento no passado (apenas para novos eventos)
      if (!isEditing && startDateTime < new Date()) {
        toast.error('Não é possível criar eventos em datas/horários passados.');
        setIsSubmitting(false);
        return;
      }

      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      if (isEditing && event) {
        await onUpdate(event.id, {
          title: title.trim(),
          description: description.trim() || null,
          event_type: eventType,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: location.trim() || null,
          lead_id: selectedLead?.id || null,
          inbox_id: selectedLead && selectedInboxId ? selectedInboxId : null,
          assigned_to: selectedAssignee?.id || null,
        });

        // Save reminders if lead is selected
        if (selectedLead && reminders.length > 0 && selectedInboxId) {
          await replaceEventReminders(
            event.id,
            workspaceId,
            reminders.map(r => ({
              remind_before_minutes: r.remind_before_minutes,
              inbox_id: selectedInboxId,
              message_template: r.message_template,
            }))
          );
        } else if (event.id && reminders.length === 0) {
          // Clear reminders if none selected
          await replaceEventReminders(event.id, workspaceId, []);
        }
      } else {
        // Prepare reminders for new event
        const eventReminders = selectedLead && selectedInboxId && reminders.length > 0
          ? reminders.map(r => ({
              remind_before_minutes: r.remind_before_minutes,
              inbox_id: selectedInboxId,
              message_template: r.message_template,
            }))
          : undefined;

        // Create event with reminders
        await onCreate({
          title: title.trim(),
          description: description.trim() || undefined,
          event_type: eventType,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: location.trim() || undefined,
          lead_id: selectedLead?.id,
          inbox_id: selectedLead && selectedInboxId ? selectedInboxId : undefined,
          assigned_to: selectedAssignee?.id,
        }, eventReminders);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!event) return;
    setIsSubmitting(true);
    try {
      await onCancel(event.id, cancelReason || undefined);
      setShowCancelConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setIsSubmitting(true);
    try {
      await onDelete(event.id);
      setShowDeleteConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-lg rounded-xl shadow-2xl',
          isDark ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between p-4 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <h2 className={cn(
            'text-lg font-semibold',
            isDark ? 'text-white' : 'text-gray-900'
          )}>
            {isEditing ? 'Editar Evento' : 'Novo Evento'}
          </h2>
          <div className="flex items-center gap-2">
            {/* Botão Concluir - apenas para eventos editáveis (não cancelados/concluídos) */}
            {isEditing && event?.event_status !== 'cancelled' && event?.event_status !== 'completed' && onComplete && (
              <button
                type="button"
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await onComplete(event!.id);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  'bg-green-600 hover:bg-green-700 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <CheckCircle className="w-4 h-4" />
                Concluir
              </button>
            )}
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-white/5 text-white/70' : 'hover:bg-gray-100 text-gray-500'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Event Type Selector */}
          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-white/70' : 'text-gray-700'
            )}>
              Tipo de evento
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(EVENT_TYPE_CONFIG) as EventType[]).map((type) => {
                const config = EVENT_TYPE_CONFIG[type];
                const Icon = EVENT_ICONS[type];
                const isSelected = eventType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : isDark
                          ? 'border-white/10 hover:border-white/20'
                          : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: isSelected ? config.color : undefined }}
                    />
                    <span className={cn(
                      'text-xs',
                      isSelected
                        ? 'text-blue-500'
                        : isDark ? 'text-white/70' : 'text-gray-600'
                    )}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-white/70' : 'text-gray-700'
            )}>
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente"
              required
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-colors',
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500'
              )}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn(
                'block text-sm font-medium mb-2',
                isDark ? 'text-white/70' : 'text-gray-700'
              )}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                min={!isEditing ? getTodayString() : undefined}
                required
                className={cn(
                  'w-full px-3 py-2 rounded-lg border transition-colors',
                  isDark
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500',
                  dateError && (isDark ? 'border-red-500' : 'border-red-500')
                )}
              />
              {dateError && (
                <p className={cn('mt-1 text-xs', isDark ? 'text-red-400' : 'text-red-500')}>
                  {dateError}
                </p>
              )}
            </div>
            <div>
              <label className={cn(
                'block text-sm font-medium mb-2',
                isDark ? 'text-white/70' : 'text-gray-700'
              )}>
                <Clock className="w-4 h-4 inline mr-1" />
                Horário
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                min={!isEditing && isToday(date) ? getCurrentTimeString() : undefined}
                required
                className={cn(
                  'w-full px-3 py-2 rounded-lg border transition-colors',
                  isDark
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500',
                  timeError && (isDark ? 'border-red-500' : 'border-red-500')
                )}
              />
              {timeError && (
                <p className={cn('mt-1 text-xs', isDark ? 'text-red-400' : 'text-red-500')}>
                  {timeError}
                </p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-white/70' : 'text-gray-700'
            )}>
              Duração
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-colors',
                isDark
                  ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                  : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
              )}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-white/70' : 'text-gray-700'
            )}>
              <MapPin className="w-4 h-4 inline mr-1" />
              Local / Link (opcional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Sala de reunião ou link do Google Meet"
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-colors',
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500'
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-white/70' : 'text-gray-700'
            )}>
              <FileText className="w-4 h-4 inline mr-1" />
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre o evento..."
              rows={3}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-colors resize-none',
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500'
              )}
            />
          </div>

          {/* Lead Selection */}
          <div className="relative">
            <label className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-white/70' : 'text-gray-700'
            )}>
              <User className="w-4 h-4 inline mr-1" />
              Vincular a um Lead (opcional)
            </label>

            {selectedLead ? (
              <div className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
              )}>
                <div>
                  <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {selectedLead.client_name}
                  </span>
                  {selectedLead.company && (
                    <span className={cn('text-xs ml-2', isDark ? 'text-white/50' : 'text-gray-500')}>
                      ({selectedLead.company})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-200 text-gray-400'
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                    isDark ? 'text-white/30' : 'text-gray-400'
                  )} />
                  <input
                    type="text"
                    value={leadSearchQuery}
                    onChange={(e) => {
                      setLeadSearchQuery(e.target.value);
                      setShowLeadDropdown(true);
                    }}
                    onFocus={() => setShowLeadDropdown(true)}
                    placeholder="Buscar lead por nome..."
                    className={cn(
                      'w-full pl-10 pr-3 py-2 rounded-lg border transition-colors',
                      isDark
                        ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500'
                        : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500'
                    )}
                  />
                  {isSearchingLeads && (
                    <Loader2 className={cn(
                      'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin',
                      isDark ? 'text-white/50' : 'text-gray-400'
                    )} />
                  )}
                </div>

                {/* Dropdown Results */}
                {showLeadDropdown && leadSearchResults.length > 0 && (
                  <div className={cn(
                    'absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto',
                    isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200'
                  )}>
                    {leadSearchResults.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => {
                          setSelectedLead(lead);
                          setLeadSearchQuery('');
                          setShowLeadDropdown(false);
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-left transition-colors',
                          isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                        )}
                      >
                        <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                          {lead.client_name}
                        </span>
                        {lead.company && (
                          <span className={cn('text-xs ml-2', isDark ? 'text-white/50' : 'text-gray-500')}>
                            ({lead.company})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {showLeadDropdown && leadSearchQuery.trim() && !isSearchingLeads && leadSearchResults.length === 0 && (
                  <div className={cn(
                    'absolute z-10 w-full mt-1 p-3 rounded-lg border text-center text-sm',
                    isDark ? 'bg-[#1a1a1a] border-white/10 text-white/50' : 'bg-white border-gray-200 text-gray-500'
                  )}>
                    Nenhum lead encontrado
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assignee Selection */}
          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-white/70' : 'text-gray-700'
            )}>
              <UserCheck className="w-4 h-4 inline mr-1" />
              Responsável (opcional)
            </label>

            {isLoadingMembers ? (
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-lg',
                isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
              )}>
                <Loader2 className={cn('w-4 h-4 animate-spin', isDark ? 'text-white/50' : 'text-gray-400')} />
                <span className={cn('text-sm', isDark ? 'text-white/50' : 'text-gray-500')}>
                  Carregando membros...
                </span>
              </div>
            ) : selectedAssignee ? (
              <div className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
              )}>
                <div className="flex items-center gap-2">
                  {selectedAssignee.avatar_url ? (
                    <img
                      src={selectedAssignee.avatar_url}
                      alt={selectedAssignee.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                      isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                    )}>
                      {selectedAssignee.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {selectedAssignee.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAssignee(null)}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-200 text-gray-400'
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <select
                value=""
                onChange={(e) => {
                  const member = members.find(m => m.id === e.target.value);
                  if (member) {
                    setSelectedAssignee(member);
                  }
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border transition-colors',
                  isDark
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                )}
              >
                <option value="">Selecionar responsável...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reminders Section - Only show when lead is selected */}
          {selectedLead && (
            <div className={cn(
              'border rounded-lg overflow-hidden',
              isDark ? 'border-white/10' : 'border-gray-200'
            )}>
              {/* Header */}
              <button
                type="button"
                onClick={() => setShowRemindersSection(!showRemindersSection)}
                className={cn(
                  'w-full flex items-center justify-between p-3 transition-colors',
                  isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Bell className={cn('w-4 h-4', isDark ? 'text-amber-400' : 'text-amber-500')} />
                  <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    Lembretes WhatsApp
                  </span>
                  {reminders.length > 0 && (
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                    )}>
                      {reminders.length}
                    </span>
                  )}
                </div>
                {showRemindersSection ? (
                  <ChevronUp className={cn('w-4 h-4', isDark ? 'text-white/50' : 'text-gray-400')} />
                ) : (
                  <ChevronDown className={cn('w-4 h-4', isDark ? 'text-white/50' : 'text-gray-400')} />
                )}
              </button>

              {/* Content */}
              {showRemindersSection && (
                <div className={cn(
                  'p-3 border-t space-y-3',
                  isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'
                )}>
                  {/* Inbox Selector */}
                  <div>
                    <label className={cn(
                      'block text-xs font-medium mb-1.5',
                      isDark ? 'text-white/60' : 'text-gray-600'
                    )}>
                      <Inbox className="w-3.5 h-3.5 inline mr-1" />
                      Caixa de entrada para envio
                    </label>
                    <select
                      value={selectedInboxId}
                      onChange={(e) => setSelectedInboxId(e.target.value)}
                      disabled={isLoadingInboxes || inboxes.length === 0}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
                        isDark
                          ? 'bg-white/5 border-white/10 text-white focus:border-amber-500'
                          : 'bg-white border-gray-200 text-gray-900 focus:border-amber-500',
                        (isLoadingInboxes || inboxes.length === 0) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isLoadingInboxes ? (
                        <option value="">Carregando...</option>
                      ) : inboxes.length === 0 ? (
                        <option value="">Nenhuma caixa disponível</option>
                      ) : (
                        inboxes.map((inbox) => (
                          <option key={inbox.id} value={inbox.id}>
                            {inbox.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Reminders List */}
                  {reminders.length > 0 && (
                    <div className="space-y-2">
                      <label className={cn(
                        'block text-xs font-medium',
                        isDark ? 'text-white/60' : 'text-gray-600'
                      )}>
                        Lembretes configurados
                      </label>
                      {reminders.map((reminder, index) => (
                        <div key={index} className="space-y-2">
                          <div className={cn(
                            'flex items-center gap-2 p-2 rounded-lg',
                            isDark ? 'bg-white/5' : 'bg-white'
                          )}>
                            <Clock className={cn('w-4 h-4 shrink-0', isDark ? 'text-amber-400' : 'text-amber-500')} />
                            <span className={cn('flex-1 text-sm', isDark ? 'text-white' : 'text-gray-900')}>
                              {getReminderLabel(reminder.remind_before_minutes)}
                            </span>
                            {reminder.status && reminder.status !== 'pending' && (
                              <span className={cn(
                                'px-2 py-0.5 rounded text-xs',
                                reminder.status === 'sent'
                                  ? 'bg-green-500/20 text-green-400'
                                  : reminder.status === 'failed'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-500/20 text-gray-400'
                              )}>
                                {reminder.status === 'sent' ? 'Enviado' : reminder.status === 'failed' ? 'Falhou' : reminder.status}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCustomMessageIndex(customMessageIndex === index ? null : index)}
                              className={cn(
                                'p-1.5 rounded transition-colors',
                                reminder.message_template
                                  ? isDark ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-600 hover:bg-amber-50'
                                  : isDark ? 'text-white/40 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100'
                              )}
                              title="Mensagem personalizada"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            {(!reminder.status || reminder.status === 'pending') && (
                              <button
                                type="button"
                                onClick={() => removeReminder(index)}
                                className={cn(
                                  'p-1.5 rounded transition-colors',
                                  isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                                )}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Custom Message Input */}
                          {customMessageIndex === index && (
                            <div className={cn(
                              'ml-6 p-2 rounded-lg',
                              isDark ? 'bg-white/5' : 'bg-white'
                            )}>
                              <textarea
                                value={reminder.message_template || ''}
                                onChange={(e) => updateReminderMessage(index, e.target.value)}
                                placeholder="Deixe em branco para usar mensagem padrão. Variáveis: {nome}, {empresa}, {titulo}, {data}, {hora}, {local}, {tipo}"
                                rows={3}
                                className={cn(
                                  'w-full px-2 py-1.5 rounded border text-sm resize-none',
                                  isDark
                                    ? 'bg-transparent border-white/10 text-white placeholder:text-white/30'
                                    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
                                )}
                              />
                              <p className={cn('mt-1 text-xs', isDark ? 'text-white/40' : 'text-gray-400')}>
                                Variáveis: {'{nome}'}, {'{empresa}'}, {'{titulo}'}, {'{data}'}, {'{hora}'}, {'{local}'}, {'{tipo}'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Reminder Dropdown */}
                  <div>
                    <label className={cn(
                      'block text-xs font-medium mb-1.5',
                      isDark ? 'text-white/60' : 'text-gray-600'
                    )}>
                      Adicionar lembrete
                    </label>
                    {(() => {
                      const availableOptions = getAvailableReminderOptions();
                      if (availableOptions.length === 0 && reminders.length === 0) {
                        return (
                          <p className={cn('text-xs', isDark ? 'text-amber-400/70' : 'text-amber-600')}>
                            Nenhum lembrete disponível - a data do evento está muito próxima ou já passou
                          </p>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-2">
                          {availableOptions.slice(0, 4).map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => addReminder(option.value)}
                              disabled={!selectedInboxId}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                isDark
                                  ? 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200',
                                !selectedInboxId && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              <Plus className="w-3 h-3 inline mr-1" />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    {!selectedInboxId && inboxes.length > 0 && getAvailableReminderOptions().length > 0 && (
                      <p className={cn('mt-2 text-xs', isDark ? 'text-amber-400/70' : 'text-amber-600')}>
                        Selecione uma caixa de entrada para adicionar lembretes
                      </p>
                    )}
                    {inboxes.length === 0 && !isLoadingInboxes && (
                      <p className={cn('mt-2 text-xs', isDark ? 'text-red-400/70' : 'text-red-600')}>
                        Nenhuma caixa de entrada configurada neste workspace
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className={cn(
          'flex items-center justify-between p-4 border-t',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <div className="flex items-center gap-2">
            {isEditing && event?.event_status === 'cancelled' ? (
              <>
                {onResume && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await onResume(event.id);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm transition-colors',
                      isDark
                        ? 'text-green-400 hover:bg-green-500/10'
                        : 'text-green-600 hover:bg-green-50'
                    )}
                  >
                    <RotateCcw className="w-4 h-4 inline mr-1" />
                    Retomar evento
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm transition-colors',
                    isDark
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-red-600 hover:bg-red-50'
                  )}
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Excluir
                </button>
              </>
            ) : isEditing && event?.event_status === 'completed' ? (
              <>
                {onResume && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await onResume(event.id);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm transition-colors',
                      isDark
                        ? 'text-amber-400 hover:bg-amber-500/10'
                        : 'text-amber-600 hover:bg-amber-50'
                    )}
                  >
                    <RotateCcw className="w-4 h-4 inline mr-1" />
                    Reabrir evento
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm transition-colors',
                    isDark
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-red-600 hover:bg-red-50'
                  )}
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Excluir
                </button>
              </>
            ) : isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm transition-colors',
                    isDark
                      ? 'text-yellow-400 hover:bg-yellow-500/10'
                      : 'text-yellow-600 hover:bg-yellow-50'
                  )}
                >
                  <XCircle className="w-4 h-4 inline mr-1" />
                  Cancelar evento
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm transition-colors',
                    isDark
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-red-600 hover:bg-red-50'
                  )}
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Excluir
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded-lg text-sm transition-colors',
                isDark
                  ? 'text-white/70 hover:bg-white/5'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Fechar
            </button>
            {event?.event_status !== 'cancelled' && event?.event_status !== 'completed' && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim() || !!dateError || !!timeError}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-blue-600 hover:bg-blue-700 text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar evento'}
              </button>
            )}
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className={cn(
              'w-80 p-4 rounded-lg',
              isDark ? 'bg-[#1a1a1a]' : 'bg-white'
            )}>
              <h3 className={cn(
                'text-lg font-semibold mb-2',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                Cancelar evento?
              </h3>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo (opcional)"
                className={cn(
                  'w-full px-3 py-2 rounded-lg border mb-4',
                  isDark
                    ? 'bg-white/5 border-white/10 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                )}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm',
                    isDark ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-700'
                  )}
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
            <div className={cn(
              'w-80 p-4 rounded-lg',
              isDark ? 'bg-[#1a1a1a]' : 'bg-white'
            )}>
              <h3 className={cn(
                'text-lg font-semibold mb-2',
                isDark ? 'text-white' : 'text-gray-900'
              )}>
                Excluir evento?
              </h3>
              <p className={cn(
                'text-sm mb-4',
                isDark ? 'text-white/70' : 'text-gray-600'
              )}>
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm',
                    isDark ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-700'
                  )}
                >
                  Voltar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
