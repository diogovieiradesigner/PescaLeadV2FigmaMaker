// =============================================================================
// TYPES: Instagram Lead Extraction
// =============================================================================
// REFATORADO: Usa tabelas compartilhadas (lead_extraction_runs, extraction_logs,
//             lead_extraction_staging) com source='instagram'
//
// Tipos TypeScript para o sistema de extração de leads do Instagram
// Usado por: InstagramExtractionPanel, instagram-extraction.service
// =============================================================================

/**
 * Status possíveis de uma extração
 */
export type InstagramExtractionStatus =
  | 'pending'
  | 'discovering'
  | 'enriching'
  | 'migrating'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled';

/**
 * Status de uma etapa (discovery/enrichment)
 */
export type InstagramPhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Status de processamento de um perfil
 */
export type ProfileProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Configuração de uma extração Instagram
 */
export interface InstagramExtractionConfig {
  workspaceId: string;
  funnelId?: string;
  columnId?: string;
  niche: string;
  location: string;
  targetQuantity: number;
}

/**
 * Run de extração Instagram
 * NOTA: Usa tabela compartilhada lead_extraction_runs com source='instagram'
 */
export interface InstagramExtractionRun {
  id: string;
  workspace_id: string;
  funnel_id: string | null;
  column_id: string | null;
  source: 'instagram'; // Campo obrigatório para identificar o tipo

  // Configuração da busca (campos específicos do Instagram)
  niche: string;
  location: string;
  target_quantity: number;
  search_term?: string; // Campo genérico da tabela compartilhada

  // Status geral
  status: InstagramExtractionStatus;

  // Etapa 1: Descoberta (Serper)
  discovery_status: InstagramPhaseStatus;
  discovery_queries_total: number;
  discovery_queries_completed: number;
  discovery_profiles_found: number;
  discovery_profiles_unique: number;

  // Etapa 2: Enriquecimento (Bright Data)
  enrichment_status: InstagramPhaseStatus;
  enrichment_snapshot_id: string | null;
  enrichment_profiles_total: number;
  enrichment_profiles_completed: number;
  enrichment_profiles_failed: number;

  // Resultado final
  leads_created: number;
  created_quantity?: number; // Campo real da tabela (alias para leads_created)
  leads_duplicates_skipped: number;

  // Timing
  started_at: string | null;
  discovery_completed_at: string | null;
  enrichment_completed_at: string | null;
  finished_at: string | null;

  // Metadata
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Resultado de descoberta (Serper)
 */
export interface InstagramDiscoveryResult {
  id: string;
  run_id: string;

  // Dados do Google/Serper
  google_title: string | null;
  google_link: string;
  google_snippet: string | null;
  search_query: string | null;
  search_position: number | null;

  // Dados extraídos
  username: string;
  profile_url: string;

  // Controle
  is_valid: boolean;
  is_duplicate: boolean;
  sent_to_enrichment: boolean;

  created_at: string;
}

/**
 * Perfil enriquecido (Bright Data)
 * NOTA: Usa tabela compartilhada lead_extraction_staging com source='instagram'
 * Os campos do Instagram são prefixados com 'instagram_'
 */
export interface InstagramEnrichedProfile {
  id: string;
  run_id: string;
  workspace_id: string;
  funnel_id: string | null;
  column_id: string | null;
  source: 'instagram';

  // Campos padrão da tabela compartilhada
  name: string | null; // full_name
  website: string | null; // external_url

  // Dados específicos do Instagram (prefixados)
  instagram_username: string;
  instagram_id: string | null;
  instagram_biography: string | null;
  instagram_profile_pic_url: string | null;
  instagram_discovery_id: string | null;

  // Métricas Instagram
  instagram_followers_count: number | null;
  instagram_following_count: number | null;
  instagram_posts_count: number | null;

  // Status da conta Instagram
  instagram_is_verified: boolean;
  instagram_is_business_account: boolean;
  instagram_is_professional_account: boolean;
  instagram_is_private: boolean;

