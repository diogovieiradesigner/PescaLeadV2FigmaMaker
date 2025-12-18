// =============================================================================
// SERVICE: Instagram Extraction
// =============================================================================
// REFATORADO: Usa tabelas compartilhadas (lead_extraction_runs, extraction_logs,
//             lead_extraction_staging) com source='instagram'
//
// Serviço para interagir com as edge functions de extração do Instagram
// Usado por: InstagramExtractionPanel
// =============================================================================

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import type {
  InstagramExtractionRun,
  InstagramExtractionConfig,
  InstagramDiscoveryResult,
  InstagramEnrichedProfile,
  InstagramExtractionLog,
  InstagramExtractionFullStatus,
  DiscoveryResponse,
  EnrichmentResponse,
  MigrationResponse,
  ExtractionStats,
  ProfileFilters,
  PaginationConfig,
} from '../types/instagram.types';

// ============================================
// CONFIGURAÇÃO
// ============================================
const EDGE_FUNCTION_BASE = `https://${projectId}.supabase.co/functions/v1`;

/**
 * Headers para chamadas às edge functions
 * IMPORTANTE: Requer sessão de usuário ativa para operações autenticadas
 */
async function getHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn('⚠️ Instagram service: No active session, authentication may fail');
  } else {
    console.log('✅ Instagram service: Using user session token');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || publicAnonKey}`,
    'apikey': publicAnonKey,
  };
}

// ============================================
// CRUD - RUNS
// ============================================

/**
 * Cria uma nova extração Instagram
 * NOTA: Primeiro cria lead_extraction (configuração) e depois lead_extraction_run (execução)
 */
export async function createInstagramExtraction(
  config: InstagramExtractionConfig
): Promise<InstagramExtractionRun> {
  // 1. Primeiro criar o registro de configuração em lead_extractions
  const extractionName = `Instagram: ${config.niche} - ${config.location}`;
  const searchTerm = `${config.niche} ${config.location}`;

  const { data: extraction, error: extractionError } = await supabase
    .from('lead_extractions')
    .insert({
      workspace_id: config.workspaceId,
      extraction_name: extractionName,
      search_term: searchTerm,
      location: config.location,
      niche: config.niche,
      target_quantity: config.targetQuantity,
      funnel_id: config.funnelId || null,
      column_id: config.columnId || null,
      is_active: true,
      extraction_mode: 'manual',
      require_website: false,
      require_phone: false,
      require_email: false,
      min_reviews: 0,
      min_rating: 0,
      expand_state_search: false,
    })
    .select()
    .single();

  if (extractionError) {
    throw new Error(`Erro ao criar configuração de extração: ${extractionError.message}`);
  }

  // 2. Agora criar o registro de execução em lead_extraction_runs
  const { data, error } = await supabase
    .from('lead_extraction_runs')
    .insert({
      extraction_id: extraction.id,
      workspace_id: config.workspaceId,
      funnel_id: config.funnelId || null,
      column_id: config.columnId || null,
      source: 'instagram',
      // Campos específicos do Instagram
      niche: config.niche,
      location: config.location,
      target_quantity: config.targetQuantity,
      search_term: searchTerm,
      // Status
      status: 'pending',
      discovery_status: 'pending',
      enrichment_status: 'pending',
    })
    .select()
    .single();

  if (error) {
    // Se falhar, tentar deletar a extraction criada
    await supabase.from('lead_extractions').delete().eq('id', extraction.id);
    throw new Error(`Erro ao criar execução: ${error.message}`);
  }

  return data;
}

/**
 * Lista todas as extrações Instagram de um workspace
 * NOTA: Usa tabela compartilhada lead_extraction_runs com source='instagram'
 */
export async function listInstagramExtractions(
  workspaceId: string,
  limit = 20,
  offset = 0
): Promise<{ runs: InstagramExtractionRun[]; total: number }> {
  const { data, error, count } = await supabase
    .from('lead_extraction_runs')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('source', 'instagram')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Erro ao listar extrações: ${error.message}`);
  }

  return {
    runs: data || [],
    total: count || 0,
  };
}

/**
 * Busca uma extração por ID
 * NOTA: Usa tabela compartilhada lead_extraction_runs com source='instagram'
 */
