-- =============================================================================
-- MIGRATION: Instagram Lead Extraction Tables
-- =============================================================================
-- Arquitetura de 3 etapas:
-- 1. Descoberta (Serper.dev) - Busca perfis por nicho+localização via Google
-- 2. Enriquecimento (Apify) - Extrai dados completos dos perfis
-- 3. Migração - Converte perfis enriquecidos para leads no CRM
-- =============================================================================

-- =============================================================================
-- Tabela de execuções de extração Instagram (3 etapas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS instagram_extraction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  column_id UUID REFERENCES funnel_columns(id) ON DELETE SET NULL,

  -- Configuração da busca
  niche TEXT NOT NULL,                    -- "dentista", "advogado", etc
  location TEXT NOT NULL,                 -- "são paulo", "rio de janeiro", etc
  target_quantity INTEGER NOT NULL DEFAULT 100,

  -- Status geral
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'discovering', 'enriching', 'migrating', 'completed', 'partial', 'failed', 'cancelled')),

  -- Etapa 1: Descoberta (Serper)
  discovery_status TEXT DEFAULT 'pending'
    CHECK (discovery_status IN ('pending', 'running', 'completed', 'failed')),
  discovery_queries_total INTEGER DEFAULT 0,
  discovery_queries_completed INTEGER DEFAULT 0,
  discovery_profiles_found INTEGER DEFAULT 0,
  discovery_profiles_unique INTEGER DEFAULT 0,

  -- Etapa 2: Enriquecimento (Apify)
  enrichment_status TEXT DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending', 'running', 'completed', 'failed')),
  enrichment_snapshot_id TEXT,            -- ID da run no Apify
  enrichment_profiles_total INTEGER DEFAULT 0,
  enrichment_profiles_completed INTEGER DEFAULT 0,
  enrichment_profiles_failed INTEGER DEFAULT 0,

  -- Resultado final
  leads_created INTEGER DEFAULT 0,
  leads_duplicates_skipped INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  discovery_completed_at TIMESTAMPTZ,
  enrichment_completed_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  -- Metadata
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentário da tabela
COMMENT ON TABLE instagram_extraction_runs IS 'Controle de execuções de extração do Instagram (3 etapas: Serper + Apify + Migration)';
COMMENT ON COLUMN instagram_extraction_runs.niche IS 'Nicho de busca: dentista, advogado, restaurante, etc';
COMMENT ON COLUMN instagram_extraction_runs.location IS 'Localização: são paulo, rio de janeiro, etc';
COMMENT ON COLUMN instagram_extraction_runs.enrichment_snapshot_id IS 'ID da run no Apify Actor';

-- =============================================================================
-- Resultados da Etapa 1: Descoberta (Serper.dev)
-- =============================================================================
CREATE TABLE IF NOT EXISTS instagram_discovery_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES instagram_extraction_runs(id) ON DELETE CASCADE,

  -- Dados do Google/Serper
  google_title TEXT,
  google_link TEXT NOT NULL,
  google_snippet TEXT,
  search_query TEXT,
  search_position INTEGER,

  -- Dados extraídos
  username TEXT NOT NULL,
  profile_url TEXT NOT NULL,

  -- Controle
  is_valid BOOLEAN DEFAULT TRUE,
  is_duplicate BOOLEAN DEFAULT FALSE,
  sent_to_enrichment BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentário da tabela
COMMENT ON TABLE instagram_discovery_results IS 'Resultados da Etapa 1 - Perfis descobertos via Google/Serper.dev';
COMMENT ON COLUMN instagram_discovery_results.google_link IS 'URL original retornada pelo Google';
COMMENT ON COLUMN instagram_discovery_results.username IS 'Username do Instagram extraído da URL';

-- =============================================================================
-- Resultados da Etapa 2: Enriquecimento (Apify)
-- =============================================================================
CREATE TABLE IF NOT EXISTS instagram_enriched_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES instagram_extraction_runs(id) ON DELETE CASCADE,
  discovery_id UUID REFERENCES instagram_discovery_results(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  column_id UUID REFERENCES funnel_columns(id) ON DELETE SET NULL,

  -- Dados básicos do perfil
  instagram_id TEXT,
  username TEXT NOT NULL,
  full_name TEXT,
  biography TEXT,
  profile_pic_url TEXT,

  -- Métricas
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,

  -- Status da conta
  is_verified BOOLEAN DEFAULT FALSE,
  is_business_account BOOLEAN DEFAULT FALSE,
  is_professional_account BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,

  -- Contato público (dados da API)
  external_url TEXT,
  business_email TEXT,
  business_phone TEXT,
  business_category TEXT,
  business_address JSONB,

  -- Contato extraído da bio (regex)
  email_from_bio TEXT,
  phone_from_bio TEXT,
  whatsapp_from_bio TEXT,

  -- Controle de migração
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  migrated_to_leads BOOLEAN DEFAULT FALSE,
  migrated_at TIMESTAMPTZ,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  skip_reason TEXT,

  -- Raw data
  raw_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentário da tabela
COMMENT ON TABLE instagram_enriched_profiles IS 'Resultados da Etapa 2 - Perfis enriquecidos via Apify';
COMMENT ON COLUMN instagram_enriched_profiles.raw_data IS 'Dados brutos retornados pela Apify API';
COMMENT ON COLUMN instagram_enriched_profiles.email_from_bio IS 'Email extraído da bio via regex';
COMMENT ON COLUMN instagram_enriched_profiles.phone_from_bio IS 'Telefone extraído da bio via regex';

-- =============================================================================
-- Logs estruturados
-- =============================================================================
CREATE TABLE IF NOT EXISTS instagram_extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES instagram_extraction_runs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('discovery', 'enrichment', 'migration', 'general')),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentário da tabela
COMMENT ON TABLE instagram_extraction_logs IS 'Logs estruturados de cada etapa da extração Instagram';

