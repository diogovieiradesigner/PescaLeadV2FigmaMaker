// =============================================================================
// EDGE FUNCTION: fetch-google-maps V18 (MÓDULO COMPARTILHADO)
// =============================================================================
// V18 Melhorias:
// 1. ✅ Usa módulo compartilhado _shared/location-expansion.ts
// 2. ✅ Mantém todas funcionalidades V17
// =============================================================================
// V17 Melhorias:
// 1. ✅ Detecta mensagens de compensação perdidas/expiradas na fila (V15)
// 2. ✅ Finaliza automaticamente após timeout (30min) se mensagens foram perdidas (V15)
// 3. ✅ Expansão automática por bairros usando IA (Perplexity via OpenRouter) (V17)
// 4. ✅ IA retorna localizações JÁ FORMATADAS para SerpDev API (sem coordenadas)
// 5. ✅ Cache de localizações por cidade/estado/termo
// 6. ✅ Histórico de buscas por localização (continuidade)
// 7. ✅ Múltiplas rodadas de IA quando bairros esgotam
// 8. ✅ Mantém todas funcionalidades anteriores
// =============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// V18: Importar apenas tipos e constantes do módulo compartilhado
// As funções são mantidas localmente para evitar quebra de compatibilidade
// Instagram-discovery usará o módulo compartilhado diretamente
import {
  AILocationConfig,
  AILocationResponse,
} from '../_shared/location-expansion.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const MAX_COMPENSATION_PAGES = 10;
const RESULTS_PER_PAGE = 10;
const TOTAL_API_KEYS = 15;
const MAX_SEGMENTED_SEARCHES = 20; // V17: Máximo de localizações para segmentação
const MAX_PAGES_PER_SEGMENT = 3; // V17: Máximo de páginas por localização

// V18: Constantes de IA mantidas localmente para compatibilidade
const AI_TIMEOUT_MS = 60000; // 60 segundos

// V19: URL do OpenRouter para chamadas de IA
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Constantes de estados brasileiros (mantidas localmente)
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