export async function getInstagramExtraction(
  runId: string
): Promise<InstagramExtractionRun | null> {
  const { data, error } = await supabase
    .from('lead_extraction_runs')
    .select('*')
    .eq('id', runId)
    .eq('source', 'instagram')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar extração: ${error.message}`);
  }

  return data;
}

/**
 * Cancela uma extração em andamento
 * NOTA: Usa tabela compartilhada lead_extraction_runs
 */
export async function cancelInstagramExtraction(runId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_extraction_runs')
    .update({
      status: 'cancelled',
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('source', 'instagram');

  if (error) {
    throw new Error(`Erro ao cancelar extração: ${error.message}`);
  }
}

/**
 * Exclui uma extração (e todos os dados relacionados)
 * NOTA: Usa tabela compartilhada lead_extraction_runs
 */
export async function deleteInstagramExtraction(runId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_extraction_runs')
    .delete()
    .eq('id', runId)
    .eq('source', 'instagram');

  if (error) {
    throw new Error(`Erro ao excluir extração: ${error.message}`);
  }
}

// ============================================
// EDGE FUNCTIONS - DISCOVERY
// ============================================

/**
 * Inicia a etapa de descoberta (Serper.dev)
 */
export async function startDiscovery(runId: string): Promise<DiscoveryResponse> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION_BASE}/instagram-discovery`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      run_id: runId,
      action: 'start',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao iniciar descoberta: ${error}`);
  }

  return response.json();
}

/**
 * Verifica status da descoberta
 */
export async function getDiscoveryStatus(runId: string): Promise<DiscoveryResponse> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION_BASE}/instagram-discovery`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      run_id: runId,
      action: 'status',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao verificar status: ${error}`);
  }

  return response.json();
}

// ============================================
// EDGE FUNCTIONS - ENRICHMENT
// ============================================

/**
 * Inicia a etapa de enriquecimento (Bright Data)
 */
export async function startEnrichment(runId: string): Promise<EnrichmentResponse> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION_BASE}/instagram-enrichment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      run_id: runId,
      action: 'start',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao iniciar enriquecimento: ${error}`);
  }

  return response.json();
}

/**
 * Verifica status do enriquecimento e processa resultados se pronto
 */
export async function checkEnrichment(runId: string): Promise<EnrichmentResponse> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION_BASE}/instagram-enrichment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      run_id: runId,
      action: 'check',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao verificar enriquecimento: ${error}`);
  }

  return response.json();
}

/**
 * Verifica status do enriquecimento
 */
export async function getEnrichmentStatus(runId: string): Promise<EnrichmentResponse> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION_BASE}/instagram-enrichment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      run_id: runId,
      action: 'status',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao verificar status: ${error}`);
  }

  return response.json();
}

// ============================================
// EDGE FUNCTIONS - MIGRATION
// ============================================

/**
 * Inicia a migração para leads
 */
export async function startMigration(
  runId: string,
  limit = 50
): Promise<MigrationResponse> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION_BASE}/instagram-migrate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      run_id: runId,
      action: 'start',
      limit,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao iniciar migração: ${error}`);
  }

  return response.json();
}

/**
 * Verifica status da migração
 */
export async function getMigrationStatus(runId: string): Promise<MigrationResponse> {
  const headers = await getHeaders();

  const response = await fetch(`${EDGE_FUNCTION_BASE}/instagram-migrate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      run_id: runId,
      action: 'status',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao verificar status: ${error}`);
  }

  return response.json();
}

// ============================================
// EXECUÇÃO COMPLETA
// ============================================

/**
 * Executa todas as etapas de uma extração em sequência
 * Retorna um generator para acompanhar o progresso
 */
export async function* runFullExtraction(
  runId: string
): AsyncGenerator<{
  phase: 'discovery' | 'enrichment' | 'migration' | 'completed';
  status: string;
  progress?: number;
  message: string;
}> {
  // Fase 1: Descoberta
  yield {
    phase: 'discovery',
    status: 'starting',
    message: 'Iniciando descoberta de perfis...',
  };

  const discoveryResult = await startDiscovery(runId);

  yield {
    phase: 'discovery',
    status: 'completed',
    message: `Descoberta concluída: ${discoveryResult.discovery?.unique_profiles || 0} perfis únicos`,
  };

  // Fase 2: Enriquecimento
  yield {
    phase: 'enrichment',
    status: 'starting',
    message: 'Iniciando enriquecimento de perfis...',
  };

  const enrichmentStart = await startEnrichment(runId);

  // Poll até completar
  let enrichmentDone = false;
  while (!enrichmentDone) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const status = await checkEnrichment(runId);

    yield {
      phase: 'enrichment',
      status: status.status || 'running',
      progress: status.progress,
      message: `Enriquecimento: ${status.progress || 0}%`,
    };

    if (status.status === 'completed' || status.status === 'failed') {
      enrichmentDone = true;
    }
  }

  // Fase 3: Migração
  yield {
    phase: 'migration',
    status: 'starting',
    message: 'Iniciando migração para leads...',
  };

  let migrationDone = false;
  while (!migrationDone) {
    const migrationResult = await startMigration(runId);

    yield {
      phase: 'migration',
      status: migrationResult.has_more ? 'running' : 'completed',
      message: `Migração: ${migrationResult.batch?.leads_created || 0} leads criados`,
    };

    if (!migrationResult.has_more) {
      migrationDone = true;
    }
  }

  yield {
    phase: 'completed',
    status: 'completed',
    message: 'Extração concluída com sucesso!',
  };
}

// ============================================
// DADOS - DISCOVERY RESULTS
// ============================================

/**
 * Lista resultados da descoberta
 */
export async function listDiscoveryResults(
  runId: string,
  pagination?: PaginationConfig
): Promise<{ results: InstagramDiscoveryResult[]; total: number }> {
  let query = supabase
    .from('instagram_discovery_results')
    .select('*', { count: 'exact' })
    .eq('run_id', runId)
    .order('search_position', { ascending: true });

  if (pagination) {
    const offset = (pagination.page - 1) * pagination.pageSize;
    query = query.range(offset, offset + pagination.pageSize - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Erro ao listar resultados: ${error.message}`);
  }

  return {
    results: data || [],
    total: count || 0,
  };
}

