-- =============================================================================
-- TESTE COMPLETO: Todos os Enriquecimentos (WHOIS, CNPJ, Scraping)
-- =============================================================================
-- Este script testa a consolidação completa de dados de todas as fontes:
-- 1. WHOIS (emails, phones, websites, CNPJ)
-- 2. CNPJ (emails, phones, websites)
-- 3. Scraping (emails, phones, websites, whatsapp, redes sociais)
-- =============================================================================

-- =============================================================================
-- CONFIGURAÇÃO: Definir lead de teste
-- =============================================================================

DO $$
DECLARE
  v_test_staging_id UUID := 'c5605cf6-ad27-4b1c-8af6-35e617c985e3'; -- Lead existente
  v_result JSONB;
  v_emails_consolidados JSONB;
  v_phones_consolidados JSONB;
  v_websites_consolidados JSONB;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTE COMPLETO: TODOS OS ENRIQUECIMENTOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Lead ID: %', v_test_staging_id;

  -- =============================================================================
  -- PASSO 1: Simular dados de WHOIS
  -- =============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣ Simulando dados de WHOIS...';
  
  UPDATE lead_extraction_staging
  SET 
    whois_data = jsonb_build_object(
      'emails', jsonb_build_array(
        jsonb_build_object('address', 'admin@pescalead.com.br', 'source', 'whois', 'type', 'main', 'verified', false)
      ),
      'phones', jsonb_build_array(
        jsonb_build_object('number', '8398564818', 'source', 'whois', 'type', 'landline', 'verified', false, 'formatted', '(83) 9856-4818', 'with_country', '+55 (83) 9856-4818')
      ),
      'websites', jsonb_build_array(
        jsonb_build_object('url', 'https://pescalead.com.br', 'source', 'whois', 'type', 'main', 'domain', 'pescalead.com.br')
      ),
      'cnpj', '45744611000182'
    ),
    whois_enriched = true,
    updated_at = NOW()
  WHERE id = v_test_staging_id;

  RAISE NOTICE '   ✅ WHOIS: 1 email, 1 phone, 1 website, 1 CNPJ';

  -- =============================================================================
  -- PASSO 2: Simular dados de CNPJ
  -- =============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣ Simulando dados de CNPJ...';
  
  UPDATE lead_extraction_staging
  SET 
    cnpj_data = jsonb_build_object(
      'cnpj', '45744611000182',
      'razao_social', 'PESCA LEAD LTDA',
      'nome_fantasia', 'PESCA LEAD',
      'emails', jsonb_build_array(
        jsonb_build_object('address', 'contato@pescalead.com.br', 'source', 'cnpj', 'type', 'main', 'verified', true)
      ),
      'phones', jsonb_build_array(
        jsonb_build_object('number', '8398564818', 'source', 'cnpj', 'type', 'landline', 'verified', true, 'formatted', '(83) 9856-4818', 'with_country', '+55 (83) 9856-4818')
      ),
      'websites', jsonb_build_array(
        jsonb_build_object('url', 'https://pescalead.com.br', 'source', 'cnpj', 'type', 'main', 'domain', 'pescalead.com.br')
      ),
      'provider', 'brasilapi'
    ),
    cnpj_enriched = true,
    cnpj_normalized = '45744611000182',
    updated_at = NOW()
  WHERE id = v_test_staging_id;

  RAISE NOTICE '   ✅ CNPJ: 1 email (verified), 1 phone (verified), 1 website';

  -- =============================================================================
  -- PASSO 3: Simular dados de Scraping
  -- =============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣ Simulando dados de Scraping...';
  
  SELECT process_scraping_result(
    v_test_staging_id,
    '{
      "status": "success",
      "url": "https://pescalead.com.br/",
      "method": "dynamic",
      "emails": ["vendas@pescalead.com.br", "suporte@pescalead.com.br"],
      "phones": ["(83) 9888-7777", "+55 83 9888-7777"],
      "whatsapp": ["https://wa.me/558398887777?text=Olá"],
      "social_media": {
        "linkedin": ["https://linkedin.com/company/pescalead"],
        "instagram": ["https://instagram.com/pescalead"]
      },
      "metadata": {"title": "Pesca Leads", "description": "Teste completo"},
      "markdown": "Teste",
      "performance": {"total_time": "20.20s"}
    }'::JSONB,
    'success'
  ) INTO v_result;

  RAISE NOTICE '   ✅ Scraping: 2 emails, 2 phones + 1 whatsapp, 2 websites (redes sociais)';
  RAISE NOTICE '   📊 Resultado: %', v_result;

  -- =============================================================================
  -- PASSO 4: Validar consolidação completa
  -- =============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDAÇÃO DE CONSOLIDAÇÃO COMPLETA';
  RAISE NOTICE '========================================';

  -- Buscar dados consolidados
  SELECT 
    emails,
    phones,
    websites,
    primary_email,
    primary_phone,
    primary_website,
    cnpj_normalized
  INTO 
    v_emails_consolidados,
    v_phones_consolidados,
    v_websites_consolidados,
    v_emails_consolidados, -- placeholder
    v_phones_consolidados, -- placeholder
    v_websites_consolidados, -- placeholder
    v_emails_consolidados -- placeholder
  FROM lead_extraction_staging
  WHERE id = v_test_staging_id;

  -- Validar emails
  RAISE NOTICE '';
  RAISE NOTICE '📧 EMAILS CONSOLIDADOS:';
  RAISE NOTICE '   Total: %', jsonb_array_length(v_emails_consolidados);
  RAISE NOTICE '   WHOIS: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_emails_consolidados) e WHERE e->>'source' = 'whois');
  RAISE NOTICE '   CNPJ: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_emails_consolidados) e WHERE e->>'source' = 'cnpj');
  RAISE NOTICE '   Scraping: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_emails_consolidados) e WHERE e->>'source' = 'scraping');

  -- Validar phones
  RAISE NOTICE '';
  RAISE NOTICE '📱 PHONES CONSOLIDADOS:';
  RAISE NOTICE '   Total: %', jsonb_array_length(v_phones_consolidados);
  RAISE NOTICE '   WHOIS: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_phones_consolidados) p WHERE p->>'source' = 'whois');
  RAISE NOTICE '   CNPJ: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_phones_consolidados) p WHERE p->>'source' = 'cnpj');
  RAISE NOTICE '   Scraping: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_phones_consolidados) p WHERE p->>'source' = 'scraping');

  -- Validar websites
  RAISE NOTICE '';
  RAISE NOTICE '🌐 WEBSITES CONSOLIDADOS:';
  RAISE NOTICE '   Total: %', jsonb_array_length(v_websites_consolidados);
  RAISE NOTICE '   WHOIS: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_websites_consolidados) w WHERE w->>'source' = 'whois');
  RAISE NOTICE '   CNPJ: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_websites_consolidados) w WHERE w->>'source' = 'cnpj');
  RAISE NOTICE '   Scraping: %', (SELECT COUNT(*) FROM jsonb_array_elements(v_websites_consolidados) w WHERE w->>'source' = 'scraping');

  RAISE NOTICE '';
  RAISE NOTICE '✅ TESTE COMPLETO CONCLUÍDO';

