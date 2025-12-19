// =============================================================================
// EDGE FUNCTION: instagram-discovery V2 (Etapa 1 - Serper.dev + Expansão por IA)
// =============================================================================
// REFATORADO: Usa tabelas compartilhadas (lead_extraction_runs, extraction_logs)
//
// V2 Melhorias:
// 1. ✅ Expansão automática por bairros usando IA quando páginas esgotam
// 2. ✅ NUNCA altera o termo de busca - apenas localização
// 3. ✅ Detecta nível de localização (bairro/cidade/estado)
// 4. ✅ Bairro = NÃO expande, Cidade/Estado = USA IA
//
// Responsabilidades:
// 1. Construir queries de busca otimizadas para Instagram
// 2. Chamar Serper.dev para buscar perfis via Google
// 3. Extrair usernames das URLs retornadas
// 4. Deduplicar resultados
// 5. Salvar em instagram_discovery_results
// 6. [V2] Expandir busca por bairros via IA quando target não atingido
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import {
  extractUsernameFromUrl,
  buildSearchQueries,
  deduplicateByField,
  normalizeUsername,
  buildProfileUrl,
  generateProfileHash,
  sha256,
} from '../_shared/instagram-utils.ts';

// V2: Importar funções de expansão por localização
import {
  detectLocationLevel,
  callAIWithRetry,
  validateAndFilterAILocations,
  parseLocation,
  buildAIPrompt,
  normalizeLocationForSerper,
  AILocationConfig,
  AILocationResponse,
} from '../_shared/location-expansion.ts';

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
const RESULTS_PER_PAGE = 10; // Serper retorna 10 resultados por página
const MAX_PAGES_PER_QUERY = 10; // Máximo de páginas por query (100 resultados)
const MAX_QUERIES_PER_RUN = 10; // Máximo de queries diferentes por execução

// Loop configuration - continua buscando até atingir target ou esgotar
const MAX_LOOP_ITERATIONS = 20; // Máximo de iterações do loop (safety limit)
const EMPTY_ROUNDS_TO_STOP = 3; // Para após N rodadas consecutivas sem novos perfis

// Retry configuration (copiado do Google Maps)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000; // 3 segundos base, com backoff exponencial

// API Key rotation (mesmo padrão do Google Maps)
const TOTAL_API_KEYS = 15;

// V2: Configuração de expansão por IA
const MAX_AI_ROUNDS = 3; // Máximo de rodadas de IA
const MAX_PAGES_PER_NEIGHBORHOOD = 3; // Máximo de páginas por bairro

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
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (memberError || !membership) {
    throw new Error('User does not have access to this workspace');
  }

  return { user, membership };
}

/**
 * Busca chave de API do Serper no vault com roteamento
 * Padrão copiado do Google Maps para distribuir carga entre chaves
 */
async function getSerperApiKey(supabase: any, keyIndex: number): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_serpdev_api_key', { key_index: keyIndex });
    if (error || !data) {
      console.warn(`[API] Key #${keyIndex} não disponível:`, error?.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`[API] Erro ao buscar key #${keyIndex}:`, err);
    return null;
  }
}

/**
 * Obtém uma chave de API válida com fallback para outras chaves
 * Mesmo padrão do Google Maps
 */
async function getSerperApiKeyWithFallback(supabase: any, preferredKeyIndex: number): Promise<{ apiKey: string; keyIndex: number }> {
  // Tentar chave preferida primeiro
  let apiKey = await getSerperApiKey(supabase, preferredKeyIndex);
  if (apiKey) {
    console.log(`[API] ✅ Usando key #${preferredKeyIndex}`);
    return { apiKey, keyIndex: preferredKeyIndex };
  }

  // Fallback: tentar outras chaves
  console.warn(`[API] Key #${preferredKeyIndex} não encontrada, tentando outras keys...`);
  for (let i = 1; i <= TOTAL_API_KEYS; i++) {
    if (i === preferredKeyIndex) continue; // Já tentamos essa
    const fallbackKey = await getSerperApiKey(supabase, i);
    if (fallbackKey) {
      console.log(`[API] ✅ Usando key #${i} como fallback`);
      return { apiKey: fallbackKey, keyIndex: i };
    }
  }

  throw new Error(`Nenhuma API key do Serper disponível (tentou ${TOTAL_API_KEYS} keys)`);
}

/**
 * Extrai a cidade da localização formatada
 * Ex: "Sao Paulo, State of Sao Paulo, Brazil" => "São Paulo"
 * Ex: "Joao Pessoa, State of Paraiba, Brazil" => "João Pessoa"
 */
function extractCityFromLocation(location: string): string {
  if (!location) return '';
  const parts = location.split(',').map(p => p.trim());
  // Primeira parte é sempre a cidade
  return parts[0] || '';
}