// ============================================
// DADOS - ENRICHED PROFILES
// ============================================

/**
 * Lista perfis enriquecidos
 * NOTA: Usa tabela compartilhada lead_extraction_staging com source='instagram'
 */
export async function listEnrichedProfiles(
  runId: string,
  filters?: ProfileFilters,
  pagination?: PaginationConfig
): Promise<{ profiles: InstagramEnrichedProfile[]; total: number }> {
  let query = supabase
    .from('lead_extraction_staging')
    .select('*', { count: 'exact' })
    .eq('run_id', runId)
    .eq('source', 'instagram')
    .order('instagram_followers_count', { ascending: false, nullsFirst: false });

  // Aplicar filtros (usando campos com prefixo instagram_)
  if (filters?.hasEmail) {
    query = query.or('instagram_business_email.not.is.null,instagram_email_from_bio.not.is.null');
  }
  if (filters?.hasPhone) {
    query = query.or('instagram_business_phone.not.is.null,instagram_phone_from_bio.not.is.null');
  }
  if (filters?.hasWhatsapp) {
    query = query.not('instagram_whatsapp_from_bio', 'is', null);
  }
  if (filters?.isBusiness) {
    query = query.eq('instagram_is_business_account', true);
  }
  if (filters?.isVerified) {
    query = query.eq('instagram_is_verified', true);
  }
  if (filters?.minFollowers) {
    query = query.gte('instagram_followers_count', filters.minFollowers);
  }
  if (filters?.status) {
    query = query.eq('processing_status', filters.status);
  }

  if (pagination) {
    const offset = (pagination.page - 1) * pagination.pageSize;
    query = query.range(offset, offset + pagination.pageSize - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Erro ao listar perfis: ${error.message}`);
  }

  return {
    profiles: data || [],
    total: count || 0,
  };
}

/**
 * Busca um perfil enriquecido por ID
 * NOTA: Usa tabela compartilhada lead_extraction_staging com source='instagram'
 */
export async function getEnrichedProfile(
  profileId: string
): Promise<InstagramEnrichedProfile | null> {
  const { data, error } = await supabase
    .from('lead_extraction_staging')
    .select('*')
    .eq('id', profileId)
    .eq('source', 'instagram')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar perfil: ${error.message}`);
  }

  return data;
}

// ============================================
// DADOS - LOGS
// ============================================

/**
 * Lista logs de uma extração
 * NOTA: Usa tabela compartilhada extraction_logs com source='instagram'
 */
