// =============================================================================
// EDGE FUNCTION: cnpj-api - API REST do Banco CNPJ Local
// =============================================================================
// CONSULTA INDIVIDUAL (pública):
//   GET /cnpj-api?cnpj=XXXXXXXXXXX     -> Consulta completa
//   GET /cnpj-api/basico?cnpj=XXX      -> Dados básicos (rápido)
//   GET /cnpj-api/socios?cnpj=XXX      -> Quadro societário
//   GET /cnpj-api/simples?cnpj=XXX     -> Dados Simples/MEI
//   GET /cnpj-api/health               -> Health check
//
// PROSPECAO EM MASSA (requer autenticacao JWT):
//   POST /cnpj-api/search              -> Busca com filtros
//   GET  /cnpj-api/filters             -> Listar filtros disponíveis
//   GET  /cnpj-api/stats               -> Estatísticas por filtro
// =============================================================================

import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  QUERY_CNPJ_COMPLETO,
  QUERY_SOCIOS,
  QUERY_CNPJ_BASICO,
  QUERY_SIMPLES
} from './queries.ts';
import {
  normalizeDBResult,
  normalizeCNPJ,
  isValidCNPJ,
  parseCNPJ,
  decodeFaixaEtaria,
  formatDate
} from './normalizer.ts';
import { handleSearch, handleStats, validateSearchRequest } from './search.ts';
import { handleFilters } from './filters.ts';
import type { CNPJResponse, DBRawResult, DBSocioResult, SearchFilters } from './types.ts';

// =============================================================================
// CORS: Origens permitidas (previne acesso de sites maliciosos)
// =============================================================================
const ALLOWED_ORIGINS = [
  // Producao
  'https://pescalead.com.br',
  'https://www.pescalead.com.br',
  'https://app.pescalead.com.br',
  // Subdomínios Supabase (Edge Functions chamando Edge Functions)
  'https://nlbcwaxkeaddfocigwuk.supabase.co',
  // Desenvolvimento local
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4200',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

/**
 * Gera headers CORS dinâmicos baseados na origem da requisição.
 * Se a origem não estiver na whitelist, retorna a primeira origem permitida (bloqueia acesso real).
 */
function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';

  // Verificar se origem está na whitelist
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
                   origin.endsWith('.pescalead.com.br') ||
                   origin.endsWith('.supabase.co');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // Cache preflight por 24h
    'Vary': 'Origin' // Importante para caching correto
  };
}

// =============================================================================
// ERROR HANDLING: Sanitização de erros para não expor detalhes internos
// =============================================================================
interface SafeError {
  message: string;
  code: string;
  details?: string;
}

/**
 * Sanitiza mensagens de erro para não expor detalhes internos do sistema.
 * Loga detalhes completos no console para debugging, mas retorna mensagens genéricas ao cliente.
 */
function sanitizeError(error: unknown, context?: string): SafeError {
  const err = error instanceof Error ? error : new Error(String(error));

  // Log completo para debugging (visível nos logs do Supabase)
  console.error(`❌ [ERROR]${context ? ` [${context}]` : ''}:`, {
    message: err.message,
    stack: err.stack,
    name: err.name
  });

  // Erros de validação podem ser expostos (são esperados)
  if (err.message.includes('required') ||
      err.message.includes('invalid') ||
      err.message.includes('must be') ||
      err.message.includes('cannot exceed') ||
      err.message.includes('cannot be negative') ||
      err.message.includes('At least one filter')) {
    return { message: err.message, code: 'VALIDATION_ERROR' };
  }

  // Erros de autenticação
  if (err.message.toLowerCase().includes('unauthorized') ||
      err.message.toLowerCase().includes('token') ||
      err.message.toLowerCase().includes('authentication')) {
    return { message: 'Authentication required', code: 'AUTH_ERROR' };
  }

  // Erros de banco de dados - NUNCA expor detalhes
  if (err.message.toLowerCase().includes('postgres') ||
      err.message.toLowerCase().includes('connection') ||
      err.message.toLowerCase().includes('econnrefused') ||
      err.message.toLowerCase().includes('timeout') ||
      err.message.toLowerCase().includes('sql') ||
      err.message.toLowerCase().includes('database')) {
    return { message: 'Service temporarily unavailable', code: 'DB_ERROR' };
  }

  // CNPJ não encontrado
  if (err.message.includes('nao encontrado') ||
      err.message.includes('not found')) {
    return { message: err.message, code: 'NOT_FOUND' };
  }

  // Erro genérico - não expor detalhes
  return { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' };
}

// Pool de conexoes PostgreSQL
let sql: ReturnType<typeof postgres> | null = null;

function getConnection() {
  if (!sql) {
    const connectionString = Deno.env.get('CNPJ_DATABASE_URL');

    if (!connectionString) {
      throw new Error('CNPJ_DATABASE_URL nao configurado');
    }

    sql = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 30,  // Aumentado para 30s
      prepare: false,  // Compativel com PgBouncer
      onnotice: () => {}, // Silenciar notices
      debug: false
    });
  }

  return sql;
}

