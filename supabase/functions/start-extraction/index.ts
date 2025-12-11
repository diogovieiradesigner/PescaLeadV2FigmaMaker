// =============================================================================
// EDGE FUNCTION: start-extraction V4 (FILA UNIVERSAL)
// =============================================================================
// V4: Usa fila única 'google_maps_queue' para todos os workspaces
// O workspace_id vai no payload da mensagem para identificação
// =============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// V4: Fila única para todos os workspaces
const QUEUE_NAME = 'google_maps_queue';

const BRAZILIAN_STATES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapa', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceara', 'DF': 'Distrito Federal', 'ES': 'Espirito Santo',
  'GO': 'Goias', 'MA': 'Maranhao', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Para', 'PB': 'Paraiba', 'PR': 'Parana',
  'PE': 'Pernambuco', 'PI': 'Piaui', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondonia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'Sao Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
};

const STATE_NAME_NORMALIZE: Record<string, string> = {
  'acre': 'Acre', 'alagoas': 'Alagoas', 'amapa': 'Amapa', 'amazonas': 'Amazonas',
  'bahia': 'Bahia', 'ceara': 'Ceara', 'distrito federal': 'Distrito Federal',
  'espirito santo': 'Espirito Santo', 'goias': 'Goias', 'maranhao': 'Maranhao',
  'mato grosso': 'Mato Grosso', 'mato grosso do sul': 'Mato Grosso do Sul',
  'minas gerais': 'Minas Gerais', 'para': 'Para', 'paraiba': 'Paraiba',
  'parana': 'Parana', 'pernambuco': 'Pernambuco', 'piaui': 'Piaui',
  'rio de janeiro': 'Rio de Janeiro', 'rio grande do norte': 'Rio Grande do Norte',
  'rio grande do sul': 'Rio Grande do Sul', 'rondonia': 'Rondonia', 'roraima': 'Roraima',
  'santa catarina': 'Santa Catarina', 'sao paulo': 'Sao Paulo', 'sergipe': 'Sergipe',
  'tocantins': 'Tocantins'
};

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function detectLocationLevel(location: string): 'neighborhood' | 'city' | 'state' {
  const parts = location.split(',').map(p => p.trim());
  
  // Lista de palavras conhecidas que devem ser ignoradas (países, continentes, etc)
  const ignorarPalavras = ['brasil', 'brazil', 'br', 'américa do sul', 'america do sul', 'south america'];
  
  // Filtrar partes que são apenas informação geográfica genérica
  const partesRelevantes = parts.filter(part => {
    const partLower = removeAccents(part.toLowerCase());
    // V20 FIX: Ignorar também "State of ..." que é apenas formatação
    if (partLower.startsWith('state of')) return false;
    return !ignorarPalavras.includes(partLower);
  });
  
  // V20 FIX: Se cidade e estado tem o mesmo nome (ex: "Rio de Janeiro, Rio de Janeiro")
  // devemos detectar como cidade, não bairro
  if (partesRelevantes.length >= 2) {
    const first = removeAccents(partesRelevantes[0].toLowerCase());
    const second = removeAccents(partesRelevantes[1].toLowerCase());
    if (first === second) {
      // Cidade e estado com mesmo nome → é cidade
      return 'city';
    }
  }
  
  // Se após filtrar ainda tem 3+ partes, provavelmente é bairro
  if (partesRelevantes.length >= 3) {
    return 'neighborhood';
  }
  
  // Se tem 2 partes relevantes e a segunda é sigla de estado (2 letras), é cidade
  if (partesRelevantes.length === 2) {
    const secondPart = partesRelevantes[1].toUpperCase();
    if (secondPart.length === 2 && BRAZILIAN_STATES[secondPart]) {
      return 'city';
    }
    // Se segunda parte não é sigla, pode ser estado completo (ex: "Paraíba")
    return 'state';
  }
  
  // Se tem apenas 1 parte relevante, verificar se é estado conhecido
  if (partesRelevantes.length === 1) {
    const partUpper = partesRelevantes[0].toUpperCase();
    const partLower = removeAccents(partesRelevantes[0].toLowerCase());
    if (BRAZILIAN_STATES[partUpper] || STATE_NAME_NORMALIZE[partLower]) {
      return 'state';
    }
    // Se não é estado conhecido, assumir cidade
    return 'city';
  }
  
  // Se não há partes relevantes (apenas palavras ignoradas), tratar como inválido
  // Mas retornar 'city' como fallback seguro
  if (partesRelevantes.length === 0) {
    return 'city'; // Fallback seguro
  }
  
  // Default: cidade
  return 'city';
}

function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function pgmqSend(supabase: any, queueName: string, message: any, delaySeconds = 0) {
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
    console.error(`Exceção ao enviar para fila:`, error);
    return null;
  }
}

async function getLastProcessedPage(supabase: any, workspaceId: string, searchTerm: string, location: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_last_page_for_search', {
      p_workspace_id: workspaceId,
      p_search_term: searchTerm,
      p_location: location
    });
    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return 0;
    }
    return data || 0;
  } catch (err) {
    console.error('Exceção ao buscar histórico:', err);
    return 0;
  }
}

