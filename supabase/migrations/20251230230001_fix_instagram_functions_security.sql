-- =============================================================================
-- Migration: Adicionar SECURITY DEFINER às functions que acessam tabelas RLS
-- Baseado em: 20251219140000_add_instagram_website_scraping.sql
-- Problema: Functions sem SECURITY DEFINER falham quando RLS está habilitado
-- =============================================================================

-- Function 1: get_pending_instagram_websites_locked
-- Usada por: instagram-website-enqueue (cron job)
-- Problema: Lê instagram_enriched_profiles (FOR UPDATE) sem SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_pending_instagram_websites_locked(p_limit INT)
RETURNS TABLE (
  id UUID,
  external_url TEXT,
  run_id UUID,
  workspace_id UUID,
  whatsapp_from_bio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMENT ON FUNCTION get_pending_instagram_websites_locked IS
  'Busca perfis com website pendente usando lock pessimista - SECURITY DEFINER para bypass RLS';

-- Function 2: get_instagram_scraping_stats
-- Usada por: dashboard de monitoramento
-- Problema: Lê instagram_enriched_profiles sem SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_instagram_scraping_stats(p_run_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
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
$$;

COMMENT ON FUNCTION get_instagram_scraping_stats IS
  'Retorna estatísticas de scraping de websites - SECURITY DEFINER para bypass RLS';

-- Function 3: increment_run_counters
-- Usada por: process-scraping-queue, migrate functions
-- Problema: Atualiza lead_extraction_runs sem SECURITY DEFINER
CREATE OR REPLACE FUNCTION increment_run_counters(
  p_run_id UUID,
  p_leads_created INT,
  p_duplicates_skipped INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lead_extraction_runs
  SET
    created_quantity = created_quantity + p_leads_created,
    duplicates_skipped = duplicates_skipped + p_duplicates_skipped,
    updated_at = NOW()
  WHERE id = p_run_id;
END;
$$;

COMMENT ON FUNCTION increment_run_counters IS
  'Incrementa contadores de leads de forma atômica - SECURITY DEFINER para bypass RLS';

-- Manter grants existentes (functions são SECURITY DEFINER então executam com permissões do owner)
GRANT EXECUTE ON FUNCTION get_pending_instagram_websites_locked(INT) TO service_role;
GRANT EXECUTE ON FUNCTION get_instagram_scraping_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION increment_run_counters(UUID, INT, INT) TO service_role;
