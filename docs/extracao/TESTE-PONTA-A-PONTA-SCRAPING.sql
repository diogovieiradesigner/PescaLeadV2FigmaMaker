-- =============================================================================
-- TESTE PONTA A PONTA: Sistema de Scraping
-- =============================================================================
-- Este script simula todo o fluxo de scraping:
-- 1. Busca ou cria um lead de teste
-- 2. Enfileira na fila scraping_queue
-- 3. Simula resposta da API de scraping
-- 4. Chama process_scraping_result
-- 5. Valida formatação e consolidação
-- =============================================================================

-- =============================================================================
-- PASSO 1: Buscar ou criar lead de teste
-- =============================================================================

DO $$
DECLARE
  v_test_staging_id UUID;
  v_test_run_id UUID;
  v_test_workspace_id UUID;
  v_test_website TEXT := 'https://pescalead.com.br';
  v_message_id BIGINT;
  v_test_scraping_data JSONB;
  v_result JSONB;
BEGIN
  -- Buscar um lead existente ou usar um já processado para teste
  SELECT 
    id,
    extraction_run_id,
    workspace_id
  INTO 
    v_test_staging_id,
    v_test_run_id,
    v_test_workspace_id
  FROM lead_extraction_staging
  WHERE primary_website IS NOT NULL 
    AND primary_website != ''
  LIMIT 1;

  -- Se não encontrou, criar um novo (usando dados de um run existente)
  IF v_test_staging_id IS NULL THEN
    SELECT 
      id,
      extraction_run_id,
      workspace_id
    INTO 
      v_test_staging_id,
      v_test_run_id,
      v_test_workspace_id
    FROM lead_extraction_staging
    WHERE extraction_run_id IS NOT NULL
    LIMIT 1;
    
    -- Criar novo lead de teste
    INSERT INTO lead_extraction_staging (
      extraction_run_id,
      workspace_id,
      primary_website,
      scraping_status,
      scraping_enriched,
      deduplication_hash,
      status_extraction,
      status_enrichment,
      created_at,
      updated_at
    )
    SELECT 
      v_test_run_id,
      v_test_workspace_id,
      v_test_website,
      'pending',
      false,
      md5(v_test_website || '::test::' || NOW()::text),
      'google_fetched',
      'pending',
      NOW(),
      NOW()
    RETURNING id INTO v_test_staging_id;
  END IF;

  RAISE NOTICE '✅ Lead de teste: %', v_test_staging_id;
  RAISE NOTICE '📍 Website: %', v_test_website;

  -- =============================================================================
  -- PASSO 2: Enfileirar na fila scraping_queue
  -- =============================================================================

  -- Garantir que a fila existe
  PERFORM pgmq.create('scraping_queue');

  -- Enfileirar mensagem
  SELECT pgmq_send(
    'scraping_queue',
    jsonb_build_object(
      'staging_id', v_test_staging_id::text,
      'website_url', v_test_website,
      'workspace_id', v_test_workspace_id::text,
      'queued_at', NOW()::text
    )
  ) INTO v_message_id;

  RAISE NOTICE '✅ Mensagem enfileirada: msg_id = %', v_message_id;

  -- =============================================================================
  -- PASSO 3: Simular resposta da API de scraping (estrutura real)
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
      "(83) 9856-4818"
    ],
    "cnpj": [],
    "whatsapp": [
      "https://wa.me/558398564818?text=Olá"
    ],
    "social_media": {
      "linkedin": [],
      "facebook": [],
      "instagram": [],
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

  RAISE NOTICE '✅ Dados de scraping simulados criados';

  -- =============================================================================
  -- PASSO 4: Chamar process_scraping_result
  -- =============================================================================

  SELECT process_scraping_result(
    v_test_staging_id,
    v_test_scraping_data,
    'success'
  ) INTO v_result;

  RAISE NOTICE '✅ process_scraping_result executado';
  RAISE NOTICE '📊 Resultado: %', v_result;

  -- =============================================================================
  -- PASSO 5: Validar formatação
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDAÇÃO DE FORMATAÇÃO';
  RAISE NOTICE '========================================';

  -- Verificar emails formatados
  PERFORM (
    SELECT 
      CASE 
        WHEN scraping_data->'emails' IS NOT NULL 
         AND jsonb_typeof(scraping_data->'emails') = 'array'
         AND jsonb_array_length(scraping_data->'emails') > 0
         AND (scraping_data->'emails'->0->>'address') IS NOT NULL
        THEN RAISE NOTICE '✅ Emails formatados corretamente: %', jsonb_array_length(scraping_data->'emails')
        ELSE RAISE NOTICE '❌ Emails NÃO formatados corretamente'
      END
    FROM lead_extraction_staging
    WHERE id = v_test_staging_id
  );

  -- Verificar phones formatados
  PERFORM (
    SELECT 
      CASE 
        WHEN scraping_data->'phones' IS NOT NULL 
         AND jsonb_typeof(scraping_data->'phones') = 'array'
         AND jsonb_array_length(scraping_data->'phones') > 0
         AND (scraping_data->'phones'->0->>'number') IS NOT NULL
        THEN RAISE NOTICE '✅ Phones formatados corretamente: %', jsonb_array_length(scraping_data->'phones')
        ELSE RAISE NOTICE '❌ Phones NÃO formatados corretamente'
      END
    FROM lead_extraction_staging
    WHERE id = v_test_staging_id
  );

  -- Verificar whatsapp formatado
  PERFORM (
    SELECT 
      CASE 
        WHEN scraping_data->'phones' IS NOT NULL 
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(scraping_data->'phones') p
           WHERE p->>'whatsapp' = 'true'
         )
        THEN RAISE NOTICE '✅ WhatsApp formatado corretamente'
        ELSE RAISE NOTICE '⚠️ WhatsApp não encontrado ou não formatado'
      END
    FROM lead_extraction_staging
    WHERE id = v_test_staging_id
  );

  -- =============================================================================
  -- PASSO 6: Validar consolidação
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDAÇÃO DE CONSOLIDAÇÃO';
  RAISE NOTICE '========================================';

  PERFORM (
    SELECT 
      CASE 
        WHEN emails IS NOT NULL 
         AND jsonb_array_length(emails) > 0
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(emails) e
           WHERE e->>'source' = 'scraping'
         )
        THEN RAISE NOTICE '✅ Emails consolidados: % (com source=scraping)', jsonb_array_length(emails)
        ELSE RAISE NOTICE '❌ Emails NÃO consolidados'
      END,
      CASE 
        WHEN primary_email IS NOT NULL
        THEN RAISE NOTICE '✅ Primary email: %', primary_email
        ELSE RAISE NOTICE '❌ Primary email NÃO definido'
      END
    FROM lead_extraction_staging
    WHERE id = v_test_staging_id
  );

  PERFORM (
    SELECT 
      CASE 
        WHEN phones IS NOT NULL 
         AND jsonb_array_length(phones) > 0
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(phones) p
           WHERE p->>'source' = 'scraping'
         )
        THEN RAISE NOTICE '✅ Phones consolidados: % (com source=scraping)', jsonb_array_length(phones)
        ELSE RAISE NOTICE '❌ Phones NÃO consolidados'
      END,
      CASE 
        WHEN primary_phone IS NOT NULL
        THEN RAISE NOTICE '✅ Primary phone: %', primary_phone
        ELSE RAISE NOTICE '⚠️ Primary phone NÃO definido (pode ser normal se não houver telefone)'
      END
    FROM lead_extraction_staging
    WHERE id = v_test_staging_id
  );

  -- =============================================================================
  -- PASSO 7: Exibir dados finais
  -- =============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DADOS FINAIS';
  RAISE NOTICE '========================================';

  PERFORM (
    SELECT 
      RAISE NOTICE '📊 scraping_data->emails: %', scraping_data->'emails',
      RAISE NOTICE '📊 emails consolidados: %', emails,
      RAISE NOTICE '📊 primary_email: %', primary_email,
      RAISE NOTICE '📊 scraping_data->phones: %', scraping_data->'phones',
      RAISE NOTICE '📊 phones consolidados: %', phones,
      RAISE NOTICE '📊 primary_phone: %', primary_phone,
      RAISE NOTICE '📊 scraping_status: %', scraping_status,
      RAISE NOTICE '📊 scraping_enriched: %', scraping_enriched
    FROM lead_extraction_staging
    WHERE id = v_test_staging_id
  );

  RAISE NOTICE '';
  RAISE NOTICE '✅ TESTE PONTA A PONTA CONCLUÍDO';
  RAISE NOTICE '📋 Lead ID: %', v_test_staging_id;
  RAISE NOTICE '📋 Mensagem ID: %', v_message_id;

END $$;

-- =============================================================================
-- PASSO 8: Query de validação final
-- =============================================================================

-- Exibir resultado final do teste
SELECT 
  id as lead_id,
  primary_website,
  scraping_status,
  scraping_enriched,
  scraping_data->'emails' as emails_formatados,
  emails as emails_consolidados,
  primary_email,
  scraping_data->'phones' as phones_formatados,
  phones as phones_consolidados,
  primary_phone,
  scraping_data->'websites' as websites_formatados,
  websites as websites_consolidados,
  primary_website as website_principal
FROM lead_extraction_staging
WHERE primary_website = 'https://pescalead.com.br'
  AND scraping_status = 'completed'
ORDER BY updated_at DESC
LIMIT 1;

