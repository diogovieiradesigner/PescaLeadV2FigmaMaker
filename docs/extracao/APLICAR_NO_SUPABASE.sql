-- =============================================================================
-- EXECUTAR ESTE SQL NO SQL EDITOR DO SUPABASE
-- =============================================================================
-- Sistema de Expansão por Bairros com IA V17
-- Substitui Overpass API por chamadas a IA (Perplexity via OpenRouter)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA: ai_neighborhood_config
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_neighborhood_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT true,
  model TEXT DEFAULT 'perplexity/sonar-pro',
  fallback_models TEXT[] DEFAULT ARRAY['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'],
  max_tokens INTEGER DEFAULT 2000,
  temperature NUMERIC DEFAULT 0.3,
  timeout_seconds INTEGER DEFAULT 60,
  max_retries INTEGER DEFAULT 3,
  max_ai_rounds INTEGER DEFAULT 3,
  max_total_pages INTEGER DEFAULT 500,
  system_prompt TEXT NOT NULL,
  user_prompt_city TEXT NOT NULL,
  user_prompt_state TEXT NOT NULL,
  user_prompt_additional TEXT NOT NULL,
  cache_ttl_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ai_neighborhood_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_neighborhood_config_updated ON ai_neighborhood_config;
CREATE TRIGGER trigger_ai_neighborhood_config_updated
  BEFORE UPDATE ON ai_neighborhood_config
  FOR EACH ROW EXECUTE FUNCTION update_ai_neighborhood_config_timestamp();

-- -----------------------------------------------------------------------------
-- 2. TABELA: neighborhood_cache
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS neighborhood_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT,
  state TEXT NOT NULL,
  country TEXT DEFAULT 'Brazil',
  search_term TEXT,
  location_level TEXT CHECK (location_level IN ('city', 'state', 'region')),
  locations TEXT[] NOT NULL,
  has_more_neighborhoods BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'ai',
  ai_model TEXT,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(city, state, search_term)
);

-- Índice para lookups rápidos (verificação de expires_at feita na query)
CREATE INDEX IF NOT EXISTS idx_neighborhood_cache_lookup 
ON neighborhood_cache(city, state, search_term) 
WHERE is_valid = true;

-- -----------------------------------------------------------------------------
-- 3. TABELA: neighborhood_search_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS neighborhood_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  location_formatted TEXT NOT NULL,
  last_page_searched INTEGER DEFAULT 0,
  total_leads_found INTEGER DEFAULT 0,
  api_exhausted BOOLEAN DEFAULT false,
  is_suspect BOOLEAN DEFAULT false,
  pages_with_zero_results INTEGER DEFAULT 0,
  ai_round INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, search_term, location_formatted)
);

CREATE INDEX IF NOT EXISTS idx_nsh_lookup 
ON neighborhood_search_history(workspace_id, search_term);

CREATE INDEX IF NOT EXISTS idx_nsh_active 
ON neighborhood_search_history(workspace_id, search_term)
WHERE api_exhausted = false AND is_suspect = false;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_nsh_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_nsh_updated ON neighborhood_search_history;
CREATE TRIGGER trigger_nsh_updated
  BEFORE UPDATE ON neighborhood_search_history
  FOR EACH ROW EXECUTE FUNCTION update_nsh_timestamp();

-- -----------------------------------------------------------------------------
-- 4. FUNÇÕES SQL
-- -----------------------------------------------------------------------------

