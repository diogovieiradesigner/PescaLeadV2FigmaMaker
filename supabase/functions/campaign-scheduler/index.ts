/**
 * Edge Function: campaign-scheduler
 * 
 * Executado periodicamente via CRON para agendar campanhas ativas.
 * Verifica quais campanhas devem rodar e cria runs com mensagens agendadas.
 * 
 * @route POST /campaign-scheduler (CRON)
 * 
 * Validações:
 * - Campanha ativa (is_active = true)
 * - should_campaign_run() retorna true
 * - Instância não está ocupada (lock atômico)
 * - start_time <= end_time
 * - inbox_id, source_column_id, target_column_id existem
 * - daily_limit entre 1-500
 * - min_interval_seconds >= 30
 * 
 * Comportamento:
 * - Respeita start_time (não agenda antes)
 * - Respeita end_time (não agenda depois)
 * - Usa timezone da configuração
 * - Calcula intervalo ótimo dinamicamente
 * - Gera intervalos aleatórios entre min/max
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { 
  timeToDate, 
  getCurrentTimeInTimezone,
  randomInterval,
  generateRandomScheduleWithLimit,
  calculateOptimalInterval
} from "../_shared/timezone-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper para logar
async function log(supabase: any, runId: string, stepName: string, level: string, message: string, details?: any, leadId?: string, messageId?: string) {
  try {
    await supabase.rpc('log_campaign_step', {
      p_run_id: runId,
      p_step_name: stepName,
      p_level: level,
      p_message: message,
      p_details: details || null,
      p_lead_id: leadId || null,
      p_message_id: messageId || null
    });
  } catch (e) {
    console.error('[Log Error]', e);
  }
}

// ✅ FASE 4: Funções de agendamento movidas para arquivo compartilhado
// Importadas de: ../_shared/timezone-helpers.ts

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('[Scheduler] Starting campaign check...');

    // 1. Buscar todas as campanhas ativas COM start_time e end_time
    const { data: configs, error: configError } = await supabase
      .from('campaign_configs')
      .select('id, workspace_id, inbox_id, source_column_id, target_column_id, daily_limit, min_interval_seconds, ai_instructions, start_time, end_time, timezone')
      .eq('is_active', true);

    if (configError) {
      console.error('[Scheduler] Error fetching configs:', configError);
      return new Response(JSON.stringify({ error: configError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!configs || configs.length === 0) {
      console.log('[Scheduler] No active campaigns found');
      return new Response(JSON.stringify({ message: 'No active campaigns' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Scheduler] Found ${configs.length} active campaigns`);

    let scheduled = 0;
    let skipped = 0;

    for (const config of configs) {
      try {
        // 2. Verificar se deve rodar
        const { data: checkResult, error: checkError } = await supabase
          .rpc('should_campaign_run', { p_config_id: config.id });

        if (checkError) {
          console.error(`[Scheduler] Error checking config ${config.id}:`, checkError);
          skipped++;
          continue;
        }

        if (!checkResult?.should_run) {
          console.log(`[Scheduler] Config ${config.id}: ${checkResult?.reason}`);
          skipped++;
          continue;
        }

        console.log(`[Scheduler] Config ${config.id}: Will run!`);

        // ✅ NOVO: Validar dependências existem
        const { data: inboxExists } = await supabase
          .from('inbox_instances')
          .select('id, instance_id, instances!inner(provider, provider_type)')
          .eq('inbox_id', config.inbox_id)
          .limit(1)
          .maybeSingle();

        if (!inboxExists) {
          await log(supabase, 'validation', 'VALIDAÇÃO', 'error', 
            `Inbox não encontrado ou não está vinculado a uma instância`,
            { config_id: config.id, inbox_id: config.inbox_id }
          );
          skipped++;
          continue;
        }

        const provider = inboxExists.instances?.provider || 'unknown';
        const providerType = inboxExists.instances?.provider_type || 'unknown';

        const { data: sourceColumnExists } = await supabase
          .from('funnel_columns')
          .select('id')
          .eq('id', config.source_column_id)
          .limit(1)
          .maybeSingle();

        if (!sourceColumnExists) {
          await log(supabase, 'validation', 'VALIDAÇÃO', 'error', 
            `Coluna de origem não encontrada`,
            { config_id: config.id, source_column_id: config.source_column_id }
          );
          skipped++;
          continue;
        }

        const { data: targetColumnExists } = await supabase
          .from('funnel_columns')
          .select('id')
          .eq('id', config.target_column_id)
          .limit(1)
          .maybeSingle();

        if (!targetColumnExists) {
          await log(supabase, 'validation', 'VALIDAÇÃO', 'error', 
            `Coluna de destino não encontrada`,
            { config_id: config.id, target_column_id: config.target_column_id }
          );
          skipped++;
          continue;
        }

        // ✅ NOVO: Verificar race condition usando RPC com lock atômico
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
          console.warn(`[Scheduler] Lock function not available for config ${config.id}, using fallback:`, e);
          lockError = null;
          lockResult = null;
        }

        if (lockError) {
          console.error(`[Scheduler] Lock error for config ${config.id}:`, lockError);
          // Fallback: verificação antiga já feita pelo should_campaign_run
          // Mas vamos verificar novamente para garantir
          const { data: runningRun } = await supabase
            .from('campaign_runs')
            .select('id')
            .eq('campaign_configs.inbox_id', config.inbox_id)
            .eq('status', 'running')
            .limit(1)
            .maybeSingle();
          
          if (runningRun) {
            console.log(`[Scheduler] Config ${config.id}: Instance busy (fallback check)`);
            skipped++;
            continue;
          }
        } else if (lockResult && !lockResult?.can_proceed) {
          console.log(`[Scheduler] Config ${config.id}: ${lockResult?.reason}`);
          skipped++;
          continue;
        }

        // 3. Criar run
        const { data: run, error: runError } = await supabase
          .from('campaign_runs')
          .insert({
            config_id: config.id,
            status: 'running',
            run_date: new Date().toISOString().split('T')[0]
          })
          .select('id')
          .single();

        if (runError) {
          console.error(`[Scheduler] Error creating run:`, runError);
          skipped++;
          continue;
        }

        // Log: Inicialização com provider e horários
        await log(supabase, run.id, 'INICIALIZAÇÃO', 'info', 
          `Campanha iniciada via ${provider.toUpperCase()} (${providerType})`, 
          { 
            config_id: config.id, 
            daily_limit: config.daily_limit, 
            provider, 
            provider_type: providerType,
            start_time: config.start_time,
            end_time: config.end_time
          }
        );

        // 4. Buscar leads elegíveis
        const providerLabel = provider === 'whatsapp' ? 'WhatsApp validado' : provider === 'email' ? 'email válido' : provider;
        await log(supabase, run.id, 'BUSCA_LEADS', 'info', 
          `Buscando até ${config.daily_limit} leads com ${providerLabel}...`
        );

        const { data: leads, error: leadsError } = await supabase
          .rpc('get_campaign_eligible_leads', {
            p_workspace_id: config.workspace_id,
            p_source_column_id: config.source_column_id,
            p_inbox_id: config.inbox_id,
            p_limit: config.daily_limit
          });

        if (leadsError) {
          await log(supabase, run.id, 'ERRO', 'error', 
            `Erro ao buscar leads: ${leadsError.message}`
          );
          await supabase
            .from('campaign_runs')
            .update({ status: 'failed', error_message: leadsError.message })
            .eq('id', run.id);
          skipped++;
          continue;
        }

        if (!leads || leads.length === 0) {
          await log(supabase, run.id, 'BUSCA_LEADS', 'warning', 
            `Nenhum lead elegível encontrado. Para ${provider.toUpperCase()}, os leads precisam ter ${providerLabel}.`
          );
          await supabase
            .from('campaign_runs')
            .update({ status: 'completed', completed_at: new Date().toISOString(), leads_total: 0 })
            .eq('id', run.id);
          skipped++;
          continue;
        }

        await log(supabase, run.id, 'BUSCA_LEADS', 'success', 
          `${leads.length} leads encontrados com ${providerLabel}`,
          { leads_found: leads.length, provider }
        );

        // ✅ NOVO: Validar start_time <= end_time
        if (config.start_time && config.end_time) {
          const startTimeStr = config.start_time.toString();
          const endTimeStr = config.end_time.toString();
          if (startTimeStr > endTimeStr) {
            await log(supabase, run.id, 'VALIDAÇÃO', 'error', 
              `Configuração inválida: start_time (${startTimeStr}) é maior que end_time (${endTimeStr})`,
              { start_time: startTimeStr, end_time: endTimeStr, config_id: config.id }
            );
            await supabase
              .from('campaign_runs')
              .update({ status: 'failed', error_message: `Configuração inválida: start_time > end_time` })
              .eq('id', run.id);
            skipped++;
            continue;
          }
        }

        // 5. CALCULAR HORÁRIOS RESPEITANDO start_time e end_time (considerando timezone)
        const timezone = config.timezone || 'America/Sao_Paulo';
        const now = getCurrentTimeInTimezone(timezone); // ✅ NOVO: Usar timezone
        const today = new Date(now);
        
        // Converter start_time e end_time para Date de hoje (considerando timezone)
        let startTimeToday: Date | null = null;
        if (config.start_time) {
          startTimeToday = timeToDate(config.start_time, today, timezone);
        }
        
        let endTimeToday: Date | null = null;
        if (config.end_time) {
          // ✅ NOVO: Recalcular sempre com data atual para evitar problemas de mudança de dia
          endTimeToday = timeToDate(config.end_time, today, timezone);
          console.log(`[Scheduler] End time today: ${endTimeToday.toISOString()} (timezone: ${timezone})`);
        }
        
        // Determinar horário de início real (maior entre now e start_time)
        // O should_campaign_run já garante que estamos dentro da janela, mas vamos garantir
        const actualStartTime = startTimeToday && startTimeToday > now ? startTimeToday : now;
        
        // Calcular intervalo ideal baseado no tempo disponível
        // ✅ FASE 2: Validar min_interval_seconds antes de usar
        const configuredMinInterval = config.min_interval_seconds;
        if (!configuredMinInterval || configuredMinInterval < 30) {
          await log(supabase, run.id, 'VALIDAÇÃO', 'error', 
            `min_interval_seconds inválido: ${configuredMinInterval}. Deve ser >= 30. Usando valor padrão: 120`,
            { invalid_value: configuredMinInterval, using_default: 120 }
          );
          await supabase
            .from('campaign_runs')
            .update({ status: 'failed', error_message: `min_interval_seconds inválido: ${configuredMinInterval}. Deve ser >= 30` })
            .eq('id', run.id);
          skipped++;
          continue;
        }
        
        // ✅ FASE 2: Validar daily_limit antes de usar
        const dailyLimit = config.daily_limit;
        if (!dailyLimit || dailyLimit < 1 || dailyLimit > 500) {
          await log(supabase, run.id, 'VALIDAÇÃO', 'error', 
            `daily_limit inválido: ${dailyLimit}. Deve estar entre 1 e 500`,
            { invalid_value: dailyLimit }
          );
          await supabase
            .from('campaign_runs')
            .update({ status: 'failed', error_message: `daily_limit inválido: ${dailyLimit}. Deve estar entre 1 e 500` })
            .eq('id', run.id);
          skipped++;
          continue;
        }
        
        let optimalIntervals = { minInterval: configuredMinInterval, maxInterval: configuredMinInterval * 2 };
        
        if (endTimeToday && endTimeToday > actualStartTime) {
          optimalIntervals = calculateOptimalInterval(
            actualStartTime, // ✅ Usar actualStartTime
            endTimeToday,
            leads.length,
            configuredMinInterval
          );
          
          // ✅ NOVO: Validar minInterval <= maxInterval
          if (optimalIntervals.minInterval > optimalIntervals.maxInterval) {
            await log(supabase, run.id, 'ERRO', 'error', 
              `Intervalo inválido calculado: minInterval (${optimalIntervals.minInterval}s) > maxInterval (${optimalIntervals.maxInterval}s)`,
              { min_interval: optimalIntervals.minInterval, max_interval: optimalIntervals.maxInterval }
            );
            await supabase
              .from('campaign_runs')
              .update({ status: 'failed', error_message: `Intervalo inválido: minInterval > maxInterval` })
              .eq('id', run.id);
            skipped++;
            continue;
          }
          
          // ✅ NOVO: Validar intervalo mínimo (mínimo 30 segundos)
          if (optimalIntervals.minInterval < 30) {
            await log(supabase, run.id, 'AVISO', 'warning', 
              `Intervalo mínimo muito baixo (${optimalIntervals.minInterval}s), ajustando para 30s`,
              { original_min: optimalIntervals.minInterval }
            );
            optimalIntervals.minInterval = 30;
            if (optimalIntervals.maxInterval < 30) {
              optimalIntervals.maxInterval = 60; // Pelo menos 1 minuto de range
            }
          }
          
          const availableMinutes = Math.round((endTimeToday.getTime() - actualStartTime.getTime()) / 60000);
          await log(supabase, run.id, 'CÁLCULO_INTERVALO', 'info', 
            `Tempo disponível: ${availableMinutes} min para ${leads.length} leads (${config.start_time || 'agora'} até ${config.end_time || 'sem limite'})`,
            { 
              available_minutes: availableMinutes,
              leads_count: leads.length,
              configured_interval: configuredMinInterval,
              optimal_min: optimalIntervals.minInterval,
              optimal_max: optimalIntervals.maxInterval,
              actual_start_time: actualStartTime.toISOString(),
              respects_start_time: !!startTimeToday,
              timezone: timezone
            }
          );
        }
        
        // Gera schedule com intervalos aleatórios respeitando os limites
        const { schedules, fitsAll, scheduledCount } = generateRandomScheduleWithLimit(
          actualStartTime, // ✅ Usar actualStartTime (maior entre now e start_time)
          leads.length, 
          optimalIntervals.minInterval, 
          optimalIntervals.maxInterval,
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
        
        // Usar apenas os leads que cabem
        const leadsToSchedule = leads.slice(0, scheduledCount);
        
        // Calcular estatísticas para log
        const totalDurationMs = schedules.length > 1 
          ? schedules[schedules.length - 1].getTime() - schedules[0].getTime()
          : 0;
        const totalDurationMin = Math.round(totalDurationMs / 60000);
        const avgIntervalSec = schedules.length > 1 
          ? Math.round(totalDurationMs / (schedules.length - 1) / 1000) 
          : optimalIntervals.minInterval;
        
        await log(supabase, run.id, 'AGENDAMENTO', 'info', 
          `Agendando ${scheduledCount} mensagens (intervalo: ${optimalIntervals.minInterval}s - ${optimalIntervals.maxInterval}s)`,
          { 
            min_interval: optimalIntervals.minInterval, 
            max_interval: optimalIntervals.maxInterval,
            avg_interval: avgIntervalSec,
            total_duration_minutes: totalDurationMin,
            start_time: config.start_time,
            end_time: config.end_time,
            actual_start_time: actualStartTime.toISOString(),
            respects_start_time: !!startTimeToday,
            respects_end_time: !!endTimeToday
          }
        );

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

        // 6. Inserir mensagens
        const { error: insertError } = await supabase
          .from('campaign_messages')
          .insert(messages);

        if (insertError) {
          await log(supabase, run.id, 'ERRO', 'error', 
            `Erro ao inserir mensagens: ${insertError.message}`
          );
          await supabase
            .from('campaign_runs')
            .update({ status: 'failed', error_message: insertError.message })
            .eq('id', run.id);
          skipped++;
          continue;
        }

        // 7. Atualizar run
        await supabase
          .from('campaign_runs')
          .update({ leads_total: scheduledCount })
          .eq('id', run.id);

        // Log cada lead agendado (primeiros 5)
        for (let i = 0; i < Math.min(leadsToSchedule.length, 5); i++) {
          const lead = leadsToSchedule[i];
          const scheduledTime = schedules[i];
          const contactInfo = lead.phone_normalized || lead.email || lead.contact_value;
          const intervalFromPrev = i > 0 
            ? Math.round((schedules[i].getTime() - schedules[i-1].getTime()) / 1000)
            : 0;
          
          await log(supabase, run.id, 'AGENDAMENTO', 'success', 
            `Lead "${lead.client_name}" → ${scheduledTime.toLocaleTimeString('pt-BR')}${i > 0 ? ` (+${intervalFromPrev}s)` : ' (início)'}`,
            { contact: contactInfo, interval_from_prev: intervalFromPrev },
            lead.lead_id
          );
        }
        if (leadsToSchedule.length > 5) {
          await log(supabase, run.id, 'AGENDAMENTO', 'info', 
            `... e mais ${leadsToSchedule.length - 5} leads agendados`
          );
        }

        // Log final com horário de término
        const lastSchedule = schedules[schedules.length - 1];
        await log(supabase, run.id, 'AGENDAMENTO', 'success', 
          `✅ ${messages.length} mensagens agendadas. Término previsto: ${lastSchedule.toLocaleTimeString('pt-BR')}`,
          { 
            first_at: messages[0].scheduled_at, 
            last_at: messages[messages.length - 1].scheduled_at,
            end_time_limit: config.end_time,
            respects_limit: true
          }
        );

        console.log(`[Scheduler] Scheduled ${messages.length} messages for run ${run.id} via ${provider} (ends by ${config.end_time || 'no limit'})`);
        scheduled++;

      } catch (err: any) {
        // ✅ NOVO: Log detalhado de erros
        console.error(`[Scheduler] Error processing config ${config.id}:`, err);
        console.error(`[Scheduler] Error stack:`, err.stack);
        console.error(`[Scheduler] Error details:`, {
          message: err.message,
          name: err.name,
          cause: err.cause,
          config_id: config.id
        });
        
        // Tentar logar no banco se tiver run criado
        try {
          if (run?.id) {
            await log(supabase, run.id, 'ERRO_FATAL', 'error', 
              `Erro fatal ao processar: ${err.message}`,
              { stack: err.stack, name: err.name, cause: err.cause }
            );
            await supabase
              .from('campaign_runs')
              .update({ status: 'failed', error_message: err.message })
              .eq('id', run.id);
          }
        } catch (logError) {
          console.error(`[Scheduler] Failed to log error to database:`, logError);
        }
        
        skipped++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      campaigns_checked: configs.length,
      campaigns_scheduled: scheduled,
      campaigns_skipped: skipped
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    // ✅ NOVO: Log detalhado de erros
    console.error('[Scheduler] Fatal error:', error);
    console.error('[Scheduler] Error stack:', error.stack);
    console.error('[Scheduler] Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
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