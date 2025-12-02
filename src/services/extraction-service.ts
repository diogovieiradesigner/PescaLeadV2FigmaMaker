import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================
// TYPES
// ============================================
export interface LeadExtraction {
  id: string;
  workspace_id: string;
  extraction_name: string;
  prompt: string | null;
  niche: string | null;
  search_term: string;
  location: string;
  target_quantity: number;
  is_active: boolean;
  schedule_time: string | null;
  require_website: boolean;
  require_phone: boolean;
  require_email: boolean;
  min_reviews: number;
  min_rating: number;
  expand_state_search: boolean;
  extraction_mode: 'manual' | 'ia';
  funnel_id: string | null;
  column_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadExtractionRun {
  id: string;
  extraction_id: string;
  workspace_id: string;
  search_term: string;
  location: string;
  niche: string | null;
  status: 'pending' | 'running' | 'completed' | 'partial' | 'failed' | 'cancelled';
  target_quantity: number;
  pages_consumed: number;
  found_quantity: number;
  created_quantity: number;
  duplicates_skipped: number;
  filtered_out: number;
  ai_decisions: any;
  filters_applied: any;
  credits_consumed: number;
  started_at: string | null;
  finished_at: string | null;
  execution_time_ms: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

export interface ExtractionStats {
  id: string;
  extraction_name: string;
  workspace_id: string;
  is_active: boolean;
  search_term: string;
  location: string;
  target_quantity: number;
  funnel_id: string | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  total_pages_consumed: number;
  total_leads_created: number;
  total_credits_consumed: number;
  last_run_at: string | null;
}

export interface CreateExtractionData {
  workspace_id: string;
  extraction_name: string;
  prompt?: string;
  niche?: string;
  search_term: string;
  location: string;
  target_quantity: number;
  is_active?: boolean;
  schedule_time?: string;
  require_website?: boolean;
  require_phone?: boolean;
  require_email?: boolean;
  min_reviews?: number;
  min_rating?: number;
  expand_state_search?: boolean;
  extraction_mode?: 'manual' | 'ia';
  funnel_id?: string;
  column_id?: string;
}

export interface UpdateExtractionData {
  extraction_name?: string;
  prompt?: string;
  niche?: string;
  search_term?: string;
  location?: string;
  target_quantity?: number;
  is_active?: boolean;
  schedule_time?: string;
  require_website?: boolean;
  require_phone?: boolean;
  require_email?: boolean;
  min_reviews?: number;
  min_rating?: number;
  expand_state_search?: boolean;
  extraction_mode?: 'manual' | 'ia';
  funnel_id?: string;
  column_id?: string;
}

// ============================================
// EXTRACTIONS (Configuração)
// ============================================

/**
 * Buscar todas as extrações de um workspace
 */
export async function getExtractions(workspaceId: string): Promise<LeadExtraction[]> {
  const { data, error } = await supabase
    .from('lead_extractions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching extractions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Buscar uma extração por ID
 */
export async function getExtractionById(extractionId: string): Promise<LeadExtraction | null> {
  const { data, error } = await supabase
    .from('lead_extractions')
    .select('*')
    .eq('id', extractionId)
    .single();

  if (error) {
    console.error('Error fetching extraction:', error);
    throw error;
  }

  return data;
}

/**
 * Criar nova extração
 */
export async function createExtraction(extraction: CreateExtractionData): Promise<LeadExtraction> {
  const { data, error } = await supabase
    .from('lead_extractions')
    .insert([extraction])
    .select()
    .single();

  if (error) {
    console.error('Error creating extraction:', error);
    throw error;
  }

  return data;
}

/**
 * Atualizar extração existente
 */
export async function updateExtraction(
  extractionId: string,
  updates: UpdateExtractionData
): Promise<LeadExtraction> {
  const { data, error } = await supabase
    .from('lead_extractions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', extractionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating extraction:', error);
    throw error;
  }

  return data;
}

/**
 * Deletar extração
 */
export async function deleteExtraction(extractionId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_extractions')
    .delete()
    .eq('id', extractionId);

  if (error) {
    console.error('Error deleting extraction:', error);
    throw error;
  }
}

/**
 * Toggle ativo/inativo
 */
export async function toggleExtractionActive(
  extractionId: string,
  isActive: boolean
): Promise<LeadExtraction> {
  return updateExtraction(extractionId, { is_active: isActive });
}

// ============================================
// EXTRACTION RUNS (Histórico)
// ============================================

/**
 * Buscar execuções de uma extração
 */
export async function getExtractionRuns(
  extractionId: string,
  limit: number = 30
): Promise<LeadExtractionRun[]> {
  const { data, error } = await supabase
    .from('lead_extraction_runs')
    .select('*')
    .eq('extraction_id', extractionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching extraction runs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Buscar todas as execuções de um workspace
 */
export async function getWorkspaceExtractionRuns(
  workspaceId: string,
  limit: number = 30
): Promise<LeadExtractionRun[]> {
  const { data, error } = await supabase
    .from('lead_extraction_runs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workspace extraction runs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Buscar execuções recentes com detalhes (usando view)
 */
export async function getRecentExtractionRuns(workspaceId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('lead_extraction_recent_runs')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error fetching recent runs:', error);
    // Fallback: buscar direto da tabela se a view falhar
    return getWorkspaceExtractionRuns(workspaceId, 30);
  }

  return data || [];
}

/**
 * Buscar uma execução por ID
 */
export async function getExtractionRunById(runId: string): Promise<LeadExtractionRun | null> {
  const { data, error } = await supabase
    .from('lead_extraction_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) {
    console.error('Error fetching extraction run:', error);
    throw error;
  }

  return data;
}

// ============================================
// STATISTICS
// ============================================

/**
 * Buscar estatísticas de extrações (usando view)
 */
export async function getExtractionStats(workspaceId: string): Promise<ExtractionStats[]> {
  const { data, error } = await supabase
    .from('lead_extractions_stats')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error fetching extraction stats:', error);
    // Retornar array vazio em vez de erro
    return [];
  }

  return data || [];
}

/**
 * Buscar estatísticas de uma extração específica
 */
export async function getExtractionStatsById(extractionId: string): Promise<ExtractionStats | null> {
  const { data, error } = await supabase
    .from('lead_extractions_stats')
    .select('*')
    .eq('id', extractionId)
    .single();

  if (error) {
    console.error('Error fetching extraction stats:', error);
    throw error;
  }

  return data;
}

// ============================================
// EXECUTE EXTRACTION (Trigger backend)
// ============================================

/**
 * Executar extração manualmente via Edge Function
 */
export async function executeExtraction(extractionId: string): Promise<LeadExtractionRun> {
  // 1. Buscar extração
  const { data: extraction, error: extractionError } = await supabase
    .from('lead_extractions')
    .select('*')
    .eq('id', extractionId)
    .single();

  if (extractionError || !extraction) {
    throw new Error('Extração não encontrada');
  }

  // 2. Criar registro de execução
  const { data: run, error: runError } = await supabase
    .from('lead_extraction_runs')
    .insert([{
      extraction_id: extraction.id,
      workspace_id: extraction.workspace_id,
      search_term: extraction.search_term,
      location: extraction.location,
      niche: extraction.niche,
      status: 'pending',
      target_quantity: extraction.target_quantity,
      pages_consumed: 0,
      found_quantity: 0,
      created_quantity: 0,
      duplicates_skipped: 0,
      filtered_out: 0,
      filters_applied: {
        require_website: extraction.require_website,
        require_phone: extraction.require_phone,
        require_email: extraction.require_email,
        min_rating: extraction.min_rating,
        min_reviews: extraction.min_reviews
      },
      credits_consumed: 0,
      started_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (runError || !run) {
    console.error('Detailed Create Run Error:', runError);
    throw new Error(`Erro ao criar execução: ${runError?.message || 'Unknown error'}`);
  }

  // 3. Chamar Edge Function para iniciar processamento
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const supabaseUrl = `https://${projectId}.supabase.co`;
    const endpoint = `${supabaseUrl}/functions/v1/start-extraction`;

    console.log('🚀 [executeExtraction] Iniciando chamada para Edge Function');
    console.log('🔗 [executeExtraction] URL:', endpoint);
    console.log('🆔 [executeExtraction] Run ID:', run.id);
    console.log('🔑 [executeExtraction] Authorization:', accessToken ? 'Com token' : 'Usando anon key');

    const response = await fetch(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ run_id: run.id })
      }
    );

    console.log('📡 [executeExtraction] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [executeExtraction] Error response:', errorData);
      throw new Error(errorData.error || 'Erro ao iniciar extração');
    }

    const result = await response.json();
    console.log('✅ [executeExtraction] Extração iniciada com sucesso:', result);
    
  } catch (error) {
    console.error('❌ [executeExtraction] Erro ao chamar Edge Function:', error);
    
    // Atualizar run com erro
    await supabase
      .from('lead_extraction_runs')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
        finished_at: new Date().toISOString()
      })
      .eq('id', run.id);
    
    throw error;
  }

  return run;
}

/**
 * Cancelar execução em andamento
 */
export async function cancelExtractionRun(runId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_extraction_runs')
    .update({ 
      status: 'cancelled',
      finished_at: new Date().toISOString()
    })
    .eq('id', runId)
    .eq('status', 'running'); // Só cancela se estiver rodando

  if (error) {
    console.error('Error cancelling extraction run:', error);
    throw error;
  }
}

// ============================================
// EXTRACTION LOGS
// ============================================

/**
 * Buscar logs de uma execução
 */
export async function getExtractionLogs(runId: string, limit: number = 50): Promise<any[]> {
  const { data, error } = await supabase
    .from('extraction_logs')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching extraction logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Buscar leads extraídos de um run
 */
export async function getExtractedLeads(runId: string, limit: number = 100): Promise<any[]> {
  // Buscar da tabela de staging para mostrar o progresso em tempo real
  // A tabela leads final só é populada após o enriquecimento e migração
  const { data, error } = await supabase
    .from('lead_extraction_staging')
    .select('id, client_name, extracted_data, created_at')
    .eq('extraction_run_id', runId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching extracted leads:', error);
    return [];
  }

  // Mapear dados do JSONB para o formato esperado pela UI
  return (data || []).map(item => {
    const d = item.extracted_data || {};
    return {
      id: item.id,
      client_name: item.client_name || d.title || d.name || 'Sem nome',
      company: d.company || null,
      avatar_url: d.thumbnail || d.image || null,
      created_at: item.created_at,
      // Simular estrutura de custom values para compatibilidade com UI
      lead_custom_values: [
        { custom_fields: { name: 'phone' }, value: d.phone || d.phone_number },
        { custom_fields: { name: 'rating' }, value: d.rating },
        { custom_fields: { name: 'reviews' }, value: d.reviews },
        { custom_fields: { name: 'website' }, value: d.website }
      ].filter(v => v.value != null)
    };
  });
}

// ============================================
// NEW RPCs - STATISTICS & METRICS
// ============================================

/**
 * ✅ NOVA FUNÇÃO UNIFICADA - Buscar analytics completos de uma extração
 * Substitui: get_extraction_statistics + get_extraction_metrics_card
 * 
 * Aceita 3 formas de chamada:
 * - Por p_run_id (run específico)
 * - Por p_workspace_id (mais recente do workspace)
 * - Sem parâmetros (mais recente global)
 */
export async function getExtractionAnalytics(params?: { 
  runId?: string;
  workspaceId?: string;
}): Promise<any> {
  const rpcParams: any = {};
  
  if (params?.runId) {
    rpcParams.p_run_id = params.runId;
  } else if (params?.workspaceId) {
    rpcParams.p_workspace_id = params.workspaceId;
  }
  // Se não passar nada, busca o mais recente

  console.log('🔍 [getExtractionAnalytics] Chamando RPC com params:', rpcParams);

  const { data, error } = await supabase
    .rpc('get_extraction_analytics', rpcParams);

  if (error) {
    console.error('❌ [getExtractionAnalytics] Error:', error);
    console.error('❌ [getExtractionAnalytics] Error code:', error.code);
    console.error('❌ [getExtractionAnalytics] Error message:', error.message);
    console.error('❌ [getExtractionAnalytics] Error details:', error.details);
    console.error('❌ [getExtractionAnalytics] Error hint:', error.hint);
    
    // Se a função RPC não existir ou tiver problema de schema
    if (error.code === '42P01' || error.code === '42883') {
      throw new Error(
        `A função RPC 'get_extraction_analytics' ou a tabela 'lead_stats' não existe no Supabase.\n\n` +
        `Por favor, certifique-se de que:\n` +
        `1. A função RPC 'get_extraction_analytics' foi criada no Supabase\n` +
        `2. Todas as tabelas necessárias existem (lead_extraction_runs, leads, etc.)\n` +
        `3. A função não referencia tabelas inexistentes como 'lead_stats'\n\n` +
        `Erro original: ${error.message}`
      );
    }
    
    throw error;
  }

  console.log('✅ [getExtractionAnalytics] Data received:', data);
  return data;
}

/**
 * @deprecated Use getExtractionAnalytics instead
 */
export async function getExtractionStatistics(runId: string): Promise<any> {
  return getExtractionAnalytics({ runId });
}

/**
 * @deprecated Use getExtractionAnalytics instead
 */
export async function getExtractionMetricsCard(runId: string): Promise<any[]> {
  const analytics = await getExtractionAnalytics({ runId });
  return analytics?.contatos || [];
}

/**
 * Buscar dashboard completo com múltiplas extrações
 * usando RPC get_extraction_dashboard
 */
export async function getExtractionDashboard(workspaceId: string, limit: number = 5): Promise<any> {
  const { data, error } = await supabase
    .rpc('get_extraction_dashboard', { 
      p_workspace_id: workspaceId,
      p_limit: limit 
    });

  if (error) {
    console.error('Error fetching extraction dashboard:', error);
    throw error;
  }

  return data;
}