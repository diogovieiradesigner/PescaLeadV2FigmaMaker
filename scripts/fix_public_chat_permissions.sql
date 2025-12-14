-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/sql/new
-- =====================================================

-- Garantir permissões para postgres (owner)
GRANT ALL ON ai_public_chat_links TO postgres;
GRANT ALL ON ai_public_chat_conversations TO postgres;

-- Garantir permissões para service_role (usado pelas edge functions)
GRANT ALL ON ai_public_chat_links TO service_role;
GRANT ALL ON ai_public_chat_conversations TO service_role;

-- Garantir permissões para authenticated (usuários logados)
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_public_chat_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_public_chat_conversations TO authenticated;

-- Garantir permissões para anon (acesso público via RPC)
GRANT SELECT ON ai_public_chat_links TO anon;
GRANT SELECT ON ai_public_chat_conversations TO anon;

-- Garantir que conversations e messages também tem permissões (para criar conversas públicas)
GRANT SELECT, INSERT, UPDATE ON conversations TO service_role;
GRANT SELECT, INSERT ON messages TO service_role;

-- Garantir permissão na tabela de agentes
GRANT SELECT ON ai_agents TO service_role;

-- Verificar permissões atuais
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('ai_public_chat_links', 'ai_public_chat_conversations')
ORDER BY table_name, grantee;

-- Verificar se as permissões foram aplicadas
SELECT 'Permissoes aplicadas com sucesso!' as status;
