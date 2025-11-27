// =============================================================================
// EDGE FUNCTION: start-extraction V1 (COM PGMQ)
// =============================================================================
// Versão escalável usando PGMQ para enfileirar páginas
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
// Enviar mensagem para fila PGMQ
// -----------------------------------------------------------------------------
async function pgmqSend(supabase, queueName, message, delaySeconds = 0) {
  try {
    const { data, error } = await supabase.rpc('pgmq_send', {
      queue_name: queueName,
      message: message,
      delay_seconds: delaySeconds
    });

    if (error) {
      console.error(`Erro ao enviar para fila ${queueName}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Exceção ao enviar para fila ${queueName}:`, error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Criar log de extração
// -----------------------------------------------------------------------------
async function createExtractionLog(
  supabase,
  runId,
  stepNumber,
  stepName,
  level,
  message,
  details
) {
  try {
    await supabase.from('extraction_logs').insert({
      run_id: runId,
      step_number: stepNumber,
      step_name: stepName,
      level,
      message,
      details
    });
  } catch (error) {
    console.error('Erro ao criar log:', error);
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
    // Parsear body
    const { run_id } = await req.json();

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: 'run_id é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[start-extraction] Iniciando extração para run_id: ${run_id}`);

    // Criar cliente Supabase
    const supabase = createSupabaseClient();

    // ---------------------------------------------------------------------
    // PASSO 1: Buscar dados do run e da extração
    // ---------------------------------------------------------------------
    const { data: runData, error: runError } = await supabase
      .from('lead_extraction_runs')
      .select(`
        *,
        lead_extractions!inner(
          id,
          workspace_id,
          funnel_id,
          column_id,
          extraction_name,
          search_term,
          location,
          target_quantity,
          require_website,
          require_phone,
          require_email,
          min_rating,
          min_reviews,
          expand_state_search
        )
      `)
      .eq('id', run_id)
      .single();

    if (runError || !runData) {
      console.error('[start-extraction] Erro ao buscar run:', runError);
      return new Response(
        JSON.stringify({ error: 'Run não encontrado', details: runError }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const extraction = runData.lead_extractions;

    console.log(`[start-extraction] Extração: ${extraction.extraction_name}`);
    console.log(`[start-extraction] Busca: "${extraction.search_term}"`);
    console.log(`[start-extraction] Localização: "${extraction.location}"`);
    console.log(`[start-extraction] Target: ${extraction.target_quantity} leads`);

    // ---------------------------------------------------------------------
    // PASSO 2: Atualizar status do run para 'running'
    // ---------------------------------------------------------------------
    const { error: updateError } = await supabase
      .from('lead_extraction_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        current_step: 'Enfileirando páginas para busca no Google Maps',
        completed_steps: 1,
        total_steps: 9,
        progress_data: {
          started_at: new Date().toISOString(),
          last_api_key_index: 0
        }
      })
      .eq('id', run_id);

    if (updateError) {
      console.error('[start-extraction] Erro ao atualizar run:', updateError);
    }

    // ---------------------------------------------------------------------
    // PASSO 3: Calcular quantidade inicial de páginas
    // ---------------------------------------------------------------------
    // Serper.dev Places retorna 10 resultados por página
    const resultsPerPage = 10;
    const initialPages = Math.ceil(extraction.target_quantity / resultsPerPage);

    console.log(`[start-extraction] Calculado: ${initialPages} páginas iniciais`);
    console.log(
      `[start-extraction] (${extraction.target_quantity} leads / ${resultsPerPage} por página)`
    );

    // ---------------------------------------------------------------------
    // PASSO 4: Enfileirar páginas na fila google_maps_queue
    // ---------------------------------------------------------------------
    let queuedCount = 0;
    const errors = [];

    for (let page = 1; page <= initialPages; page++) {
      const message = {
        run_id: run_id,
        page: page,
        search_term: extraction.search_term,
        location: extraction.location,
        filters: {
          require_website: extraction.require_website || false,
          require_phone: extraction.require_phone || false,
          require_email: extraction.require_email || false,
          min_rating: extraction.min_rating || null,
          min_reviews: extraction.min_reviews || null
        }
      };

      const msgId = await pgmqSend(supabase, 'google_maps_queue_e4f9d774', message); // ✅ Corrigido nome da fila

      if (msgId) {
        queuedCount++;
      } else {
        errors.push(`Falha ao enfileirar página ${page}`);
      }
    }

    console.log(`[start-extraction] Enfileiradas ${queuedCount}/${initialPages} páginas`);

    if (errors.length > 0) {
      console.warn('[start-extraction] Erros ao enfileirar:', errors);
    }

    // ---------------------------------------------------------------------
    // PASSO 5: Criar log de sucesso
    // ---------------------------------------------------------------------
    await createExtractionLog(
      supabase,
      run_id,
      1,
      'Inicialização',
      'success',
      `Enfileiradas ${queuedCount} páginas para processamento`,
      {
        target_quantity: extraction.target_quantity,
        initial_pages: initialPages,
        queued_pages: queuedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    );

    // ---------------------------------------------------------------------
    // PASSO 6: Atualizar step atual
    // ---------------------------------------------------------------------
    await supabase
      .from('lead_extraction_runs')
      .update({
        current_step: `Processando ${queuedCount} páginas do Google Maps`,
        completed_steps: 2
      })
      .eq('id', run_id);

    // ---------------------------------------------------------------------
    // PASSO 7: Retornar resposta de sucesso
    // ---------------------------------------------------------------------
    const response = {
      success: true,
      run_id: run_id,
      extraction_name: extraction.extraction_name,
      search_term: extraction.search_term,
      location: extraction.location,
      target_quantity: extraction.target_quantity,
      total_pages_queued: queuedCount,
      results_per_page: resultsPerPage,
      estimated_results: queuedCount * resultsPerPage,
      message: `Extração iniciada com sucesso! ${queuedCount} páginas enfileiradas para processamento.`,
      filters: {
        require_website: extraction.require_website,
        require_phone: extraction.require_phone,
        require_email: extraction.require_email,
        min_rating: extraction.min_rating,
        min_reviews: extraction.min_reviews
      }
    };

    console.log('[start-extraction] ✅ Concluído com sucesso!');

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[start-extraction] ❌ Erro fatal:', error);

    return new Response(
      JSON.stringify({
        error: 'Erro interno ao iniciar extração',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});