  // Contato público Instagram
  instagram_business_email: string | null;
  instagram_business_phone: string | null;
  instagram_business_category: string | null;
  instagram_business_address: any | null;

  // Contato extraído da bio Instagram
  instagram_email_from_bio: string | null;
  instagram_phone_from_bio: string | null;
  instagram_whatsapp_from_bio: string | null;

  // Controle de enriquecimento
  instagram_enriched: boolean;

  // Controle de migração (campos compartilhados)
  processing_status: ProfileProcessingStatus;
  migrated_to_leads: boolean;
  migrated_at: string | null;
  lead_id: string | null;
  skip_reason: string | null;

  // Raw data
  raw_data: any | null;

  created_at: string;
  updated_at: string;
}

/**
 * Alias para compatibilidade - mapeia campos antigos para novos
 * Útil durante a transição
 */
export interface InstagramEnrichedProfileLegacy {
  id: string;
  run_id: string;
  discovery_id: string | null;
  workspace_id: string;
  funnel_id: string | null;
  column_id: string | null;

  // Dados básicos do perfil (mapeados)
  instagram_id: string | null;
  username: string; // → instagram_username
  full_name: string | null; // → name
  biography: string | null; // → instagram_biography
  profile_pic_url: string | null; // → instagram_profile_pic_url

  // Métricas (mapeados)
  followers_count: number | null; // → instagram_followers_count
  following_count: number | null; // → instagram_following_count
  posts_count: number | null; // → instagram_posts_count

  // Status da conta (mapeados)
  is_verified: boolean; // → instagram_is_verified
  is_business_account: boolean; // → instagram_is_business_account
  is_professional_account: boolean; // → instagram_is_professional_account
  is_private: boolean; // → instagram_is_private

  // Contato público (mapeados)
  external_url: string | null; // → website
  business_email: string | null; // → instagram_business_email
  business_phone: string | null; // → instagram_business_phone
  business_category: string | null; // → instagram_business_category
  business_address: any | null; // → instagram_business_address

  // Contato extraído da bio (mapeados)
  email_from_bio: string | null; // → instagram_email_from_bio
  phone_from_bio: string | null; // → instagram_phone_from_bio
  whatsapp_from_bio: string | null; // → instagram_whatsapp_from_bio

  // Controle de migração
  processing_status: ProfileProcessingStatus;
  migrated_to_leads: boolean;
  migrated_at: string | null;
  lead_id: string | null;
  skip_reason: string | null;

