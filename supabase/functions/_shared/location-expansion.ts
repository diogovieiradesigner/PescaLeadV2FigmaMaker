// =============================================================================
// SHARED MODULE: Location Expansion Utilities
// =============================================================================
// Funções compartilhadas para expansão de localização (Google Maps e Instagram)
// Inclui: detecção de nível, formatação SerpDev, chamada à IA
// =============================================================================

// =============================================================================
// CONSTANTES - Estados Brasileiros
// =============================================================================

export const BRAZILIAN_STATES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapa', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceara', 'DF': 'Distrito Federal', 'ES': 'Espirito Santo',
  'GO': 'Goias', 'MA': 'Maranhao', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Para', 'PB': 'Paraiba', 'PR': 'Parana',
  'PE': 'Pernambuco', 'PI': 'Piaui', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondonia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'Sao Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
};

export const STATE_NAME_NORMALIZE: Record<string, string> = {
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

// =============================================================================
// FUNÇÕES BÁSICAS - Formatação de Texto
// =============================================================================

/**
 * Remove acentos de uma string
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Capitaliza uma string corretamente (mantendo preposições em minúsculo)
 */
export function capitalize(str: string): string {
  return str.split(' ').map(word => {
    if (['de', 'do', 'da', 'dos', 'das', 'of'].includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// =============================================================================
// FUNÇÕES DE FORMATAÇÃO - Formato SerpDev
// =============================================================================

/**
 * Normaliza uma string para o formato SerpDev
 * Formato: "Bairro, Cidade, State of Estado, Brazil"
 */
export function normalizeForSerpdev(location: string): string {
  const withoutAccents = removeAccents(location);
  const parts = withoutAccents.split(',').map(part => capitalize(part.trim()));
  return parts.join(', ');
}

/**
 * Valida se uma localização está no formato SerpDev correto
 * Formato esperado: "Bairro, Cidade, State of Estado, Brazil"
 */
export function validateSerpdevFormat(location: string): boolean {
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

/**
 * Corrige uma localização para o formato SerpDev
 */
export function fixSerpdevFormat(location: string, city: string, state: string): string {
  const neighborhood = location.split(',')[0].trim();
  const normalizedNeighborhood = normalizeForSerpdev(neighborhood);
  const normalizedCity = normalizeForSerpdev(city);
  const normalizedState = normalizeForSerpdev(state);

  return `${normalizedNeighborhood}, ${normalizedCity}, State of ${normalizedState}, Brazil`;
}

/**
 * Normaliza uma localização para o formato do Serper API
 */
export function normalizeLocationForSerper(location: string, expandState: boolean = false): string {
  let normalized = removeAccents(location);
  const parts = normalized.split(',').map(p => p.trim());
  if (parts.length === 0) return location;

  // Se já contém "State of" e "Brazil", está formatado - apenas normalizar acentos
  const hasStateOf = parts.some(p => p.toLowerCase().includes('state of'));
  const hasBrazil = parts.some(p => ['brazil', 'brasil'].includes(p.toLowerCase()));

  if (hasStateOf && hasBrazil) {
    return parts.map(p => {
      if (p.toLowerCase().startsWith('state of')) {
        const stateName = p.substring(9).trim();
        return `State of ${capitalize(stateName)}`;
      }
      if (['brazil', 'brasil'].includes(p.toLowerCase())) {
        return 'Brazil';
      }
      return capitalize(p);
    }).join(', ');
  }

  // Detectar se primeira parte é estado conhecido
  const firstPartUpper = parts[0].toUpperCase();
  const firstPartLower = removeAccents(parts[0].toLowerCase());
  const isStateOnly = BRAZILIAN_STATES[firstPartUpper] || STATE_NAME_NORMALIZE[firstPartLower];

  let city = '';
  let state = '';
  let country = 'Brazil';

  // Se expandState e primeira parte é estado, tratar como estado puro
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

// =============================================================================
// FUNÇÃO DE DETECÇÃO DE NÍVEL - Bairro/Cidade/Estado
// =============================================================================

/**
 * Detecta o nível de granularidade da localização
 * - 'neighborhood': Bairro específico (ex: "Bancários, João Pessoa, PB")
 * - 'city': Cidade (ex: "João Pessoa, PB")
 * - 'state': Estado (ex: "Paraíba" ou "PB")
 */
export function detectLocationLevel(location: string): 'neighborhood' | 'city' | 'state' {
  const parts = location.split(',').map(p => p.trim());

  // Palavras que devem ser ignoradas (países, continentes, etc)
  const ignorarPalavras = ['brasil', 'brazil', 'br', 'américa do sul', 'america do sul', 'south america'];

  // Filtrar partes que são apenas informação geográfica genérica
  const partesRelevantes = parts.filter(part => {
    const partLower = removeAccents(part.toLowerCase());
    // Ignorar também "State of ..." que é apenas formatação
    if (partLower.startsWith('state of')) return false;
    return !ignorarPalavras.includes(partLower);
  });

  // Se cidade e estado tem o mesmo nome (ex: "Rio de Janeiro, Rio de Janeiro")
  // devemos detectar como cidade, não bairro
  // EXCEÇÃO: Se a palavra duplicada é um estado (ex: "Rondonia, Rondonia"), é estado
  if (partesRelevantes.length >= 2) {
    const first = removeAccents(partesRelevantes[0].toLowerCase());
    const second = removeAccents(partesRelevantes[1].toLowerCase());
    if (first === second) {
      // Verificar se é um estado conhecido
      const firstUpper = partesRelevantes[0].toUpperCase();
      if (BRAZILIAN_STATES[firstUpper] || STATE_NAME_NORMALIZE[first]) {
        return 'state';
      }
      // Se não for estado, é cidade com nome igual ao estado (Rio de Janeiro, etc)
      return 'city';
    }
  }

  // Se após filtrar ainda tem 3+ partes, provavelmente é bairro
  if (partesRelevantes.length >= 3) {
    return 'neighborhood';
  }

  // Se tem 2 partes relevantes, verificar se é cidade+estado ou estado duplicado
  if (partesRelevantes.length === 2) {
    const firstUpper = partesRelevantes[0].toUpperCase();
    const secondUpper = partesRelevantes[1].toUpperCase();
    const firstLower = removeAccents(partesRelevantes[0].toLowerCase());
    const secondLower = removeAccents(partesRelevantes[1].toLowerCase());

    // Se segunda parte é sigla de estado (2 letras) OU nome de estado → é cidade + estado
    if (BRAZILIAN_STATES[secondUpper] || STATE_NAME_NORMALIZE[secondLower]) {
      return 'city';
    }

    // Se primeira parte é um estado conhecido → pode ser estado sozinho ou duplicado
    if (BRAZILIAN_STATES[firstUpper] || STATE_NAME_NORMALIZE[firstLower]) {
      return 'state';
    }

    // Se nenhuma parte é estado conhecido, assumir cidade + região desconhecida
    return 'city';
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

  // Se não há partes relevantes, tratar como cidade (fallback seguro)
  if (partesRelevantes.length === 0) {
    return 'city';
  }

  // Default: cidade
  return 'city';
}

// =============================================================================
// INTERFACES PARA IA
// =============================================================================

export interface AILocationConfig {
  model: string;
  fallback_models: string[];
  system_prompt: string;
  user_prompt_city?: string;
  user_prompt_state?: string;
  user_prompt_additional?: string;
  max_tokens: number;
  temperature: number;
  max_retries: number;
  timeout_seconds: number;
  cache_ttl_days?: number;
}

export interface AILocationResponse {
  locations: string[];
  has_more_neighborhoods: boolean;
}

// =============================================================================
// CONSTANTES PARA IA
// =============================================================================

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_AI_MODEL = 'perplexity/sonar-pro';
export const AI_FALLBACK_MODELS = ['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'];
export const AI_MAX_RETRIES = 3;
export const AI_TIMEOUT_SECONDS = 60;

// =============================================================================
// FUNÇÃO DE CHAMADA À IA COM RETRY
// =============================================================================

/**
 * Chama a IA com retry e fallback de modelos
 */
export async function callAIWithRetry(
  apiKey: string,
  config: AILocationConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<AILocationResponse | null> {
  const models = [config.model, ...config.fallback_models];

  for (const model of models) {
    for (let attempt = 1; attempt <= config.max_retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout_seconds * 1000);

        console.log(`[AI] Chamando modelo ${model} (tentativa ${attempt}/${config.max_retries})`);

        const response = await fetch(OPENROUTER_URL, {
          signal: controller.signal,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://pescalead.com',
            'X-Title': 'PescaLead Location Search'
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
          console.log(`[AI] Rate limit atingido, aguardando ${retryAfter}s...`);
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

        const parsed = JSON.parse(jsonMatch[0]) as AILocationResponse;

        // Validar estrutura
        if (!parsed.locations || !Array.isArray(parsed.locations)) {
          throw new Error('Resposta da IA não contém array de locations');
        }

        // Garantir que has_more_neighborhoods é boolean
        if (typeof parsed.has_more_neighborhoods !== 'boolean') {
          parsed.has_more_neighborhoods = true;
          console.warn(`[AI] ⚠️ IA não retornou has_more_neighborhoods, assumindo true`);
        }

        console.log(`[AI] ✅ Modelo ${model} retornou ${parsed.locations.length} localizações (has_more: ${parsed.has_more_neighborhoods})`);
        return parsed;

      } catch (error: any) {
        console.error(`[AI] ❌ Erro com modelo ${model} (tentativa ${attempt}):`, error.message);

        if (error.name === 'AbortError') {
          console.error(`[AI] Timeout após ${config.timeout_seconds}s`);
        }

        if (attempt === config.max_retries) {
          console.log(`[AI] Modelo ${model} falhou após ${attempt} tentativas, tentando próximo modelo...`);
          break;
        }

        // Backoff exponencial
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.error('[AI] ❌ Todos os modelos de IA falharam');
  return null;
}

// =============================================================================
// FUNÇÃO DE VALIDAÇÃO E FILTRO DE LOCALIZAÇÕES DA IA
// =============================================================================

/**
 * Valida e filtra localizações retornadas pela IA
 */
export function validateAndFilterAILocations(
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

// =============================================================================
// FUNÇÃO DE PARSE DE LOCALIZAÇÃO
// =============================================================================

/**
 * Extrai cidade e estado de uma string de localização
 */
export function parseLocation(location: string): { city: string; state: string; neighborhood?: string } {
  const parts = location.split(',').map(p => p.trim());

  // Filtrar partes irrelevantes
  const filteredParts = parts.filter(part => {
    const partLower = removeAccents(part.toLowerCase());
    if (partLower.startsWith('state of')) return false;
    if (['brazil', 'brasil', 'br'].includes(partLower)) return false;
    return true;
  });

  // Se tem apenas 1 parte, pode ser estado ou cidade
  if (filteredParts.length === 1) {
    const partUpper = filteredParts[0].toUpperCase();
    const partLower = removeAccents(filteredParts[0].toLowerCase());

    // Verificar se é estado
    if (BRAZILIAN_STATES[partUpper]) {
      return { city: '', state: BRAZILIAN_STATES[partUpper] };
    }
    if (STATE_NAME_NORMALIZE[partLower]) {
      return { city: '', state: STATE_NAME_NORMALIZE[partLower] };
    }

    // Se não é estado, assumir cidade sem estado definido
    return { city: filteredParts[0], state: '' };
  }

  // Se tem 2 partes: cidade + estado
  if (filteredParts.length === 2) {
    const first = removeAccents(filteredParts[0].toLowerCase());
    const second = removeAccents(filteredParts[1].toLowerCase());

    // BUGFIX: Se ambas as partes são iguais E é um estado conhecido, tratar como estado
    if (first === second) {
      const partUpper = filteredParts[0].toUpperCase();
      const partLower = first;
      if (BRAZILIAN_STATES[partUpper] || STATE_NAME_NORMALIZE[partLower]) {
        // É um estado duplicado (ex: "Rondonia, Rondonia")
        return { city: '', state: STATE_NAME_NORMALIZE[partLower] || BRAZILIAN_STATES[partUpper] };
      }
    }

    const statePart = filteredParts[1].toUpperCase();
    const stateNameLower = removeAccents(filteredParts[1].toLowerCase());

    let state = '';
    if (BRAZILIAN_STATES[statePart]) {
      state = BRAZILIAN_STATES[statePart];
    } else if (STATE_NAME_NORMALIZE[stateNameLower]) {
      state = STATE_NAME_NORMALIZE[stateNameLower];
    } else {
      state = capitalize(filteredParts[1]);
    }

    return { city: filteredParts[0], state };
  }

  // Se tem 3+ partes: bairro + cidade + estado
  if (filteredParts.length >= 3) {
    const statePart = filteredParts[filteredParts.length - 1].toUpperCase();
    const stateNameLower = removeAccents(filteredParts[filteredParts.length - 1].toLowerCase());

    let state = '';
    if (BRAZILIAN_STATES[statePart]) {
      state = BRAZILIAN_STATES[statePart];
    } else if (STATE_NAME_NORMALIZE[stateNameLower]) {
      state = STATE_NAME_NORMALIZE[stateNameLower];
    } else {
      state = capitalize(filteredParts[filteredParts.length - 1]);
    }

    return {
      neighborhood: filteredParts[0],
      city: filteredParts[1],
      state
    };
  }

  return { city: '', state: '' };
}

// =============================================================================
// FUNÇÃO AUXILIAR PARA MONTAR PROMPT DA IA
// =============================================================================

/**
 * Monta o prompt para a IA buscar bairros
 */
export function buildAIPrompt(
  searchTerm: string,
  city: string,
  state: string,
  alreadySearched: string[],
  quantityNeeded: number
): string {
  const alreadySearchedStr = alreadySearched.length > 0
    ? alreadySearched.join('\n- ')
    : 'Nenhum';

  return `Preciso de bairros para buscar "${searchTerm}" em ${city}, ${state}.

BAIRROS JÁ PESQUISADOS (NÃO INCLUA ESTES):
- ${alreadySearchedStr}

Meta: Aproximadamente ${Math.min(quantityNeeded, 20)} bairros diferentes.

Critérios para seleção:
- Priorize bairros comerciais e com alta densidade de negócios
- Inclua diferentes regiões (zona norte, sul, leste, oeste, centro)
- Considere densidade populacional e áreas onde "${searchTerm}" seria comum

IMPORTANTE: Retorne as localizações no formato EXATO:
"NomeDoBairro, ${city}, State of ${state}, Brazil"

Retorne JSON no formato:
{
  "locations": ["Bairro1, ${city}, State of ${state}, Brazil", "Bairro2, ${city}, State of ${state}, Brazil", ...],
  "has_more_neighborhoods": true
}

Se não houver mais bairros relevantes para pesquisar, retorne "has_more_neighborhoods": false.`;
}