-- =============================================================================
-- Índices para performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ig_runs_workspace ON instagram_extraction_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ig_runs_status ON instagram_extraction_runs(status);
CREATE INDEX IF NOT EXISTS idx_ig_runs_created_at ON instagram_extraction_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ig_discovery_run ON instagram_discovery_results(run_id);
CREATE INDEX IF NOT EXISTS idx_ig_discovery_username ON instagram_discovery_results(username);
CREATE INDEX IF NOT EXISTS idx_ig_discovery_sent ON instagram_discovery_results(sent_to_enrichment) WHERE sent_to_enrichment = FALSE;

CREATE INDEX IF NOT EXISTS idx_ig_enriched_run ON instagram_enriched_profiles(run_id);
CREATE INDEX IF NOT EXISTS idx_ig_enriched_workspace ON instagram_enriched_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ig_enriched_username ON instagram_enriched_profiles(username);
CREATE INDEX IF NOT EXISTS idx_ig_enriched_status ON instagram_enriched_profiles(processing_status);
CREATE INDEX IF NOT EXISTS idx_ig_enriched_not_migrated ON instagram_enriched_profiles(migrated_to_leads) WHERE migrated_to_leads = FALSE;

CREATE INDEX IF NOT EXISTS idx_ig_logs_run ON instagram_extraction_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_ig_logs_phase ON instagram_extraction_logs(phase);

-- =============================================================================
-- RLS Policies
-- =============================================================================
ALTER TABLE instagram_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_discovery_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_enriched_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_extraction_logs ENABLE ROW LEVEL SECURITY;

-- Workspace members access - instagram_extraction_runs
CREATE POLICY "Workspace members can view ig runs" ON instagram_extraction_runs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert ig runs" ON instagram_extraction_runs
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update ig runs" ON instagram_extraction_runs
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace members access - instagram_discovery_results
CREATE POLICY "Workspace members can view ig discovery" ON instagram_discovery_results
  FOR SELECT USING (
    run_id IN (
      SELECT id FROM instagram_extraction_runs WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Workspace members can insert ig discovery" ON instagram_discovery_results
  FOR INSERT WITH CHECK (
    run_id IN (
      SELECT id FROM instagram_extraction_runs WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Workspace members access - instagram_enriched_profiles
CREATE POLICY "Workspace members can view ig enriched" ON instagram_enriched_profiles
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert ig enriched" ON instagram_enriched_profiles
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update ig enriched" ON instagram_enriched_profiles
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace members access - instagram_extraction_logs
CREATE POLICY "Workspace members can view ig logs" ON instagram_extraction_logs
  FOR SELECT USING (
    run_id IN (
      SELECT id FROM instagram_extraction_runs WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Workspace members can insert ig logs" ON instagram_extraction_logs
  FOR INSERT WITH CHECK (
    run_id IN (
      SELECT id FROM instagram_extraction_runs WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Service role full access (para edge functions)
CREATE POLICY "Service role full access ig runs" ON instagram_extraction_runs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access ig discovery" ON instagram_discovery_results
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access ig enriched" ON instagram_enriched_profiles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access ig logs" ON instagram_extraction_logs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =============================================================================
-- Triggers para updated_at
-- =============================================================================
CREATE TRIGGER update_ig_runs_updated_at
  BEFORE UPDATE ON instagram_extraction_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ig_enriched_updated_at
  BEFORE UPDATE ON instagram_enriched_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Função auxiliar para criar logs
-- =============================================================================
CREATE OR REPLACE FUNCTION create_instagram_extraction_log(
  p_run_id UUID,
  p_step_number INTEGER,
  p_step_name TEXT,
  p_phase TEXT,
  p_level TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO instagram_extraction_logs (run_id, step_number, step_name, phase, level, message, details)
  VALUES (p_run_id, p_step_number, p_step_name, p_phase, p_level, p_message, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION create_instagram_extraction_log IS 'Helper para criar logs de extração Instagram';
