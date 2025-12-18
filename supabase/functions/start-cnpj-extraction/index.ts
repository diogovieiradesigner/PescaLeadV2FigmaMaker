// =============================================================================
// START-CNPJ-EXTRACTION v1
// Inicia extração de leads via banco CNPJ
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CNPJFilters {
  uf?: string[];
  municipio?: string[];
  cnae?: string[];
  porte?: string[];
  situacao?: string[];
  tipo?: string[];
  capital_social_min?: number;
  capital_social_max?: number;
  simples?: boolean;
  mei?: boolean;
  com_email?: boolean;
  com_telefone?: boolean;
  data_abertura_min?: string;
  data_abertura_max?: string;
  termo?: string;
}

interface RequestBody {
  extraction_id?: string;
  workspace_id: string;
  extraction_name: string;
  filters: CNPJFilters;
  target_quantity: number;
  funnel_id: string;
  column_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('[start-cnpj-extraction] === REQUEST STARTED ===');

    // Validar authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[start-cnpj-extraction] Auth header present');

    // Criar cliente Supabase com service role (bypassa RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[start-cnpj-extraction] Missing env vars:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[start-cnpj-extraction] Env vars OK');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[start-cnpj-extraction] Supabase client created');

    // Parse body
    let body: RequestBody;
    try {
      body = await req.json();
      console.log('[start-cnpj-extraction] Body parsed:', JSON.stringify(body));
    } catch (parseError) {
      console.error('[start-cnpj-extraction] Body parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { workspace_id, extraction_name, filters, target_quantity, funnel_id, column_id } = body;
    console.log('[start-cnpj-extraction] Params extracted');

    // Validações
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!filters || Object.keys(filters).length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one filter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!target_quantity || target_quantity < 1 || target_quantity > 10000) {
      return new Response(
        JSON.stringify({ error: 'target_quantity must be between 1 and 10000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!funnel_id || !column_id) {
      return new Response(
        JSON.stringify({ error: 'funnel_id and column_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[start-cnpj-extraction] Starting extraction for workspace ${workspace_id}`);
    console.log(`[start-cnpj-extraction] Filters:`, JSON.stringify(filters));
    console.log(`[start-cnpj-extraction] Target: ${target_quantity} leads`);

    // 1. Criar ou obter configuração de extração
    let extractionId = body.extraction_id;
    console.log(`[start-cnpj-extraction] extraction_id from body: ${extractionId || 'none'}`);

    if (!extractionId) {
      console.log('[start-cnpj-extraction] Creating new extraction config...');

      const extractionData = {
        workspace_id,
        extraction_name: extraction_name || `CNPJ - ${new Date().toLocaleDateString('pt-BR')}`,
        source: 'cnpj',
        target_quantity,
        funnel_id,
        column_id,
        filters_json: filters,
        is_active: true,
        search_term: `CNPJ: ${filters.uf?.join(',') || 'Brasil'}`,
        location: filters.uf?.join(', ') || 'Brasil',
        extraction_mode: 'manual',
      };
      console.log('[start-cnpj-extraction] Extraction data prepared');

      const { data: extraction, error: extractionError } = await supabase
        .from('lead_extractions')
        .insert(extractionData)
        .select()
        .single();

      if (extractionError) {
        console.error('[start-cnpj-extraction] Error creating extraction:', JSON.stringify(extractionError));
        return new Response(
          JSON.stringify({ error: 'Failed to create extraction', details: extractionError.message || extractionError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!extraction) {
        console.error('[start-cnpj-extraction] No extraction returned');
        return new Response(
          JSON.stringify({ error: 'No extraction returned from insert' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      extractionId = extraction.id;
      console.log(`[start-cnpj-extraction] Created extraction config: ${extractionId}`);
    }

    // 2. Criar run de extração
    console.log('[start-cnpj-extraction] Creating extraction run...');

    const { data: run, error: runError } = await supabase
      .from('lead_extraction_runs')
      .insert({
        extraction_id: extractionId,
        workspace_id,
        source: 'cnpj',
        status: 'running',
        target_quantity,
        found_quantity: 0,
        created_quantity: 0,
        started_at: new Date().toISOString(),
        search_term: `CNPJ: ${filters.uf?.join(',') || 'Brasil'}`,
        location: filters.uf?.join(', ') || 'Brasil',
        funnel_id,
        column_id,
        progress_data: {
          filters_applied: filters,
          funnel_id,
          column_id,
        },
      })
      .select()
      .single();

    if (runError) {
      console.error('[start-cnpj-extraction] Error creating run:', JSON.stringify(runError));
      return new Response(
        JSON.stringify({ error: 'Failed to create run', details: runError.message || runError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!run) {
      console.error('[start-cnpj-extraction] No run returned');
      return new Response(
        JSON.stringify({ error: 'No run returned from insert' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const runId = run.id;
    console.log(`[start-cnpj-extraction] Created run: ${runId}`);

    // 3. Criar log inicial
    await supabase.from('extraction_logs').insert({
      run_id: runId,
      source: 'cnpj',
      step_number: 1,
      step_name: 'start',
      level: 'info',
      message: 'Iniciando extração CNPJ',
      details: {
        filters,
        target_quantity,
        funnel_id,
        column_id,
      },
    });

    // 4. Chamar cnpj-api/search para buscar empresas
    const cnpjApiUrl = `${supabaseUrl}/functions/v1/cnpj-api/search`;

    console.log(`[start-cnpj-extraction] Calling CNPJ API: ${cnpjApiUrl}`);

    const searchResponse = await fetch(cnpjApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey, // Usado pelo gateway E pela função para autenticação interna
        'Authorization': `Bearer ${supabaseServiceKey}`, // Requerido pelo gateway do Supabase
      },
      body: JSON.stringify({
        filters: {
          ...filters,
          // Garantir que situacao ativa seja padrão se não especificado
          situacao: filters.situacao || ['02'],
        },
        limit: target_quantity,
        offset: 0,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[start-cnpj-extraction] CNPJ API error:', errorText);

      // Atualizar run como falha
      await supabase
        .from('lead_extraction_runs')
        .update({
          status: 'failed',
          error_message: `CNPJ API error: ${searchResponse.status}`,
          finished_at: new Date().toISOString(),
        })
        .eq('id', runId);

      await supabase.from('extraction_logs').insert({
        run_id: runId,
        source: 'cnpj',
        step_number: 2,
        step_name: 'cnpj_api_call',
        level: 'error',
        message: 'Erro ao chamar CNPJ API',
        details: { status: searchResponse.status, error: errorText },
      });

      return new Response(
        JSON.stringify({ error: 'CNPJ API error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchResult = await searchResponse.json();

    console.log(`[start-cnpj-extraction] CNPJ API returned ${searchResult.returned} results`);

    // Log do resultado da busca
    await supabase.from('extraction_logs').insert({
      run_id: runId,
      source: 'cnpj',
      step_number: 2,
      step_name: 'cnpj_api_call',
      level: 'success',
      message: `CNPJ API retornou ${searchResult.returned} empresas`,
      details: {
        total_found: searchResult.total,
        returned: searchResult.returned,
        response_time_ms: searchResult.response_time_ms,
      },
    });

    // 5. Inserir resultados em cnpj_extraction_staging
    // NOTA: A API retorna valores já formatados, precisamos mapear corretamente
    const stagingRecords = searchResult.data.map((item: any) => {
      // Converter data_abertura de string "YYYY-MM-DD" para Date ou null
      let dataAbertura = null;
      if (item.data_abertura) {
        // A API retorna no formato "YYYY-MM-DD"
        dataAbertura = item.data_abertura;
      }

      return {
        run_id: runId,
        workspace_id,
        cnpj: item.cnpj,
        razao_social: item.razao_social,
        nome_fantasia: item.nome_fantasia,
        email: item.email,
        telefone: item.telefone,
        uf: item.uf,
        municipio: item.municipio,
        cnae: item.cnae,
        cnae_descricao: item.cnae_descricao,
        porte: item.porte, // Já vem como texto legível da API
        capital_social: item.capital_social, // Já vem como número da API
        situacao: item.situacao, // Já vem como texto legível da API
        data_abertura: dataAbertura,
        tipo: item.tipo, // "MATRIZ" ou "FILIAL"
        simples: item.simples, // boolean
        mei: item.mei, // boolean
        raw_data: item,
        status: 'pending',
        funnel_id,
        column_id,
      };
    });

    if (stagingRecords.length > 0) {
      // Inserir em batches de 100
      const batchSize = 100;
      let insertedCount = 0;
      const insertErrors: any[] = [];

      // Log do primeiro registro para debug
      console.log(`[start-cnpj-extraction] Total records to insert: ${stagingRecords.length}`);
      console.log(`[start-cnpj-extraction] Sample record:`, JSON.stringify(stagingRecords[0], null, 2));

      for (let i = 0; i < stagingRecords.length; i += batchSize) {
        const batch = stagingRecords.slice(i, i + batchSize);
        console.log(`[start-cnpj-extraction] Inserting batch ${i}, size: ${batch.length}`);

        const insertResult = await supabase
          .from('cnpj_extraction_staging')
          .insert(batch)
          .select('id');

        console.log(`[start-cnpj-extraction] Insert result - error: ${JSON.stringify(insertResult.error)}, data length: ${insertResult.data?.length || 0}`);

        if (insertResult.error) {
          console.error(`[start-cnpj-extraction] Error inserting batch ${i}:`, JSON.stringify(insertResult.error));
          insertErrors.push({ batch: i, error: insertResult.error });
        } else if (insertResult.data && insertResult.data.length > 0) {
          insertedCount += insertResult.data.length;
          console.log(`[start-cnpj-extraction] Batch ${i} inserted: ${insertResult.data.length} records`);
        } else {
          console.warn(`[start-cnpj-extraction] Batch ${i}: No error but no data returned. Status: ${insertResult.status}, statusText: ${insertResult.statusText}`);
        }
      }

      console.log(`[start-cnpj-extraction] Final inserted count: ${insertedCount} records to staging`);

      // Log da inserção (incluindo erros se houver)
      await supabase.from('extraction_logs').insert({
        run_id: runId,
        source: 'cnpj',
        step_number: 3,
        step_name: 'staging_insert',
        level: insertedCount > 0 ? 'success' : 'warning',
        message: `${insertedCount} empresas inseridas em staging`,
        details: {
          inserted: insertedCount,
          total: stagingRecords.length,
          errors: insertErrors.length > 0 ? insertErrors : undefined
        },
      });
    }

    // 6. Enfileirar job para migração de leads
    const queueMessage = {
      run_id: runId,
      workspace_id,
      funnel_id,
      column_id,
      batch_size: 50,
      created_at: new Date().toISOString(),
    };

    const { error: queueError } = await supabase.rpc('pgmq_send', {
      queue_name: 'cnpj_extraction_queue',
      message: queueMessage,
    });

    if (queueError) {
      console.error('[start-cnpj-extraction] Error queuing migration:', queueError);
      // Não falhar por causa da fila, já temos os dados em staging
    } else {
      console.log(`[start-cnpj-extraction] Queued migration job for run ${runId}`);
    }

    // 7. Atualizar run com quantidade encontrada
    await supabase
      .from('lead_extraction_runs')
      .update({
        found_quantity: stagingRecords.length,
        progress_data: {
          ...run.progress_data,
          staging_count: stagingRecords.length,
          api_total: searchResult.total,
        },
      })
      .eq('id', runId);

    // 8. Retornar sucesso
    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        extraction_id: extractionId,
        found_quantity: stagingRecords.length,
        total_available: searchResult.total,
        message: `${stagingRecords.length} empresas encontradas e enfileiradas para processamento`,
        response_time_ms: responseTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[start-cnpj-extraction] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
