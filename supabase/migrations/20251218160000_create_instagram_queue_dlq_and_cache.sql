-- =============================================================================
-- MIGRATION: Criar DLQ do Instagram e Tabela de Cache de Queries
-- =============================================================================
-- 1. Criar Dead Letter Queue para instagram_queue
-- 2. Criar tabela de cache de queries para evitar buscas repetidas
-- =============================================================================

-- =============================================================================
-- PASSO 1: Criar Dead Letter Queue (DLQ) para Instagram
-- =============================================================================

-- Criar DLQ (se já não existir, pgmq ignora)
SELECT pgmq.create('instagram_queue_dlq');

COMMENT ON TABLE pgmq.q_instagram_queue_dlq IS 'Dead Letter Queue para mensagens que falharam >3 vezes no processamento do Instagram';

-- =============================================================================
-- PASSO 2: Criar tabela de cache de queries do Instagram
-- =============================================================================

CREATE TABLE IF NOT EXISTS instagram_query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação única da query
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,

  -- Parâmetros da busca
  niche TEXT NOT NULL,
  location TEXT,

  -- Métricas
  results_count INT DEFAULT 0,
  last_results_page INT DEFAULT 1,
  total_pages_fetched INT DEFAULT 0,

  -- Controle de TTL
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_instagram_query_cache_hash ON instagram_query_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_instagram_query_cache_expires ON instagram_query_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_instagram_query_cache_niche_location ON instagram_query_cache(niche, location);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_instagram_query_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instagram_query_cache_updated_at ON instagram_query_cache;
CREATE TRIGGER trg_instagram_query_cache_updated_at
  BEFORE UPDATE ON instagram_query_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_query_cache_updated_at();

COMMENT ON TABLE instagram_query_cache IS 'Cache de queries do Instagram para evitar buscas repetidas (TTL: 7 dias)';
COMMENT ON COLUMN instagram_query_cache.query_hash IS 'SHA-256 hash de niche + location para deduplicação';
COMMENT ON COLUMN instagram_query_cache.results_count IS 'Total de perfis encontrados nesta query';
COMMENT ON COLUMN instagram_query_cache.expires_at IS 'Data de expiração do cache (padrão: 7 dias)';

-- =============================================================================
-- PASSO 3: RLS para instagram_query_cache (desabilitado para uso por service_role)
-- =============================================================================

ALTER TABLE instagram_query_cache ENABLE ROW LEVEL SECURITY;

-- Policy para service_role ter acesso total
CREATE POLICY "Service role full access instagram_query_cache" ON instagram_query_cache
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =============================================================================
-- PASSO 4: Função helper para verificar/atualizar cache
-- =============================================================================

CREATE OR REPLACE FUNCTION get_or_create_instagram_query_cache(
  p_query_hash TEXT,
  p_query_text TEXT,
  p_niche TEXT,
  p_location TEXT DEFAULT NULL
)
RETURNS instagram_query_cache
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cache instagram_query_cache;
BEGIN
  -- Tentar buscar cache existente não expirado
  SELECT * INTO v_cache
  FROM instagram_query_cache
  WHERE query_hash = p_query_hash
    AND expires_at > NOW();

  IF FOUND THEN
    -- Atualizar last_used_at
    UPDATE instagram_query_cache
    SET last_used_at = NOW()
    WHERE id = v_cache.id;

    RETURN v_cache;
  END IF;

  -- Criar novo cache ou atualizar expirado
  INSERT INTO instagram_query_cache (query_hash, query_text, niche, location)
  VALUES (p_query_hash, p_query_text, p_niche, p_location)
  ON CONFLICT (query_hash) DO UPDATE
  SET
    last_used_at = NOW(),
    expires_at = NOW() + INTERVAL '7 days',
    updated_at = NOW()
  RETURNING * INTO v_cache;

  RETURN v_cache;
END;
$$;

COMMENT ON FUNCTION get_or_create_instagram_query_cache IS 'Busca ou cria entrada no cache de queries do Instagram';

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_or_create_instagram_query_cache(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- =============================================================================
-- PASSO 5: Função para limpar cache expirado
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_instagram_query_cache()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM instagram_query_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_instagram_query_cache IS 'Remove entradas expiradas do cache de queries do Instagram';

GRANT EXECUTE ON FUNCTION cleanup_expired_instagram_query_cache() TO service_role;

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
