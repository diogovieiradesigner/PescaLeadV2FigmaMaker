-- =====================================================
-- FIX: Permissões para tabela lead_files
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Dropar políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view lead files in their workspace" ON lead_files;
DROP POLICY IF EXISTS "Users can insert lead files in their workspace" ON lead_files;
DROP POLICY IF EXISTS "Users can update lead files in their workspace" ON lead_files;
DROP POLICY IF EXISTS "Users can delete lead files in their workspace" ON lead_files;

-- 2. Garantir que RLS está habilitado
ALTER TABLE lead_files ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas usando a mesma lógica das outras tabelas do sistema
-- Policy: SELECT - Usuários podem ver arquivos do seu workspace
CREATE POLICY "Users can view lead files in their workspace"
ON lead_files FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Policy: INSERT - Usuários podem inserir arquivos no seu workspace
CREATE POLICY "Users can insert lead files in their workspace"
ON lead_files FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Policy: UPDATE - Usuários podem atualizar arquivos do seu workspace
CREATE POLICY "Users can update lead files in their workspace"
ON lead_files FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Policy: DELETE - Usuários podem deletar arquivos do seu workspace
CREATE POLICY "Users can delete lead files in their workspace"
ON lead_files FOR DELETE
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- 4. Verificar/corrigir políticas do Storage
DROP POLICY IF EXISTS "Users can upload lead files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view lead files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete lead files" ON storage.objects;

-- Storage: Upload
CREATE POLICY "Users can upload lead files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lead-files');

-- Storage: View/Download
CREATE POLICY "Users can view lead files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lead-files');

-- Storage: Delete
CREATE POLICY "Users can delete lead files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lead-files');

-- 5. Verificar resultado
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
