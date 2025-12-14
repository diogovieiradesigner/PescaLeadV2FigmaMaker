-- =====================================================
-- FIX V3: GRANT de permissões na tabela lead_files
-- O erro 42501 indica falta de GRANT, não problema de RLS
-- =====================================================

-- 1. Dar permissões de tabela para os roles do Supabase
GRANT ALL ON lead_files TO authenticated;
GRANT ALL ON lead_files TO service_role;
GRANT SELECT ON lead_files TO anon;

-- 2. Garantir que a sequence (se houver) também tenha permissão
-- (para gen_random_uuid() não precisa, mas por segurança)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 3. Verificar permissões atuais
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'lead_files'
ORDER BY grantee, privilege_type;
