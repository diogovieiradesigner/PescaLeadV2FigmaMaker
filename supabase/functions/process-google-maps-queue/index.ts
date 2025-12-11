// =============================================================================
// EDGE FUNCTION: process-google-maps-queue V28 (FILA UNIVERSAL)
// =============================================================================
// V28: Usa fila única 'google_maps_queue' para todos os workspaces
// =============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// V28: Fila única universal
const QUEUE_NAME = 'google_maps_queue';

function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function pgmqReadBatch(supabase: any, queueName: string, vt = 30, qty = 5) {
  try {
    const { data, error } = await supabase.rpc('pgmq_read_batch', {
      queue_name: queueName,
      visibility_timeout: vt,
      qty: qty
    });
    if (error) {
      console.error(`[V28] Erro ao ler fila ${queueName}:`, error);
      return [];
    }
    console.log(`[V28] Lidos ${data?.length || 0} mensagens da fila ${queueName}`);
    return data || [];
  } catch (error) {
    console.error(`[V28] Exceção ao ler fila ${queueName}:`, error);
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
      console.error(`[V28] Erro ao deletar mensagem ${msgId}:`, error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error(`[V28] Exceção ao deletar mensagem ${msgId}:`, error);
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
      console.error(`[V28] Erro ao enviar mensagem para ${queueName}:`, error);
      return null;
    }
    return data;
  } catch (error) {
    console.error(`[V28] Exceção ao enviar mensagem para ${queueName}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[process-queue V28] Iniciando - Fila: ${QUEUE_NAME}`);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[V28] Authorization header não encontrado');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const supabase = createSupabaseClient();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    // V28: Lê da fila universal
    const messages = await pgmqReadBatch(supabase, QUEUE_NAME, 300, 5);

    if (messages.length === 0) {
      console.log('[V28] Fila vazia');
      return new Response(JSON.stringify({
        success: true,
        version: 'V28_UNIVERSAL',
        queue: QUEUE_NAME,
        processed: 0,
        message: 'Fila vazia'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[V28] ${messages.length} mensagens encontradas na fila ${QUEUE_NAME}`);

    const results = await Promise.allSettled(
      messages.map(async (msg: any) => {
        const msgId = msg.msg_id;
        const readCt = msg.read_ct || 0;
        const payload = msg.message;
        
        // V28: Dead Letter Handling
        // Se mensagem falhou > 3 vezes (read_ct > 3), mover para DLQ
        // read_ct começa em 1 na primeira leitura? PGMQ behavior: sim.
        // Se read_ct > 3, significa que foi lida 4 vezes (1 original + 3 retries)
        if (readCt > 3) {
          console.warn(`[V28] Dead Letter detectada (read_ct: ${readCt}): Msg ${msgId}`);
          
          // Mover para DLQ
          const dlqName = `${QUEUE_NAME}_dlq`;
          const archived = await pgmqSend(supabase, dlqName, {
            original_msg_id: msgId,
            original_payload: payload,
            read_ct: readCt,
            archived_at: new Date().toISOString(),
            reason: 'max_retries_exceeded'
          });
          
          if (archived) {
            console.log(`[V28] Mensagem ${msgId} movida para ${dlqName}`);
            await pgmqDelete(supabase, QUEUE_NAME, msgId);
            return { msgId, success: false, error: 'Moved to DLQ', skipped: true };
          } else {
            console.error(`[V28] Falha ao mover mensagem ${msgId} para DLQ`);
            // Continua processando se não conseguiu mover, ou aborta?
            // Melhor tentar processar uma última vez se não conseguiu arquivar.
          }
        }
        
        console.log(`[V28] Mensagem ${msgId} (tentativa ${readCt}): página ${payload.page}, run_id ${payload.run_id}`);

        try {
          const fetchPayload = {
            run_id: payload.run_id,
            page: payload.page,
            search_term: payload.search_term,
            location: payload.location,
            workspace_id: payload.workspace_id,
            is_last_page: payload.is_last_page,
            filters: payload.filters || {},
            target_quantity: payload.target_quantity,
            pages_in_batch: payload.pages_in_batch,
            is_compensation: payload.is_compensation || false,
            is_filter_compensation: payload.is_filter_compensation || false,
            // V17: Campos de segmentação (sem coordenadas - SerpDev usa apenas location)
            is_segmented: payload.is_segmented || false,
            segment_neighborhood: payload.segment_neighborhood || null,
            segment_location: payload.segment_location || null,
            ai_round: payload.ai_round || 1,
            // V17: Flag de trigger de expansão
            trigger_expansion: payload.trigger_expansion || false,
            skip_standard_search: payload.skip_standard_search || false,
            // V20: Termo de busca base para consistência de histórico
            search_term_base: payload.search_term_base || null
          };

          console.log(`[V28] Chamando fetch-google-maps para página ${payload.page}`);
          
          const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-google-maps`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fetchPayload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[V28] Erro ${response.status} na mensagem ${msgId}:`, errorText);
            return { msgId, success: false, error: errorText };
          }

          const result = await response.json();
          console.log(`[V28] Mensagem ${msgId} OK: página ${payload.page}, criados ${result.results?.created || 0}`);

          // Deletar mensagem da fila após sucesso
          await pgmqDelete(supabase, QUEUE_NAME, msgId);

          return { msgId, success: true, result };
        } catch (error: any) {
          console.error(`[V28] Exceção na mensagem ${msgId}:`, error);
          return { msgId, success: false, error: error.message };
        }
      })
    );

    const processed = results.filter((r: any) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter((r: any) => r.status === 'rejected' || !r.value?.success).length;

    console.log(`[V28] Concluído: ${processed} sucesso, ${failed} falhas`);

    return new Response(JSON.stringify({
      success: true,
      version: 'V28_UNIVERSAL',
      queue: QUEUE_NAME,
      total_messages: messages.length,
      processed,
      failed,
      results: results.map((r: any) => r.status === 'fulfilled' ? r.value : { error: r.reason })
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[V28] Erro fatal:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
