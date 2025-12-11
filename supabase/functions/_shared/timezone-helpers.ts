/**
 * Shared Campaign Helpers - Funções compartilhadas para sistema de campanhas
 * 
 * Inclui:
 * - Helpers de timezone (timeToDate, getCurrentTimeInTimezone)
 * - Helpers de agendamento (randomInterval, generateRandomScheduleWithLimit, calculateOptimalInterval)
 */

// ==================== SCHEDULING HELPERS ====================

/**
 * Gera intervalo aleatório entre min e max segundos
 * Usado para evitar detecção de padrões e bloqueios
 * 
 * @param minSeconds - Intervalo mínimo em segundos
 * @param maxSeconds - Intervalo máximo em segundos
 * @returns Número aleatório de segundos entre minSeconds e maxSeconds (inclusive)
 */
export function randomInterval(minSeconds: number, maxSeconds: number): number {
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

/**
 * Gera array de horários respeitando horário limite (end_time)
 * Se não couber todos no dia, para no limite
 * 
 * @param startTime - Timestamp de início
 * @param count - Quantidade de mensagens a agendar
 * @param minInterval - Intervalo mínimo em segundos
 * @param maxInterval - Intervalo máximo em segundos
 * @param endTime - Horário limite do dia (não pode agendar depois)
 * @returns Objeto com schedules (array de Date), fitsAll (boolean) e scheduledCount (number)
 */
export function generateRandomScheduleWithLimit(
  startTime: Date,
  count: number,
  minInterval: number,
  maxInterval: number,
  endTime: Date | null
): { schedules: Date[]; fitsAll: boolean; scheduledCount: number } {
  const schedules: Date[] = [];
  let currentTime = startTime.getTime();
  const endTimeMs = endTime ? endTime.getTime() : null;
  
  for (let i = 0; i < count; i++) {
    // Verifica se ainda cabe no horário limite
    if (endTimeMs && currentTime > endTimeMs) {
      console.log(`[Schedule] Stopped at ${i} messages - exceeded end time`);
      break;
    }
    
    schedules.push(new Date(currentTime));
    
    // Adiciona intervalo aleatório para próxima mensagem
    const intervalMs = randomInterval(minInterval, maxInterval) * 1000;
    currentTime += intervalMs;
  }
  
  return {
    schedules,
    fitsAll: schedules.length === count,
    scheduledCount: schedules.length
  };
}

/**
 * Calcula intervalo ideal baseado no tempo disponível e quantidade de leads
 * Garante que todos os leads caibam no período disponível
 * 
 * @param startTime - Timestamp de início
 * @param endTime - Timestamp de fim
 * @param leadCount - Quantidade de leads a agendar
 * @param configuredMinInterval - Intervalo mínimo configurado pelo usuário
 * @returns Objeto com minInterval e maxInterval calculados
 */
export function calculateOptimalInterval(
  startTime: Date,
  endTime: Date,
  leadCount: number,
  configuredMinInterval: number
): { minInterval: number; maxInterval: number } {
  const availableTimeMs = endTime.getTime() - startTime.getTime();
  const availableTimeSec = availableTimeMs / 1000;
  
  // Precisamos de (leadCount - 1) intervalos para leadCount mensagens
  // Exemplo: 3 mensagens precisam de 2 intervalos
  const intervalsNeeded = Math.max(leadCount - 1, 1);
  
  // Intervalo máximo possível para caber todos
  // Usamos fator 0.85 para dar margem de segurança (15% de folga)
  const maxPossibleInterval = (availableTimeSec * 0.85) / intervalsNeeded;
  
  // O intervalo mínimo real é o menor entre o configurado e o máximo possível
  let realMinInterval: number;
  let realMaxInterval: number;
  
  if (maxPossibleInterval >= configuredMinInterval) {
    // Temos tempo de sobra - usa intervalo configurado
    realMinInterval = configuredMinInterval;
    // Máximo é 1.5x do mínimo, mas não pode exceder o limite
    realMaxInterval = Math.min(configuredMinInterval * 1.5, maxPossibleInterval);
  } else {
    // Tempo apertado - precisa reduzir intervalo
    realMinInterval = Math.max(maxPossibleInterval * 0.7, 30); // mínimo 30 segundos
    realMaxInterval = maxPossibleInterval;
  }
  
  return {
    minInterval: Math.round(realMinInterval),
    maxInterval: Math.round(realMaxInterval)
  };
}

// ==================== TIMEZONE HELPERS ====================

/**
 * Converte TIME string (HH:MM:SS) para Date no dia especificado, considerando timezone
 * 
 * @param timeStr - String no formato HH:MM:SS
 * @param baseDate - Data base para o cálculo
 * @param timezone - Timezone IANA (ex: 'America/Sao_Paulo')
 * @returns Date representando o horário no timezone especificado
 */
export function timeToDate(timeStr: string, baseDate: Date, timezone: string = 'America/Sao_Paulo'): Date {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  
  try {
    // Criar data local com o horário especificado
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();
    const localDate = new Date(year, month, day, hours, minutes, seconds || 0);
    
    // Obter o horário atual no timezone para calcular offset
    const now = new Date();
    
    // Formatar "agora" em UTC
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Formatar "agora" no timezone especificado
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Criar datas UTC e timezone para calcular offset
    const utcParts = utcFormatter.formatToParts(now);
    const tzParts = tzFormatter.formatToParts(now);
    
    const utcDate = new Date(
      parseInt(utcParts.find(p => p.type === 'year')!.value),
      parseInt(utcParts.find(p => p.type === 'month')!.value) - 1,
      parseInt(utcParts.find(p => p.type === 'day')!.value),
      parseInt(utcParts.find(p => p.type === 'hour')!.value),
      parseInt(utcParts.find(p => p.type === 'minute')!.value),
      parseInt(utcParts.find(p => p.type === 'second')!.value)
    );
    
    const tzDate = new Date(
      parseInt(tzParts.find(p => p.type === 'year')!.value),
      parseInt(tzParts.find(p => p.type === 'month')!.value) - 1,
      parseInt(tzParts.find(p => p.type === 'day')!.value),
      parseInt(tzParts.find(p => p.type === 'hour')!.value),
      parseInt(tzParts.find(p => p.type === 'minute')!.value),
      parseInt(tzParts.find(p => p.type === 'second')!.value)
    );
    
    // Calcular offset: diferença entre UTC e timezone
    // Se timezone está atrás de UTC (ex: America/Sao_Paulo = UTC-3), offset é negativo
    // Se timezone está à frente de UTC (ex: Asia/Tokyo = UTC+9), offset é positivo
    const offsetMs = utcDate.getTime() - tzDate.getTime();
    
    // Aplicar offset: se timezone está atrás de UTC, precisamos somar o offset (que é negativo)
    // Se timezone está à frente de UTC, precisamos subtrair o offset (que é positivo)
    // Como offsetMs já tem o sinal correto (UTC - TZ), aplicamos diretamente
    const result = new Date(localDate.getTime() + offsetMs);
    
    return result;
  } catch (e) {
    // Fallback: usar método simples se timezone inválido
    console.warn(`[timeToDate] Timezone ${timezone} inválido, usando método simples:`, e);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, seconds || 0, 0);
    return result;
  }
}

/**
 * Obtém o horário atual no timezone especificado
 * 
 * @param timezone - Timezone IANA (ex: 'America/Sao_Paulo')
 * @returns Date representando "agora" no timezone especificado
 */
export function getCurrentTimeInTimezone(timezone: string = 'America/Sao_Paulo'): Date {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')!.value);
    const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day')!.value);
    const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
    const minute = parseInt(parts.find(p => p.type === 'minute')!.value);
    const second = parseInt(parts.find(p => p.type === 'second')!.value);
    
    // Criar data local que representa o horário atual no timezone
    return new Date(year, month, day, hour, minute, second);
  } catch (e) {
    console.warn(`[getCurrentTimeInTimezone] Timezone ${timezone} inválido, usando Date.now():`, e);
    return new Date();
  }
}

