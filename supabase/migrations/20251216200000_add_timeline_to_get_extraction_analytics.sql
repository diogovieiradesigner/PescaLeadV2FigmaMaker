-- =============================================================================
-- CORREÇÃO: get_extraction_analytics - Adicionar timeline de logs
-- =============================================================================
-- A seção "Atividade" mostrava "0 eventos" porque a função não retornava
-- o campo `timeline` com os logs da extração da tabela `extraction_logs`.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_extraction_analytics(run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run_id UUID := run_id;
  v_result JSON;
  v_run_data JSON;
  v_contatos JSON;
  v_enriquecimento JSON;
  v_qualidade JSON;
  v_filtros JSON;
  v_timeline JSON;
  v_graficos JSON;

  -- Contadores gerais (todos os leads)
  v_total_leads INT;
  v_total_qualificados INT;
  v_total_rejeitados INT;
  v_created_quantity INT;

  -- Contadores de contato (APENAS leads criados - limitado por created_quantity)
  v_com_telefone INT;
  v_telefone_fixo INT;
  v_com_website INT;
  v_sites_br INT;
  v_sites_internacionais INT;
  v_com_email INT;
  v_com_cnpj INT;
  v_whatsapp_valido INT;

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
  v_score_excelente INT := 0;  -- Score >= 80
  v_score_alta INT := 0;       -- Score >= 60 e < 80
  v_score_media INT := 0;      -- Score >= 40 e < 60
  v_score_baixa INT := 0;      -- Score < 40
  v_score_total NUMERIC := 0;
  v_score_medio NUMERIC := 0;
  v_classificacao TEXT := '-';
  v_estrelas INT := 0;

BEGIN
  -- Verificar se run existe
  IF NOT EXISTS (SELECT 1 FROM lead_extraction_runs WHERE id = v_run_id) THEN
    RETURN json_build_object('error', 'Run não encontrada');
  END IF;

  -- Buscar created_quantity da run
  SELECT COALESCE(created_quantity, 0) INTO v_created_quantity
  FROM lead_extraction_runs WHERE id = v_run_id;

  -- ========================================
  -- DADOS DA RUN
  -- ========================================
  SELECT json_build_object(
    'id', r.id,
    'extraction_id', r.extraction_id,
    'workspace_id', r.workspace_id,
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
    'funnel_id', COALESCE(r.original_funnel_id, e.funnel_id),
    'funnel_name', f.name,
    'column_id', COALESCE(r.original_column_id, e.column_id),
    'column_name', fc.title,
    'created_at', r.created_at
  )
  INTO v_run_data
  FROM lead_extraction_runs r
  LEFT JOIN lead_extractions e ON e.id = r.extraction_id
  LEFT JOIN funnels f ON f.id = COALESCE(r.original_funnel_id, e.funnel_id)
  LEFT JOIN funnel_columns fc ON fc.id = COALESCE(r.original_column_id, e.column_id)
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
  -- CONTADORES GERAIS (todos os leads)
  -- ========================================
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE filter_passed = true),
    COUNT(*) FILTER (WHERE filter_passed = false)
  INTO v_total_leads, v_total_qualificados, v_total_rejeitados
  FROM lead_extraction_staging
  WHERE extraction_run_id = v_run_id;

  -- ========================================
  -- CONTADORES DE CONTATO (APENAS LEADS CRIADOS - usando migrated_at)
  -- ========================================
  WITH leads_criados AS (
    SELECT *
    FROM lead_extraction_staging
    WHERE extraction_run_id = v_run_id
      AND migrated_at IS NOT NULL
  )
  SELECT
    -- Com telefone (qualquer um)
    COUNT(*) FILTER (WHERE
      phone_normalized IS NOT NULL AND phone_normalized != ''
      OR phones IS NOT NULL AND jsonb_array_length(phones) > 0
      OR extracted_data->'phones' IS NOT NULL AND jsonb_array_length(extracted_data->'phones') > 0
    ),
    -- Telefone fixo (8 dígitos sem 9 inicial)
    COUNT(*) FILTER (WHERE
      (phone_normalized ~ '^[0-9]{10}$' AND substring(phone_normalized from 3 for 1) != '9')
      OR (phones IS NOT NULL AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(phones) p
        WHERE (p->>'number') ~ '^[0-9]{10}$' AND substring((p->>'number') from 3 for 1) != '9'
      ))
    ),
    -- Com website
    COUNT(*) FILTER (WHERE
      primary_website IS NOT NULL AND primary_website != ''
      OR domain IS NOT NULL AND domain != ''
    ),
    -- Sites .br
    COUNT(*) FILTER (WHERE
      (domain IS NOT NULL AND domain LIKE '%.br')
      OR (primary_website IS NOT NULL AND primary_website LIKE '%.br%')
    ),
    -- Sites internacionais (com website mas sem .br)
    COUNT(*) FILTER (WHERE
      (primary_website IS NOT NULL AND primary_website != '' OR domain IS NOT NULL AND domain != '')
      AND NOT (domain LIKE '%.br' OR primary_website LIKE '%.br%')
    ),
    -- Com email
    COUNT(*) FILTER (WHERE
      (emails IS NOT NULL AND jsonb_array_length(emails) > 0)
      OR (extracted_data->'emails' IS NOT NULL AND jsonb_array_length(extracted_data->'emails') > 0)
      OR (whois_data->'emails' IS NOT NULL AND jsonb_array_length(whois_data->'emails') > 0)
    ),
    -- Com CNPJ
    COUNT(*) FILTER (WHERE
      cnpj_normalized IS NOT NULL AND cnpj_normalized != ''
    ),
    -- WhatsApp válido
    COUNT(*) FILTER (WHERE whatsapp_valid = true)
  INTO
    v_com_telefone, v_telefone_fixo, v_com_website, v_sites_br,
    v_sites_internacionais, v_com_email, v_com_cnpj, v_whatsapp_valido
  FROM leads_criados;

  -- Atualizar created_quantity baseado nos leads realmente migrados
  SELECT COUNT(*) INTO v_created_quantity
  FROM lead_extraction_staging
  WHERE extraction_run_id = v_run_id AND migrated_at IS NOT NULL;

  -- ========================================
  -- CONTADORES DE ENRIQUECIMENTO (todos os leads)
  -- ========================================
  SELECT
    COUNT(*) FILTER (WHERE whois_enriched = true),
    COUNT(*) FILTER (WHERE whois_enriched = false OR whois_enriched IS NULL),
    COUNT(*) FILTER (WHERE cnpj_enriched = true),
    COUNT(*) FILTER (WHERE cnpj_enriched = false OR cnpj_enriched IS NULL),
    COUNT(*) FILTER (WHERE scraping_enriched = true OR scraping_status = 'completed'),
    COUNT(*) FILTER (WHERE scraping_enriched = false OR scraping_enriched IS NULL),
    COUNT(*) FILTER (WHERE whatsapp_checked_at IS NOT NULL),
    COUNT(*) FILTER (WHERE whatsapp_checked_at IS NULL)
  INTO
    v_whois_enriched, v_whois_pending,
    v_cnpj_enriched, v_cnpj_pending,
    v_scraping_completed, v_scraping_pending,
    v_whatsapp_checked, v_whatsapp_pending
  FROM lead_extraction_staging
  WHERE extraction_run_id = v_run_id;

  -- ========================================
  -- CALCULAR SCORE DE QUALIDADE (APENAS LEADS CRIADOS)
  -- ========================================
  -- Score baseado em: telefone (25), website (25), email (20), whatsapp válido (30)
  -- Total máximo: 100 pontos
  WITH leads_criados AS (
    SELECT *
    FROM lead_extraction_staging
    WHERE extraction_run_id = v_run_id
      AND migrated_at IS NOT NULL
  )
  SELECT
    COUNT(*) FILTER (WHERE
      -- Calcular score individual de cada lead
      (
        CASE WHEN (phone_normalized IS NOT NULL AND phone_normalized != '') THEN 25 ELSE 0 END +
        CASE WHEN (primary_website IS NOT NULL AND primary_website != '' OR domain IS NOT NULL AND domain != '') THEN 25 ELSE 0 END +
        CASE WHEN (emails IS NOT NULL AND jsonb_array_length(emails) > 0) THEN 20 ELSE 0 END +
        CASE WHEN whatsapp_valid = true THEN 30 ELSE 0 END
      ) >= 80
    ),
    COUNT(*) FILTER (WHERE
      (
        CASE WHEN (phone_normalized IS NOT NULL AND phone_normalized != '') THEN 25 ELSE 0 END +
        CASE WHEN (primary_website IS NOT NULL AND primary_website != '' OR domain IS NOT NULL AND domain != '') THEN 25 ELSE 0 END +
        CASE WHEN (emails IS NOT NULL AND jsonb_array_length(emails) > 0) THEN 20 ELSE 0 END +
        CASE WHEN whatsapp_valid = true THEN 30 ELSE 0 END
      ) >= 60 AND (
        CASE WHEN (phone_normalized IS NOT NULL AND phone_normalized != '') THEN 25 ELSE 0 END +
        CASE WHEN (primary_website IS NOT NULL AND primary_website != '' OR domain IS NOT NULL AND domain != '') THEN 25 ELSE 0 END +
        CASE WHEN (emails IS NOT NULL AND jsonb_array_length(emails) > 0) THEN 20 ELSE 0 END +
        CASE WHEN whatsapp_valid = true THEN 30 ELSE 0 END
      ) < 80
    ),
    COUNT(*) FILTER (WHERE
      (
        CASE WHEN (phone_normalized IS NOT NULL AND phone_normalized != '') THEN 25 ELSE 0 END +
        CASE WHEN (primary_website IS NOT NULL AND primary_website != '' OR domain IS NOT NULL AND domain != '') THEN 25 ELSE 0 END +
        CASE WHEN (emails IS NOT NULL AND jsonb_array_length(emails) > 0) THEN 20 ELSE 0 END +
        CASE WHEN whatsapp_valid = true THEN 30 ELSE 0 END
      ) >= 40 AND (
        CASE WHEN (phone_normalized IS NOT NULL AND phone_normalized != '') THEN 25 ELSE 0 END +
        CASE WHEN (primary_website IS NOT NULL AND primary_website != '' OR domain IS NOT NULL AND domain != '') THEN 25 ELSE 0 END +
        CASE WHEN (emails IS NOT NULL AND jsonb_array_length(emails) > 0) THEN 20 ELSE 0 END +
        CASE WHEN whatsapp_valid = true THEN 30 ELSE 0 END
      ) < 60
    ),
    COUNT(*) FILTER (WHERE
      (
        CASE WHEN (phone_normalized IS NOT NULL AND phone_normalized != '') THEN 25 ELSE 0 END +
        CASE WHEN (primary_website IS NOT NULL AND primary_website != '' OR domain IS NOT NULL AND domain != '') THEN 25 ELSE 0 END +
        CASE WHEN (emails IS NOT NULL AND jsonb_array_length(emails) > 0) THEN 20 ELSE 0 END +
        CASE WHEN whatsapp_valid = true THEN 30 ELSE 0 END
      ) < 40
    ),
    COALESCE(AVG(
      CASE WHEN (phone_normalized IS NOT NULL AND phone_normalized != '') THEN 25 ELSE 0 END +
      CASE WHEN (primary_website IS NOT NULL AND primary_website != '' OR domain IS NOT NULL AND domain != '') THEN 25 ELSE 0 END +
      CASE WHEN (emails IS NOT NULL AND jsonb_array_length(emails) > 0) THEN 20 ELSE 0 END +
      CASE WHEN whatsapp_valid = true THEN 30 ELSE 0 END
    ), 0)
  INTO v_score_excelente, v_score_alta, v_score_media, v_score_baixa, v_score_medio
  FROM leads_criados;

  -- Determinar classificação e estrelas baseado no score médio
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
  -- MONTAR OBJETO CONTATOS
  -- ========================================
  -- Usa v_created_quantity como total (não v_total_qualificados)
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
      'com_endereco', 0  -- Placeholder, can be updated later
    )
  );

  -- ========================================
  -- MONTAR OBJETO ENRIQUECIMENTO
  -- ========================================
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

  -- ========================================
  -- MONTAR OBJETO QUALIDADE
  -- ========================================
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

  -- ========================================
  -- MONTAR GRÁFICOS
  -- ========================================
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
