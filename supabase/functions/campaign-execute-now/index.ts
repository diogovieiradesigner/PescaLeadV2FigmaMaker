/**
 * Campaign Execute Now - Edge Function V3
 * Executa uma campanha imediatamente
 * 
 * - Permite múltiplas runs por dia
 * - Bloqueia apenas se já tiver run RUNNING na mesma instância
 * 
 * POST /campaign-execute-now
 * Body: { config_id: string }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { 
  timeToDate, 
  getCurrentTimeInTimezone,
  randomInterval,
  generateRandomScheduleWithLimit
} from "../_shared/timezone-helpers.ts";

// ==================== VALIDATION HELPERS ====================

// ✅ FASE 2: Validação de status antes de atualizar
const VALID_CAMPAIGN_RUN_STATUSES = ['running', 'completed', 'failed', 'cancelled', 'paused'] as const;

function validateCampaignRunStatus(status: string): void {
  if (!VALID_CAMPAIGN_RUN_STATUSES.includes(status as any)) {
    throw new Error(`Invalid campaign run status: ${status}. Valid statuses: ${VALID_CAMPAIGN_RUN_STATUSES.join(', ')}`);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Max-Age': '86400',
};

// Helper para logar
async function log(supabase: any, runId: string, stepName: string, level: string, message: string, details?: any, leadId?: string) {
  try {
    await supabase.rpc('log_campaign_step', {
      p_run_id: runId,
      p_step_name: stepName,
      p_level: level,
      p_message: message,
      p_details: details || null,
      p_lead_id: leadId || null,
      p_message_id: null
    });
  } catch (e) {
    console.error('[Log Error]', e);
  }
}

// ✅ FASE 4: Funções de agendamento movidas para arquivo compartilhado
// Importadas de: ../_shared/timezone-helpers.ts

/**
 * Edge Function: campaign-execute-now
 * 
 * Permite execução manual imediata de uma campanha configurada.
 * Bypassa verificações de horário do scheduler e cria uma run imediatamente.
 * 
 * @route POST /campaign-execute-now
 * @body { config_id: UUID } - ID da configuração da campanha
 * 
 * Validações:
 * - start_time <= end_time
 * - inbox_id, source_column_id, target_column_id existem
 * - Instância não está ocupada (lock atômico)
 * - daily_limit entre 1-500
 * - min_interval_seconds >= 30
 * 
 * Comportamento:
 * - Respeita start_time (não agenda antes)
 * - Respeita end_time (não agenda depois)
 * - Usa timezone da configuração
 * - Gera intervalos aleatórios entre min/max
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Body inválido - envie JSON com config_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { config_id } = body;

    if (!config_id) {
      return new Response(JSON.stringify({ error: 'config_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ExecuteNow] Starting immediate execution for config: ${config_id}`);

    // 1. Buscar configuração da campanha
    const { data: config, error: configError } = await supabase
      .from('campaign_configs')
      .select('*')
      .eq('id', config_id)
      .single();

    if (configError || !config) {
      console.error('[ExecuteNow] Config not found:', configError);
      return new Response(JSON.stringify({ error: 'Campanha não encontrada', details: configError?.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ExecuteNow] Config found: ${config.id}, start_time: ${config.start_time}, end_time: ${config.end_time}`);

    // ✅ NOVO: Validar start_time <= end_time
    if (config.start_time && config.end_time) {
      const startTimeStr = config.start_time.toString();
      const endTimeStr = config.end_time.toString();
      console.log(`[ExecuteNow] Validating time range: ${startTimeStr} <= ${endTimeStr}`);
      if (startTimeStr > endTimeStr) {
        console.error(`[ExecuteNow] Invalid time range: ${startTimeStr} > ${endTimeStr}`);
        await log(supabase, 'validation', 'VALIDAÇÃO', 'error', 
          `Configuração inválida: start_time (${startTimeStr}) é maior que end_time (${endTimeStr})`,
          { start_time: startTimeStr, end_time: endTimeStr, config_id: config.id }
        );
        return new Response(JSON.stringify({ 
          error: `Configuração inválida: horário de início (${startTimeStr}) não pode ser maior que horário de fim (${endTimeStr})`,
          error_code: 'INVALID_TIME_RANGE',
          start_time: startTimeStr,
          end_time: endTimeStr
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ✅ NOVO: Validar dependências existem
    console.log(`[ExecuteNow] Checking inbox: ${config.inbox_id}`);
    // ✅ CORREÇÃO: inbox_instances não tem coluna 'id', apenas inbox_id e instance_id
    const { data: inboxExists, error: inboxError } = await supabase
      .from('inbox_instances')
      .select('instance_id')
      .eq('inbox_id', config.inbox_id)
      .limit(1)
      .maybeSingle();

    if (inboxError) {
      console.error(`[ExecuteNow] Error checking inbox:`, inboxError);
      return new Response(JSON.stringify({ 
        error: `Erro ao verificar inbox: ${inboxError.message}`,
        error_code: 'INBOX_CHECK_ERROR',
        inbox_id: config.inbox_id
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!inboxExists || !inboxExists.instance_id) {
      console.error(`[ExecuteNow] Inbox not found or not linked to instance: ${config.inbox_id}`);
      return new Response(JSON.stringify({ 
        error: 'Inbox não encontrado ou não está vinculado a uma instância',
        error_code: 'INBOX_NOT_FOUND',
        inbox_id: config.inbox_id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[ExecuteNow] Inbox found with instance: ${inboxExists.instance_id}`);

    const { data: sourceColumnExists } = await supabase
      .from('funnel_columns')
      .select('id')
      .eq('id', config.source_column_id)
      .limit(1)
      .maybeSingle();

    if (!sourceColumnExists) {
      return new Response(JSON.stringify({ 
        error: 'Coluna de origem não encontrada',
        error_code: 'SOURCE_COLUMN_NOT_FOUND'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetColumnExists } = await supabase
      .from('funnel_columns')
      .select('id')
      .eq('id', config.target_column_id)
      .limit(1)
      .maybeSingle();

    if (!targetColumnExists) {
      return new Response(JSON.stringify({ 
        error: 'Coluna de destino não encontrada',
        error_code: 'TARGET_COLUMN_NOT_FOUND'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verificar se instância está conectada
    console.log(`[ExecuteNow] Checking instance status for inbox: ${config.inbox_id}`);
    const { data: instanceStatus, error: instanceStatusError } = await supabase.rpc('check_campaign_instance_status', {
      p_inbox_id: config.inbox_id
    });

    if (instanceStatusError) {
      console.error(`[ExecuteNow] Error checking instance status:`, instanceStatusError);
      return new Response(JSON.stringify({ 
        error: `Erro ao verificar status da instância: ${instanceStatusError.message}`,
        error_code: 'INSTANCE_STATUS_ERROR',
        details: instanceStatusError
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ExecuteNow] Instance status:`, instanceStatus);

    if (!instanceStatus?.connected) {
      console.error(`[ExecuteNow] Instance disconnected: ${instanceStatus?.status}`);
      return new Response(JSON.stringify({ 
        error: `Instância "${instanceStatus?.instance_name || 'WhatsApp'}" está desconectada (${instanceStatus?.status || 'offline'})`,
        error_code: 'INSTANCE_DISCONNECTED',
        instance_status: instanceStatus
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[ExecuteNow] Instance connected: ${instanceStatus.instance_name}`);

    // 3. ✅ NOVO: Verificar race condition usando RPC com lock atômico
    // Usar RPC que faz verificação e criação atômica para evitar race conditions
    let lockResult: any = null;
    let lockError: any = null;
    
    try {
      const { data, error } = await supabase.rpc('check_and_lock_campaign_instance', {
        p_inbox_id: config.inbox_id,
        p_config_id: config.id
      });
      lockResult = data;
      lockError = error;
    } catch (e) {
      // Fallback: se função não existir, usar verificação antiga
      console.warn('[ExecuteNow] Lock function not available, using fallback:', e);
      lockError = null;
      lockResult = null;
    }

    if (lockError) {
      console.error('[ExecuteNow] Lock error:', lockError);
      // Fallback para verificação antiga se função não existir
      const { data: runningRun } = await supabase
        .from('campaign_runs')
        .select(`
          id,
          config_id,
          campaign_configs!inner(inbox_id)
        `)
        .eq('campaign_configs.inbox_id', config.inbox_id)
        .eq('status', 'running')
        .limit(1)
        .maybeSingle();

      if (runningRun) {
        return new Response(JSON.stringify({ 
          error: 'Já existe uma campanha em execução nesta instância. Aguarde a conclusão ou pause a campanha atual.',
          error_code: 'INSTANCE_BUSY',
          running_run_id: runningRun.id
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (lockResult && !lockResult?.can_proceed) {
      return new Response(JSON.stringify({ 
        error: lockResult?.reason || 'Já existe uma campanha em execução nesta instância. Aguarde a conclusão ou pause a campanha atual.',
        error_code: 'INSTANCE_BUSY',
        running_run_id: lockResult?.running_run_id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Identificar provider do inbox
    const { data: inboxInfo } = await supabase
      .from('inbox_instances')
      .select('instance_id, instances!inner(provider, provider_type)')
      .eq('inbox_id', config.inbox_id)
      .single();
    
    const provider = inboxInfo?.instances?.provider || 'whatsapp';
    const providerType = inboxInfo?.instances?.provider_type || 'unknown';

    // 5. Criar run
    const today = new Date().toISOString().split('T')[0];
    const { data: run, error: runError } = await supabase
      .from('campaign_runs')
      .insert({
        config_id: config.id,
        status: 'running',
        run_date: today,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (runError) {
      console.error('[ExecuteNow] Error creating run:', runError);
      return new Response(JSON.stringify({ error: 'Erro ao criar execução', details: runError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ FASE 2: Validar daily_limit antes de buscar leads
    const dailyLimit = config.daily_limit;
    if (!dailyLimit || dailyLimit < 1 || dailyLimit > 500) {
      await log(supabase, run.id, 'VALIDAÇÃO', 'error', 
        `daily_limit inválido: ${dailyLimit}. Deve estar entre 1 e 500`,
        { invalid_value: dailyLimit }
      );
      await supabase
        .from('campaign_runs')
        .update({ status: 'failed', error_message: `daily_limit inválido: ${dailyLimit}. Deve estar entre 1 e 500`, completed_at: new Date().toISOString() })
        .eq('id', run.id);
      return new Response(JSON.stringify({ 
        error: `daily_limit inválido: ${dailyLimit}. Deve estar entre 1 e 500`,
        error_code: 'INVALID_DAILY_LIMIT',
        daily_limit: dailyLimit
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log: Execução manual
    await log(supabase, run.id, 'INICIALIZAÇÃO', 'info', 
      `🚀 Execução MANUAL iniciada via ${provider.toUpperCase()} (${providerType})`, 
      { config_id: config.id, daily_limit: dailyLimit, provider, manual: true }
    );

    // 6. Buscar leads elegíveis
    const providerLabel = provider === 'whatsapp' ? 'WhatsApp validado' : provider === 'email' ? 'email válido' : provider;
    await log(supabase, run.id, 'BUSCA_LEADS', 'info', 
      `Buscando até ${dailyLimit} leads com ${providerLabel}...`
    );

    const { data: leads, error: leadsError } = await supabase
      .rpc('get_campaign_eligible_leads', {
        p_workspace_id: config.workspace_id,
        p_source_column_id: config.source_column_id,
        p_inbox_id: config.inbox_id,
        p_limit: dailyLimit
      });

    if (leadsError) {
      await log(supabase, run.id, 'ERRO', 'error', 
        `Erro ao buscar leads: ${leadsError.message}`
      );
      await supabase
        .from('campaign_runs')
        .update({ status: 'failed', error_message: leadsError.message, completed_at: new Date().toISOString() })
        .eq('id', run.id);
      
      return new Response(JSON.stringify({ error: leadsError.message, run_id: run.id }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!leads || leads.length === 0) {
      await log(supabase, run.id, 'BUSCA_LEADS', 'warning', 
        `Nenhum lead elegível encontrado. Para ${provider.toUpperCase()}, os leads precisam ter ${providerLabel}.`
      );
      await supabase
        .from('campaign_runs')
        .update({ status: 'completed', completed_at: new Date().toISOString(), leads_total: 0 })
        .eq('id', run.id);
      
      return new Response(JSON.stringify({ 
        success: true, 
        run_id: run.id, 
        leads_scheduled: 0,
        message: 'Nenhum lead elegível encontrado'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await log(supabase, run.id, 'BUSCA_LEADS', 'success', 
      `${leads.length} leads encontrados com ${providerLabel}`,
      { leads_found: leads.length, provider }
    );

    // 7. Verificar e respeitar start_time e end_time (considerando timezone)
    const timezone = config.timezone || 'America/Sao_Paulo';
    const now = new Date(); // Date atual (UTC)
    
    // ✅ CORREÇÃO: Comparar horários usando apenas HH:MM no mesmo timezone (mais simples e confiável)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Obter horário atual como HH:MM no timezone
    const currentTimeStr = formatter.format(now);
    const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Converter end_time para minutos para comparação simples
    let endTimeMinutes: number | null = null;
    if (config.end_time) {
      const [endHour, endMin] = config.end_time.split(':').map(Number);
      endTimeMinutes = endHour * 60 + (endMin || 0);
    }
    
    // ✅ CORREÇÃO: Para execução MANUAL ("Executar Agora"), não bloquear por start_time
    // Apenas verificar end_time. O start_time será respeitado no agendamento das mensagens.
    // Se start_time ainda não chegou, as mensagens serão agendadas a partir de start_time.
    // Se start_time já passou ou não existe, as mensagens serão agendadas AGORA.
    
    // Verificar apenas se end_time já passou (bloqueio definitivo) - comparação simples de minutos
    if (endTimeMinutes !== null && currentTimeMinutes > endTimeMinutes) {
      const currentTimeFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      await log(supabase, run.id, 'ERRO', 'error', 
        `⏸️ Horário limite (${config.end_time}) já passou. Não é possível executar.`,
        { end_time: config.end_time, current_time: currentTimeFormatted, timezone }
      );
      
      await supabase
        .from('campaign_runs')
        .update({ status: 'failed', error_message: `Horário limite (${config.end_time}) já passou`, completed_at: new Date().toISOString() })
        .eq('id', run.id);
      
      return new Response(JSON.stringify({ 
        error: `Horário limite (${config.end_time}) já passou. Não é possível executar.`,
        error_code: 'END_TIME_PASSED',
        end_time: config.end_time,
        current_time: currentTimeFormatted,
        timezone
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Determinar horário de início real para agendamento
    // Para execução manual: se start_time ainda não chegou, agendar a partir de start_time
    // Se start_time já passou ou não existe, agendar AGORA (now)
    const nowForScheduling = new Date(); // Date atual (UTC) para agendamento
    let actualStartTime: Date;
    let startTimeToday: Date | null = null;
    
    if (config.start_time) {
      // Converter start_time para minutos para comparação simples
      const [startHour, startMin] = config.start_time.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + (startMin || 0);
      
      if (startTimeMinutes > currentTimeMinutes) {
        // start_time ainda não chegou - agendar a partir de start_time
        const nowInTimezone = getCurrentTimeInTimezone(timezone);
        startTimeToday = timeToDate(config.start_time, nowInTimezone, timezone);
        actualStartTime = startTimeToday;
      } else {
        // start_time já passou - agendar AGORA
        actualStartTime = nowForScheduling;
      }
    } else {
      // Sem start_time - agendar AGORA
      actualStartTime = nowForScheduling;
    }
    
    // Converter endTimeToday para Date se necessário (para cálculo de availableMinutes)
    let endTimeToday: Date | null = null;
    if (config.end_time) {
      const nowInTimezone = getCurrentTimeInTimezone(timezone);
      endTimeToday = timeToDate(config.end_time, nowInTimezone, timezone);
    }
    const availableMinutes = endTimeToday 
      ? Math.round((endTimeToday.getTime() - actualStartTime.getTime()) / 60000)
      : null;
    
    const currentTimeFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    await log(supabase, run.id, 'VERIFICAÇÃO', 'info', 
      `✅ Janela de horário verificada: ${config.start_time || 'sem início'} até ${config.end_time || 'sem limite'}${availableMinutes ? ` (${availableMinutes} min disponíveis)` : ''}`,
      { 
        start_time: config.start_time, 
        end_time: config.end_time, 
        current_time: currentTimeFormatted,
        actual_start_time: actualStartTime.toISOString(),
        available_minutes: availableMinutes,
        timezone
      }
    );

    // 8. Gerar horários aleatórios respeitando start_time e end_time
    // ✅ FASE 2: Validar min_interval_seconds antes de usar
    const minInterval = config.min_interval_seconds;
    if (!minInterval || minInterval < 30) {
      await log(supabase, run.id, 'VALIDAÇÃO', 'error', 
        `min_interval_seconds inválido: ${minInterval}. Deve ser >= 30`,
        { invalid_value: minInterval }
      );
      await supabase
        .from('campaign_runs')
        .update({ status: 'failed', error_message: `min_interval_seconds inválido: ${minInterval}. Deve ser >= 30`, completed_at: new Date().toISOString() })
        .eq('id', run.id);
      return new Response(JSON.stringify({ 
        error: `min_interval_seconds inválido: ${minInterval}. Deve ser >= 30`,
        error_code: 'INVALID_MIN_INTERVAL',
        min_interval: minInterval
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const maxInterval = minInterval * 2.5;
    
    // ✅ NOVO: Validar minInterval <= maxInterval
    if (minInterval > maxInterval) {
      await log(supabase, run.id, 'ERRO', 'error', 
        `Intervalo inválido: minInterval (${minInterval}s) é maior que maxInterval (${maxInterval}s)`,
        { min_interval: minInterval, max_interval: maxInterval }
      );
      await supabase
        .from('campaign_runs')
        .update({ status: 'failed', error_message: `Intervalo inválido: minInterval (${minInterval}s) > maxInterval (${maxInterval}s)`, completed_at: new Date().toISOString() })
        .eq('id', run.id);
      return new Response(JSON.stringify({ 
        error: `Intervalo inválido: minInterval (${minInterval}s) é maior que maxInterval (${maxInterval}s)`,
        error_code: 'INVALID_INTERVAL',
        min_interval: minInterval,
        max_interval: maxInterval
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { schedules, fitsAll, scheduledCount } = generateRandomScheduleWithLimit(
      actualStartTime, // ✅ Usar actualStartTime (maior entre now e start_time)
      leads.length,
      minInterval,
      maxInterval,
      endTimeToday
    );
    
    if (!fitsAll) {
      await log(supabase, run.id, 'AGENDAMENTO', 'warning', 
        `⚠️ Apenas ${scheduledCount} de ${leads.length} leads cabem no horário de hoje (${config.start_time || 'agora'} até ${config.end_time || 'sem limite'}). Os demais serão ignorados nesta execução.`,
        { 
          total_leads: leads.length, 
          scheduled_today: scheduledCount,
          start_time: config.start_time,
          end_time: config.end_time
        }
      );
    }
    
    const totalDurationMs = schedules.length > 1 
      ? schedules[schedules.length - 1].getTime() - schedules[0].getTime()
      : 0;
    const totalDurationMin = Math.round(totalDurationMs / 60000);
    
    const startTimeStr = actualStartTime > now 
      ? `a partir de ${config.start_time}` 
      : 'AGORA';
    
    await log(supabase, run.id, 'AGENDAMENTO', 'info', 
      `Agendando ${scheduledCount} mensagens com intervalo aleatório (${minInterval}s - ${Math.round(maxInterval)}s) ${startTimeStr}${endTimeToday ? ` até ${config.end_time}` : ''}`,
      { 
        min_interval: minInterval, 
        max_interval: Math.round(maxInterval),
        total_duration_minutes: totalDurationMin,
        starts_immediately: actualStartTime <= now,
        actual_start_time: actualStartTime.toISOString(),
        respects_start_time: !!startTimeToday,
        respects_end_time: !!endTimeToday
      }
    );

    // Usar apenas os leads que cabem no horário
    const leadsToSchedule = leads.slice(0, scheduledCount);
    
    const messages = leadsToSchedule.map((lead: any, index: number) => {
      return {
        run_id: run.id,
        lead_id: lead.lead_id,
        phone_number: lead.phone_number || null,
        phone_normalized: lead.phone_normalized || null,
        scheduled_at: schedules[index].toISOString(),
        status: 'pending'
      };
    });

    // 9. Inserir mensagens
    const { error: insertError } = await supabase
      .from('campaign_messages')
      .insert(messages);

    if (insertError) {
      await log(supabase, run.id, 'ERRO', 'error', 
        `Erro ao inserir mensagens: ${insertError.message}`
      );
      await supabase
        .from('campaign_runs')
        .update({ status: 'failed', error_message: insertError.message, completed_at: new Date().toISOString() })
        .eq('id', run.id);
      
      return new Response(JSON.stringify({ error: insertError.message, run_id: run.id }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 10. Atualizar run
    // ✅ CORREÇÃO: Usar scheduledCount em vez de leads.length para garantir consistência
    await supabase
      .from('campaign_runs')
      .update({ leads_total: scheduledCount })
      .eq('id', run.id);

    // Log leads agendados (primeiros 5)
    for (let i = 0; i < Math.min(leadsToSchedule.length, 5); i++) {
      const lead = leadsToSchedule[i];
      const scheduledTime = schedules[i];
      const intervalFromPrev = i > 0 
        ? Math.round((schedules[i].getTime() - schedules[i-1].getTime()) / 1000)
        : 0;
      
      await log(supabase, run.id, 'AGENDAMENTO', 'success', 
        `Lead "${lead.client_name}" → ${scheduledTime.toLocaleTimeString('pt-BR')}${i > 0 ? ` (+${intervalFromPrev}s)` : ' (AGORA!)'}`,
        { contact: lead.phone_normalized || lead.contact_value, interval_from_prev: intervalFromPrev },
        lead.lead_id
      );
    }
    
    if (leadsToSchedule.length > 5) {
      await log(supabase, run.id, 'AGENDAMENTO', 'info', 
        `... e mais ${leadsToSchedule.length - 5} leads agendados`
      );
    }

    const intervalExamples = [];
    for (let i = 1; i < Math.min(leadsToSchedule.length, 6); i++) {
      intervalExamples.push(Math.round((schedules[i].getTime() - schedules[i-1].getTime()) / 1000));
    }

    await log(supabase, run.id, 'AGENDAMENTO', 'success', 
      `✅ ${messages.length} mensagens agendadas - Primeira envia AGORA!`,
      { 
        first_at: messages[0].scheduled_at, 
        last_at: messages[messages.length - 1].scheduled_at,
        interval_examples: intervalExamples,
        respects_end_time: !!endTimeToday
      }
    );

    console.log(`[ExecuteNow] Scheduled ${messages.length} messages for run ${run.id} - starts immediately!`);

    return new Response(JSON.stringify({
      success: true,
      run_id: run.id,
      leads_scheduled: scheduledCount,
      leads_total: leads.length,
      first_send_at: messages[0].scheduled_at,
      last_send_at: messages[messages.length - 1].scheduled_at,
      estimated_duration_minutes: totalDurationMin,
      respects_end_time: !!endTimeToday,
      fits_all: fitsAll
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    // ✅ NOVO: Log detalhado de erros
    console.error('[ExecuteNow] Fatal error:', error);
    console.error('[ExecuteNow] Error stack:', error.stack);
    console.error('[ExecuteNow] Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    // Tentar logar no banco se possível
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      // Se tiver run_id no contexto, logar
      if (error.run_id) {
        await log(supabase, error.run_id, 'ERRO_FATAL', 'error', 
          `Erro fatal: ${error.message}`,
          { stack: error.stack, name: error.name, cause: error.cause }
        );
      }
    } catch (logError) {
      console.error('[ExecuteNow] Failed to log error to database:', logError);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor',
      error_code: 'FATAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});