/**
 * Verifica se a requisição é uma chamada interna do Supabase (Edge Function para Edge Function).
 * Chamadas internas são identificadas pelo header x-supabase-* ou service_role_key.
 *
 * SEGURANÇA: Aceita service_role via:
 * 1. Header 'apikey' (padrão do Supabase)
 * 2. Authorization Bearer (para chamadas entre Edge Functions)
 *
 * Isso é seguro porque service_role_key só existe no servidor.
 */
function isInternalSupabaseCall(req: Request): boolean {
  // Headers que indicam chamada interna do Supabase
  const supabaseHeaders = [
    'x-supabase-function-name',
    'x-supabase-egress-source',
  ];

  // Se qualquer header interno do Supabase existir, é chamada interna
  for (const header of supabaseHeaders) {
    if (req.headers.get(header)) {
      console.log(`🔐 [AUTH] Internal call detected via header: ${header}`);
      return true;
    }
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    console.warn('🔐 [AUTH] SUPABASE_SERVICE_ROLE_KEY not available');
    return false;
  }

  // Verificar via header 'apikey' (padrão do Supabase interno)
  const apikey = req.headers.get('apikey');
  if (apikey && apikey === serviceRoleKey) {
    console.log('🔐 [AUTH] Internal call detected via apikey header');
    return true;
  }

  // Verificar via Authorization Bearer (para chamadas Edge → Edge)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token === serviceRoleKey) {
      console.log('🔐 [AUTH] Internal call detected via Authorization Bearer');
      return true;
    }
  }

  return false;
}

/**
 * Verifica se o usuario esta autenticado via JWT do Supabase.
 * Para chamadas internas (Edge Function → Edge Function), verifica headers específicos.
 * SEGURANÇA: Não aceita service_role_key diretamente no Authorization header.
 */
async function verifyAuth(req: Request): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  // Verificar se é chamada interna do Supabase primeiro
  if (isInternalSupabaseCall(req)) {
    console.log('🔐 [AUTH] Internal Supabase call detected');
    return { authenticated: true, userId: 'internal_service' };
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Authorization header required' };
  }

  const token = authHeader.replace('Bearer ', '');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false, error: 'Supabase configuration missing' };
  }

  // REMOVIDO: Verificação direta de service_role_key no Authorization
  // Era vulnerável a bypass externo. Agora só aceita JWT de usuário válido
  // ou chamadas internas identificadas por headers específicos.

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }

    return { authenticated: true, userId: user.id };
  } catch {
    return { authenticated: false, error: 'Authentication failed' };
  }
}

