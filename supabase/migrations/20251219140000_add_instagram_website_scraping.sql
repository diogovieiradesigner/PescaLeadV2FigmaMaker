-- =============================================================================
-- MIGRATION: Adicionar Scraping de Websites para Instagram
-- =============================================================================
-- Adiciona colunas de scraping de websites à tabela instagram_enriched_profiles
-- e funções SQL necessárias para enfileiramento e processamento
-- =============================================================================

-- Adicionar colunas de scraping à tabela instagram_enriched_profiles
ALTER TABLE instagram_enriched_profiles
ADD COLUMN IF NOT EXISTS website_scraping_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS website_scraping_data JSONB,
ADD COLUMN IF NOT EXISTS website_scraping_error TEXT,
ADD COLUMN IF NOT EXISTS website_scraping_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS website_scraping_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS website_scraping_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS website_scraping_enriched BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS website_category TEXT,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Índice composto para buscar perfis pendentes (otimizado para FOR UPDATE SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_instagram_website_queue
ON instagram_enriched_profiles(website_scraping_status, external_url)
WHERE external_url IS NOT NULL;

-- Índice para aguardar scraping na migração
CREATE INDEX IF NOT EXISTS idx_instagram_enriched_await_scraping
ON instagram_enriched_profiles(processing_status, website_scraping_enriched)
WHERE processing_status = 'pending' AND external_url IS NOT NULL;

-- Comentários
COMMENT ON COLUMN instagram_enriched_profiles.website_scraping_status IS
  'Status do scraping do website: pending | queued | processing | completed | failed | skipped | blocked';

COMMENT ON COLUMN instagram_enriched_profiles.website_scraping_data IS
  'Dados extraídos do website via scraper API (emails, phones, cnpj, social_media, etc)';

COMMENT ON COLUMN instagram_enriched_profiles.website_category IS
  'Categoria da URL: business (scrape), social (skip), aggregator (skip), communication (extract whatsapp, skip), blocked (captcha)';

COMMENT ON COLUMN instagram_enriched_profiles.next_retry_at IS
  'Timestamp do próximo retry de scraping (backoff exponencial: 1min, 2min, 4min)';

-- =============================================================================
-- FUNÇÃO: get_pending_instagram_websites_locked
-- =============================================================================
-- Busca perfis com website pendente de scraping usando lock pessimista
-- FOR UPDATE SKIP LOCKED previne race condition entre crons simultâneos
-- =============================================================================
CREATE OR REPLACE FUNCTION get_pending_instagram_websites_locked(p_limit INT)
RETURNS TABLE (
  id UUID,
  external_url TEXT,
  run_id UUID,
  workspace_id UUID,
  whatsapp_from_bio TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    iep.id,
    iep.external_url,
    iep.run_id,
    iep.workspace_id,
    iep.whatsapp_from_bio
  FROM instagram_enriched_profiles iep
  WHERE iep.website_scraping_status = 'pending'
    AND iep.external_url IS NOT NULL
    AND (iep.next_retry_at IS NULL OR iep.next_retry_at <= NOW())
  FOR UPDATE SKIP LOCKED
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_instagram_websites_locked IS
  'Busca perfis com website pendente usando lock pessimista para prevenir race conditions';

-- =============================================================================
-- FUNÇÃO: get_instagram_scraping_stats
-- =============================================================================
-- Retorna estatísticas de scraping de websites para um run do Instagram
-- =============================================================================
CREATE OR REPLACE FUNCTION get_instagram_scraping_stats(p_run_id UUID)
RETURNS JSONB AS $$
SELECT jsonb_build_object(
  'total', COUNT(*) FILTER (WHERE external_url IS NOT NULL),
  'valid', COUNT(*) FILTER (WHERE website_scraping_status = 'queued' OR website_scraping_status = 'completed'),
  'skipped', COUNT(*) FILTER (WHERE website_scraping_status = 'skipped'),
  'processing', COUNT(*) FILTER (WHERE website_scraping_status = 'processing'),
  'completed', COUNT(*) FILTER (WHERE website_scraping_status = 'completed'),
  'failed', COUNT(*) FILTER (WHERE website_scraping_status = 'failed'),
  'blocked', COUNT(*) FILTER (WHERE website_scraping_status = 'blocked'),
  'pending', COUNT(*) FILTER (WHERE website_scraping_status = 'pending' AND external_url IS NOT NULL)
)
FROM instagram_enriched_profiles
WHERE run_id = p_run_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_instagram_scraping_stats IS
  'Retorna estatísticas de scraping de websites para dashboard do Instagram';

-- =============================================================================
-- FUNÇÃO: increment_run_counters (ATÔMICA)
-- =============================================================================
-- Incrementa contadores de run de forma atômica para prevenir lost updates
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_run_counters(
  p_run_id UUID,
  p_leads_created INT,
  p_duplicates_skipped INT
) RETURNS VOID AS $$
BEGIN
  UPDATE lead_extraction_runs
  SET
    created_quantity = created_quantity + p_leads_created,
    duplicates_skipped = duplicates_skipped + p_duplicates_skipped,
    updated_at = NOW()
  WHERE id = p_run_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_run_counters IS
  'Incrementa contadores de leads criados e duplicatas de forma atômica';
