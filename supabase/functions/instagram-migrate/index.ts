// =============================================================================
// EDGE FUNCTION: instagram-migrate (Migração para Leads)
// =============================================================================
// Usa tabela específica: instagram_enriched_profiles
//
// Responsabilidades:
// 1. Buscar perfis enriquecidos não migrados de instagram_enriched_profiles
// 2. Criar leads na tabela `leads`
// 3. Marcar como migrado
// 4. Criar atividades de criação
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import { calculateLeadScore, type EnrichedProfile } from '../_shared/instagram-utils.ts';

// Lista de origens permitidas
const ALLOWED_ORIGINS = [
  'https://hub.pescalead.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Retorna headers CORS dinâmicos baseados na origem da requisição
 */
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
const MAX_PROFILES_PER_BATCH = 50; // Máximo de perfis por batch de migração
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

  console.log('👤 User result:', user?.id, user?.email);
  console.log('❌ Auth error:', authError?.message);

  if (authError || !user) {
    throw new Error(`Invalid authentication token: ${authError?.message || 'no user'}`);
  }

  // Verifica se usuário pertence ao workspace
  console.log('🔍 Checking workspace membership:', { userId: user.id, workspaceId });

  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('id, role')
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
 * Constrói o nome do lead a partir dos dados do Instagram
 * NOTA: Usa campos da tabela instagram_enriched_profiles
 */
function buildLeadName(profile: any): string {
  // Prioridade: full_name > username formatado
  if (profile.full_name && profile.full_name.trim()) {
    return profile.full_name.trim();
  }
  // Formatar username: @drdentista_sp -> Dr Dentista Sp
  const username = profile.username || '';
  return username
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extrai o melhor email disponível
 * NOTA: Usa campos da tabela instagram_enriched_profiles
 */
function getBestEmail(profile: any): string | null {
  return profile.business_email || profile.email_from_bio || null;
}

/**
 * Extrai o melhor telefone disponível
 * NOTA: Usa campos da tabela instagram_enriched_profiles
 */
function getBestPhone(profile: any): string | null {
  return profile.business_phone || profile.phone_from_bio || profile.whatsapp_from_bio || null;
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
    const { run_id, action = 'start', limit = MAX_PROFILES_PER_BATCH } = body;

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: 'run_id é obrigatório' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // =========================================================================
    // ACTION: start - Iniciar migração
    // =========================================================================
    if (action === 'start') {
      console.log(`\n=== INSTAGRAM-MIGRATE: START ===`);
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


      // Verificar se enriquecimento foi concluído
      if (runData.enrichment_status !== 'completed') {
        return new Response(
          JSON.stringify({
            error: 'Enriquecimento não foi concluído',
            enrichment_status: runData.enrichment_status,
          }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // Buscar perfis enriquecidos não migrados da tabela instagram_enriched_profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('instagram_enriched_profiles')
        .select('*')
        .eq('run_id', run_id)
        .eq('migrated_to_leads', false)
        .eq('processing_status', 'pending')
        .limit(limit);

      if (profilesError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar perfis', details: profilesError }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      if (!profiles || profiles.length === 0) {
        // Verificar se há perfis pendentes
        const { count: pendingCount } = await supabase
          .from('instagram_enriched_profiles')
          .select('id', { count: 'exact' })
          .eq('run_id', run_id)
          .eq('migrated_to_leads', false);

        if (pendingCount === 0) {
          // Todos os perfis já foram migrados - usar tabela compartilhada
          await supabase
            .from('lead_extraction_runs')
            .update({
              status: 'completed',
              finished_at: new Date().toISOString(),
            })
            .eq('id', run_id);

          await createLog(
            supabase, run_id, 10, 'Conclusão', 'migration', 'success',
            `Migração concluída: ${runData.leads_created} leads criados`,
            { leads_created: runData.leads_created }
          );

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Todos os perfis já foram migrados',
              profiles_pending: 0,
              leads_created: runData.leads_created,
            }),
            { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log(`📋 Perfis para migrar: ${profiles?.length || 0}`);

      // Atualizar status para 'migrating' na tabela compartilhada
      await supabase
        .from('lead_extraction_runs')
        .update({
          status: 'migrating',
        })
        .eq('id', run_id);

      await createLog(
        supabase, run_id, 9, 'Inicialização', 'migration', 'info',
        `Iniciando migração de ${profiles?.length} perfis`,
        { profiles_count: profiles?.length }
      );

      // Migrar perfis
      let leadsCreated = 0;
      let duplicatesSkipped = 0;
      let errors = 0;

      for (const profile of profiles!) {
        try {
          // Marcar como processando
          await supabase
            .from('instagram_enriched_profiles')
            .update({ processing_status: 'processing' })
            .eq('id', profile.id);

          // Verificar duplicata por username no mesmo workspace
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('workspace_id', runData.workspace_id)
            .ilike('company', `%${profile.username}%`)
            .limit(1)
            .single();

          if (existingLead) {
            console.log(`   ⚠️ Lead duplicado: ${profile.username}`);
            await supabase
              .from('instagram_enriched_profiles')
              .update({
                processing_status: 'skipped',
                skip_reason: 'Duplicado - já existe lead com este username',
              })
              .eq('id', profile.id);
            duplicatesSkipped++;
            continue;
          }

          // Construir dados do lead
          const leadName = buildLeadName(profile);
          const bestEmail = getBestEmail(profile);
          const bestPhone = getBestPhone(profile);

          // Criar lead
          // NOTA: tabela leads não tem coluna 'source', usamos notes para marcar origem
          const { data: newLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              workspace_id: runData.workspace_id,
              funnel_id: runData.funnel_id,
              column_id: runData.column_id,
              client_name: leadName,
              company: `@${profile.username}`, // Guardar username como company
              notes: `Extraído do Instagram | Perfil: @${profile.username}`,
              whatsapp_valid: profile.whatsapp_from_bio ? true : null,
              lead_extraction_run_id: run_id,
            })
            .select('id')
            .single();

          if (leadError || !newLead) {
            console.error(`   ❌ Erro ao criar lead ${profile.username}:`, leadError);
            await supabase
              .from('instagram_enriched_profiles')
              .update({
                processing_status: 'failed',
                skip_reason: `Erro ao criar lead: ${leadError?.message || 'unknown'}`,
              })
              .eq('id', profile.id);
            errors++;
            continue;
          }

          console.log(`   ✅ Lead criado: ${leadName} (${newLead.id})`);

          // Atualizar perfil como migrado
          await supabase
            .from('instagram_enriched_profiles')
            .update({
              processing_status: 'completed',
              migrated_to_leads: true,
              migrated_at: new Date().toISOString(),
              lead_id: newLead.id,
            })
            .eq('id', profile.id);

          // Criar atividade de criação
          await supabase.from('lead_activities').insert({
            lead_id: newLead.id,
            workspace_id: runData.workspace_id,
            type: 'lead_created',
            title: 'Lead criado via extração Instagram',
            description: `Perfil: @${profile.username} | Seguidores: ${profile.followers_count || 'N/A'} | ${profile.is_business_account ? 'Conta Business' : 'Conta Pessoal'}`,
            metadata: {
              source: 'instagram_extraction',
              run_id: run_id,
              username: profile.username,
              followers_count: profile.followers_count,
              is_business: profile.is_business_account,
              is_verified: profile.is_verified,
            },
          });

          // Criar custom fields com dados do Instagram
          // Extrai dados ricos do raw_data se disponível
          const rawData = profile.raw_data || {};

          const customFields = [
            { name: 'Instagram Username', value: `@${profile.username}`, type: 'text' },
            { name: 'Instagram URL', value: `https://instagram.com/${profile.username}`, type: 'url' },
            { name: 'Seguidores', value: String(profile.followers_count || 0), type: 'number' },
            { name: 'Seguindo', value: String(profile.following_count || 0), type: 'number' },
            { name: 'Posts', value: String(profile.posts_count || 0), type: 'number' },
            { name: 'Bio', value: profile.biography || '', type: 'text' },
            { name: 'Categoria', value: profile.business_category || '', type: 'text' },
          ];

          // Contatos
          if (bestEmail) {
            customFields.push({ name: 'Email Instagram', value: bestEmail, type: 'email' });
          }
          if (bestPhone) {
            customFields.push({ name: 'Telefone Instagram', value: bestPhone, type: 'phone' });
          }

          // Website principal
          if (profile.external_url) {
            customFields.push({ name: 'Website Instagram', value: profile.external_url, type: 'url' });
          }

          // Links externos adicionais (do Apify externalUrls)
          const externalUrls = rawData.externalUrls || [];
          if (externalUrls.length > 0) {
            // Salva todos os links como texto separado por vírgulas (para facilitar busca)
            const allLinks = externalUrls.map((link: any) => link.url || link).filter(Boolean);
            if (allLinks.length > 1) {
              customFields.push({ name: 'Outros Links', value: allLinks.join(' | '), type: 'text' });
            }

            // Detecta tipos específicos de links
            for (const linkObj of externalUrls) {
              const url = (linkObj.url || linkObj || '').toLowerCase();
              if (url.includes('wa.me') || url.includes('whatsapp')) {
                customFields.push({ name: 'WhatsApp Link', value: linkObj.url || linkObj, type: 'url' });
              } else if (url.includes('linktr.ee') || url.includes('linktree')) {
                customFields.push({ name: 'Linktree', value: linkObj.url || linkObj, type: 'url' });
              }
            }
          }

          // Localização (extraída dos posts)
          const latestPosts = rawData.latestPosts || [];
          if (latestPosts.length > 0) {
            for (const post of latestPosts) {
              if (post.locationName) {
                customFields.push({ name: 'Localização', value: post.locationName, type: 'text' });
                break;
              }
            }
          }

          // Imagem de perfil HD
          const profilePicHD = rawData.profilePicUrlHD || rawData.profile_pic_url_hd || '';
          if (profilePicHD) {
            customFields.push({ name: 'Foto Perfil HD', value: profilePicHD, type: 'url' });
          }

          // Status da conta
          if (profile.is_verified) {
            customFields.push({ name: 'Verificado', value: 'Sim', type: 'select' });
          }
          if (profile.is_business_account) {
            customFields.push({ name: 'Conta Business', value: 'Sim', type: 'select' });
          }

          // Lead Score calculado
          const leadScore = calculateLeadScore({
            ...profile,
            external_urls: externalUrls,
            location_name: latestPosts.find((p: any) => p.locationName)?.locationName,
          });
          customFields.push({ name: 'Lead Score', value: String(leadScore), type: 'number' });

          // Instagram ID (do Apify)
          const instagramId = rawData.id || profile.instagram_id || '';
          if (instagramId) {
            customFields.push({ name: 'Instagram ID', value: String(instagramId), type: 'text' });
          }

          // Destaques (Highlights)
          const highlightCount = rawData.highlightReelCount || 0;
          if (highlightCount > 0) {
            customFields.push({ name: 'Destaques', value: String(highlightCount), type: 'number' });
          }

          // IGTV Videos
          const igtvCount = rawData.igtvVideoCount || 0;
          if (igtvCount > 0) {
            customFields.push({ name: 'IGTV Videos', value: String(igtvCount), type: 'number' });
          }

          // Conta privada
          if (rawData.private === true) {
            customFields.push({ name: 'Conta Privada', value: 'Sim', type: 'select' });
          }

          // Perfis relacionados (primeiros 5 usernames)
          const relatedProfiles = rawData.relatedProfiles || [];
          if (relatedProfiles.length > 0) {
            const relatedUsernames = relatedProfiles
              .slice(0, 5)
              .map((p: any) => `@${p.username}`)
              .join(', ');
            customFields.push({ name: 'Perfis Relacionados', value: relatedUsernames, type: 'text' });
          }

          // Full Name original do Apify
          const fullName = rawData.fullName || profile.full_name || '';
          if (fullName) {
            customFields.push({ name: 'Nome Completo', value: fullName, type: 'text' });
          }

          // Todas as localizações encontradas nos posts
          const allLocations = latestPosts
            .filter((p: any) => p.locationName)
            .map((p: any) => p.locationName)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) // unique
            .slice(0, 5)
            .join(' | ');
          if (allLocations && allLocations !== customFields.find(f => f.name === 'Localização')?.value) {
            customFields.push({ name: 'Todas as Localizações', value: allLocations, type: 'text' });
          }

          // Link do Google Business (se presente nos externalUrls)
          for (const linkObj of externalUrls) {
            const url = linkObj.url || linkObj || '';
            if (url.includes('business.google.com') || url.includes('g.page') || url.includes('goo.gl/maps')) {
              customFields.push({ name: 'Google Business', value: url, type: 'url' });
              break;
            }
          }

          // Inserir custom fields dinamicamente
          // A função set_custom_field_value cria o campo se não existir via ensure_custom_field
          for (const field of customFields) {
            if (field.value && field.value.trim()) {
              try {
                const { error: cfError } = await supabase.rpc('set_custom_field_value', {
                  p_lead_id: newLead.id,
                  p_workspace_id: runData.workspace_id,
                  p_field_name: field.name,
                  p_value: field.value,  // Parâmetro correto da função SQL
                  p_field_type: field.type,
                });
                if (cfError) {
                  console.log(`   ⚠️ Custom field error for ${field.name}:`, cfError.message);
                }
              } catch (cfError) {
                // Ignorar erros de custom fields para não falhar a migração
                console.log(`   ⚠️ Custom field exception for ${field.name}:`, cfError);
              }
            }
          }

          leadsCreated++;

        } catch (profileError) {
          console.error(`   ❌ Erro ao processar perfil ${profile.username}:`, profileError);
          await supabase
            .from('instagram_enriched_profiles')
            .update({
              processing_status: 'failed',
              skip_reason: String(profileError),
            })
            .eq('id', profile.id);
          errors++;
        }
      }

      console.log(`\n📊 Resultados da migração:`);
      console.log(`   ✅ Leads criados: ${leadsCreated}`);
      console.log(`   ⚠️ Duplicados pulados: ${duplicatesSkipped}`);
      console.log(`   ❌ Erros: ${errors}`);

      // Atualizar contadores no run na tabela compartilhada
      await supabase
        .from('lead_extraction_runs')
        .update({
          leads_created: (runData.leads_created || 0) + leadsCreated,
          leads_duplicates_skipped: (runData.leads_duplicates_skipped || 0) + duplicatesSkipped,
        })
        .eq('id', run_id);

      // Verificar se ainda há perfis pendentes
      const { count: remainingCount } = await supabase
        .from('instagram_enriched_profiles')
        .select('id', { count: 'exact' })
        .eq('run_id', run_id)
        .eq('migrated_to_leads', false)
        .eq('processing_status', 'pending');

      const hasMore = (remainingCount || 0) > 0;

      if (!hasMore) {
        // Migração completa - usar tabela compartilhada
        await supabase
          .from('lead_extraction_runs')
          .update({
            status: 'completed',
            finished_at: new Date().toISOString(),
          })
          .eq('id', run_id);

        await createLog(
          supabase, run_id, 10, 'Conclusão', 'migration', 'success',
          `Migração concluída: ${runData.leads_created + leadsCreated} leads criados no total`,
          {
            leads_created: leadsCreated,
            duplicates_skipped: duplicatesSkipped,
            errors,
            total_leads: runData.leads_created + leadsCreated,
          }
        );
      } else {
        await createLog(
          supabase, run_id, 9, 'Batch', 'migration', 'info',
          `Batch concluído: ${leadsCreated} leads criados, ${remainingCount} perfis restantes`,
          { leads_created: leadsCreated, remaining: remainingCount }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          run_id,
          batch: {
            leads_created: leadsCreated,
            duplicates_skipped: duplicatesSkipped,
            errors,
          },
          remaining: remainingCount || 0,
          has_more: hasMore,
          message: hasMore
            ? `Batch concluído! ${leadsCreated} leads criados, ${remainingCount} restantes.`
            : `Migração completa! ${runData.leads_created + leadsCreated} leads criados.`,
        }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // ACTION: status - Verificar status da migração
    // =========================================================================
    if (action === 'status') {
      const { data: runData, error: runError } = await supabase
        .from('lead_extraction_runs')
        .select(`
          id, status, leads_created, leads_duplicates_skipped,
          finished_at
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

      // Contar perfis pendentes
      const { count: pendingCount } = await supabase
        .from('instagram_enriched_profiles')
        .select('id', { count: 'exact' })
        .eq('run_id', run_id)
        .eq('migrated_to_leads', false)
        .eq('processing_status', 'pending');

      // Contar perfis migrados
      const { count: migratedCount } = await supabase
        .from('instagram_enriched_profiles')
        .select('id', { count: 'exact' })
        .eq('run_id', run_id)
        .eq('migrated_to_leads', true);

      return new Response(
        JSON.stringify({
          success: true,
          run_id,
          status: runData.status,
          migration: {
            leads_created: runData.leads_created,
            duplicates_skipped: runData.leads_duplicates_skipped,
            profiles_pending: pendingCount || 0,
            profiles_migrated: migratedCount || 0,
            finished_at: runData.finished_at,
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
