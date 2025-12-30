-- Migration: Adicionar coluna sources para persistir fontes de busca web
-- As sources são retornadas pelo Tavily e mostradas como tags na UI

-- Adicionar coluna sources como JSONB
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT NULL;

-- Comentário na coluna
COMMENT ON COLUMN ai_messages.sources IS 'Array de fontes da busca web (Tavily). Formato: [{title, url, content?, score?}]';

-- Índice GIN para busca eficiente em JSONB (caso precise buscar por URL ou título)
CREATE INDEX IF NOT EXISTS idx_ai_messages_sources_gin
ON ai_messages USING GIN (sources)
WHERE sources IS NOT NULL;
