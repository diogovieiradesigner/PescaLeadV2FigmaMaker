-- =============================================================================
-- CORREÇÃO IMEDIATA: ENRIQUECIMENTO TRAVADO
-- =============================================================================
-- Aplicar este SQL para corrigir a extração c8bea127-e011-4258-a91f-3c76d1b70c6a
-- =============================================================================

-- 1. Corrigir leads que não têm campos para enriquecer
-- Marca como 'completed' para permitir finalização
UPDATE lead_extraction_staging
SET 
  status_enrichment = 'completed',
  updated_at = NOW()
WHERE extraction_run_id = 'c8bea127-e011-4258-a91f-3c76d1b70c6a'
  AND status_enrichment IN ('pending', 'enriching')
  AND (
    -- Não precisa de WHOIS (não tem domínio .br ou já enriquecido)
    (domain IS NULL OR domain NOT LIKE '%.br' OR whois_enriched = true)
    -- Não precisa de CNPJ (não tem CNPJ ou já enriquecido)
    AND (cnpj_normalized IS NULL OR cnpj_normalized = '' OR cnpj_enriched = true)
    -- Não precisa de scraping (não tem website ou já enriquecido)
    AND (primary_website IS NULL OR primary_website = '' OR scraping_enriched = true)
    -- Não precisa de WhatsApp (não tem telefone ou já validado)
    AND (phone_normalized IS NULL OR phone_normalized = '' OR whatsapp_valid IS NOT NULL)
  );

-- 2. Corrigir leads que falharam no scraping após retry
-- Marca scraping_enriched = true e status_enrichment = 'completed' para permitir finalização
UPDATE lead_extraction_staging
SET 
  scraping_enriched = true,
  status_enrichment = CASE 
    WHEN status_enrichment IN ('pending', 'enriching') THEN 'completed'
    ELSE status_enrichment
  END,
  updated_at = NOW()
WHERE extraction_run_id = 'c8bea127-e011-4258-a91f-3c76d1b70c6a'
  AND scraping_status = 'failed'
  AND scraping_attempts >= 1
  AND scraping_enriched = false;

-- 3. Verificar resultado
SELECT 
  'Correção aplicada' as status,
  COUNT(*) FILTER (WHERE status_enrichment = 'completed') as completed,
  COUNT(*) FILTER (WHERE status_enrichment = 'pending') as pending,
  COUNT(*) FILTER (WHERE status_enrichment = 'enriching') as enriching,
  COUNT(*) FILTER (WHERE scraping_status = 'failed' AND scraping_enriched = true) as scraping_failed_marked_complete
FROM lead_extraction_staging
WHERE extraction_run_id = 'c8bea127-e011-4258-a91f-3c76d1b70c6a';

-- =============================================================================
-- FIM DA CORREÇÃO
-- =============================================================================

