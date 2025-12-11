-- =============================================================================
-- TESTE PONTA A PONTA: Sistema de Scraping (SIMPLIFICADO)
-- =============================================================================
-- Este script testa o fluxo completo de scraping:
-- 1. Usa um lead existente
-- 2. Simula resposta da API de scraping
-- 3. Chama process_scraping_result
-- 4. Valida formatação e consolidação
-- =============================================================================

-- =============================================================================
-- PASSO 1: Definir lead de teste
-- =============================================================================

DO $$
DECLARE
  v_test_staging_id UUID := 'c5605cf6-ad27-4b1c-8af6-35e617c985e3'; -- Lead existente
  v_test_scraping_data JSONB;
  v_result JSONB;
  v_emails_formatados JSONB;
  v_phones_formatados JSONB;
  v_emails_consolidados JSONB;
  v_phones_consolidados JSONB;
  v_primary_email TEXT;
  v_primary_phone TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTE PONTA A PONTA - SCRAPING';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Lead ID: %', v_test_staging_id;

  -- =============================================================================
  -- PASSO 2: Simular resposta da API de scraping (estrutura real)
  -- =============================================================================

  v_test_scraping_data := '{
    "status": "success",
    "url": "https://pescalead.com.br/",
    "method": "dynamic",
    "emails": [
      "contato@pescalead.com.br",
      "suporte@pescalead.com.br"
    ],
    "phones": [
      "(83) 9856-4818",
      "+55 83 9856-4818"
    ],
    "cnpj": [],
    "whatsapp": [
      "https://wa.me/558398564818?text=Olá"
    ],
    "social_media": {
      "linkedin": ["https://linkedin.com/company/pescalead"],
      "facebook": [],
      "instagram": ["https://instagram.com/pescalead"],
      "youtube": [],
      "twitter": []
    },
    "metadata": {
      "title": "Pesca Leads",
      "description": "O único do mercado que vende reuniões",
      "og_image": ""
    },
    "images": {
      "logos": [],
      "favicon": "",
      "other_images": []
    },
    "button_links": [
      "https://wa.me/558398564818?text=Olá"
    ],
    "checkouts": {
      "have_checkouts": false,
      "platforms": []
    },
    "pixels": {
      "have_pixels": false,
      "pixels": {
        "facebook": false,
        "google_analytics": false
      }
    },
    "screenshot": {
      "base64": "",
      "timestamp": ""
    },
    "markdown": "PESCA LEAD...",
    "performance": {
      "total_time": "20.20s"
    }
  }'::jsonb;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Dados de scraping simulados criados';
  RAISE NOTICE '   - Emails: 2';
  RAISE NOTICE '   - Phones: 2';
  RAISE NOTICE '   - WhatsApp: 1';
  RAISE NOTICE '   - Redes sociais: LinkedIn, Instagram';

  -- =============================================================================
  -- PASSO 3: Chamar process_scraping_result
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '🔄 Chamando process_scraping_result...';

  SELECT process_scraping_result(
    v_test_staging_id,
    v_test_scraping_data,
    'success'
  ) INTO v_result;

  RAISE NOTICE '✅ process_scraping_result executado';
  RAISE NOTICE '📊 Resultado: %', v_result;

  -- =============================================================================
  -- PASSO 4: Validar formatação
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDAÇÃO DE FORMATAÇÃO';
  RAISE NOTICE '========================================';

  -- Buscar dados formatados
  SELECT 
    scraping_data->'emails',
    scraping_data->'phones',
    scraping_data->'websites'
  INTO 
    v_emails_formatados,
    v_phones_formatados,
    v_emails_formatados -- placeholder, será sobrescrito
  FROM lead_extraction_staging
  WHERE id = v_test_staging_id;

  -- Validar emails formatados
  IF v_emails_formatados IS NOT NULL 
     AND jsonb_typeof(v_emails_formatados) = 'array'
     AND jsonb_array_length(v_emails_formatados) > 0
     AND (v_emails_formatados->0->>'address') IS NOT NULL THEN
    RAISE NOTICE '✅ Emails formatados corretamente: %', jsonb_array_length(v_emails_formatados);
    RAISE NOTICE '   Estrutura: %', v_emails_formatados;
  ELSE
    RAISE NOTICE '❌ Emails NÃO formatados corretamente';
    RAISE NOTICE '   Valor: %', v_emails_formatados;
  END IF;

  -- Validar phones formatados
  IF v_phones_formatados IS NOT NULL 
     AND jsonb_typeof(v_phones_formatados) = 'array'
     AND jsonb_array_length(v_phones_formatados) > 0
     AND (v_phones_formatados->0->>'number') IS NOT NULL THEN
    RAISE NOTICE '✅ Phones formatados corretamente: %', jsonb_array_length(v_phones_formatados);
    RAISE NOTICE '   Estrutura: %', v_phones_formatados;
  ELSE
    RAISE NOTICE '❌ Phones NÃO formatados corretamente';
    RAISE NOTICE '   Valor: %', v_phones_formatados;
  END IF;

  -- Validar whatsapp formatado
  IF v_phones_formatados IS NOT NULL 
     AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(v_phones_formatados) p
       WHERE p->>'whatsapp' = 'true'
     ) THEN
    RAISE NOTICE '✅ WhatsApp formatado corretamente (flag whatsapp: true encontrada)';
  ELSE
    RAISE NOTICE '⚠️ WhatsApp não encontrado ou não formatado';
  END IF;

  -- =============================================================================
  -- PASSO 5: Validar consolidação (trigger deve ter executado)
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDAÇÃO DE CONSOLIDAÇÃO';
  RAISE NOTICE '========================================';

  -- Buscar dados consolidados
  SELECT 
    emails,
    phones,
    primary_email,
    primary_phone
  INTO 
    v_emails_consolidados,
    v_phones_consolidados,
    v_primary_email,
    v_primary_phone
  FROM lead_extraction_staging
  WHERE id = v_test_staging_id;

  -- Validar emails consolidados
  IF v_emails_consolidados IS NOT NULL 
     AND jsonb_array_length(v_emails_consolidados) > 0
     AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(v_emails_consolidados) e
       WHERE e->>'source' = 'scraping'
     ) THEN
    RAISE NOTICE '✅ Emails consolidados: % (com source=scraping)', jsonb_array_length(v_emails_consolidados);
    RAISE NOTICE '   Estrutura: %', v_emails_consolidados;
  ELSE
    RAISE NOTICE '❌ Emails NÃO consolidados ou sem source=scraping';
    RAISE NOTICE '   Valor: %', v_emails_consolidados;
  END IF;

  -- Validar primary_email
  IF v_primary_email IS NOT NULL THEN
    RAISE NOTICE '✅ Primary email: %', v_primary_email;
  ELSE
    RAISE NOTICE '❌ Primary email NÃO definido';
  END IF;

  -- Validar phones consolidados
  IF v_phones_consolidados IS NOT NULL 
     AND jsonb_array_length(v_phones_consolidados) > 0
     AND EXISTS (
       SELECT 1 FROM jsonb_array_elements(v_phones_consolidados) p
       WHERE p->>'source' = 'scraping'
     ) THEN
    RAISE NOTICE '✅ Phones consolidados: % (com source=scraping)', jsonb_array_length(v_phones_consolidados);
    RAISE NOTICE '   Estrutura: %', v_phones_consolidados;
  ELSE
    RAISE NOTICE '⚠️ Phones NÃO consolidados ou sem source=scraping (pode ser normal)';
    RAISE NOTICE '   Valor: %', v_phones_consolidados;
  END IF;

  -- Validar primary_phone
  IF v_primary_phone IS NOT NULL THEN
    RAISE NOTICE '✅ Primary phone: %', v_primary_phone;
  ELSE
    RAISE NOTICE '⚠️ Primary phone NÃO definido (pode ser normal se não houver telefone)';
  END IF;

  -- =============================================================================
  -- PASSO 6: Resumo final
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DO TESTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Lead ID: %', v_test_staging_id;
  RAISE NOTICE 'Status scraping: completed';
  RAISE NOTICE 'Emails formatados: %', CASE WHEN v_emails_formatados IS NOT NULL THEN 'SIM' ELSE 'NÃO' END;
  RAISE NOTICE 'Phones formatados: %', CASE WHEN v_phones_formatados IS NOT NULL THEN 'SIM' ELSE 'NÃO' END;
  RAISE NOTICE 'Emails consolidados: %', CASE WHEN v_emails_consolidados IS NOT NULL THEN 'SIM' ELSE 'NÃO' END;
  RAISE NOTICE 'Phones consolidados: %', CASE WHEN v_phones_consolidados IS NOT NULL THEN 'SIM' ELSE 'NÃO' END;
  RAISE NOTICE 'Primary email: %', COALESCE(v_primary_email, 'NÃO DEFINIDO');
  RAISE NOTICE 'Primary phone: %', COALESCE(v_primary_phone, 'NÃO DEFINIDO');
  RAISE NOTICE '';
  RAISE NOTICE '✅ TESTE PONTA A PONTA CONCLUÍDO';

