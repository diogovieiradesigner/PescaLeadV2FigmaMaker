// =============================================================================
// EDGE FUNCTION: instagram-enrichment (Etapa 2 - Apify)
// =============================================================================
// REFATORADO: Usa Apify em vez de Bright Data para enriquecimento de perfis
//             Custo por perfil: ~$0.0026 (pay-per-use vs $250 mínimo Bright Data)
//
// Responsabilidades:
// 1. Buscar usernames descobertos na Etapa 1
// 2. Chamar Apify Actor (apify/instagram-api-scraper) para enriquecer perfis
// 3. Processar resultados e extrair contatos
// 4. Salvar em instagram_enriched_profiles
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import {
  ApifyClient,
  createApifyClient,
  ApifyInstagramProfile,
  normalizeApifyProfile,
} from '../_shared/apify-client.ts';

import {
  processEnrichedProfile,
  calculateLeadScore,
  buildProfileUrl,
  extractContactsFromBio,
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

// =============================================================================
// CONFIGURAÇÕES DE TIMEOUT E POLLING
// =============================================================================
// IMPORTANTE: Supabase Edge Functions tem limite de 400s (wall clock time)
// e 150s para resposta inicial. Para buscas grandes (1000+ leads), o Apify
// pode demorar mais, então usamos o máximo seguro.
//
// Limites Supabase (2025):
// - Wall clock time: 400s (máximo absoluto)
// - Request idle timeout: 150s (resposta inicial)
// - Background execution (Pro): até 400s após retornar
// =============================================================================
// =============================================================================
// CONFIGURAÇÕES DE LOTES PARALELOS
// =============================================================================
// Estratégia: Dividir perfis em lotes pequenos e processar em paralelo
// - Lotes menores = processamento mais rápido no Apify
// - Paralelo = aproveita melhor o tempo da Edge Function
// - 20 perfis x 5 lotes = 100 perfis em ~2 min (vs 5 min sequencial)
// =============================================================================
const BATCH_SIZE = 20; // Perfis por lote (20 = ~1 min no Apify)
const MAX_PARALLEL_BATCHES = 5; // Máximo de lotes em paralelo
const MAX_PROFILES_PER_BATCH = BATCH_SIZE * MAX_PARALLEL_BATCHES; // 100 total
const ENRICHMENT_TIMEOUT_MS = 360000; // 6 minutos de timeout total da função
const APIFY_POLL_INTERVAL_MS = 10000; // 10 segundos entre verificações
const APIFY_MAX_WAIT_MS = 360000; // 6 minutos máximo por lote
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
  console.log('🔐 Auth header present:', !!authHeader);

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  // Valida token e obtém usuário
  const token = authHeader.replace('Bearer ', '');
  console.log('🔑 Token length:', token.length);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  console.log('👤 User result:', user?.id);
  console.log('❌ Auth error:', authError?.message);

  if (authError || !user) {
    throw new Error(`Invalid authentication token: ${authError?.message || 'no user'}`);
  }

  // Verifica se usuário pertence ao workspace
  console.log('🔍 Checking workspace membership:', { userId: user.id, workspaceId });

  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .single();

  console.log('📋 Membership result:', membership);
  console.log('❌ Member error:', memberError?.message, memberError?.code);

  if (memberError || !membership) {
    throw new Error(`User does not have access to this workspace: ${memberError?.message || 'no membership'}`);
  }

  return { user, membership };
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
 * Converte perfil Apify para formato EnrichedProfile
 * ATUALIZADO: Extrai WhatsApp também dos externalUrls (array de links externos)
 */
function apifyToEnrichedProfile(apifyProfile: ApifyInstagramProfile): any {
  const normalized = normalizeApifyProfile(apifyProfile);

  // Extrai contatos da bio
  let emailFromBio: string | null = null;
  let phoneFromBio: string | null = null;
  let whatsappFromBio: string | null = null;

  if (normalized.biography) {
    const contacts = extractContactsFromBio(normalized.biography);

    if (contacts.emails.length > 0 && !normalized.business_email) {
      emailFromBio = contacts.emails[0];
    }

    if (contacts.phones.length > 0 && !normalized.business_phone) {
      phoneFromBio = contacts.phones[0];
    }

    if (contacts.whatsapps.length > 0) {
      whatsappFromBio = contacts.whatsapps[0];
    }
  }

  // === Extrai WhatsApp dos links externos (externalUrls) ===
  // Muitos perfis têm wa.me ou api.whatsapp.com nos links, não na bio
  const externalUrls = (apifyProfile as any).externalUrls || [];
  if (!whatsappFromBio && Array.isArray(externalUrls) && externalUrls.length > 0) {
    for (const linkObj of externalUrls) {
      const url = (linkObj.url || linkObj || '').toLowerCase();

      // Detecta links do WhatsApp
      if (url.includes('wa.me') || url.includes('whatsapp.com') || url.includes('api.whatsapp')) {
        // Extrai número do link wa.me/5511999999999
        const waMatch = url.match(/wa\.me\/(\d+)/);
        if (waMatch) {
          let num = waMatch[1];
          // Remove prefixo 55 se presente e número tem mais de 11 dígitos
          if (num.startsWith('55') && num.length > 11) {
            num = num.slice(2);
          }
          whatsappFromBio = num;
          break;
        }

        // Extrai número do link api.whatsapp.com/send?phone=5511999999999
        const apiMatch = url.match(/phone=(\d+)/);
        if (apiMatch) {
          let num = apiMatch[1];
          if (num.startsWith('55') && num.length > 11) {
            num = num.slice(2);
          }
          whatsappFromBio = num;
          break;
        }

        // Se tem link de WhatsApp mas não conseguiu extrair número, marca como "link"
        if (!whatsappFromBio) {
          whatsappFromBio = 'link_externo';
        }
        break;
      }
    }
  }

  // === Também verifica o external_url principal ===
  if (!whatsappFromBio && normalized.external_url) {
    const url = normalized.external_url.toLowerCase();
    if (url.includes('wa.me') || url.includes('whatsapp.com') || url.includes('api.whatsapp')) {
      const waMatch = url.match(/wa\.me\/(\d+)/);
      if (waMatch) {
        let num = waMatch[1];
        if (num.startsWith('55') && num.length > 11) {
          num = num.slice(2);
        }
        whatsappFromBio = num;
      } else {
        const apiMatch = url.match(/phone=(\d+)/);
        if (apiMatch) {
          let num = apiMatch[1];
          if (num.startsWith('55') && num.length > 11) {
            num = num.slice(2);
          }
          whatsappFromBio = num;
        } else {
          whatsappFromBio = 'link_externo';
        }
      }
    }
  }

  return {
    instagram_id: apifyProfile.id || apifyProfile.pk || apifyProfile.igId,
    username: normalized.username,
    full_name: normalized.full_name,
    biography: normalized.biography,
    profile_pic_url: normalized.profile_pic_url,
    followers_count: normalized.followers_count,
    following_count: normalized.following_count,
    posts_count: normalized.posts_count,
    is_verified: normalized.is_verified,
    is_business_account: normalized.is_business,
    is_professional_account: normalized.is_business,
    is_private: normalized.is_private,
    external_url: normalized.external_url,
    business_email: normalized.business_email,
    business_phone: normalized.business_phone,
    business_category: normalized.business_category,
    business_address: null, // Apify não retorna endereço estruturado
    email_from_bio: emailFromBio,
    phone_from_bio: phoneFromBio,
    whatsapp_from_bio: whatsappFromBio,
    raw_data: apifyProfile,
  };
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
    // ACTION: start - Iniciar enriquecimento
    // =========================================================================
    if (action === 'start') {
      console.log(`\n=== INSTAGRAM-ENRICHMENT: START ===`);
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


      // Verificar se descoberta foi concluída
      if (runData.discovery_status !== 'completed') {
        return new Response(
          JSON.stringify({
            error: 'Descoberta não foi concluída',
            discovery_status: runData.discovery_status,
          }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // =========================================================================
      // LOCK: Evitar execuções duplicadas de enriquecimento
      // Se enrichment_status já é 'running' ou 'completed', não executar novamente
      // =========================================================================
      if (runData.enrichment_status === 'running') {
        console.log(`⚠️ Enriquecimento já em execução para run ${run_id}, ignorando chamada duplicada`);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Enriquecimento já está em execução',
            status: 'already_running',
            enrichment_status: runData.enrichment_status,
          }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      if (runData.enrichment_status === 'completed') {
        console.log(`⚠️ Enriquecimento já concluído para run ${run_id}, ignorando chamada duplicada`);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Enriquecimento já foi concluído',
            status: 'already_completed',
            enrichment_status: runData.enrichment_status,
          }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // =========================================================================
      // LOCK ATÔMICO: Tentar adquirir lock usando UPDATE com WHERE
      // Isso garante que apenas uma execução consegue iniciar
      // =========================================================================
      const { data: lockAcquired, error: lockError } = await supabase
        .from('lead_extraction_runs')
        .update({
          enrichment_status: 'running',
          status: 'enriching',
        })
        .eq('id', run_id)
        .in('enrichment_status', ['pending', null]) // Só atualiza se ainda não iniciou
        .select('id')
        .single();

      if (lockError || !lockAcquired) {
        console.log(`⚠️ Não conseguiu adquirir lock para run ${run_id} - provavelmente já em execução`);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Enriquecimento já iniciado por outra instância',
            status: 'lock_not_acquired',
          }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      console.log(`🔒 Lock adquirido para run ${run_id}`)

      // Buscar perfis descobertos que ainda não foram enviados para enriquecimento
      const { data: discoveryResults, error: discoveryError } = await supabase
        .from('instagram_discovery_results')
        .select('id, username, profile_url')
        .eq('run_id', run_id)
        .eq('is_valid', true)
        .eq('is_duplicate', false)
        .eq('sent_to_enrichment', false)
        .limit(MAX_PROFILES_PER_BATCH);

      if (discoveryError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar perfis descobertos', details: discoveryError }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      if (!discoveryResults || discoveryResults.length === 0) {
        // Verificar se há perfis pendentes
        const { count: pendingCount } = await supabase
          .from('instagram_discovery_results')
          .select('id', { count: 'exact' })
          .eq('run_id', run_id)
          .eq('is_valid', true)
          .eq('is_duplicate', false)
          .eq('sent_to_enrichment', false);

        if (pendingCount === 0) {
          // Todos os perfis já foram enriquecidos
          await supabase
            .from('lead_extraction_runs')
            .update({
              status: 'enriching',
              enrichment_status: 'completed',
              enrichment_completed_at: new Date().toISOString(),
            })
            .eq('id', run_id);

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Todos os perfis já foram enriquecidos',
              profiles_pending: 0,
            }),
            { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log(`📋 Perfis para enriquecer: ${discoveryResults?.length || 0}`);

      // Atualizar enrichment_profiles_total (status já foi setado pelo lock atômico acima)
      await supabase
        .from('lead_extraction_runs')
        .update({
          enrichment_profiles_total: runData.discovery_profiles_unique,
        })
        .eq('id', run_id);

      await createLog(
        supabase, run_id, 5, 'Inicialização', 'enrichment', 'info',
        `Iniciando enriquecimento de ${discoveryResults?.length} perfis com Apify`,
        { profiles_count: discoveryResults?.length }
      );

      // Criar cliente Apify
      let apifyClient: ApifyClient;
      try {
        apifyClient = createApifyClient('APIFY_API_TOKEN');
      } catch (error) {
        await supabase
          .from('lead_extraction_runs')
          .update({
            enrichment_status: 'failed',
            error_message: 'Não foi possível criar cliente Apify',
          })
          .eq('id', run_id);

        await createLog(
          supabase, run_id, 5, 'API Client', 'enrichment', 'error',
          'Falha ao criar cliente Apify',
          { error: String(error) }
        );

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Falha ao criar cliente Apify. Verifique se o token está configurado.',
            error_code: 'APIFY_CLIENT_ERROR',
          }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // =========================================================================
      // PROCESSAMENTO EM LOTES PARALELOS
      // =========================================================================
      // Estratégia: Dividir perfis em lotes de 20 e processar em paralelo
      // Isso é muito mais rápido que enviar 100 de uma vez porque:
      // 1. Lotes menores = Apify processa mais rápido
      // 2. Paralelo = não precisa esperar um terminar para começar outro
      // 3. Se um lote falhar, os outros continuam
      // =========================================================================

      const allUrls = discoveryResults!.map(profile => profile.profile_url);
      const totalProfiles = allUrls.length;

      // Dividir em lotes de BATCH_SIZE
      const batches: string[][] = [];
      for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
        batches.push(allUrls.slice(i, i + BATCH_SIZE));
      }

      console.log(`📤 Dividindo ${totalProfiles} perfis em ${batches.length} lotes de até ${BATCH_SIZE} perfis cada`);
      console.log(`   Lotes: ${batches.map((b, i) => `#${i + 1}(${b.length})`).join(', ')}`);

      await createLog(
        supabase, run_id, 6, 'Batch', 'enrichment', 'info',
        `Dividindo ${totalProfiles} perfis em ${batches.length} lotes paralelos de ${BATCH_SIZE}`,
        {
          total_profiles: totalProfiles,
          batch_count: batches.length,
          batch_size: BATCH_SIZE,
          usernames: discoveryResults!.map(p => p.username).slice(0, 20) // Primeiros 20 para log
        }
      );

      // Marcar perfis como enviados para enriquecimento ANTES de começar
      const discoveryIds = discoveryResults!.map(p => p.id);
      await supabase
        .from('instagram_discovery_results')
        .update({ sent_to_enrichment: true })
        .in('id', discoveryIds);

      // =========================================================================
      // DISPARAR TODOS OS LOTES EM PARALELO
      // =========================================================================
      interface BatchResult {
        batchIndex: number;
        runId: string;
        datasetId: string;
        urlCount: number;
        status: 'pending' | 'running' | 'succeeded' | 'failed';
        profiles: ApifyInstagramProfile[];
        error?: string;
      }

      const batchResults: BatchResult[] = [];

      // Função para processar um lote
      async function processBatch(urls: string[], batchIndex: number): Promise<BatchResult> {
        const result: BatchResult = {
          batchIndex,
          runId: '',
          datasetId: '',
          urlCount: urls.length,
          status: 'pending',
          profiles: [],
        };

        try {
          console.log(`   [Lote ${batchIndex + 1}] Disparando ${urls.length} perfis...`);

          // Disparar Actor
          const runResult = await apifyClient.runActor(
            ApifyClient.INSTAGRAM_SCRAPER,
            {
              directUrls: urls,
              resultsType: 'details',
              resultsLimit: 1,
            }
          );

          result.runId = runResult.runId;
          result.datasetId = runResult.datasetId;
          result.status = 'running';

          console.log(`   [Lote ${batchIndex + 1}] Run criada: ${runResult.runId}`);

          // Polling para aguardar conclusão deste lote
          const startTime = Date.now();
          let apifyStatus = 'RUNNING';

          while (Date.now() - startTime < APIFY_MAX_WAIT_MS) {
            await new Promise(resolve => setTimeout(resolve, APIFY_POLL_INTERVAL_MS));

            try {
              const runInfo = await apifyClient.getRunStatus(runResult.runId);
              apifyStatus = runInfo.status;
              result.datasetId = runInfo.datasetId || result.datasetId;

              if (apifyStatus === 'SUCCEEDED') {
                console.log(`   [Lote ${batchIndex + 1}] ✅ Concluído em ${Math.round((Date.now() - startTime) / 1000)}s`);
                result.status = 'succeeded';

                // Buscar resultados
                const profiles = await apifyClient.getDatasetItems<ApifyInstagramProfile>(result.datasetId);
                result.profiles = profiles;
                break;
              }

              if (apifyStatus === 'FAILED' || apifyStatus === 'ABORTED' || apifyStatus === 'TIMED-OUT') {
                console.error(`   [Lote ${batchIndex + 1}] ❌ Falhou: ${apifyStatus}`);
                result.status = 'failed';
                result.error = `Apify run ${apifyStatus}`;
                break;
              }
            } catch (pollError) {
              console.warn(`   [Lote ${batchIndex + 1}] Erro ao verificar status:`, pollError);
            }
          }

          // Timeout
          if (result.status === 'running') {
            console.warn(`   [Lote ${batchIndex + 1}] ⚠️ Timeout após ${APIFY_MAX_WAIT_MS / 1000}s`);
            result.status = 'failed';
            result.error = 'Timeout aguardando Apify';
          }

        } catch (error) {
          console.error(`   [Lote ${batchIndex + 1}] ❌ Erro:`, error);
          result.status = 'failed';
          result.error = String(error);
        }

        return result;
      }

      // Disparar TODOS os lotes em paralelo usando Promise.all
      console.log(`\n🚀 Disparando ${batches.length} lotes em paralelo...`);

      const batchPromises = batches.map((urls, index) => processBatch(urls, index));
      const completedBatches = await Promise.all(batchPromises);

      // Salvar run_ids dos lotes (para referência futura)
      const apifyRunIds = completedBatches.map(b => b.runId).filter(Boolean);
      await supabase
        .from('lead_extraction_runs')
        .update({
          enrichment_snapshot_id: apifyRunIds.join(','), // Múltiplos run_ids separados por vírgula
        })
        .eq('id', run_id);

      // =========================================================================
      // CONSOLIDAR RESULTADOS DE TODOS OS LOTES
      // =========================================================================
      const successfulBatches = completedBatches.filter(b => b.status === 'succeeded');
      const failedBatches = completedBatches.filter(b => b.status === 'failed');

      console.log(`\n📊 Resultados dos lotes:`);
      console.log(`   ✅ Bem-sucedidos: ${successfulBatches.length}/${batches.length}`);
      console.log(`   ❌ Falhos: ${failedBatches.length}/${batches.length}`);

      // Coletar todos os perfis dos lotes bem-sucedidos
      const results: ApifyInstagramProfile[] = [];
      for (const batch of successfulBatches) {
        results.push(...batch.profiles);
      }

      console.log(`📥 Total de perfis recebidos: ${results.length}`);

      await createLog(
        supabase, run_id, 7, 'Batch', 'enrichment', 'info',
        `Lotes concluídos: ${successfulBatches.length}/${batches.length} bem-sucedidos, ${results.length} perfis recebidos`,
        {
          successful_batches: successfulBatches.length,
          failed_batches: failedBatches.length,
          total_profiles: results.length,
          failed_errors: failedBatches.map(b => ({ batch: b.batchIndex, error: b.error }))
        }
      );

      // Se todos os lotes falharam, retornar erro
      if (successfulBatches.length === 0) {
        await supabase
          .from('lead_extraction_runs')
          .update({
            enrichment_status: 'failed',
            error_message: 'Todos os lotes falharam',
          })
          .eq('id', run_id);

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Todos os lotes de enriquecimento falharam',
            failed_batches: failedBatches.map(b => ({ batch: b.batchIndex, error: b.error })),
          }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // Processar e salvar resultados
      let enrichedCount = 0;
      let failedCount = 0;

      for (const rawProfile of results) {
        try {
          // Verificar se houve erro
          if (rawProfile.error) {
            console.log(`   ⚠️ Erro no perfil: ${rawProfile.url || rawProfile.inputUrl || 'unknown'} - ${rawProfile.error}`);
            failedCount++;
            continue;
          }

          // Skip se não tem username
          if (!rawProfile.username) {
            console.log(`   ⚠️ Perfil sem username, ignorando`);
            failedCount++;
            continue;
          }

          // Converter para formato enriquecido
          const enrichedProfile = apifyToEnrichedProfile(rawProfile);

          // Log detalhado do perfil enriquecido
          console.log(`   📱 @${enrichedProfile.username} - ${enrichedProfile.full_name || 'Sem nome'}`);
          console.log(`      👥 ${enrichedProfile.followers_count || 0} seguidores | 📸 ${enrichedProfile.posts_count || 0} posts`);
          console.log(`      🔗 Website: ${enrichedProfile.external_url || 'Nenhum'}`);
          console.log(`      📧 Email: ${enrichedProfile.business_email || enrichedProfile.email_from_bio || 'Nenhum'}`);
          console.log(`      📱 Phone: ${enrichedProfile.business_phone || enrichedProfile.phone_from_bio || 'Nenhum'}`);
          console.log(`      💬 WhatsApp: ${enrichedProfile.whatsapp_from_bio || 'Nenhum'}`);
          console.log(`      ✅ Verified: ${enrichedProfile.is_verified} | 💼 Business: ${enrichedProfile.is_business_account}`);

          // Buscar discovery_id correspondente
          const { data: discoveryRecord } = await supabase
            .from('instagram_discovery_results')
            .select('id')
            .eq('run_id', run_id)
            .eq('username', enrichedProfile.username)
            .single();

          // Inserir perfil enriquecido
          const { error: insertError } = await supabase
            .from('instagram_enriched_profiles')
            .insert({
              run_id: run_id,
              discovery_id: discoveryRecord?.id || null,
              workspace_id: runData.workspace_id,
              funnel_id: runData.funnel_id,
              column_id: runData.column_id,
              // Dados do perfil
              instagram_id: enrichedProfile.instagram_id,
              username: enrichedProfile.username,
              full_name: enrichedProfile.full_name,
              biography: enrichedProfile.biography,
              profile_pic_url: enrichedProfile.profile_pic_url,
              // Métricas
              followers_count: enrichedProfile.followers_count,
              following_count: enrichedProfile.following_count,
              posts_count: enrichedProfile.posts_count,
              // Status da conta
              is_verified: enrichedProfile.is_verified,
              is_business_account: enrichedProfile.is_business_account,
              is_professional_account: enrichedProfile.is_professional_account,
              is_private: enrichedProfile.is_private,
              // Contato
              external_url: enrichedProfile.external_url,
              business_email: enrichedProfile.business_email,
              business_phone: enrichedProfile.business_phone,
              business_category: enrichedProfile.business_category,
              business_address: enrichedProfile.business_address,
              email_from_bio: enrichedProfile.email_from_bio,
              phone_from_bio: enrichedProfile.phone_from_bio,
              whatsapp_from_bio: enrichedProfile.whatsapp_from_bio,
              // Status: 'completed' se sem website OU 'pending' se aguardando scraping
              processing_status: enrichedProfile.external_url ? 'pending' : 'completed',
              migrated_to_leads: false,
              raw_data: enrichedProfile.raw_data,
            });

          if (insertError) {
            console.error(`   ❌ Erro ao inserir perfil ${enrichedProfile.username}:`, insertError);
            failedCount++;
          } else {
            enrichedCount++;

            // Criar log detalhado para cada perfil enriquecido
            await createLog(
              supabase, run_id, 7, 'Perfil Enriquecido', 'enrichment', 'info',
              `@${enrichedProfile.username}: ${enrichedProfile.followers_count || 0} seguidores, ${enrichedProfile.posts_count || 0} posts`,
              {
                username: enrichedProfile.username,
                full_name: enrichedProfile.full_name,
                followers: enrichedProfile.followers_count,
                posts: enrichedProfile.posts_count,
                has_website: !!enrichedProfile.external_url,
                website_url: enrichedProfile.external_url,
                has_email: !!(enrichedProfile.business_email || enrichedProfile.email_from_bio),
                email: enrichedProfile.business_email || enrichedProfile.email_from_bio,
                has_phone: !!(enrichedProfile.business_phone || enrichedProfile.phone_from_bio),
                phone: enrichedProfile.business_phone || enrichedProfile.phone_from_bio,
                has_whatsapp: !!enrichedProfile.whatsapp_from_bio,
                whatsapp: enrichedProfile.whatsapp_from_bio,
                is_verified: enrichedProfile.is_verified,
                is_business: enrichedProfile.is_business_account,
                category: enrichedProfile.business_category
              }
            );
          }

        } catch (profileError) {
          console.error(`   ❌ Erro ao processar perfil:`, profileError);
          failedCount++;
        }
      }

      console.log(`\n📊 Resultados do enriquecimento:`);
      console.log(`   ✅ Enriquecidos: ${enrichedCount}`);
      console.log(`   ❌ Falhas: ${failedCount}`);

      // Atualizar status do run
      await supabase
        .from('lead_extraction_runs')
        .update({
          enrichment_status: 'completed',
          enrichment_profiles_completed: (runData.enrichment_profiles_completed || 0) + enrichedCount,
          enrichment_profiles_failed: (runData.enrichment_profiles_failed || 0) + failedCount,
          enrichment_completed_at: new Date().toISOString(),
        })
        .eq('id', run_id);

      await createLog(
        supabase, run_id, 8, 'Processamento', 'enrichment', 'success',
        `Enriquecimento concluído: ${enrichedCount} perfis processados, ${failedCount} falhas`,
        { enriched: enrichedCount, failed: failedCount }
      );

      // =========================================================================
      // AUTO-TRIGGER: Chamar instagram-migrate automaticamente
      // O backend controla todo o fluxo, frontend apenas monitora
      // =========================================================================
      if (enrichedCount > 0) {
        console.log(`\n🚀 Auto-trigger: Iniciando migração para ${enrichedCount} perfis...`);

        await createLog(
          supabase, run_id, 9, 'Auto-Trigger', 'enrichment', 'info',
          `Iniciando migração automaticamente para ${enrichedCount} perfis`,
          { profiles_to_migrate: enrichedCount }
        );

        try {
          // Obter token de autorização da requisição original para repassar
          const authHeader = req.headers.get('authorization');

          // Chamar instagram-migrate de forma assíncrona (fire-and-forget)
          const migrateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-migrate`;

          fetch(migrateUrl, {
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
              console.log(`✅ Migração iniciada com sucesso para run ${run_id}`);
            } else {
              console.error(`❌ Erro ao iniciar migração: ${response.status}`);
            }
          }).catch(err => {
            console.error(`❌ Erro ao chamar instagram-migrate:`, err);
          });

        } catch (triggerError) {
          console.error('Erro ao disparar migração:', triggerError);
          await createLog(
            supabase, run_id, 9, 'Auto-Trigger', 'enrichment', 'warning',
            `Falha ao iniciar migração automaticamente: ${triggerError}`,
            { error: String(triggerError) }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          run_id,
          apify_run_ids: apifyRunIds,
          batches_total: batches.length,
          batches_succeeded: successfulBatches.length,
          batches_failed: failedBatches.length,
          profiles_sent: totalProfiles,
          status: 'completed',
          enriched: enrichedCount,
          failed: failedCount,
          migration_triggered: enrichedCount > 0,
          message: `Enriquecimento concluído! ${enrichedCount} perfis processados em ${successfulBatches.length}/${batches.length} lotes. ${enrichedCount > 0 ? 'Migração iniciada automaticamente.' : ''}`,
        }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION: check - Verificar status da run e processar resultados
    // =========================================================================
    if (action === 'check') {
      console.log(`\n=== INSTAGRAM-ENRICHMENT: CHECK ===`);
      console.log(`Run ID: ${run_id}`);

      // Buscar dados do run
      const { data: runData, error: runError } = await supabase
        .from('lead_extraction_runs')
        .select('*')
        .eq('id', run_id)
        .eq('source', 'instagram')
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


      const apifyRunId = runData.enrichment_snapshot_id;
      if (!apifyRunId) {
        return new Response(
          JSON.stringify({ error: 'Nenhuma execução Apify em andamento' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // Criar cliente Apify
      const apifyClient = createApifyClient('APIFY_API_TOKEN');

      // Verificar status da run
      const runInfo = await apifyClient.getRunStatus(apifyRunId);

      console.log(`📋 Apify Run ${apifyRunId}: ${runInfo.status}`);

      if (runInfo.status === 'RUNNING' || runInfo.status === 'READY') {
        return new Response(
          JSON.stringify({
            success: true,
            run_id,
            apify_run_id: apifyRunId,
            status: 'running',
            message: `Enriquecimento em andamento (status: ${runInfo.status})`,
          }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      if (runInfo.status === 'FAILED' || runInfo.status === 'ABORTED' || runInfo.status === 'TIMED-OUT') {
        await supabase
          .from('lead_extraction_runs')
          .update({
            enrichment_status: 'failed',
            error_message: `Apify run ${runInfo.status}`,
          })
          .eq('id', run_id);

        await createLog(
          supabase, run_id, 7, 'Run Failed', 'enrichment', 'error',
          `Apify run ${runInfo.status}`,
          { apify_run_id: apifyRunId, status: runInfo.status }
        );

        return new Response(
          JSON.stringify({
            success: false,
            error: `Apify run ${runInfo.status}`,
            apify_run_id: apifyRunId,
          }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      if (runInfo.status === 'SUCCEEDED') {
        console.log(`✅ Apify Run concluída! Buscando resultados do dataset ${runInfo.datasetId}...`);

        await createLog(
          supabase, run_id, 7, 'Run Succeeded', 'enrichment', 'info',
          `Apify run concluída, buscando resultados`,
          { apify_run_id: apifyRunId, dataset_id: runInfo.datasetId }
        );

        // Buscar resultados do dataset
        const results = await apifyClient.getDatasetItems<ApifyInstagramProfile>(runInfo.datasetId);

        console.log(`📥 Recebidos ${results.length} perfis`);

        // Processar e salvar resultados
        let enrichedCount = 0;
        let failedCount = 0;

        for (const rawProfile of results) {
          try {
            // Verificar se houve erro
            if (rawProfile.error) {
              console.log(`   ⚠️ Erro no perfil: ${rawProfile.url || rawProfile.inputUrl || 'unknown'} - ${rawProfile.error}`);
              failedCount++;
              continue;
            }

            // Skip se não tem username
            if (!rawProfile.username) {
              console.log(`   ⚠️ Perfil sem username, ignorando`);
              failedCount++;
              continue;
            }

            // Converter para formato enriquecido
            const enrichedProfile = apifyToEnrichedProfile(rawProfile);

            // Buscar discovery_id correspondente
            const { data: discoveryRecord } = await supabase
              .from('instagram_discovery_results')
              .select('id')
              .eq('run_id', run_id)
              .eq('username', enrichedProfile.username)
              .single();

            // Inserir perfil enriquecido
            const { error: insertError } = await supabase
              .from('instagram_enriched_profiles')
              .insert({
                run_id: run_id,
                discovery_id: discoveryRecord?.id || null,
                workspace_id: runData.workspace_id,
                funnel_id: runData.funnel_id,
                column_id: runData.column_id,
                // Dados do perfil
                instagram_id: enrichedProfile.instagram_id,
                username: enrichedProfile.username,
                full_name: enrichedProfile.full_name,
                biography: enrichedProfile.biography,
                profile_pic_url: enrichedProfile.profile_pic_url,
                // Métricas
                followers_count: enrichedProfile.followers_count,
                following_count: enrichedProfile.following_count,
                posts_count: enrichedProfile.posts_count,
                // Status da conta
                is_verified: enrichedProfile.is_verified,
                is_business_account: enrichedProfile.is_business_account,
                is_professional_account: enrichedProfile.is_professional_account,
                is_private: enrichedProfile.is_private,
                // Contato
                external_url: enrichedProfile.external_url,
                business_email: enrichedProfile.business_email,
                business_phone: enrichedProfile.business_phone,
                business_category: enrichedProfile.business_category,
                business_address: enrichedProfile.business_address,
                email_from_bio: enrichedProfile.email_from_bio,
                phone_from_bio: enrichedProfile.phone_from_bio,
                whatsapp_from_bio: enrichedProfile.whatsapp_from_bio,
                // Status
                processing_status: 'pending',
                migrated_to_leads: false,
                raw_data: enrichedProfile.raw_data,
              });

            if (insertError) {
              console.error(`   ❌ Erro ao inserir perfil ${enrichedProfile.username}:`, insertError);
              failedCount++;
            } else {
              enrichedCount++;
            }

          } catch (profileError) {
            console.error(`   ❌ Erro ao processar perfil:`, profileError);
            failedCount++;
          }
        }

        console.log(`\n📊 Resultados do enriquecimento:`);
        console.log(`   ✅ Enriquecidos: ${enrichedCount}`);
        console.log(`   ❌ Falhas: ${failedCount}`);

        // Atualizar status do run
        await supabase
          .from('lead_extraction_runs')
          .update({
            enrichment_status: 'completed',
            enrichment_profiles_completed: (runData.enrichment_profiles_completed || 0) + enrichedCount,
            enrichment_profiles_failed: (runData.enrichment_profiles_failed || 0) + failedCount,
            enrichment_completed_at: new Date().toISOString(),
          })
          .eq('id', run_id);

        await createLog(
          supabase, run_id, 8, 'Processamento', 'enrichment', 'success',
          `Enriquecimento concluído: ${enrichedCount} perfis processados, ${failedCount} falhas`,
          { enriched: enrichedCount, failed: failedCount }
        );

        // =========================================================================
        // AUTO-TRIGGER: Chamar instagram-migrate automaticamente
        // O backend controla todo o fluxo, frontend apenas monitora
        // =========================================================================
        if (enrichedCount > 0) {
          console.log(`\n🚀 Auto-trigger: Iniciando migração para ${enrichedCount} perfis...`);

          await createLog(
            supabase, run_id, 9, 'Auto-Trigger', 'enrichment', 'info',
            `Iniciando migração automaticamente para ${enrichedCount} perfis`,
            { profiles_to_migrate: enrichedCount }
          );

          try {
            // Obter token de autorização da requisição original para repassar
            const authHeader = req.headers.get('authorization');

            // Chamar instagram-migrate de forma assíncrona (fire-and-forget)
            const migrateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-migrate`;

            fetch(migrateUrl, {
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
                console.log(`✅ Migração iniciada com sucesso para run ${run_id}`);
              } else {
                console.error(`❌ Erro ao iniciar migração: ${response.status}`);
              }
            }).catch(err => {
              console.error(`❌ Erro ao chamar instagram-migrate:`, err);
            });

          } catch (triggerError) {
            console.error('Erro ao disparar migração:', triggerError);
            await createLog(
              supabase, run_id, 9, 'Auto-Trigger', 'enrichment', 'warning',
              `Falha ao iniciar migração automaticamente: ${triggerError}`,
              { error: String(triggerError) }
            );
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            run_id,
            apify_run_id: apifyRunId,
            status: 'completed',
            enriched: enrichedCount,
            failed: failedCount,
            migration_triggered: enrichedCount > 0,
            message: `Enriquecimento concluído! ${enrichedCount} perfis processados. ${enrichedCount > 0 ? 'Migração iniciada automaticamente.' : ''}`,
          }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // Status desconhecido
      return new Response(
        JSON.stringify({
          success: true,
          run_id,
          apify_run_id: apifyRunId,
          status: runInfo.status,
        }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION: status - Verificar status do enriquecimento
    // =========================================================================
    if (action === 'status') {
      const { data: runData, error: runError } = await supabase
        .from('lead_extraction_runs')
        .select(`
          id, status, enrichment_status, enrichment_snapshot_id, workspace_id,
          enrichment_profiles_total, enrichment_profiles_completed, enrichment_profiles_failed,
          enrichment_completed_at
        `)
        .eq('id', run_id)
        .eq('source', 'instagram')
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
          enrichment: {
            status: runData.enrichment_status,
            apify_run_id: runData.enrichment_snapshot_id,
            profiles_total: runData.enrichment_profiles_total,
            profiles_completed: runData.enrichment_profiles_completed,
            profiles_failed: runData.enrichment_profiles_failed,
            completed_at: runData.enrichment_completed_at,
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
