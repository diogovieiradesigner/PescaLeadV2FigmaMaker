-- =============================================================================
-- MIGRATION: Auto-completar Leads que Não Precisam de Enriquecimento
-- =============================================================================
-- PROBLEMA: Leads que não têm domínio .br, CNPJ ou website ficam com
-- status_enrichment = 'pending' mesmo não precisando de nenhum enriquecimento.
-- 
-- SOLUÇÃO: Trigger que marca automaticamente como 'completed' leads que
-- não precisam de nenhum tipo de enriquecimento ao serem inseridos ou atualizados.
-- =============================================================================

-- =============================================================================
-- FUNÇÃO SQL: auto_complete_leads_without_enrichment
-- =============================================================================
-- Marca automaticamente como 'completed' leads que não precisam de enriquecimento
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_complete_leads_without_enrichment()
RETURNS TRIGGER AS $$
DECLARE
  v_needs_whois BOOLEAN := FALSE;
  v_needs_cnpj BOOLEAN := FALSE;
  v_needs_scraping BOOLEAN := FALSE;
  v_needs_enrichment BOOLEAN := FALSE;
BEGIN
  -- Verificar se precisa de WHOIS (tem domínio .br e não está enriquecido)
  v_needs_whois := (
    NEW.domain IS NOT NULL 
    AND NEW.domain != '' 
    AND NEW.domain LIKE '%.br'
    AND (NEW.whois_enriched IS NULL OR NEW.whois_enriched = false)
  );
  
  -- Verificar se precisa de CNPJ (tem CNPJ e não está enriquecido)
  v_needs_cnpj := (
    NEW.cnpj_normalized IS NOT NULL 
    AND NEW.cnpj_normalized != ''
    AND (NEW.cnpj_enriched IS NULL OR NEW.cnpj_enriched = false)
  );
  
  -- Verificar se precisa de scraping (tem website e não está enriquecido)
  v_needs_scraping := (
    NEW.primary_website IS NOT NULL 
    AND NEW.primary_website != ''
    AND (NEW.scraping_enriched IS NULL OR NEW.scraping_enriched = false)
  );
  
  -- Se não precisa de nenhum enriquecimento, marcar como completed
  IF NOT v_needs_whois AND NOT v_needs_cnpj AND NOT v_needs_scraping THEN
    -- Se ainda está pending ou enriching, marcar como completed
    IF NEW.status_enrichment IN ('pending', 'enriching') THEN
      NEW.status_enrichment := 'completed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_complete_leads_without_enrichment() IS 
'Trigger function que marca automaticamente como completed leads que não precisam de nenhum tipo de enriquecimento';

-- =============================================================================
-- TRIGGER: trg_auto_complete_leads_without_enrichment
-- =============================================================================
-- Executa antes de INSERT ou UPDATE em lead_extraction_staging
-- Marca automaticamente como completed leads que não precisam de enriquecimento
-- =============================================================================

DROP TRIGGER IF EXISTS trg_auto_complete_leads_without_enrichment ON lead_extraction_staging;

CREATE TRIGGER trg_auto_complete_leads_without_enrichment
  BEFORE INSERT OR UPDATE ON lead_extraction_staging
  FOR EACH ROW
  WHEN (
    -- Apenas quando status_enrichment é pending ou enriching
    NEW.status_enrichment IN ('pending', 'enriching')
  )
  EXECUTE FUNCTION auto_complete_leads_without_enrichment();

-- =============================================================================
-- CORREÇÃO IMEDIATA: Corrigir leads existentes que não precisam de enriquecimento
-- =============================================================================

UPDATE lead_extraction_staging
SET 
  status_enrichment = 'completed',
  updated_at = NOW()
WHERE status_enrichment IN ('pending', 'enriching')
  AND (
    -- Não precisa de WHOIS
    (domain IS NULL OR domain NOT LIKE '%.br' OR whois_enriched = true)
    -- Não precisa de CNPJ
    AND (cnpj_normalized IS NULL OR cnpj_normalized = '' OR cnpj_enriched = true)
    -- Não precisa de scraping
    AND (primary_website IS NULL OR primary_website = '' OR scraping_enriched = true)
  );

