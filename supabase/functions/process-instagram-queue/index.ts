// =============================================================================
// EDGE FUNCTION: process-instagram-queue V1 (PROCESSADOR DE FILA)
// =============================================================================
// Consome mensagens da fila 'instagram_queue' e processa via instagram-discovery
// Implementa:
// - Dead Letter Queue (DLQ) para mensagens com >3 falhas
// - Detecção de runs travados
// - Auto-compensação quando meta não é atingida
// =============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Configuração da fila
const QUEUE_NAME = 'instagram_queue';
const DLQ_NAME = 'instagram_queue_dlq';

// Configurações de processamento
const BATCH_SIZE = 10;              // Mensagens por batch
const VISIBILITY_TIMEOUT = 300;     // 5 minutos (consistente com timeout do enrichment)
const MAX_RETRIES = 3;              // Máximo de tentativas antes de mover para DLQ
const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos para considerar run como travado

function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// =============================================================================
// PGMQ Helper Functions
// =============================================================================

async function pgmqReadBatch(supabase: any, queueName: string, vt: number, qty: number) {
  try {
    const { data, error } = await supabase.rpc('pgmq_read_batch', {
      queue_name: queueName,
      visibility_timeout: vt,
      qty: qty
    });
    if (error) {
      console.error(`[V1] Erro ao ler fila ${queueName}:`, error);
      return [];
    }
    console.log(`[V1] Lidos ${data?.length || 0} mensagens da fila ${queueName}`);
    return data || [];
  } catch (error) {
    console.error(`[V1] Exceção ao ler fila ${queueName}:`, error);
    return [];
  }
}