export async function listExtractionLogs(
  runId: string,
  limit = 100
): Promise<InstagramExtractionLog[]> {
  const { data, error } = await supabase
    .from('extraction_logs')
    .select('*')
    .eq('run_id', runId)
    .eq('source', 'instagram')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Erro ao listar logs: ${error.message}`);
  }

  return data || [];
}

// ============================================
// ESTATÍSTICAS
// ============================================

/**
 * Calcula estatísticas de uma extração
 * NOTA: Usa tabela compartilhada lead_extraction_staging com source='instagram'
 */
export async function getExtractionStats(runId: string): Promise<ExtractionStats> {
  const { data, error } = await supabase
    .from('lead_extraction_staging')
    .select('*')
    .eq('run_id', runId)
    .eq('source', 'instagram');

  if (error) {
    throw new Error(`Erro ao calcular estatísticas: ${error.message}`);
  }

  const profiles = data || [];
  const total = profiles.length;

  if (total === 0) {
    return {
      total_profiles: 0,
      with_email: 0,
      with_phone: 0,
      with_whatsapp: 0,
      business_accounts: 0,
      verified_accounts: 0,
      average_followers: 0,
      leads_created: 0,
    };
  }

  // Usando campos com prefixo instagram_
  const withEmail = profiles.filter(p => p.instagram_business_email || p.instagram_email_from_bio).length;
  const withPhone = profiles.filter(p => p.instagram_business_phone || p.instagram_phone_from_bio).length;
  const withWhatsapp = profiles.filter(p => p.instagram_whatsapp_from_bio).length;
  const businessAccounts = profiles.filter(p => p.instagram_is_business_account).length;
  const verifiedAccounts = profiles.filter(p => p.instagram_is_verified).length;
  const leadsCreated = profiles.filter(p => p.migrated_to_leads).length;

  const totalFollowers = profiles.reduce((sum, p) => sum + (p.instagram_followers_count || 0), 0);
  const averageFollowers = Math.round(totalFollowers / total);

  return {
    total_profiles: total,
    with_email: withEmail,
    with_phone: withPhone,
    with_whatsapp: withWhatsapp,
    business_accounts: businessAccounts,
    verified_accounts: verifiedAccounts,
    average_followers: averageFollowers,
    leads_created: leadsCreated,
  };
}

// ============================================
// STATUS COMPLETO
// ============================================

/**
 * Busca status completo de uma extração
 * NOTA: Usa tabelas compartilhadas
 */
export async function getFullExtractionStatus(
  runId: string
): Promise<InstagramExtractionFullStatus | null> {
  const run = await getInstagramExtraction(runId);
  if (!run) return null;

  const logs = await listExtractionLogs(runId);

  // Contar perfis na tabela compartilhada
  const { count: pendingProfiles } = await supabase
    .from('lead_extraction_staging')
    .select('id', { count: 'exact' })
    .eq('run_id', runId)
    .eq('source', 'instagram')
    .eq('migrated_to_leads', false);

  const { count: migratedProfiles } = await supabase
    .from('lead_extraction_staging')
    .select('id', { count: 'exact' })
    .eq('run_id', runId)
    .eq('source', 'instagram')
    .eq('migrated_to_leads', true);

  return {
    run,
    discovery: {
      status: run.discovery_status,
      queries_total: run.discovery_queries_total,
      queries_completed: run.discovery_queries_completed,
      profiles_found: run.discovery_profiles_found,
      profiles_unique: run.discovery_profiles_unique,
      started_at: run.started_at,
      completed_at: run.discovery_completed_at,
    },
    enrichment: {
      status: run.enrichment_status,
      snapshot_id: run.enrichment_snapshot_id,
      profiles_total: run.enrichment_profiles_total,
      profiles_completed: run.enrichment_profiles_completed,
      profiles_failed: run.enrichment_profiles_failed,
      completed_at: run.enrichment_completed_at,
    },
    migration: {
      leads_created: run.leads_created,
      duplicates_skipped: run.leads_duplicates_skipped,
      profiles_pending: pendingProfiles || 0,
      profiles_migrated: migratedProfiles || 0,
      finished_at: run.finished_at,
    },
    logs,
  };
}

// ============================================
// REAL-TIME SUBSCRIPTION
// ============================================

/**
 * Assina atualizações em tempo real de uma extração
 * NOTA: Usa tabela compartilhada lead_extraction_runs
 */
export function subscribeToExtractionUpdates(
  runId: string,
  onUpdate: (run: InstagramExtractionRun) => void
): () => void {
  const channel = supabase
    .channel(`instagram-run-${runId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'lead_extraction_runs',
        filter: `id=eq.${runId}`,
      },
      (payload) => {
        // Verificar se é do Instagram antes de notificar
        if (payload.new && (payload.new as any).source === 'instagram') {
          onUpdate(payload.new as InstagramExtractionRun);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Assina novos logs em tempo real
 * NOTA: Usa tabela compartilhada extraction_logs
 */
export function subscribeToExtractionLogs(
  runId: string,
  onLog: (log: InstagramExtractionLog) => void
): () => void {
  const channel = supabase
    .channel(`instagram-logs-${runId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'extraction_logs',
        filter: `run_id=eq.${runId}`,
      },
      (payload) => {
        // Verificar se é do Instagram antes de notificar
        if (payload.new && (payload.new as any).source === 'instagram') {
          onLog(payload.new as InstagramExtractionLog);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
