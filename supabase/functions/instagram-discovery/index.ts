// =============================================================================
// EDGE FUNCTION: instagram-discovery (Etapa 1 - Serper.dev)
// =============================================================================
// REFATORADO: Usa tabelas compartilhadas (lead_extraction_runs, extraction_logs)
//
// Responsabilidades:
// 1. Construir queries de busca otimizadas para Instagram
// 2. Chamar Serper.dev para buscar perfis via Google
// 3. Extrair usernames das URLs retornadas
// 4. Deduplicar resultados
// 5. Salvar em instagram_discovery_results
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import {
  extractUsernameFromUrl,
  buildSearchQueries,
  deduplicateByField,
  normalizeUsername,
  buildProfileUrl,
} from '../_shared/instagram-utils.ts';

const ALLOWED_ORIGINS = [
  'https://hub.pescalead.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Configurações
const SERPER_API_URL = 'https://google.serper.dev/search';
const RESULTS_PER_QUERY = 100; // Máximo de resultados por query no Serper
const MAX_QUERIES_PER_RUN = 10; // Máximo de queries diferentes por execução
// Rate limiting simples em memória
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_REQUESTS = 10; // 10 requisições
const RATE_LIMIT_WINDOW_MS = 60000; // por minuto

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Limpa registros expirados
  if (record && now > record.resetAt) {
    rateLimitMap.delete(ip);
  }

  const currentRecord = rateLimitMap.get(ip);

  if (!currentRecord) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (currentRecord.count >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((currentRecord.resetAt - now) / 1000)
    };
  }

  currentRecord.count++;
  return { allowed: true };
}


interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic?: SerperResult[];
  searchParameters?: {
    q: string;
  };
}

interface DiscoveredProfile {
  google_title: string;
  google_link: string;
  google_snippet: string;
  search_query: string;
  search_position: number;
  username: string;
  profile_url: string;
}

function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Valida autenticação do usuário e ownership do workspace
 */
async function validateAuthAndWorkspace(req: Request, supabase: any, workspaceId: string) {
  // Verifica header de autorização
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  // Valida token e obtém usuário
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error('Invalid authentication token');
  }

  // Verifica se usuário pertence ao workspace
  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (memberError || !membership) {
    throw new Error('User does not have access to this workspace');
  }

  return { user, membership };
}

/**
 * Busca chave de API do Serper no vault
 */
async function getSerperApiKey(supabase: any): Promise<string> {
  // A função requer key_index, usar índice 1 como padrão
  const { data, error } = await supabase.rpc('get_serpdev_api_key', { key_index: 1 });
  if (error || !data) {
    console.error('Erro ao buscar API key:', error);
    throw new Error('Não foi possível obter a chave de API do Serper');
  }
  return data;
}

/**
 * Executa busca no Serper.dev
 */
