-- =============================================================================
-- CORREÇÃO: sync_staging_to_lead_custom_fields - Tratar social_media como objeto
-- =============================================================================
-- O scraping retorna social_media como objeto {"facebook": "url", "instagram": "url"}
-- ao invés de array [{url: "..."}]. Isso causava erro "cannot extract elements from object"
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_staging_to_lead_custom_fields(p_staging_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    v_lead_id UUID;
    v_workspace_id UUID;
    v_val TEXT;
    v_capital_value NUMERIC;
    v_email_item JSONB;
    v_phone_item JSONB;
    v_social_item JSONB;
    v_email_index INT := 1;
    v_phone_index INT := 1;
    v_social_index INT := 1;
    v_field_name TEXT;
    v_scraping_data JSONB;
    v_markdown TEXT;
    v_social_media JSONB;
    v_social_key TEXT;
BEGIN
    -- Buscar IDs básicos
    SELECT migrated_lead_id, workspace_id, scraping_data
    INTO v_lead_id, v_workspace_id, v_scraping_data
    FROM lead_extraction_staging WHERE id = p_staging_id;

    IF v_lead_id IS NULL THEN
        RETURN 0;
    END IF;

    -- === DADOS BÁSICOS ===
    SELECT primary_phone INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Telefone Principal', v_val, 'phone');

    SELECT COALESCE(contact_type, 'Telefone') INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Tipo de Contato', v_val, 'select');

    SELECT primary_website INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Website Principal', v_val, 'url');

    SELECT primary_email INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Email Principal', v_val, 'email');

    SELECT phones::text INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Todos os Telefones (JSON)', v_val, 'text');

    SELECT websites::text INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Todos os Websites (JSON)', v_val, 'text');

    SELECT emails::text INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Todos os Emails (JSON)', v_val, 'text');

    SELECT COALESCE(formatted_address, extracted_data->>'address') INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Endereço', v_val, 'text');

    SELECT extracted_data->>'category' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Categoria', v_val, 'text');

    SELECT extracted_data->>'rating' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Rating', v_val, 'text');

    SELECT extracted_data->>'reviews' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Avaliações', v_val, 'text');

    SELECT COALESCE(latitude::text, extracted_data->>'latitude') INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Latitude', v_val, 'text');

    SELECT COALESCE(longitude::text, extracted_data->>'longitude') INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Longitude', v_val, 'text');

    -- === WHATSAPP ===
    SELECT CASE WHEN whatsapp_valid THEN 'Sim' WHEN whatsapp_valid = false THEN 'Não' ELSE NULL END
    INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WhatsApp Válido', v_val, 'select');

    SELECT whatsapp_name INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WhatsApp Nome', v_val, 'text');

    -- === CNPJ (da API ReceitaWS) ===
    SELECT REGEXP_REPLACE(cnpj_normalized, '(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})', '\1.\2.\3/\4-\5')
    INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id AND cnpj_normalized IS NOT NULL;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'CNPJ', v_val, 'text');

    SELECT cnpj_data->>'razao_social' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Razão Social', v_val, 'text');

    SELECT cnpj_data->>'nome_fantasia' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Nome Fantasia', v_val, 'text');

    SELECT cnpj_data->>'porte' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Porte da Empresa', v_val, 'text');

    -- Capital Social
    SELECT (cnpj_data->>'capital_social')::numeric INTO v_capital_value
    FROM lead_extraction_staging
    WHERE id = p_staging_id AND cnpj_data->>'capital_social' IS NOT NULL;

    IF v_capital_value IS NOT NULL THEN
        v_val := format_capital_social(v_capital_value);
        PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Capital Social', v_val, 'text');
    END IF;

    SELECT cnpj_data->>'cnae_fiscal_descricao' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'CNAE Principal', v_val, 'text');

    SELECT CASE WHEN (cnpj_data->>'opcao_pelo_simples')::boolean THEN 'Sim' ELSE 'Não' END
    INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id AND cnpj_data->>'opcao_pelo_simples' IS NOT NULL;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Simples Nacional', v_val, 'select');

    SELECT cnpj_data->>'descricao_situacao_cadastral' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Situação Cadastral', v_val, 'text');

    SELECT cnpj_data->>'data_inicio_atividade' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Data Abertura Empresa', v_val, 'text');

    SELECT (cnpj_data->>'municipio') || '/' || (cnpj_data->>'uf')
    INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id AND cnpj_data->>'municipio' IS NOT NULL;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Cidade/UF CNPJ', v_val, 'text');

    SELECT CONCAT_WS(', ',
        NULLIF(CONCAT_WS(' ', cnpj_data->>'descricao_tipo_de_logradouro', cnpj_data->>'logradouro'), ' '),
        NULLIF(cnpj_data->>'numero', ''),
        NULLIF(cnpj_data->>'complemento', ''),
        NULLIF(cnpj_data->>'bairro', ''),
        NULLIF(cnpj_data->>'cep', ''))
    INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Endereço CNPJ', v_val, 'text');

    SELECT cnpj_data->'qsa'::text INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id AND cnpj_data->'qsa' IS NOT NULL;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Sócios (JSON)', v_val, 'text');

    -- === WHOIS ===
    SELECT domain INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Domínio', v_val, 'text');

    SELECT REGEXP_REPLACE(whois_extracted_data->>'cnpj', '(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})', '\1.\2.\3/\4-\5')
    INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id AND whois_extracted_data->>'cnpj' IS NOT NULL;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS CNPJ', v_val, 'text');

    SELECT whois_extracted_data->>'company_name' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Razão Social', v_val, 'text');

    SELECT whois_extracted_data->>'legal_representative' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Representante Legal', v_val, 'text');

    SELECT whois_extracted_data->>'admin_email' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Email', v_val, 'email');

    SELECT whois_extracted_data->>'admin_name' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Responsável', v_val, 'text');

    SELECT whois_extracted_data->>'tech_name' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Contato Técnico', v_val, 'text');

    SELECT TO_CHAR((whois_extracted_data->>'registration_date')::timestamp, 'DD/MM/YYYY')
    INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id AND whois_extracted_data->>'registration_date' IS NOT NULL;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Data Registro', v_val, 'text');

    SELECT TO_CHAR((whois_extracted_data->>'expiration_date')::timestamp, 'DD/MM/YYYY')
    INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id AND whois_extracted_data->>'expiration_date' IS NOT NULL;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Data Expiração', v_val, 'text');

    SELECT whois_extracted_data->>'status' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Status', v_val, 'text');

    SELECT whois_extracted_data->'nameservers'::text INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
    PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'WHOIS Nameservers', v_val, 'text');

    -- === SCRAPING MARKDOWN ===
    IF v_scraping_data IS NOT NULL THEN
      v_markdown := v_scraping_data->>'markdown';
      IF v_markdown IS NOT NULL AND v_markdown != '' THEN
        PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Scraping Markdown', v_markdown, 'text');
      END IF;
    END IF;

    -- Parsear emails do scraping (só se for array)
    IF v_scraping_data IS NOT NULL AND v_scraping_data->'emails' IS NOT NULL
       AND jsonb_typeof(v_scraping_data->'emails') = 'array' THEN
      FOR v_email_item IN
        SELECT jsonb_array_elements(v_scraping_data->'emails')
      LOOP
        v_field_name := CASE
          WHEN v_email_index = 1 THEN 'Scraping Email 1'
          WHEN v_email_index = 2 THEN 'Scraping Email 2'
          WHEN v_email_index = 3 THEN 'Scraping Email 3'
          ELSE 'Scraping Email ' || v_email_index::TEXT
        END;

        v_val := v_email_item->>'address';
        IF v_val IS NOT NULL AND v_val != '' THEN
          PERFORM set_custom_field_value(v_lead_id, v_workspace_id, v_field_name, v_val, 'email');
          v_email_index := v_email_index + 1;
        END IF;
      END LOOP;
    END IF;

    -- Parsear telefones do scraping (só se for array)
    IF v_scraping_data IS NOT NULL AND v_scraping_data->'phones' IS NOT NULL
       AND jsonb_typeof(v_scraping_data->'phones') = 'array' THEN
      FOR v_phone_item IN
        SELECT jsonb_array_elements(v_scraping_data->'phones')
      LOOP
        v_field_name := CASE
          WHEN v_phone_index = 1 THEN 'Scraping Telefone 1'
          WHEN v_phone_index = 2 THEN 'Scraping Telefone 2'
          WHEN v_phone_index = 3 THEN 'Scraping Telefone 3'
          ELSE 'Scraping Telefone ' || v_phone_index::TEXT
        END;

        v_val := v_phone_item->>'number';
        IF v_val IS NOT NULL AND v_val != '' THEN
          PERFORM set_custom_field_value(v_lead_id, v_workspace_id, v_field_name, v_val, 'phone');
          v_phone_index := v_phone_index + 1;
        END IF;
      END LOOP;
    END IF;

    -- Parsear redes sociais do scraping (CORRIGIDO: tratar como array OU objeto)
    IF v_scraping_data IS NOT NULL AND v_scraping_data->'social_media' IS NOT NULL THEN
      v_social_media := v_scraping_data->'social_media';

      -- Se for array, iterar normalmente
      IF jsonb_typeof(v_social_media) = 'array' THEN
        FOR v_social_item IN
          SELECT jsonb_array_elements(v_social_media)
        LOOP
          v_field_name := CASE
            WHEN v_social_index = 1 THEN 'Scraping Rede Social 1'
            WHEN v_social_index = 2 THEN 'Scraping Rede Social 2'
            WHEN v_social_index = 3 THEN 'Scraping Rede Social 3'
            ELSE 'Scraping Rede Social ' || v_social_index::TEXT
          END;

          v_val := v_social_item->>'url';
          IF v_val IS NOT NULL AND v_val != '' THEN
            PERFORM set_custom_field_value(v_lead_id, v_workspace_id, v_field_name, v_val, 'url');
            v_social_index := v_social_index + 1;
          END IF;
        END LOOP;

      -- Se for objeto (ex: {"facebook": "url", "instagram": "url"}), iterar pelas chaves
      ELSIF jsonb_typeof(v_social_media) = 'object' THEN
        FOR v_social_key IN
          SELECT jsonb_object_keys(v_social_media)
        LOOP
          v_val := v_social_media->>v_social_key;
          IF v_val IS NOT NULL AND v_val != '' THEN
            -- Usar nome da rede social como sufixo
            v_field_name := 'Scraping ' || INITCAP(v_social_key);
            PERFORM set_custom_field_value(v_lead_id, v_workspace_id, v_field_name, v_val, 'url');
          END IF;
        END LOOP;
      END IF;
    END IF;

    RETURN 1;
END;
$function$;
