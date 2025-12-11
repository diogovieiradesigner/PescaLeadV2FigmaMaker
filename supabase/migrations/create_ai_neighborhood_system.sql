-- =============================================================================
-- MIGRATION: Sistema de Expansão por Bairros com IA
-- =============================================================================
-- Substitui Overpass API por chamadas a IA (Perplexity via OpenRouter)
-- A IA retorna localizações JÁ FORMATADAS para o SerpDev API (sem coordenadas)
-- Formato obrigatório: "Bairro, Cidade, State of Estado, Brazil"
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELA: ai_neighborhood_config
-- Configurações da IA para busca de bairros
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_neighborhood_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT true,
  
  -- Configurações do modelo
  model TEXT DEFAULT 'perplexity/sonar-pro',
  fallback_models TEXT[] DEFAULT ARRAY['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'],
  max_tokens INTEGER DEFAULT 2000,
  temperature NUMERIC DEFAULT 0.3,
  
  -- Configurações de timeout e retry
  timeout_seconds INTEGER DEFAULT 60,
  max_retries INTEGER DEFAULT 3,
  
  -- Limites de busca
  max_ai_rounds INTEGER DEFAULT 3,
  max_total_pages INTEGER DEFAULT 500,
  
  -- Prompts configuráveis
  system_prompt TEXT NOT NULL,
  user_prompt_city TEXT NOT NULL,
  user_prompt_state TEXT NOT NULL,
  user_prompt_additional TEXT NOT NULL,
  
  -- Cache
  cache_ttl_days INTEGER DEFAULT 30,
  
  -- Metadata
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
-- Cache de localizações retornadas pela IA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS neighborhood_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Localização base
  city TEXT,
  state TEXT NOT NULL,
  country TEXT DEFAULT 'Brazil',
  
  -- Termo de busca (importante para cache contextual)
  search_term TEXT,
  
  -- Nível da localização
  location_level TEXT CHECK (location_level IN ('city', 'state', 'region')),
  
  -- Localizações formatadas para SerpDev (array de strings)
  -- Exemplo: ["Copacabana, Rio de Janeiro, State of Rio de Janeiro, Brazil"]
  locations TEXT[] NOT NULL,
  
  -- Indica se a IA disse que há mais bairros disponíveis
  has_more_neighborhoods BOOLEAN DEFAULT true,
  
  -- Metadata
  source TEXT DEFAULT 'ai',
  ai_model TEXT,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Constraint única para evitar duplicatas
  UNIQUE(city, state, search_term)
);

-- Índice para lookups rápidos (apenas cache válido e não expirado)
CREATE INDEX IF NOT EXISTS idx_neighborhood_cache_lookup 
ON neighborhood_cache(city, state, search_term) 
WHERE is_valid = true AND (expires_at IS NULL OR expires_at > NOW());

-- -----------------------------------------------------------------------------
-- 3. TABELA: neighborhood_search_history
-- Histórico de buscas por localização (para continuidade)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS neighborhood_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace (separação por cliente)
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Termo de busca
  search_term TEXT NOT NULL,
  
  -- Localização formatada para SerpDev
  -- Exemplo: "Copacabana, Rio de Janeiro, State of Rio de Janeiro, Brazil"
  location_formatted TEXT NOT NULL,
  
  -- Progresso
  last_page_searched INTEGER DEFAULT 0,
  total_leads_found INTEGER DEFAULT 0,
  
  -- Status
  api_exhausted BOOLEAN DEFAULT false,
  is_suspect BOOLEAN DEFAULT false, -- Bairro que retorna 0 leads (possível inexistente)
  pages_with_zero_results INTEGER DEFAULT 0,
  
  -- Rodada da IA (1, 2, 3...)
  ai_round INTEGER DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint única para evitar duplicatas
  UNIQUE(workspace_id, search_term, location_formatted)
);

-- Índices para performance
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
-- 4. FUNÇÃO: get_location_search_history
-- Busca histórico de localizações já pesquisadas para um termo
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5. FUNÇÃO: upsert_location_search_progress
-- Atualiza progresso de busca por localização (atômico)
-- -----------------------------------------------------------------------------
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
    last_page_searched = GREATEST(neighborhood_search_history.last_page_searched, p_page),
    total_leads_found = neighborhood_search_history.total_leads_found + p_leads_found,
    api_exhausted = p_api_exhausted OR neighborhood_search_history.api_exhausted,
    pages_with_zero_results = p_pages_with_zero,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 6. FUNÇÃO: mark_location_as_suspect