async function searchSerper(
  apiKey: string,
  query: string,
  num = 100
): Promise<SerperResponse> {
  const response = await fetch(SERPER_API_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: Math.min(num, 100),
      gl: 'br', // Brasil
      hl: 'pt-br', // Português
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Serper API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Processa resultados do Serper e extrai perfis do Instagram
 */
function processSerperResults(
  response: SerperResponse,
  query: string
): DiscoveredProfile[] {
  const profiles: DiscoveredProfile[] = [];

  if (!response.organic) {
    return profiles;
  }

  for (const result of response.organic) {
    // Verificar se é um link do Instagram
    if (!result.link.includes('instagram.com')) {
      continue;
    }

    // Extrair username da URL
    const username = extractUsernameFromUrl(result.link);
    if (!username) {
      continue;
    }

    profiles.push({
      google_title: result.title || '',
      google_link: result.link,
      google_snippet: result.snippet || '',
      search_query: query,
      search_position: result.position || 0,
      username: normalizeUsername(username),
      profile_url: buildProfileUrl(username),
    });
  }

  return profiles;
}

/**
 * Cria log de extração na tabela compartilhada
 */
async function createLog(
  supabase: any,
  runId: string,
  stepNumber: number,
  stepName: string,
  phase: string,
  level: string,
  message: string,
  details?: any
) {
  try {
    // Usar tabela compartilhada extraction_logs com source='instagram'
    await supabase.from('extraction_logs').insert({
      run_id: runId,
      step_number: stepNumber,
      step_name: stepName,
      phase,
      level,
      message,
      details,
      source: 'instagram',
    });
  } catch (error) {
    console.error('Erro ao criar log:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  // Rate limiting check
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  const rateLimit = checkRateLimit(clientIP);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests', retryAfter: rateLimit.retryAfter }),
      {
        status: 429,
        headers: {
          ...getCorsHeaders(req),
          'Retry-After': String(rateLimit.retryAfter),
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    const body = await req.json();
    const { run_id, action = 'start' } = body;

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: 'run_id é obrigatório' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // =========================================================================
    // ACTION: start - Iniciar descoberta
    // =========================================================================
    if (action === 'start') {
      console.log(`\n=== INSTAGRAM-DISCOVERY: START ===`);
      console.log(`Run ID: ${run_id}`);

      // Buscar dados do run na tabela compartilhada
      const { data: runData, error: runError } = await supabase
        .from('lead_extraction_runs')
        .select('*')
        .eq('id', run_id)
        .eq('source', 'instagram')
        .single();

      if (runError || !runData) {
        return new Response(
          JSON.stringify({ error: 'Run não encontrado', details: runError }),
          { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }


      // Validar autenticação e ownership do workspace

      try {

        await validateAuthAndWorkspace(req, supabase, runData.workspace_id);

      } catch (authError) {

        console.error('Auth validation failed:', authError);

        return new Response(
          JSON.stringify({ error: String(authError) }),
          { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }

        );

      }


      // Verificar se já está em execução
      if (runData.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Run já está em execução', status: runData.status }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // Para Instagram, niche está no campo 'niche' e location em 'location'
      const niche = runData.niche || runData.search_term?.split(' ')[0] || '';
      const location = runData.location;
      const target_quantity = runData.target_quantity;

      console.log(`Nicho: ${niche}`);
      console.log(`Localização: ${location}`);
      console.log(`Target: ${target_quantity}`);

      // Atualizar status para 'discovering' na tabela compartilhada
      await supabase
        .from('lead_extraction_runs')
        .update({
          status: 'running',
          discovery_status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', run_id);

      await createLog(
        supabase, run_id, 1, 'Inicialização', 'discovery', 'info',
        `Iniciando descoberta: "${niche}" em "${location}" (target: ${target_quantity})`,
        { niche, location, target_quantity }
      );

      // Buscar chave de API do Serper
      let serperApiKey: string;
      try {
        serperApiKey = await getSerperApiKey(supabase);
      } catch (error) {
        await supabase
          .from('lead_extraction_runs')
          .update({
            status: 'failed',
            discovery_status: 'failed',
            error_message: 'Não foi possível obter chave de API do Serper',
          })
          .eq('id', run_id);

        await createLog(
          supabase, run_id, 2, 'API Key', 'discovery', 'error',
          'Falha ao obter chave de API do Serper',
          { error: String(error) }
        );

        return new Response(
          JSON.stringify({ error: 'Falha ao obter API key do Serper' }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // Construir queries de busca
      const queries = buildSearchQueries(niche, location);
      const queriesToExecute = queries.slice(0, MAX_QUERIES_PER_RUN);

      await supabase
        .from('lead_extraction_runs')
        .update({
          discovery_queries_total: queriesToExecute.length,
        })
        .eq('id', run_id);

      await createLog(
        supabase, run_id, 2, 'Queries', 'discovery', 'info',
        `Construídas ${queriesToExecute.length} queries de busca`,
        { queries: queriesToExecute }
      );

      // Executar buscas
      const allProfiles: DiscoveredProfile[] = [];
      let queriesCompleted = 0;

      for (const query of queriesToExecute) {
        console.log(`\n📍 Executando query: "${query}"`);

        try {
          const response = await searchSerper(serperApiKey, query, RESULTS_PER_QUERY);
          const profiles = processSerperResults(response, query);

          console.log(`   └─ Encontrados: ${profiles.length} perfis`);
          allProfiles.push(...profiles);

          queriesCompleted++;

          // Atualizar progresso na tabela compartilhada
          await supabase
            .from('lead_extraction_runs')
            .update({
              discovery_queries_completed: queriesCompleted,
              discovery_profiles_found: allProfiles.length,
            })
            .eq('id', run_id);

          // Pequena pausa entre queries para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (queryError) {
          console.error(`   ❌ Erro na query "${query}":`, queryError);

          await createLog(
            supabase, run_id, 3, 'Query Execution', 'discovery', 'warning',
            `Erro na query: ${query}`,
            { query, error: String(queryError) }
          );
        }
      }

      console.log(`\n📊 Total de perfis encontrados: ${allProfiles.length}`);

      // Deduplicar por username
      const uniqueProfiles = deduplicateByField(allProfiles, 'username');
      console.log(`📊 Perfis únicos após deduplicação: ${uniqueProfiles.length}`);

      // Verificar duplicatas já existentes no staging (de runs anteriores)
      const usernames = uniqueProfiles.map(p => p.username);
      const { data: existingProfiles } = await supabase
        .from('lead_extraction_staging')
        .select('instagram_username')
        .eq('workspace_id', runData.workspace_id)
        .eq('source', 'instagram')
        .in('instagram_username', usernames);

      const existingUsernames = new Set(existingProfiles?.map(p => p.instagram_username) || []);
      const newProfiles = uniqueProfiles.filter(p => !existingUsernames.has(p.username));

      console.log(`📊 Perfis novos (não existem no workspace): ${newProfiles.length}`);

      // Salvar resultados da descoberta
      if (newProfiles.length > 0) {
        const discoveryRecords = newProfiles.map((profile, index) => ({
          run_id: run_id,
          google_title: profile.google_title,
          google_link: profile.google_link,
          google_snippet: profile.google_snippet,
          search_query: profile.search_query,
          search_position: profile.search_position,
          username: profile.username,
          profile_url: profile.profile_url,
          is_valid: true,
          is_duplicate: false,
          sent_to_enrichment: false,
        }));

        // Inserir em batches de 100
        const batchSize = 100;
        for (let i = 0; i < discoveryRecords.length; i += batchSize) {
          const batch = discoveryRecords.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from('instagram_discovery_results')
            .insert(batch);

          if (insertError) {
            console.error(`Erro ao inserir batch ${i / batchSize + 1}:`, insertError);
          }
        }
      }

      // Marcar duplicatas encontradas
      const duplicateProfiles = uniqueProfiles.filter(p => existingUsernames.has(p.username));
      if (duplicateProfiles.length > 0) {
        const duplicateRecords = duplicateProfiles.map(profile => ({
          run_id: run_id,
          google_title: profile.google_title,
          google_link: profile.google_link,
          google_snippet: profile.google_snippet,
          search_query: profile.search_query,
          search_position: profile.search_position,
          username: profile.username,
          profile_url: profile.profile_url,
          is_valid: true,
          is_duplicate: true,
          sent_to_enrichment: false,
        }));

        await supabase.from('instagram_discovery_results').insert(duplicateRecords);
      }

      // Atualizar status final da descoberta na tabela compartilhada
      await supabase
        .from('lead_extraction_runs')
        .update({
          discovery_status: 'completed',
          discovery_profiles_found: allProfiles.length,
          discovery_profiles_unique: newProfiles.length,
          discovery_completed_at: new Date().toISOString(),
        })
        .eq('id', run_id);

      await createLog(
        supabase, run_id, 4, 'Conclusão', 'discovery', 'success',
        `Descoberta concluída: ${newProfiles.length} perfis únicos encontrados`,
        {
          total_found: allProfiles.length,
          unique_profiles: newProfiles.length,
          duplicates_skipped: duplicateProfiles.length,
          queries_executed: queriesCompleted,
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          run_id,
          discovery: {
            queries_executed: queriesCompleted,
            total_found: allProfiles.length,
            unique_profiles: newProfiles.length,
            duplicates_skipped: duplicateProfiles.length,
          },
          message: `Descoberta concluída! ${newProfiles.length} perfis únicos prontos para enriquecimento.`,
        }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION: status - Verificar status da descoberta
    // =========================================================================
    if (action === 'status') {
      const { data: runData, error: runError } = await supabase
        .from('lead_extraction_runs')
        .select(`
          id, status, discovery_status,
          discovery_queries_total, discovery_queries_completed,
          discovery_profiles_found, discovery_profiles_unique,
          started_at, discovery_completed_at
        `)
        .eq('id', run_id)
        .single();

      if (runError || !runData) {
        return new Response(
          JSON.stringify({ error: 'Run não encontrado' }),
          { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }


      // Validar autenticação e ownership do workspace

      try {

        await validateAuthAndWorkspace(req, supabase, runData.workspace_id);

      } catch (authError) {

        console.error('Auth validation failed:', authError);

        return new Response(
          JSON.stringify({ error: String(authError) }),
          { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }

        );

      }


      return new Response(
        JSON.stringify({
          success: true,
          run_id,
          status: runData.status,
          discovery: {
            status: runData.discovery_status,
            queries_total: runData.discovery_queries_total,
            queries_completed: runData.discovery_queries_completed,
            profiles_found: runData.discovery_profiles_found,
            profiles_unique: runData.discovery_profiles_unique,
            started_at: runData.started_at,
            completed_at: runData.discovery_completed_at,
          },
        }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Ação desconhecida: ${action}` }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
