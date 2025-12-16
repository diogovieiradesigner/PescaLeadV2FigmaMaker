-- =============================================================================
-- FUNÇÃO: get_enrichment_status - Status de enriquecimento dos leads
-- =============================================================================
-- Retorna estatísticas de enriquecimento para TODOS os leads no staging
-- de uma extração, incluindo:
-- - WhatsApp: total com telefone, verificados, válidos, inválidos, pendentes
-- - WHOIS: total .br, enriquecidos, pendentes, internacionais
-- - CNPJ: total com CNPJ, enriquecidos, pendentes, sem CNPJ
-- - Scraping: total com site, concluídos, processando, pendentes, falhas
-- - Status geral: pendentes, enriquecendo, completos
-- =============================================================================

CREATE OR REPLACE FUNCTION get_enrichment_status(run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INT;

  -- WhatsApp
  v_whatsapp_total_com_telefone INT;
  v_whatsapp_verificados INT;
  v_whatsapp_validos INT;
  v_whatsapp_invalidos INT;
  v_whatsapp_pending INT;
  v_whatsapp_sem_telefone INT;

  -- WHOIS
  v_whois_total_br INT;
  v_whois_enriched INT;
  v_whois_pending INT;
  v_whois_internacional INT;
  v_whois_sem_dominio INT;

  -- CNPJ
  v_cnpj_total_com_cnpj INT;
  v_cnpj_enriched INT;
  v_cnpj_pending INT;
  v_cnpj_sem_cnpj INT;

  -- Scraping
  v_scraping_total_com_site INT;
  v_scraping_pending INT;
  v_scraping_processing INT;
  v_scraping_completed INT;
  v_scraping_failed INT;
  v_scraping_sem_site INT;

  -- Status geral
  v_status_pending INT;
  v_status_enriching INT;
  v_status_completed INT;

BEGIN
  -- Total de leads no staging
  SELECT COUNT(*) INTO v_total
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  IF v_total = 0 THEN
    RETURN json_build_object(
      'total', 0,
      'whatsapp', json_build_object('total_com_telefone', 0, 'verificados', 0, 'validos', 0, 'invalidos', 0, 'pending', 0, 'sem_telefone', 0),
      'whois', json_build_object('total_br', 0, 'enriched', 0, 'pending', 0, 'internacional', 0, 'sem_dominio', 0),
      'cnpj', json_build_object('total_com_cnpj', 0, 'enriched', 0, 'pending', 0, 'sem_cnpj', 0),
      'scraping', json_build_object('total_com_site', 0, 'pending', 0, 'processing', 0, 'completed', 0, 'failed', 0, 'sem_site', 0),
      'status_enrichment', json_build_object('pending', 0, 'enriching', 0, 'completed', 0)
    );
  END IF;

  -- ========================================
  -- WhatsApp Stats
  -- ========================================
  SELECT
    -- Total com telefone
    COUNT(*) FILTER (WHERE
      phone_normalized IS NOT NULL AND phone_normalized != ''
    ),
    -- Verificados (tem resultado de verificação)
    COUNT(*) FILTER (WHERE
      whatsapp_checked_at IS NOT NULL
    ),
    -- Válidos
    COUNT(*) FILTER (WHERE
      whatsapp_valid = true
    ),
    -- Inválidos
    COUNT(*) FILTER (WHERE
      whatsapp_valid = false
    ),
    -- Pendentes (tem telefone mas não foi verificado)
    COUNT(*) FILTER (WHERE
      phone_normalized IS NOT NULL AND phone_normalized != ''
      AND whatsapp_checked_at IS NULL
    ),
    -- Sem telefone
    COUNT(*) FILTER (WHERE
      phone_normalized IS NULL OR phone_normalized = ''
    )
  INTO
    v_whatsapp_total_com_telefone,
    v_whatsapp_verificados,
    v_whatsapp_validos,
    v_whatsapp_invalidos,
    v_whatsapp_pending,
    v_whatsapp_sem_telefone
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- WHOIS Stats
  -- ========================================
  SELECT
    -- Total .br (tem domínio .br)
    COUNT(*) FILTER (WHERE
      domain IS NOT NULL AND domain LIKE '%.br'
    ),
    -- Enriquecidos
    COUNT(*) FILTER (WHERE
      domain IS NOT NULL AND domain LIKE '%.br'
      AND whois_enriched = true
    ),
    -- Pendentes (tem .br mas não enriquecido)
    COUNT(*) FILTER (WHERE
      domain IS NOT NULL AND domain LIKE '%.br'
      AND (whois_enriched = false OR whois_enriched IS NULL)
    ),
    -- Internacionais (tem domínio mas não é .br)
    COUNT(*) FILTER (WHERE
      domain IS NOT NULL AND domain != ''
      AND domain NOT LIKE '%.br'
    ),
    -- Sem domínio
    COUNT(*) FILTER (WHERE
      domain IS NULL OR domain = ''
    )
  INTO
    v_whois_total_br,
    v_whois_enriched,
    v_whois_pending,
    v_whois_internacional,
    v_whois_sem_dominio
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- CNPJ Stats
  -- ========================================
  SELECT
    -- Total com CNPJ
    COUNT(*) FILTER (WHERE
      cnpj_normalized IS NOT NULL AND cnpj_normalized != ''
    ),
    -- Enriquecidos
    COUNT(*) FILTER (WHERE
      cnpj_normalized IS NOT NULL AND cnpj_normalized != ''
      AND cnpj_enriched = true
    ),
    -- Pendentes (tem CNPJ mas não enriquecido)
    COUNT(*) FILTER (WHERE
      cnpj_normalized IS NOT NULL AND cnpj_normalized != ''
      AND (cnpj_enriched = false OR cnpj_enriched IS NULL)
    ),
    -- Sem CNPJ
    COUNT(*) FILTER (WHERE
      cnpj_normalized IS NULL OR cnpj_normalized = ''
    )
  INTO
    v_cnpj_total_com_cnpj,
    v_cnpj_enriched,
    v_cnpj_pending,
    v_cnpj_sem_cnpj
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- Scraping Stats
  -- ========================================
  SELECT
    -- Total com site
    COUNT(*) FILTER (WHERE
      primary_website IS NOT NULL AND primary_website != ''
    ),
    -- Pendentes
    COUNT(*) FILTER (WHERE
      primary_website IS NOT NULL AND primary_website != ''
      AND (scraping_status IS NULL OR scraping_status = 'pending')
    ),
    -- Processando
    COUNT(*) FILTER (WHERE
      scraping_status = 'processing'
    ),
    -- Concluídos
    COUNT(*) FILTER (WHERE
      scraping_status = 'completed' OR scraping_enriched = true
    ),
    -- Falhas
    COUNT(*) FILTER (WHERE
      scraping_status = 'failed'
    ),
    -- Sem site
    COUNT(*) FILTER (WHERE
      primary_website IS NULL OR primary_website = ''
    )
  INTO
    v_scraping_total_com_site,
    v_scraping_pending,
    v_scraping_processing,
    v_scraping_completed,
    v_scraping_failed,
    v_scraping_sem_site
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- Status Geral de Enriquecimento
  -- ========================================
  SELECT
    -- Pendentes (nenhum enriquecimento feito)
    COUNT(*) FILTER (WHERE
      status_enrichment = 'pending' OR status_enrichment IS NULL
    ),
    -- Enriquecendo
    COUNT(*) FILTER (WHERE
      status_enrichment = 'enriching'
    ),
    -- Completos
    COUNT(*) FILTER (WHERE
      status_enrichment = 'completed'
    )
  INTO
    v_status_pending,
    v_status_enriching,
    v_status_completed
  FROM lead_extraction_staging
  WHERE extraction_run_id = run_id;

  -- ========================================
  -- Retornar resultado
  -- ========================================
  RETURN json_build_object(
    'total', v_total,
    'whatsapp', json_build_object(
      'total_com_telefone', v_whatsapp_total_com_telefone,
      'verificados', v_whatsapp_verificados,
      'validos', v_whatsapp_validos,
      'invalidos', v_whatsapp_invalidos,
      'pending', v_whatsapp_pending,
      'sem_telefone', v_whatsapp_sem_telefone
    ),
    'whois', json_build_object(
      'total_br', v_whois_total_br,
      'enriched', v_whois_enriched,
      'pending', v_whois_pending,
      'internacional', v_whois_internacional,
      'sem_dominio', v_whois_sem_dominio
    ),
    'cnpj', json_build_object(
      'total_com_cnpj', v_cnpj_total_com_cnpj,
      'enriched', v_cnpj_enriched,
      'pending', v_cnpj_pending,
      'sem_cnpj', v_cnpj_sem_cnpj
    ),
    'scraping', json_build_object(
      'total_com_site', v_scraping_total_com_site,
      'pending', v_scraping_pending,
      'processing', v_scraping_processing,
      'completed', v_scraping_completed,
      'failed', v_scraping_failed,
      'sem_site', v_scraping_sem_site
    ),
    'status_enrichment', json_build_object(
      'pending', v_status_pending,
      'enriching', v_status_enriching,
      'completed', v_status_completed
    )
  );
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_enrichment_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_enrichment_status(UUID) TO service_role;