-- Marca localização como suspeita (0 leads em múltiplas páginas)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 7. FUNÇÃO: check_all_locations_exhausted
-- Verifica se todas as localizações de um termo foram esgotadas
-- -----------------------------------------------------------------------------
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
  
  -- Se não há localizações, retorna false
  IF v_total = 0 THEN
    RETURN false;
  END IF;
  
  -- Retorna true se todas estão esgotadas ou são suspeitas
  RETURN v_exhausted = v_total;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 8. FUNÇÃO: get_next_page_for_location
-- Obtém próxima página a ser buscada para uma localização
-- -----------------------------------------------------------------------------
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
  
  -- Se não existe histórico, começar da página 1
  IF v_last_page IS NULL THEN
    RETURN 1;
  END IF;
  
  -- Retorna próxima página
  RETURN v_last_page + 1;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 9. FUNÇÃO: normalize_for_serpdev (helper SQL)
-- Normaliza string para formato SerpDev (remove acentos, capitaliza)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_for_serpdev(p_location TEXT)
RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
BEGIN
  -- Remove acentos usando translate
  v_result := translate(
    p_location,
    'àáâãäåèéêëìíîïòóôõöùúûüçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇ',
    'aaaaaaeeeeiiiiooooouuuucAAAAAAEEEEIIIIOOOOOUUUUC'
  );
  
  -- Capitalizar corretamente (primeira letra de cada palavra)
  v_result := initcap(v_result);
  
  -- Corrigir palavras que devem ficar minúsculas
  v_result := regexp_replace(v_result, '\bDe\b', 'de', 'g');
  v_result := regexp_replace(v_result, '\bDo\b', 'do', 'g');
  v_result := regexp_replace(v_result, '\bDa\b', 'da', 'g');
  v_result := regexp_replace(v_result, '\bDos\b', 'dos', 'g');
  v_result := regexp_replace(v_result, '\bDas\b', 'das', 'g');
  v_result := regexp_replace(v_result, '\bOf\b', 'of', 'g');
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 10. FUNÇÃO: get_cache_locations
-- Busca localizações do cache (se válido e não expirado)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 11. FUNÇÃO: save_cache_locations
-- Salva localizações no cache
-- -----------------------------------------------------------------------------
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
-- 12. FUNÇÃO: get_active_locations_count
-- Conta quantas localizações ativas existem para um termo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_active_locations_count(
  p_workspace_id UUID,
  p_search_term TEXT
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM neighborhood_search_history
    WHERE workspace_id = p_workspace_id
      AND LOWER(TRIM(search_term)) = LOWER(TRIM(p_search_term))
      AND api_exhausted = false
      AND is_suspect = false
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMENTÁRIOS DAS TABELAS
-- =============================================================================
COMMENT ON TABLE ai_neighborhood_config IS 'Configurações da IA para busca de bairros via OpenRouter/Perplexity';
COMMENT ON TABLE neighborhood_cache IS 'Cache de localizações formatadas para SerpDev retornadas pela IA';
COMMENT ON TABLE neighborhood_search_history IS 'Histórico de buscas por localização para continuidade entre extrações';

COMMENT ON COLUMN ai_neighborhood_config.fallback_models IS 'Modelos de fallback se o principal falhar';
COMMENT ON COLUMN ai_neighborhood_config.max_ai_rounds IS 'Máximo de rodadas de consulta à IA quando bairros esgotam';
COMMENT ON COLUMN ai_neighborhood_config.max_total_pages IS 'Limite absoluto de páginas por extração';

COMMENT ON COLUMN neighborhood_cache.locations IS 'Array de strings formatadas para SerpDev: "Bairro, Cidade, State of Estado, Brazil"';
COMMENT ON COLUMN neighborhood_cache.has_more_neighborhoods IS 'Se a IA informou que há mais bairros além dos listados';

COMMENT ON COLUMN neighborhood_search_history.location_formatted IS 'Localização no formato SerpDev: "Bairro, Cidade, State of Estado, Brazil"';
COMMENT ON COLUMN neighborhood_search_history.is_suspect IS 'Bairro marcado como suspeito (retorna 0 leads em múltiplas páginas)';
COMMENT ON COLUMN neighborhood_search_history.ai_round IS 'Rodada da IA que sugeriu este bairro (1, 2, 3...)';

