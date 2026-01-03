-- Migration: Add Data Tool Calls columns to ai_messages
-- Allows persisting Data Tool call history in messages (similar to MCP tools)

-- Add columns to ai_messages for Data Tool tracking
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS data_tool_calls JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS used_data_tools BOOLEAN DEFAULT FALSE;

-- Create index for filtering messages that used data tools
CREATE INDEX IF NOT EXISTS idx_ai_messages_used_data_tools
ON ai_messages(conversation_id, used_data_tools)
WHERE used_data_tools = TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN ai_messages.data_tool_calls IS 'JSON array of DataToolCallRecord objects containing tool name, arguments, result, status, and execution time';
COMMENT ON COLUMN ai_messages.used_data_tools IS 'Flag indicating if this message involved Data Tool calls';
