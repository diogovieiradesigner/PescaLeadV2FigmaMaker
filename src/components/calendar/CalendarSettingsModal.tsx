import { useState, useEffect } from 'react';
import { X, Clock, Plus, Trash2, Save, Loader2, Settings, RotateCcw } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import {
  CalendarSettings,
  WeeklyAvailability,
  DefaultDurations,
  DAYS_OF_WEEK,
  EVENT_TYPE_CONFIG,
  EventType,
} from '../../types/calendar.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as calendarService from '../../services/calendar-service';
import { toast } from 'sonner';

// Valores padrão para as configurações
const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  monday: [{ start: '08:00', end: '18:00' }],
  tuesday: [{ start: '08:00', end: '18:00' }],
  wednesday: [{ start: '08:00', end: '18:00' }],
  thursday: [{ start: '08:00', end: '18:00' }],
  friday: [{ start: '08:00', end: '18:00' }],
  saturday: [],
  sunday: [],
};

const DEFAULT_DURATIONS: DefaultDurations = {
  meeting: 60,
  call: 30,
  demo: 45,
  reminder: 15,
};

interface CalendarSettingsModalProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;
  settings: CalendarSettings | null | undefined;
  workspaceId: string;
}

export function CalendarSettingsModal({
  theme,
  isOpen,
  onClose,
  settings,
  workspaceId,
}: CalendarSettingsModalProps) {
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();

  // DEBUG: Log quando componente renderiza
  console.log('[CalendarSettingsModal] Render:', {
    isOpen,
    hasSettings: !!settings,
    settingsId: settings?.id,
    workspaceId,
    settingsFromProps: settings ? {
      availability: settings.availability,
      default_durations: settings.default_durations,
      buffer_between_events: settings.buffer_between_events,
      min_booking_notice_hours: settings.min_booking_notice_hours,
      max_booking_days_ahead: settings.max_booking_days_ahead,
    } : null,
  });

  // Form state - usar valores padrão se settings não existir
  const [availability, setAvailability] = useState<WeeklyAvailability>(
    settings?.availability || DEFAULT_AVAILABILITY
  );
  const [defaultDurations, setDefaultDurations] = useState<DefaultDurations>(
    settings?.default_durations || DEFAULT_DURATIONS
  );
  const [bufferBetweenEvents, setBufferBetweenEvents] = useState(
    settings?.buffer_between_events ?? 15
  );
  const [minBookingNotice, setMinBookingNotice] = useState(
    settings?.min_booking_notice_hours ?? 1
  );
  const [maxBookingDays, setMaxBookingDays] = useState(
    settings?.max_booking_days_ahead ?? 30
  );
  const [whatsappConfirmation, setWhatsappConfirmation] = useState(
    settings?.whatsapp_confirmation_enabled ?? false
  );
  const [whatsappReminder, setWhatsappReminder] = useState(
    settings?.whatsapp_reminder_enabled ?? false
  );
  const [reminderHours, setReminderHours] = useState(
    settings?.whatsapp_reminder_hours_before ?? 24
  );

  // Sincronizar estados quando settings mudar ou modal abrir
  useEffect(() => {
    console.log('[CalendarSettingsModal] useEffect triggered:', {
      isOpen,
      hasSettings: !!settings,
      settingsId: settings?.id,
    });

    if (isOpen && settings) {
      console.log('[CalendarSettingsModal] Syncing from settings:', {
        availability: settings.availability,
        default_durations: settings.default_durations,
        buffer_between_events: settings.buffer_between_events,
        min_booking_notice_hours: settings.min_booking_notice_hours,
        max_booking_days_ahead: settings.max_booking_days_ahead,
      });
      setAvailability(settings.availability || DEFAULT_AVAILABILITY);
      setDefaultDurations(settings.default_durations || DEFAULT_DURATIONS);
      setBufferBetweenEvents(settings.buffer_between_events ?? 15);
      setMinBookingNotice(settings.min_booking_notice_hours ?? 1);
      setMaxBookingDays(settings.max_booking_days_ahead ?? 30);
      setWhatsappConfirmation(settings.whatsapp_confirmation_enabled ?? false);
      setWhatsappReminder(settings.whatsapp_reminder_enabled ?? false);
      setReminderHours(settings.whatsapp_reminder_hours_before ?? 24);
    } else if (isOpen && !settings) {
      console.log('[CalendarSettingsModal] No settings, using defaults');
      // Reset para valores padrão se não há settings
      setAvailability(DEFAULT_AVAILABILITY);
      setDefaultDurations(DEFAULT_DURATIONS);
      setBufferBetweenEvents(15);
      setMinBookingNotice(1);
      setMaxBookingDays(30);
      setWhatsappConfirmation(false);
      setWhatsappReminder(false);
      setReminderHours(24);
    }
  }, [isOpen, settings]);

  // Mutation unificada usando upsert (criar ou atualizar)
  const saveMutation = useMutation({
    mutationFn: () => {
      const dataToSave = {
        workspace_id: workspaceId,
        availability,
        default_durations: defaultDurations,
        buffer_between_events: bufferBetweenEvents,
        min_booking_notice_hours: minBookingNotice,
        max_booking_days_ahead: maxBookingDays,
        whatsapp_confirmation_enabled: whatsappConfirmation,
        whatsapp_reminder_enabled: whatsappReminder,
        whatsapp_reminder_hours_before: reminderHours,
      };
      console.log('[CalendarSettingsModal] Saving data:', dataToSave);
      return calendarService.upsertCalendarSettings(dataToSave);
    },
    onSuccess: (savedData) => {
      console.log('[CalendarSettingsModal] Save SUCCESS, returned data:', savedData);
      // Invalidar todas as queries de calendar-settings para garantir refresh
      queryClient.invalidateQueries({ queryKey: ['calendar-settings', workspaceId] });
      toast.success('Configurações salvas!');
      onClose();
    },
    onError: (error: any) => {
      console.error('[CalendarSettings] Error saving:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  const handleSave = () => {
    console.log('[CalendarSettingsModal] handleSave called');
    saveMutation.mutate();
  };

  const isSaving = saveMutation.isPending;

  // Add slot to a day
  const addSlot = (day: keyof WeeklyAvailability) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...prev[day], { start: '09:00', end: '18:00' }],
    }));
  };

  // Remove slot from a day
  const removeSlot = (day: keyof WeeklyAvailability, index: number) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  };

  // Update slot
  const updateSlot = (
    day: keyof WeeklyAvailability,
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  // Resetar para valores padrão
  const resetToDefaults = () => {
    setAvailability(DEFAULT_AVAILABILITY);
    setDefaultDurations(DEFAULT_DURATIONS);
    setBufferBetweenEvents(15);
    setMinBookingNotice(1);
    setMaxBookingDays(30);
    setWhatsappConfirmation(false);
    setWhatsappReminder(false);
    setReminderHours(24);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col ${
          isDark ? 'bg-elevated' : 'bg-light-elevated'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
            isDark ? 'bg-[#0A0A0A] border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
              <Settings className={`w-5 h-5 ${isDark ? 'text-white/70' : 'text-gray-600'}`} />
            </div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Configurações do Calendário
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefaults}
              disabled={isSaving}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05] text-white/50 hover:text-white/70'
                  : 'hover:bg-light-elevated-hover text-text-secondary-light hover:text-text-primary-light'
              }`}
              title="Restaurar padrões"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-white/[0.05] text-white/50' : 'hover:bg-light-elevated-hover text-text-secondary-light'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-[#0A0A0A]' : ''}`}>
          <div className="p-6 space-y-6">

            {/* Availability Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock className={`w-4 h-4 ${isDark ? 'text-[#0169D9]' : 'text-[#0169D9]'}`} />
                <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                  Horários de Disponibilidade
                </h3>
              </div>

              <div className="space-y-3">
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border ${
                      isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => addSlot(key as keyof WeeklyAvailability)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                          isDark
                            ? 'text-[#0169D9] hover:bg-[#0169D9]/10'
                            : 'text-[#0169D9] hover:bg-[#0169D9]/10'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar
                      </button>
                    </div>

                    {availability[key as keyof WeeklyAvailability].length === 0 ? (
                      <p className={`text-xs italic ${isDark ? 'text-white/30' : 'text-text-secondary-light'}`}>
                        Indisponível neste dia
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availability[key as keyof WeeklyAvailability].map((slot, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) =>
                                updateSlot(key as keyof WeeklyAvailability, index, 'start', e.target.value)
                              }
                              className={`px-3 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:border-[#0169D9] ${
                                isDark
                                  ? 'bg-elevated border-white/[0.08] text-white'
                                  : 'bg-white border-border-light text-text-primary-light'
                              }`}
                            />
                            <span className={`text-sm ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                              até
                            </span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) =>
                                updateSlot(key as keyof WeeklyAvailability, index, 'end', e.target.value)
                              }
                              className={`px-3 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:border-[#0169D9] ${
                                isDark
                                  ? 'bg-elevated border-white/[0.08] text-white'
                                  : 'bg-white border-border-light text-text-primary-light'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => removeSlot(key as keyof WeeklyAvailability, index)}
                              className={`p-2 rounded-lg transition-colors ${
                                isDark
                                  ? 'text-red-400 hover:bg-red-500/10'
                                  : 'text-red-500 hover:bg-red-50'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Default Durations Section */}
            <section>
              <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Durações Padrão por Tipo de Evento
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(EVENT_TYPE_CONFIG) as EventType[]).map((type) => {
                  const config = EVENT_TYPE_CONFIG[type];
                  return (
                    <div
                      key={type}
                      className={`p-4 rounded-xl border ${
                        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
                      }`}
                    >
                      <label className={`text-sm font-medium block mb-2 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                        {config.label}
                      </label>
                      <select
                        value={defaultDurations[type]}
                        onChange={(e) =>
                          setDefaultDurations((prev) => ({
                            ...prev,
                            [type]: Number(e.target.value),
                          }))
                        }
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                          isDark
                            ? 'bg-elevated border-white/[0.08] text-white'
                            : 'bg-white border-border-light text-text-primary-light'
                        }`}
                      >
                        <option value={15}>15 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={45}>45 minutos</option>
                        <option value={60}>1 hora</option>
                        <option value={90}>1h 30min</option>
                        <option value={120}>2 horas</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Other Settings Section */}
            <section>
              <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Outras Configurações
              </h3>

              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'}`}>
                  <label className={`text-sm block mb-2 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                    Intervalo entre eventos (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={bufferBetweenEvents}
                    onChange={(e) => setBufferBetweenEvents(Number(e.target.value))}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-white border-border-light text-text-primary-light'
                    }`}
                  />
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'}`}>
                  <label className={`text-sm block mb-2 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                    Antecedência mínima para agendamento (horas)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="72"
                    value={minBookingNotice}
                    onChange={(e) => setMinBookingNotice(Number(e.target.value))}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-white border-border-light text-text-primary-light'
                    }`}
                  />
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'}`}>
                  <label className={`text-sm block mb-2 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                    Máximo de dias no futuro para agendamento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={maxBookingDays}
                    onChange={(e) => setMaxBookingDays(Number(e.target.value))}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40'
                        : 'bg-white border-border-light text-text-primary-light'
                    }`}
                  />
                </div>
              </div>
            </section>

            {/* WhatsApp Settings Section */}
            <section>
              <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                Notificações WhatsApp
                <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${
                  isDark ? 'bg-white/[0.08] text-white/50' : 'bg-gray-200 text-gray-500'
                }`}>
                  Em breve
                </span>
              </h3>

              <div className={`p-4 rounded-xl border opacity-50 ${isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'}`}>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={whatsappConfirmation}
                      disabled
                      className={`w-4 h-4 rounded border ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}
                    />
                    <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                      Enviar confirmação por WhatsApp
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={whatsappReminder}
                      disabled
                      className={`w-4 h-4 rounded border ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}
                    />
                    <span className={`text-sm ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
                      Enviar lembrete por WhatsApp
                    </span>
                  </label>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0 ${
            isDark ? 'bg-[#0A0A0A] border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white'
                : 'bg-light-elevated-hover hover:bg-gray-200 text-text-primary-light'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              isSaving
                ? isDark
                  ? 'bg-white/[0.1] text-white/30 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#0169D9] hover:bg-[#0158b8] text-white'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
