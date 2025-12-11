-- =============================================================================
-- MIGRATION: Adicionar suporte a phones_scraping em consolidate_all_phones
-- =============================================================================
-- PROBLEMA: A função consolidate_all_phones não aceita phones_scraping
--           O trigger extrai v_phones_scraping mas não passa para a função
-- SOLUÇÃO: Adicionar parâmetro phones_scraping e atualizar trigger
-- =============================================================================

-- =============================================================================
-- FUNÇÃO: consolidate_all_phones (V2 - COM SCRAPING)
-- =============================================================================

CREATE OR REPLACE FUNCTION consolidate_all_phones(
  phones_serpdev JSONB DEFAULT '[]'::jsonb,
  phones_whois JSONB DEFAULT '[]'::jsonb,
  phones_cnpj JSONB DEFAULT '[]'::jsonb,
  phones_scraping JSONB DEFAULT '[]'::jsonb,  -- ✅ NOVO PARÂMETRO
  phone_legacy TEXT DEFAULT NULL::text
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  all_phones JSONB := '[]'::jsonb;
  seen_numbers TEXT[] := '{}';
  phone_entry JSONB;
  phone_raw TEXT;
  normalized TEXT;
  v_source TEXT;
  v_error_context TEXT;
BEGIN
  -- Processar SerpDev com exception handling
  IF phones_serpdev IS NOT NULL AND jsonb_typeof(phones_serpdev) = 'array' THEN
    FOR phone_entry IN SELECT * FROM jsonb_array_elements(phones_serpdev) LOOP
      BEGIN
        phone_raw := COALESCE(phone_entry->>'number', phone_entry::text);
        normalized := normalize_phone(phone_raw);
        v_source := COALESCE(phone_entry->>'source', 'serpdev');
        
        IF normalized IS NOT NULL AND NOT (normalized = ANY(seen_numbers)) THEN
          all_phones := all_phones || jsonb_build_object(
            'number', normalized,
            'formatted', format_phone_br(normalized),
            'with_country', '+55 ' || format_phone_br(normalized),
            'source', v_source,
            'type', detect_phone_type(normalized),
            'verified', COALESCE((phone_entry->>'verified')::boolean, false),
            'whatsapp', COALESCE((phone_entry->>'whatsapp')::boolean, false)
          );
          seen_numbers := array_append(seen_numbers, normalized);
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          PERFORM log_error(
            'consolidate_all_phones',
            'Error processing SerpDev phone: ' || SQLERRM,
            phone_entry::text,
            jsonb_build_object('phone_raw', phone_raw)
          );
      END;
    END LOOP;
  END IF;
  
  -- Processar WHOIS com exception handling
  IF phones_whois IS NOT NULL AND jsonb_typeof(phones_whois) = 'array' THEN
    FOR phone_entry IN SELECT * FROM jsonb_array_elements(phones_whois) LOOP
      BEGIN
        phone_raw := COALESCE(phone_entry->>'number', phone_entry::text);
        normalized := normalize_phone(phone_raw);
        v_source := COALESCE(phone_entry->>'source', 'whois');
        
        IF normalized IS NOT NULL AND NOT (normalized = ANY(seen_numbers)) THEN
          all_phones := all_phones || jsonb_build_object(
            'number', normalized,
            'formatted', format_phone_br(normalized),
            'with_country', '+55 ' || format_phone_br(normalized),
            'source', v_source,
            'type', detect_phone_type(normalized),
            'verified', COALESCE((phone_entry->>'verified')::boolean, false),
            'whatsapp', COALESCE((phone_entry->>'whatsapp')::boolean, false)
          );
          seen_numbers := array_append(seen_numbers, normalized);
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          PERFORM log_error(
            'consolidate_all_phones',
            'Error processing WHOIS phone: ' || SQLERRM,
            phone_entry::text,
            jsonb_build_object('phone_raw', phone_raw)
          );
      END;
    END LOOP;
  END IF;
  
  -- Processar CNPJ com exception handling
  IF phones_cnpj IS NOT NULL AND jsonb_typeof(phones_cnpj) = 'array' THEN
    FOR phone_entry IN SELECT * FROM jsonb_array_elements(phones_cnpj) LOOP
      BEGIN
        phone_raw := COALESCE(phone_entry->>'number', phone_entry::text);
        normalized := normalize_phone(phone_raw);
        v_source := COALESCE(phone_entry->>'source', 'cnpj');
        
        IF normalized IS NOT NULL AND NOT (normalized = ANY(seen_numbers)) THEN
          all_phones := all_phones || jsonb_build_object(
            'number', normalized,
            'formatted', format_phone_br(normalized),
            'with_country', '+55 ' || format_phone_br(normalized),
            'source', v_source,
            'type', detect_phone_type(normalized),
            'verified', COALESCE((phone_entry->>'verified')::boolean, true),
            'whatsapp', COALESCE((phone_entry->>'whatsapp')::boolean, false)
          );
          seen_numbers := array_append(seen_numbers, normalized);
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          PERFORM log_error(
            'consolidate_all_phones',
            'Error processing CNPJ phone: ' || SQLERRM,
            phone_entry::text,
            jsonb_build_object('phone_raw', phone_raw)
          );
      END;
    END LOOP;
  END IF;
  
  -- ====================================================================
  -- PROCESSAR SCRAPING (NOVO)
  -- ====================================================================
  IF phones_scraping IS NOT NULL AND jsonb_typeof(phones_scraping) = 'array' THEN
    FOR phone_entry IN SELECT * FROM jsonb_array_elements(phones_scraping) LOOP
      BEGIN
        phone_raw := COALESCE(phone_entry->>'number', phone_entry::text);
        normalized := normalize_phone(phone_raw);
        v_source := COALESCE(phone_entry->>'source', 'scraping');
        
        IF normalized IS NOT NULL AND NOT (normalized = ANY(seen_numbers)) THEN
          all_phones := all_phones || jsonb_build_object(
            'number', normalized,
            'formatted', COALESCE(phone_entry->>'formatted', format_phone_br(normalized)),
            'with_country', COALESCE(phone_entry->>'with_country', '+55 ' || format_phone_br(normalized)),
            'source', v_source,
            'type', COALESCE(phone_entry->>'type', detect_phone_type(normalized)),
            'verified', COALESCE((phone_entry->>'verified')::boolean, false),
            'whatsapp', COALESCE((phone_entry->>'whatsapp')::boolean, false)
          );
          seen_numbers := array_append(seen_numbers, normalized);
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          PERFORM log_error(
            'consolidate_all_phones',
            'Error processing Scraping phone: ' || SQLERRM,
            phone_entry::text,
            jsonb_build_object('phone_raw', phone_raw)
          );
      END;
    END LOOP;
  END IF;
  
  -- Compatibilidade: phone_normalized legado
  IF phone_legacy IS NOT NULL AND phone_legacy != '' THEN
    BEGIN
      normalized := normalize_phone(phone_legacy);
      IF normalized IS NOT NULL AND NOT (normalized = ANY(seen_numbers)) THEN
        all_phones := all_phones || jsonb_build_object(
          'number', normalized,
          'formatted', format_phone_br(normalized),
          'with_country', '+55 ' || format_phone_br(normalized),
          'source', 'legacy',
          'type', detect_phone_type(normalized),
          'verified', false,
          'whatsapp', false
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        PERFORM log_error(
          'consolidate_all_phones',
          'Error processing legacy phone: ' || SQLERRM,
          phone_legacy,
          NULL
        );
    END;
  END IF;
  
  RETURN all_phones;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_context = PG_EXCEPTION_CONTEXT;
    PERFORM log_error(
      'consolidate_all_phones',
      'Catastrophic error: ' || SQLERRM,
      v_error_context,
      jsonb_build_object(
        'phones_serpdev', phones_serpdev,
        'phones_whois', phones_whois,
        'phones_cnpj', phones_cnpj,
        'phones_scraping', phones_scraping
      )
    );
    
    RETURN '[]'::jsonb;
END;
$$;

COMMENT ON FUNCTION consolidate_all_phones(JSONB, JSONB, JSONB, JSONB, TEXT) IS 
'Consolida telefones de todas as fontes (SerpDev, WHOIS, CNPJ, Scraping) removendo duplicatas';

-- =============================================================================
-- TRIGGER: normalize_and_consolidate_staging_v2 (ATUALIZADO)
-- =============================================================================

CREATE OR REPLACE FUNCTION normalize_and_consolidate_staging_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_phones_serpdev JSONB := '[]'::jsonb;
  v_phones_whois JSONB := '[]'::jsonb;
  v_phones_cnpj JSONB := '[]'::jsonb;
  v_phones_scraping JSONB := '[]'::jsonb;
  v_emails_serpdev JSONB := '[]'::jsonb;
  v_emails_whois JSONB := '[]'::jsonb;
  v_emails_cnpj JSONB := '[]'::jsonb;
  v_emails_scraping JSONB := '[]'::jsonb;
  v_websites_serpdev JSONB := '[]'::jsonb;
  v_websites_whois JSONB := '[]'::jsonb;
  v_websites_cnpj JSONB := '[]'::jsonb;
  v_websites_scraping JSONB := '[]'::jsonb;
BEGIN
  -- ====================================================================
  -- EXTRAIR TELEFONES DE TODAS AS FONTES
  -- ====================================================================
  
  -- SerpDev: extracted_data
  IF NEW.extracted_data IS NOT NULL THEN
    IF jsonb_typeof(NEW.extracted_data->'phone') = 'array' THEN
      v_phones_serpdev := NEW.extracted_data->'phone';
    ELSIF jsonb_typeof(NEW.extracted_data->'phone') = 'string' THEN
      v_phones_serpdev := jsonb_build_array(
        jsonb_build_object(
          'number', NEW.extracted_data->>'phone',
          'source', 'serpdev'
        )
      );
    END IF;
    
    IF NEW.extracted_data->'phones' IS NOT NULL THEN
      v_phones_serpdev := NEW.extracted_data->'phones';
    END IF;
  END IF;
  
  -- WHOIS: whois_data
  IF NEW.whois_data IS NOT NULL THEN
    IF NEW.whois_data->'phones' IS NOT NULL THEN
      v_phones_whois := NEW.whois_data->'phones';
    ELSIF NEW.whois_data->'telefone' IS NOT NULL THEN
      v_phones_whois := jsonb_build_array(
        jsonb_build_object(
          'number', NEW.whois_data->>'telefone',
          'source', 'whois'
        )
      );
    END IF;
  END IF;
  
  -- CNPJ: cnpj_data
  IF NEW.cnpj_data IS NOT NULL THEN
    IF NEW.cnpj_data->'phones' IS NOT NULL THEN
      v_phones_cnpj := NEW.cnpj_data->'phones';
    ELSIF NEW.cnpj_data->'telefone' IS NOT NULL THEN
      v_phones_cnpj := jsonb_build_array(
        jsonb_build_object(
          'number', NEW.cnpj_data->>'telefone',
          'source', 'cnpj',
          'verified', true
        )
      );
    END IF;
  END IF;
  
  -- SCRAPING: scraping_data (NOVO)
  IF NEW.scraping_data IS NOT NULL THEN
    IF NEW.scraping_data->'phones' IS NOT NULL THEN
      v_phones_scraping := NEW.scraping_data->'phones';
    END IF;
  END IF;
  
  -- CONSOLIDAR telefones (sem duplicatas) - AGORA INCLUI SCRAPING
  NEW.phones := consolidate_all_phones(
    v_phones_serpdev,
    v_phones_whois,
    v_phones_cnpj,
    v_phones_scraping,  -- ✅ NOVO PARÂMETRO
    NEW.phone_normalized  -- Compatibilidade
  );
  
  -- Escolher telefone principal
  NEW.primary_phone := get_primary_phone(NEW.phones);
  
  -- Manter phone_normalized para compatibilidade
  IF NEW.primary_phone IS NOT NULL THEN
    NEW.phone_normalized := NEW.primary_phone;
  END IF;
  
  -- ====================================================================
  -- EXTRAIR EMAILS DE TODAS AS FONTES
  -- ====================================================================
  
  -- SerpDev
  IF NEW.extracted_data IS NOT NULL THEN
    IF jsonb_typeof(NEW.extracted_data->'email') = 'array' THEN
      v_emails_serpdev := NEW.extracted_data->'email';
    ELSIF jsonb_typeof(NEW.extracted_data->'email') = 'string' THEN
      v_emails_serpdev := jsonb_build_array(
        jsonb_build_object(
          'address', NEW.extracted_data->>'email',
          'source', 'serpdev'
        )
      );
    END IF;
    
    IF NEW.extracted_data->'emails' IS NOT NULL THEN
      v_emails_serpdev := NEW.extracted_data->'emails';
    END IF;
  END IF;
  
  -- WHOIS
  IF NEW.whois_data IS NOT NULL THEN
    IF NEW.whois_data->'emails' IS NOT NULL THEN
      v_emails_whois := NEW.whois_data->'emails';
    ELSIF NEW.whois_data->'email' IS NOT NULL THEN
      v_emails_whois := jsonb_build_array(
        jsonb_build_object(
          'address', NEW.whois_data->>'email',
          'source', 'whois'
        )
      );
    END IF;
  END IF;
  
  -- CNPJ
  IF NEW.cnpj_data IS NOT NULL THEN
    IF NEW.cnpj_data->'emails' IS NOT NULL THEN
      v_emails_cnpj := NEW.cnpj_data->'emails';
    ELSIF NEW.cnpj_data->'email' IS NOT NULL THEN
      v_emails_cnpj := jsonb_build_array(
        jsonb_build_object(
          'address', NEW.cnpj_data->>'email',
          'source', 'cnpj',
          'verified', true
        )
      );
    END IF;
  END IF;
  
  -- SCRAPING: scraping_data (NOVO - CORREÇÃO)
  IF NEW.scraping_data IS NOT NULL THEN
    IF NEW.scraping_data->'emails' IS NOT NULL THEN
      v_emails_scraping := NEW.scraping_data->'emails';
    END IF;
  END IF;
  
  -- CONSOLIDAR emails (sem duplicatas) - AGORA INCLUI SCRAPING
  NEW.emails := consolidate_all_emails(
    v_emails_serpdev,
    v_emails_whois,
    v_emails_cnpj,
    v_emails_scraping  -- NOVO PARÂMETRO
  );
  
  -- Escolher email principal
  NEW.primary_email := get_primary_email(NEW.emails);
  
  -- ====================================================================
  -- EXTRAIR WEBSITES DE TODAS AS FONTES
  -- ====================================================================
  
  -- SerpDev
  IF NEW.extracted_data IS NOT NULL THEN
    IF jsonb_typeof(NEW.extracted_data->'website') = 'array' THEN
      v_websites_serpdev := NEW.extracted_data->'website';
    ELSIF jsonb_typeof(NEW.extracted_data->'website') = 'string' THEN
      v_websites_serpdev := jsonb_build_array(
        jsonb_build_object(
          'url', NEW.extracted_data->>'website',
          'source', 'serpdev',
          'type', 'main'
        )
      );
    END IF;
    
    IF NEW.extracted_data->'websites' IS NOT NULL THEN
      v_websites_serpdev := NEW.extracted_data->'websites';
    END IF;
  END IF;
  
  -- WHOIS
  IF NEW.whois_data IS NOT NULL THEN
    IF NEW.whois_data->'websites' IS NOT NULL THEN
      v_websites_whois := NEW.whois_data->'websites';
    ELSIF NEW.whois_data->'dominio' IS NOT NULL THEN
      v_websites_whois := jsonb_build_array(
        jsonb_build_object(
          'url', 'https://' || (NEW.whois_data->>'dominio'),
          'source', 'whois',
          'type', 'main'
        )
      );
    END IF;
  END IF;
  
  -- CNPJ
  IF NEW.cnpj_data IS NOT NULL THEN
    IF NEW.cnpj_data->'websites' IS NOT NULL THEN
      v_websites_cnpj := NEW.cnpj_data->'websites';
    END IF;
  END IF;
  
  -- SCRAPING: scraping_data (NOVO)
  IF NEW.scraping_data IS NOT NULL THEN
    IF NEW.scraping_data->'websites' IS NOT NULL THEN
      v_websites_scraping := NEW.scraping_data->'websites';
    END IF;
  END IF;
  
  -- CONSOLIDAR websites (sem duplicatas) - AGORA INCLUI SCRAPING
  NEW.websites := consolidate_all_websites(
    v_websites_serpdev,
    v_websites_whois,
    v_websites_cnpj,
    NEW.domain  -- Compatibilidade
  );
  
  -- Escolher website principal
  NEW.primary_website := get_primary_website(NEW.websites);
  
  -- Manter domain para compatibilidade
  IF NEW.primary_website IS NOT NULL THEN
    NEW.domain := extract_domain(NEW.primary_website);
  END IF;
  
  -- ====================================================================
  -- CONSOLIDAR CNPJ (mantém lógica antiga)
  -- ====================================================================
  DECLARE
    v_cnpj_result RECORD;
  BEGIN
    SELECT * INTO v_cnpj_result
    FROM consolidate_cnpj(
      NEW.whois_data->>'cnpj',
      NEW.cnpj_data->>'cnpj'
    );
    
    IF v_cnpj_result IS NOT NULL THEN
      NEW.cnpj_normalized := v_cnpj_result.cnpj_normalized;
      NEW.cnpj_source := v_cnpj_result.cnpj_source;
    END IF;
  END;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION normalize_and_consolidate_staging_v2() IS 
'Normaliza e consolida dados de todas as fontes (SerpDev, WHOIS, CNPJ, Scraping)';