END $$;

-- =============================================================================
-- QUERIES DE VALIDAÇÃO
-- =============================================================================

-- Resumo de consolidação
SELECT 
  'RESUMO' as tipo,
  jsonb_array_length(emails) as total_emails,
  jsonb_array_length(phones) as total_phones,
  jsonb_array_length(websites) as total_websites,
  primary_email,
  primary_phone,
  primary_website,
  cnpj_normalized
FROM lead_extraction_staging
WHERE id = 'c5605cf6-ad27-4b1c-8af6-35e617c985e3';

-- Detalhamento por fonte
SELECT 
  'EMAILS POR FONTE' as tipo,
  e->>'source' as fonte,
  e->>'address' as email,
  e->>'verified' as verified,
  COUNT(*) OVER (PARTITION BY e->>'address') as duplicatas
FROM lead_extraction_staging,
     jsonb_array_elements(emails) e
WHERE id = 'c5605cf6-ad27-4b1c-8af6-35e617c985e3'
ORDER BY e->>'source';

SELECT 
  'PHONES POR FONTE' as tipo,
  p->>'source' as fonte,
  p->>'number' as phone,
  p->>'verified' as verified,
  p->>'whatsapp' as whatsapp,
  COUNT(*) OVER (PARTITION BY p->>'number') as duplicatas
FROM lead_extraction_staging,
     jsonb_array_elements(phones) p
WHERE id = 'c5605cf6-ad27-4b1c-8af6-35e617c985e3'
ORDER BY p->>'source';

SELECT 
  'WEBSITES POR FONTE' as tipo,
  w->>'source' as fonte,
  w->>'url' as url,
  w->>'type' as type
FROM lead_extraction_staging,
     jsonb_array_elements(websites) w
WHERE id = 'c5605cf6-ad27-4b1c-8af6-35e617c985e3'
ORDER BY w->>'source';