/**
 * Constrói uma query otimizada para busca de perfis do Instagram
 *
 * Estratégia de query qualificada:
 * 1. Termo de busca + "em [Cidade]" para contexto geográfico forte
 * 2. site:instagram.com para filtrar apenas Instagram
 * 3. Exclusões de URLs que não contêm username extraível:
 *    - /p/CODE (posts avulsos)
 *    - /reel/CODE (reels avulsos)
 *    - /explore/ (página de exploração)
 *    - /stories/ (stories avulsos)
 *
 * PROBLEMA RESOLVIDO: URLs como /p/CODE e /reel/CODE não contêm username,
 * então precisamos excluí-las da busca para focar em URLs de perfil.
 *
 * Exemplos:
 * - Input: "arquitetos", "Sao Paulo, State of Sao Paulo, Brazil"
 * - Output: 'arquitetos "em Sao Paulo" site:instagram.com -inurl:/p/ -inurl:/reel/ -inurl:/explore/'
 */
function buildOptimizedQuery(searchTerm: string, location: string): string {
  const city = extractCityFromLocation(location);
  const term = searchTerm.trim().toLowerCase();

  // Exclusões de paths que não têm username extraível
  // NOTA: Usamos /p/ ao invés de "/p/" pois aspas dentro de query podem causar problemas
  const exclusions = '-inurl:/p/ -inurl:/reel/ -inurl:/explore/ -inurl:/stories/';

  // Query otimizada: termo + "em [Cidade]" + site:instagram.com + exclusões
  // O "em [Cidade]" força o Google a priorizar resultados locais
  const query = city
    ? `${term} "em ${city}" site:instagram.com ${exclusions}`
    : `${term} site:instagram.com ${exclusions}`;

  return query;
}

/**
 * Executa uma requisição ao Serper com retry e backoff exponencial
 * V2: Usa query otimizada com localização no texto + operadores avançados
 */
async function fetchSerperWithRetry(
  apiKey: string,
  searchTerm: string,
  location: string,
  page: number
): Promise<SerperResponse | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`   [Serper] Página ${page}, tentativa ${attempt}/${MAX_RETRIES}...`);

      // V2: Construir query otimizada com localização no texto + operadores
      // Exemplo: 'arquitetos "em São Paulo" site:instagram.com inurl:arquitet'
      const optimizedQuery = buildOptimizedQuery(searchTerm, location);

      const requestBody = {
        q: optimizedQuery,
        location: location,  // Manter location separado também para reforço
        page: page,
        num: RESULTS_PER_PAGE,
        gl: 'br',
        hl: 'pt-br',
      };

      console.log(`   [Serper] Request: q="${requestBody.q}", location="${requestBody.location}", page=${requestBody.page}`);

      const response = await fetch(SERPER_API_URL, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        return await response.json();
      }

      // Erro 500 = API esgotou resultados (não retry)
      if (response.status === 500) {
        console.log(`   [Serper] Página ${page}: Erro 500 - API esgotou resultados`);
        return null;
      }

      // Erro 429 = Rate limit (retry com backoff maior)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '10', 10);
        console.log(`   [Serper] Rate limit! Aguardando ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }

      // Outros erros
      const errorText = await response.text();
      throw new Error(`Serper API error: ${response.status} - ${errorText}`);

    } catch (error) {
      console.error(`   [Serper] Erro na tentativa ${attempt}:`, error);

      if (attempt < MAX_RETRIES) {
        // Backoff exponencial: 3s, 6s, 12s
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`   [Serper] Aguardando ${delay / 1000}s antes de retry...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error(`   [Serper] Falha após ${MAX_RETRIES} tentativas`);
        return null;
      }
    }
  }

  return null;
}

/**
 * Resultado da busca com informações de paginação
 */
interface PaginatedSearchResult {
  response: SerperResponse;
  lastPage: number;
  isExhausted: boolean;
}

/**
 * Executa busca no Serper.dev com paginação e retry
 * CORRIGIDO: Recebe searchTerm e location separados
 *
 * @param searchTerm - Termo de busca (ex: "agência de marketing")
 * @param location - Localização no formato Google Maps (ex: "Sao Paulo, State of Sao Paulo, Brazil")
 * @param startPage - Página inicial (para continuar de onde parou)
 */
