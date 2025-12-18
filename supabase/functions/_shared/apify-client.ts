// =============================================================================
// SHARED MODULE: Apify API Client
// =============================================================================
// Cliente reutilizável para Apify Web Scraper API
// Usado por: instagram-enrichment (substitui Bright Data)
//
// Documentação: https://docs.apify.com/api/v2
// Actor usado: apify/instagram-api-scraper
// =============================================================================

/**
 * Configuração do cliente Apify
 */
export interface ApifyConfig {
  apiToken: string;
  timeout?: number; // Default: 60000ms
}

/**
 * Status de uma run do Apify
 */
export type ApifyRunStatus =
  | 'READY'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMING-OUT'
  | 'TIMED-OUT'
  | 'ABORTING'
  | 'ABORTED';

/**
 * Informações de uma run do Apify
 */
export interface ApifyRunInfo {
  id: string;
  status: ApifyRunStatus;
  datasetId: string;
  defaultKeyValueStoreId: string;
  startedAt: string;
  finishedAt?: string;
  stats?: {
    inputBodyLen: number;
    restartCount: number;
    durationMillis: number;
  };
}

/**
 * Resultado do trigger de um Actor
 */
export interface ApifyActorRunResult {
  runId: string;
  datasetId: string;
  status: ApifyRunStatus;
}

/**
 * Input para o Instagram API Scraper
 * Baseado no Actor apify/instagram-api-scraper
 */
export interface InstagramScraperInput {
  directUrls?: string[];
  resultsType?: 'posts' | 'comments' | 'details' | 'mentions' | 'reels';
  resultsLimit?: number;
  addParentData?: boolean;
  searchType?: 'user' | 'hashtag' | 'place';
  searchLimit?: number;
}

/**
 * Perfil do Instagram retornado pelo Apify
 * Formato do Actor apify/instagram-api-scraper com resultsType='details'
 */
export interface ApifyInstagramProfile {
  // Identificadores
  id?: string;
  pk?: string;
  igId?: string;

  // Dados básicos
  username: string;
  fullName?: string;
  full_name?: string;
  biography?: string;
  bio?: string;

  // Imagens
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;

  // Métricas
  followersCount?: number;
  followers?: number;
  followingCount?: number;
  following?: number;
  postsCount?: number;
  mediaCount?: number;

  // Status da conta
  verified?: boolean;
  isVerified?: boolean;
  is_verified?: boolean;
  private?: boolean;
  isPrivate?: boolean;
  is_private?: boolean;
  isBusinessAccount?: boolean;
  is_business_account?: boolean;
  isProfessionalAccount?: boolean;

  // Contato
  externalUrl?: string;
  external_url?: string;
  website?: string;
  businessEmail?: string;
  business_email?: string;
  publicEmail?: string;
  public_email?: string;
  businessPhoneNumber?: string;
  business_phone_number?: string;
  publicPhoneNumber?: string;
  contactPhoneNumber?: string;

  // Business info
  businessCategoryName?: string;
  business_category_name?: string;
  categoryName?: string;
  category_name?: string;
  category?: string;

  // URL original
  url?: string;
  inputUrl?: string;

  // Erro (se houver)
  error?: string;
}

/**
 * Cliente para Apify API
 *
 * @example
 * ```typescript
 * const client = new ApifyClient({ apiToken: 'xxx' });
 *
 * // Rodar o Actor de Instagram
 * const result = await client.runInstagramScraper({
 *   directUrls: ['https://instagram.com/drdentista_sp'],
 *   resultsType: 'details',
 *   resultsLimit: 1,
 * });
 *
 * // Aguardar e buscar resultados
 * const profiles = await client.waitForResults(result.datasetId);
 * ```
 */
export class ApifyClient {
  private readonly apiToken: string;
  private readonly baseUrl = 'https://api.apify.com/v2';
  private readonly timeout: number;

  // Actor IDs
  static readonly INSTAGRAM_SCRAPER = 'apify/instagram-api-scraper';

