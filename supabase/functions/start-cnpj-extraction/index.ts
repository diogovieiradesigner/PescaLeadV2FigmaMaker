// =============================================================================
// START-CNPJ-EXTRACTION v2 - CORRIGIDO (Queue-Based Architecture)
// Inicia extração de leads via banco CNPJ usando filas para processamento assíncrono
// Corrigido para tratar filtros de situação cadastral inadequados automaticamente
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

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

    // =========================================================================
    // GERAR NOME DA EXTRAÇÃO PERSONALIZADO
    // =========================================================================
    
    const generateExtractionName = (filters: CNPJFilters, fallbackName?: string): string => {
      // Se já temos um nome do frontend, usar ele
      if (fallbackName && fallbackName !== `CNPJ - ${new Date().toLocaleDateString('pt-BR')}`) {
        return fallbackName;
      }
      
      const parts: string[] = [];
      
      // Adicionar localização
      if (filters.uf && filters.uf.length > 0) {
        parts.push(filters.uf.join(', '));
      } else {
        parts.push('Brasil');
      }
      
      // Adicionar município, se disponível
      if (filters.municipio && filters.municipio.length > 0) {
        parts.push(filters.municipio.join(', '));
      }
      
      // Adicionar CNAE, se disponível
      if (filters.cnae && filters.cnae.length > 0) {
        const cnaeStr = filters.cnae.slice(0, 2).join(', ');
        parts.push(`CNAE: ${cnaeStr}${filters.cnae.length > 2 ? '...' : ''}`);
      }
      
      // Adicionar termo de busca, se disponível
      if (filters.termo && filters.termo.trim()) {
        parts.push(`Termo: ${filters.termo.trim()}`);
      }
      
      // Adicionar data/hora
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      parts.push(`${dateStr} ${timeStr}`);
      
      return parts.length > 0 ? `${parts.join(' | ')}` : `${dateStr}`;
    };
    
    const customExtractionName = generateExtractionName(filters, extraction_name);
    console.log(`[start-cnpj-extraction] Generated custom extraction name: ${customExtractionName}`);

    // =========================================================================
    // PAGINAÇÃO E CONTINUIDADE
    // =========================================================================
    
    // 1. Calcular hash dos filtros para identificar buscas repetidas
    // Função para ordenar chaves do objeto recursivamente para garantir determinismo
    const sortObjectKeys = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
      }
      return Object.keys(obj)
        .sort()
        .reduce((result: any, key) => {
          result[key] = sortObjectKeys(obj[key]);
          return result;
        }, {});
    };

    const filtersString = JSON.stringify(sortObjectKeys(filters));
    const filtersHashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(filtersString)
    );
    const filtersHash = Array.from(new Uint8Array(filtersHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
      
    console.log(`[start-cnpj-extraction] Filters hash: ${filtersHash}`);

    // 2. Obter progresso atual (offset)
    let currentOffset = 0;
    
    try {
      const { data: progressData, error: progressError } = await supabase.rpc('get_or_create_cnpj_search_progress', {
        p_workspace_id: workspace_id,
        p_filters: filters,
        p_filters_hash: filtersHash
      });

      if (progressError) {
        console.error('[start-cnpj-extraction] Error getting search progress:', progressError);
        // Continuar com offset 0 em caso de erro
      } else if (progressData && progressData.length > 0) {
        currentOffset = progressData[0].current_offset || 0;
        console.log(`[start-cnpj-extraction] Resuming search from offset ${currentOffset}`);
        
        // Log de debug para o usuário ver
        await supabase.from('extraction_logs').insert({
          run_id: 'system', // Placeholder pois run_id ainda não existe
          source: 'cnpj',
          step_number: 0,
          step_name: 'progress_check',
          level: 'info',
          message: `Continuando extração anterior a partir do registro ${currentOffset}`,
          details: { filters_hash: filtersHash, offset: currentOffset }
        });
      }
    } catch (e) {
      console.error('[start-cnpj-extraction] Exception getting search progress:', e);
      await supabase.from('extraction_logs').insert({
          run_id: 'system',
          source: 'cnpj',
          step_number: 0,
          step_name: 'progress_error',
          level: 'warning',
          message: `Erro ao verificar progresso anterior: ${e}`,
          details: { error: String(e) }
        });
    }

    // 3. Criar ou obter configuração de extração
    let extractionId = body.extraction_id;
    console.log(`[start-cnpj-extraction] extraction_id from body: ${extractionId || 'none'}`);

    if (!extractionId) {
      console.log('[start-cnpj-extraction] Creating new extraction config...');

      const extractionData = {
        workspace_id,
        extraction_name: customExtractionName,
        source: 'cnpj',
        target_quantity,
        funnel_id,
        column_id,
        filters_json: filters,
        is_active: true,
        search_term: customExtractionName,
        location: customExtractionName,
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
        search_term: customExtractionName,
        location: customExtractionName,
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

    console.log(`[start-cnpj-extraction] Calling CNPJ API: ${cnpjApiUrl} (Offset: ${currentOffset})`);

    // ✅ CORREÇÃO APLICADA: Headers para autenticação interna
    const searchResponse = await fetch(cnpjApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        // Headers para identificar como chamada interna do Supabase
        'x-supabase-function-name': 'start-cnpj-extraction',
        'x-supabase-egress-source': 'edge-function',
      },
      body: JSON.stringify({
        filters: {
          ...filters,
          // Verificar e corrigir filtros de situação cadastral inadequados
          situacao: (() => {
            // Se nenhum filtro de situação foi fornecido, usar ['02'] como padrão
            if (!filters.situacao) {
              console.log('[start-cnpj-extraction] No situacao filter provided, using default ["02"]');
              return ['02'];
            }
            
            // Se os filtros forem exatamente ["03", "04", "08"] (empresas inativas), substituir por ["02"]
            const inactiveSituations = ['03', '04', '08'];
            const isOnlyInactive = filters.situacao.length > 0 &&
              filters.situacao.every(s => inactiveSituations.includes(s)) &&
              filters.situacao.length === inactiveSituations.length;
              
            if (isOnlyInactive) {
              console.log('[start-cnpj-extraction] Inactive situacao filters detected ["03", "04", "08"], replacing with active ["02"]');
              return ['02'];
            }
            
            // Caso contrário, usar os filtros fornecidos
            console.log(`[start-cnpj-extraction] Using provided situacao filters: ${JSON.stringify(filters.situacao)}`);
            return filters.situacao;
          })(),
        },
        limit: target_quantity,
        offset: currentOffset, // Usar offset recuperado do progresso
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
        JSON.stringify({
          error: 'CNPJ API error',
          details: errorText,
          message: `Erro na API CNPJ: ${searchResponse.status} - ${errorText}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchResult = await searchResponse.json();

    console.log(`[start-cnpj-extraction] CNPJ API returned ${searchResult.returned} results`);

    // Verificar se houve erro na resposta da API
    if (!searchResult.success) {
      console.error('[start-cnpj-extraction] CNPJ API returned error:', searchResult.error);
      
      // Atualizar run como falha
      await supabase
        .from('lead_extraction_runs')
        .update({
          status: 'failed',
          error_message: `CNPJ API error: ${searchResult.error}`,
          finished_at: new Date().toISOString(),
        })
        .eq('id', runId);

      await supabase.from('extraction_logs').insert({
        run_id: runId,
        source: 'cnpj',
        step_number: 2,
        step_name: 'cnpj_api_call',
        level: 'error',
        message: 'Erro na resposta da CNPJ API',
        details: { error: searchResult.error, debug: searchResult.debug },
      });

      return new Response(
        JSON.stringify({
          error: 'CNPJ API error',
          details: searchResult.error,
          message: `Erro na API CNPJ: ${searchResult.error}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log do resultado da busca com diferenciação de tipos de resposta
    if (searchResult.returned === 0) {
      // Resultado vazio - não há registros para os filtros aplicados
      console.log(`[start-cnpj-extraction] CNPJ API returned empty result (no records found)`);
      
      await supabase.from('extraction_logs').insert({
        run_id: runId,
        source: 'cnpj',
        step_number: 2,
        step_name: 'cnpj_api_call',
        level: 'warning',
        message: 'Nenhum registro encontrado para os filtros aplicados',
        details: {
          total_found: searchResult.total,
          returned: searchResult.returned,
          filters_applied: searchResult.filters_applied,
        },
      });
    } else {
      // Resultado válido com dados
      console.log(`[start-cnpj-extraction] CNPJ API returned ${searchResult.returned} valid results`);
      
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
    }

    // 5. Inserir resultados em cnpj_extraction_staging
    // NOTA: A API retorna valores já formatados, precisamos mapear corretamente
    // Importar funções de formatação
    const { formatCNPJ, formatPhoneToBrazilian, formatDateToDDMMYYYY, formatCurrencyBRL } = await import('../_shared/cnpj-formatters.ts');
    
    const stagingRecords = searchResult.data.map((item: any) => {
      // Formatar data_abertura para o formato DD/MM/YYYY
      const dataAbertura = item.data_abertura ? formatDateToDDMMYYYY(item.data_abertura) : null;

      // Formatar capital social como número para armazenamento, mas manter formatação para exibição
      const capitalSocialNumerico = item.capital_social !== null ? item.capital_social : null;
      const capitalSocialFormatado = item.capital_social !== null ? formatCurrencyBRL(item.capital_social) : null;

      return {
        run_id: runId,
        workspace_id,
        cnpj: formatCNPJ(item.cnpj), // Formatar CNPJ
        razao_social: item.razao_social,
        nome_fantasia: item.nome_fantasia,
        email: item.email,
        telefone: formatPhoneToBrazilian(item.telefone), // Formatar telefone
        uf: item.uf,
        municipio: item.municipio,
        cnae: item.cnae,
        cnae_descricao: item.cnae_descricao,
        porte: item.porte, // Já vem como texto legível da API
        capital_social: capitalSocialNumerico, // Armazenar valor numérico para cálculos
        capital_social_formatado: capitalSocialFormatado, // Armazenar valor formatado para exibição
        situacao: item.situacao, // Já vem como texto legível da API (após correção de filtros)
        data_abertura: dataAbertura, // Data formatada
        tipo: item.tipo, // "MATRIZ" ou "FILIAL"
        simples: item.simples, // boolean
        mei: item.mei, // boolean
        raw_data: item,
        status: 'pending',
        funnel_id,
        column_id,
      };
    });

    // Processar registros mesmo quando não há dados (para atualizar progresso)
    const batchSize = 100;
    let insertedCount = 0;
    const insertErrors: any[] = [];

    // Log do total de registros para processar
    console.log(`[start-cnpj-extraction] Total records to process: ${stagingRecords.length}`);

    if (stagingRecords.length > 0) {
      // Log do primeiro registro para debug
      console.log(`[start-cnpj-extraction] Sample record:`, JSON.stringify(stagingRecords[0], null, 2));

      // Inserir em batches de 100
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
    } else {
      console.log(`[start-cnpj-extraction] No records to insert - empty result from CNPJ API`);
    }

    // Log da inserção (incluindo erros se houver)
    await supabase.from('extraction_logs').insert({
      run_id: runId,
      source: 'cnpj',
      step_number: 3,
      step_name: 'staging_insert',
      level: insertedCount > 0 ? 'success' : (stagingRecords.length === 0 ? 'info' : 'warning'),
      message: stagingRecords.length === 0
        ? 'Nenhum registro encontrado para inserção'
        : `${insertedCount} empresas inseridas em staging`,
      details: {
        inserted: insertedCount,
        total: stagingRecords.length,
        errors: insertErrors.length > 0 ? insertErrors : undefined
      },
    });

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
          start_offset: currentOffset, // Salvar onde começou para referência
        },
      })
      .eq('id', runId);

    // 8. Atualizar progresso da busca (preparar para próxima execução)
    // Atualizar progresso mesmo quando não há registros para manter continuidade
    try {
      await supabase.rpc('update_cnpj_search_progress', {
        p_workspace_id: workspace_id,
        p_filters_hash: filtersHash,
        p_items_count: stagingRecords.length
      });
      console.log(`[start-cnpj-extraction] Updated search progress: +${stagingRecords.length} items (new offset: ${currentOffset + stagingRecords.length})`);
      
      // Log de sucesso do progresso
      await supabase.from('extraction_logs').insert({
        run_id: runId,
        source: 'cnpj',
        step_number: 9,
        step_name: 'progress_update',
        level: stagingRecords.length > 0 ? 'info' : 'warning',
        message: stagingRecords.length > 0
          ? `Progresso salvo: Próxima busca iniciará no registro ${currentOffset + stagingRecords.length}`
          : `Busca concluída: Nenhum registro encontrado para os filtros aplicados`,
        details: {
          previous_offset: currentOffset,
          added: stagingRecords.length,
          new_offset: currentOffset + stagingRecords.length,
          filters_hash: filtersHash,
          total_available: searchResult.total
        }
      });
      
    } catch (e) {
      console.error('[start-cnpj-extraction] Error updating search progress:', e);
      await supabase.from('extraction_logs').insert({
        run_id: runId,
        source: 'cnpj',
        step_number: 9,
        step_name: 'progress_update_error',
        level: 'warning',
        message: `Erro ao salvar progresso da busca`,
        details: { error: String(e) }
      });
    }

    // 9. Retornar sucesso com mensagem mais específica
    const responseTime = Date.now() - startTime;

    // Mensagem personalizada baseada no resultado
    let message: string;
    if (stagingRecords.length === 0) {
      if (searchResult.total === 0) {
        message = 'Nenhum registro encontrado para os filtros aplicados.';
      } else {
        message = 'Nenhum registro novo encontrado para os filtros aplicados (busca já concluída anteriormente).';
      }
    } else {
      message = `${stagingRecords.length} empresas encontradas e enfileiradas para processamento.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        extraction_id: extractionId,
        found_quantity: stagingRecords.length,
        total_available: searchResult.total,
        message,
        response_time_ms: responseTime,
        status: stagingRecords.length === 0 ? 'no_results' : 'success'
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