// V17: Normalizar string para formato SerpDev
// Formato obrigatório: "Bairro, Cidade, State of Estado, Brazil"
function normalizeForSerpdev(location: string): string {
  // Remover acentos
  const withoutAccents = removeAccents(location);
  
  // Capitalizar corretamente
  const parts = withoutAccents.split(',').map(part => {
    return part.trim().split(' ').map(word => {
      const lower = word.toLowerCase();
      // Palavras que ficam minúsculas
      if (['de', 'do', 'da', 'dos', 'das', 'of'].includes(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  });
  
  return parts.join(', ');
}

// V17: Validar formato SerpDev
function validateSerpdevFormat(location: string): boolean {
  const parts = location.split(',').map(p => p.trim());
  
  // Deve ter pelo menos 4 partes: Bairro, Cidade, State of Estado, Brazil
  if (parts.length < 4) return false;
  
  // Deve conter "State of"
  if (!parts.some(p => p.includes('State of'))) return false;
  
  // Última parte deve ser "Brazil"
  if (parts[parts.length - 1] !== 'Brazil') return false;
  
  // Não pode ter acentos
  if (/[àáâãäåèéêëìíîïòóôõöùúûüçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ]/i.test(location)) return false;
  
  return true;
}

// V17: Corrigir formato SerpDev automaticamente
function fixSerpdevFormat(location: string, city: string, state: string): string {
  // Extrair nome do bairro (primeira parte)
  const neighborhood = location.split(',')[0].trim();
  const normalizedNeighborhood = normalizeForSerpdev(neighborhood);
  const normalizedCity = normalizeForSerpdev(city);
  const normalizedState = normalizeForSerpdev(state);
  
  return `${normalizedNeighborhood}, ${normalizedCity}, State of ${normalizedState}, Brazil`;
}

function normalizeLocationForSerper(location: string, expandState: boolean = false): string {
  let normalized = removeAccents(location);
  const parts = normalized.split(',').map(p => p.trim());
  if (parts.length === 0) return location;
  
  const capitalize = (str: string) => {
    return str.split(' ').map(word => {
      if (['de', 'do', 'da', 'dos', 'das', 'of'].includes(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  };
  
  // V17 FIX: Se já contém "State of" e "Brazil", está formatado - apenas normalizar acentos
  const hasStateOf = parts.some(p => p.toLowerCase().includes('state of'));
  const hasBrazil = parts.some(p => ['brazil', 'brasil'].includes(p.toLowerCase()));
  
  if (hasStateOf && hasBrazil) {
    // Já está no formato correto, apenas normalizar
    return parts.map(p => {
      if (p.toLowerCase().startsWith('state of')) {
        const stateName = p.substring(9).trim(); // Remove "State of "
        return `State of ${capitalize(stateName)}`;
      }
      if (['brazil', 'brasil'].includes(p.toLowerCase())) {
        return 'Brazil';
      }
      return capitalize(p);
    }).join(', ');
  }
  
  // V16 FIX: Detectar se primeira parte é estado conhecido (para casos como "Paraíba")
  const firstPartUpper = parts[0].toUpperCase();
  const firstPartLower = removeAccents(parts[0].toLowerCase());
  const isStateOnly = BRAZILIAN_STATES[firstPartUpper] || STATE_NAME_NORMALIZE[firstPartLower];
  
  let city = '';
  let state = '';
  let country = 'Brazil';
  
  // V16 FIX: Se expandState e primeira parte é estado, tratar como estado puro
  if (expandState && isStateOnly && parts.length === 1) {
    state = BRAZILIAN_STATES[firstPartUpper] || STATE_NAME_NORMALIZE[firstPartLower] || capitalize(parts[0]);
    return `State of ${state}, ${country}`;
  }
  
  // Caso normal: primeira parte é cidade/bairro
  city = capitalize(parts[0]);
  
  if (parts.length >= 2) {
    const statePart = parts[1].trim().toUpperCase();
    if (BRAZILIAN_STATES[statePart]) {
      state = BRAZILIAN_STATES[statePart];
    } else {
      const stateNameLower = removeAccents(parts[1].trim().toLowerCase());
      state = STATE_NAME_NORMALIZE[stateNameLower] || capitalize(parts[1]);
    }
  }
  
  if (parts.length >= 3) {
    const countryPart = parts[2].trim().toLowerCase();
    country = ['brazil', 'brasil', 'br'].includes(countryPart) ? 'Brazil' : capitalize(parts[2]);
  }
  
  if (expandState && state) {
    return `State of ${state}, ${country}`;
  }
  
  let result = city;
  if (state) result += `, State of ${state}`;
  result += `, ${country}`;
  
  return result;
}

function createSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createExtractionLog(supabase: any, runId: string, stepNumber: number, stepName: string, level: string, message: string, details: any = {}) {
  try {
    await supabase.from('extraction_logs').insert({ run_id: runId, step_number: stepNumber, step_name: stepName, level, message, details });
  } catch (e) { console.error('Erro ao criar log:', e); }
}

async function getApiKey(supabase: any, keyIndex: number): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_serpdev_api_key', { key_index: keyIndex });
    if (error) {
      console.error(`[getApiKey] Erro ao buscar key #${keyIndex}:`, error.message);
      return null;
    }
    if (!data) {
      console.warn(`[getApiKey] Key #${keyIndex} não encontrada ou vazia`);
      return null;
    }
    // V19: Log parcial da chave para debug (primeiros 10 caracteres)
    console.log(`[getApiKey] Key #${keyIndex} encontrada: ${data.substring(0, 10)}...`);
    return data;
  } catch (e: any) {
    console.error(`[getApiKey] Exceção ao buscar key #${keyIndex}:`, e.message);
    return null;
  }
}

function isValidResult(result: any): boolean {
  const required = ['cid', 'title', 'address', 'latitude', 'longitude'];
  return required.every(field => {
    const value = result[field];
    if (field === 'latitude' || field === 'longitude') return typeof value === 'number' && !isNaN(value);
    return value && typeof value === 'string' && value.trim().length > 0;
  });
}

// V20: Função para buscar página com rotação de chaves
async function fetchGoogleMapsPage(
  searchTerm: string,
  location: string,
  page: number,
  apiKey: string,
  coordinates?: {lat: number, lng: number}, // V16: Coordenadas opcionais (não usadas na API, apenas para logs)
  supabase?: any, // V19: Supabase client para rotação de chaves
  currentKeyIndex?: number, // V19: Índice da chave atual para rotação
  run_id?: string // V20: Run ID para criar logs no frontend
): Promise<{ places: any[], apiEmpty: boolean, usedKeyIndex?: number }> {
  // V20: Tentar TODAS as chaves disponíveis antes de desistir
  const maxRetries = TOTAL_API_KEYS;
  let currentApiKey = apiKey;
  let keyIndex = currentKeyIndex || 1;
  const triedKeys = new Set<number>([keyIndex]);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[API] Buscando página ${page} - Tentativa ${attempt} (Key #${keyIndex})`);

      // V19: Construir request body conforme documentação SerpDev
      // Formato: {"q":"termo","location":"Cidade, State of Estado, Brazil","gl":"br","hl":"pt-br","page":1}
      const requestBody = {
        q: searchTerm,
        location: location,
        gl: 'br',
        hl: 'pt-br',
        page: page // Página começa em 1, não 0
      };

      console.log(`[API] Request body:`, JSON.stringify(requestBody));

      // V16 FIX: Coordenadas não são enviadas à API (não suportado)
      if (coordinates) {
        console.log(`[API] Busca segmentada - Bairro com coordenadas: ${coordinates.lat}, ${coordinates.lng} (não enviadas à API)`);
      }

      const response = await fetch('https://google.serper.dev/places', {
        method: 'POST',
        headers: {
          'X-API-KEY': currentApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // V19: Tratar diferentes códigos de erro
      if (response.status === 500) {
        console.log(`[API] ⚠️ Página ${page}: Erro 500 - API esgotou resultados`);
        return { places: [], apiEmpty: true, usedKeyIndex: keyIndex };
      }

      if (response.status === 400) {
        // HTTP 400 = Bad Request - pode ser problema com a chave ou parâmetros
        const errorText = await response.text();
        console.error(`[API] ❌ HTTP 400 - Bad Request: ${errorText}`);

        // V20: Detectar falta de créditos e logar no frontend
        const isCreditsError = errorText.toLowerCase().includes('credits');
        if (isCreditsError && run_id && supabase) {
          await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'warning',
            `💳 Chave API #${keyIndex} sem créditos - Rotacionando (${triedKeys.size}/${TOTAL_API_KEYS} tentadas)`,
            { key_index: keyIndex, error_type: 'no_credits', tried_keys: triedKeys.size, total_keys: TOTAL_API_KEYS }
          );
        }

        // V20: Tentar próxima chave que ainda não foi testada
        if (supabase && attempt < maxRetries) {
          let nextKeyIndex = (keyIndex % TOTAL_API_KEYS) + 1;
          // V20: Pular chaves já tentadas
          while (triedKeys.has(nextKeyIndex) && triedKeys.size < TOTAL_API_KEYS) {
            nextKeyIndex = (nextKeyIndex % TOTAL_API_KEYS) + 1;
          }
          if (triedKeys.has(nextKeyIndex)) {
            // V20: Log final quando todas as chaves falharam
            if (isCreditsError && run_id) {
              await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'error',
                `❌ TODAS as ${TOTAL_API_KEYS} chaves API estão sem créditos - Extração pausada`,
                { tried_keys: TOTAL_API_KEYS, error_type: 'all_keys_no_credits' }
              );
            }
            throw new Error(`HTTP 400: Todas as ${TOTAL_API_KEYS} chaves foram tentadas - ${errorText}`);
          }
          console.log(`[API] 🔄 Rotacionando chave: #${keyIndex} -> #${nextKeyIndex} (tentadas: ${triedKeys.size}/${TOTAL_API_KEYS})`);
          const nextKey = await getApiKey(supabase, nextKeyIndex);
          if (nextKey) {
            currentApiKey = nextKey;
            keyIndex = nextKeyIndex;
            triedKeys.add(keyIndex);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
        }
        throw new Error(`HTTP 400: ${errorText}`);
      }

      if (response.status === 401 || response.status === 403) {
        // Chave inválida ou sem créditos - rotacionar
        console.error(`[API] ❌ HTTP ${response.status} - Chave #${keyIndex} inválida ou sem créditos`);

        if (supabase && attempt < maxRetries) {
          let nextKeyIndex = (keyIndex % TOTAL_API_KEYS) + 1;
          while (triedKeys.has(nextKeyIndex) && triedKeys.size < TOTAL_API_KEYS) {
            nextKeyIndex = (nextKeyIndex % TOTAL_API_KEYS) + 1;
          }
          if (triedKeys.has(nextKeyIndex)) {
            throw new Error(`HTTP ${response.status}: Todas as ${TOTAL_API_KEYS} chaves inválidas ou sem créditos`);
          }
          console.log(`[API] 🔄 Rotacionando chave: #${keyIndex} -> #${nextKeyIndex} (tentadas: ${triedKeys.size}/${TOTAL_API_KEYS})`);
          const nextKey = await getApiKey(supabase, nextKeyIndex);
          if (nextKey) {
            currentApiKey = nextKey;
            keyIndex = nextKeyIndex;
            triedKeys.add(keyIndex);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
        }
        throw new Error(`HTTP ${response.status}: Chave inválida ou sem créditos`);
      }

      if (response.status === 429) {
        // Rate limit - aguardar e tentar novamente
        console.log(`[API] ⏳ Rate limit na chave #${keyIndex}, aguardando...`);

        if (supabase && attempt < maxRetries) {
          let nextKeyIndex = (keyIndex % TOTAL_API_KEYS) + 1;
          while (triedKeys.has(nextKeyIndex) && triedKeys.size < TOTAL_API_KEYS) {
            nextKeyIndex = (nextKeyIndex % TOTAL_API_KEYS) + 1;
          }
          if (triedKeys.has(nextKeyIndex)) {
            throw new Error(`HTTP 429: Todas as ${TOTAL_API_KEYS} chaves com rate limit`);
          }
          console.log(`[API] 🔄 Rotacionando chave: #${keyIndex} -> #${nextKeyIndex} (tentadas: ${triedKeys.size}/${TOTAL_API_KEYS})`);
          const nextKey = await getApiKey(supabase, nextKeyIndex);
          if (nextKey) {
            currentApiKey = nextKey;
            keyIndex = nextKeyIndex;
            triedKeys.add(keyIndex);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
        }
        throw new Error('HTTP 429: Rate limit');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const places = data.places || [];

      const apiEmpty = places.length === 0;
      if (apiEmpty) {
        console.log(`[API] ⚠️ Página ${page}: 0 resultados - API esgotou`);
      } else {
        console.log(`[API] ✅ Página ${page}: ${places.length} resultados (Key #${keyIndex})`);
      }

      return { places, apiEmpty, usedKeyIndex: keyIndex };
    } catch (error: any) {
      console.error(`[API] ❌ Tentativa ${attempt} (Key #${keyIndex}):`, error.message);

      // V20: Rotacionar para próxima chave não testada
      if (supabase && attempt < maxRetries) {
        let nextKeyIndex = (keyIndex % TOTAL_API_KEYS) + 1;
        while (triedKeys.has(nextKeyIndex) && triedKeys.size < TOTAL_API_KEYS) {
          nextKeyIndex = (nextKeyIndex % TOTAL_API_KEYS) + 1;
        }
        if (triedKeys.has(nextKeyIndex)) {
          console.error(`[API] ❌ Todas as ${TOTAL_API_KEYS} chaves falharam para página ${page}`);
          return { places: [], apiEmpty: true, usedKeyIndex: keyIndex };
        }
        console.log(`[API] 🔄 Erro - Rotacionando chave: #${keyIndex} -> #${nextKeyIndex} (tentadas: ${triedKeys.size}/${TOTAL_API_KEYS})`);
        const nextKey = await getApiKey(supabase, nextKeyIndex);
        if (nextKey) {
          currentApiKey = nextKey;
          keyIndex = nextKeyIndex;
          triedKeys.add(keyIndex);
        }
        await new Promise(r => setTimeout(r, 3000));
      } else if (attempt >= maxRetries) {
        console.error(`[API] ❌ Todas as ${TOTAL_API_KEYS} chaves tentadas para página ${page}`);
        return { places: [], apiEmpty: true, usedKeyIndex: keyIndex };
      }
    }
  }
  return { places: [], apiEmpty: true, usedKeyIndex: keyIndex };
}

async function enqueueCompensationPages(
  supabase: any, 
  runId: string, 
  startPage: number, 
  numPages: number,
  searchTerm: string, 
  location: string, 
  workspaceId: string, 
  targetQuantity: number, 
  filters: any
): Promise<number[]> {
  const queuedPages: number[] = [];
  
  for (let i = 0; i < numPages; i++) {
    const pageNum = startPage + i;
    const isLast = i === numPages - 1;
    
    const message = {
      run_id: runId,
      page: pageNum,
      search_term: searchTerm,
      location: location,
      workspace_id: workspaceId,
      target_quantity: targetQuantity,
      pages_in_batch: numPages,
      is_last_page: isLast,
      is_compensation: true,
      filters: filters
    };
    
    const { data, error } = await supabase.rpc('pgmq_send', {
      queue_name: 'google_maps_queue', // V15: Usar fila universal correta
      message: message,
      delay_seconds: 0
    });
    
    if (!error && data) {
      queuedPages.push(pageNum);
      console.log(`📤 [COMPENSATION] Página ${pageNum} enfileirada (msg_id: ${data})`);
    } else {
      // Log de falha ao enfileirar compensação
      await createExtractionLog(supabase, runId, 3, 'Compensação', 'error',
        `❌ Falha ao enfileirar página de compensação ${pageNum}`,
        { 
          page: pageNum, 
          error: error?.message || 'pgmq_send retornou null',
          error_code: error?.code || null,
          start_page: startPage,
          total_pages: numPages
        }
      );
    }
  }
  
  return queuedPages;
}

async function markApiExhausted(supabase: any, runId: string, page: number) {
  const { data: runData } = await supabase
    .from('lead_extraction_runs')
    .select('progress_data')
    .eq('id', runId)
    .single();
  
  const progressData = runData?.progress_data || {};
  
  await supabase
    .from('lead_extraction_runs')
    .update({
      progress_data: {
        ...progressData,
        api_exhausted: true,
        api_exhausted_at_page: page
      }
    })
    .eq('id', runId);
}

// V17: Interface para resposta da IA
interface AINeighborhoodResponse {
  locations: string[];
  has_more_neighborhoods: boolean;
}

// V17: Interface para configuração da IA
interface AINeighborhoodConfig {
  model: string;
  fallback_models: string[];
  max_tokens: number;
  temperature: number;
  timeout_seconds: number;
  max_retries: number;
  max_ai_rounds: number;
  max_total_pages: number;
  system_prompt: string;
  user_prompt_city: string;
  user_prompt_state: string;
  user_prompt_additional: string;
  cache_ttl_days: number;
}

// V17: Buscar configuração da IA do banco de dados
async function getAIConfig(supabase: any): Promise<AINeighborhoodConfig | null> {
  try {
    // V20 FIX: Usar .limit(1) em vez de .single() para evitar erro quando há múltiplos registros ativos
    const { data, error } = await supabase
      .from('ai_neighborhood_config')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('[V17] Erro ao buscar configuração da IA:', error?.message, error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.error('[V17] Nenhuma configuração da IA ativa encontrada');
      return null;
    }
    
    const config = data[0] as AINeighborhoodConfig;
    console.log(`[V17] ✅ Configuração da IA carregada: modelo=${config.model}, id=${config.id || 'N/A'}`);
    return config;
  } catch (error: any) {
    console.error('[V17] Erro ao buscar configuração da IA:', error.message, error);
    return null;
  }
}

// V17: Buscar API key do OpenRouter
async function getOpenRouterApiKey(supabase: any): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', 'OPENROUTER_API_KEY')
      .single();
    
    if (error || !data?.decrypted_secret) {
      // Tentar variação do nome
      const { data: data2 } = await supabase
        .from('decrypted_secrets')
        .select('decrypted_secret')
        .eq('name', 'openrouter_api_key')
        .single();
      
      return data2?.decrypted_secret || null;
    }
    
    return data.decrypted_secret;
  } catch (error: any) {
    console.error('[V17] Erro ao buscar API key:', error.message);
    return null;
  }
}

// V17: Chamar IA com retry e fallback de modelos
async function callAIWithRetry(
  apiKey: string,
  config: AINeighborhoodConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<AINeighborhoodResponse | null> {
  const models = [config.model, ...config.fallback_models];
  
  for (const model of models) {
    for (let attempt = 1; attempt <= config.max_retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout_seconds * 1000);
        
        console.log(`[V17 AI] Chamando modelo ${model} (tentativa ${attempt}/${config.max_retries})`);
        
        const response = await fetch(OPENROUTER_URL, {
          signal: controller.signal,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://pescalead.com',
            'X-Title': 'PescaLead Neighborhood Search'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: config.max_tokens,
            temperature: config.temperature
          })
        });
        
        clearTimeout(timeoutId);
        
        // Rate limit - aguardar e tentar novamente
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          console.log(`[V17 AI] Rate limit atingido, aguardando ${retryAfter}s...`);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error('Resposta da IA vazia');
        }
        
        // Extrair JSON da resposta
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('JSON não encontrado na resposta');
        }
        
        const parsed = JSON.parse(jsonMatch[0]) as AINeighborhoodResponse;
        
        // Validar estrutura
        if (!parsed.locations || !Array.isArray(parsed.locations)) {
          throw new Error('Resposta da IA não contém array de locations');
        }
        
        // V20 FIX: Garantir que has_more_neighborhoods é boolean
        if (typeof parsed.has_more_neighborhoods !== 'boolean') {
          // Se não fornecido, assumir true (há mais bairros disponíveis)
          parsed.has_more_neighborhoods = true;
          console.warn(`[V20 AI] ⚠️ IA não retornou has_more_neighborhoods, assumindo true`);
        }
        
        console.log(`[V17 AI] ✅ Modelo ${model} retornou ${parsed.locations.length} localizações (has_more: ${parsed.has_more_neighborhoods})`);
        return parsed;
        
      } catch (error: any) {
        console.error(`[V17 AI] ❌ Erro com modelo ${model} (tentativa ${attempt}):`, error.message);
        
        if (error.name === 'AbortError') {
          console.error(`[V17 AI] Timeout após ${config.timeout_seconds}s`);
        }
        
        if (attempt === config.max_retries) {
          console.log(`[V17 AI] Modelo ${model} falhou após ${attempt} tentativas, tentando próximo modelo...`);
          break; // Tentar próximo modelo
        }
        
        // Backoff exponencial
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  console.error('[V17 AI] ❌ Todos os modelos de IA falharam');
  return null;
}

// V17: Validar e filtrar localizações da IA
function validateAndFilterAILocations(
  locations: string[],
  alreadySearched: string[],
  city: string,
  state: string
): { valid: string[]; invalid: string[]; errors: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const errors: string[] = [];
  
  const normalizedSearched = new Set(
    alreadySearched.map(l => l.toLowerCase().trim())
  );
  
  for (const loc of locations) {
    // Verificar se já foi pesquisada
    if (normalizedSearched.has(loc.toLowerCase().trim())) {
      errors.push(`Duplicada: ${loc}`);
      continue;
    }
    
    // Validar formato
    if (validateSerpdevFormat(loc)) {
      valid.push(normalizeForSerpdev(loc));
    } else {
      // Tentar corrigir automaticamente
      const fixed = fixSerpdevFormat(loc, city, state);
      if (validateSerpdevFormat(fixed)) {
        valid.push(fixed);
        errors.push(`Corrigido: ${loc} -> ${fixed}`);
      } else {
        invalid.push(loc);
        errors.push(`Formato inválido: ${loc}`);
      }
    }
  }
  
  return { valid, invalid, errors };
}

// V17: Buscar localizações do cache
async function getCachedLocations(
  supabase: any,
  city: string | null,
  state: string,
  searchTerm: string
): Promise<{ locations: string[]; hasMore: boolean } | null> {
  try {
    const { data, error } = await supabase.rpc('get_cache_locations', {
      p_city: city,
      p_state: state,
      p_search_term: searchTerm
    });
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    return {
      locations: data[0].locations || [],
      hasMore: data[0].has_more ?? true
    };
  } catch {
    return null;
  }
}

// V17: Salvar localizações no cache
async function saveCachedLocations(
  supabase: any,
  city: string | null,
  state: string,
  searchTerm: string,
  locations: string[],
  hasMore: boolean,
  locationLevel: string,
  model: string,
  ttlDays: number
): Promise<void> {
  try {
    await supabase.rpc('save_cache_locations', {
      p_city: city,
      p_state: state,
      p_search_term: searchTerm,
      p_locations: locations,
      p_has_more: hasMore,
      p_location_level: locationLevel,
      p_ai_model: model,
      p_ttl_days: ttlDays
    });
  } catch (error: any) {
    console.error('[V17] Erro ao salvar cache:', error.message);
  }
}

// V17: Buscar histórico de localizações já pesquisadas
async function getLocationSearchHistory(
  supabase: any,
  workspaceId: string,
  searchTerm: string
): Promise<Array<{ location: string; lastPage: number; exhausted: boolean; suspect: boolean }>> {
  try {
    const { data, error } = await supabase.rpc('get_location_search_history', {
      p_workspace_id: workspaceId,
      p_search_term: searchTerm
    });
    
    if (error || !data) {
      return [];
    }
    
    return data.map((row: any) => ({
      location: row.location_formatted,
      lastPage: row.last_page,
      exhausted: row.exhausted,
      suspect: row.suspect
    }));
  } catch {
    return [];
  }
}

// V17: Buscar localizações usando IA
async function fetchLocationsWithAI(
  supabase: any,
  runId: string,
  searchTerm: string,
  location: string,
  workspaceId: string,
  targetQuantity: number,
  currentCreated: number,
  aiRound: number = 1
): Promise<{ locations: string[]; hasMore: boolean; fromCache: boolean }> {
  const aiStartTime = Date.now();
  
  try {
    // Detectar nível da localização
    const locationLevel = detectLocationLevel(location);
    
    // Extrair cidade e estado
    const parts = location.split(',').map(p => p.trim());
    let city: string | null = null;
    let state = '';
    
    if (locationLevel === 'city') {
      city = parts[0];
      state = parts.length > 1 ? parts[1] : parts[0];
    } else if (locationLevel === 'state') {
      state = parts[0];
    } else {
      // neighborhood - não deve expandir
      console.log(`[V17] Localização é bairro, não expandir: ${location}`);
      return { locations: [], hasMore: false, fromCache: false };
    }
    
    // Normalizar estado
    const stateUpper = state.toUpperCase();
    const stateLower = removeAccents(state.toLowerCase());
    state = BRAZILIAN_STATES[stateUpper] || STATE_NAME_NORMALIZE[stateLower] || state;
    
    await createExtractionLog(supabase, runId, 4, 'Segmentação', 'info',
      `🤖 V17 Consultando IA para bairros (rodada ${aiRound})`,
      { location, city, state, location_level: locationLevel, ai_round: aiRound }
    );
    
    // Verificar cache (apenas na rodada 1)
    if (aiRound === 1) {
      const cached = await getCachedLocations(supabase, city, state, searchTerm);
      if (cached && cached.locations.length > 0) {
        const aiTime = Date.now() - aiStartTime;
        await createExtractionLog(supabase, runId, 4, 'Segmentação', 'success',
          `📦 Cache encontrado: ${cached.locations.length} localizações em ${aiTime}ms`,
          { 
            locations_count: cached.locations.length, 
            has_more: cached.hasMore,
            response_time_ms: aiTime,
            source: 'cache'
          }
        );
        console.log(`[V17] ✅ Cache hit: ${cached.locations.length} localizações`);
        return { ...cached, fromCache: true };
      }
    }
    
    // Buscar configuração da IA
    const config = await getAIConfig(supabase);
    if (!config) {
      await createExtractionLog(supabase, runId, 4, 'Segmentação', 'error',
        `❌ Configuração da IA não encontrada`,
        { location }
      );
      return { locations: [], hasMore: false, fromCache: false };
    }
    
    // Buscar API key
    const apiKey = await getOpenRouterApiKey(supabase);
    if (!apiKey) {
      await createExtractionLog(supabase, runId, 4, 'Segmentação', 'error',
        `❌ API key do OpenRouter não encontrada`,
        { location }
      );
      return { locations: [], hasMore: false, fromCache: false };
    }
    
    // Buscar histórico de localizações já pesquisadas
    const history = await getLocationSearchHistory(supabase, workspaceId, searchTerm);
    const alreadySearched = history.map(h => h.location);
    
    // Calcular quantidade de bairros necessários
    const leadsNeeded = Math.max(0, targetQuantity - currentCreated);
    const estimatedLeadsPerLocation = 15; // Estimativa conservadora
    const quantityNeeded = Math.max(5, Math.ceil(leadsNeeded / estimatedLeadsPerLocation));
    
    // Montar prompt baseado no nível da localização e rodada
    let userPromptTemplate = '';
    if (aiRound > 1) {
      userPromptTemplate = config.user_prompt_additional;
    } else if (locationLevel === 'state') {
      userPromptTemplate = config.user_prompt_state;
    } else {
      userPromptTemplate = config.user_prompt_city;
    }
    
    // Substituir variáveis no prompt
    const cityForPrompt = city || state;
    const stateForPrompt = state;
    
    const userPrompt = userPromptTemplate
      .replace(/{search_term}/g, searchTerm)
      .replace(/{city}/g, cityForPrompt)
      .replace(/{state}/g, stateForPrompt)
      .replace(/{quantity_needed}/g, quantityNeeded.toString())
      .replace(/{already_searched_locations}/g, alreadySearched.length > 0 ? alreadySearched.join('\n') : 'Nenhum ainda')
      .replace(/{all_searched_locations}/g, alreadySearched.length > 0 ? alreadySearched.join('\n') : 'Nenhum ainda')
      .replace(/{current_leads}/g, currentCreated.toString())
      .replace(/{target_quantity}/g, targetQuantity.toString())
      .replace(/{leads_needed}/g, leadsNeeded.toString());
    
    console.log(`[V17 AI] Chamando IA para ${locationLevel}: ${city || state}, ${state}`);
    console.log(`[V17 AI] Já pesquisados: ${alreadySearched.length} localizações`);
    console.log(`[V17 AI] Quantidade necessária: ~${quantityNeeded} localizações`);
    
    // Chamar IA
    const aiResponse = await callAIWithRetry(apiKey, config, config.system_prompt, userPrompt);
    
    const aiTime = Date.now() - aiStartTime;
    
    if (!aiResponse) {
      await createExtractionLog(supabase, runId, 4, 'Segmentação', 'error',
        `❌ IA não retornou localizações em ${aiTime}ms`,
        { location, response_time_ms: aiTime }
      );
      return { locations: [], hasMore: false, fromCache: false };
    }
    
    // Validar e filtrar localizações
    const { valid, invalid, errors } = validateAndFilterAILocations(
      aiResponse.locations,
      alreadySearched,
      cityForPrompt,
      stateForPrompt
    );
    
    // Log de validação
    if (errors.length > 0) {
      await createExtractionLog(supabase, runId, 4, 'Segmentação', 'warning',
        `⚠️ ${errors.length} problemas na validação`,
        { errors: errors.slice(0, 10), total_errors: errors.length }
      );
    }
    
    // Salvar no cache (apenas rodada 1 e se houver localizações válidas)
    if (aiRound === 1 && valid.length > 0) {
      await saveCachedLocations(
        supabase,
        city,
        state,
        searchTerm,
        valid,
        aiResponse.has_more_neighborhoods,
        locationLevel,
        config.model,
        config.cache_ttl_days
      );
    }
    
    await createExtractionLog(supabase, runId, 4, 'Segmentação', 'success',
      `✅ IA retornou ${valid.length} localizações válidas em ${aiTime}ms (rodada ${aiRound})`,
      { 
        total_returned: aiResponse.locations.length,
        valid_count: valid.length,
        invalid_count: invalid.length,
        has_more: aiResponse.has_more_neighborhoods,
        response_time_ms: aiTime,
        model: config.model,
        ai_round: aiRound,
        sample_locations: valid.slice(0, 3)
      }
    );
    
    console.log(`[V17] ✅ IA retornou ${valid.length} localizações válidas (has_more: ${aiResponse.has_more_neighborhoods})`);
    if (valid.length > 0) {
      console.log(`[V17] Primeiras localizações: ${valid.slice(0, 3).join(', ')}`);
    }
    
    return {
      locations: valid,
      hasMore: aiResponse.has_more_neighborhoods,
      fromCache: false
    };
    
  } catch (error: any) {
    const aiTime = Date.now() - aiStartTime;
    await createExtractionLog(supabase, runId, 4, 'Segmentação', 'error',
      `❌ Erro ao buscar localizações via IA: ${error.message}`,
      { 
        location, 
        error: error.message, 
        stack: error.stack,
        response_time_ms: aiTime
      }
    );
    console.error(`[V17] Erro ao buscar localizações:`, error.message);
    return { locations: [], hasMore: false, fromCache: false };
  }
}

// V16: Detectar nível de granularidade da localização
function detectLocationLevel(location: string): 'neighborhood' | 'city' | 'state' {
  const parts = location.split(',').map(p => p.trim());
  
  // V16 FIX: Lista de palavras conhecidas que devem ser ignoradas (países, continentes, etc)
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

// V17: Enfileirar buscas segmentadas por localização (strings formatadas para SerpDev)
async function enqueueSegmentedSearches(
  supabase: any,
  runId: string,
  locations: string[], // V17: Array de strings formatadas para SerpDev
  searchTerm: string,
  originalLocation: string,
  workspaceId: string,
  targetQuantity: number,
  currentCreated: number,
  filters: any,
  aiRound: number = 1
): Promise<{ enqueued: number; locations: string[] }> {
  const enqueuedLocations: string[] = [];
  let totalEnqueued = 0;
  
  // V17: Calcular quantas localizações e páginas precisamos
  const leadsNeeded = Math.max(0, targetQuantity - currentCreated);
  
  // Se meta já foi atingida, não buscar
  if (leadsNeeded === 0) {
    console.log(`[V17 EXPANSION] Meta já atingida (${currentCreated}/${targetQuantity}) - Não expandir`);
    return { enqueued: 0, locations: [] };
  }
  
  const estimatedLeadsPerPage = 10;
  const pagesNeeded = Math.ceil(leadsNeeded / estimatedLeadsPerPage);
  
  // V17: Calcular localizações a usar
  const locationsToUse = pagesNeeded > 0 ? Math.min(
    locations.length,
    Math.ceil(pagesNeeded / MAX_PAGES_PER_SEGMENT),
    MAX_SEGMENTED_SEARCHES
  ) : 0;
  
  if (locationsToUse === 0) {
    console.log(`[V17 EXPANSION] Não há necessidade de buscar localizações`);
    return { enqueued: 0, locations: [] };
  }
  
  // Calcular páginas por localização
  let maxPagesPerLocation = MAX_PAGES_PER_SEGMENT;
  
  // Se há poucas localizações, aumentar páginas por localização
  if (locations.length <= 5 && pagesNeeded > locations.length * MAX_PAGES_PER_SEGMENT) {
    const originalLimit = maxPagesPerLocation;
    maxPagesPerLocation = Math.min(10, Math.ceil(pagesNeeded / locations.length));
    console.log(`[V17 EXPANSION] Poucas localizações (${locations.length}) - Aumentando para ${maxPagesPerLocation} páginas`);
    
    await createExtractionLog(supabase, runId, 4, 'Segmentação', 'info',
      `⚙️ V17 Ajuste: Aumentando páginas por localização de ${originalLimit} para ${maxPagesPerLocation}`,
      { locations_count: locations.length, pages_needed: pagesNeeded }
    );
  }
  
  const pagesPerLocation = Math.min(
    maxPagesPerLocation,
    Math.max(1, Math.ceil(pagesNeeded / locationsToUse))
  );
  
  console.log(`[V17 EXPANSION] Leads necessários: ${leadsNeeded}`);
  console.log(`[V17 EXPANSION] Localizações disponíveis: ${locations.length}`);
  console.log(`[V17 EXPANSION] Localizações a usar: ${locationsToUse}`);
  console.log(`[V17 EXPANSION] Páginas por localização: ${pagesPerLocation}`);
  
  // Log da estratégia com detalhes completos
  const estimatedLeads = locationsToUse * pagesPerLocation * 10; // ~10 leads por página
  await createExtractionLog(supabase, runId, 4, 'Segmentação', 'info',
    `📊 V19 ESTRATÉGIA DE EXPANSÃO (rodada ${aiRound}) | ${locationsToUse} locais x ${pagesPerLocation} pág = ${locationsToUse * pagesPerLocation} páginas | Estimativa: ~${estimatedLeads} leads`,
    {
      ai_round: aiRound,
      leads_needed: leadsNeeded,
      pages_needed: pagesNeeded,
      locations_available: locations.length,
      locations_to_use: locationsToUse,
      pages_per_location: pagesPerLocation,
      total_pages: locationsToUse * pagesPerLocation,
      estimated_leads: estimatedLeads,
      leads_per_page_estimate: 10
    }
  );
  
  // Marcar início da segmentação para controle de timeout
  const { data: runData } = await supabase
    .from('lead_extraction_runs')
    .select('progress_data')
    .eq('id', runId)
    .single();
  
  const progressData = runData?.progress_data || {};
  
  await supabase
    .from('lead_extraction_runs')
    .update({
      progress_data: {
        ...progressData,
        segmentation_started_at: new Date().toISOString(),
        segmented_searches_enqueued: locationsToUse * pagesPerLocation,
        segmented_searches_completed: 0,
        current_ai_round: aiRound
      }
    })
    .eq('id', runId);
  
  // Enfileirar buscas para cada localização
  for (const locationStr of locations.slice(0, locationsToUse)) {
    // V17: A localização já vem formatada para SerpDev
    // Validar formato antes de usar
    if (!validateSerpdevFormat(locationStr)) {
      console.error(`[V17 EXPANSION] Localização com formato inválido: ${locationStr} - pulando`);
      continue;
    }
    
    // Extrair nome do bairro para o termo de busca
    const neighborhoodName = locationStr.split(',')[0].trim();
    const segmentedSearchTerm = `${searchTerm} ${neighborhoodName}`;
    
    // V20: Registrar bairro na tabela neighborhood_search_history ANTES de enfileirar
    // Isso garante que check_all_locations_exhausted funcione corretamente
    await supabase.rpc('upsert_location_search_progress', {
      p_workspace_id: workspaceId,
      p_search_term: searchTerm,
      p_location_formatted: locationStr,
      p_page: 0, // Página 0 indica que ainda não foi processado
      p_leads_found: 0,
      p_api_exhausted: false,
      p_pages_with_zero: 0
    });
    
    console.log(`📋 [V20] Bairro registrado: ${neighborhoodName} (${locationStr})`);
    
    // Buscar página inicial do histórico
    const { data: nextPageData } = await supabase.rpc('get_next_page_for_location', {
      p_workspace_id: workspaceId,
      p_search_term: searchTerm,
      p_location_formatted: locationStr
    });
    
    const startPage = nextPageData || 1;
    
    for (let page = startPage; page < startPage + pagesPerLocation; page++) {
      const isLastPage = page === startPage + pagesPerLocation - 1;
      
      const message = {
        run_id: runId,
        page: page,
        search_term: segmentedSearchTerm,
        location: locationStr, // V17: Localização já formatada para SerpDev
        workspace_id: workspaceId,
        target_quantity: targetQuantity,
        pages_in_batch: pagesPerLocation,
        is_last_page: isLastPage,
        is_compensation: false,
        is_segmented: true,
        segment_location: locationStr,
        segment_neighborhood: neighborhoodName,
        ai_round: aiRound,
        filters: filters,
        // V20 FIX: Passar termo base explicitamente para evitar parsing frágil
        search_term_base: searchTerm
      };
      
      const { data, error } = await supabase.rpc('pgmq_send', {
        queue_name: 'google_maps_queue',
        message: message,
        delay_seconds: 0
      });
      
      if (!error && data) {
        totalEnqueued++;
        if (!enqueuedLocations.includes(locationStr)) {
          enqueuedLocations.push(locationStr);
        }
        console.log(`📤 [V17 EXPANSION] ${neighborhoodName} - Página ${page} enfileirada`);
      } else {
        console.error(`❌ [V17 EXPANSION] Erro ao enfileirar ${neighborhoodName} - Página ${page}:`, error);
        
        await createExtractionLog(supabase, runId, 4, 'Segmentação', 'error',
          `❌ Falha ao enfileirar ${neighborhoodName} página ${page}`,
          { location: locationStr, page, error: error?.message }
        );
      }
    }
  }
  
  return {
    enqueued: totalEnqueued,
    locations: enqueuedLocations
  };
}

// V16 FIX #11: Verificar se há mensagens de buscas segmentadas perdidas/expiradas na fila
async function checkForLostSegmentedMessages(
  supabase: any,
  runId: string,
  segmentedSearchesEnqueued: number,
  timeoutMinutes: number = 60
): Promise<boolean> {
  try {
    if (!segmentedSearchesEnqueued || segmentedSearchesEnqueued === 0) {
      return false;
    }

    // Verificar quando essas buscas foram enfileiradas através do progress_data
    const { data: runData } = await supabase
      .from('lead_extraction_runs')
      .select('progress_data, started_at')
      .eq('id', runId)
      .single();

    if (!runData?.progress_data?.segmentation_started_at) {
      return false; // Sem timestamp, não podemos verificar timeout
    }

    const enqueuedAt = new Date(runData.progress_data.segmentation_started_at);
    const now = new Date();
    const minutesSinceEnqueued = (now.getTime() - enqueuedAt.getTime()) / (1000 * 60);
    
    // Se ainda está dentro do timeout, não considerar como perdida
    if (minutesSinceEnqueued < timeoutMinutes) {
      return false;
    }

    // Após timeout, verificar quantas mensagens segmentadas ainda estão na fila
    const { data: queueMessages, error } = await supabase.rpc('pgmq_read_batch', {
      queue_name: 'google_maps_queue',
      visibility_timeout: 0, // Não alterar visibilidade, só ler
      qty: 200 // Ler bastante para encontrar mensagens relacionadas
    });

    if (error) {
      console.log(`[V16 SEGMENTATION] Erro ao verificar fila (não crítico):`, error.message);
      // Se não conseguir verificar a fila mas já passou do timeout, considera perdida
      console.log(`[V16 SEGMENTATION] ⚠️ Timeout atingido (${minutesSinceEnqueued.toFixed(1)}min) e não foi possível verificar fila - considerando mensagens perdidas`);
      return true;
    }

    // Contar mensagens segmentadas ainda na fila para este run_id
    const messagesInQueue = queueMessages || [];
    let segmentedMessagesInQueue = 0;
    
    for (const msg of messagesInQueue) {
      const msgPayload = msg.message;
      if (msgPayload?.run_id === runId && msgPayload?.is_segmented === true) {
        segmentedMessagesInQueue++;
      }
    }

    // Verificar se há muitas mensagens faltando após timeout
    const segmentedSearchesCompleted = runData.progress_data.segmented_searches_completed || 0;
    const expectedRemaining = segmentedSearchesEnqueued - segmentedSearchesCompleted;
    
    // Se há muito mais mensagens esperadas do que na fila, considerar perdidas
    if (expectedRemaining > segmentedMessagesInQueue + 5 && minutesSinceEnqueued >= timeoutMinutes) {
      console.log(`[V16 SEGMENTATION] ⚠️ Mensagens perdidas detectadas após ${minutesSinceEnqueued.toFixed(1)} minutos (timeout: ${timeoutMinutes}min)`);
      console.log(`[V16 SEGMENTATION] ⚠️ Esperadas ${expectedRemaining} mensagens segmentadas, encontradas apenas ${segmentedMessagesInQueue} na fila`);
      return true; // Mensagens perdidas após timeout
    }

    // Log de verificação normal (mensagens ainda na fila)
    await createExtractionLog(supabase, runId, 4, 'Segmentação', 'info',
      `✅ Verificação de fila: ${segmentedMessagesInQueue} mensagens encontradas (esperadas: ${expectedRemaining})`,
      { 
        found: segmentedMessagesInQueue, 
        expected: expectedRemaining,
        age_minutes: minutesSinceEnqueued.toFixed(1),
        timeout_minutes: timeoutMinutes
      }
    );

    return false; // Mensagens ainda na fila ou dentro do timeout
  } catch (error: any) {
    console.error(`[V16 SEGMENTATION] Erro ao verificar mensagens perdidas (não crítico):`, error.message);
    return false; // Em caso de erro, não considerar como perdida para não quebrar fluxo normal
  }
}

async function checkForLostCompensationMessages(
  supabase: any,
  runId: string,
  compensationPagesQueued: number[],
  timeoutMinutes: number = 30
): Promise<boolean> {
  try {
    if (!compensationPagesQueued || compensationPagesQueued.length === 0) {
      return false;
    }

    // Verificar quando essas páginas foram enfileiradas através do progress_data
    const { data: runData } = await supabase
      .from('lead_extraction_runs')
      .select('progress_data, started_at')
      .eq('id', runId)
      .single();

    if (!runData?.progress_data?.compensation_enqueued_at) {
      return false; // Sem timestamp, não podemos verificar timeout
    }

    const enqueuedAt = new Date(runData.progress_data.compensation_enqueued_at);
    const now = new Date();
    const minutesSinceEnqueued = (now.getTime() - enqueuedAt.getTime()) / (1000 * 60);
    
    // Se ainda está dentro do timeout, não considerar como perdida
    if (minutesSinceEnqueued < timeoutMinutes) {
      return false;
    }

    // Após timeout, verificar se ainda há mensagens na fila
    // Tentar ler mensagens da fila relacionadas a este run_id
    const { data: queueMessages, error } = await supabase.rpc('pgmq_read_batch', {
      queue_name: 'google_maps_queue',
      visibility_timeout: 0, // Não alterar visibilidade, só ler
      qty: 100 // Ler bastante para encontrar mensagens relacionadas
    });

    if (error) {
      console.log(`[V15] Erro ao verificar fila (não crítico):`, error.message);
      // Se não conseguir verificar a fila mas já passou do timeout, considera perdida
      console.log(`[V15] ⚠️ Timeout atingido (${minutesSinceEnqueued.toFixed(1)}min) e não foi possível verificar fila - considerando mensagens perdidas`);
      return true;
    }

    // Verificar se há mensagens na fila para as páginas de compensação enfileiradas
    const messagesInQueue = queueMessages || [];
    const queuedPagesInQueue = new Set<number>();
    
    for (const msg of messagesInQueue) {
      const msgPayload = msg.message;
      if (msgPayload?.run_id === runId && msgPayload?.is_compensation === true) {
        queuedPagesInQueue.add(msgPayload.page);
      }
    }

    // Verificar se alguma página enfileirada não está mais na fila
    const missingPages = compensationPagesQueued.filter(page => !queuedPagesInQueue.has(page));
    
    if (missingPages.length > 0 && minutesSinceEnqueued >= timeoutMinutes) {
      console.log(`[V15] ⚠️ Mensagens perdidas detectadas após ${minutesSinceEnqueued.toFixed(1)} minutos (timeout: ${timeoutMinutes}min)`);
      console.log(`[V15] ⚠️ Páginas de compensação não encontradas na fila: ${missingPages.join(', ')}`);
      return true; // Mensagens perdidas após timeout
    }

    return false; // Mensagens ainda na fila ou dentro do timeout
  } catch (error: any) {
    console.error(`[V15] Erro ao verificar mensagens perdidas (não crítico):`, error.message);
    return false; // Em caso de erro, não considerar como perdida para não quebrar fluxo normal
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startTime = Date.now();
  let payload: any = null;
  try {
    payload = await req.json();
    console.log('\n=== FETCH-GOOGLE-MAPS V16 (EXPANSÃO POR COORDENADAS) ===');
    console.log('PAYLOAD:', JSON.stringify(payload, null, 2));

    const { 
      run_id, 
      page, 
      search_term, 
      location, 
      workspace_id, 
      is_last_page, 
      filters, 
      target_quantity, 
      is_compensation, 
      pages_in_batch,
      is_segmented, // V17: Flag de busca segmentada
      segment_neighborhood, // V17: Nome do bairro
      segment_location, // V17: Localização formatada para SerpDev
      ai_round, // V17: Rodada da IA (1, 2, 3...)
      search_term_base // V20: Termo de busca base (sem bairro) para consistência
    } = payload;

    if (!run_id) throw new Error('run_id não recebido');
    if (!page) throw new Error('page não recebido');
    if (!workspace_id) throw new Error('workspace_id não recebido');
    if (!search_term) throw new Error('search_term não recebido');
    
    // V16 FIX: Validação robusta de localização
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      throw new Error('location é obrigatório e deve ser uma string não vazia');
    }
    
    // V16 FIX #12: Validar se localização tem pelo menos uma parte relevante
    const locationParts = location.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (locationParts.length === 0) {
      throw new Error('location inválido: deve conter pelo menos cidade ou estado');
    }
    
    // V16 FIX #12: Validar se tem pelo menos uma parte com conteúdo válido (não apenas espaços/vírgulas)
    const hasValidContent = locationParts.some(part => part.length > 0 && !/^\s+$/.test(part));
    if (!hasValidContent) {
      throw new Error('location inválido: deve conter conteúdo válido (não apenas espaços ou vírgulas)');
    }

    const expandState = filters?.expand_state_search || false;
    const normalizedLocation = normalizeLocationForSerper(location, expandState);
    
    console.log(`Run: ${run_id}, Página: ${page}`);
    console.log(`Local original: ${location}`);
    console.log(`Local normalizado: ${normalizedLocation}`);
    console.log(`Expandir estado: ${expandState ? 'SIM' : 'NÃO'}`);
    console.log(`Última página: ${is_last_page ? 'SIM' : 'NÃO'}, Compensação: ${is_compensation ? 'SIM' : 'NÃO'}`);
    console.log(`Busca segmentada: ${is_segmented ? 'SIM' : 'NÃO'}${is_segmented ? ` (Bairro: ${segment_neighborhood})` : ''}`);

    const supabase = createSupabaseClient();

    // V16 FIX #4: Verificar se extração já foi finalizada - prevenir loop infinito
    const { data: runStatusCheck } = await supabase
      .from('lead_extraction_runs')
      .select('status, finished_at')
      .eq('id', run_id)
      .single();

    if (runStatusCheck?.status === 'completed' || runStatusCheck?.status === 'failed' || runStatusCheck?.finished_at) {
      console.log(`[V16] Extração ${run_id} já foi finalizada (status: ${runStatusCheck?.status}) - ignorando mensagem`);
      await createExtractionLog(supabase, run_id, 7, 'Finalização', 'warning',
        `⚠️ Tentativa de processar página ${page} após finalização - mensagem ignorada`,
        { run_id, page, status: runStatusCheck?.status, finished_at: runStatusCheck?.finished_at }
      );
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Extração já finalizada',
        run_id,
        status: runStatusCheck?.status
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // V16 FIX #5: Se skip_standard_search está ativo ou trigger_expansion, ir direto para expansão (ANTES de processar página)
    const { data: runDataCheck } = await supabase
      .from('lead_extraction_runs')
      .select('created_quantity, target_quantity, progress_data, status')
      .eq('id', run_id)
      .single();
    
    const progressDataCheck = runDataCheck?.progress_data || {};
    const triggerExpansion = payload.trigger_expansion || false;
    
    if ((progressDataCheck.skip_standard_search || triggerExpansion) && !is_segmented && !is_compensation) {
      console.log(`[V16] Busca padrão foi pulada - iniciando expansão geolocalizada automaticamente`);
      
      // Verificar se já iniciou expansão
      if (!progressDataCheck.segmentation_started_at) {
        const locationLevel = detectLocationLevel(location);
        const isCityOrState = locationLevel === 'city' || locationLevel === 'state';
        
        if (isCityOrState) {
          await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
            `🚀 V17 Iniciando expansão via IA automaticamente (busca padrão pulada)`,
            { location, location_level: locationLevel, reason: 'skip_standard_search' }
          );
          
          // V17: Buscar localizações via IA
          const totalCreated = runDataCheck?.created_quantity || 0;
          const targetQty = target_quantity || runDataCheck?.target_quantity || 30;
          
          const { locations: aiLocations, hasMore } = await fetchLocationsWithAI(
            supabase,
            run_id,
            search_term,
            location,
            workspace_id,
            targetQty,
            totalCreated,
            1 // Rodada 1
          );
          
          if (aiLocations.length > 0) {
            // V20 FIX: Usar searchTerm BASE (sem bairro) para consistência com rodadas futuras
            const searchTermForSegmentation = search_term;
            
            const { enqueued, locations: enqueuedLocationsList } = await enqueueSegmentedSearches(
              supabase,
              run_id,
              aiLocations,
              searchTermForSegmentation,
              location,
              workspace_id,
              targetQty,
              totalCreated,
              filters,
              1 // Rodada 1
            );
            
            // V17: Marcar que expansão foi iniciada
            await supabase
              .from('lead_extraction_runs')
              .update({
                progress_data: {
                  ...progressDataCheck,
                  segmentation_started_at: new Date().toISOString(),
                  segmented_searches_enqueued: enqueued,
                  segmented_locations: enqueuedLocationsList,
                  segmentation_leads_before: totalCreated,
                  has_more_neighborhoods: hasMore,
                  current_ai_round: 1
                }
              })
              .eq('id', run_id);
            
            await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'success',
              `✅ V17 Expansão iniciada: ${enqueued} páginas em ${aiLocations.length} localizações`,
              { 
                pages_enqueued: enqueued,
                locations_count: aiLocations.length,
                locations_list: enqueuedLocationsList.slice(0, 5),
                has_more: hasMore
              }
            );
            
            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Expansão via IA iniciada automaticamente',
              run_id,
              pages_enqueued: enqueued,
              locations_count: aiLocations.length
            }), { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
          } else {
            await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
              `⚠️ Nenhum bairro encontrado para expansão automática`,
              { location }
            );
            // Se não encontrou bairros, continuar com processamento normal (pode finalizar depois)
          }
        }
      } else {
        // Expansão já iniciada, retornar sem processar página padrão
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Expansão já iniciada - mensagem de busca padrão ignorada',
          run_id
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // V14: Buscar hashes existentes para este workspace (pré-verificação)
    const { data: existingLeads } = await supabase
      .from('lead_extraction_staging')
      .select('deduplication_hash')
      .eq('workspace_id', workspace_id);

    const existingHashes = new Set(existingLeads?.map(l => l.deduplication_hash) || []);
    console.log(`Hashes existentes no workspace: ${existingHashes.size}`);

    const keyIndex = ((page - 1) % TOTAL_API_KEYS) + 1;
    console.log(`Usando API Key #${keyIndex}`);
    
    // V16 FIX #7: Tentar API key principal primeiro, depois outras se necessário
    let apiKey = await getApiKey(supabase, keyIndex);
    if (!apiKey) {
      console.warn(`[API] Key #${keyIndex} não encontrada, tentando outras keys...`);
      // Tentar próxima key disponível
      for (let i = 1; i <= TOTAL_API_KEYS; i++) {
        const nextKey = await getApiKey(supabase, i);
        if (nextKey) {
          apiKey = nextKey;
          console.log(`[API] Key #${keyIndex} não encontrada, usando key #${i} como fallback`);
          break;
        }
      }
      
      if (!apiKey) {
        throw new Error(`Nenhuma API key disponível (tentou ${TOTAL_API_KEYS} keys)`);
      }
    }

    // Buscar progresso atual para exibir contexto (X de Y páginas)
    const { data: currentProgress } = await supabase
      .from('lead_extraction_runs')
      .select('pages_consumed, created_quantity, target_quantity, progress_data')
      .eq('id', run_id)
      .single();

    const pagesConsumed = (currentProgress?.pages_consumed || 0) + 1;
    const totalPagesTarget = currentProgress?.progress_data?.last_page_target || '?';
    const createdSoFar = currentProgress?.created_quantity || 0;
    const targetQty = currentProgress?.target_quantity || target_quantity;

    await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'info',
      `📄 V19 Processando página ${page}/${totalPagesTarget} (key #${keyIndex})${is_compensation ? ' (compensação)' : ''}${is_segmented ? ` (segmentado: ${segment_neighborhood})` : ''}${expandState ? ' (estado expandido)' : ''} | Leads: ${createdSoFar}/${targetQty} | Loc: "${normalizedLocation}"`,
      { page, page_progress: `${pagesConsumed}/${totalPagesTarget}`, location_original: location, location_normalized: normalizedLocation, workspace_id, is_compensation, is_segmented, segment_neighborhood, expand_state: expandState, api_key_index: keyIndex, created_so_far: createdSoFar, target: targetQty }
    );

    // V20: Buscar página com rotação de chaves (coordenadas não são mais usadas - SerpDev recebe apenas location)
    const { places: rawResults, apiEmpty, usedKeyIndex } = await fetchGoogleMapsPage(
      search_term,
      normalizedLocation,
      page,
      apiKey,
      undefined, // coordinates - não usadas
      supabase,  // V19: Passar supabase para rotação de chaves
      keyIndex,  // V19: Passar índice da chave atual
      run_id     // V20: Passar run_id para logs
    );
    console.log(`\n📥 Página ${page}: ${rawResults.length} resultados brutos, API esgotou: ${apiEmpty}, Key usada: #${usedKeyIndex || keyIndex}`);

    const validResults: any[] = [];
    let preFilterDuplicates = 0;
    let invalidResults = 0;

    for (const place of rawResults) {
      if (!isValidResult(place)) { 
        invalidResults++; 
        continue; 
      }
      
      const hashInput = `${place.cid}_${place.title}_${place.address}_${place.latitude}_${place.longitude}`;
      const hash = await sha256(hashInput);
      
      // Pré-verificação em memória
      if (existingHashes.has(hash)) { 
        preFilterDuplicates++; 
        console.log(`  ⏭️ Pré-filtro: ${place.title} (duplicata em memória)`);
        continue; 
      }
      
      existingHashes.add(hash);
      validResults.push({ ...place, _hash: hash });
    }

    console.log(`📊 Pré-filtro: ${validResults.length} candidatos, ${preFilterDuplicates} duplicatas em memória, ${invalidResults} inválidos`);

    // V18: FILTROS DE NEGÓCIO - Aplicar ANTES de contar como "criado"
    // Estes filtros determinam se o lead vai para o kanban ou não
    const minRating = filters?.min_rating ?? 0;
    const minReviews = filters?.min_reviews ?? 0;
    const requireEmail = filters?.require_email ?? false;
    const requirePhone = filters?.require_phone ?? false;
    const requireWebsite = filters?.require_website ?? false;
    
    console.log(`🔍 Filtros de negócio ativos:`);
    console.log(`   - Rating mínimo: ${minRating}`);
    console.log(`   - Avaliações mínimas: ${minReviews}`);
    console.log(`   - Requer email: ${requireEmail}`);
    console.log(`   - Requer telefone: ${requirePhone}`);
    console.log(`   - Requer website: ${requireWebsite}`);

    // V14/V18: Inserir todos de uma vez e contar os que PASSARAM nos filtros
    let actuallyCreated = 0;      // Leads que passaram nos filtros e serão migrados
    let filteredByBusiness = 0;   // Leads válidos mas que não passaram nos filtros de negócio
    let dbDuplicates = 0;
    
    for (const place of validResults) {
      const reviewsCount = place.ratingCount ?? place.reviews ?? 0;
      const placeRating = place.rating ?? 0;
      const hasPhone = !!(place.phoneNumber);
      const hasEmail = !!(place.email);
      const hasWebsite = !!(place.website);
      
      // V18: Verificar filtros de negócio
      let filterPassed = true;
      const filterReasons: string[] = [];
      
      if (minRating > 0 && placeRating < minRating) {
        filterPassed = false;
        filterReasons.push(`rating ${placeRating} < ${minRating}`);
      }
      if (minReviews > 0 && reviewsCount < minReviews) {
        filterPassed = false;
        filterReasons.push(`reviews ${reviewsCount} < ${minReviews}`);
      }
      if (requireEmail && !hasEmail) {
        filterPassed = false;
        filterReasons.push('sem email');
      }
      if (requirePhone && !hasPhone) {
        filterPassed = false;
        filterReasons.push('sem telefone');
      }
      if (requireWebsite && !hasWebsite) {
        filterPassed = false;
        filterReasons.push('sem website');
      }
      
      const insertData = {
        extraction_run_id: run_id,
        workspace_id: workspace_id,
        client_name: place.title || 'Sem nome',
        company: place.title || null,
        deduplication_hash: place._hash,
        raw_google_data: place,
        extracted_data: {
          phones: place.phoneNumber ? [{ number: place.phoneNumber, source: 'serpdev' }] : [],
          emails: place.email ? [{ address: place.email, source: 'serpdev' }] : [],
          websites: place.website ? [{ url: place.website, source: 'serpdev', type: 'main' }] : [],
          address: place.address || null,
          rating: placeRating,
          reviews: reviewsCount,
          reviews_count: reviewsCount,
          category: place.category || place.type || null,
          latitude: place.latitude || null,
          longitude: place.longitude || null,
          cid: place.cid || null,
          place_id: place.place_id || null,
          price_level: place.priceLevel || null,
          source_page: page
        },
        status_extraction: 'google_fetched',
        status_enrichment: 'pending',
        filter_passed: filterPassed,
        should_migrate: filterPassed  // V18: Só migrar se passou nos filtros
      };

      // V14: Usar insert normal e verificar erro de duplicata
      const { data: insertedData, error: insertError } = await supabase
        .from('lead_extraction_staging')
        .insert(insertData)
        .select('id')
        .single();
      
      if (insertError) {
        // Verificar se é erro de duplicata (código 23505 = unique_violation)
        if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          dbDuplicates++;
          console.log(`  ⏭️ DB Duplicata: ${place.title}`);
        } else {
          console.error(`  ❌ Erro ao inserir ${place.title}:`, insertError.message);
        }
      } else if (insertedData) {
        if (filterPassed) {
          // V18: Só contar como "criado" se passou nos filtros de negócio
          actuallyCreated++;
          console.log(`  ✅ Inserido: ${place.title} (rating: ${placeRating}, reviews: ${reviewsCount}, phone: ${hasPhone}, website: ${hasWebsite})`);
        } else {
          // V18: Lead inserido mas não conta para meta (não passou nos filtros)
          filteredByBusiness++;
          console.log(`  🚫 Filtrado: ${place.title} - ${filterReasons.join(', ')}`);
        }
      }
    }

    // V14/V18: Total de duplicatas = pré-filtro + banco
    const totalDuplicates = preFilterDuplicates + dbDuplicates;
    
    console.log(`🏁 RESULTADO FINAL:`);
    console.log(`   - Criados (passaram filtros): ${actuallyCreated}`);
    console.log(`   - Filtrados (negócio): ${filteredByBusiness}`);
    console.log(`   - Duplicatas (memória): ${preFilterDuplicates}`);
    console.log(`   - Duplicatas (banco): ${dbDuplicates}`);
    console.log(`   - Total duplicatas: ${totalDuplicates}`);
    console.log(`   - Inválidos: ${invalidResults}`);

    // V18: Atualizar métricas com valores CORRETOS (inclui filtrados por negócio)
    await supabase.rpc('increment_run_metrics', {
      p_run_id: run_id,
      p_pages: 1,
      p_found: rawResults.length,
      p_created: actuallyCreated,  // V18: Só conta leads que passaram nos filtros
      p_duplicates: totalDuplicates,
      p_filtered: invalidResults + filteredByBusiness  // V18: Inclui filtrados por negócio
    });

    // Atualizar progresso para o próximo log
    const { data: updatedProgress } = await supabase
      .from('lead_extraction_runs')
      .select('pages_consumed, created_quantity, progress_data')
      .eq('id', run_id)
      .single();

    const currentPageNum = updatedProgress?.pages_consumed || pagesConsumed;
    const totalCreatedNow = updatedProgress?.created_quantity || 0;
    const progressPercent = totalPagesTarget !== '?' ? Math.round((currentPageNum / totalPagesTarget) * 100) : 0;

    await createExtractionLog(supabase, run_id, 3, 'Google Maps', actuallyCreated > 0 ? 'success' : (apiEmpty ? 'warning' : 'info'),
      `${actuallyCreated > 0 ? '✅' : (apiEmpty ? '⚠️' : '📄')} V19 Página ${page}/${totalPagesTarget} (${progressPercent}%): ${actuallyCreated} criados, ${filteredByBusiness} filtrados, ${totalDuplicates} duplicatas${apiEmpty ? ' (API esgotou)' : ''}${is_compensation ? ' (compensação)' : ''}${is_segmented ? ` (${segment_neighborhood})` : ''} | Total: ${totalCreatedNow}/${targetQty}`,
      {
        page,
        page_progress: `${currentPageNum}/${totalPagesTarget}`,
        progress_percent: progressPercent,
        raw: rawResults.length,
        valid: validResults.length,
        created: actuallyCreated,
        filtered_business: filteredByBusiness,
        duplicates_memory: preFilterDuplicates,
        duplicates_db: dbDuplicates,
        duplicates_total: totalDuplicates,
        invalid: invalidResults,
        api_empty: apiEmpty,
        total_created_so_far: totalCreatedNow,
        target_quantity: targetQty,
        filters_applied: { min_rating: minRating, min_reviews: minReviews, require_email: requireEmail, require_phone: requirePhone, require_website: requireWebsite }
      }
    );

    if (apiEmpty) {
      await markApiExhausted(supabase, run_id, page);
    }

    if (is_last_page) {
      console.log(`\n🏁 Última página - Verificando necessidade de compensação...`);
      
      await new Promise(r => setTimeout(r, 2000));
      
      const { data: runData } = await supabase
        .from('lead_extraction_runs')
        .select('created_quantity, target_quantity, started_at, pages_consumed, progress_data')
        .eq('id', run_id)
        .single();

      if (runData) {
        // V14: Não somar 'created' pois já foi incrementado via RPC
        const totalCreated = runData.created_quantity || 0;
        
        // V16 FIX #20: Validação de target_quantity
        let targetQty = target_quantity || runData.target_quantity || 30;
        if (targetQty <= 0 || !Number.isInteger(targetQty)) {
          console.warn(`[V16] target_quantity inválido: ${targetQty}, usando padrão 30`);
          targetQty = 30;
        }
        const percentage = (totalCreated / targetQty) * 100;
        const progressData = runData.progress_data || {};
        
        // V20: Atualizar last_activity_at para detectar extrações travadas
        // Usando merge_progress_data para evitar race condition
        await supabase.rpc('merge_progress_data', {
          p_run_id: run_id,
          p_new_data: { last_activity_at: new Date().toISOString() }
        });
        const compensationCount = progressData.compensation_count || 0;
        const apiExhausted = progressData.api_exhausted || apiEmpty;
        
        // V20: Se é uma busca segmentada, processar e verificar estado
        if (is_segmented) {
          const segmentedSearchesEnqueued = progressData.segmented_searches_enqueued || 0;
          let segmentedSearchesCompleted = 0;
          
          // V20: Definir variáveis de histórico UMA VEZ
          const locationForHistory = segment_location || `${segment_neighborhood}, ${location}`;
          // V20 FIX: Usar search_term_base se disponível, senão fazer parsing (fallback)
          const searchTermBase = search_term_base || search_term.split(' ').slice(0, -1).join(' ') || search_term;
          
          console.log(`📊 [V20 EXPANSION] Busca segmentada: ${segment_neighborhood} - página ${page}`);
          
          await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'success',
            `✅ V20 Bairro processado: ${segment_neighborhood} - ${actuallyCreated} leads criados`,
            {
              neighborhood: segment_neighborhood,
              leads_created: actuallyCreated,
              duplicates: totalDuplicates,
              page: page,
              api_empty: apiEmpty,
              location_for_history: locationForHistory
            }
          );
          
          // V20: Atualizar progresso do bairro (sempre)
          const pagesWithZeroToAdd = actuallyCreated === 0 ? 1 : 0;
          
          await supabase.rpc('upsert_location_search_progress', {
            p_workspace_id: workspace_id,
            p_search_term: searchTermBase,
            p_location_formatted: locationForHistory,
            p_page: page,
            p_leads_found: actuallyCreated,
            p_api_exhausted: apiEmpty,
            p_pages_with_zero: pagesWithZeroToAdd
          });
          
          // V20: Verificar se bairro deve ser marcado como suspeito (3+ páginas com 0 leads)
          if (pagesWithZeroToAdd > 0) {
            const { data: historyCheck } = await supabase
              .from('neighborhood_search_history')
              .select('pages_with_zero_results')
              .eq('workspace_id', workspace_id)
              .ilike('search_term', searchTermBase)
              .ilike('location_formatted', locationForHistory)
              .single();
            
            if (historyCheck && historyCheck.pages_with_zero_results >= 3) {
              await supabase.rpc('mark_location_as_suspect', {
                p_workspace_id: workspace_id,
                p_search_term: searchTermBase,
                p_location_formatted: locationForHistory
              });
              
              console.warn(`⚠️ [V20] Bairro marcado como suspeito (${historyCheck.pages_with_zero_results} páginas sem leads): ${segment_neighborhood}`);
              
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
                `⚠️ V20 Bairro suspeito: ${segment_neighborhood} - ${historyCheck.pages_with_zero_results} páginas consecutivas sem leads`,
                { neighborhood: segment_neighborhood, pages_with_zero: historyCheck.pages_with_zero_results }
              );
            }
          }
          
          console.log(`📊 [V20] Bairro ${segment_neighborhood}: página ${page}, ${actuallyCreated} leads, API ${apiEmpty ? 'ESGOTADA' : 'ativa'}`);
          
          // V20: CONTINUAR BUSCANDO SE BAIRRO AINDA TEM RESULTADOS
          if (!apiEmpty) {
            const nextPage = page + 1;
            
            // Buscar quantidade atual de leads criados (pode ter mudado)
            const { data: freshRunData } = await supabase
              .from('lead_extraction_runs')
              .select('created_quantity')
              .eq('id', run_id)
              .single();
            
            const currentCreatedNow = freshRunData?.created_quantity || totalCreated;
            const needMoreLeads = currentCreatedNow < targetQty;
            
            // V20: Limite máximo de páginas por bairro aumentado para 30
            const maxPagesPerNeighborhood = 30;
            
            if (needMoreLeads && nextPage <= maxPagesPerNeighborhood) {
              console.log(`🔄 [V20] Bairro ${segment_neighborhood} ainda tem resultados - Enfileirando página ${nextPage}`);
              
              const nextMessage = {
                run_id: run_id,
                page: nextPage,
                search_term: search_term,
                location: segment_location || location,
                workspace_id: workspace_id,
                target_quantity: targetQty,
                pages_in_batch: 1,
                is_last_page: false,
                is_compensation: false,
                is_segmented: true,
                segment_location: segment_location,
                segment_neighborhood: segment_neighborhood,
                ai_round: ai_round || 1,
                filters: filters,
                // V20 FIX: Propagar search_term_base para próxima página
                search_term_base: searchTermBase
              };
              
              const { error: enqueueError } = await supabase.rpc('pgmq_send', {
                queue_name: 'google_maps_queue',
                message: nextMessage,
                delay_seconds: 0
              });
              
              if (!enqueueError) {
                await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                  `🔄 V20 Continuando: ${segment_neighborhood} página ${nextPage} enfileirada`,
                  { neighborhood: segment_neighborhood, next_page: nextPage, current_created: currentCreatedNow, need_more: needMoreLeads }
                );
              } else {
                console.error(`[V20] Erro ao enfileirar próxima página:`, enqueueError);
              }
            } else if (nextPage > maxPagesPerNeighborhood) {
              // Marcar como esgotado se atingiu limite de páginas
              await supabase.rpc('upsert_location_search_progress', {
                p_workspace_id: workspace_id,
                p_search_term: searchTermBase,
                p_location_formatted: locationForHistory,
                p_page: page,
                p_leads_found: 0,
                p_api_exhausted: true,
                p_pages_with_zero: 0
              });
              
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                `⏹️ V20 Bairro ${segment_neighborhood}: Limite de ${maxPagesPerNeighborhood} páginas atingido`,
                { neighborhood: segment_neighborhood, last_page: page, max_pages: maxPagesPerNeighborhood }
              );
            } else if (!needMoreLeads) {
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'success',
                `✅ V20 Meta atingida! ${currentCreatedNow}/${targetQty} leads - Parando busca em ${segment_neighborhood}`,
                { neighborhood: segment_neighborhood, current: currentCreatedNow, target: targetQty }
              );
            }
          } else {
            // API retornou vazio - bairro esgotado (já marcado acima via upsert_location_search_progress)
            console.log(`⏹️ [V20] Bairro ${segment_neighborhood} ESGOTADO na página ${page}`);
            await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
              `⏹️ V20 Bairro esgotado: ${segment_neighborhood} - API vazia na página ${page}`,
              { neighborhood: segment_neighborhood, last_page: page, api_empty: true }
            );
          }
          
          const { data: newCompletedValue, error: incrementError } = await supabase.rpc(
            'increment_segmented_searches_completed',
            { p_run_id: run_id }
          );
          
          if (incrementError) {
            console.error(`[V16 SEGMENTATION] Erro ao incrementar contador:`, incrementError);
            
            // V16 FIX #1/#10: Tentar UPDATE manual com incremento atômico
            // Primeiro tentar novamente a função SQL (pode ter sido temporário)
            try {
              const { data: retryValue, error: retryError } = await supabase.rpc(
                'increment_segmented_searches_completed',
                { p_run_id: run_id }
              );
              
              if (!retryError && retryValue !== null) {
                segmentedSearchesCompleted = retryValue;
                console.log(`[V16 SEGMENTATION] Retry da função SQL bem-sucedido: ${segmentedSearchesCompleted}`);
              } else {
                throw retryError || new Error('Retry falhou');
              }
            } catch (fallbackError: any) {
              // Se retry também falhou, tentar UPDATE direto via Supabase client
              // Nota: UPDATE direto não é atômico, mas melhor que não incrementar
              console.error(`[V16 SEGMENTATION] Retry falhou, tentando UPDATE direto:`, fallbackError.message);
              
              try {
                // Ler valor atual primeiro
                const { data: currentData } = await supabase
                  .from('lead_extraction_runs')
                  .select('progress_data')
                  .eq('id', run_id)
                  .single();
                
                const currentValue = (currentData?.progress_data?.segmented_searches_completed || 0);
                const newValue = currentValue + 1;
                
                // Fazer UPDATE com novo valor
                const { error: updateError } = await supabase
                  .from('lead_extraction_runs')
                  .update({
                    progress_data: {
                      ...currentData?.progress_data,
                      segmented_searches_completed: newValue
                    }
                  })
                  .eq('id', run_id);
                
                if (updateError) {
                  throw updateError;
                }
                
                segmentedSearchesCompleted = newValue;
                console.log(`[V16 SEGMENTATION] UPDATE direto bem-sucedido: ${segmentedSearchesCompleted} (pode ter race condition)`);
              } catch (updateError: any) {
                // Último recurso: ler valor atual e incrementar localmente (ainda pode ter race condition, mas melhor que não incrementar)
                console.error(`[V16 SEGMENTATION] UPDATE direto também falhou:`, updateError.message);
                const { data: fallbackData } = await supabase
                  .from('lead_extraction_runs')
                  .select('progress_data')
                  .eq('id', run_id)
                  .single();
                const currentValue = (fallbackData?.progress_data?.segmented_searches_completed || 0);
                segmentedSearchesCompleted = currentValue + 1; // V16 FIX #10: Incrementar localmente
                console.log(`[V16 SEGMENTATION] Usando fallback com incremento local: ${segmentedSearchesCompleted} (pode ter race condition)`);
              }
            }
          } else {
            segmentedSearchesCompleted = newCompletedValue || 0;
          }
          
          console.log(`📊 [V16 SEGMENTATION] Progresso: ${segmentedSearchesCompleted}/${segmentedSearchesEnqueued} páginas processadas`);
          
          // Log de progresso a cada 25% ou quando próximo do fim
          const progressPercent = (segmentedSearchesCompleted / segmentedSearchesEnqueued) * 100;
          const shouldLogProgress = 
            progressPercent >= 25 && progressPercent < 30 ||
            progressPercent >= 50 && progressPercent < 55 ||
            progressPercent >= 75 && progressPercent < 80 ||
            progressPercent >= 90;
          
          if (shouldLogProgress) {
            await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
              `📈 V16 Progresso da expansão: ${segmentedSearchesCompleted}/${segmentedSearchesEnqueued} páginas (${progressPercent.toFixed(1)}%)`,
              {
                completed: segmentedSearchesCompleted,
                enqueued: segmentedSearchesEnqueued,
                progress_percent: progressPercent.toFixed(1),
                remaining: segmentedSearchesEnqueued - segmentedSearchesCompleted,
                total_created: totalCreated,
                target: targetQty
              }
            );
          }
          
          // V16 FIX #5: Verificar timeout de buscas segmentadas
          const segmentationStartedAt = progressData.segmentation_started_at;
          let segmentationTimeoutReached = false;
          if (segmentationStartedAt) {
            const segmentationAge = Date.now() - new Date(segmentationStartedAt).getTime();
            const SEGMENTATION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas
            
            if (segmentationAge > SEGMENTATION_TIMEOUT_MS) {
              segmentationTimeoutReached = true;
              console.warn(`⚠️ [V16 SEGMENTATION] Timeout atingido após ${(segmentationAge / 1000 / 60).toFixed(1)} minutos (limite: ${SEGMENTATION_TIMEOUT_MS / 1000 / 60} minutos)`);
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
                `⚠️ V16 Timeout de expansão atingido após ${(segmentationAge / 1000 / 60).toFixed(1)} minutos - Finalizando mesmo sem todas as páginas`,
                { 
                  timeout_minutes: SEGMENTATION_TIMEOUT_MS / 1000 / 60,
                  elapsed_minutes: segmentationAge / 1000 / 60,
                  completed: segmentedSearchesCompleted,
                  enqueued: segmentedSearchesEnqueued
                }
              );
            }
          }
          
          // V16 FIX #11: Verificar se há mensagens de buscas segmentadas perdidas
          const hasLostSegmentedMessages = await checkForLostSegmentedMessages(
            supabase,
            run_id,
            segmentedSearchesEnqueued,
            60 // Timeout de 60 minutos para buscas segmentadas
          );
          
          // V20: NOVA LÓGICA BASEADA EM ESTADO DE BAIRROS
          try {
            // V20 FIX: Recalcular percentage com dados mais recentes do freshRunData
            const { data: latestRunData } = await supabase
              .from('lead_extraction_runs')
              .select('created_quantity')
              .eq('id', run_id)
              .single();
            
            const latestCreated = latestRunData?.created_quantity || totalCreated;
            const currentPercentage = (latestCreated / targetQty) * 100;
            const metaAtingida = currentPercentage >= 100; // V20: Meta é 100%, não 90%
            const hasMoreNeighborhoods = progressData.has_more_neighborhoods === true;
            const currentAiRound = progressData.current_ai_round || 1;
            // V20: SEM LIMITE DE RODADAS - IA pode rodar indefinidamente até atingir meta ou não ter mais bairros
            
            // V20: Verificar se TODOS os bairros ativos estão esgotados usando função SQL
            // Nota: searchTermBase já definido no início do bloco is_segmented
            const { data: allExhausted, error: exhaustedError } = await supabase.rpc('check_all_locations_exhausted', {
              p_workspace_id: workspace_id,
              p_search_term: searchTermBase
            });
            
            // V20 FIX: Tratar erro da função SQL
            if (exhaustedError) {
              console.error(`[V20] Erro ao verificar bairros esgotados:`, exhaustedError.message);
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'error',
                `❌ V20 Erro ao verificar estado dos bairros: ${exhaustedError.message}`,
                { error: exhaustedError.message }
              );
              throw new Error(`Falha ao verificar estado dos bairros: ${exhaustedError.message}`);
            }
            
            const allLocationsExhausted = allExhausted === true;
            
            console.log(`📊 [V20 STATE] Meta: ${percentage.toFixed(1)}%, Bairros esgotados: ${allLocationsExhausted}, IA tem mais: ${hasMoreNeighborhoods}, Rodada: ${currentAiRound} (sem limite)`);
            
            // V20: Lógica de decisão baseada em estado (ordem de prioridade)
            // 1. Se meta atingida → FINALIZAR
            // 2. Se timeout → FINALIZAR (mesmo que pudesse pedir mais)
            // 3. Se limite de rodadas atingido → FINALIZAR
            // 4. Se todos bairros esgotados E IA tem mais → PEDIR MAIS BAIRROS
            // 5. Se todos bairros esgotados E IA não tem mais → FINALIZAR
            // 6. Se ainda há bairros ativos → CONTINUAR (não finalizar)
            
            // V20 FIX: Não pedir mais bairros se timeout (SEM LIMITE DE RODADAS)
            const canRequestMore = !metaAtingida && !segmentationTimeoutReached;
            
            // V20 FIX: Buscar histórico de bairros para contexto
            const { data: locationHistory } = await supabase.rpc('get_location_search_history', {
              p_workspace_id: workspace_id,
              p_search_term: searchTermBase
            });
            
            const processedLocationsCount = locationHistory?.length || 0;
            const metaMinima = targetQty * 0.9; // Meta mínima de 90%
            const abaixoDaMetaMinima = latestCreated < metaMinima;
            
            // V20 FIX: Lógica mais agressiva - chamar IA sempre que possível para atingir meta mínima de 90%
            // Chamar IA se:
            // 1. Todos bairros esgotados E IA tem mais (comportamento original)
            // 2. OU: Meta mínima (90%) não atingida, processou pelo menos 2 bairros, E IA tem mais
            // Isso permite expansão paralela agressiva para garantir que a meta seja atingida
            const shouldRequestMoreNeighborhoods = canRequestMore && hasMoreNeighborhoods && (
              allLocationsExhausted || // Comportamento original: todos esgotados
              (abaixoDaMetaMinima && processedLocationsCount >= 2) // NOVO: meta mínima não atingida, já processou alguns bairros
            );

            // Log Granular de Decisão (Why Continued/Why Stopped)
            if (shouldRequestMoreNeighborhoods) {
              const reason = allLocationsExhausted 
                ? 'need_more_neighborhoods_all_exhausted'
                : 'need_more_neighborhoods_below_minimum';
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                `🤔 V20 Decisão: Solicitar mais bairros (${allLocationsExhausted ? 'Todos esgotados' : 'Meta mínima não atingida'}, IA tem mais)`,
                { reason, percentage: currentPercentage.toFixed(1), round: currentAiRound, processed_locations: processedLocationsCount, below_minimum: abaixoDaMetaMinima, minimum_target: metaMinima }
              );
            } else if (!metaAtingida && !allLocationsExhausted) {
               await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                `🤔 V20 Decisão: Continuar processamento (Ainda há bairros ativos)`,
                { reason: 'active_neighborhoods_remain', percentage: currentPercentage.toFixed(1) }
              );
            } else if (metaAtingida) {
               await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                `🤔 V20 Decisão: Finalizar (Meta atingida)`,
                { reason: 'meta_reached', percentage: currentPercentage.toFixed(1) }
              );
            } else if (segmentationTimeoutReached) {
               await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
                `🤔 V20 Decisão: Finalizar (Timeout de segmentação)`,
                { reason: 'timeout' }
              );
            } else if (!hasMoreNeighborhoods) {
               await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
                `🤔 V20 Decisão: Finalizar (IA sem mais bairros)`,
                { reason: 'ai_exhausted' }
              );
            }
            
            // V20 FIX: shouldFinalize só é true se NÃO vai pedir mais bairros (SEM LIMITE DE RODADAS)
            const shouldFinalize = !shouldRequestMoreNeighborhoods && (
              metaAtingida || 
              segmentationTimeoutReached || 
              (allLocationsExhausted && !hasMoreNeighborhoods)
            );
            
            await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
              `📊 V20 Estado: ${totalCreated}/${targetQty} (${percentage.toFixed(1)}%) | Bairros esgotados: ${allLocationsExhausted} | IA tem mais: ${hasMoreNeighborhoods} | Rodada: ${currentAiRound}`,
              { 
                total_created: totalCreated,
                target: targetQty,
                percentage: percentage.toFixed(1),
                all_exhausted: allLocationsExhausted,
                has_more: hasMoreNeighborhoods,
                ai_round: currentAiRound,
                should_request_more: shouldRequestMoreNeighborhoods,
                should_finalize: shouldFinalize
              }
            );
            
            // V20: Se deve pedir mais bairros à IA
            if (shouldRequestMoreNeighborhoods) {
                console.log(`🔄 [V19] Meta não atingida (${percentage.toFixed(1)}%) e há mais bairros - Iniciando rodada ${currentAiRound + 1} da IA`);
                
                await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                  `🔄 V19 Rodada ${currentAiRound} concluída - Iniciando rodada ${currentAiRound + 1} (${totalCreated}/${targetQty} leads, ${percentage.toFixed(1)}%)`,
                  { 
                    current_round: currentAiRound,
                    next_round: currentAiRound + 1,
                    total_created: totalCreated,
                    target: targetQty,
                    percentage: percentage.toFixed(1),
                    has_more_neighborhoods: hasMoreNeighborhoods
                  }
                );
                
                try {
                  // Buscar localizações já pesquisadas
                  // V20 FIX: Usar searchTermBase já definido
                  const { data: historyData } = await supabase.rpc('get_location_search_history', {
                    p_workspace_id: workspace_id,
                    p_search_term: searchTermBase
                  });
                  
                  const alreadySearched = historyData?.map((h: any) => h.location_formatted) || [];
                  
                  // Chamar IA para mais localizações
                  const { locations: newLocations, hasMore: stillHasMore } = await fetchLocationsWithAI(
                    supabase,
                    run_id,
                    searchTermBase, // V20 FIX: Usar searchTermBase
                    location,
                    workspace_id,
                    targetQty,
                    totalCreated,
                    currentAiRound + 1,
                    alreadySearched
                  );
                  
                  if (newLocations.length > 0) {
                    // V20 FIX: Usar searchTermBase consistente com rodada 1
                    const { enqueued, locations: enqueuedLocs } = await enqueueSegmentedSearches(
                      supabase,
                      run_id,
                      newLocations,
                      searchTermBase, // V20: Usar searchTermBase já definido
                      location,
                      workspace_id,
                      targetQty,
                      totalCreated,
                      filters,
                      currentAiRound + 1
                    );
                    
                    // Atualizar progress_data com nova rodada
                    await supabase
                      .from('lead_extraction_runs')
                      .update({
                        progress_data: {
                          ...progressData,
                          current_ai_round: currentAiRound + 1,
                          has_more_neighborhoods: stillHasMore,
                          segmented_searches_enqueued: enqueued,
                          segmented_searches_completed: 0,
                          segmentation_started_at: new Date().toISOString(),
                          segmented_locations: [...(progressData.segmented_locations || []), ...enqueuedLocs]
                        }
                      })
                      .eq('id', run_id);
                    
                    await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'success',
                      `✅ V19 Rodada ${currentAiRound + 1} iniciada: ${enqueued} páginas em ${newLocations.length} novos bairros`,
                      { 
                        round: currentAiRound + 1,
                        pages_enqueued: enqueued,
                        new_locations: newLocations.length,
                        still_has_more: stillHasMore
                      }
                    );
                    
                    // Não finalizar - continuar processando
                    return new Response(JSON.stringify({ 
                      success: true, 
                      message: `Rodada ${currentAiRound + 1} iniciada`,
                      run_id,
                      round: currentAiRound + 1,
                      pages_enqueued: enqueued
                    }), { 
                      status: 200, 
                      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    });
                  } else {
                    console.log(`[V20] IA não retornou mais localizações - Forçando finalização`);
                    await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
                      `⚠️ V20 IA não retornou mais localizações na rodada ${currentAiRound + 1} - Forçando finalização`,
                      { round: currentAiRound + 1 }
                    );
                    
                    // V20 FIX: Atualizar has_more_neighborhoods para false para garantir finalização
                    await supabase
                      .from('lead_extraction_runs')
                      .update({
                        progress_data: {
                          ...progressData,
                          has_more_neighborhoods: false
                        }
                      })
                      .eq('id', run_id);
                  }
                } catch (aiError: any) {
                  console.error(`[V20] Erro ao chamar IA para rodada ${currentAiRound + 1}:`, aiError.message);
                  await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'error',
                    `❌ V20 Erro ao buscar mais bairros: ${aiError.message}`,
                    { round: currentAiRound + 1, error: aiError.message }
                  );
                  
                  // V20 FIX: Em caso de erro, marcar que não há mais bairros para garantir finalização
                  await supabase
                    .from('lead_extraction_runs')
                    .update({
                      progress_data: {
                        ...progressData,
                        has_more_neighborhoods: false,
                        ai_error: aiError.message
                      }
                    })
                    .eq('id', run_id);
                }
            }
            
            // V20: Só finalizar se shouldFinalize for true
            if (shouldFinalize) {
              let finalReason = '';
              if (metaAtingida) finalReason = 'meta 100% atingida';
              else if (allLocationsExhausted && !hasMoreNeighborhoods) finalReason = 'todos bairros esgotados e IA sem mais opções';
              else if (segmentationTimeoutReached) finalReason = 'timeout de segmentação';
              else finalReason = 'condições de finalização atendidas';
              
              console.log(`✅ [V20 FINALIZATION] Finalizando extração: ${finalReason}`);
              
              const executionTimeMs = Date.now() - new Date(runData.started_at).getTime();
              const segmentationLeadsBefore = progressData.segmentation_leads_before || 0;
              const segmentationLeadsFound = totalCreated - segmentationLeadsBefore;
              
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'success',
                `🎉 V20 EXPANSÃO CONCLUÍDA: ${finalReason}`,
                {
                  final_reason: finalReason,
                  leads_before_expansion: segmentationLeadsBefore || 0,
                  leads_after_expansion: totalCreated,
                  leads_from_expansion: segmentationLeadsFound,
                  ai_rounds_used: currentAiRound,
                  all_locations_exhausted: allLocationsExhausted,
                  has_more_neighborhoods: hasMoreNeighborhoods
                }
              );
              
              // Log detalhado de decisão de finalização
              await createExtractionLog(supabase, run_id, 9, 'Finalização', 'info',
                `🏁 V20 Decisão de finalização: ${finalReason}`,
                { 
                  final_reason: finalReason,
                  meta_atingida: metaAtingida,
                  all_exhausted: allLocationsExhausted,
                  has_more: hasMoreNeighborhoods,
                  ai_round: currentAiRound,
                  max_ai_rounds: 'unlimited',
                  timeout: segmentationTimeoutReached,
                  percentage: percentage.toFixed(1)
                }
              );
              
              // V18: Verificar se há leads no staging para enriquecer
              const { count: stagingCountSeg } = await supabase
                .from('lead_extraction_staging')
                .select('*', { count: 'exact', head: true })
                .eq('extraction_run_id', run_id)
                .neq('status_enrichment', 'completed');
              
              const hasPendingEnrichmentSeg = (stagingCountSeg || 0) > 0;
              
              // V18: Mudar para status 'enriching' se há leads pendentes, senão 'completed'
              await supabase
                .from('lead_extraction_runs')
                .update({
                  status: hasPendingEnrichmentSeg ? 'enriching' : 'completed',
                  finished_at: hasPendingEnrichmentSeg ? null : new Date().toISOString(),
                  execution_time_ms: hasPendingEnrichmentSeg ? null : executionTimeMs,
                  current_step: hasPendingEnrichmentSeg 
                    ? 'Aguardando enriquecimentos e migração para o Kanban'
                    : 'Extração concluída',
                  completed_steps: hasPendingEnrichmentSeg ? 7 : 9,
                  total_steps: 9,
                  progress_data: {
                    ...progressData,
                    segmented_searches_completed: segmentedSearchesCompleted,
                    segmentation_leads_found: segmentationLeadsFound,
                    google_fetch_completed_at: new Date().toISOString(),
                    google_fetch_reason: finalReason,
                    awaiting_enrichment: hasPendingEnrichmentSeg,
                    pending_enrichment_count: stagingCountSeg || 0
                  }
                })
                .eq('id', run_id);

              const finalMessage = percentage >= 90
                ? `🎉 V16 Extração concluída após expansão! ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}%) - ${segmentationLeadsFound} leads encontrados na expansão`
                : `✅ V16 Expansão concluída: ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}%) - ${segmentationLeadsFound} leads encontrados na expansão`;
                
              // Log de métricas finais consolidadas
              await createExtractionLog(supabase, run_id, 9, 'Finalização', 'info',
                `📊 Métricas finais da extração`,
                { 
                  total_created: totalCreated,
                  target: targetQty,
                  percentage: percentage.toFixed(1),
                  pages_consumed: runData.pages_consumed || 0,
                  execution_time_ms: executionTimeMs,
                  execution_time_minutes: (executionTimeMs / 1000 / 60).toFixed(1),
                  leads_per_page: runData.pages_consumed > 0 ? (totalCreated / runData.pages_consumed).toFixed(2) : '0',
                  compensation_pages: compensationCount,
                  segmented_pages: segmentedSearchesEnqueued,
                  segmented_leads: segmentationLeadsFound,
                  segmented_leads_before: segmentationLeadsBefore,
                  neighborhoods_used: progressData.segmented_neighborhoods?.length || 0
                }
              );
                
              await createExtractionLog(supabase, run_id, 9, 'Finalização', 'success', finalMessage,
                { 
                  version: 'V16_SEGMENTATION', 
                  total_created: totalCreated, 
                  target: targetQty, 
                  percentage, 
                  execution_time_ms: executionTimeMs,
                  segmentation_leads_before: segmentationLeadsBefore,
                  segmentation_leads_found: segmentationLeadsFound,
                  segmented_searches_completed: segmentedSearchesCompleted,
                  segmented_searches_enqueued: segmentedSearchesEnqueued,
                  final_reason: finalReason
                }
              );
              
              console.log(finalMessage);
              // Continuar para retornar resposta normal
            } else {
              // V20: Ainda há bairros ativos sendo processados - NÃO FINALIZAR
              // A condição shouldFinalize é false, então há bairros que ainda não esgotaram
              console.log(`⏳ [V20] Ainda há bairros ativos - Continuando processamento`);
              console.log(`📊 [V20] Progresso: ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}%)`);
              
              // Só logar a cada 5 páginas processadas para não poluir
              if (page % 5 === 0) {
                await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                  `⏳ V20 Bairros ainda ativos: ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}%)`,
                  {
                    total_created: totalCreated,
                    target: targetQty,
                    percentage: percentage.toFixed(1),
                    all_exhausted: allLocationsExhausted,
                    has_more: hasMoreNeighborhoods,
                    ai_round: currentAiRound
                  }
                );
              }
              // Continuar para retornar resposta normal
            }
          } catch (v20Error: any) {
             console.error(`[V20] CRITICAL ERROR in decision block:`, v20Error);
             await createExtractionLog(supabase, run_id, 1, 'Segmentação', 'error',
                `❌ ERRO CRÍTICO no loop de decisão V20: ${v20Error.message}`,
                { error: v20Error.message, stack: v20Error.stack }
             );
             throw v20Error;
          }
        }
        
        console.log(`📊 Status: ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}%)`);
        console.log(`📊 Compensações já feitas: ${compensationCount}/${MAX_COMPENSATION_PAGES}`);
        console.log(`📊 API esgotou: ${apiExhausted ? 'SIM' : 'NÃO'}`);

        // V15: Verificar se há mensagens de compensação anteriores que foram perdidas
        const previousCompensationPages = progressData.compensation_pages_queued || [];
        const hasLostMessages = previousCompensationPages.length > 0 && 
          await checkForLostCompensationMessages(supabase, run_id, previousCompensationPages, 30);

        const shouldStop = 
          percentage >= 90 ||
          compensationCount >= MAX_COMPENSATION_PAGES ||
          apiExhausted ||
          hasLostMessages; // V15: Parar se mensagens foram perdidas

        if (!shouldStop) {
          const leadsNeeded = targetQty - totalCreated;
          const pagesNeeded = Math.ceil(leadsNeeded / RESULTS_PER_PAGE);
          const pagesAvailable = MAX_COMPENSATION_PAGES - compensationCount;
          const pagesToQueue = Math.min(pagesNeeded, pagesAvailable);
          
          const nextStartPage = page + 1;
          
          console.log(`⚠️ [COMPENSATION] Abaixo de 90%`);
          console.log(`   Leads necessários: ${leadsNeeded}`);
          console.log(`   Páginas calculadas: ${pagesNeeded}`);
          console.log(`   Páginas disponíveis: ${pagesAvailable}`);
          console.log(`   Páginas a enfileirar: ${pagesToQueue}`);
          
          const queuedPages = await enqueueCompensationPages(
            supabase, run_id, nextStartPage, pagesToQueue,
            search_term, location, workspace_id, targetQty, filters
          );
          
          // V15: Salvar timestamp de quando compensações foram enfileiradas
          await supabase
            .from('lead_extraction_runs')
            .update({
              progress_data: {
                ...progressData,
                compensation_count: compensationCount + pagesToQueue,
                last_compensation_page: nextStartPage + pagesToQueue - 1,
                compensation_pages_queued: queuedPages,
                compensation_enqueued_at: new Date().toISOString() // V15: Timestamp para verificação de timeout
              },
              current_step: `Buscando ${pagesToQueue} páginas extras (${nextStartPage} a ${nextStartPage + pagesToQueue - 1})`
            })
            .eq('id', run_id);
          
          await createExtractionLog(supabase, run_id, 3, 'Compensação', 'info',
            `📤 V19 Compensação INICIADA: ${pagesToQueue} páginas extras (${nextStartPage} a ${nextStartPage + pagesToQueue - 1}) | Faltam: ${leadsNeeded} leads | Progresso: ${percentage.toFixed(1)}%`,
            {
              pages_queued: pagesToQueue,
              start_page: nextStartPage,
              end_page: nextStartPage + pagesToQueue - 1,
              current_total: totalCreated,
              target: targetQty,
              leads_needed: leadsNeeded, 
              percentage, 
              leads_needed: leadsNeeded,
              pages_queued: pagesToQueue,
              queued_pages: queuedPages,
              compensation_total: compensationCount + pagesToQueue
            }
          );
          
        } else {
          // Log quando compensação não é necessária
          let compensationReason = '';
          if (percentage >= 90) compensationReason = 'meta_atingida';
          else if (apiExhausted) compensationReason = 'api_esgotou';
          else if (compensationCount >= MAX_COMPENSATION_PAGES) compensationReason = 'limite_atingido';
          else if (hasLostMessages) compensationReason = 'mensagens_perdidas';
          
          await createExtractionLog(supabase, run_id, 3, 'Compensação', 'info',
            `ℹ️ Compensação não necessária: ${compensationReason === 'meta_atingida' ? `Meta atingida (${totalCreated}/${targetQty})` : compensationReason === 'api_esgotou' ? 'API esgotou' : compensationReason === 'limite_atingido' ? `Limite atingido (${compensationCount}/${MAX_COMPENSATION_PAGES})` : 'Mensagens perdidas'} | Progresso: ${percentage.toFixed(1)}%`,
            {
              percentage: Math.round(percentage * 10) / 10,
              total_created: totalCreated,
              target_quantity: targetQty,
              api_exhausted: apiExhausted,
              compensation_count: compensationCount,
              max_compensation_pages: MAX_COMPENSATION_PAGES,
              has_lost_messages: hasLostMessages,
              reason: compensationReason,
              pages_consumed: runData.pages_consumed || 0
            }
          );
          
          // V16: Verificar se precisa expansão por coordenadas
          const segmentationEnabled = progressData.segmentation_enabled !== false; // Default: true
          const segmentationAlreadyDone = progressData.segmented_searches_enqueued > 0;
          
          // V16 CRITICAL: Detectar nível de granularidade da localização
          const locationLevel = detectLocationLevel(location);
          const isAlreadyNeighborhood = locationLevel === 'neighborhood';
          
          console.log(`[V16 LOCATION LEVEL] Localização: "${location}"`);
          console.log(`[V16 LOCATION LEVEL] Nível detectado: ${locationLevel}`);
          console.log(`[V16 LOCATION LEVEL] Já está em bairro: ${isAlreadyNeighborhood}`);
          
          // V16 FIX: Permitir expansão mesmo se compensação não foi tentada (API pode esgotar rápido)
          // V16 CRITICAL: NÃO expandir se já está em nível de bairro
          // CORREÇÃO CRÍTICA: Se API esgotou nas páginas iniciais, permitir expansão mesmo sem compensação
          const shouldTrySegmentation = 
            !isAlreadyNeighborhood && // CRITICAL: Não expandir se já está em bairro
            percentage < 90 &&
            apiExhausted && // API esgotou (pode ter sido nas páginas iniciais)
            segmentationEnabled &&
            !segmentationAlreadyDone &&
            !is_segmented; // Não estamos já em uma busca segmentada
          // REMOVIDO: (compensationCount > 0 || compensationCount >= MAX_COMPENSATION_PAGES)
          // Motivo: Se API esgotou nas páginas iniciais, compensação não faz sentido e não deve bloquear expansão
          
          if (shouldTrySegmentation) {
            console.log(`\n🌍 [V16 SEGMENTATION] API esgotou e meta não atingida - Tentando expansão por coordenadas...`);
            console.log(`   Status: ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}%)`);
            console.log(`   API esgotou: SIM`);
            console.log(`   Compensação tentada: ${compensationCount} páginas`);
            console.log(`   Nível de localização: ${locationLevel} (${isAlreadyNeighborhood ? 'NÃO expandir' : 'PODE expandir'})`);
            console.log(`   Meta não atingida: ${percentage.toFixed(1)}% < 90%`);
            console.log(`   Expansão habilitada: ${segmentationEnabled}`);
            
            await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
              `🌍 V19 LIMITE PADRÃO ATINGIDO - Iniciando expansão por bairros | Atual: ${totalCreated}/${targetQty} (${percentage.toFixed(1)}%) | Páginas consumidas: ${runData.pages_consumed || 0}`,
              {
                current_total: totalCreated,
                target: targetQty,
                percentage: Math.round(percentage * 10) / 10,
                pages_consumed: runData.pages_consumed || 0,
                api_exhausted: apiExhausted,
                compensation_count: compensationCount,
                compensation_attempted: compensationCount > 0,
                location_level: locationLevel,
                can_expand: !isAlreadyNeighborhood,
                reason: apiExhausted && compensationCount === 0 
                  ? 'API esgotou nas páginas iniciais - expandindo diretamente'
                  : 'API esgotou resultados e meta não atingida'
              }
            );
            
            // V17: Buscar localizações via IA
            await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
              `🤖 V17 Buscando localizações para "${location}" via IA...`,
              { location, search_term: search_term }
            );
            
            const { locations: aiLocations, hasMore, fromCache } = await fetchLocationsWithAI(
              supabase,
              run_id,
              search_term,
              location,
              workspace_id,
              targetQty,
              totalCreated,
              1 // Rodada 1
            );
            
            await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
              `📊 V17 Localizações encontradas: ${aiLocations.length} (cache: ${fromCache}, has_more: ${hasMore})`,
              { 
                locations_found: aiLocations.length,
                location,
                from_cache: fromCache,
                has_more: hasMore,
                locations_list: aiLocations.slice(0, 10)
              }
            );
            
            // V17: Tratar caso de array vazio
            if (aiLocations.length === 0) {
              console.error(`❌ [V17 EXPANSION] Nenhuma localização encontrada para "${location}"`);
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
                `⚠️ V17 Expansão não disponível: IA não retornou localizações para "${location}"`,
                { location, reason: 'no_locations_from_ai', current_total: totalCreated, target: targetQty }
              );
              
              // V18: Verificar se há leads no staging para enriquecer
              const { count: stagingCount } = await supabase
                .from('lead_extraction_staging')
                .select('*', { count: 'exact', head: true })
                .eq('extraction_run_id', run_id)
                .neq('status_enrichment', 'completed');
              
              const executionTimeMs = Date.now() - new Date(runData.started_at).getTime();
              const hasPendingEnrichment = (stagingCount || 0) > 0;
              
              await supabase
                .from('lead_extraction_runs')
                .update({
                  status: hasPendingEnrichment ? 'enriching' : 'completed',
                  finished_at: hasPendingEnrichment ? null : new Date().toISOString(),
                  execution_time_ms: hasPendingEnrichment ? null : executionTimeMs,
                  current_step: hasPendingEnrichment 
                    ? 'Aguardando enriquecimentos e migração' 
                    : 'Extração concluída (IA não retornou localizações)',
                  completed_steps: hasPendingEnrichment ? 7 : 9,
                  total_steps: 9,
                  progress_data: {
                    ...progressData,
                    segmentation_attempted: true,
                    segmentation_failed: true,
                    segmentation_failure_reason: 'no_locations_from_ai',
                    google_fetch_completed_at: new Date().toISOString(),
                    google_fetch_reason: 'expansão não disponível: IA não retornou localizações',
                    awaiting_enrichment: hasPendingEnrichment,
                    pending_enrichment_count: stagingCount || 0
                  }
                })
                .eq('id', run_id);
              
              await createExtractionLog(supabase, run_id, 9, 'Finalização', 'warning',
                `⚠️ V17 Extração concluída sem expansão: ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}%) - IA não retornou localizações`,
                { 
                  version: 'V17_AI_EXPANSION', 
                  total_created: totalCreated, 
                  target: targetQty, 
                  percentage,
                  execution_time_ms: executionTimeMs,
                  segmentation_failed: true,
                  reason: 'no_locations_from_ai'
                }
              );
              
              console.log(`⚠️ [V17 EXPANSION] Extração finalizada sem expansão (IA não retornou localizações)`);
            } else if (aiLocations.length > 0) {
              console.log(`✅ [V17 EXPANSION] ${aiLocations.length} localizações encontradas`);
              
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                `📋 V17 Calculando estratégia de expansão...`,
                { 
                  locations_available: aiLocations.length,
                  leads_needed: targetQty - totalCreated,
                  current_total: totalCreated,
                  target: targetQty,
                  has_more_neighborhoods: hasMore
                }
              );
              
              // V17: Enfileirar buscas segmentadas
              const segmentationResult = await enqueueSegmentedSearches(
                supabase,
                run_id,
                aiLocations,
                search_term,
                location,
                workspace_id,
                targetQty,
                totalCreated,
                filters,
                1 // Rodada 1
              );
              
              console.log(`📤 [V17 EXPANSION] ${segmentationResult.enqueued} páginas enfileiradas para ${segmentationResult.locations.length} localizações`);
              
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
                `🚀 V17 EXPANSÃO INICIADA: ${segmentationResult.enqueued} páginas em ${segmentationResult.locations.length} localizações`,
                { 
                  pages_enqueued: segmentationResult.enqueued,
                  locations_used: segmentationResult.locations.length,
                  locations_list: segmentationResult.locations.slice(0, 10),
                  leads_before_expansion: totalCreated,
                  target: targetQty,
                  has_more_neighborhoods: hasMore,
                  estimated_leads_from_expansion: (segmentationResult.enqueued * 10)
                }
              );
              
              // Atualizar progress_data
              await supabase
                .from('lead_extraction_runs')
                .update({
                  progress_data: {
                    ...progressData,
                    segmentation_enabled: true,
                    segmented_searches_enqueued: segmentationResult.enqueued,
                    segmented_locations: segmentationResult.locations,
                    segmentation_started_at: new Date().toISOString(),
                    segmentation_leads_before: totalCreated,
                    has_more_neighborhoods: hasMore,
                    current_ai_round: 1
                  },
                  current_step: `V17: Buscando em ${segmentationResult.locations.length} localizações (${segmentationResult.enqueued} páginas)`
                })
                .eq('id', run_id);
              
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'success',
                `✅ V19 Expansão pronta: ${segmentationResult.enqueued} páginas em ${segmentationResult.locations.length} localizações | Estimativa: ~${segmentationResult.enqueued * 10} leads | Bairros: ${segmentationResult.locations.slice(0, 5).join(', ')}${segmentationResult.locations.length > 5 ? '...' : ''}`,
                {
                  locations_count: segmentationResult.locations.length,
                  pages_enqueued: segmentationResult.enqueued,
                  estimated_leads: segmentationResult.enqueued * 10,
                  locations_sample: segmentationResult.locations.slice(0, 10),
                  all_locations: segmentationResult.locations,
                  has_more_available: hasMore
                }
              );
              
              // V17: Aguardar processamento das buscas segmentadas
              console.log(`⏳ [V17 EXPANSION] Aguardando processamento das buscas segmentadas...`);
              
            } else {
              console.log(`⚠️ [V17 EXPANSION] Nenhuma localização encontrada - Finalizando extração`);
              await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
                `⚠️ V17 Nenhuma localização encontrada para expansão`,
                { location }
              );
              
              // V18: Verificar se há leads no staging para enriquecer
              const { count: stagingCount2 } = await supabase
                .from('lead_extraction_staging')
                .select('*', { count: 'exact', head: true })
                .eq('extraction_run_id', run_id)
                .neq('status_enrichment', 'completed');
              
              const executionTimeMs = Date.now() - new Date(runData.started_at).getTime();
              const hasPendingEnrichment2 = (stagingCount2 || 0) > 0;
              const finalReason = 'API esgotou resultados e nenhum bairro encontrado para expansão';
              
              await supabase
                .from('lead_extraction_runs')
                .update({
                  status: hasPendingEnrichment2 ? 'enriching' : 'completed',
                  finished_at: hasPendingEnrichment2 ? null : new Date().toISOString(),
                  execution_time_ms: hasPendingEnrichment2 ? null : executionTimeMs,
                  current_step: hasPendingEnrichment2 
                    ? 'Aguardando enriquecimentos e migração'
                    : 'Extração concluída',
                  completed_steps: hasPendingEnrichment2 ? 7 : 9,
                  total_steps: 9,
                  progress_data: {
                    ...progressData,
                    api_exhausted: apiExhausted,
                    google_fetch_completed_at: new Date().toISOString(),
                    google_fetch_reason: finalReason,
                    segmentation_attempted: true,
                    segmentation_neighborhoods_found: 0,
                    awaiting_enrichment: hasPendingEnrichment2,
                    pending_enrichment_count: stagingCount2 || 0
                  }
                })
                .eq('id', run_id);

              const finalMessage = `✅ V16 Extração finalizada com ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}% - ${finalReason})`;
              
              await createExtractionLog(supabase, run_id, 9, 'Finalização', 'success', finalMessage,
                { 
                  version: 'V16_SEGMENTATION', 
                  total_created: totalCreated, 
                  target: targetQty, 
                  percentage, 
                  execution_time_ms: executionTimeMs, 
                  compensations_used: compensationCount,
                  api_exhausted: apiExhausted,
                  final_reason: finalReason
                }
              );
              
              console.log(finalMessage);
            }
          } else {
            // V17 FIX CRÍTICO: Se estamos em uma busca segmentada, NÃO finalizar aqui
            // A finalização de buscas segmentadas é feita na seção acima (quando is_segmented = true)
            if (is_segmented) {
              console.log(`[V17] Busca segmentada em andamento, não finalizar prematuramente`);
              console.log(`[V17] Esta é apenas uma página de bairro individual, aguardando outras páginas...`);
              
              // Não fazer nada - deixar o processamento continuar para outras páginas segmentadas
              // A finalização correta acontece quando segmented_searches_completed >= segmented_searches_enqueued
              return new Response(JSON.stringify({
                success: true,
                run_id,
                page,
                version: 'V17_SEGMENTED_PAGE',
                message: 'Página segmentada processada, aguardando outras páginas',
                is_segmented: true,
                segment_neighborhood: segment_neighborhood
              }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            
            // Finalização normal (sem expansão) - apenas para buscas NÃO segmentadas
            // NOTA: Se chegou aqui, significa que shouldTrySegmentation = false
            // Isso pode acontecer se:
            // - Meta já atingida (percentage >= 90)
            // - API não esgotou (apiExhausted = false)
            // - Expansão desabilitada (segmentationEnabled = false)
            // - Já está em bairro (isAlreadyNeighborhood = true)
            // - Expansão já foi feita (segmentationAlreadyDone = true)
            
            // V18: Verificar se há leads no staging para enriquecer
            const { count: stagingCount3 } = await supabase
              .from('lead_extraction_staging')
              .select('*', { count: 'exact', head: true })
              .eq('extraction_run_id', run_id)
              .neq('status_enrichment', 'completed');
            
            const executionTimeMs = Date.now() - new Date(runData.started_at).getTime();
            const hasPendingEnrichment3 = (stagingCount3 || 0) > 0;
            
            let finalReason = '';
            if (percentage >= 90) finalReason = 'meta atingida';
            else if (apiExhausted && isAlreadyNeighborhood && !segmentationAlreadyDone) finalReason = 'API esgotou resultados (busca já em bairro, não expandir)';
            else if (apiExhausted && !segmentationEnabled) finalReason = 'API esgotou resultados (expansão desabilitada)';
            else if (apiExhausted && segmentationAlreadyDone) finalReason = 'API esgotou resultados (expansão já realizada)';
            else if (apiExhausted) finalReason = 'API esgotou resultados (expansão não disponível)';
            else if (compensationCount >= MAX_COMPENSATION_PAGES) finalReason = 'limite de compensações';
            else if (hasLostMessages) finalReason = 'mensagens de compensação perdidas na fila';
            else if (segmentationAlreadyDone) finalReason = 'expansão por coordenadas já realizada';
            
            await supabase
              .from('lead_extraction_runs')
              .update({
                status: hasPendingEnrichment3 ? 'enriching' : 'completed',
                finished_at: hasPendingEnrichment3 ? null : new Date().toISOString(),
                execution_time_ms: hasPendingEnrichment3 ? null : executionTimeMs,
                current_step: hasPendingEnrichment3
                  ? 'Aguardando enriquecimentos e migração'
                  : 'Extração concluída',
                completed_steps: hasPendingEnrichment3 ? 7 : 9,
                total_steps: 9,
                progress_data: {
                  ...progressData,
                  api_exhausted: apiExhausted,
                  google_fetch_completed_at: new Date().toISOString(),
                  google_fetch_reason: finalReason,
                  awaiting_enrichment: hasPendingEnrichment3,
                  pending_enrichment_count: stagingCount3 || 0
                }
              })
              .eq('id', run_id);

            const finalMessage = percentage >= 90 
              ? `🎉 V16 Extração concluída! ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}%)`
              : `✅ V16 Extração finalizada com ${totalCreated}/${targetQty} leads (${percentage.toFixed(1)}% - ${finalReason})`;
              
            // Log de métricas finais consolidadas (sem expansão)
            await createExtractionLog(supabase, run_id, 9, 'Finalização', 'info',
              `📊 Métricas finais da extração`,
              { 
                total_created: totalCreated,
                target: targetQty,
                percentage: percentage.toFixed(1),
                pages_consumed: runData.pages_consumed || 0,
                execution_time_ms: executionTimeMs,
                execution_time_minutes: (executionTimeMs / 1000 / 60).toFixed(1),
                leads_per_page: runData.pages_consumed > 0 ? (totalCreated / runData.pages_consumed).toFixed(2) : '0',
                compensation_pages: compensationCount,
                api_exhausted: apiExhausted,
                segmentation_attempted: false
              }
            );
              
            await createExtractionLog(supabase, run_id, 9, 'Finalização', 'success', finalMessage,
              { 
                version: 'V16_SEGMENTATION', 
                total_created: totalCreated, 
                target: targetQty, 
                percentage, 
                execution_time_ms: executionTimeMs, 
                compensations_used: compensationCount,
                api_exhausted: apiExhausted,
                final_reason: finalReason,
                has_lost_messages: hasLostMessages || false
              }
            );
            
            console.log(finalMessage);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      version: 'V16_SEGMENTATION',
      run_id, page,
      api_key_used: keyIndex,
      is_segmented: is_segmented || false,
      segment_neighborhood: segment_neighborhood || null,
      results: { 
        raw: rawResults.length, 
        valid: validResults.length, 
        created: actuallyCreated, 
        duplicates_memory: preFilterDuplicates,
        duplicates_db: dbDuplicates,
        duplicates_total: totalDuplicates,
        invalid: invalidResults, 
        api_empty: apiEmpty 
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error('❌ ERRO FATAL:', error);
    
    // V16 FIX #18: Logar erros críticos em extraction_logs quando possível
    // Tentar extrair informações do payload se disponível (payload pode ser null se erro ocorreu antes de parsear)
    const errorRunId = (payload && typeof payload === 'object' && 'run_id' in payload) ? payload.run_id : null;
    const errorPage = (payload && typeof payload === 'object' && 'page' in payload) ? payload.page : null;
    const errorLocation = (payload && typeof payload === 'object' && 'location' in payload) ? payload.location : null;
    const errorSearchTerm = (payload && typeof payload === 'object' && 'search_term' in payload) ? payload.search_term : null;
    
    if (errorRunId) {
      try {
        const supabase = createSupabaseClient();
        await createExtractionLog(
          supabase,
          errorRunId,
          3,
          'Google Maps',
          'error',
          `❌ Erro fatal ao processar página ${errorPage || 'N/A'}: ${error.message || 'Erro desconhecido'}`,
          {
            error: error.message,
            stack: error.stack,
            page: errorPage || null,
            location: errorLocation || null,
            search_term: errorSearchTerm || null
          }
        );
      } catch (logError: any) {
        console.error('❌ Erro ao logar erro fatal:', logError.message);
      }
    }
    
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