  constructor(config: ApifyConfig) {
    if (!config.apiToken) {
      throw new Error('ApifyClient: apiToken é obrigatório');
    }
    this.apiToken = config.apiToken;
    this.timeout = config.timeout || 60000;
  }

  /**
   * Headers padrão para requisições
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch com timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs?: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = timeoutMs || this.timeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Executa um Actor e retorna informações da run
   *
   * @param actorId - ID do Actor (ex: apify/instagram-api-scraper)
   * @param input - Input para o Actor
   * @param waitSecs - Segundos para aguardar (0 = não aguardar, apenas iniciar)
   * @returns Informações da run
   */
  async runActor<T = any>(
    actorId: string,
    input: T,
    waitSecs = 0
  ): Promise<ApifyActorRunResult> {
    // Encode actor ID for URL
    const encodedActorId = actorId.replace('/', '~');
    const url = `${this.baseUrl}/acts/${encodedActorId}/runs?waitForFinish=${waitSecs}`;

    console.log(`[Apify] Running Actor ${actorId} with input:`, JSON.stringify(input).substring(0, 200));

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    }, 120000); // 2 minutos para iniciar

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apify runActor failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const runData = data.data;

    console.log(`[Apify] Run started: ${runData.id}, status: ${runData.status}, datasetId: ${runData.defaultDatasetId}`);

    return {
      runId: runData.id,
      datasetId: runData.defaultDatasetId,
      status: runData.status,
    };
  }

  /**
   * Verifica status de uma run
   *
   * @param runId - ID da run
   * @returns Informações atualizadas da run
   */
  async getRunStatus(runId: string): Promise<ApifyRunInfo> {
    const url = `${this.baseUrl}/actor-runs/${runId}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apify getRunStatus failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const runData = data.data;

    return {
      id: runData.id,
      status: runData.status,
      datasetId: runData.defaultDatasetId,
      defaultKeyValueStoreId: runData.defaultKeyValueStoreId,
      startedAt: runData.startedAt,
      finishedAt: runData.finishedAt,
      stats: runData.stats,
    };
  }

  /**
   * Busca resultados de um dataset
   *
   * @param datasetId - ID do dataset
   * @param limit - Máximo de itens (default: 1000)
   * @param offset - Offset para paginação
   * @returns Array de resultados
   */
  async getDatasetItems<T = any>(
    datasetId: string,
    limit = 1000,
    offset = 0
  ): Promise<T[]> {
    const url = `${this.baseUrl}/datasets/${datasetId}/items?limit=${limit}&offset=${offset}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.getHeaders(),
    }, 120000); // 2 minutos para download

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apify getDatasetItems failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Aguarda run ficar pronta e retorna resultados
   *
   * @param runId - ID da run
   * @param maxWaitMs - Tempo máximo de espera (default: 300000ms = 5min)
   * @param pollIntervalMs - Intervalo entre verificações (default: 5000ms)
   * @returns Array de resultados
   */
  async waitForRunResults<T = any>(
    runId: string,
    maxWaitMs = 300000,
    pollIntervalMs = 5000
  ): Promise<T[]> {
    const startTime = Date.now();

    console.log(`[Apify] Waiting for run ${runId} (max ${maxWaitMs / 1000}s)`);

    while (Date.now() - startTime < maxWaitMs) {
      const runInfo = await this.getRunStatus(runId);

      console.log(`[Apify] Run ${runId}: ${runInfo.status}`);

      if (runInfo.status === 'SUCCEEDED') {
        console.log(`[Apify] Run succeeded! Fetching results from dataset ${runInfo.datasetId}`);
        return this.getDatasetItems<T>(runInfo.datasetId);
      }

      if (runInfo.status === 'FAILED') {
        throw new Error(`Apify run failed: ${runId}`);
      }

      if (runInfo.status === 'ABORTED' || runInfo.status === 'TIMED-OUT') {
        throw new Error(`Apify run ${runInfo.status}: ${runId}`);
      }

      // Aguardar antes de próxima verificação
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timeout waiting for Apify run ${runId} after ${maxWaitMs}ms`);
  }

  /**
   * Executa o Instagram API Scraper
   *
   * @param input - Input para o scraper
   * @param waitForResults - Se deve aguardar resultados (default: true)
   * @param maxWaitMs - Tempo máximo de espera
   * @returns Resultados ou informações da run
   */
  async runInstagramScraper(
    input: InstagramScraperInput,
    waitForResults = true,
    maxWaitMs = 300000
  ): Promise<ApifyInstagramProfile[] | ApifyActorRunResult> {
    const runResult = await this.runActor(
      ApifyClient.INSTAGRAM_SCRAPER,
      input
    );

    if (!waitForResults) {
      return runResult;
    }

    return this.waitForRunResults<ApifyInstagramProfile>(
      runResult.runId,
      maxWaitMs
    );
  }

  /**
   * Scrape perfis do Instagram por URLs
   *
   * @param urls - Array de URLs de perfis
   * @param maxWaitMs - Tempo máximo de espera
   * @returns Array de perfis
   */
  async scrapeInstagramProfiles(
    urls: string[],
    maxWaitMs = 300000
  ): Promise<ApifyInstagramProfile[]> {
    console.log(`[Apify] Scraping ${urls.length} Instagram profiles`);

    const results = await this.runInstagramScraper(
      {
        directUrls: urls,
        resultsType: 'details',
        resultsLimit: 1, // 1 resultado por URL (detalhes do perfil)
      },
      true,
      maxWaitMs
    );

    return results as ApifyInstagramProfile[];
  }

  /**
   * Aborta uma run em execução
   *
   * @param runId - ID da run
   */
  async abortRun(runId: string): Promise<void> {
    const url = `${this.baseUrl}/actor-runs/${runId}/abort`;

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Apify abortRun failed: ${response.status} - ${errorText}`);
    }

    console.log(`[Apify] Run ${runId} aborted`);
  }
}

