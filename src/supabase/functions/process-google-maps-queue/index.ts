// =============================================================================
// EDGE FUNCTION: process-google-maps-queue
// =============================================================================
// Processa mensagens da fila google_maps_queue
// Chamado por Cron a cada 10 segundos
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// -----------------------------------------------------------------------------
// CORS Headers
// -----------------------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// -----------------------------------------------------------------------------
// Criar cliente Supabase
// -----------------------------------------------------------------------------
function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// -----------------------------------------------------------------------------
// Ler mensagens da fila PGMQ
// -----------------------------------------------------------------------------
async function pgmqReadBatch(
  supabase,
  queueName,
  vt = 30,
  qty = 5 // quantidade de mensagens
) {
  try {
    // Usar função RPC personalizada que chama pgmq.read
    const { data, error } = await supabase.rpc('pgmq_read_batch', {
      queue_name: queueName,
      visibility_timeout: vt, // ✅ CORRIGIDO: nome do parâmetro
      qty: qty
    });

    if (error) {
      console.error(`Erro ao ler fila ${queueName}:`, error);
      return [];
    }

    // ✅ CORRIGIDO: data agora é um array JSONB
    return data || [];
  } catch (error) {
    console.error(`Exceção ao ler fila ${queueName}:`, error);
    return [];
  }
}

// -----------------------------------------------------------------------------
// Deletar mensagem da fila PGMQ
// -----------------------------------------------------------------------------
async function pgmqDelete(supabase, queueName, msgId) {
  try {
    // Usar função RPC personalizada que chama pgmq.delete
    const { data, error } = await supabase.rpc('pgmq_delete_msg', {
      queue_name: queueName,
      msg_id: msgId
    });

    if (error) {
      console.error(`Erro ao deletar mensagem ${msgId} da fila ${queueName}:`, error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error(`Exceção ao deletar mensagem ${msgId}:`, error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Handler Principal
// -----------------------------------------------------------------------------
serve(async (req) => {
  // Tratar OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[process-queue] Iniciando processamento da fila google_maps_queue');

    // Criar cliente Supabase
    const supabase = createSupabaseClient();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    // ✅ CORREÇÃO: Usar JWT correto (ignorar variável de ambiente sb_publishable errada)
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjkyNDksImV4cCI6MjA3OTE0NTI0OX0.BoTSbJgFVb2XWNBVOcNv75JAKrwwMlNGJWETQYyMNFg';
    
    console.log('[process-queue] ✅ ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 20) + '...');

    // ---------------------------------------------------------------------
    // PASSO 1: Ler mensagens da fila (lote de 5)
    // ---------------------------------------------------------------------
    const messages = await pgmqReadBatch(
      supabase,
      'google_maps_queue_e4f9d774', // ✅ Corrigido nome da fila
      30,
      5 // processa até 5 páginas em paralelo
    );

    if (messages.length === 0) {
      console.log('[process-queue] Nenhuma mensagem na fila');
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'Fila vazia'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[process-queue] ${messages.length} mensagens encontradas`);

    // ---------------------------------------------------------------------
    // PASSO 2: Processar mensagens em paralelo
    // ---------------------------------------------------------------------
    const results = await Promise.allSettled(
      messages.map(async (msg) => {
        const msgId = msg.msg_id;
        const payload = msg.message;

        console.log(`[process-queue] Processando mensagem ${msgId}:`, payload);

        try {
          // Chamar Edge Function fetch-google-maps
          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/fetch-google-maps`,
            {
              method: 'POST',
              headers: {
                // ✅ CORREÇÃO: Usar ANON_KEY ao invés de SERVICE_ROLE_KEY
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                run_id: payload.run_id,
                page: payload.page,
                search_term: payload.search_term,
                location: payload.location
              })
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `[process-queue] Erro ao processar mensagem ${msgId}:`,
              errorText
            );

            // Não deletar da fila em caso de erro
            // A mensagem ficará visível novamente após o timeout
            return { msgId, success: false, error: errorText };
          }

          const result = await response.json();
          console.log(
            `[process-queue] Mensagem ${msgId} processada com sucesso:`,
            result
          );

          // Deletar mensagem da fila após sucesso
          await pgmqDelete(supabase, 'google_maps_queue_e4f9d774', msgId); // ✅ Corrigido nome da fila

          return { msgId, success: true, result };
        } catch (error) {
          console.error(
            `[process-queue] Exceção ao processar mensagem ${msgId}:`,
            error
          );
          return { msgId, success: false, error: error.message };
        }
      })
    );

    // ---------------------------------------------------------------------
    // PASSO 3: Consolidar resultados
    // ---------------------------------------------------------------------
    const processed = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    const failed = results.filter(
      (r) => r.status === 'rejected' || !r.value.success
    ).length;

    console.log(
      `[process-queue] Processamento concluído: ${processed} sucesso, ${failed} falhas`
    );

    return new Response(
      JSON.stringify({
        success: true,
        total_messages: messages.length,
        processed,
        failed,
        results: results.map((r) =>
          r.status === 'fulfilled' ? r.value : { error: r.reason }
        )
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[process-queue] ❌ Erro fatal:', error);

    return new Response(
      JSON.stringify({
        error: 'Erro interno ao processar fila',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});