END $$;

-- =============================================================================
-- PASSO 7: Query de validação final (visualização)
-- =============================================================================

SELECT 
  'FORMATAÇÃO' as tipo,
  jsonb_pretty(scraping_data->'emails') as emails_formatados,
  jsonb_pretty(scraping_data->'phones') as phones_formatados,
  jsonb_pretty(scraping_data->'websites') as websites_formatados
FROM lead_extraction_staging
WHERE id = 'c5605cf6-ad27-4b1c-8af6-35e617c985e3'

UNION ALL

SELECT 
  'CONSOLIDAÇÃO' as tipo,
  jsonb_pretty(emails) as emails_consolidados,
  jsonb_pretty(phones) as phones_consolidados,
  jsonb_pretty(websites) as websites_consolidados
FROM lead_extraction_staging
WHERE id = 'c5605cf6-ad27-4b1c-8af6-35e617c985e3';

-- =============================================================================
-- PASSO 8: Validação detalhada
-- =============================================================================

SELECT 
  id,
  primary_website,
  scraping_status,
  scraping_enriched,
  -- Formatação
  jsonb_array_length(scraping_data->'emails') as qtd_emails_formatados,
  jsonb_array_length(scraping_data->'phones') as qtd_phones_formatados,
  jsonb_array_length(scraping_data->'websites') as qtd_websites_formatados,
  -- Consolidação
  jsonb_array_length(emails) as qtd_emails_consolidados,
  jsonb_array_length(phones) as qtd_phones_consolidados,
  jsonb_array_length(websites) as qtd_websites_consolidados,
  -- Primary
  primary_email,
  primary_phone,
  primary_website as website_principal,
  -- Validação
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(emails) e
    WHERE e->>'source' = 'scraping'
  ) as tem_email_scraping_consolidado,
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(phones) p
    WHERE p->>'source' = 'scraping'
  ) as tem_phone_scraping_consolidado
FROM lead_extraction_staging
WHERE id = 'c5605cf6-ad27-4b1c-8af6-35e617c985e3';

