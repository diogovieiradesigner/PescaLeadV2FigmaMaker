import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Building2,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarCheck,
  Users,
  Monitor,
} from 'lucide-react';
import {
  getWorkspaceBySlug,
  getAvailableSlots,
  createPublicBooking,
  getAvailableDates,
  PublicWorkspaceInfo,
  PublicCalendarSettings,
  AvailableSlot,
  BookingPageTheme,
} from '../services/public-booking-service';

interface PublicBookingProps {
  slug: string;
}

type EventType = 'meeting' | 'call' | 'demo';

const EVENT_TYPE_OPTIONS: { value: EventType; label: string; icon: React.ElementType; duration: string }[] = [
  { value: 'meeting', label: 'Reunião', icon: Users, duration: '1 hora' },
  { value: 'call', label: 'Ligação', icon: Phone, duration: '30 min' },
  { value: 'demo', label: 'Demonstração', icon: Monitor, duration: '45 min' },
];

type Step = 'type' | 'date' | 'time' | 'form' | 'success';

// Hook para detectar preferência de tema do sistema
function useSystemTheme(): 'light' | 'dark' {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return systemTheme;
}

// Função para resolver o tema efetivo
function resolveTheme(configuredTheme: BookingPageTheme | undefined, systemTheme: 'light' | 'dark'): 'light' | 'dark' {
  if (configuredTheme === 'light') return 'light';
  if (configuredTheme === 'dark') return 'dark';
  return systemTheme; // 'auto' ou undefined -> segue o sistema
}

