-- =============================================================================
-- MIGRATION: Refatorar Instagram para usar tabelas compartilhadas
-- =============================================================================
-- Seguindo o padrão do CNPJ:
-- 1. Adicionar campo 'source' às tabelas existentes
-- 2. Adicionar campos Instagram ao lead_extraction_staging
-- 3. Remover tabelas duplicadas (instagram_extraction_runs, instagram_extraction_logs)
-- 4. Manter instagram_discovery_results (específico do Serper)
-- 5. Manter instagram_enriched_profiles como staging do Instagram
-- =============================================================================

-- =============================================================================
-- PASSO 1: Adicionar campo 'source' às tabelas existentes
-- =============================================================================

-- 1.1 lead_extraction_runs
ALTER TABLE lead_extraction_runs
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_maps'
CHECK (source IN ('google_maps', 'instagram', 'cnpj', 'linkedin'));

COMMENT ON COLUMN lead_extraction_runs.source IS 'Fonte da extração: google_maps, instagram, cnpj, linkedin';

-- Adicionar campos específicos do Instagram na tabela de runs
ALTER TABLE lead_extraction_runs
ADD COLUMN IF NOT EXISTS niche TEXT,
ADD COLUMN IF NOT EXISTS discovery_status TEXT DEFAULT 'pending'
  CHECK (discovery_status IS NULL OR discovery_status IN ('pending', 'running', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS discovery_queries_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discovery_queries_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discovery_profiles_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discovery_profiles_unique INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'
  CHECK (enrichment_status IS NULL OR enrichment_status IN ('pending', 'running', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS enrichment_snapshot_id TEXT,
ADD COLUMN IF NOT EXISTS enrichment_profiles_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enrichment_profiles_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enrichment_profiles_failed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discovery_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrichment_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN lead_extraction_runs.niche IS 'Nicho de busca (Instagram): dentista, advogado, etc';
COMMENT ON COLUMN lead_extraction_runs.discovery_status IS 'Status da etapa de descoberta (Instagram/Serper)';
COMMENT ON COLUMN lead_extraction_runs.enrichment_snapshot_id IS 'ID do snapshot na Bright Data (Instagram)';

-- 1.2 extraction_logs - adicionar source
ALTER TABLE extraction_logs
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_maps'
CHECK (source IN ('google_maps', 'instagram', 'cnpj', 'linkedin'));

COMMENT ON COLUMN extraction_logs.source IS 'Fonte da extração: google_maps, instagram, cnpj, linkedin';

-- Adicionar campo phase se não existir (para compatibilidade com Instagram)
ALTER TABLE extraction_logs
ADD COLUMN IF NOT EXISTS phase TEXT
CHECK (phase IS NULL OR phase IN ('discovery', 'enrichment', 'migration', 'general', 'extraction'));

-- =============================================================================
-- PASSO 2: Adicionar campos Instagram ao lead_extraction_staging
-- =============================================================================

ALTER TABLE lead_extraction_staging
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_maps'
  CHECK (source IN ('google_maps', 'instagram', 'cnpj', 'linkedin')),

-- Dados do Instagram
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_id TEXT,
ADD COLUMN IF NOT EXISTS instagram_full_name TEXT,
ADD COLUMN IF NOT EXISTS instagram_biography TEXT,
ADD COLUMN IF NOT EXISTS instagram_profile_pic_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_followers_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_following_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_posts_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instagram_is_business BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instagram_is_professional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instagram_is_private BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instagram_external_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_business_email TEXT,
ADD COLUMN IF NOT EXISTS instagram_business_phone TEXT,
ADD COLUMN IF NOT EXISTS instagram_business_category TEXT,
ADD COLUMN IF NOT EXISTS instagram_business_address JSONB,
ADD COLUMN IF NOT EXISTS instagram_email_from_bio TEXT,
ADD COLUMN IF NOT EXISTS instagram_phone_from_bio TEXT,
ADD COLUMN IF NOT EXISTS instagram_whatsapp_from_bio TEXT,
ADD COLUMN IF NOT EXISTS instagram_discovery_id UUID,
ADD COLUMN IF NOT EXISTS instagram_raw_data JSONB,
ADD COLUMN IF NOT EXISTS instagram_enriched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instagram_enriched_at TIMESTAMPTZ;

COMMENT ON COLUMN lead_extraction_staging.source IS 'Fonte da extração: google_maps, instagram, cnpj, linkedin';
COMMENT ON COLUMN lead_extraction_staging.instagram_username IS 'Username do Instagram';
COMMENT ON COLUMN lead_extraction_staging.instagram_discovery_id IS 'Referência ao resultado de descoberta do Serper';
COMMENT ON COLUMN lead_extraction_staging.instagram_raw_data IS 'Dados brutos da Bright Data API';

-- Índices para Instagram
CREATE INDEX IF NOT EXISTS idx_staging_source ON lead_extraction_staging(source);
CREATE INDEX IF NOT EXISTS idx_staging_instagram_username ON lead_extraction_staging(instagram_username) WHERE instagram_username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staging_instagram_enriched ON lead_extraction_staging(instagram_enriched) WHERE source = 'instagram';

-- Índice para runs por source
CREATE INDEX IF NOT EXISTS idx_runs_source ON lead_extraction_runs(source);

-- =============================================================================
-- PASSO 3: Atualizar instagram_discovery_results para referenciar lead_extraction_runs
-- =============================================================================

-- Remover a FK antiga que referencia instagram_extraction_runs
ALTER TABLE instagram_discovery_results
DROP CONSTRAINT IF EXISTS instagram_discovery_results_run_id_fkey;

-- Adicionar nova FK que referencia lead_extraction_runs
ALTER TABLE instagram_discovery_results
ADD CONSTRAINT instagram_discovery_results_run_id_fkey
FOREIGN KEY (run_id) REFERENCES lead_extraction_runs(id) ON DELETE CASCADE;

-- =============================================================================
-- PASSO 4: Migrar dados existentes (se houver)
-- =============================================================================

-- Migrar runs do Instagram para lead_extraction_runs
INSERT INTO lead_extraction_runs (
  id, workspace_id, funnel_id, column_id,
  search_term, location, target_quantity,
  status, source,
  niche, discovery_status, discovery_queries_total, discovery_queries_completed,
  discovery_profiles_found, discovery_profiles_unique,
  enrichment_status, enrichment_snapshot_id,
  enrichment_profiles_total, enrichment_profiles_completed, enrichment_profiles_failed,
  created_quantity, duplicates_skipped,
  started_at, discovery_completed_at, enrichment_completed_at, finished_at,
  error_message, created_by, created_at, updated_at
)
SELECT
  id, workspace_id, funnel_id, column_id,
  niche || ' ' || location, location, target_quantity,
  status, 'instagram',
  niche, discovery_status, discovery_queries_total, discovery_queries_completed,
  discovery_profiles_found, discovery_profiles_unique,
  enrichment_status, enrichment_snapshot_id,
  enrichment_profiles_total, enrichment_profiles_completed, enrichment_profiles_failed,
  leads_created, leads_duplicates_skipped,
  started_at, discovery_completed_at, enrichment_completed_at, finished_at,
  error_message, created_by, created_at, updated_at
FROM instagram_extraction_runs
WHERE id NOT IN (SELECT id FROM lead_extraction_runs)
ON CONFLICT (id) DO NOTHING;

-- Migrar logs do Instagram para extraction_logs
INSERT INTO extraction_logs (
  id, run_id, step_number, step_name, level, message, details, created_at, source, phase
)
SELECT
  id, run_id, step_number, step_name, level, message, details, created_at, 'instagram', phase
FROM instagram_extraction_logs
WHERE id NOT IN (SELECT id FROM extraction_logs)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PASSO 5: Remover tabelas duplicadas do Instagram
-- =============================================================================

-- Remover triggers antes de dropar as tabelas
DROP TRIGGER IF EXISTS update_ig_runs_updated_at ON instagram_extraction_runs;
DROP TRIGGER IF EXISTS update_ig_enriched_updated_at ON instagram_enriched_profiles;

-- Remover função auxiliar duplicada
DROP FUNCTION IF EXISTS create_instagram_extraction_log(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB);

-- Remover policies antes de dropar as tabelas
DROP POLICY IF EXISTS "Workspace members can view ig runs" ON instagram_extraction_runs;
DROP POLICY IF EXISTS "Workspace members can insert ig runs" ON instagram_extraction_runs;
DROP POLICY IF EXISTS "Workspace members can update ig runs" ON instagram_extraction_runs;
DROP POLICY IF EXISTS "Service role full access ig runs" ON instagram_extraction_runs;

DROP POLICY IF EXISTS "Workspace members can view ig logs" ON instagram_extraction_logs;
DROP POLICY IF EXISTS "Workspace members can insert ig logs" ON instagram_extraction_logs;
DROP POLICY IF EXISTS "Service role full access ig logs" ON instagram_extraction_logs;

-- Dropar tabelas duplicadas (runs e logs)
-- NÃO dropar instagram_discovery_results (específico do Serper)
-- NÃO dropar instagram_enriched_profiles (staging específico do Instagram)
DROP TABLE IF EXISTS instagram_extraction_logs CASCADE;
DROP TABLE IF EXISTS instagram_extraction_runs CASCADE;

-- =============================================================================
-- PASSO 6: Atualizar RLS do instagram_discovery_results para usar lead_extraction_runs
-- =============================================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Workspace members can view ig discovery" ON instagram_discovery_results;
DROP POLICY IF EXISTS "Workspace members can insert ig discovery" ON instagram_discovery_results;
DROP POLICY IF EXISTS "Service role full access ig discovery" ON instagram_discovery_results;

-- Criar novas policies referenciando lead_extraction_runs
CREATE POLICY "Workspace members can view ig discovery" ON instagram_discovery_results
  FOR SELECT USING (
    run_id IN (
      SELECT id FROM lead_extraction_runs WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Workspace members can insert ig discovery" ON instagram_discovery_results
  FOR INSERT WITH CHECK (
    run_id IN (
      SELECT id FROM lead_extraction_runs WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role full access ig discovery" ON instagram_discovery_results
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =============================================================================
-- PASSO 7: Criar fila PGMQ para Instagram
-- =============================================================================

-- Criar fila de processamento do Instagram (similar à google_maps_queue)
SELECT pgmq.create('instagram_queue');

-- =============================================================================
-- PASSO 8: Função helper para criar logs com source
-- =============================================================================

CREATE OR REPLACE FUNCTION create_extraction_log_v2(
  p_run_id UUID,
  p_step_number INTEGER,
  p_step_name TEXT,
  p_level TEXT,
  p_message TEXT,
  p_source TEXT DEFAULT 'google_maps',
  p_phase TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO extraction_logs (run_id, step_number, step_name, level, message, source, phase, details)
  VALUES (p_run_id, p_step_number, p_step_name, p_level, p_message, p_source, p_phase, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION create_extraction_log_v2 IS 'Helper v2 para criar logs de extração com suporte a source e phase';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION create_extraction_log_v2(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_extraction_log_v2(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- =============================================================================
-- PASSO 9: Atualizar get_enrichment_status para suportar Instagram
-- =============================================================================

CREATE OR REPLACE FUNCTION get_enrichment_status(run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source TEXT;
  v_total INT;

  -- WhatsApp
  v_whatsapp_total_com_telefone INT;
  v_whatsapp_verificados INT;
  v_whatsapp_validos INT;
  v_whatsapp_invalidos INT;
  v_whatsapp_pending INT;
  v_whatsapp_sem_telefone INT;

  -- WHOIS
  v_whois_total_br INT;
  v_whois_enriched INT;
  v_whois_pending INT;
  v_whois_internacional INT;
  v_whois_sem_dominio INT;

  -- CNPJ
  v_cnpj_total_com_cnpj INT;
  v_cnpj_enriched INT;
  v_cnpj_pending INT;
  v_cnpj_sem_cnpj INT;

  -- Scraping
  v_scraping_total_com_site INT;
  v_scraping_pending INT;
  v_scraping_processing INT;
  v_scraping_completed INT;
  v_scraping_failed INT;
  v_scraping_sem_site INT;

  -- Instagram
  v_instagram_total INT;
  v_instagram_enriched INT;
  v_instagram_pending INT;
  v_instagram_with_email INT;
  v_instagram_with_phone INT;
  v_instagram_with_whatsapp INT;

  -- Status geral
  v_status_pending INT;
  v_status_enriching INT;
  v_status_completed INT;

BEGIN
  -- Buscar source do run
  SELECT source INTO v_source FROM lead_extraction_runs WHERE id = run_id;

  -- Total de leads no staging
  SELECT COUNT(*) INTO v_total
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  IF v_total = 0 THEN
    RETURN json_build_object(
      'total', 0,
      'source', v_source,
      'whatsapp', json_build_object('total_com_telefone', 0, 'verificados', 0, 'validos', 0, 'invalidos', 0, 'pending', 0, 'sem_telefone', 0),
      'whois', json_build_object('total_br', 0, 'enriched', 0, 'pending', 0, 'internacional', 0, 'sem_dominio', 0),
      'cnpj', json_build_object('total_com_cnpj', 0, 'enriched', 0, 'pending', 0, 'sem_cnpj', 0),
      'scraping', json_build_object('total_com_site', 0, 'pending', 0, 'processing', 0, 'completed', 0, 'failed', 0, 'sem_site', 0),
      'instagram', json_build_object('total', 0, 'enriched', 0, 'pending', 0, 'with_email', 0, 'with_phone', 0, 'with_whatsapp', 0),
      'status_enrichment', json_build_object('pending', 0, 'enriching', 0, 'completed', 0)
    );
  END IF;

  -- ========================================
  -- WhatsApp Stats (igual ao original)
  -- ========================================
  SELECT
    COUNT(*) FILTER (WHERE phone_normalized IS NOT NULL AND phone_normalized != ''),
    COUNT(*) FILTER (WHERE whatsapp_checked_at IS NOT NULL),
    COUNT(*) FILTER (WHERE whatsapp_valid = true),
    COUNT(*) FILTER (WHERE whatsapp_valid = false),
    COUNT(*) FILTER (WHERE phone_normalized IS NOT NULL AND phone_normalized != '' AND whatsapp_checked_at IS NULL),
    COUNT(*) FILTER (WHERE phone_normalized IS NULL OR phone_normalized = '')
  INTO
    v_whatsapp_total_com_telefone, v_whatsapp_verificados, v_whatsapp_validos,
    v_whatsapp_invalidos, v_whatsapp_pending, v_whatsapp_sem_telefone
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- WHOIS Stats (igual ao original)
  -- ========================================
  SELECT
    COUNT(*) FILTER (WHERE domain IS NOT NULL AND domain LIKE '%.br'),
    COUNT(*) FILTER (WHERE domain IS NOT NULL AND domain LIKE '%.br' AND whois_enriched = true),
    COUNT(*) FILTER (WHERE domain IS NOT NULL AND domain LIKE '%.br' AND (whois_enriched = false OR whois_enriched IS NULL)),
    COUNT(*) FILTER (WHERE domain IS NOT NULL AND domain != '' AND domain NOT LIKE '%.br'),
    COUNT(*) FILTER (WHERE domain IS NULL OR domain = '')
  INTO
    v_whois_total_br, v_whois_enriched, v_whois_pending, v_whois_internacional, v_whois_sem_dominio
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- CNPJ Stats (igual ao original)
  -- ========================================
  SELECT
    COUNT(*) FILTER (WHERE cnpj_normalized IS NOT NULL AND cnpj_normalized != ''),
    COUNT(*) FILTER (WHERE cnpj_normalized IS NOT NULL AND cnpj_normalized != '' AND cnpj_enriched = true),
    COUNT(*) FILTER (WHERE cnpj_normalized IS NOT NULL AND cnpj_normalized != '' AND (cnpj_enriched = false OR cnpj_enriched IS NULL)),
    COUNT(*) FILTER (WHERE cnpj_normalized IS NULL OR cnpj_normalized = '')
  INTO
    v_cnpj_total_com_cnpj, v_cnpj_enriched, v_cnpj_pending, v_cnpj_sem_cnpj
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- Scraping Stats (igual ao original)
  -- ========================================
  SELECT
    COUNT(*) FILTER (WHERE primary_website IS NOT NULL AND primary_website != ''),
    COUNT(*) FILTER (WHERE primary_website IS NOT NULL AND primary_website != '' AND (scraping_status IS NULL OR scraping_status = 'pending')),
    COUNT(*) FILTER (WHERE scraping_status = 'processing'),
    COUNT(*) FILTER (WHERE scraping_status = 'completed' OR scraping_enriched = true),
    COUNT(*) FILTER (WHERE scraping_status = 'failed'),
    COUNT(*) FILTER (WHERE primary_website IS NULL OR primary_website = '')
  INTO
    v_scraping_total_com_site, v_scraping_pending, v_scraping_processing,
    v_scraping_completed, v_scraping_failed, v_scraping_sem_site
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- Instagram Stats (NOVO)
  -- ========================================
  SELECT
    COUNT(*) FILTER (WHERE instagram_username IS NOT NULL),
    COUNT(*) FILTER (WHERE instagram_enriched = true),
    COUNT(*) FILTER (WHERE instagram_username IS NOT NULL AND (instagram_enriched = false OR instagram_enriched IS NULL)),
    COUNT(*) FILTER (WHERE instagram_business_email IS NOT NULL OR instagram_email_from_bio IS NOT NULL),
    COUNT(*) FILTER (WHERE instagram_business_phone IS NOT NULL OR instagram_phone_from_bio IS NOT NULL),
    COUNT(*) FILTER (WHERE instagram_whatsapp_from_bio IS NOT NULL)
  INTO
    v_instagram_total, v_instagram_enriched, v_instagram_pending,
    v_instagram_with_email, v_instagram_with_phone, v_instagram_with_whatsapp
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- Status Geral (igual ao original)
  -- ========================================
  SELECT
    COUNT(*) FILTER (WHERE status_enrichment = 'pending' OR status_enrichment IS NULL),
    COUNT(*) FILTER (WHERE status_enrichment = 'enriching'),
    COUNT(*) FILTER (WHERE status_enrichment = 'completed')
  INTO
    v_status_pending, v_status_enriching, v_status_completed
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- Retornar resultado
  -- ========================================
  RETURN json_build_object(
    'total', v_total,
    'source', v_source,
    'whatsapp', json_build_object(
      'total_com_telefone', v_whatsapp_total_com_telefone,
      'verificados', v_whatsapp_verificados,
      'validos', v_whatsapp_validos,
      'invalidos', v_whatsapp_invalidos,
      'pending', v_whatsapp_pending,
      'sem_telefone', v_whatsapp_sem_telefone
    ),
    'whois', json_build_object(
      'total_br', v_whois_total_br,
      'enriched', v_whois_enriched,
      'pending', v_whois_pending,
      'internacional', v_whois_internacional,
      'sem_dominio', v_whois_sem_dominio
    ),
    'cnpj', json_build_object(
      'total_com_cnpj', v_cnpj_total_com_cnpj,
      'enriched', v_cnpj_enriched,
      'pending', v_cnpj_pending,
      'sem_cnpj', v_cnpj_sem_cnpj
    ),
    'scraping', json_build_object(
      'total_com_site', v_scraping_total_com_site,
      'pending', v_scraping_pending,
      'processing', v_scraping_processing,
      'completed', v_scraping_completed,
      'failed', v_scraping_failed,
      'sem_site', v_scraping_sem_site
    ),
    'instagram', json_build_object(
      'total', v_instagram_total,
      'enriched', v_instagram_enriched,
      'pending', v_instagram_pending,
      'with_email', v_instagram_with_email,
      'with_phone', v_instagram_with_phone,
      'with_whatsapp', v_instagram_with_whatsapp
    ),
    'status_enrichment', json_build_object(
      'pending', v_status_pending,
      'enriching', v_status_enriching,
      'completed', v_status_completed
    )
  );
END;
$$;

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