async function pgmqDelete(supabase: any, queueName: string, msgId: number) {
  try {
    const { data, error } = await supabase.rpc('pgmq_delete_msg', {
      queue_name: queueName,
      msg_id: msgId
    });
    if (error) {
      console.error(`[V1] Erro ao deletar mensagem ${msgId}:`, error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error(`[V1] Exceção ao deletar mensagem ${msgId}:`, error);
    return false;
  }
}

async function pgmqSend(supabase: any, queueName: string, message: any) {
  try {
    const { data, error } = await supabase.rpc('pgmq_send', {
      queue_name: queueName,
      message: message
    });
    if (error) {
      console.error(`[V1] Erro ao enviar mensagem para ${queueName}:`, error);
      return null;
    }
    return data;
  } catch (error) {
    console.error(`[V1] Exceção ao enviar mensagem para ${queueName}:`, error);
    return null;
  }
}

// =============================================================================
// Dead Letter Queue Handler
// =============================================================================

async function moveToDLQ(
  supabase: any,
  msgId: number,
  payload: any,
  readCt: number,
  reason: string,
  errorDetails?: string
) {
  const dlqMessage = {
    original_msg_id: msgId,
    original_payload: payload,
    read_ct: readCt,
    archived_at: new Date().toISOString(),
    reason: reason,
    error_details: errorDetails || null
  };

  const archived = await pgmqSend(supabase, DLQ_NAME, dlqMessage);

  if (archived) {
    console.log(`[V1] Mensagem ${msgId} movida para DLQ (${reason})`);
    await pgmqDelete(supabase, QUEUE_NAME, msgId);
    return true;
  }

  console.error(`[V1] Falha ao mover mensagem ${msgId} para DLQ`);
  return false;
}

// =============================================================================
// Stuck Runs Detection
// =============================================================================

async function detectAndRequeueStuckRuns(supabase: any) {
  const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

  // Buscar runs de Instagram que estão em 'processing'
  const { data: processingRuns, error } = await supabase
    .from('lead_extraction_runs')
    .select('id, status, started_at, target_quantity, created_quantity, niche, location, workspace_id')
    .eq('source', 'instagram')
    .eq('status', 'processing');

  if (error) {
    console.error('[V1] Erro ao buscar runs em processing:', error);
    return { detected: 0, requeued: 0 };
  }

  if (!processingRuns || processingRuns.length === 0) {
    return { detected: 0, requeued: 0 };
  }

  // Para cada run, verificar o último log de atividade
  const stuckRuns: typeof processingRuns = [];

  for (const run of processingRuns) {
    // Buscar o log mais recente deste run
    const { data: lastLog, error: logError } = await supabase
      .from('extraction_logs')
      .select('created_at')
      .eq('run_id', run.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Se não conseguiu buscar log, usar started_at como fallback
    const lastActivity = lastLog?.created_at || run.started_at;

    // Verificar se última atividade foi há mais de 5 minutos
    if (lastActivity && lastActivity < stuckThreshold) {
      stuckRuns.push({ ...run, last_activity: lastActivity });
      console.log(`[V1] Run ${run.id} stuck - última atividade: ${lastActivity}`);
    }
  }

  if (stuckRuns.length === 0) {
    return { detected: 0, requeued: 0 };
  }

  console.log(`[V1] Detectados ${stuckRuns.length} runs travados (de ${processingRuns.length} em processing)`);

  let requeued = 0;
  for (const run of stuckRuns) {
    // Re-enfileirar para processamento
    const message = {
      run_id: run.id,
      workspace_id: run.workspace_id,
      niche: run.niche,
      location: run.location,
      target_quantity: run.target_quantity,
      is_retry: true,
      retry_reason: 'stuck_run_detection'
    };

    const sent = await pgmqSend(supabase, QUEUE_NAME, message);
    if (sent) {
      requeued++;
      console.log(`[V1] Run ${run.id} re-enfileirado`);

      // Log no banco
      await supabase.rpc('create_extraction_log_v2', {
        p_run_id: run.id,
        p_step_number: 99,
        p_step_name: 'stuck_detection',
        p_level: 'warning',
        p_message: 'Run detectado como travado e re-enfileirado',
        p_source: 'instagram',
        p_phase: 'general',
        p_details: {
          last_activity: (run as any).last_activity,
          stuck_threshold: stuckThreshold,
          requeued_at: new Date().toISOString()
        }
      });
    }
  }

  return { detected: stuckRuns.length, requeued };
}

// =============================================================================
// Auto-Compensation
// =============================================================================

interface CompensationQuery {
  query: string;
  variation: string;
}

function generateCompensationQueries(
  niche: string,
  location: string,
  deficit: number
): CompensationQuery[] {
  const queries: CompensationQuery[] = [];

  // Variações de termos de busca para compensação
  const variations = [
    { suffix: ' profissional', variation: 'professional' },
    { suffix: ' serviços', variation: 'services' },
    { suffix: ' atendimento', variation: 'service' },
    { prefix: 'melhor ', variation: 'best' },
    { prefix: 'top ', variation: 'top' },
    { suffix: ' especialista', variation: 'specialist' },
    { suffix: ' consultoria', variation: 'consulting' },
  ];

  // Gerar queries baseadas no déficit
  const queriesNeeded = Math.min(Math.ceil(deficit / 20), variations.length);

  for (let i = 0; i < queriesNeeded; i++) {
    const v = variations[i];
    const query = `site:instagram.com ${v.prefix || ''}${niche}${v.suffix || ''} ${location}`;
    queries.push({ query, variation: v.variation });
  }

  return queries;
}

async function checkAndCompensate(
  supabase: any,
  authHeader: string,
  runId: string
): Promise<{ needed: boolean; deficit: number; compensationSent: number }> {
  // Buscar dados do run
  const { data: run, error } = await supabase
    .from('lead_extraction_runs')
    .select('target_quantity, created_quantity, niche, location, workspace_id, status')
    .eq('id', runId)
    .single();

  if (error || !run) {
    console.error(`[V1] Erro ao buscar run ${runId}:`, error);
    return { needed: false, deficit: 0, compensationSent: 0 };
  }

  // Só compensa se ainda estiver processando ou se acabou de finalizar com déficit
  if (run.status !== 'processing' && run.status !== 'completed') {
    return { needed: false, deficit: 0, compensationSent: 0 };
  }

  const deficit = (run.target_quantity || 0) - (run.created_quantity || 0);

  // Não precisa compensar se atingiu a meta
  if (deficit <= 0) {
    return { needed: false, deficit: 0, compensationSent: 0 };
  }

  // Se déficit é pequeno (<5), não vale a pena compensar
  if (deficit < 5) {
    console.log(`[V1] Déficit de ${deficit} muito pequeno para compensação`);
    return { needed: true, deficit, compensationSent: 0 };
  }

  console.log(`[V1] Run ${runId}: Déficit de ${deficit} leads. Iniciando compensação...`);

  // Gerar queries de compensação
  const compensationQueries = generateCompensationQueries(
    run.niche || '',
    run.location || '',
    deficit
  );

  let compensationSent = 0;

  for (const cq of compensationQueries) {
    const message = {
      run_id: runId,
      workspace_id: run.workspace_id,
      niche: run.niche,
      location: run.location,
      target_quantity: Math.min(deficit, 50), // Max 50 por compensação
      is_compensation: true,
      compensation_query: cq.query,
      compensation_variation: cq.variation
    };

    const sent = await pgmqSend(supabase, QUEUE_NAME, message);
    if (sent) {
      compensationSent++;
    }
  }

  if (compensationSent > 0) {
    // Log de compensação
    await supabase.rpc('create_extraction_log_v2', {
      p_run_id: runId,
      p_step_number: 98,
      p_step_name: 'auto_compensation',
      p_level: 'info',
      p_message: `Compensação iniciada: ${compensationSent} queries adicionais para cobrir déficit de ${deficit}`,
      p_source: 'instagram',
      p_phase: 'discovery',
      p_details: { deficit, queries_sent: compensationSent }
    });
  }

  return { needed: true, deficit, compensationSent };
}

// =============================================================================
// Main Message Processor
// =============================================================================

async function processMessage(
  supabase: any,
  authHeader: string,
  msg: any,
  SUPABASE_URL: string
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const msgId = msg.msg_id;
  const readCt = msg.read_ct || 0;
  const payload = msg.message;

  // Dead Letter Handling - mensagem com >3 falhas
  if (readCt > MAX_RETRIES) {
    console.warn(`[V1] Dead Letter detectada (read_ct: ${readCt}): Msg ${msgId}`);
    await moveToDLQ(supabase, msgId, payload, readCt, 'max_retries_exceeded');
    return { success: false, error: 'Moved to DLQ', skipped: true };
  }

  console.log(`[V1] Processando mensagem ${msgId} (tentativa ${readCt}): run_id=${payload.run_id}`);

  try {
    // Montar payload para instagram-discovery
    const discoveryPayload = {
      run_id: payload.run_id,
      workspace_id: payload.workspace_id,
      niche: payload.niche,
      location: payload.location,
      target_quantity: payload.target_quantity,
      // Flags especiais
      is_compensation: payload.is_compensation || false,
      is_retry: payload.is_retry || false,
      compensation_query: payload.compensation_query || null,
    };

    console.log(`[V1] Chamando instagram-discovery para run ${payload.run_id}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/instagram-discovery`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(discoveryPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[V1] Erro ${response.status} na mensagem ${msgId}:`, errorText);

      // Se erro 4xx (cliente), mover para DLQ imediatamente
      if (response.status >= 400 && response.status < 500) {
        await moveToDLQ(supabase, msgId, payload, readCt, 'client_error', errorText);
        return { success: false, error: errorText, skipped: true };
      }

      // Erro 5xx - deixar na fila para retry
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log(`[V1] Mensagem ${msgId} OK: ${result.profiles_found || 0} perfis encontrados`);

    // Deletar mensagem da fila após sucesso
    await pgmqDelete(supabase, QUEUE_NAME, msgId);

    // Verificar se precisa compensação após sucesso
    if (payload.run_id && !payload.is_compensation) {
      await checkAndCompensate(supabase, authHeader, payload.run_id);
    }

    return { success: true };

  } catch (error: any) {
    console.error(`[V1] Exceção na mensagem ${msgId}:`, error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// Main Handler
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[process-instagram-queue V1] Iniciando - Fila: ${QUEUE_NAME}`);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[V1] Authorization header não encontrado');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createSupabaseClient();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    // 1. Detectar e re-enfileirar runs travados
    const stuckResult = await detectAndRequeueStuckRuns(supabase);
    if (stuckResult.detected > 0) {
      console.log(`[V1] Stuck runs: ${stuckResult.detected} detectados, ${stuckResult.requeued} re-enfileirados`);
    }

    // 2. Ler mensagens da fila
    const messages = await pgmqReadBatch(supabase, QUEUE_NAME, VISIBILITY_TIMEOUT, BATCH_SIZE);

    if (messages.length === 0) {
      console.log('[V1] Fila vazia');
      return new Response(JSON.stringify({
        success: true,
        version: 'V1_INSTAGRAM_QUEUE',
        queue: QUEUE_NAME,
        processed: 0,
        stuck_runs: stuckResult,
        message: 'Fila vazia'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[V1] ${messages.length} mensagens encontradas na fila ${QUEUE_NAME}`);

    // 3. Processar mensagens em paralelo
    const results = await Promise.allSettled(
      messages.map((msg: any) => processMessage(supabase, authHeader, msg, SUPABASE_URL!))
    );

    const processed = results.filter((r: any) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter((r: any) => r.status === 'rejected' || !r.value?.success).length;
    const skipped = results.filter((r: any) => r.status === 'fulfilled' && r.value?.skipped).length;

    console.log(`[V1] Concluído: ${processed} sucesso, ${failed} falhas, ${skipped} movidos para DLQ`);

    return new Response(JSON.stringify({
      success: true,
      version: 'V1_INSTAGRAM_QUEUE',
      queue: QUEUE_NAME,
      total_messages: messages.length,
      processed,
      failed,
      skipped_to_dlq: skipped,
      stuck_runs: stuckResult,
      results: results.map((r: any) => r.status === 'fulfilled' ? r.value : { error: r.reason })
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[V1] Erro fatal:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
