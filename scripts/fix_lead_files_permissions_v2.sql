-- =====================================================
-- FIX V2: Permissões mais permissivas para lead_files
-- O problema é que as políticas baseadas em workspace_members
-- podem estar falhando. Vamos testar com políticas mais simples.
-- =====================================================

-- 1. Dropar todas as políticas existentes
DROP POLICY IF EXISTS "Users can view lead files in their workspace" ON lead_files;
DROP POLICY IF EXISTS "Users can insert lead files in their workspace" ON lead_files;
DROP POLICY IF EXISTS "Users can update lead files in their workspace" ON lead_files;
DROP POLICY IF EXISTS "Users can delete lead files in their workspace" ON lead_files;

-- 2. Verificar se RLS está habilitado
ALTER TABLE lead_files ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas SIMPLES (qualquer usuário autenticado pode acessar)
-- Isso é temporário para teste - depois podemos restringir por workspace

-- SELECT - qualquer usuário autenticado pode ver
CREATE POLICY "Authenticated users can view lead files"
ON lead_files FOR SELECT
TO authenticated
USING (true);

-- INSERT - qualquer usuário autenticado pode inserir
CREATE POLICY "Authenticated users can insert lead files"
ON lead_files FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE - qualquer usuário autenticado pode atualizar
CREATE POLICY "Authenticated users can update lead files"
ON lead_files FOR UPDATE
TO authenticated
USING (true);

-- DELETE - qualquer usuário autenticado pode deletar
CREATE POLICY "Authenticated users can delete lead files"
ON lead_files FOR DELETE
TO authenticated
USING (true);

-- 4. Verificar resultado
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'lead_files'
ORDER BY policyname;

-- 5. Verificar se a tabela existe e tem as colunas corretas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'lead_files'
ORDER BY ordinal_position;
