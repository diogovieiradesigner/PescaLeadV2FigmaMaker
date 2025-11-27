// =============================================================================
// EDGE FUNCTION: fetch-google-maps V2 (COM COMPENSAÇÃO INTELIGENTE)
// =============================================================================
// Melhorias:
// 1. Coleta Global com Filtro Posterior
// 2. Fase Compensatória Inteligente
// 3. Busca Expandida por Estado
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
// Calcular SHA-256 Hash (mais rápido que MD5 no Deno)
// -----------------------------------------------------------------------------
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// -----------------------------------------------------------------------------
// Enviar mensagem para fila PGMQ
// -----------------------------------------------------------------------------
async function pgmqSend(supabase, queueName, message, delaySeconds = 0) {
  try {
    const { error } = await supabase.rpc('pgmq_send', {
      queue_name: queueName,
      msg: message,
      delay_seconds: delaySeconds
    });
    return !error;
  } catch (err) {
    console.error('Erro ao enfileirar:', err);
    return false;
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
  details = {}
) {
  await supabase.from('extraction_logs').insert({
    run_id: runId,
    step_number: stepNumber,
    step_name: stepName,
    level: level,
    message: message,
    details: details
  });
}

// -----------------------------------------------------------------------------
// Buscar chave API do Vault (rotação)
// -----------------------------------------------------------------------------
async function getApiKey(supabase, keyIndex) {
  try {
    const { data, error } = await supabase.rpc('get_serpdev_api_key', {
      key_index: keyIndex
    });

    if (error) {
      console.error(`Erro ao buscar API key ${keyIndex}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Exceção ao buscar API key ${keyIndex}:`, err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Extrair estado da localização (para busca expandida)
// -----------------------------------------------------------------------------
function extractStateFromLocation(locationFormatted) {
  // Padrão: "Cidade, State of Estado, Country"
  // Exemplo: "Joao Pessoa, State of Paraiba, Brazil"
  const parts = locationFormatted.split(', ');

  if (parts.length >= 2) {
    // Remove a cidade (primeiro elemento) e retorna o resto
    return parts.slice(1).join(', ');
  }

  // Se não conseguir extrair, retorna a localização original
  return locationFormatted;
}

// -----------------------------------------------------------------------------
// Validar resultado
// -----------------------------------------------------------------------------
function isValidResult(
  result,
  requireWebsite = false,
  requirePhone = false,
  requireEmail = false,
  minRating = 0,
  minReviews = 0
) {
  // Campos obrigatórios
  const required = ['cid', 'title', 'address', 'latitude', 'longitude'];

  const baseValid = required.every((field) => {
    const value = result[field];
    if (field === 'latitude' || field === 'longitude') {
      return typeof value === 'number' && !isNaN(value);
    }
    return value && typeof value === 'string' && value.trim().length > 0;
  });

  if (!baseValid) return false;

  // Filtro: Website
  if (requireWebsite) {
    const hasWebsite =
      result.website &&
      typeof result.website === 'string' &&
      result.website.trim().length > 0;
    if (!hasWebsite) return false;
  }

  // Filtro: Telefone
  if (requirePhone) {
    const hasPhone =
      result.phoneNumber &&
      typeof result.phoneNumber === 'string' &&
      result.phoneNumber.trim().length > 0;
    if (!hasPhone) return false;
  }

  // Filtro: Email
  if (requireEmail) {
    const hasEmail =
      result.email &&
      typeof result.email === 'string' &&
      result.email.trim().length > 0;
    if (!hasEmail) return false;
  }

  // Filtro: Rating mínimo
  if (minRating > 0) {
    const rating = result.rating || 0;
    if (rating < minRating) return false;
  }

  // Filtro: Reviews mínimas
  if (minReviews > 0) {
    const reviews = result.reviews || 0;
    if (reviews < minReviews) return false;
  }

  return true;
}

// -----------------------------------------------------------------------------
// Buscar 1 página do Google Maps via Serper.dev
// -----------------------------------------------------------------------------
async function fetchGoogleMapsPage(
  searchTerm,
  location,
  page,
  apiKey,
  maxRetries = 3
) {
  const RETRY_DELAY = 3000; // 3 segundos

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[API] Buscando: "${searchTerm}" em "${location}" - Página ${page} - Tentativa ${attempt}/${maxRetries}`
      );

      const response = await fetch('https://google.serper.dev/places', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: searchTerm,
          location: location,
          gl: 'br',
          hl: 'pt-br',
          page: page
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log(`[API] ✅ Página ${page}: ${data.places?.length || 0} resultados`);

      return data;
    } catch (error) {
      console.error(`[API] ❌ Erro na tentativa ${attempt}:`, error.message);

      if (attempt < maxRetries) {
        console.log(`[API] ⏳ Aguardando ${RETRY_DELAY}ms antes de retry...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
}

// -----------------------------------------------------------------------------
// FUNÇÃO PRINCIPAL: Processar extração completa
// -----------------------------------------------------------------------------
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { run_id, page, search_term, location, filters } = await req.json();

    console.log('\n=== PROCESSAMENTO COMPLETO INICIADO ===');
    console.log('Run ID:', run_id);
    console.log('Termo:', search_term);
    console.log('Local:', location);
    console.log('Filtros:', filters);

    const supabase = createSupabaseClient();

    // =========================================================================
    // BUSCAR INFORMAÇÕES DA EXTRAÇÃO E RUN
    // =========================================================================
    const { data: run, error: runError } = await supabase
      .from('lead_extraction_runs')
      .select(`
        *,
        extraction:lead_extractions(*)
      `)
      .eq('id', run_id)
      .single();

    if (runError || !run) {
      throw new Error('Run não encontrado');
    }

    const extraction = run.extraction;
    const targetQuantity = run.target_quantity;
    const expandStateSearch = extraction.expand_state_search || false;

    // Filtros
    const requireWebsite = extraction.require_website || false;
    const requirePhone = extraction.require_phone || false;
    const requireEmail = extraction.require_email || false;
    const minRating = extraction.min_rating || 0;
    const minReviews = extraction.min_reviews || 0;

    console.log('Target:', targetQuantity);
    console.log('Expand State:', expandStateSearch);

    // =========================================================================
    // FASE 1: COLETA GLOBAL (busca todas as páginas necessárias)
    // =========================================================================
    await createExtractionLog(
      supabase,
      run_id,
      3,
      'Google Maps',
      'info',
      'FASE 1: Iniciando coleta global de resultados',
      { target: targetQuantity }
    );

    const allRawResults = [];
    let currentPage = 1;
    const expectedResultsPerPage = 10;
    const initialMaxPages = Math.ceil(targetQuantity / expectedResultsPerPage);
    let consecutiveEmptyPages = 0;
    let keyRotation = 1;

    console.log('\n--- FASE 1: COLETA INICIAL ---');
    console.log(`Páginas estimadas: ${initialMaxPages}`);

    // Busca inicial - apenas a quantidade estimada
    while (
      allRawResults.length < targetQuantity * 1.5 && // 50% margem
      currentPage <= initialMaxPages &&
      consecutiveEmptyPages < 2
    ) {
      // Rotação de chaves API
      const apiKey = await getApiKey(supabase, keyRotation);
      if (!apiKey) {
        throw new Error(`Chave API ${keyRotation} não encontrada`);
      }

      try {
        const pageData = await fetchGoogleMapsPage(
          search_term,
          location,
          currentPage,
          apiKey
        );

        if (pageData.places && pageData.places.length > 0) {
          console.log(`✅ Página ${currentPage}: ${pageData.places.length} lugares`);

          // Adiciona TODOS os resultados (sem filtrar ainda)
          pageData.places.forEach((place) => {
            allRawResults.push({
              ...place,
              _page: currentPage,
              _expandedSearch: false
            });
          });

          consecutiveEmptyPages = 0;
        } else {
          console.log(`⚠️ Página ${currentPage}: vazia`);
          consecutiveEmptyPages++;
        }

        // Rotaciona para próxima chave
        keyRotation = (keyRotation % 17) + 1;
        currentPage++;

        // Delay entre páginas
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Erro na página ${currentPage}:`, error.message);
        // Tenta próxima chave
        keyRotation = (keyRotation % 17) + 1;
      }
    }

    console.log(`\nFASE 1 completa: ${allRawResults.length} resultados coletados`);

    // =========================================================================
    // FASE 2: FILTRO E DEDUPLICAÇÃO
    // =========================================================================
    await createExtractionLog(
      supabase,
      run_id,
      3,
      'Google Maps',
      'info',
      'FASE 2: Aplicando filtros e removendo duplicatas',
      { total_raw: allRawResults.length }
    );

    console.log('\n--- FASE 2: FILTRO E DEDUPLICAÇÃO ---');

    // Buscar leads já existentes neste workspace
    const { data: existingLeads } = await supabase
      .from('lead_extraction_staging')
      .select('deduplication_hash')
      .eq('workspace_id', run.workspace_id);

    const existingHashes = new Set(
      existingLeads?.map((l) => l.deduplication_hash) || []
    );

    const uniqueResults = [];
    const hashMap = new Map();
    let duplicatesFound = 0;
    let filteredNoWebsite = 0;
    let filteredNoPhone = 0;
    let filteredNoEmail = 0;
    let filteredLowRating = 0;
    let filteredFewReviews = 0;

    for (const place of allRawResults) {
      // Validar com filtros
      const isValid = isValidResult(
        place,
        requireWebsite,
        requirePhone,
        requireEmail,
        minRating,
        minReviews
      );

      if (!isValid) {
        // Contar motivo da rejeição
        if (requireWebsite && !place.website) filteredNoWebsite++;
        if (requirePhone && !place.phoneNumber) filteredNoPhone++;
        if (requireEmail && !place.email) filteredNoEmail++;
        if (minRating > 0 && (place.rating || 0) < minRating) filteredLowRating++;
        if (minReviews > 0 && (place.reviews || 0) < minReviews) filteredFewReviews++;
        continue;
      }

      // Calcular hash
      const hashInput = `${place.cid}_${place.title}_${place.address}_${place.latitude}_${place.longitude}`;
      const hash = await sha256(hashInput);

      // Verificar duplicata
      if (existingHashes.has(hash) || hashMap.has(hash)) {
        duplicatesFound++;
        continue;
      }

      // Adicionar aos únicos
      hashMap.set(hash, true);
      uniqueResults.push({
        ...place,
        _hash: hash
      });

      // Parar se já atingiu o target
      if (uniqueResults.length >= targetQuantity) {
        break;
      }
    }

    console.log(`Únicos: ${uniqueResults.length}`);
    console.log(`Duplicatas: ${duplicatesFound}`);
    console.log(`Filtrados website: ${filteredNoWebsite}`);
    console.log(`Filtrados phone: ${filteredNoPhone}`);
    console.log(`Filtrados email: ${filteredNoEmail}`);
    console.log(`Filtrados rating: ${filteredLowRating}`);
    console.log(`Filtrados reviews: ${filteredFewReviews}`);

    // =========================================================================
    // FASE 3: COMPENSAÇÃO INTELIGENTE (se necessário)
    // =========================================================================
    const shortage = targetQuantity - uniqueResults.length;

    if (
      shortage > 0 &&
      (duplicatesFound > 0 || filteredNoWebsite > 0 || filteredNoPhone > 0)
    ) {
      await createExtractionLog(
        supabase,
        run_id,
        3,
        'Google Maps',
        'info',
        `FASE 3: Compensação - faltam ${shortage} leads após ${duplicatesFound} duplicatas e ${
          filteredNoWebsite + filteredNoPhone
        } filtrados`,
        { shortage, duplicates: duplicatesFound }
      );

      console.log('\n--- FASE 3: COMPENSAÇÃO INTELIGENTE ---');
      console.log(`Faltam ${shortage} leads`);
      console.log(`Buscando páginas adicionais...`);

      const estimatedPagesNeeded = Math.ceil(shortage / expectedResultsPerPage);
      let pagesSearched = 0;

      while (
        uniqueResults.length < targetQuantity &&
        pagesSearched < estimatedPagesNeeded * 2 &&
        consecutiveEmptyPages < 2
      ) {
        const apiKey = await getApiKey(supabase, keyRotation);
        if (!apiKey) break;

        try {
          const pageData = await fetchGoogleMapsPage(
            search_term,
            location,
            currentPage,
            apiKey
          );

          if (pageData.places && pageData.places.length > 0) {
            console.log(
              `✅ Página compensatória ${currentPage}: ${pageData.places.length} lugares`
            );

            for (const place of pageData.places) {
              if (
                !isValidResult(
                  place,
                  requireWebsite,
                  requirePhone,
                  requireEmail,
                  minRating,
                  minReviews
                )
              ) {
                continue;
              }

              const hashInput = `${place.cid}_${place.title}_${place.address}_${place.latitude}_${place.longitude}`;
              const hash = await sha256(hashInput);

              if (!existingHashes.has(hash) && !hashMap.has(hash)) {
                hashMap.set(hash, true);
                uniqueResults.push({
                  ...place,
                  _hash: hash,
                  _page: currentPage,
                  _expandedSearch: false
                });

                if (uniqueResults.length >= targetQuantity) break;
              }
            }

            consecutiveEmptyPages = 0;
          } else {
            consecutiveEmptyPages++;
          }

          keyRotation = (keyRotation % 17) + 1;
          currentPage++;
          pagesSearched++;

          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Erro na página compensatória ${currentPage}:`, error.message);
          keyRotation = (keyRotation % 17) + 1;
        }
      }

      console.log(`FASE 3 completa: ${uniqueResults.length}/${targetQuantity} leads`);
    }

    // =========================================================================
    // FASE 4: BUSCA EXPANDIDA (se habilitado e ainda falta)
    // =========================================================================
    const finalShortage = targetQuantity - uniqueResults.length;

    if (finalShortage > 0 && expandStateSearch) {
      await createExtractionLog(
        supabase,
        run_id,
        3,
        'Google Maps',
        'info',
        `FASE 4: Busca expandida por estado - faltam ${finalShortage} leads`,
        { shortage: finalShortage }
      );

      console.log('\n--- FASE 4: BUSCA EXPANDIDA POR ESTADO ---');
      console.log(`Faltam ${finalShortage} leads`);

      const stateLocation = extractStateFromLocation(location);
      console.log(`Expandindo para: ${stateLocation}`);

      let expandedPage = 1;
      const expandedMaxPages = Math.ceil(finalShortage / expectedResultsPerPage) * 2;
      consecutiveEmptyPages = 0;

      while (
        uniqueResults.length < targetQuantity &&
        expandedPage <= expandedMaxPages &&
        consecutiveEmptyPages < 2
      ) {
        const apiKey = await getApiKey(supabase, keyRotation);
        if (!apiKey) break;

        try {
          const pageData = await fetchGoogleMapsPage(
            search_term,
            stateLocation,
            expandedPage,
            apiKey
          );

          if (pageData.places && pageData.places.length > 0) {
            console.log(
              `✅ Página expandida ${expandedPage}: ${pageData.places.length} lugares`
            );

            for (const place of pageData.places) {
              if (
                !isValidResult(
                  place,
                  requireWebsite,
                  requirePhone,
                  requireEmail,
                  minRating,
                  minReviews
                )
              ) {
                continue;
              }

              const hashInput = `${place.cid}_${place.title}_${place.address}_${place.latitude}_${place.longitude}`;
              const hash = await sha256(hashInput);

              if (!existingHashes.has(hash) && !hashMap.has(hash)) {
                hashMap.set(hash, true);
                uniqueResults.push({
                  ...place,
                  _hash: hash,
                  _page: expandedPage,
                  _expandedSearch: true // Marca como vindo de busca expandida
                });

                if (uniqueResults.length >= targetQuantity) break;
              }
            }

            consecutiveEmptyPages = 0;
          } else {
            consecutiveEmptyPages++;
          }

          keyRotation = (keyRotation % 17) + 1;
          expandedPage++;

          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Erro na página expandida ${expandedPage}:`, error.message);
          keyRotation = (keyRotation % 17) + 1;
        }
      }

      console.log(`FASE 4 completa: ${uniqueResults.length}/${targetQuantity} leads`);
    }

    // =========================================================================
    // INSERIR LEADS NO STAGING
    // =========================================================================
    const finalResults = uniqueResults.slice(0, targetQuantity);
    let created = 0;

    console.log(`\n--- INSERINDO ${finalResults.length} LEADS ---`);

    for (const place of finalResults) {
      try {
        const { error } = await supabase.from('lead_extraction_staging').insert({
          extraction_run_id: run_id,
          workspace_id: run.workspace_id,
          client_name: place.title || 'Sem nome',
          company: place.title || null,
          deduplication_hash: place._hash,
          extracted_data: {
            phone: place.phoneNumber || null,
            website: place.website || null,
            address: place.address || null,
            rating: place.rating || null,
            reviews: place.reviews || null,
            category: place.category || place.type || null,
            latitude: place.latitude || null,
            longitude: place.longitude || null,
            cid: place.cid || null,
            place_id: place.place_id || null
          },
          status_extraction: 'google_fetched',
          status_enrichment: 'pending',
          filter_passed: true,
          should_migrate: true
        });

        if (!error) {
          created++;
        }
      } catch (err) {
        console.error('Erro ao inserir lead:', err);
      }
    }

    // =========================================================================
    // ATUALIZAR MÉTRICAS DO RUN
    // =========================================================================
    await supabase.rpc('increment_run_metrics', {
      p_run_id: run_id,
      p_pages: currentPage - 1,
      p_found: allRawResults.length,
      p_created: created,
      p_duplicates: duplicatesFound,
      p_filtered:
        filteredNoWebsite +
        filteredNoPhone +
        filteredNoEmail +
        filteredLowRating +
        filteredFewReviews
    });

    // Log final
    await createExtractionLog(
      supabase,
      run_id,
      3,
      'Google Maps',
      'success',
      `Extração concluída: ${created}/${targetQuantity} leads criados`,
      {
        pages_consumed: currentPage - 1,
        raw_results: allRawResults.length,
        duplicates: duplicatesFound,
        filtered_website: filteredNoWebsite,
        filtered_phone: filteredNoPhone,
        filtered_email: filteredNoEmail,
        filtered_rating: filteredLowRating,
        filtered_reviews: filteredFewReviews,
        created: created
      }
    );

    // Calcular progresso
    const { data: updatedRun } = await supabase
      .from('lead_extraction_runs')
      .select('created_quantity, target_quantity')
      .eq('id', run_id)
      .single();

    const progressPercentage = updatedRun
      ? Math.round((updatedRun.created_quantity / updatedRun.target_quantity) * 100)
      : 0;

    const needsMorePages = updatedRun
      ? updatedRun.created_quantity < updatedRun.target_quantity
      : false;

    console.log('\n=== PROCESSAMENTO COMPLETO FINALIZADO ===');
    console.log(`Criados: ${created}/${targetQuantity} (${progressPercentage}%)`);
    console.log(`Needs more: ${needsMorePages}`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: run_id,
        found: allRawResults.length,
        created: created,
        duplicates: duplicatesFound,
        filtered:
          filteredNoWebsite +
          filteredNoPhone +
          filteredNoEmail +
          filteredLowRating +
          filteredFewReviews,
        valid_leads_total: updatedRun?.created_quantity || created,
        target: targetQuantity,
        needs_more_pages: needsMorePages,
        progress_percentage: progressPercentage,
        phases_executed: {
          phase1_collection: true,
          phase2_filter: true,
          phase3_compensation: shortage > 0,
          phase4_expanded: finalShortage > 0 && expandStateSearch
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('ERRO:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
