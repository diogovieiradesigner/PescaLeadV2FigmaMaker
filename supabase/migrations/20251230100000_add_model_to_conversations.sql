-- Migration: Adicionar modelo por conversa
-- Permite personalizar o modelo de IA usado em cada conversa

-- Adicionar coluna model_id na tabela ai_conversations
ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS model_id TEXT DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN ai_conversations.model_id IS 'ID do modelo de IA usado nesta conversa. NULL = usar padrão da configuração do workspace';

-- Índice para busca por modelo (útil para analytics)
CREATE INDEX IF NOT EXISTS idx_ai_conversations_model_id
ON ai_conversations(model_id)
WHERE model_id IS NOT NULL;
