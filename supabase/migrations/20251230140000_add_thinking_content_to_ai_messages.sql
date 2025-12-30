-- Migration: Adicionar coluna thinking_content para suporte a modelos de raciocínio
-- Modelos como DeepSeek R1, Qwen3 Thinking retornam conteúdo de "pensamento" em tags <think>

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS thinking_content TEXT;

COMMENT ON COLUMN ai_messages.thinking_content IS 'Conteúdo de raciocínio/thinking do modelo (ex: DeepSeek R1). Separado do content final.';