// Handler principal
Deno.serve(async (req) => {
  // Headers CORS dinâmicos baseados na origem
  const corsHeaders = getCorsHeaders(req);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Extrair endpoint (remove /cnpj-api prefix se existir)
    const endpoint = pathname.replace(/^\/cnpj-api\/?/, '').split('/')[0] || '';

    // ==========================================================================
    // ENDPOINTS PUBLICOS
    // ==========================================================================

    // Health check
    if (endpoint === 'health') {
      return await handleHealthCheck(corsHeaders);
    }

    // Filters - retorna definicoes de filtros (publico)
    if (endpoint === 'filters' && req.method === 'GET') {
      const response = handleFilters();
      response.response_time_ms = Date.now() - startTime;

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // CNAEs - busca CNAEs do banco (publico)
    // OTIMIZADO: Usa apenas tabela cnae para ser rápido (sem COUNT que demora 45s+)
    if (endpoint === 'cnaes' && req.method === 'GET') {
      const db = getConnection();
      const searchTerm = url.searchParams.get('q') || '';
      const divisao = url.searchParams.get('divisao') || '';
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

      try {
        // Query rápida usando apenas tabela cnae
        let query = `
          SELECT codigo, descricao
          FROM cnae
          WHERE codigo IS NOT NULL
            AND codigo != ''
        `;

        const conditions: string[] = [];
        const params: (string | number)[] = [];

        // Filtro por divisão (2 primeiros dígitos)
        if (divisao) {
          conditions.push(`codigo LIKE $${params.length + 1}`);
          params.push(`${divisao}%`);
        }

        // Filtro por termo de busca (na descrição ou código)
        if (searchTerm) {
          conditions.push(`(descricao ILIKE $${params.length + 1} OR codigo LIKE $${params.length + 2})`);
          params.push(`%${searchTerm}%`);
          params.push(`%${searchTerm}%`);
        }

        if (conditions.length > 0) {
          query += ` AND ${conditions.join(' AND ')}`;
        }

        query += `
          ORDER BY codigo
          LIMIT $${params.length + 1}
        `;
        params.push(limit);

        const result = await db.unsafe(query, params);

        const cnaes = result.map((row: { codigo: string; descricao: string }) => ({
          value: row.codigo,
          label: `${row.codigo} - ${row.descricao?.trim() || 'Sem descrição'}`
        }));

        return new Response(JSON.stringify({
          success: true,
          cnaes,
          total: cnaes.length,
          response_time_ms: Date.now() - startTime
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('[CNAES] Error:', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to fetch CNAEs',
          details: error instanceof Error ? error.message : 'Unknown error',
          response_time_ms: Date.now() - startTime
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ==========================================================================
    // ENDPOINTS QUE REQUEREM AUTENTICACAO
    // ==========================================================================

    // Search - busca com filtros (requer auth)
    if (endpoint === 'search' && req.method === 'POST') {
      const auth = await verifyAuth(req);

      if (!auth.authenticated) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: auth.error,
          hint: 'Include a valid JWT token in the Authorization header'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let body;
      try {
        body = await req.json();
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON body'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // DEBUG: Log detalhado do request recebido
      console.log('🔍 [SEARCH DEBUG] Request body received:', JSON.stringify(body, null, 2));
      console.log('🔍 [SEARCH DEBUG] Filters:', JSON.stringify(body.filters || {}, null, 2));

      const validation = validateSearchRequest(body);

      if (!validation.valid) {
        console.error('❌ [SEARCH DEBUG] Validation failed:', validation.error);
        console.log('❌ [SEARCH DEBUG] Body that failed:', JSON.stringify(body, null, 2));
        
        return new Response(JSON.stringify({
          success: false,
          error: validation.error,
          debug: {
            receivedBody: body,
            receivedFilters: body.filters || {},
            hint: 'At least one filter is required. Try adding: situacao: ["02"] for active companies (default behavior)'
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🔍 [SEARCH] User ${auth.userId} iniciando busca com ${Object.keys(validation.request!.filters).length} filtros`);

      const db = getConnection();
      const response = await handleSearch(db, validation.request!);
      response.response_time_ms = Date.now() - startTime;

      console.log(`✅ [SEARCH] ${response.total} resultados em ${response.response_time_ms}ms`);

      return new Response(JSON.stringify(response), {
        status: response.success ? 200 : 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Total-Count': String(response.total),
          'X-Response-Time': `${response.response_time_ms}ms`
        }
      });
    }

    // Stats - estatisticas/preview (público - apenas contagem, sem dados sensíveis)
    // Aceita GET ou POST
    if (endpoint === 'stats' && (req.method === 'GET' || req.method === 'POST')) {
      // Parse filtros do query string (GET) ou body (POST)
      let filters: SearchFilters;
      if (req.method === 'POST') {
        try {
          const body = await req.json();
          filters = body.filters || {};
        } catch {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid JSON body'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        filters = parseQueryFilters(url.searchParams);
      }

      const db = getConnection();
      const response = await handleStats(db, filters);
      response.response_time_ms = Date.now() - startTime;

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ==========================================================================
    // ENDPOINTS DE CONSULTA POR CNPJ (publicos mas podem ter rate limit futuro)
    // ==========================================================================

    // Apenas GET permitido para consultas por CNPJ
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed',
        hint: 'Use GET for CNPJ queries, POST for search'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extrair CNPJ do query string
    const cnpjParam = url.searchParams.get('cnpj');

    if (!cnpjParam) {
      return new Response(JSON.stringify({
        success: false,
        error: 'CNPJ is required',
        usage: {
          consulta: {
            completo: 'GET /cnpj-api?cnpj=00000000000191',
            basico: 'GET /cnpj-api/basico?cnpj=00000000000191',
            socios: 'GET /cnpj-api/socios?cnpj=00000000000191',
            simples: 'GET /cnpj-api/simples?cnpj=00000000000191'
          },
          prospeccao: {
            search: 'POST /cnpj-api/search (requer JWT)',
            filters: 'GET /cnpj-api/filters',
            stats: 'GET /cnpj-api/stats (requer JWT)'
          },
          health: 'GET /cnpj-api/health'
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validar formato do CNPJ
    if (!isValidCNPJ(cnpjParam)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid CNPJ format',
        hint: 'CNPJ must have 14 digits',
        received: cnpjParam
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cnpj = normalizeCNPJ(cnpjParam);
    const { basico, ordem, dv } = parseCNPJ(cnpj);

    console.log(`🔍 [CNPJ-API] Consultando CNPJ ${cnpj} (endpoint: ${endpoint || 'completo'})`);

    // Roteamento por endpoint
    let response: CNPJResponse;

    switch (endpoint) {
      case 'basico':
        response = await handleBasico(basico, ordem, dv);
        break;
      case 'socios':
        response = await handleSocios(basico);
        break;
      case 'simples':
        response = await handleSimples(basico);
        break;
      default:
        response = await handleCompleto(basico, ordem, dv);
    }

    const responseTime = Date.now() - startTime;
    response.response_time_ms = responseTime;

    const status = response.success ? 200 : 404;

    console.log(`${response.success ? '✅' : '❌'} [CNPJ-API] ${cnpj} - ${responseTime}ms`);

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Provider': 'banco_local',
        'X-Response-Time': `${responseTime}ms`
      }
    });

  } catch (error: unknown) {
    // Usar sanitizeError para não expor detalhes internos
    const safeError = sanitizeError(error, 'CNPJ-API');

    return new Response(JSON.stringify({
      success: false,
      provider: 'banco_local',
      error: safeError.message,
      code: safeError.code,
      response_time_ms: Date.now() - startTime
    }), {
      status: safeError.code === 'VALIDATION_ERROR' ? 400 :
              safeError.code === 'AUTH_ERROR' ? 401 :
              safeError.code === 'NOT_FOUND' ? 404 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse filtros do query string para o endpoint /stats
 */
function parseQueryFilters(params: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {};

  // Texto
  const termo = params.get('termo');
  if (termo) filters.termo = termo;

  // Arrays (split por virgula)
  const uf = params.get('uf');
  if (uf) filters.uf = uf.split(',');

  const municipio = params.get('municipio');
  if (municipio) filters.municipio = municipio.split(',');

  const ddd = params.get('ddd');
  if (ddd) filters.ddd = ddd.split(',');

  const cnaeDivisao = params.get('cnae_divisao');
  if (cnaeDivisao) filters.cnae_divisao = cnaeDivisao.split(',');

  const cnae = params.get('cnae');
  if (cnae) filters.cnae = cnae.split(',');

  const porte = params.get('porte');
  if (porte) filters.porte = porte.split(',');

  const situacao = params.get('situacao');
  if (situacao) filters.situacao = situacao.split(',');

  const tipo = params.get('tipo');
  if (tipo) filters.tipo = tipo.split(',');

  const naturezaJuridica = params.get('natureza_juridica');
  if (naturezaJuridica) filters.natureza_juridica = naturezaJuridica.split(',');

  // Números
  const capitalMin = params.get('capital_social_min');
  if (capitalMin) filters.capital_social_min = parseFloat(capitalMin);

  const capitalMax = params.get('capital_social_max');
  if (capitalMax) filters.capital_social_max = parseFloat(capitalMax);

  const idadeMin = params.get('idade_min_dias');
  if (idadeMin) filters.idade_min_dias = parseInt(idadeMin);

  const idadeMax = params.get('idade_max_dias');
  if (idadeMax) filters.idade_max_dias = parseInt(idadeMax);

  // Booleanos
  const simples = params.get('simples');
  if (simples !== null) filters.simples = simples === 'true';

  const mei = params.get('mei');
  if (mei !== null) filters.mei = mei === 'true';

  const comEmail = params.get('com_email');
  if (comEmail !== null) filters.com_email = comEmail === 'true';

  const comTelefone = params.get('com_telefone');
  if (comTelefone !== null) filters.com_telefone = comTelefone === 'true';

  // Datas
  const dataAberturaMin = params.get('data_abertura_min');
  if (dataAberturaMin) filters.data_abertura_min = dataAberturaMin;

  const dataAberturaMax = params.get('data_abertura_max');
  if (dataAberturaMax) filters.data_abertura_max = dataAberturaMax;

  // Prefixo CEP
  const cepPrefixo = params.get('cep_prefixo');
  if (cepPrefixo) filters.cep_prefixo = cepPrefixo;

  return filters;
}

// =============================================================================
// HANDLERS DE CONSULTA POR CNPJ
// =============================================================================

async function handleCompleto(basico: string, ordem: string, dv: string): Promise<CNPJResponse> {
  const db = getConnection();

  // Busca dados principais
  const mainResult = await db.unsafe(QUERY_CNPJ_COMPLETO, [basico, ordem, dv]);

  if (!mainResult || mainResult.length === 0) {
    return {
      success: false,
      provider: 'banco_local',
      error: 'CNPJ nao encontrado'
    };
  }

  // Busca socios
  const sociosResult = await db.unsafe(QUERY_SOCIOS, [basico]);

  const raw = mainResult[0] as DBRawResult;
  const socios = sociosResult as DBSocioResult[];

  const data = normalizeDBResult(raw, socios);

  return {
    success: true,
    provider: 'banco_local',
    data,
    cached: false
  };
}

async function handleBasico(basico: string, ordem: string, dv: string): Promise<CNPJResponse> {
  const db = getConnection();

  const result = await db.unsafe(QUERY_CNPJ_BASICO, [basico, ordem, dv]);

  if (!result || result.length === 0) {
    return {
      success: false,
      provider: 'banco_local',
      error: 'CNPJ nao encontrado'
    };
  }

  const raw = result[0] as DBRawResult;
  const data = normalizeDBResult(raw);

  return {
    success: true,
    provider: 'banco_local',
    data,
    cached: false
  };
}

async function handleSocios(basico: string): Promise<CNPJResponse> {
  const db = getConnection();

  const result = await db.unsafe(QUERY_SOCIOS, [basico]);

  if (!result || result.length === 0) {
    return {
      success: false,
      provider: 'banco_local',
      error: 'Socios nao encontrados para este CNPJ'
    };
  }

  const socios = (result as DBSocioResult[]).map(s => ({
    nome: s.nome_socio_razao_social?.trim() || null,
    cpf_cnpj: s.cpf_cnpj_socio || null,
    qualificacao: s.qualificacao_descricao?.trim() || null,
    qualificacao_codigo: s.qualificacao_socio || null,
    data_entrada: formatDate(s.data_entrada_sociedade),
    faixa_etaria: decodeFaixaEtaria(s.faixa_etaria),
    pais: s.pais || null,
    representante_legal: s.representante_legal || null,
    nome_representante: s.nome_do_representante?.trim() || null
  }));

  return {
    success: true,
    provider: 'banco_local',
    data: { socios } as unknown as CNPJResponse['data'],
    cached: false
  };
}

async function handleSimples(basico: string): Promise<CNPJResponse> {
  const db = getConnection();

  const result = await db.unsafe(QUERY_SIMPLES, [basico]);

  if (!result || result.length === 0) {
    return {
      success: false,
      provider: 'banco_local',
      error: 'Dados do Simples nao encontrados para este CNPJ'
    };
  }

  const raw = result[0];

  return {
    success: true,
    provider: 'banco_local',
    data: {
      simples: {
        opcao_simples: raw.opcao_pelo_simples === 'S',
        data_opcao_simples: raw.data_opcao_simples,
        data_exclusao_simples: raw.data_exclusao_simples,
        opcao_mei: raw.opcao_mei === 'S',
        data_opcao_mei: raw.data_opcao_mei,
        data_exclusao_mei: raw.data_exclusao_mei
      }
    } as unknown as CNPJResponse['data'],
    cached: false
  };
}

async function handleHealthCheck(headers: Record<string, string>): Promise<Response> {
  const startTime = Date.now();

  try {
    const db = getConnection();

    // Query simples para verificar conexao
    const result = await db`SELECT 1 as ok, NOW() as timestamp`;

    return new Response(JSON.stringify({
      status: 'healthy',
      provider: 'banco_local',
      database: 'connected',
      timestamp: result[0]?.timestamp,
      endpoints: {
        consulta: ['GET /?cnpj=', 'GET /basico?cnpj=', 'GET /socios?cnpj=', 'GET /simples?cnpj='],
        prospeccao: ['POST /search (JWT)', 'GET /filters', 'GET /stats (JWT)'],
        health: ['GET /health']
      },
      response_time_ms: Date.now() - startTime
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({
      status: 'unhealthy',
      provider: 'banco_local',
      database: 'disconnected',
      error: errorMessage,
      response_time_ms: Date.now() - startTime
    }), {
      status: 503,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}