export function PublicBooking({ slug }: PublicBookingProps) {
  // Estado do wizard
  const [step, setStep] = useState<Step>('type');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dados do workspace
  const [workspace, setWorkspace] = useState<PublicWorkspaceInfo | null>(null);
  const [settings, setSettings] = useState<PublicCalendarSettings | null>(null);

  // Tema
  const systemTheme = useSystemTheme();
  const effectiveTheme = resolveTheme(settings?.booking_page_theme, systemTheme);
  const isDark = effectiveTheme === 'dark';

  // Seleções do usuário
  const [selectedEventType, setSelectedEventType] = useState<EventType>('meeting');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Slots disponíveis
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Dados do formulário
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Calendário
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Carregar dados do workspace
  useEffect(() => {
    async function loadWorkspace() {
      setIsLoading(true);
      setError(null);

      const result = await getWorkspaceBySlug(slug);
      console.log('[PublicBooking] Loaded settings:', result?.settings);
      console.log('[PublicBooking] Theme from settings:', result?.settings?.booking_page_theme);
      if (result) {
        setWorkspace(result.workspace);
        setSettings(result.settings);
      } else {
        setError('Empresa não encontrada. Verifique o link e tente novamente.');
      }

      setIsLoading(false);
    }

    loadWorkspace();
  }, [slug]);

  // Datas disponíveis
  const availableDates = useMemo(() => {
    if (!settings) return [];
    return getAvailableDates(settings, settings.max_booking_days_ahead || 30);
  }, [settings]);

  // Carregar slots quando selecionar uma data
  useEffect(() => {
    async function loadSlots() {
      if (!workspace || !selectedDate) return;

      setIsLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedSlot(null);

      const dateStr = selectedDate.toISOString().split('T')[0];
      const result = await getAvailableSlots(workspace.id, dateStr, selectedEventType);

      if (result) {
        setAvailableSlots(result.slots);
      }

      setIsLoadingSlots(false);
    }

    loadSlots();
  }, [workspace, selectedDate, selectedEventType]);

  // Dias do mês para o calendário
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean; isAvailable: boolean }[] = [];

    // Dias do mês anterior
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, isAvailable: false });
    }

    // Dias do mês atual
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const isAvailable = availableDates.some(
        (d) => d.toDateString() === date.toDateString()
      );
      days.push({ date, isCurrentMonth: true, isAvailable });
    }

    // Dias do próximo mês para completar a grade
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, isAvailable: false });
    }

    return days;
  }, [currentMonth, availableDates]);

  // Handlers
  const handleSelectEventType = (type: EventType) => {
    setSelectedEventType(type);
    setStep('date');
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setStep('time');
  };

  const handleSelectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleBack = () => {
    if (step === 'date') setStep('type');
    else if (step === 'time') setStep('date');
    else if (step === 'form') setStep('time');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !selectedDate || !selectedSlot) return;

    setIsSubmitting(true);

    const result = await createPublicBooking({
      workspace_id: workspace.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      company: formData.company || undefined,
      date: selectedDate.toISOString().split('T')[0],
      start_time: selectedSlot.start,
      event_type: selectedEventType,
      notes: formData.notes || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setBookingResult(result);
      setStep('success');
    } else {
      setError(result.error || 'Erro ao criar agendamento');
    }
  };

  // Formatar data
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  // Classes condicionais baseadas no tema - Dark mode usa preto puro (#000000)
  const bgGradient = isDark
    ? 'bg-black'
    : 'bg-white';
  const cardBg = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-500';
  const borderColor = isDark ? 'border-[#1a1a1a]' : 'border-gray-200';
  const inputBg = isDark ? 'bg-[#111111] border-[#222222] text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900';
  const hoverBg = isDark ? 'hover:bg-[#111111]' : 'hover:bg-gray-100';

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen ${bgGradient} flex items-center justify-center p-4`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className={textSecondary}>Carregando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !workspace) {
    return (
      <div className={`min-h-screen ${bgGradient} flex items-center justify-center p-4`}>
        <div className={`${cardBg} rounded-2xl shadow-xl p-8 max-w-md w-full text-center`}>
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Página não encontrada</h2>
          <p className={textSecondary}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgGradient} py-8 px-4`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {settings?.booking_page_logo ? (
            <div className="flex items-center justify-center mb-4">
              <img
                src={settings.booking_page_logo}
                alt={workspace?.name || 'Logo'}
                className="max-h-20 max-w-[200px] object-contain"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
              <Calendar className="w-8 h-8" />
            </div>
          )}
          <h1 className={`text-2xl md:text-3xl font-bold ${textPrimary} mb-2`}>
            Agende com {workspace?.name}
          </h1>
          <p className={textSecondary}>
            Escolha o melhor horário para você
          </p>
        </div>

        {/* Progress Steps */}
        {step !== 'success' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {['type', 'date', 'time', 'form'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : ['type', 'date', 'time', 'form'].indexOf(step) > i
                      ? 'bg-green-500 text-white'
                      : isDark ? 'bg-[#1a1a1a] text-gray-400' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {['type', 'date', 'time', 'form'].indexOf(step) > i ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 3 && (
                  <div
                    className={`w-8 md:w-12 h-1 mx-1 rounded ${
                      ['type', 'date', 'time', 'form'].indexOf(step) > i
                        ? 'bg-green-500'
                        : isDark ? 'bg-[#1a1a1a]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Card Container */}
        <div className={`${cardBg} rounded-2xl shadow-xl overflow-hidden`}>
          {/* Error Banner */}
          {error && step !== 'success' && (
            <div className={`${isDark ? 'bg-red-950/50 border-red-900' : 'bg-red-50 border-red-100'} border-b px-6 py-3 flex items-center gap-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className={`ml-auto ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}>
                ×
              </button>
            </div>
          )}

          {/* Step 1: Tipo de evento */}
          {step === 'type' && (
            <div className="p-6 md:p-8">
              <h2 className={`text-lg font-semibold ${textPrimary} mb-4`}>
                Qual tipo de atendimento você precisa?
              </h2>
              <div className="space-y-3">
                {EVENT_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelectEventType(option.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group ${
                        isDark
                          ? 'border-[#1a1a1a] hover:border-blue-500 hover:bg-blue-950/30'
                          : 'border-gray-100 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-950/50' : 'bg-blue-100'} text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${textPrimary}`}>{option.label}</h3>
                        <p className={`text-sm ${textMuted}`}>Duração: {option.duration}</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-600' : 'text-gray-400'} group-hover:text-blue-500`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Seleção de data */}
          {step === 'date' && (
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={handleBack}
                  className={`p-2 rounded-lg ${hoverBg} transition-colors`}
                >
                  <ChevronLeft className={`w-5 h-5 ${textSecondary}`} />
                </button>
                <h2 className={`text-lg font-semibold ${textPrimary}`}>
                  Escolha uma data
                </h2>
              </div>

              {/* Navegação do mês */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className={`p-2 rounded-lg ${hoverBg} transition-colors`}
                >
                  <ChevronLeft className={`w-5 h-5 ${textPrimary}`} />
                </button>
                <span className={`font-medium ${textPrimary} capitalize`}>
                  {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className={`p-2 rounded-lg ${hoverBg} transition-colors`}
                >
                  <ChevronRight className={`w-5 h-5 ${textPrimary}`} />
                </button>
              </div>

              {/* Grade do calendário */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className={`text-center text-xs font-medium ${textMuted} py-2`}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth, isAvailable }, index) => {
                  const isSelected = selectedDate?.toDateString() === date.toDateString();
                  const isToday = new Date().toDateString() === date.toDateString();

                  return (
                    <button
                      key={index}
                      onClick={() => isAvailable && handleSelectDate(date)}
                      disabled={!isAvailable}
                      className={`
                        aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                        ${!isCurrentMonth ? (isDark ? 'text-gray-700' : 'text-gray-300') : ''}
                        ${isAvailable && !isSelected ? `${isDark ? 'hover:bg-blue-950/40' : 'hover:bg-blue-100'} ${textPrimary} cursor-pointer` : ''}
                        ${!isAvailable && isCurrentMonth ? (isDark ? 'text-gray-700' : 'text-gray-300') + ' cursor-not-allowed' : ''}
                        ${isSelected ? 'bg-blue-600 text-white' : ''}
                        ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <p className={`text-xs ${textMuted} text-center mt-4`}>
                Apenas dias com horários disponíveis estão habilitados
              </p>
            </div>
          )}

          {/* Step 3: Seleção de horário */}
          {step === 'time' && (
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={handleBack}
                  className={`p-2 rounded-lg ${hoverBg} transition-colors`}
                >
                  <ChevronLeft className={`w-5 h-5 ${textSecondary}`} />
                </button>
                <div>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>
                    Escolha um horário
                  </h2>
                  <p className={`text-sm ${textMuted} capitalize`}>
                    {selectedDate && formatDate(selectedDate)}
                  </p>
                </div>
              </div>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className={`w-12 h-12 ${isDark ? 'text-gray-700' : 'text-gray-300'} mx-auto mb-4`} />
                  <p className={textSecondary}>Nenhum horário disponível para esta data</p>
                  <button
                    onClick={handleBack}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Escolher outra data
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => handleSelectSlot(slot)}
                      className={`
                        py-3 px-4 rounded-lg border-2 text-center font-medium transition-all
                        ${selectedSlot?.start === slot.start
                          ? 'border-blue-600 bg-blue-950/40 text-blue-400'
                          : isDark
                            ? 'border-[#1a1a1a] hover:border-blue-500 text-gray-300'
                            : 'border-gray-100 hover:border-blue-300 text-gray-700'
                        }
                      `}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Formulário */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <button
                  type="button"
                  onClick={handleBack}
                  className={`p-2 rounded-lg ${hoverBg} transition-colors`}
                >
                  <ChevronLeft className={`w-5 h-5 ${textSecondary}`} />
                </button>
                <div>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>
                    Seus dados
                  </h2>
                  <p className={`text-sm ${textMuted}`}>
                    {selectedDate && formatDate(selectedDate)} às {selectedSlot?.start}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Nome completo *
                  </label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${inputBg}`}
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${inputBg}`}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${inputBg}`}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                {/* Empresa */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Empresa
                  </label>
                  <div className="relative">
                    <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${inputBg}`}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Observações
                  </label>
                  <div className="relative">
                    <FileText className={`absolute left-3 top-3 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none ${inputBg}`}
                      rows={3}
                      placeholder="Alguma informação adicional?"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.phone}
                  className={`w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    isDark ? 'disabled:bg-[#1a1a1a] disabled:text-gray-600' : 'disabled:bg-gray-300'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-5 h-5" />
                      Confirmar agendamento
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 5: Sucesso */}
          {step === 'success' && bookingResult && (
            <div className="p-8 text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isDark ? 'bg-green-950/50' : 'bg-green-100'} text-green-500 mb-6`}>
                <Check className="w-10 h-10" />
              </div>
              <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>
                Agendamento confirmado!
              </h2>
              <p className={`${textSecondary} mb-6`}>
                Você receberá uma confirmação no seu WhatsApp
              </p>

              <div className={`${isDark ? 'bg-[#111111]' : 'bg-gray-50'} rounded-xl p-6 text-left max-w-sm mx-auto`}>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className={textPrimary}>
                      {selectedDate && formatDate(selectedDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className={textPrimary}>
                      {bookingResult.event?.start_time} - {bookingResult.event?.end_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-500" />
                    <span className={textPrimary}>{formData.name}</span>
                  </div>
                </div>
              </div>

              <p className={`text-sm ${textMuted} mt-6`}>
                Entraremos em contato para confirmar o agendamento
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className={`text-center text-sm ${textMuted} mt-6`}>
          Powered by Pesca Lead
        </p>
      </div>
    </div>
  );
}