-- Buscar histórico de localizações já pesquisadas
CREATE OR REPLACE FUNCTION get_location_search_history(
  p_workspace_id UUID,
  p_search_term TEXT
)
RETURNS TABLE(
  location_formatted TEXT,
  last_page INTEGER,
  leads_found INTEGER,
  exhausted BOOLEAN,
  suspect BOOLEAN,
  ai_round INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nsh.location_formatted,
    nsh.last_page_searched,
    nsh.total_leads_found,
    nsh.api_exhausted,
    nsh.is_suspect,
    nsh.ai_round
  FROM neighborhood_search_history nsh
  WHERE nsh.workspace_id = p_workspace_id
    AND LOWER(TRIM(nsh.search_term)) = LOWER(TRIM(p_search_term))
  ORDER BY nsh.created_at;
END;
$$ LANGUAGE plpgsql;

-- Atualizar progresso de busca por localização (atômico)
CREATE OR REPLACE FUNCTION upsert_location_search_progress(
  p_workspace_id UUID,
  p_search_term TEXT,
  p_location_formatted TEXT,
  p_page INTEGER,
  p_leads_found INTEGER,
  p_api_exhausted BOOLEAN DEFAULT false,
  p_pages_with_zero INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO neighborhood_search_history (
    workspace_id,
    search_term,
    location_formatted,
    last_page_searched,
    total_leads_found,
    api_exhausted,
    pages_with_zero_results
  ) VALUES (
    p_workspace_id,
    p_search_term,
    p_location_formatted,
    p_page,
    p_leads_found,
    p_api_exhausted,
    p_pages_with_zero
  )
  ON CONFLICT (workspace_id, search_term, location_formatted)
  DO UPDATE SET
    last_page_searched = GREATEST(neighborhood_search_history.last_page_searched, EXCLUDED.last_page_searched),
    total_leads_found = neighborhood_search_history.total_leads_found + EXCLUDED.total_leads_found,
    api_exhausted = EXCLUDED.api_exhausted OR neighborhood_search_history.api_exhausted,
    pages_with_zero_results = CASE
      WHEN EXCLUDED.pages_with_zero_results > 0 THEN neighborhood_search_history.pages_with_zero_results + EXCLUDED.pages_with_zero_results
      ELSE 0
    END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Marcar localização como suspeita
CREATE OR REPLACE FUNCTION mark_location_as_suspect(
  p_workspace_id UUID,
  p_search_term TEXT,
  p_location_formatted TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE neighborhood_search_history
  SET 
    is_suspect = true,
    updated_at = now()
  WHERE workspace_id = p_workspace_id
    AND LOWER(TRIM(search_term)) = LOWER(TRIM(p_search_term))
    AND LOWER(TRIM(location_formatted)) = LOWER(TRIM(p_location_formatted));
END;
$$ LANGUAGE plpgsql;

-- Verificar se todas as localizações de um termo foram esgotadas
CREATE OR REPLACE FUNCTION check_all_locations_exhausted(
  p_workspace_id UUID,
  p_search_term TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_total INTEGER;
  v_exhausted INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE api_exhausted = true OR is_suspect = true)
  INTO v_total, v_exhausted
  FROM neighborhood_search_history
  WHERE workspace_id = p_workspace_id
    AND LOWER(TRIM(search_term)) = LOWER(TRIM(p_search_term));
  
  IF v_total = 0 THEN
    RETURN false;
  END IF;
  
  RETURN v_exhausted = v_total;
END;
$$ LANGUAGE plpgsql;

-- Obter próxima página para uma localização
CREATE OR REPLACE FUNCTION get_next_page_for_location(
  p_workspace_id UUID,
  p_search_term TEXT,
  p_location_formatted TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_last_page INTEGER;
BEGIN
  SELECT last_page_searched INTO v_last_page
  FROM neighborhood_search_history
  WHERE workspace_id = p_workspace_id
    AND LOWER(TRIM(search_term)) = LOWER(TRIM(p_search_term))
    AND LOWER(TRIM(location_formatted)) = LOWER(TRIM(p_location_formatted));
  
  IF v_last_page IS NULL THEN
    RETURN 1;
  END IF;
  
  RETURN v_last_page + 1;
END;
$$ LANGUAGE plpgsql;

-- Buscar localizações do cache
CREATE OR REPLACE FUNCTION get_cache_locations(
  p_city TEXT,
  p_state TEXT,
  p_search_term TEXT
)
RETURNS TABLE(
  locations TEXT[],
  has_more BOOLEAN,
  ai_model TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nc.locations,
    nc.has_more_neighborhoods,
    nc.ai_model
  FROM neighborhood_cache nc
  WHERE (nc.city IS NULL AND p_city IS NULL OR LOWER(TRIM(nc.city)) = LOWER(TRIM(p_city)))
    AND LOWER(TRIM(nc.state)) = LOWER(TRIM(p_state))
    AND (nc.search_term IS NULL AND p_search_term IS NULL OR LOWER(TRIM(nc.search_term)) = LOWER(TRIM(p_search_term)))
    AND nc.is_valid = true
    AND (nc.expires_at IS NULL OR nc.expires_at > NOW())
  ORDER BY nc.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Salvar localizações no cache
CREATE OR REPLACE FUNCTION save_cache_locations(
  p_city TEXT,
  p_state TEXT,
  p_search_term TEXT,
  p_locations TEXT[],
  p_has_more BOOLEAN,
  p_location_level TEXT,
  p_ai_model TEXT,
  p_ttl_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO neighborhood_cache (
    city,
    state,
    search_term,
    locations,
    has_more_neighborhoods,
    location_level,
    ai_model,
    expires_at
  ) VALUES (
    p_city,
    p_state,
    p_search_term,
    p_locations,
    p_has_more,
    p_location_level,
    p_ai_model,
    NOW() + (p_ttl_days || ' days')::INTERVAL
  )
  ON CONFLICT (city, state, search_term)
  DO UPDATE SET
    locations = EXCLUDED.locations,
    has_more_neighborhoods = EXCLUDED.has_more_neighborhoods,
    location_level = EXCLUDED.location_level,
    ai_model = EXCLUDED.ai_model,
    expires_at = EXCLUDED.expires_at,
    is_valid = true
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 5. INSERIR CONFIGURAÇÃO INICIAL
-- -----------------------------------------------------------------------------
INSERT INTO ai_neighborhood_config (
  is_active,
  model,
  fallback_models,
  max_tokens,
  temperature,
  timeout_seconds,
  max_retries,
  max_ai_rounds,
  max_total_pages,
  system_prompt,
  user_prompt_city,
  user_prompt_state,
  user_prompt_additional,
  cache_ttl_days
) VALUES (
  true,
  'perplexity/sonar-pro',
  ARRAY['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'],
  2000,
  0.3,
  60,
  3,
  3,
  500,
  -- System Prompt
  'Voce e um especialista em geografia brasileira. Sua tarefa e sugerir bairros para buscas no Google Maps.

REGRAS OBRIGATORIAS DE FORMATACAO:
1. Retorne APENAS JSON valido, sem explicacoes ou texto adicional
2. Cada localizacao DEVE seguir EXATAMENTE este formato:
   "Bairro, Cidade, State of Estado, Brazil"
3. SEM acentos (use Joao em vez de João, Sao em vez de São, Paraiba em vez de Paraíba)
4. Use "State of" antes do estado (em ingles)
5. Use "Brazil" no final (em ingles)
6. Capitalizacao correta (primeira letra maiuscula de cada palavra, exceto preposicoes)

EXEMPLOS CORRETOS:
- "Copacabana, Rio de Janeiro, State of Rio de Janeiro, Brazil"
- "Pinheiros, Sao Paulo, State of Sao Paulo, Brazil"
- "Manaira, Joao Pessoa, State of Paraiba, Brazil"
- "Boa Viagem, Recife, State of Pernambuco, Brazil"

EXEMPLOS INCORRETOS (NAO USE ESTES FORMATOS):
- "Copacabana, Rio de Janeiro, RJ" (falta State of e Brazil)
- "COPACABANA, RIO DE JANEIRO" (tudo maiusculo)
- "Copacabana, Rio de Janeiro, Estado do Rio de Janeiro, Brasil" (portugues)
- "Centro, São Paulo, SP, Brasil" (tem acento e usa abreviacoes)',

  -- User Prompt City
  'Preciso de bairros para buscar "{search_term}" em {city}, {state}.

BAIRROS JA PESQUISADOS (NAO INCLUA ESTES):
{already_searched_locations}

Meta: Aproximadamente {quantity_needed} bairros diferentes.

Criterios para selecao:
- Priorize bairros comerciais onde provavelmente encontrarei "{search_term}"
- Inclua bairros de diferentes regioes da cidade (zona norte, sul, leste, oeste, centro)
- Se for comercio de luxo (joalherias, boutiques), priorize bairros nobres
- Se for comercio popular (lojas de construcao, supermercados), inclua bairros residenciais
- Se for alimentacao (pizzarias, restaurantes), inclua areas com vida noturna e centros comerciais
- Considere bairros com maior densidade populacional e atividade comercial

Retorne JSON no formato:
{
  "locations": ["Bairro1, {city}, State of {state}, Brazil", "Bairro2, {city}, State of {state}, Brazil"],
  "has_more_neighborhoods": true
}

IMPORTANTE: has_more_neighborhoods deve ser false apenas se voce ja listou TODOS os bairros relevantes da cidade.',

  -- User Prompt State
  'Preciso de cidades e bairros no estado de {state} para buscar "{search_term}".

LOCAIS JA PESQUISADOS (NAO INCLUA ESTES):
{already_searched_locations}

Meta: Aproximadamente {quantity_needed} localizacoes diferentes.

Criterios para selecao:
- Inclua as principais cidades do estado (capital e cidades com mais de 100mil habitantes)
- Para cada cidade, sugira os principais bairros comerciais
- Considere o tipo de negocio "{search_term}" para escolher os melhores locais
- Distribua as sugestoes entre diferentes cidades para maximizar cobertura
- Priorize capitais e cidades com maior PIB

Retorne JSON no formato:
{
  "locations": [
    "Bairro1, Cidade1, State of {state}, Brazil",
    "Bairro2, Cidade1, State of {state}, Brazil",
    "Bairro1, Cidade2, State of {state}, Brazil"
  ],
  "has_more_neighborhoods": true
}

IMPORTANTE: has_more_neighborhoods deve ser false apenas se voce ja listou TODOS os bairros relevantes do estado.',

  -- User Prompt Additional (para rodadas 2, 3, etc)
  'Preciso de MAIS bairros para buscar "{search_term}".

JA PESQUISEI TODOS ESTES LOCAIS (NAO REPITA NENHUM):
{all_searched_locations}

Quantidade atual de leads: {current_leads}
Meta: {target_quantity} leads
Faltam: {leads_needed} leads

Sugira bairros DIFERENTES dos ja listados acima. Considere:
- Bairros menores ou menos conhecidos que ainda podem ter "{search_term}"
- Areas comerciais secundarias
- Bairros residenciais com comercio local
- Regioes metropolitanas ou cidades vizinhas

Se nao houver mais bairros relevantes, retorne has_more_neighborhoods: false.

Retorne JSON no formato:
{
  "locations": ["Bairro1, Cidade, State of Estado, Brazil", ...],
  "has_more_neighborhoods": true/false
}',

  30 -- cache_ttl_days
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. REAVALIAÇÃO AUTOMÁTICA DE LEADS FILTRADOS APÓS ENRIQUECIMENTO
-- -----------------------------------------------------------------------------

-- Função auxiliar para validar se lead passa nos filtros
-- Reutiliza a mesma lógica de validação de filtros de migrate_leads_with_custom_values()
-- Retorna (passa_filtros, motivo_filtro)
CREATE OR REPLACE FUNCTION check_lead_passes_filters(
  p_emails JSONB,
  p_phones JSONB,
  p_websites JSONB,
  p_primary_email TEXT,
  p_primary_phone TEXT,
  p_primary_website TEXT,
  p_extracted_data JSONB,
  p_require_email BOOLEAN,
  p_require_phone BOOLEAN,
  p_require_website BOOLEAN,
  p_min_rating NUMERIC,
  p_min_reviews INTEGER
)
RETURNS TABLE(passes BOOLEAN, reason TEXT) AS $$
DECLARE
  v_passes_filters BOOLEAN;
  v_has_email BOOLEAN;
  v_has_phone BOOLEAN;
  v_has_website BOOLEAN;
  v_rating NUMERIC;
  v_reviews INTEGER;
  v_filter_reason TEXT;
BEGIN
  -- Reutilizar mesma lógica de validação de migrate_leads_with_custom_values()
  v_passes_filters := TRUE;
  v_filter_reason := NULL;
  
  -- Verificar email (de qualquer fonte: serpdev, whois, cnpj, scraping)
  v_has_email := (
    p_emails IS NOT NULL 
    AND p_emails != '[]'::jsonb 
    AND jsonb_array_length(p_emails) > 0
  ) OR (
    p_primary_email IS NOT NULL 
    AND p_primary_email != ''
  );
  
  -- Verificar telefone
  v_has_phone := (
    p_phones IS NOT NULL 
    AND p_phones != '[]'::jsonb 
    AND jsonb_array_length(p_phones) > 0
  ) OR (
    p_primary_phone IS NOT NULL 
    AND p_primary_phone != ''
  );
  
  -- Verificar website
  v_has_website := (
    p_websites IS NOT NULL 
    AND p_websites != '[]'::jsonb 
    AND jsonb_array_length(p_websites) > 0
  ) OR (
    p_primary_website IS NOT NULL 
    AND p_primary_website != ''
  );
  
  -- Rating e reviews do extracted_data
  v_rating := COALESCE((p_extracted_data->>'rating')::numeric, 0);
  v_reviews := COALESCE((p_extracted_data->>'reviews')::integer, 0);
  
  -- Aplicar filtros (mesma lógica de migrate_leads_with_custom_values())
  IF p_require_email = TRUE AND v_has_email = FALSE THEN
    v_passes_filters := FALSE;
    v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_email';
  END IF;
  
  IF p_require_phone = TRUE AND v_has_phone = FALSE THEN
    v_passes_filters := FALSE;
    v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_telefone';
  END IF;
  
  IF p_require_website = TRUE AND v_has_website = FALSE THEN
    v_passes_filters := FALSE;
    v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_website';
  END IF;
  
  IF COALESCE(p_min_rating, 0) > 0 AND v_rating < p_min_rating THEN
    v_passes_filters := FALSE;
    v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'rating_baixo';
  END IF;
  
  IF COALESCE(p_min_reviews, 0) > 0 AND v_reviews < p_min_reviews THEN
    v_passes_filters := FALSE;
    v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'reviews_baixo';
  END IF;
  
  RETURN QUERY SELECT v_passes_filters, v_filter_reason;
END;
$$ LANGUAGE plpgsql;

-- Modificar função update_status_enrichment_on_complete() para chamar reavaliação
CREATE OR REPLACE FUNCTION update_status_enrichment_on_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_all_complete BOOLEAN := TRUE;
  v_has_domain BOOLEAN := FALSE;
  v_has_cnpj BOOLEAN := FALSE;
  v_has_website BOOLEAN := FALSE;
  v_extraction RECORD;
  v_passed BOOLEAN;
  v_filter_reason TEXT;
BEGIN
  -- Verificar se tem domínio (para WHOIS)
  v_has_domain := (NEW.domain IS NOT NULL AND NEW.domain != '' AND NEW.domain LIKE '%.br');
  
  -- Verificar se tem CNPJ (para enriquecimento CNPJ)
  v_has_cnpj := (NEW.cnpj_normalized IS NOT NULL AND NEW.cnpj_normalized != '');
  
  -- Verificar se tem website (para scraping)
  v_has_website := (NEW.primary_website IS NOT NULL AND NEW.primary_website != '');
  
  -- Se tem domínio .br, precisa ter whois_enriched = true
  IF v_has_domain AND (NEW.whois_enriched IS NULL OR NEW.whois_enriched = false) THEN
    v_all_complete := FALSE;
  END IF;
  
  -- Se tem CNPJ, precisa ter cnpj_enriched = true
  IF v_has_cnpj AND (NEW.cnpj_enriched IS NULL OR NEW.cnpj_enriched = false) THEN
    v_all_complete := FALSE;
  END IF;
  
  -- Se tem website, precisa ter scraping_enriched = true
  IF v_has_website AND (NEW.scraping_enriched IS NULL OR NEW.scraping_enriched = false) THEN
    v_all_complete := FALSE;
  END IF;
  
  -- Se não tem nenhum campo para enriquecer, considerar completo
  IF NOT v_has_domain AND NOT v_has_cnpj AND NOT v_has_website THEN
    v_all_complete := TRUE;
  END IF;
  
  -- Atualizar status_enrichment
  IF v_all_complete THEN
    NEW.status_enrichment := 'completed';
    
    -- NOVO: Reavaliar lead filtrado quando enriquecimento completa
    IF (NEW.filter_passed = false OR NEW.should_migrate = false) 
       AND NEW.migrated_at IS NULL THEN
      -- Buscar filtros da extração
      SELECT 
        e.require_email,
        e.require_phone,
        e.require_website,
        e.min_rating,
        e.min_reviews
      INTO v_extraction
      FROM lead_extraction_runs r
      JOIN lead_extractions e ON e.id = r.extraction_id
      WHERE r.id = NEW.extraction_run_id;
      
      -- Se encontrou filtros, reavaliar
      IF FOUND THEN
        SELECT passes, reason INTO v_passed, v_filter_reason
        FROM check_lead_passes_filters(
          NEW.emails,
          NEW.phones,
          NEW.websites,
          NEW.primary_email,
          NEW.primary_phone,
          NEW.primary_website,
          NEW.extracted_data,
          v_extraction.require_email,
          v_extraction.require_phone,
          v_extraction.require_website,
          v_extraction.min_rating,
          v_extraction.min_reviews
        );
        
        -- Atualizar NEW se passou nos filtros
        IF v_passed THEN
          NEW.should_migrate := true;
          NEW.filter_passed := true;
          NEW.filter_reason := NULL;
        ELSE
          -- Atualizar motivo se mudou
          NEW.filter_reason := v_filter_reason;
        END IF;
      END IF;
    END IF;
  ELSIF NEW.status_enrichment = 'pending' THEN
    -- Se ainda está pending e não está completo, manter ou mudar para 'enriching'
    -- Verificar se pelo menos um enriquecimento foi iniciado
    IF (NEW.whois_enriched = true OR NEW.cnpj_enriched = true OR NEW.scraping_enriched = true) THEN
      NEW.status_enrichment := 'enriching';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 7. FUNÇÃO RPC: DELETAR RUN DE EXTRAÇÃO E TODOS OS DADOS RELACIONADOS
-- -----------------------------------------------------------------------------

-- Função RPC para deletar uma run de extração e todos os dados relacionados
-- Uso: SELECT delete_extraction_run('uuid-da-run-aqui');
CREATE OR REPLACE FUNCTION delete_extraction_run(p_run_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_run RECORD;
  v_deleted_counts JSONB;
  v_messages_deleted INTEGER := 0;
  v_watchdog_deleted INTEGER := 0;
  v_staging_deleted INTEGER := 0;
  v_logs_deleted INTEGER := 0;
  v_leads_deleted INTEGER := 0;
  v_history_deleted INTEGER := 0;
  v_run_deleted BOOLEAN := false;
BEGIN
  -- Validar se a run existe
  SELECT id, workspace_id, search_term, location, status
  INTO v_run
  FROM lead_extraction_runs
  WHERE id = p_run_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Run não encontrada',
      'run_id', p_run_id
    );
  END IF;
  
  -- Contar registros antes de deletar (para retorno)
  SELECT COUNT(*) INTO v_staging_deleted
  FROM lead_extraction_staging
  WHERE extraction_run_id = p_run_id;
  
  SELECT COUNT(*) INTO v_logs_deleted
  FROM extraction_logs
  WHERE run_id = p_run_id;
  
  SELECT COUNT(*) INTO v_watchdog_deleted
  FROM watchdog_logs
  WHERE run_id = p_run_id;
  
  SELECT COUNT(*) INTO v_leads_deleted
  FROM leads
  WHERE lead_extraction_run_id = p_run_id;
  
  SELECT COUNT(*) INTO v_history_deleted
  FROM neighborhood_search_history
  WHERE workspace_id = v_run.workspace_id
    AND LOWER(TRIM(search_term)) = LOWER(TRIM(v_run.search_term));
  
  -- 1. Deletar mensagens da fila pgmq relacionadas à run
  -- Nota: pgmq não tem FK, então precisamos deletar manualmente
  -- Deletar diretamente da tabela q_google_maps_queue
  -- CORREÇÃO: A coluna é "message", não "msg"
  DELETE FROM pgmq.q_google_maps_queue
  WHERE (message->>'run_id')::UUID = p_run_id;
  
  GET DIAGNOSTICS v_messages_deleted = ROW_COUNT;
  
  -- 2. Deletar watchdog_logs (tem NO ACTION, precisa deletar antes)
  DELETE FROM watchdog_logs
  WHERE run_id = p_run_id;
  
  -- 3. Deletar neighborhood_search_history relacionados
  -- (Não tem FK, mas deletamos para limpeza completa)
  DELETE FROM neighborhood_search_history
  WHERE workspace_id = v_run.workspace_id
    AND LOWER(TRIM(search_term)) = LOWER(TRIM(v_run.search_term));
  
  -- 4. Deletar leads relacionados (opcional - descomente se quiser deletar leads também)
  -- ATENÇÃO: Isso deleta permanentemente os leads do Kanban!
  -- DELETE FROM leads
  -- WHERE lead_extraction_run_id = p_run_id;
  
  -- 5. Deletar a run (CASCADE cuida de extraction_logs e lead_extraction_staging)
  DELETE FROM lead_extraction_runs
  WHERE id = p_run_id;
  
  v_run_deleted := true;
  
  -- Retornar resultado detalhado
  v_deleted_counts := jsonb_build_object(
    'success', true,
    'run_id', p_run_id,
    'run_info', jsonb_build_object(
      'workspace_id', v_run.workspace_id,
      'search_term', v_run.search_term,
      'location', v_run.location,
      'status', v_run.status
    ),
    'deleted_counts', jsonb_build_object(
      'messages_from_queue', v_messages_deleted,
      'watchdog_logs', v_watchdog_deleted,
      'staging_leads', v_staging_deleted,
      'extraction_logs', v_logs_deleted,
      'leads', v_leads_deleted,
      'neighborhood_history', v_history_deleted,
      'run', CASE WHEN v_run_deleted THEN 1 ELSE 0 END
    ),
    'message', format(
      'Run deletada com sucesso. %s mensagens, %s logs watchdog, %s leads staging, %s logs extração, %s leads kanban, %s histórico bairros',
      v_messages_deleted,
      v_watchdog_deleted,
      v_staging_deleted,
      v_logs_deleted,
      v_leads_deleted,
      v_history_deleted
    )
  );
  
  RETURN v_deleted_counts;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'run_id', p_run_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão de execução para authenticated users
GRANT EXECUTE ON FUNCTION delete_extraction_run(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_extraction_run(UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 8. FUNÇÃO: CORRIGIR STATUS DE ENRIQUECIMENTO PARA FINALIZAR EXTRAÇÕES
-- -----------------------------------------------------------------------------

-- Função para corrigir leads que não precisam de enriquecimento ou falharam no scraping
-- Marca como 'completed' para permitir finalização da extração
CREATE OR REPLACE FUNCTION fix_enrichment_status_for_completion(p_run_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_no_enrichment_needed INTEGER := 0;
  v_scraping_failed INTEGER := 0;
  v_total_fixed INTEGER := 0;
BEGIN
  -- 1. Corrigir leads que não têm campos para enriquecer
  -- (não têm domínio .br, CNPJ, website ou telefone)
  UPDATE lead_extraction_staging
  SET 
    status_enrichment = 'completed',
    updated_at = NOW()
  WHERE extraction_run_id = p_run_id
    AND status_enrichment IN ('pending', 'enriching')
    AND (
      -- Não precisa de WHOIS (não tem domínio .br ou já enriquecido)
      (domain IS NULL OR domain NOT LIKE '%.br' OR whois_enriched = true)
      -- Não precisa de CNPJ (não tem CNPJ ou já enriquecido)
      AND (cnpj_normalized IS NULL OR cnpj_normalized = '' OR cnpj_enriched = true)
      -- Não precisa de scraping (não tem website ou já enriquecido)
      AND (primary_website IS NULL OR primary_website = '' OR scraping_enriched = true)
      -- Não precisa de WhatsApp (não tem telefone ou já validado)
      AND (phone_normalized IS NULL OR phone_normalized = '' OR whatsapp_valid IS NOT NULL)
    );
  
  GET DIAGNOSTICS v_no_enrichment_needed = ROW_COUNT;
  
  -- 2. Corrigir leads que falharam no scraping após retry
  -- Marca scraping_enriched = true para permitir finalização
  UPDATE lead_extraction_staging
  SET 
    scraping_enriched = true,
    status_enrichment = CASE 
      WHEN status_enrichment IN ('pending', 'enriching') THEN 'completed'
      ELSE status_enrichment
    END,
    updated_at = NOW()
  WHERE extraction_run_id = p_run_id
    AND scraping_status = 'failed'
    AND scraping_attempts >= 1
    AND scraping_enriched = false;
  
  GET DIAGNOSTICS v_scraping_failed = ROW_COUNT;
  
  v_total_fixed := v_no_enrichment_needed + v_scraping_failed;
  
  RETURN jsonb_build_object(
    'success', true,
    'run_id', p_run_id,
    'fixed_counts', jsonb_build_object(
      'no_enrichment_needed', v_no_enrichment_needed,
      'scraping_failed', v_scraping_failed,
      'total', v_total_fixed
    ),
    'message', format(
      'Corrigidos %s leads: %s sem necessidade de enriquecimento, %s com scraping falhado',
      v_total_fixed,
      v_no_enrichment_needed,
      v_scraping_failed
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'run_id', p_run_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão de execução
GRANT EXECUTE ON FUNCTION fix_enrichment_status_for_completion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_enrichment_status_for_completion(UUID) TO service_role;

-- Modificar trigger para marcar como completed na criação se não há campos para enriquecer
CREATE OR REPLACE FUNCTION update_status_enrichment_on_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_all_complete BOOLEAN := TRUE;
  v_has_domain BOOLEAN := FALSE;
  v_has_cnpj BOOLEAN := FALSE;
  v_has_website BOOLEAN := FALSE;
  v_extraction RECORD;
  v_passed BOOLEAN;
  v_filter_reason TEXT;
BEGIN
  -- Verificar se tem domínio (para WHOIS)
  v_has_domain := (NEW.domain IS NOT NULL AND NEW.domain != '' AND NEW.domain LIKE '%.br');
  
  -- Verificar se tem CNPJ (para enriquecimento CNPJ)
  v_has_cnpj := (NEW.cnpj_normalized IS NOT NULL AND NEW.cnpj_normalized != '');
  
  -- Verificar se tem website (para scraping)
  v_has_website := (NEW.primary_website IS NOT NULL AND NEW.primary_website != '');
  
  -- Se tem domínio .br, precisa ter whois_enriched = true
  IF v_has_domain AND (NEW.whois_enriched IS NULL OR NEW.whois_enriched = false) THEN
    v_all_complete := FALSE;
  END IF;
  
  -- Se tem CNPJ, precisa ter cnpj_enriched = true
  IF v_has_cnpj AND (NEW.cnpj_enriched IS NULL OR NEW.cnpj_enriched = false) THEN
    v_all_complete := FALSE;
  END IF;
  
  -- Se tem website, precisa ter scraping_enriched = true
  -- EXCEÇÃO: Se scraping falhou após retry (scraping_status = 'failed' AND scraping_attempts >= 1), considerar completo
  IF v_has_website THEN
    IF (NEW.scraping_enriched IS NULL OR NEW.scraping_enriched = false) THEN
      -- Se scraping falhou após retry, marcar como completo
      IF NEW.scraping_status = 'failed' AND COALESCE(NEW.scraping_attempts, 0) >= 1 THEN
        NEW.scraping_enriched := true;  -- Marcar como enriquecido mesmo falhando
        -- Não marca v_all_complete como FALSE
      ELSE
        v_all_complete := FALSE;
      END IF;
    END IF;
  END IF;
  
  -- Se não tem nenhum campo para enriquecer, considerar completo
  IF NOT v_has_domain AND NOT v_has_cnpj AND NOT v_has_website THEN
    v_all_complete := TRUE;
  END IF;
  
  -- Atualizar status_enrichment
  IF v_all_complete THEN
    NEW.status_enrichment := 'completed';
    
    -- NOVO: Reavaliar lead filtrado quando enriquecimento completa
    IF (NEW.filter_passed = false OR NEW.should_migrate = false) 
       AND NEW.migrated_at IS NULL THEN
      -- Buscar filtros da extração
      SELECT 
        e.require_email,
        e.require_phone,
        e.require_website,
        e.min_rating,
        e.min_reviews
      INTO v_extraction
      FROM lead_extraction_runs r
      JOIN lead_extractions e ON e.id = r.extraction_id
      WHERE r.id = NEW.extraction_run_id;
      
      -- Se encontrou filtros, reavaliar
      IF FOUND THEN
        SELECT passes, reason INTO v_passed, v_filter_reason
        FROM check_lead_passes_filters(
          NEW.emails,
          NEW.phones,
          NEW.websites,
          NEW.primary_email,
          NEW.primary_phone,
          NEW.primary_website,
          NEW.extracted_data,
          v_extraction.require_email,
          v_extraction.require_phone,
          v_extraction.require_website,
          v_extraction.min_rating,
          v_extraction.min_reviews
        );
        
        -- Atualizar NEW se passou nos filtros
        IF v_passed THEN
          NEW.should_migrate := true;
          NEW.filter_passed := true;
          NEW.filter_reason := NULL;
        ELSE
          -- Atualizar motivo se mudou
          NEW.filter_reason := v_filter_reason;
        END IF;
      END IF;
    END IF;
  ELSIF NEW.status_enrichment = 'pending' THEN
    -- Se ainda está pending e não está completo, manter ou mudar para 'enriching'
    -- Verificar se pelo menos um enriquecimento foi iniciado
    IF (NEW.whois_enriched = true OR NEW.cnpj_enriched = true OR NEW.scraping_enriched = true) THEN
      NEW.status_enrichment := 'enriching';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================