async function createExtractionLog(supabase: any, runId: string, stepNumber: number, stepName: string, level: string, message: string, details: any) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { run_id } = await req.json();
    
    if (!run_id) {
      return new Response(JSON.stringify({ error: 'run_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`\n=== START-EXTRACTION V4 (FILA UNIVERSAL) ===`);
    console.log(`Run ID: ${run_id}`);

    const supabase = createSupabaseClient();

    // PASSO 1: Buscar dados do run e da extração
    const { data: runData, error: runError } = await supabase
      .from('lead_extraction_runs')
      .select(`
        *,
        lead_extractions!inner(
          id, workspace_id, funnel_id, column_id, extraction_name,
          search_term, location, target_quantity,
          require_website, require_phone, require_email,
          min_rating, min_reviews, expand_state_search
        )
      `)
      .eq('id', run_id)
      .single();

    if (runError || !runData) {
      console.error('Erro ao buscar run:', runError);
      return new Response(JSON.stringify({ error: 'Run não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const extraction = runData.lead_extractions;
    const workspaceId = extraction.workspace_id;
    const searchTerm = extraction.search_term;
    const location = extraction.location;
    const targetQuantity = extraction.target_quantity;
    
    console.log(`\n📋 CONFIGURAÇÃO:`);
    console.log(`   Workspace: ${workspaceId}`);
    console.log(`   Busca: "${searchTerm}"`);
    console.log(`   Local: "${location}"`);
    console.log(`   Target: ${targetQuantity} leads`);
    console.log(`   Fila: ${QUEUE_NAME}`);

    // PASSO 2: Consultar histórico de páginas já processadas
    const lastProcessedPage = await getLastProcessedPage(supabase, workspaceId, searchTerm, location);
    
    console.log(`\n📚 HISTÓRICO:`);
    console.log(`   Páginas já processadas para "${searchTerm}" + "${location}": ${lastProcessedPage}`);
    
    // Log estruturado de histórico consultado
    await createExtractionLog(supabase, run_id, 1, 'Inicialização', 'info',
      `📚 Histórico consultado: ${lastProcessedPage} páginas já processadas para "${searchTerm}" + "${location}"`,
      { 
        last_processed_page: lastProcessedPage,
        search_term: searchTerm,
        location: location,
        workspace_id: workspaceId
      }
    );

    // V16 FIX #3: Verificar se histórico mostra que API já esgotou para este termo/localização
    // Se sim e for cidade/estado, marcar para pular busca padrão e ir direto para expansão
    const locationLevel = detectLocationLevel(location);
    const isCityOrState = locationLevel === 'city' || locationLevel === 'state';

    if (isCityOrState) {
      // Verificar histórico de extrações anteriores
      // V16 FIX: Usar ILIKE para ignorar espaços extras no search_term/location
      // Problema: search_term no banco pode ter espaço no final "termo " mas a busca usa "termo"
      const { data: previousRuns } = await supabase
        .from('lead_extraction_runs')
        .select('id, progress_data, status')
        .ilike('search_term', `%${searchTerm.trim()}%`)
        .ilike('location', `%${location.trim()}%`)
        .neq('id', run_id)
        .in('status', ['completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Verificar se alguma extração anterior esgotou a API
      console.log(`[V16] Histórico encontrado: ${previousRuns?.length || 0} extrações anteriores para "${searchTerm.trim()}" + "${location.trim()}"`);
      
      const hasExhaustedHistory = previousRuns?.some(run => {
        const progressData = run.progress_data || {};
        const hasExhausted = progressData.api_exhausted_at_page !== undefined && 
               progressData.api_exhausted_at_page !== null;
        if (hasExhausted) {
          console.log(`[V16] Extração ${run.id} teve API esgotada na página ${progressData.api_exhausted_at_page}`);
        }
        return hasExhausted;
      });
      
      if (hasExhaustedHistory) {
        await createExtractionLog(supabase, run_id, 1, 'Inicialização', 'info',
          `🚀 Histórico detectado: API já esgotou anteriormente para "${searchTerm}" + "${location}" - Pulando busca padrão e indo direto para expansão geolocalizada`,
          { 
            search_term: searchTerm, 
            location, 
            location_level: locationLevel, 
            previous_runs_checked: previousRuns?.length || 0 
          }
        );
        
        // Marcar no progress_data que deve pular busca padrão
        await supabase
          .from('lead_extraction_runs')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
            current_step: 'Iniciando expansão geolocalizada (busca padrão pulada)',
            completed_steps: 1,
            total_steps: 9,
            progress_data: {
              started_at: new Date().toISOString(),
              start_page: 0,
              pages_queued: 0,
              last_page_target: 0,
              api_exhausted: true,
              api_exhausted_at_page: 0,
              skip_standard_search: true, // Flag para indicar que pulou busca padrão
              should_go_direct_to_expansion: true
            }
          })
          .eq('id', run_id);
        
        // Enfileirar uma mensagem especial para iniciar expansão
        // Esta mensagem será processada por fetch-google-maps que detectará skip_standard_search
        const expansionMessage = {
          run_id: run_id,
          page: 1, // Página fictícia para trigger
          search_term: searchTerm,
          location: location,
          workspace_id: workspaceId,
          target_quantity: targetQuantity,
          pages_in_batch: 1,
          is_last_page: true,
          filters: {
            require_website: extraction.require_website || false,
            require_phone: extraction.require_phone || false,
            require_email: extraction.require_email || false,
            min_rating: extraction.min_rating || 0,
            min_reviews: extraction.min_reviews || 0,
            expand_state_search: extraction.expand_state_search || false
          },
          trigger_expansion: true // Flag especial para trigger de expansão
        };

        const msgId = await pgmqSend(supabase, QUEUE_NAME, expansionMessage);
        
        if (msgId) {
          await createExtractionLog(supabase, run_id, 1, 'Inicialização', 'success',
            `✅ Mensagem de expansão enfileirada (msg_id: ${msgId})`,
            { message_id: msgId }
          );
        }
        
        // Não enfileirar páginas padrão - ir direto para expansão
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Pulando busca padrão - indo direto para expansão geolocalizada',
          run_id,
          skipped_standard_search: true,
          location_level: locationLevel
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // PASSO 3: Calcular quantas páginas precisa
    const resultsPerPage = 10;
    const pagesNeeded = Math.ceil(targetQuantity / resultsPerPage);
    const startPage = lastProcessedPage + 1;
    
    console.log(`\n🚦 PLANEJAMENTO:`);
    console.log(`   Páginas necessárias: ${pagesNeeded}`);
    console.log(`   Iniciando da página: ${startPage}`);
    console.log(`   Páginas a buscar: ${startPage} até ${startPage + pagesNeeded - 1}`);

    // PASSO 4: Atualizar status do run para 'running'
    await supabase
      .from('lead_extraction_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        current_step: `Buscando páginas ${startPage} a ${startPage + pagesNeeded - 1} do Google Maps`,
        completed_steps: 1,
        total_steps: 9,
        progress_data: {
          started_at: new Date().toISOString(),
          start_page: startPage,
          pages_queued: pagesNeeded,
          last_page_target: startPage + pagesNeeded - 1
        }
      })
      .eq('id', run_id);

    // PASSO 5: Enfileirar cada página com seu número específico
    let queuedCount = 0;
    const queuedPages: number[] = [];
    
    for (let i = 0; i < pagesNeeded; i++) {
      const pageNumber = startPage + i;
      
      const message = {
        run_id: run_id,
        page: pageNumber,
        search_term: searchTerm,
        location: location,
        workspace_id: workspaceId,  // V4: workspace_id no payload
        target_quantity: targetQuantity,
        pages_in_batch: pagesNeeded,
        is_last_page: i === pagesNeeded - 1,
        filters: {
          require_website: extraction.require_website || false,
          require_phone: extraction.require_phone || false,
          require_email: extraction.require_email || false,
          min_rating: extraction.min_rating || 0,
          min_reviews: extraction.min_reviews || 0,
          expand_state_search: extraction.expand_state_search || false
        }
      };

      console.log(`📤 Enfileirando página ${pageNumber}...`);
      
      // V4: Usa fila universal
      const msgId = await pgmqSend(supabase, QUEUE_NAME, message);
      
      if (msgId) {
        queuedCount++;
        queuedPages.push(pageNumber);
        console.log(`   ✅ Página ${pageNumber} enfileirada (msg_id: ${msgId})`);
      } else {
        console.error(`   ❌ Falha ao enfileirar página ${pageNumber}`);
      }
    }

    console.log(`\n📨 Total enfileirado: ${queuedCount}/${pagesNeeded} páginas`);

    // PASSO 6: Criar log de sucesso
    await createExtractionLog(
      supabase, run_id, 1, 'Inicialização', 'success',
      `V4: Enfileiradas ${queuedCount} páginas (${startPage} a ${startPage + pagesNeeded - 1})`,
      {
        version: 'V4_UNIVERSAL_QUEUE',
        queue_name: QUEUE_NAME,
        workspace_id: workspaceId,
        target_quantity: targetQuantity,
        history_pages: lastProcessedPage,
        start_page: startPage,
        pages_queued: queuedCount,
        queued_pages: queuedPages
      }
    );

    // PASSO 7: Atualizar step atual
    await supabase
      .from('lead_extraction_runs')
      .update({
        current_step: `Processando ${queuedCount} páginas em paralelo`,
        completed_steps: 2
      })
      .eq('id', run_id);

    console.log(`\n✅ START-EXTRACTION V4 CONCLUÍDO!`);

    return new Response(JSON.stringify({
      success: true,
      version: 'V4_UNIVERSAL_QUEUE',
      run_id: run_id,
      queue_name: QUEUE_NAME,
      extraction_name: extraction.extraction_name,
      search_term: searchTerm,
      location: location,
      target_quantity: targetQuantity,
      history: {
        last_processed_page: lastProcessedPage,
        start_page: startPage
      },
      queued: {
        total_pages: queuedCount,
        pages: queuedPages
      },
      message: `Extração iniciada! ${queuedCount} páginas enfileiradas para processamento paralelo.`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno ao iniciar extração',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
