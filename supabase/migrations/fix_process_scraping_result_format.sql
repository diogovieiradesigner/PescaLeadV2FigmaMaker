-- =============================================================================
-- MIGRATION: Corrigir formatação de dados do scraping
-- =============================================================================
-- PROBLEMA: A função process_scraping_result precisa formatar emails e phones
--           da API de scraping no formato esperado pelo trigger
-- 
-- ESTRUTURA DA API:
-- - emails: array de strings ["email1@example.com", "email2@example.com"]
-- - phones: array de strings ["(83) 9856-4818", "+55 83 9856-4818"]
-- - whatsapp: array de URLs ["https://wa.me/558398564818"]
-- - cnpj: array de strings
-- - social_media: objeto com arrays
-- - metadata, markdown, performance, etc.
-- =============================================================================

-- =============================================================================
-- FUNÇÃO: process_scraping_result (V2 - FORMATTED)
-- =============================================================================
-- Formata dados da API de scraping e salva no formato esperado pelo trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION process_scraping_result(
  p_staging_id UUID,
  p_scraping_data JSONB,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scraping_emails JSONB := '[]'::jsonb;
  v_scraping_phones JSONB := '[]'::jsonb;
  v_scraping_websites JSONB := '[]'::jsonb;
  v_scraping_cnpj TEXT;
  v_email_entry TEXT;
  v_phone_entry TEXT;
  v_whatsapp_url TEXT;
  v_phone_clean TEXT;
  v_ddd TEXT;
  v_number TEXT;
  v_formatted TEXT;
  v_social_url TEXT;
  v_scraping_data_formatted JSONB;
BEGIN
  -- Se status é erro, marcar como failed
  IF p_status = 'error' OR p_status != 'success' THEN
    UPDATE lead_extraction_staging
    SET 
      scraping_status = 'failed',
      scraping_error = COALESCE(p_scraping_data->>'error', 'Scraping failed'),
      scraping_completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_staging_id;
    
    RETURN jsonb_build_object('success', false, 'error', 'Scraping failed');
  END IF;

  -- ====================================================================
  -- FORMATAR EMAILS
  -- ====================================================================
  -- API retorna: ["email1@example.com", "email2@example.com"]
  -- Formato esperado: [{"address": "...", "source": "scraping", "type": "main", "verified": false}]
  IF p_scraping_data->'emails' IS NOT NULL AND jsonb_typeof(p_scraping_data->'emails') = 'array' THEN
    FOR v_email_entry IN SELECT jsonb_array_elements_text(p_scraping_data->'emails') LOOP
      IF v_email_entry IS NOT NULL AND v_email_entry != '' AND v_email_entry ~ '^[^@]+@[^@]+\.[^@]+$' THEN
        v_scraping_emails := v_scraping_emails || jsonb_build_object(
          'address', lower(trim(v_email_entry)),
          'source', 'scraping',
          'type', 'main',
          'verified', false
        );
      END IF;
    END LOOP;
  END IF;

  -- ====================================================================
  -- FORMATAR TELEFONES
  -- ====================================================================
  -- API retorna: ["(83) 9856-4818", "+55 83 9856-4818"]
  -- Formato esperado: [{"number": "...", "source": "scraping", "type": "mobile|landline", "verified": false}]
  IF p_scraping_data->'phones' IS NOT NULL AND jsonb_typeof(p_scraping_data->'phones') = 'array' THEN
    FOR v_phone_entry IN SELECT jsonb_array_elements_text(p_scraping_data->'phones') LOOP
      IF v_phone_entry IS NOT NULL AND v_phone_entry != '' THEN
        -- Limpar telefone (remover caracteres não numéricos, exceto +)
        v_phone_clean := regexp_replace(v_phone_entry, '[^\d+]', '', 'g');
        
        -- Remover +55 se presente
        IF v_phone_clean LIKE '+55%' THEN
          v_phone_clean := substring(v_phone_clean from 4);
        ELSIF v_phone_clean LIKE '55%' AND length(v_phone_clean) > 10 THEN
          v_phone_clean := substring(v_phone_clean from 3);
        END IF;
        
        -- Extrair DDD e número
        IF length(v_phone_clean) >= 10 THEN
          v_ddd := substring(v_phone_clean from 1 for 2);
          v_number := substring(v_phone_clean from 3);
          
          -- Formatar telefone
          IF length(v_number) = 9 THEN
            v_formatted := format('(%s) %s-%s', v_ddd, substring(v_number from 1 for 5), substring(v_number from 6));
          ELSIF length(v_number) = 8 THEN
            v_formatted := format('(%s) %s-%s', v_ddd, substring(v_number from 1 for 4), substring(v_number from 5));
          ELSE
            v_formatted := format('(%s) %s', v_ddd, v_number);
          END IF;
          
          v_scraping_phones := v_scraping_phones || jsonb_build_object(
            'number', v_ddd || v_number,
            'source', 'scraping',
            'type', CASE WHEN length(v_number) = 9 THEN 'mobile' ELSE 'landline' END,
            'verified', false,
            'formatted', v_formatted,
            'with_country', format('+55 %s', v_formatted)
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ====================================================================
  -- FORMATAR WHATSAPP
  -- ====================================================================
  -- API retorna: ["https://wa.me/558398564818"]
  -- Extrair número e adicionar aos phones com flag whatsapp: true
  IF p_scraping_data->'whatsapp' IS NOT NULL AND jsonb_typeof(p_scraping_data->'whatsapp') = 'array' THEN
    FOR v_whatsapp_url IN SELECT jsonb_array_elements_text(p_scraping_data->'whatsapp') LOOP
      IF v_whatsapp_url IS NOT NULL AND v_whatsapp_url != '' THEN
        -- Extrair número do WhatsApp (formato: https://wa.me/558398564818)
        v_phone_clean := regexp_replace(v_whatsapp_url, '.*wa\.me/(\d+).*', '\1', 'g');
        
        -- Se não encontrou, tentar outros formatos
        IF v_phone_clean = v_whatsapp_url THEN
          v_phone_clean := regexp_replace(v_whatsapp_url, '[^\d]', '', 'g');
        END IF;
        
        -- Remover +55 se presente
        IF v_phone_clean LIKE '55%' AND length(v_phone_clean) > 10 THEN
          v_phone_clean := substring(v_phone_clean from 3);
        END IF;
        
        -- Extrair DDD e número
        IF length(v_phone_clean) >= 10 THEN
          v_ddd := substring(v_phone_clean from 1 for 2);
          v_number := substring(v_phone_clean from 3);
          
          -- Formatar telefone
          IF length(v_number) = 9 THEN
            v_formatted := format('(%s) %s-%s', v_ddd, substring(v_number from 1 for 5), substring(v_number from 6));
          ELSIF length(v_number) = 8 THEN
            v_formatted := format('(%s) %s-%s', v_ddd, substring(v_number from 1 for 4), substring(v_number from 5));
          ELSE
            v_formatted := format('(%s) %s', v_ddd, v_number);
          END IF;
          
          v_scraping_phones := v_scraping_phones || jsonb_build_object(
            'number', v_ddd || v_number,
            'source', 'scraping',
            'type', CASE WHEN length(v_number) = 9 THEN 'mobile' ELSE 'landline' END,
            'verified', false,
            'whatsapp', true,  -- ✅ Flag WhatsApp
            'formatted', v_formatted,
            'with_country', format('+55 %s', v_formatted)
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ====================================================================
  -- FORMATAR REDES SOCIAIS COMO WEBSITES
  -- ====================================================================
  -- API retorna: {"linkedin": [...], "facebook": [...], "instagram": [...]}
  -- Converter para array de websites com type: 'social'
  IF p_scraping_data->'social_media' IS NOT NULL THEN
    -- LinkedIn
    IF p_scraping_data->'social_media'->'linkedin' IS NOT NULL THEN
      FOR v_social_url IN SELECT jsonb_array_elements_text(p_scraping_data->'social_media'->'linkedin') LOOP
        IF v_social_url IS NOT NULL AND v_social_url != '' THEN
          v_scraping_websites := v_scraping_websites || jsonb_build_object(
            'url', v_social_url,
            'domain', regexp_replace(v_social_url, '^https?://([^/]+).*', '\1', 'g'),
            'source', 'scraping',
            'type', 'social'
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Facebook
    IF p_scraping_data->'social_media'->'facebook' IS NOT NULL THEN
      FOR v_social_url IN SELECT jsonb_array_elements_text(p_scraping_data->'social_media'->'facebook') LOOP
        IF v_social_url IS NOT NULL AND v_social_url != '' THEN
          v_scraping_websites := v_scraping_websites || jsonb_build_object(
            'url', v_social_url,
            'domain', regexp_replace(v_social_url, '^https?://([^/]+).*', '\1', 'g'),
            'source', 'scraping',
            'type', 'social'
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Instagram
    IF p_scraping_data->'social_media'->'instagram' IS NOT NULL THEN
      FOR v_social_url IN SELECT jsonb_array_elements_text(p_scraping_data->'social_media'->'instagram') LOOP
        IF v_social_url IS NOT NULL AND v_social_url != '' THEN
          v_scraping_websites := v_scraping_websites || jsonb_build_object(
            'url', v_social_url,
            'domain', regexp_replace(v_social_url, '^https?://([^/]+).*', '\1', 'g'),
            'source', 'scraping',
            'type', 'social'
          );
        END IF;
      END LOOP;
    END IF;
    
    -- YouTube
    IF p_scraping_data->'social_media'->'youtube' IS NOT NULL THEN
      FOR v_social_url IN SELECT jsonb_array_elements_text(p_scraping_data->'social_media'->'youtube') LOOP
        IF v_social_url IS NOT NULL AND v_social_url != '' THEN
          v_scraping_websites := v_scraping_websites || jsonb_build_object(
            'url', v_social_url,
            'domain', regexp_replace(v_social_url, '^https?://([^/]+).*', '\1', 'g'),
            'source', 'scraping',
            'type', 'social'
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Twitter
    IF p_scraping_data->'social_media'->'twitter' IS NOT NULL THEN
      FOR v_social_url IN SELECT jsonb_array_elements_text(p_scraping_data->'social_media'->'twitter') LOOP
        IF v_social_url IS NOT NULL AND v_social_url != '' THEN
          v_scraping_websites := v_scraping_websites || jsonb_build_object(
            'url', v_social_url,
            'domain', regexp_replace(v_social_url, '^https?://([^/]+).*', '\1', 'g'),
            'source', 'scraping',
            'type', 'social'
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- ====================================================================
  -- EXTRAIR PRIMEIRO CNPJ (se houver)
  -- ====================================================================
  IF p_scraping_data->'cnpj' IS NOT NULL AND jsonb_typeof(p_scraping_data->'cnpj') = 'array' THEN
    SELECT jsonb_array_elements_text(p_scraping_data->'cnpj') INTO v_scraping_cnpj LIMIT 1;
    IF v_scraping_cnpj IS NOT NULL AND v_scraping_cnpj != '' THEN
      -- Normalizar CNPJ (remover caracteres não numéricos)
      v_scraping_cnpj := regexp_replace(v_scraping_cnpj, '[^\d]', '', 'g');
      IF length(v_scraping_cnpj) = 14 THEN
        -- CNPJ válido encontrado
        NULL; -- Será atualizado no UPDATE abaixo
      ELSE
        v_scraping_cnpj := NULL;
      END IF;
    ELSE
      v_scraping_cnpj := NULL;
    END IF;
  END IF;

  -- ====================================================================
  -- CONSTRUIR scraping_data FORMATADO
  -- ====================================================================
  v_scraping_data_formatted := jsonb_build_object(
    'status', p_status,
    'url', p_scraping_data->>'url',
    'method', p_scraping_data->>'method',
    'emails', v_scraping_emails,  -- ✅ Formatado como array JSONB de objetos
    'phones', v_scraping_phones,  -- ✅ Formatado como array JSONB de objetos
    'websites', v_scraping_websites,  -- ✅ Redes sociais como websites
    'metadata', p_scraping_data->'metadata',
    'markdown', p_scraping_data->>'markdown',
    'performance', p_scraping_data->'performance',
    'checkouts', p_scraping_data->'checkouts',
    'pixels', p_scraping_data->'pixels',
    'images', p_scraping_data->'images',
    'button_links', p_scraping_data->'button_links',
    'social_media', p_scraping_data->'social_media',  -- Manter original também
    'whatsapp', p_scraping_data->'whatsapp',  -- Manter original também
    'cnpj', p_scraping_data->'cnpj'  -- Manter original também
  );

  -- ====================================================================
  -- ATUALIZAR lead_extraction_staging
  -- ====================================================================
  UPDATE lead_extraction_staging
  SET 
    scraping_data = v_scraping_data_formatted,
    scraping_enriched = true,
    scraping_status = 'completed',
    scraping_completed_at = NOW(),
    updated_at = NOW(),
    -- Atualizar CNPJ se encontrado
    cnpj_normalized = COALESCE(v_scraping_cnpj, cnpj_normalized)
  WHERE id = p_staging_id;

  -- O trigger normalize_and_consolidate_staging_v2 vai executar automaticamente
  -- e consolidar emails/phones/websites com outras fontes

  RETURN jsonb_build_object(
    'success', true,
    'emails_found', jsonb_array_length(v_scraping_emails),
    'phones_found', jsonb_array_length(v_scraping_phones),
    'websites_found', jsonb_array_length(v_scraping_websites),
    'cnpj_found', CASE WHEN v_scraping_cnpj IS NOT NULL THEN true ELSE false END
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, marcar como failed
    UPDATE lead_extraction_staging
    SET 
      scraping_status = 'failed',
      scraping_error = SQLERRM,
      scraping_completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_staging_id;
    
    RAISE;
END;
$$;

COMMENT ON FUNCTION process_scraping_result(UUID, JSONB, TEXT) IS 
'Processa resultado do scraping, formatando emails e phones no formato esperado pelo trigger normalize_and_consolidate_staging_v2';