  raw_data: any | null;
  created_at: string;
  updated_at: string;
}

/**
 * Função helper para converter de staging para formato legacy
 */
export function mapStagingToLegacyProfile(staging: InstagramEnrichedProfile): InstagramEnrichedProfileLegacy {
  return {
    id: staging.id,
    run_id: staging.run_id,
    discovery_id: staging.instagram_discovery_id,
    workspace_id: staging.workspace_id,
    funnel_id: staging.funnel_id,
    column_id: staging.column_id,
    instagram_id: staging.instagram_id,
    username: staging.instagram_username,
    full_name: staging.name,
    biography: staging.instagram_biography,
    profile_pic_url: staging.instagram_profile_pic_url,
    followers_count: staging.instagram_followers_count,
    following_count: staging.instagram_following_count,
    posts_count: staging.instagram_posts_count,
    is_verified: staging.instagram_is_verified,
    is_business_account: staging.instagram_is_business_account,
    is_professional_account: staging.instagram_is_professional_account,
    is_private: staging.instagram_is_private,
    external_url: staging.website,
    business_email: staging.instagram_business_email,
    business_phone: staging.instagram_business_phone,
    business_category: staging.instagram_business_category,
    business_address: staging.instagram_business_address,
    email_from_bio: staging.instagram_email_from_bio,
    phone_from_bio: staging.instagram_phone_from_bio,
    whatsapp_from_bio: staging.instagram_whatsapp_from_bio,
    processing_status: staging.processing_status,
    migrated_to_leads: staging.migrated_to_leads,
    migrated_at: staging.migrated_at,
    lead_id: staging.lead_id,
    skip_reason: staging.skip_reason,
    raw_data: staging.raw_data,
    created_at: staging.created_at,
    updated_at: staging.updated_at,
  };
}

/**
 * Log de extração
 * NOTA: Usa tabela compartilhada extraction_logs com source='instagram'
 */
export interface InstagramExtractionLog {
  id: string;
  run_id: string;
  source: 'instagram';
  step_number: number;
  step_name: string;
  phase: 'discovery' | 'enrichment' | 'migration' | 'general';
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details: any | null;
  created_at: string;
}

/**
 * Resposta da API de descoberta
 */
export interface DiscoveryResponse {
  success: boolean;
  run_id: string;
  discovery?: {
    queries_executed: number;
    total_found: number;
    unique_profiles: number;
    duplicates_skipped: number;
  };
  error?: string;
  message?: string;
}

/**
 * Resposta da API de enriquecimento
 */
export interface EnrichmentResponse {
  success: boolean;
  run_id: string;
  snapshot_id?: string;
  profiles_sent?: number;
  status?: 'running' | 'completed' | 'failed' | 'ready';
  progress?: number;
  enriched?: number;
  failed?: number;
  error?: string;
  message?: string;
}

/**
 * Resposta da API de migração
 */
export interface MigrationResponse {
  success: boolean;
  run_id: string;
  batch?: {
    leads_created: number;
    duplicates_skipped: number;
    errors: number;
  };
  remaining?: number;
  has_more?: boolean;
  error?: string;
  message?: string;
}

/**
 * Status completo de uma extração
 */
export interface InstagramExtractionFullStatus {
  run: InstagramExtractionRun;
  discovery: {
    status: InstagramPhaseStatus;
    queries_total: number;
    queries_completed: number;
    profiles_found: number;
    profiles_unique: number;
    started_at: string | null;
    completed_at: string | null;
  };
  enrichment: {
    status: InstagramPhaseStatus;
    snapshot_id: string | null;
    profiles_total: number;
    profiles_completed: number;
    profiles_failed: number;
    completed_at: string | null;
  };
  migration: {
    leads_created: number;
    duplicates_skipped: number;
    profiles_pending: number;
    profiles_migrated: number;
    finished_at: string | null;
  };
  logs: InstagramExtractionLog[];
}

/**
 * Props para o componente de preview de perfil
 */
export interface ProfilePreviewProps {
  profile: InstagramEnrichedProfile;
  onClose?: () => void;
}

/**
 * Configuração de paginação
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Filtros para listagem de perfis
 */
export interface ProfileFilters {
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasWhatsapp?: boolean;
  isBusiness?: boolean;
  isVerified?: boolean;
  minFollowers?: number;
  status?: ProfileProcessingStatus;
}

/**
 * Estatísticas de uma extração
 */
export interface ExtractionStats {
  total_profiles: number;
  with_email: number;
  with_phone: number;
  with_whatsapp: number;
  business_accounts: number;
  verified_accounts: number;
  average_followers: number;
  leads_created: number;
}

/**
 * Nichos sugeridos para busca
 */
export const SUGGESTED_NICHES = [
  'dentista',
  'advogado',
  'médico',
  'nutricionista',
  'psicólogo',
  'personal trainer',
  'fotógrafo',
  'restaurante',
  'salão de beleza',
  'imobiliária',
  'arquiteto',
  'contador',
  'veterinário',
  'fisioterapeuta',
  'academia',
  'escola',
  'clínica estética',
  'pet shop',
  'padaria',
  'pizzaria',
] as const;

/**
 * Localizações sugeridas
 */
export const SUGGESTED_LOCATIONS = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Brasília',
  'Curitiba',
  'Porto Alegre',
  'Salvador',
  'Fortaleza',
  'Recife',
  'Goiânia',
  'Campinas',
  'Manaus',
  'Belém',
  'Florianópolis',
  'Vitória',
] as const;