async function searchSerperWithPagination(
  apiKey: string,
  searchTerm: string,
  location: string,
  targetResults: number,
  startPage: number = 1
): Promise<PaginatedSearchResult> {
  const allOrganic: SerperResult[] = [];
  const pagesNeeded = Math.ceil(targetResults / RESULTS_PER_PAGE);
  const maxPages = Math.min(pagesNeeded, MAX_PAGES_PER_QUERY);
  let lastPage = startPage - 1;
  let isExhausted = false;

  console.log(`   [Serper] Busca: "${searchTerm}" em "${location}" - ${maxPages} páginas (iniciando na ${startPage})`);

  for (let i = 0; i < maxPages; i++) {
    const page = startPage + i;

    // Limite máximo de páginas do Serper (página 10 = offset 100)
    if (page > 10) {
      console.log(`   [Serper] Página ${page}: Limite máximo do Serper (10 páginas)`);
      isExhausted = true;
      break;
    }

    // Usar função com retry - passa searchTerm e location separados
    const data = await fetchSerperWithRetry(apiKey, searchTerm, location, page);

    // Se retornou null, parar (erro não recuperável ou fim dos resultados)
    if (!data) {
      console.log(`   [Serper] Página ${page}: Parando busca (erro ou sem resultados)`);
      isExhausted = true;
      break;
    }

    if (!data.organic || data.organic.length === 0) {
      console.log(`   [Serper] Página ${page}: 0 resultados - query esgotada`);
      isExhausted = true;
      break;
    }

    console.log(`   [Serper] Página ${page}: ${data.organic.length} resultados`);
    allOrganic.push(...data.organic);
    lastPage = page;

    // Se atingiu página 10, marcar como esgotada (limite do Serper)
    if (page >= 10) {
      console.log(`   [Serper] Página ${page}: Limite máximo do Serper atingido - marcando como esgotada`);
      isExhausted = true;
      break;
    }

    // Se já temos resultados suficientes, parar (mas não marcar como esgotada)
    if (allOrganic.length >= targetResults) {
      console.log(`   [Serper] Alcançado target de ${targetResults} resultados`);
      break;
    }

    // Pequena pausa entre páginas para evitar rate limit
    if (i < maxPages - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log(`   [Serper] Total coletado: ${allOrganic.length} resultados (última página: ${lastPage}, esgotada: ${isExhausted})`);

  return {
    response: {
      organic: allOrganic,
      searchParameters: {
        q: `${searchTerm} site:instagram.com`,
        location: location,
        gl: 'br',
        hl: 'pt-br',
        num: targetResults,
      },
    },
    lastPage,
    isExhausted,
  };
}

/**
 * Processa resultados do Serper e extrai perfis do Instagram
 * ATUALIZADO: Com logs detalhados para debug de extração de usernames
 */
function processSerperResults(
  response: SerperResponse,
  query: string
): DiscoveredProfile[] {
  const profiles: DiscoveredProfile[] = [];

  if (!response.organic) {
    console.log(`   [processSerperResults] response.organic está vazio/undefined`);
    return profiles;
  }

  console.log(`   [processSerperResults] Processando ${response.organic.length} resultados orgânicos...`);

  for (const result of response.organic) {
    // Log cada URL recebida
    console.log(`   [processSerperResults] URL: ${result.link}`);

    // Verificar se é um link do Instagram
    if (!result.link.includes('instagram.com')) {
      console.log(`   [processSerperResults] ⏭️ Ignorado: Não é Instagram`);
      continue;
    }

    // Extrair username da URL
    const username = extractUsernameFromUrl(result.link);

    if (!username) {
      console.log(`   [processSerperResults] ❌ Falha ao extrair username de: ${result.link}`);
      continue;
    }

    console.log(`   [processSerperResults] ✅ Username extraído: ${username}`);

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

  console.log(`   [processSerperResults] Total perfis extraídos: ${profiles.length}`);

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

/**
 * V2: Busca configuração de IA para expansão por localização
 */
async function getAIConfig(supabase: any): Promise<AILocationConfig | null> {
  try {
    const { data, error } = await supabase
      .from('ai_neighborhood_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log('[V2 AI] Configuração de IA não encontrada, usando defaults');
      // Retornar configuração padrão
      return {
        model: 'perplexity/sonar-pro',
        fallback_models: ['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'],
        system_prompt: 'Você é um assistente que conhece bairros e regiões do Brasil. Retorne dados no formato JSON exato solicitado.',
        max_tokens: 2000,
        temperature: 0.3,
        max_retries: 3,
        timeout_seconds: 60,
      };
    }

    return {
      model: data.model || 'perplexity/sonar-pro',
      fallback_models: data.fallback_models || ['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'],
      system_prompt: data.system_prompt || 'Você é um assistente que conhece bairros e regiões do Brasil.',
      user_prompt_city: data.user_prompt_city,
      user_prompt_state: data.user_prompt_state,
      user_prompt_additional: data.user_prompt_additional,
      max_tokens: data.max_tokens || 2000,
      temperature: data.temperature || 0.3,
      max_retries: data.max_retries || 3,
      timeout_seconds: data.timeout_seconds || 60,
      cache_ttl_days: data.cache_ttl_days || 30,
    };
  } catch (error) {
    console.error('[V2 AI] Erro ao buscar configuração de IA:', error);
    return null;
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
      const rawLocation = runData.location;
      const target_quantity = runData.target_quantity;

      // IMPORTANTE: Normalizar localização para o formato do Serper.dev
      // Formato requerido: "Cidade, State of Estado, Brazil"
      // Ex: "Joao Pessoa, State of Paraiba, Brazil"
      const location = normalizeLocationForSerper(rawLocation);

      console.log(`Nicho: ${niche}`);
      console.log(`Localização original: ${rawLocation}`);
      console.log(`Localização normalizada: ${location}`);
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

      // Buscar chave de API do Serper com roteamento (mesmo padrão do Google Maps)
      // Usar hash simples do run_id para distribuir entre as chaves
      const runIdHash = run_id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const preferredKeyIndex = (runIdHash % TOTAL_API_KEYS) + 1;

      let serperApiKey: string;
      let usedKeyIndex: number;
      try {
        const keyResult = await getSerperApiKeyWithFallback(supabase, preferredKeyIndex);
        serperApiKey = keyResult.apiKey;
        usedKeyIndex = keyResult.keyIndex;
        console.log(`[API] Usando key #${usedKeyIndex} (preferida era #${preferredKeyIndex})`);
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
          { error: String(error), tried_keys: TOTAL_API_KEYS }
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
        `Construídas ${queriesToExecute.length} queries de busca (API key #${usedKeyIndex})`,
        { queries: queriesToExecute, api_key_index: usedKeyIndex }
      );

      // =========================================================================
      // PAGINAÇÃO PERSISTENTE: Continuar de onde parou
      // =========================================================================
      const queryHash = await sha256(`${niche.toLowerCase()}_${location.toLowerCase()}`);
      console.log(`\n🔑 Query Hash: ${queryHash}`);

      // Obter ou criar progresso de busca (passando queries para salvar)
      // NOTA: p_queries deve ser um array JSON, não uma string JSON
      const { data: searchProgress, error: searchProgressError } = await supabase.rpc('get_or_create_instagram_search_progress', {
        p_workspace_id: runData.workspace_id,
        p_niche: niche,
        p_location: location,
        p_query_hash: queryHash,
        p_queries: queriesToExecute, // Array direto, não JSON.stringify
      });

      if (searchProgressError) {
        console.error('❌ Erro ao obter/criar progresso de busca:', searchProgressError);
        // Continuar mesmo com erro - usará paginação padrão (página 1)
      }

      // Verificar se busca está totalmente esgotada
      if (searchProgress?.is_fully_exhausted) {
        console.log(`⚠️ Busca "${niche}" em "${location}" está totalmente esgotada`);
        await createLog(
          supabase, run_id, 2, 'Search Exhausted', 'discovery', 'warning',
          `Todas as queries para "${niche}" em "${location}" já foram esgotadas. Resultados podem ser limitados.`,
          { query_hash: queryHash, exhausted_queries: searchProgress.exhausted_queries }
        );
      }

      const lastPageByQuery: Record<string, number> = searchProgress?.last_page_by_query || {};
      const exhaustedQueries: string[] = searchProgress?.exhausted_queries || [];

      console.log(`📊 Progresso anterior: ${Object.keys(lastPageByQuery).length} queries, páginas: ${JSON.stringify(lastPageByQuery)}`);
      console.log(`📊 Queries esgotadas: ${exhaustedQueries.length}`);

      // =========================================================================
      // LOOP DE BUSCA: Continua até atingir target OU esgotar busca
      // =========================================================================
      const resultsPerQuery = Math.ceil(target_quantity / queriesToExecute.length);
      console.log(`\n📊 Target: ${target_quantity} leads, ${queriesToExecute.length} queries, ~${resultsPerQuery} resultados/query`);

      const allProfiles: DiscoveredProfile[] = [];
      let totalPagesConsumed = 0;
      let loopIteration = 0;
      let consecutiveEmptyRounds = 0;
      let totalUniqueFound = 0;

      // Set para tracking de usernames já processados neste run (evita reprocessar)
      const processedUsernames = new Set<string>();

      // Buscar usernames já existentes no workspace (para deduplicação cross-run)
      // IMPORTANTE: Só considera duplicados do MESMO workspace
      const { data: existingEnrichedAll } = await supabase
        .from('instagram_enriched_profiles')
        .select('username')
        .eq('workspace_id', runData.workspace_id);

      // Para instagram_discovery_results, precisamos fazer JOIN com lead_extraction_runs
      // porque a tabela não tem workspace_id diretamente
      const { data: existingDiscoveryAll } = await supabase
        .from('instagram_discovery_results')
        .select('username, run_id, lead_extraction_runs!inner(workspace_id)')
        .neq('run_id', run_id)
        .eq('lead_extraction_runs.workspace_id', runData.workspace_id);

      const existingUsernamesGlobal = new Set([
        ...(existingEnrichedAll?.map(p => p.username) || []),
        ...(existingDiscoveryAll?.map((p: any) => p.username) || []),
      ]);

      console.log(`📊 Usernames já existentes no workspace ${runData.workspace_id}: ${existingUsernamesGlobal.size}`);

      // LOOP PRINCIPAL: Continua buscando até atingir target ou esgotar
      while (loopIteration < MAX_LOOP_ITERATIONS) {
        loopIteration++;
        console.log(`\n🔄 === LOOP ITERAÇÃO ${loopIteration}/${MAX_LOOP_ITERATIONS} ===`);
        console.log(`   Target: ${target_quantity}, Únicos até agora: ${totalUniqueFound}, Rodadas vazias: ${consecutiveEmptyRounds}`);

        // Verificar se já atingiu o target
        if (totalUniqueFound >= target_quantity) {
          console.log(`✅ Target atingido! ${totalUniqueFound} >= ${target_quantity}`);
          await createLog(
            supabase, run_id, 3, 'Loop Complete', 'discovery', 'success',
            `Target atingido na iteração ${loopIteration}: ${totalUniqueFound} perfis únicos`,
            { iteration: loopIteration, unique_found: totalUniqueFound, target: target_quantity }
          );
          break;
        }

        // Verificar se já teve muitas rodadas sem novos perfis
        if (consecutiveEmptyRounds >= EMPTY_ROUNDS_TO_STOP) {
          console.log(`⏹️ Parando: ${consecutiveEmptyRounds} rodadas consecutivas sem novos perfis`);
          await createLog(
            supabase, run_id, 3, 'Loop Complete', 'discovery', 'warning',
            `Busca esgotada após ${loopIteration} iterações: ${consecutiveEmptyRounds} rodadas sem novos perfis`,
            { iteration: loopIteration, empty_rounds: consecutiveEmptyRounds, unique_found: totalUniqueFound }
          );
          break;
        }

        let newProfilesThisRound = 0;
        let allQueriesExhausted = true;

        // Atualizar lista de queries esgotadas (pode ter mudado desde última iteração)
        const { data: currentProgress } = await supabase.rpc('get_or_create_instagram_search_progress', {
          p_workspace_id: runData.workspace_id,
          p_niche: niche,
          p_location: location,
          p_query_hash: queryHash,
          p_queries: queriesToExecute,
        });

        const currentExhaustedQueries: string[] = currentProgress?.exhausted_queries || [];

        for (const query of queriesToExecute) {
          // Pular queries já esgotadas
          if (currentExhaustedQueries.includes(query)) {
            console.log(`   ⏭️ Pulando query esgotada: "${query}"`);
            continue;
          }

          // Obter próxima página para esta query
          const { data: nextPage } = await supabase.rpc('get_next_page_for_instagram_query', {
            p_workspace_id: runData.workspace_id,
            p_query_hash: queryHash,
            p_query: query,
          });

          // Se -1, query está esgotada
          if (nextPage === -1) {
            console.log(`   ⏭️ Query "${query}" marcada como esgotada no banco`);
            continue;
          }

          // IMPORTANTE: Serper SEMPRE começa na página 1, nunca 0
          // Garantir que startPage seja no mínimo 1
          const startPage = Math.max(nextPage || 1, 1);

          // Ainda há queries disponíveis
          allQueriesExhausted = false;

          console.log(`\n📍 [Loop ${loopIteration}] Query: q="${query}" + location="${location}" (página: ${startPage})`);

          // Se já temos muito mais que o target, parar (safety)
          if (totalUniqueFound >= target_quantity * 3) {
            console.log(`   ⏹️ Safety: ${totalUniqueFound} > ${target_quantity * 3}`);
            break;
          }

          try {
            // Buscar apenas 1 página por vez no loop para melhor controle
            const paginatedResult = await searchSerperWithPagination(
              serperApiKey,
              query,
              location,
              RESULTS_PER_PAGE, // Apenas 1 página por vez
              startPage
            );
            const { response: serperResponse, lastPage, isExhausted } = paginatedResult;
            const profiles = processSerperResults(serperResponse, query);

            console.log(`   └─ Bruto: ${profiles.length} perfis (página ${lastPage}, esgotada: ${isExhausted})`);

            // Filtrar duplicados (já processados neste run + já existentes no workspace)
            const newProfiles = profiles.filter(p => {
              if (processedUsernames.has(p.username)) return false;
              if (existingUsernamesGlobal.has(p.username)) return false;
              return true;
            });

            // Adicionar aos processados
            profiles.forEach(p => processedUsernames.add(p.username));

            const duplicatesInRun = profiles.length - newProfiles.length;
            console.log(`   └─ Novos: ${newProfiles.length}, Duplicados: ${duplicatesInRun}`);

            allProfiles.push(...profiles);
            newProfilesThisRound += newProfiles.length;
            totalUniqueFound += newProfiles.length;
            totalPagesConsumed++;

            // Log detalhado para cada query
            await createLog(
              supabase, run_id, 3, 'Serper Query', 'discovery', 'info',
              `[Loop ${loopIteration}] "${query}": ${newProfiles.length} novos, ${duplicatesInRun} duplicados (página ${lastPage})`,
              {
                loop_iteration: loopIteration,
                query,
                location,
                page: lastPage,
                profiles_found: profiles.length,
                new_profiles: newProfiles.length,
                duplicates: duplicatesInRun,
                is_exhausted: isExhausted,
                total_unique_so_far: totalUniqueFound,
              }
            );

            // Atualizar progresso de paginação no banco
            await supabase.rpc('update_instagram_search_progress', {
              p_workspace_id: runData.workspace_id,
              p_query_hash: queryHash,
              p_query: query,
              p_page: lastPage,
              p_results_count: profiles.length,
              p_is_exhausted: isExhausted,
              p_total_queries: queriesToExecute.length,
            });

            // Atualizar progresso na tabela compartilhada
            await supabase
              .from('lead_extraction_runs')
              .update({
                discovery_profiles_found: allProfiles.length,
                discovery_profiles_unique: totalUniqueFound,
                pages_consumed: (runData.pages_consumed || 0) + totalPagesConsumed,
              })
              .eq('id', run_id);

            // Se encontrou novos perfis suficientes nesta query, ir para próxima
            if (totalUniqueFound >= target_quantity) {
              console.log(`   ✅ Target atingido! Parando busca.`);
              break;
            }

            // Pequena pausa entre queries para evitar rate limit
            await new Promise(resolve => setTimeout(resolve, 300));

          } catch (queryError) {
            console.error(`   ❌ Erro na query "${query}":`, queryError);
            await createLog(
              supabase, run_id, 3, 'Query Error', 'discovery', 'warning',
              `Erro na query: ${query}`,
              { query, error: String(queryError), loop_iteration: loopIteration }
            );
          }
        }

        // Verificar se todas as queries estão esgotadas
        if (allQueriesExhausted) {
          console.log(`\n⏹️ Todas as queries esgotadas!`);

          // =====================================================================
          // V2: EXPANSÃO POR IA - Quando queries esgotam mas target não atingido
          // =====================================================================
          if (totalUniqueFound < target_quantity) {
            console.log(`\n🤖 [V2] QUERIES ESGOTADAS - Tentando expansão por IA...`);
            console.log(`   Target: ${target_quantity}, Atual: ${totalUniqueFound}, Déficit: ${target_quantity - totalUniqueFound}`);

            // 1. Detectar nível da localização
            const locationLevel = detectLocationLevel(location);
            console.log(`📍 [V2] Nível da localização "${location}": ${locationLevel}`);

            // 2. Se é bairro, NÃO expandir (regra do usuário)
            if (locationLevel === 'neighborhood') {
              console.log(`⏹️ [V2] Busca de bairro específico - NÃO usa IA para expandir`);
              await createLog(
                supabase, run_id, 3, 'AI Expansion', 'discovery', 'info',
                `Busca por bairro específico - Expansão por IA não aplicável`,
                { location, location_level: locationLevel, total_found: totalUniqueFound }
              );
            } else {
              // 3. Se é cidade ou estado, chamar IA para obter bairros
              console.log(`🔍 [V2] Localização é ${locationLevel} - Iniciando expansão por IA...`);

              const aiConfig = await getAIConfig(supabase);
              if (aiConfig) {
                const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
                if (openrouterKey) {
                  // Parse da localização para extrair cidade e estado
                  const { city, state } = parseLocation(location);
                  console.log(`📍 [V2] Parsed: city="${city}", state="${state}"`);

                  // Buscar histórico de bairros já pesquisados (reutilizar tabela do Google Maps)
                  const { data: searchedLocations } = await supabase.rpc('get_location_search_history', {
                    p_workspace_id: runData.workspace_id,
                    p_search_term: niche,
                  });

                  const alreadySearched = searchedLocations?.map((l: any) => l.location_formatted) || [];
                  console.log(`📊 [V2] Bairros já pesquisados: ${alreadySearched.length}`);

                  // Construir prompt para IA
                  const userPrompt = buildAIPrompt(
                    niche,
                    city || location,
                    state || '',
                    alreadySearched,
                    target_quantity - totalUniqueFound
                  );

                  await createLog(
                    supabase, run_id, 3, 'AI Expansion', 'discovery', 'info',
                    `🤖 Chamando IA para expansão por bairros...`,
                    { location_level: locationLevel, city, state, already_searched: alreadySearched.length }
                  );

                  // Chamar IA
                  const aiResponse = await callAIWithRetry(
                    openrouterKey,
                    aiConfig,
                    aiConfig.system_prompt,
                    userPrompt
                  );

                  if (aiResponse && aiResponse.locations.length > 0) {
                    console.log(`✅ [V2] IA retornou ${aiResponse.locations.length} localizações`);

                    // Validar e filtrar localizações
                    const { valid: newLocations, errors } = validateAndFilterAILocations(
                      aiResponse.locations,
                      alreadySearched,
                      city || '',
                      state || ''
                    );

                    if (errors.length > 0) {
                      console.log(`⚠️ [V2] Erros de validação: ${errors.join(', ')}`);
                    }

                    if (newLocations.length > 0) {
                      console.log(`✅ [V2] ${newLocations.length} bairros válidos para buscar`);

                      await createLog(
                        supabase, run_id, 3, 'AI Expansion', 'discovery', 'success',
                        `🏘️ IA retornou ${newLocations.length} bairros para expansão`,
                        { neighborhoods: newLocations, has_more: aiResponse.has_more_neighborhoods }
                      );

                      // Buscar em cada bairro
                      for (const neighborhoodLocation of newLocations) {
                        if (totalUniqueFound >= target_quantity) {
                          console.log(`✅ [V2] Target atingido! Parando expansão.`);
                          break;
                        }

                        console.log(`\n🏘️ [V2] Buscando em: ${neighborhoodLocation}`);

                        // Registrar no histórico (reutilizar função do Google Maps)
                        try {
                          await supabase.rpc('upsert_location_search_progress', {
                            p_workspace_id: runData.workspace_id,
                            p_search_term: niche,
                            p_location_formatted: neighborhoodLocation,
                            p_page: 0,
                            p_leads_found: 0,
                            p_api_exhausted: false,
                            p_pages_with_zero: 0
                          });
                        } catch (e) {
                          console.log(`⚠️ [V2] Erro ao registrar histórico (pode não existir): ${e}`);
                        }

                        // Buscar páginas deste bairro (máximo de MAX_PAGES_PER_NEIGHBORHOOD)
                        for (let page = 1; page <= MAX_PAGES_PER_NEIGHBORHOOD; page++) {
                          if (totalUniqueFound >= target_quantity) break;

                          console.log(`   📄 [V2] Página ${page} de ${neighborhoodLocation}`);

                          try {
                            const paginatedResult = await searchSerperWithPagination(
                              serperApiKey,
                              niche, // TERMO EXATO - NUNCA MUDA!
                              neighborhoodLocation,
                              RESULTS_PER_PAGE,
                              page
                            );

                            const { response: serperResponse, lastPage, isExhausted } = paginatedResult;
                            const profiles = processSerperResults(serperResponse, niche);

                            console.log(`   └─ Bruto: ${profiles.length} perfis`);

                            // Filtrar duplicados
                            const newProfiles = profiles.filter(p => {
                              if (processedUsernames.has(p.username)) return false;
                              if (existingUsernamesGlobal.has(p.username)) return false;
                              return true;
                            });

                            // Adicionar aos processados
                            profiles.forEach(p => processedUsernames.add(p.username));

                            console.log(`   └─ Novos: ${newProfiles.length}`);

                            allProfiles.push(...profiles);
                            totalUniqueFound += newProfiles.length;
                            totalPagesConsumed++;

                            await createLog(
                              supabase, run_id, 3, 'AI Neighborhood Search', 'discovery', 'info',
                              `[V2] "${niche}" em "${neighborhoodLocation.split(',')[0]}": ${newProfiles.length} novos (página ${lastPage})`,
                              {
                                neighborhood: neighborhoodLocation,
                                page,
                                profiles_found: profiles.length,
                                new_profiles: newProfiles.length,
                                is_exhausted: isExhausted,
                                total_unique_so_far: totalUniqueFound,
                              }
                            );

                            if (isExhausted) {
                              console.log(`   └─ Bairro esgotado!`);
                              break;
                            }

                            // Pequena pausa entre páginas
                            await new Promise(resolve => setTimeout(resolve, 300));

                          } catch (error) {
                            console.error(`   ❌ [V2] Erro ao buscar em ${neighborhoodLocation}:`, error);
                            break;
                          }
                        }
                      }

                      // Verificar se IA tem mais bairros
                      if (!aiResponse.has_more_neighborhoods) {
                        console.log(`⏹️ [V2] IA confirmou: não há mais bairros disponíveis`);
                      }
                    } else {
                      console.log(`⚠️ [V2] Nenhuma localização válida após filtro`);
                    }
                  } else {
                    console.log(`⚠️ [V2] IA não retornou localizações`);
                    await createLog(
                      supabase, run_id, 3, 'AI Expansion', 'discovery', 'warning',
                      `IA não retornou bairros para expansão`,
                      { location_level: locationLevel }
                    );
                  }
                } else {
                  console.log(`⚠️ [V2] OPENROUTER_API_KEY não configurada`);
                }
              } else {
                console.log(`⚠️ [V2] Configuração de IA não disponível`);
              }
            }
          }
          // =====================================================================
          // FIM V2: EXPANSÃO POR IA
          // =====================================================================

          await createLog(
            supabase, run_id, 3, 'Loop Complete', 'discovery', 'warning',
            `Todas as queries esgotadas na iteração ${loopIteration}`,
            { iteration: loopIteration, unique_found: totalUniqueFound }
          );
          break;
        }

        // Atualizar contador de rodadas vazias
        if (newProfilesThisRound === 0) {
          consecutiveEmptyRounds++;
          console.log(`   ⚠️ Rodada sem novos perfis (${consecutiveEmptyRounds}/${EMPTY_ROUNDS_TO_STOP})`);
        } else {
          consecutiveEmptyRounds = 0; // Reset quando encontra novos perfis
        }

        console.log(`   📊 Fim da iteração ${loopIteration}: +${newProfilesThisRound} novos, total único: ${totalUniqueFound}`);
      }

      console.log(`\n📊 LOOP FINALIZADO após ${loopIteration} iterações`);
      console.log(`   Total bruto: ${allProfiles.length} perfis`);
      console.log(`   Total único: ${totalUniqueFound} perfis`);
      console.log(`   Páginas consumidas: ${totalPagesConsumed}`);

      // =========================================================================
      // DEDUPLICAÇÃO FINAL (já feita durante o loop, mas consolidar aqui)
      // =========================================================================

      // Deduplicar por username (consolidação final)
      const uniqueProfiles = deduplicateByField(allProfiles, 'username');
      console.log(`📊 Perfis únicos após deduplicação final: ${uniqueProfiles.length}`);

      // Separar perfis novos dos duplicados cross-run
      const newProfiles = uniqueProfiles.filter(p => !existingUsernamesGlobal.has(p.username));
      const duplicateProfiles = uniqueProfiles.filter(p => existingUsernamesGlobal.has(p.username));

      console.log(`📊 Perfis novos (não existem no workspace): ${newProfiles.length}`);
      console.log(`📊 Perfis duplicados cross-run: ${duplicateProfiles.length}`);

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

      // Marcar duplicatas encontradas (perfis que já existem no workspace)
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
          pages_consumed: (runData.pages_consumed || 0) + totalPagesConsumed,
        })
        .eq('id', run_id);

      await createLog(
        supabase, run_id, 4, 'Conclusão', 'discovery', 'success',
        `Descoberta concluída: ${newProfiles.length} perfis únicos em ${loopIteration} iterações (${duplicateProfiles.length} duplicados cross-run)`,
        {
          total_found: allProfiles.length,
          unique_profiles: newProfiles.length,
          duplicates_in_run: allProfiles.length - uniqueProfiles.length,
          duplicates_cross_run: duplicateProfiles.length,
          loop_iterations: loopIteration,
          consecutive_empty_rounds: consecutiveEmptyRounds,
          total_pages_consumed: totalPagesConsumed,
          target_reached: newProfiles.length >= target_quantity,
        }
      );

      // =========================================================================
      // AUTO-TRIGGER: Chamar instagram-enrichment automaticamente
      // O backend controla todo o fluxo, frontend apenas monitora
      // =========================================================================
      if (newProfiles.length > 0) {
        console.log(`\n🚀 Auto-trigger: Iniciando enriquecimento para ${newProfiles.length} perfis...`);

        await createLog(
          supabase, run_id, 5, 'Auto-Trigger', 'discovery', 'info',
          `Iniciando enriquecimento automaticamente para ${newProfiles.length} perfis`,
          { profiles_to_enrich: newProfiles.length }
        );

        try {
          // Obter token de autorização da requisição original para repassar
          const authHeader = req.headers.get('authorization');

          // Chamar instagram-enrichment de forma assíncrona (fire-and-forget)
          // Não esperamos a resposta para não bloquear o retorno da descoberta
          const enrichmentUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-enrichment`;

          fetch(enrichmentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader || `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              run_id: run_id,
              action: 'start',
            }),
          }).then(response => {
            if (response.ok) {
              console.log(`✅ Enriquecimento iniciado com sucesso para run ${run_id}`);
            } else {
              console.error(`❌ Erro ao iniciar enriquecimento: ${response.status}`);
            }
          }).catch(err => {
            console.error(`❌ Erro ao chamar instagram-enrichment:`, err);
          });

        } catch (triggerError) {
          console.error('Erro ao disparar enriquecimento:', triggerError);
          // Não falha a descoberta se o trigger falhar - pode ser retriggerado manualmente
          await createLog(
            supabase, run_id, 5, 'Auto-Trigger', 'discovery', 'warning',
            `Falha ao iniciar enriquecimento automaticamente: ${triggerError}`,
            { error: String(triggerError) }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          run_id,
          discovery: {
            loop_iterations: loopIteration,
            total_found: allProfiles.length,
            unique_profiles: newProfiles.length,
            duplicates_skipped: duplicateProfiles.length,
            pages_consumed: totalPagesConsumed,
            target_reached: newProfiles.length >= target_quantity,
          },
          enrichment_triggered: newProfiles.length > 0,
          message: `Descoberta concluída em ${loopIteration} iterações! ${newProfiles.length} perfis únicos (${duplicateProfiles.length} duplicados). ${newProfiles.length > 0 ? 'Enriquecimento iniciado automaticamente.' : ''}`,
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
          id, status, discovery_status, workspace_id,
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
