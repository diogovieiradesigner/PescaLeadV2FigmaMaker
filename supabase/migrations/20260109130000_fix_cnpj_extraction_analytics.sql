-- =============================================================================
-- Migration: Fix CNPJ extraction analytics
-- =============================================================================
-- PROBLEMA: A RPC get_extraction_analytics não suporta extrações CNPJ porque
-- CNPJ usa a tabela `cnpj_extraction_staging` enquanto a RPC só consulta
-- `lead_extraction_staging`.
--
-- SOLUÇÃO: Detectar o source da run e consultar a tabela correta.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_extraction_analytics(p_run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run_id UUID := p_run_id;
  v_source TEXT;
  v_result JSON;
  v_run_data JSON;
  v_contatos JSON;
  v_enriquecimento JSON;
  v_qualidade JSON;
  v_timeline JSON;
  v_graficos JSON;

  -- Contadores gerais
  v_total_leads INT;
  v_total_qualificados INT;
  v_total_rejeitados INT;
  v_created_quantity INT;

  -- Contadores de contato
  v_com_telefone INT;
  v_telefone_fixo INT;
  v_com_website INT;
  v_sites_br INT;
  v_sites_internacionais INT;
  v_com_email INT;
  v_com_cnpj INT;
  v_whatsapp_valido INT;
  v_com_endereco INT;

  -- Contadores de enriquecimento
  v_whois_enriched INT;
  v_whois_pending INT;
  v_cnpj_enriched INT;
  v_cnpj_pending INT;
  v_scraping_completed INT;
  v_scraping_pending INT;
  v_whatsapp_checked INT;
  v_whatsapp_pending INT;

  -- Score de qualidade
  v_score_excelente INT := 0;
  v_score_alta INT := 0;
  v_score_media INT := 0;
  v_score_baixa INT := 0;
  v_score_medio NUMERIC := 0;
  v_classificacao TEXT := '-';
  v_estrelas INT := 0;

BEGIN
  -- Verificar se run existe e obter source
  SELECT source INTO v_source
  FROM lead_extraction_runs WHERE id = v_run_id;

  IF v_source IS NULL THEN
    RETURN json_build_object('error', 'Run não encontrada');
  END IF;

  -- ========================================
  -- DADOS DA RUN (comum para todas as fontes)
  -- ========================================
  SELECT json_build_object(
    'id', r.id,
    'extraction_id', r.extraction_id,
    'workspace_id', r.workspace_id,
    'source', COALESCE(r.source, 'google_maps'),
    'run_name', COALESCE(r.run_name, e.extraction_name, r.search_term),
    'search_term', r.search_term,
    'location', r.location,
    'niche', r.niche,
    'status', r.status,
    'target_quantity', r.target_quantity,
    'pages_consumed', r.pages_consumed,
    'found_quantity', r.found_quantity,
    'created_quantity', r.created_quantity,
    'duplicates_skipped', r.duplicates_skipped,
    'filtered_out', r.filtered_out,
    'credits_consumed', r.credits_consumed,
    'started_at', r.started_at,
    'finished_at', r.finished_at,
    'execution_time_ms', r.execution_time_ms,
    'duration_formatted', CASE
      WHEN r.execution_time_ms IS NOT NULL THEN
        CASE
          WHEN r.execution_time_ms >= 3600000 THEN
            CONCAT(FLOOR(r.execution_time_ms / 3600000)::TEXT, 'h ',
                   FLOOR((r.execution_time_ms % 3600000) / 60000)::TEXT, 'm')
          WHEN r.execution_time_ms >= 60000 THEN
            CONCAT(FLOOR(r.execution_time_ms / 60000)::TEXT, 'm ',
                   FLOOR((r.execution_time_ms % 60000) / 1000)::TEXT, 's')
          ELSE
            CONCAT(FLOOR(r.execution_time_ms / 1000)::TEXT, 's')
        END
      WHEN r.started_at IS NOT NULL AND r.finished_at IS NOT NULL THEN
        CASE
          WHEN EXTRACT(EPOCH FROM (r.finished_at - r.started_at)) >= 3600 THEN
            CONCAT(FLOOR(EXTRACT(EPOCH FROM (r.finished_at - r.started_at)) / 3600)::TEXT, 'h ',
                   FLOOR(MOD(EXTRACT(EPOCH FROM (r.finished_at - r.started_at))::INT, 3600) / 60)::TEXT, 'm')
          WHEN EXTRACT(EPOCH FROM (r.finished_at - r.started_at)) >= 60 THEN
            CONCAT(FLOOR(EXTRACT(EPOCH FROM (r.finished_at - r.started_at)) / 60)::TEXT, 'm ',
                   MOD(EXTRACT(EPOCH FROM (r.finished_at - r.started_at))::INT, 60)::TEXT, 's')
          ELSE
            CONCAT(EXTRACT(EPOCH FROM (r.finished_at - r.started_at))::INT::TEXT, 's')
        END
      ELSE NULL
    END,
    'error_message', r.error_message,
    'funnel_id', COALESCE(r.original_funnel_id, e.funnel_id, r.funnel_id),
    'funnel_name', f.name,
    'column_id', COALESCE(r.original_column_id, e.column_id, r.column_id),
    'column_name', fc.title,
    'created_at', r.created_at
  )
  INTO v_run_data
  FROM lead_extraction_runs r
  LEFT JOIN lead_extractions e ON e.id = r.extraction_id
  LEFT JOIN funnels f ON f.id = COALESCE(r.original_funnel_id, e.funnel_id, r.funnel_id)
  LEFT JOIN funnel_columns fc ON fc.id = COALESCE(r.original_column_id, e.column_id, r.column_id)
  WHERE r.id = v_run_id;

  -- ========================================
  -- TIMELINE DE LOGS
  -- ========================================
  SELECT COALESCE(json_agg(
    json_build_object(
      'timestamp', TO_CHAR(el.created_at, 'HH24:MI:SS'),
      'step', COALESCE(el.step_name, 'LOG'),
      'message', el.message,
      'level', COALESCE(el.level, 'info'),
      'details', el.details
    ) ORDER BY el.created_at ASC
  ), '[]'::json)
  INTO v_timeline
  FROM extraction_logs el
  WHERE el.run_id = v_run_id;

  -- ========================================
  -- LÓGICA ESPECÍFICA POR SOURCE
  -- ========================================
  IF v_source = 'cnpj' THEN
    -- ========================================
    -- CNPJ: Consultar cnpj_extraction_staging
    -- ========================================

    -- Contadores gerais
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'migrated'),
      COUNT(*) FILTER (WHERE status = 'failed')
    INTO v_total_leads, v_total_qualificados, v_total_rejeitados
    FROM cnpj_extraction_staging ces
    WHERE ces.run_id = v_run_id;

    -- Contadores de contato (apenas migrados)
    -- Join com tabela leads para pegar dados de WhatsApp validado
    WITH leads_criados AS (
      SELECT ces.*, l.whatsapp_valid AS lead_whatsapp_valid
      FROM cnpj_extraction_staging ces
      LEFT JOIN leads l ON l.id = ces.lead_id
      WHERE ces.run_id = v_run_id
        AND ces.status = 'migrated'
    )
    SELECT
      -- Com telefone
      COUNT(*) FILTER (WHERE lc.telefone IS NOT NULL AND lc.telefone != ''),
      -- Telefone fixo (8 dígitos sem 9 inicial - após DDD)
      COUNT(*) FILTER (WHERE
        lc.telefone IS NOT NULL AND lc.telefone != ''
        AND LENGTH(REGEXP_REPLACE(lc.telefone, '[^0-9]', '', 'g')) = 10
        AND SUBSTRING(REGEXP_REPLACE(lc.telefone, '[^0-9]', '', 'g') FROM 3 FOR 1) != '9'
      ),
      -- Com website (CNPJ não tem)
      0,
      -- Sites .br (CNPJ não tem)
      0,
      -- Sites internacionais (CNPJ não tem)
      0,
      -- Com email
      COUNT(*) FILTER (WHERE lc.email IS NOT NULL AND lc.email != ''),
      -- Com CNPJ
      COUNT(*) FILTER (WHERE lc.cnpj IS NOT NULL AND lc.cnpj != ''),
      -- WhatsApp válido (busca da tabela leads)
      COUNT(*) FILTER (WHERE lc.lead_whatsapp_valid = true),
      -- Com endereço
      COUNT(*) FILTER (WHERE lc.uf IS NOT NULL OR lc.municipio IS NOT NULL)
    INTO
      v_com_telefone, v_telefone_fixo, v_com_website, v_sites_br,
      v_sites_internacionais, v_com_email, v_com_cnpj, v_whatsapp_valido, v_com_endereco
    FROM leads_criados lc;

    -- Quantidade criada
    v_created_quantity := v_total_qualificados;

    -- Contadores de WhatsApp verificados (buscar da tabela leads)
    SELECT
      COUNT(*) FILTER (WHERE l.whatsapp_checked_at IS NOT NULL),
      COUNT(*) FILTER (WHERE l.whatsapp_checked_at IS NULL AND l.phone IS NOT NULL)
    INTO v_whatsapp_checked, v_whatsapp_pending
    FROM cnpj_extraction_staging ces
    LEFT JOIN leads l ON l.id = ces.lead_id
    WHERE ces.run_id = v_run_id
      AND ces.status = 'migrated';

    -- Enriquecimento (CNPJ já vem enriquecido da base)
    v_whois_enriched := 0;
    v_whois_pending := 0;
    v_cnpj_enriched := v_com_cnpj;
    v_cnpj_pending := 0;
    v_scraping_completed := 0;
    v_scraping_pending := 0;

    -- Score de qualidade para CNPJ
    -- Critério: telefone (30pts), email (30pts), cnpj (20pts), endereço (20pts)
    WITH leads_criados AS (
      SELECT ces.*
      FROM cnpj_extraction_staging ces
      WHERE ces.run_id = v_run_id
        AND ces.status = 'migrated'
    )
    SELECT
      COUNT(*) FILTER (WHERE
        (CASE WHEN lc.telefone IS NOT NULL AND lc.telefone != '' THEN 30 ELSE 0 END +
         CASE WHEN lc.email IS NOT NULL AND lc.email != '' THEN 30 ELSE 0 END +
         CASE WHEN lc.cnpj IS NOT NULL AND lc.cnpj != '' THEN 20 ELSE 0 END +
         CASE WHEN lc.uf IS NOT NULL THEN 20 ELSE 0 END) >= 80
      ),
      COUNT(*) FILTER (WHERE
        (CASE WHEN lc.telefone IS NOT NULL AND lc.telefone != '' THEN 30 ELSE 0 END +
         CASE WHEN lc.email IS NOT NULL AND lc.email != '' THEN 30 ELSE 0 END +
         CASE WHEN lc.cnpj IS NOT NULL AND lc.cnpj != '' THEN 20 ELSE 0 END +
         CASE WHEN lc.uf IS NOT NULL THEN 20 ELSE 0 END) BETWEEN 60 AND 79
      ),
      COUNT(*) FILTER (WHERE
        (CASE WHEN lc.telefone IS NOT NULL AND lc.telefone != '' THEN 30 ELSE 0 END +
         CASE WHEN lc.email IS NOT NULL AND lc.email != '' THEN 30 ELSE 0 END +
         CASE WHEN lc.cnpj IS NOT NULL AND lc.cnpj != '' THEN 20 ELSE 0 END +
         CASE WHEN lc.uf IS NOT NULL THEN 20 ELSE 0 END) BETWEEN 40 AND 59
      ),
      COUNT(*) FILTER (WHERE
        (CASE WHEN lc.telefone IS NOT NULL AND lc.telefone != '' THEN 30 ELSE 0 END +
         CASE WHEN lc.email IS NOT NULL AND lc.email != '' THEN 30 ELSE 0 END +
         CASE WHEN lc.cnpj IS NOT NULL AND lc.cnpj != '' THEN 20 ELSE 0 END +
         CASE WHEN lc.uf IS NOT NULL THEN 20 ELSE 0 END) < 40
      ),
      COALESCE(AVG(
        CASE WHEN lc.telefone IS NOT NULL AND lc.telefone != '' THEN 30 ELSE 0 END +
        CASE WHEN lc.email IS NOT NULL AND lc.email != '' THEN 30 ELSE 0 END +
        CASE WHEN lc.cnpj IS NOT NULL AND lc.cnpj != '' THEN 20 ELSE 0 END +
        CASE WHEN lc.uf IS NOT NULL THEN 20 ELSE 0 END
      ), 0)
    INTO v_score_excelente, v_score_alta, v_score_media, v_score_baixa, v_score_medio
    FROM leads_criados lc;

  ELSE
    -- ========================================
    -- GOOGLE MAPS / INSTAGRAM: Consultar lead_extraction_staging
    -- ========================================

    -- Contadores gerais
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE les.filter_passed = true),
      COUNT(*) FILTER (WHERE les.filter_passed = false)
    INTO v_total_leads, v_total_qualificados, v_total_rejeitados
    FROM lead_extraction_staging les
    WHERE les.extraction_run_id = v_run_id;

    -- Contadores de contato
    WITH leads_criados AS (
      SELECT les.*
      FROM lead_extraction_staging les
      WHERE les.extraction_run_id = v_run_id
        AND (les.filter_passed = true OR les.migrated_at IS NOT NULL)
    )
    SELECT
      COUNT(*) FILTER (WHERE
        lc.phone_normalized IS NOT NULL AND lc.phone_normalized != ''
        OR lc.phones IS NOT NULL AND jsonb_array_length(lc.phones) > 0
        OR lc.extracted_data->'phones' IS NOT NULL AND jsonb_array_length(lc.extracted_data->'phones') > 0
      ),
      COUNT(*) FILTER (WHERE
        (lc.phone_normalized ~ '^[0-9]{10}$' AND substring(lc.phone_normalized from 3 for 1) != '9')
        OR (lc.phones IS NOT NULL AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(lc.phones) p
          WHERE (p->>'number') ~ '^[0-9]{10}$' AND substring((p->>'number') from 3 for 1) != '9'
        ))
      ),
      COUNT(*) FILTER (WHERE
        lc.primary_website IS NOT NULL AND lc.primary_website != ''
        OR lc.domain IS NOT NULL AND lc.domain != ''
      ),
      COUNT(*) FILTER (WHERE
        (lc.domain IS NOT NULL AND lc.domain LIKE '%.br')
        OR (lc.primary_website IS NOT NULL AND lc.primary_website LIKE '%.br%')
      ),
      COUNT(*) FILTER (WHERE
        (lc.primary_website IS NOT NULL AND lc.primary_website != '' OR lc.domain IS NOT NULL AND lc.domain != '')
        AND NOT (lc.domain LIKE '%.br' OR lc.primary_website LIKE '%.br%')
      ),
      COUNT(*) FILTER (WHERE
        (lc.emails IS NOT NULL AND jsonb_array_length(lc.emails) > 0)
        OR (lc.extracted_data->'emails' IS NOT NULL AND jsonb_array_length(lc.extracted_data->'emails') > 0)
        OR (lc.whois_data->'emails' IS NOT NULL AND jsonb_array_length(lc.whois_data->'emails') > 0)
      ),
      COUNT(*) FILTER (WHERE
        lc.cnpj_normalized IS NOT NULL AND lc.cnpj_normalized != ''
      ),
      COUNT(*) FILTER (WHERE lc.whatsapp_valid = true),
      COUNT(*) FILTER (WHERE
        lc.extracted_data->>'address' IS NOT NULL AND lc.extracted_data->>'address' != ''
        OR lc.extracted_data->>'city' IS NOT NULL
        OR lc.extracted_data->>'state' IS NOT NULL
      )
    INTO
      v_com_telefone, v_telefone_fixo, v_com_website, v_sites_br,
      v_sites_internacionais, v_com_email, v_com_cnpj, v_whatsapp_valido, v_com_endereco
    FROM leads_criados lc;

    -- Quantidade criada
    SELECT COUNT(*) INTO v_created_quantity
    FROM lead_extraction_staging les
    WHERE les.extraction_run_id = v_run_id
      AND (les.filter_passed = true OR les.migrated_at IS NOT NULL);

    -- Enriquecimento
    SELECT
      COUNT(*) FILTER (WHERE les.whois_enriched = true),
      COUNT(*) FILTER (WHERE les.whois_enriched = false OR les.whois_enriched IS NULL),
      COUNT(*) FILTER (WHERE les.cnpj_enriched = true),
      COUNT(*) FILTER (WHERE les.cnpj_enriched = false OR les.cnpj_enriched IS NULL),
      COUNT(*) FILTER (WHERE les.scraping_enriched = true OR les.scraping_status = 'completed'),
      COUNT(*) FILTER (WHERE les.scraping_enriched = false OR les.scraping_enriched IS NULL),
      COUNT(*) FILTER (WHERE les.whatsapp_checked_at IS NOT NULL),
      COUNT(*) FILTER (WHERE les.whatsapp_checked_at IS NULL)
    INTO
      v_whois_enriched, v_whois_pending,
      v_cnpj_enriched, v_cnpj_pending,
      v_scraping_completed, v_scraping_pending,
      v_whatsapp_checked, v_whatsapp_pending
    FROM lead_extraction_staging les
    WHERE les.extraction_run_id = v_run_id;

    -- Score de qualidade
    WITH leads_criados AS (
      SELECT les.*
      FROM lead_extraction_staging les
      WHERE les.extraction_run_id = v_run_id
        AND (les.filter_passed = true OR les.migrated_at IS NOT NULL)
    )
    SELECT
      COUNT(*) FILTER (WHERE
        (CASE WHEN (lc.phone_normalized IS NOT NULL AND lc.phone_normalized != '') THEN 25 ELSE 0 END +
         CASE WHEN (lc.primary_website IS NOT NULL AND lc.primary_website != '' OR lc.domain IS NOT NULL AND lc.domain != '') THEN 25 ELSE 0 END +
         CASE WHEN (lc.emails IS NOT NULL AND jsonb_array_length(lc.emails) > 0) THEN 20 ELSE 0 END +
         CASE WHEN lc.whatsapp_valid = true THEN 30 ELSE 0 END) >= 80
      ),
      COUNT(*) FILTER (WHERE
        (CASE WHEN (lc.phone_normalized IS NOT NULL AND lc.phone_normalized != '') THEN 25 ELSE 0 END +
         CASE WHEN (lc.primary_website IS NOT NULL AND lc.primary_website != '' OR lc.domain IS NOT NULL AND lc.domain != '') THEN 25 ELSE 0 END +
         CASE WHEN (lc.emails IS NOT NULL AND jsonb_array_length(lc.emails) > 0) THEN 20 ELSE 0 END +
         CASE WHEN lc.whatsapp_valid = true THEN 30 ELSE 0 END) BETWEEN 60 AND 79
      ),
      COUNT(*) FILTER (WHERE
        (CASE WHEN (lc.phone_normalized IS NOT NULL AND lc.phone_normalized != '') THEN 25 ELSE 0 END +
         CASE WHEN (lc.primary_website IS NOT NULL AND lc.primary_website != '' OR lc.domain IS NOT NULL AND lc.domain != '') THEN 25 ELSE 0 END +
         CASE WHEN (lc.emails IS NOT NULL AND jsonb_array_length(lc.emails) > 0) THEN 20 ELSE 0 END +
         CASE WHEN lc.whatsapp_valid = true THEN 30 ELSE 0 END) BETWEEN 40 AND 59
      ),
      COUNT(*) FILTER (WHERE
        (CASE WHEN (lc.phone_normalized IS NOT NULL AND lc.phone_normalized != '') THEN 25 ELSE 0 END +
         CASE WHEN (lc.primary_website IS NOT NULL AND lc.primary_website != '' OR lc.domain IS NOT NULL AND lc.domain != '') THEN 25 ELSE 0 END +
         CASE WHEN (lc.emails IS NOT NULL AND jsonb_array_length(lc.emails) > 0) THEN 20 ELSE 0 END +
         CASE WHEN lc.whatsapp_valid = true THEN 30 ELSE 0 END) < 40
      ),
      COALESCE(AVG(
        CASE WHEN (lc.phone_normalized IS NOT NULL AND lc.phone_normalized != '') THEN 25 ELSE 0 END +
        CASE WHEN (lc.primary_website IS NOT NULL AND lc.primary_website != '' OR lc.domain IS NOT NULL AND lc.domain != '') THEN 25 ELSE 0 END +
        CASE WHEN (lc.emails IS NOT NULL AND jsonb_array_length(lc.emails) > 0) THEN 20 ELSE 0 END +
        CASE WHEN lc.whatsapp_valid = true THEN 30 ELSE 0 END
      ), 0)
    INTO v_score_excelente, v_score_alta, v_score_media, v_score_baixa, v_score_medio
    FROM leads_criados lc;

  END IF;

  -- ========================================
  -- CLASSIFICAÇÃO E ESTRELAS (comum)
  -- ========================================
  IF v_score_medio >= 80 THEN
    v_classificacao := 'Excelente';
    v_estrelas := 5;
  ELSIF v_score_medio >= 60 THEN
    v_classificacao := 'Alta';
    v_estrelas := 4;
  ELSIF v_score_medio >= 40 THEN
    v_classificacao := 'Média';
    v_estrelas := 3;
  ELSIF v_score_medio >= 20 THEN
    v_classificacao := 'Baixa';
    v_estrelas := 2;
  ELSIF v_score_medio > 0 THEN
    v_classificacao := 'Muito Baixa';
    v_estrelas := 1;
  ELSE
    v_classificacao := '-';
    v_estrelas := 0;
  END IF;

  -- ========================================
  -- MONTAR OBJETOS DE RETORNO
  -- ========================================
  v_contatos := json_build_object(
    'total', v_created_quantity,
    'telefone', json_build_object(
      'com', v_com_telefone,
      'percentual', CASE WHEN v_created_quantity > 0 THEN ROUND((v_com_telefone::NUMERIC / v_created_quantity) * 100, 1) ELSE 0 END
    ),
    'tipo_telefone', json_build_object(
      'fixo', v_telefone_fixo
    ),
    'website', json_build_object(
      'com', v_com_website,
      'percentual', CASE WHEN v_created_quantity > 0 THEN ROUND((v_com_website::NUMERIC / v_created_quantity) * 100, 1) ELSE 0 END,
      'brasileiro', v_sites_br,
      'internacional', v_sites_internacionais
    ),
    'email', json_build_object(
      'com', v_com_email,
      'percentual', CASE WHEN v_created_quantity > 0 THEN ROUND((v_com_email::NUMERIC / v_created_quantity) * 100, 1) ELSE 0 END
    ),
    'cnpj', json_build_object(
      'com', v_com_cnpj,
      'percentual', CASE WHEN v_created_quantity > 0 THEN ROUND((v_com_cnpj::NUMERIC / v_created_quantity) * 100, 1) ELSE 0 END
    ),
    'whatsapp', json_build_object(
      'valido', v_whatsapp_valido,
      'verificado', v_whatsapp_checked
    ),
    'localizacao', json_build_object(
      'com_endereco', v_com_endereco
    )
  );

  v_enriquecimento := json_build_object(
    'whois', json_build_object(
      'enriched', v_whois_enriched,
      'pending', v_whois_pending
    ),
    'cnpj', json_build_object(
      'enriched', v_cnpj_enriched,
      'pending', v_cnpj_pending
    ),
    'scraping', json_build_object(
      'completed', v_scraping_completed,
      'pending', v_scraping_pending
    ),
    'whatsapp', json_build_object(
      'checked', v_whatsapp_checked,
      'pending', v_whatsapp_pending
    ),
    'total', v_total_leads
  );

  v_qualidade := json_build_object(
    'total_leads', v_total_leads,
    'qualificados', v_total_qualificados,
    'rejeitados', v_total_rejeitados,
    'leads_criados', v_created_quantity,
    'taxa_qualificacao', CASE WHEN v_total_leads > 0
      THEN ROUND((v_total_qualificados::NUMERIC / v_total_leads) * 100, 1)
      ELSE 0
    END,
    'classificacao', v_classificacao,
    'score_medio', ROUND(v_score_medio, 1),
    'estrelas', v_estrelas,
    'distribuicao', json_build_object(
      'excelente', v_score_excelente,
      'alta', v_score_alta,
      'media', v_score_media,
      'baixa', v_score_baixa
    )
  );

  v_graficos := json_build_object(
    'pizza_contatos', json_build_array(
      json_build_object('name', 'Com Telefone', 'value', v_com_telefone),
      json_build_object('name', 'Com Website', 'value', v_com_website),
      json_build_object('name', 'Com Email', 'value', v_com_email),
      json_build_object('name', 'Com CNPJ', 'value', v_com_cnpj)
    ),
    'pizza_whatsapp', json_build_array(
      json_build_object('name', 'Válido', 'value', v_whatsapp_valido),
      json_build_object('name', 'Inválido', 'value', GREATEST(v_whatsapp_checked - v_whatsapp_valido, 0)),
      json_build_object('name', 'Não Verificado', 'value', v_whatsapp_pending)
    ),
    'pizza_website', json_build_array(
      json_build_object('name', 'Sites .br', 'value', v_sites_br),
      json_build_object('name', 'Internacionais', 'value', v_sites_internacionais),
      json_build_object('name', 'Sem Website', 'value', GREATEST(v_created_quantity - v_com_website, 0))
    ),
    'pizza_qualidade', json_build_array(
      json_build_object('name', 'Excelente', 'value', v_score_excelente),
      json_build_object('name', 'Alta', 'value', v_score_alta),
      json_build_object('name', 'Média', 'value', v_score_media),
      json_build_object('name', 'Baixa', 'value', v_score_baixa)
    )
  );

  -- ========================================
  -- RESULTADO FINAL
  -- ========================================
  v_result := json_build_object(
    'run', v_run_data,
    'contatos', v_contatos,
    'enriquecimento', v_enriquecimento,
    'qualidade', v_qualidade,
    'graficos', v_graficos,
    'timeline', v_timeline,
    'totais', json_build_object(
      'total', v_total_leads,
      'qualificados', v_total_qualificados,
      'rejeitados', v_total_rejeitados,
      'criados', v_created_quantity
    )
  );

  RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_extraction_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_extraction_analytics(UUID) TO service_role;

-- Comentário
COMMENT ON FUNCTION get_extraction_analytics IS 'Analytics para extrações. Suporta Google Maps, Instagram (lead_extraction_staging) e CNPJ (cnpj_extraction_staging).';

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