/**
 * Cria cliente Apify a partir de variável de ambiente
 *
 * @param envVarName - Nome da variável de ambiente (default: APIFY_API_TOKEN)
 * @returns Instância do cliente
 */
export function createApifyClient(envVarName = 'APIFY_API_TOKEN'): ApifyClient {
  const apiToken = Deno.env.get(envVarName);

  if (!apiToken) {
    throw new Error(`Variável de ambiente ${envVarName} não encontrada`);
  }

  return new ApifyClient({ apiToken });
}

/**
 * Normaliza perfil do Apify para formato padrão
 * Lida com diferentes formatos de resposta do Actor
 */
export function normalizeApifyProfile(profile: ApifyInstagramProfile): {
  username: string;
  full_name: string | null;
  biography: string | null;
  profile_pic_url: string | null;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  is_verified: boolean;
  is_private: boolean;
  is_business: boolean;
  external_url: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_category: string | null;
} {
  return {
    username: profile.username,
    full_name: profile.fullName || profile.full_name || null,
    biography: profile.biography || profile.bio || null,
    profile_pic_url: profile.profilePicUrl || profile.profilePicUrlHD || profile.profile_pic_url || profile.profile_pic_url_hd || null,
    followers_count: profile.followersCount || profile.followers || null,
    following_count: profile.followingCount || profile.following || null,
    posts_count: profile.postsCount || profile.mediaCount || null,
    is_verified: profile.verified || profile.isVerified || profile.is_verified || false,
    is_private: profile.private || profile.isPrivate || profile.is_private || false,
    is_business: profile.isBusinessAccount || profile.is_business_account || profile.isProfessionalAccount || false,
    external_url: profile.externalUrl || profile.external_url || profile.website || null,
    business_email: profile.businessEmail || profile.business_email || profile.publicEmail || profile.public_email || null,
    business_phone: profile.businessPhoneNumber || profile.business_phone_number || profile.publicPhoneNumber || profile.contactPhoneNumber || null,
    business_category: profile.businessCategoryName || profile.business_category_name || profile.categoryName || profile.category_name || profile.category || null,
  };
}
