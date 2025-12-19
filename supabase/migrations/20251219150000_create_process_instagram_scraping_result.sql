-- =============================================================================
-- MIGRATION: Função process_instagram_scraping_result
-- =============================================================================
-- Versão adaptada de process_scraping_result() para instagram_enriched_profiles
-- Formata e valida dados do scraper API antes de salvar
-- =============================================================================

CREATE OR REPLACE FUNCTION process_instagram_scraping_result(
  p_profile_id UUID,
  p_scraping_data JSONB,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
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
  v_cnpj_entry TEXT;
  v_scraping_data_formatted JSONB;
BEGIN
  -- Se status é erro, marcar como failed
  IF p_status = 'error' OR p_status != 'success' THEN
    UPDATE instagram_enriched_profiles
    SET
      website_scraping_status = 'failed',
      website_scraping_error = COALESCE(p_scraping_data->>'error', 'Scraping failed'),
      website_scraping_enriched = TRUE,
      website_scraping_completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_profile_id;

    RETURN jsonb_build_object('success', false, 'error', 'Scraping failed');
  END IF;

  -- ====================================================================
  -- FORMATAR EMAILS
  -- ====================================================================
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
  IF p_scraping_data->'phones' IS NOT NULL AND jsonb_typeof(p_scraping_data->'phones') = 'array' THEN
    FOR v_phone_entry IN SELECT jsonb_array_elements_text(p_scraping_data->'phones') LOOP
      IF v_phone_entry IS NOT NULL AND v_phone_entry != '' THEN
        v_phone_clean := regexp_replace(v_phone_entry, '[^\d+]', '', 'g');

        IF v_phone_clean LIKE '+55%' THEN
          v_phone_clean := substring(v_phone_clean from 4);
        ELSIF v_phone_clean LIKE '55%' AND length(v_phone_clean) > 10 THEN
          v_phone_clean := substring(v_phone_clean from 3);
        END IF;

        IF length(v_phone_clean) >= 10 THEN
          v_ddd := substring(v_phone_clean from 1 for 2);
          v_number := substring(v_phone_clean from 3);

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
  IF p_scraping_data->'whatsapp' IS NOT NULL AND jsonb_typeof(p_scraping_data->'whatsapp') = 'array' THEN
    FOR v_whatsapp_url IN SELECT jsonb_array_elements_text(p_scraping_data->'whatsapp') LOOP
      IF v_whatsapp_url IS NOT NULL AND v_whatsapp_url != '' THEN
        v_phone_clean := regexp_replace(v_whatsapp_url, '.*wa\.me/(\d+).*', '\1', 'g');

        IF v_phone_clean = v_whatsapp_url THEN
          v_phone_clean := regexp_replace(v_whatsapp_url, '[^\d]', '', 'g');
        END IF;

        IF v_phone_clean LIKE '55%' AND length(v_phone_clean) > 10 THEN
          v_phone_clean := substring(v_phone_clean from 3);
        END IF;

        IF length(v_phone_clean) >= 10 THEN
          v_ddd := substring(v_phone_clean from 1 for 2);
          v_number := substring(v_phone_clean from 3);

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
            'whatsapp', true,
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
  IF p_scraping_data->'social_media' IS NOT NULL THEN
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
  END IF;

  -- ====================================================================
  -- EXTRAIR PRIMEIRO CNPJ (se houver) COM VALIDAÇÃO
  -- ====================================================================
  IF p_scraping_data->'cnpj' IS NOT NULL AND jsonb_typeof(p_scraping_data->'cnpj') = 'array' THEN
    FOR v_cnpj_entry IN SELECT jsonb_array_elements_text(p_scraping_data->'cnpj') LOOP
      IF v_cnpj_entry IS NOT NULL AND v_cnpj_entry != '' THEN
        v_scraping_cnpj := regexp_replace(v_cnpj_entry, '[^\d]', '', 'g');
        IF length(v_scraping_cnpj) = 14 THEN
          -- CNPJ válido (14 dígitos)
          EXIT;
        ELSE
          v_scraping_cnpj := NULL;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ====================================================================
  -- CONSTRUIR scraping_data FORMATADO
  -- ====================================================================
  v_scraping_data_formatted := jsonb_build_object(
    'status', p_status,
    'url', p_scraping_data->>'url',
    'method', p_scraping_data->>'method',
    'emails', v_scraping_emails,
    'phones', v_scraping_phones,
    'websites', v_scraping_websites,
    'metadata', p_scraping_data->'metadata',
    'markdown', p_scraping_data->>'markdown',
    'performance', p_scraping_data->'performance',
    'checkouts', p_scraping_data->'checkouts',
    'pixels', p_scraping_data->'pixels',
    'images', p_scraping_data->'images',
    'button_links', p_scraping_data->'button_links',
    'social_media', p_scraping_data->'social_media',
    'whatsapp', p_scraping_data->'whatsapp',
    'cnpj', p_scraping_data->'cnpj'
  );

  -- ====================================================================
  -- ATUALIZAR instagram_enriched_profiles
  -- ====================================================================
  UPDATE instagram_enriched_profiles
  SET
    website_scraping_data = v_scraping_data_formatted,
    website_scraping_enriched = TRUE,
    website_scraping_status = 'completed',
    website_scraping_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'emails_found', jsonb_array_length(v_scraping_emails),
    'phones_found', jsonb_array_length(v_scraping_phones),
    'websites_found', jsonb_array_length(v_scraping_websites),
    'cnpj_found', CASE WHEN v_scraping_cnpj IS NOT NULL THEN true ELSE false END
  );

EXCEPTION
  WHEN OTHERS THEN
    UPDATE instagram_enriched_profiles
    SET
      website_scraping_status = 'failed',
      website_scraping_enriched = TRUE,
      website_scraping_error = SQLERRM,
      website_scraping_completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_profile_id;

    RAISE;
END;
$$;

COMMENT ON FUNCTION process_instagram_scraping_result IS
  'Processa resultado do scraper API para perfis do Instagram (versão adaptada de process_scraping_result)';
