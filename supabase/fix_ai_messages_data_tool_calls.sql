-- FIX: Adicionar coluna data_tool_calls na tabela ai_messages
-- Execute este SQL no SQL Editor do Supabase

-- Adicionar coluna para Data Tool Calls
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS data_tool_calls JSONB DEFAULT NULL;

-- Adicionar coluna para indicar se usou Data Tools
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS used_data_tools BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON COLUMN ai_messages.data_tool_calls IS 'Array de Data Tool calls executadas durante esta mensagem (search_leads, get_pipeline_stats, etc.)';
COMMENT ON COLUMN ai_messages.used_data_tools IS 'Indica se Data Tools foram usadas nesta mensagem';
