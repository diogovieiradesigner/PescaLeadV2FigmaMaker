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

// Configurações
const MAX_PROFILES_PER_BATCH = 100; // Máximo de perfis por chamada à Apify
const ENRICHMENT_TIMEOUT_MS = 300000; // 5 minutos de timeout
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

      // Atualizar status para 'enriching'
      await supabase
        .from('lead_extraction_runs')
        .update({
          status: 'enriching',
          enrichment_status: 'running',
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

      // Preparar URLs para Apify
      const urls = discoveryResults!.map(profile => profile.profile_url);

      console.log(`📤 Enviando ${urls.length} perfis para Apify...`);

      await createLog(
        supabase, run_id, 6, 'API Call', 'enrichment', 'info',
        `Enviando ${urls.length} perfis para Apify Actor`,
        { usernames: discoveryResults!.map(p => p.username) }
      );

      // Disparar Actor do Apify
      let runResult;
      try {
        runResult = await apifyClient.runActor(
          ApifyClient.INSTAGRAM_SCRAPER,
          {
            directUrls: urls,
            resultsType: 'details',
            resultsLimit: 1, // 1 resultado por URL
          }
        );
      } catch (error) {
        const errorMessage = String(error);

        // Determinar tipo de erro
        let userFriendlyError = 'Falha ao conectar com Apify';
        let errorCode = 'APIFY_ERROR';

        if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
          userFriendlyError = 'Token Apify inválido. Verifique suas credenciais.';
          errorCode = 'APIFY_UNAUTHORIZED';
        } else if (errorMessage.includes('402') || errorMessage.includes('payment') || errorMessage.includes('insufficient')) {
          userFriendlyError = 'Créditos insuficientes no Apify. Recarregue sua conta.';
          errorCode = 'APIFY_INSUFFICIENT_CREDITS';
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          userFriendlyError = 'Limite de requisições do Apify excedido. Aguarde alguns minutos.';
          errorCode = 'APIFY_RATE_LIMIT';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          userFriendlyError = 'Timeout ao conectar com Apify. Tente novamente.';
          errorCode = 'APIFY_TIMEOUT';
        } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          userFriendlyError = 'Actor Apify não encontrado. Verifique a configuração.';
          errorCode = 'APIFY_ACTOR_NOT_FOUND';
        }

        await createLog(
          supabase, run_id, 6, 'API Call', 'enrichment', 'error',
          userFriendlyError,
          { error: errorMessage, error_code: errorCode }
        );

        // Marcar enriquecimento como FALHO
        await supabase
          .from('lead_extraction_runs')
          .update({
            status: 'failed',
            enrichment_status: 'failed',
            error_message: userFriendlyError,
          })
          .eq('id', run_id);

        return new Response(
          JSON.stringify({
            success: false,
            error: userFriendlyError,
            error_code: errorCode,
            details: errorMessage,
            run_id,
          }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📋 Apify Run criada: ${runResult.runId} (dataset: ${runResult.datasetId})`);

      // Salvar run_id do Apify no run (usando enrichment_snapshot_id por compatibilidade)
      await supabase
        .from('lead_extraction_runs')
        .update({
          enrichment_snapshot_id: runResult.runId, // Armazena runId do Apify
        })
        .eq('id', run_id);

      // Marcar perfis como enviados para enriquecimento
      const discoveryIds = discoveryResults!.map(p => p.id);
      await supabase
        .from('instagram_discovery_results')
        .update({ sent_to_enrichment: true })
        .in('id', discoveryIds);

      await createLog(
        supabase, run_id, 6, 'API Call', 'enrichment', 'success',
        `Apify Run criada: ${runResult.runId}`,
        { run_id: runResult.runId, dataset_id: runResult.datasetId, profiles_sent: urls.length }
      );

      return new Response(
        JSON.stringify({
          success: true,
          run_id,
          apify_run_id: runResult.runId,
          dataset_id: runResult.datasetId,
          profiles_sent: urls.length,
          message: `Enriquecimento iniciado! Apify Run: ${runResult.runId}`,
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

        return new Response(
          JSON.stringify({
            success: true,
            run_id,
            apify_run_id: apifyRunId,
            status: 'completed',
            enriched: enrichedCount,
            failed: failedCount,
            message: `Enriquecimento concluído! ${enrichedCount} perfis processados.`,
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
          id, status, enrichment_status, enrichment_snapshot_id,
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
