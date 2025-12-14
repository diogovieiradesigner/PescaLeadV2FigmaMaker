-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/sql/new
-- =====================================================

-- 1. Criar bucket para arquivos de leads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-files',
  'lead-files',
  false,
  52428800, -- 50MB max
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed'
  ];

-- 2. Criar tabela para registrar arquivos dos leads
CREATE TABLE IF NOT EXISTS lead_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_files_lead_id ON lead_files(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_files_workspace_id ON lead_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_files_created_at ON lead_files(created_at DESC);

-- 4. RLS Policies
ALTER TABLE lead_files ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver arquivos do seu workspace
CREATE POLICY "Users can view lead files in their workspace"
ON lead_files FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Policy: Usuários podem inserir arquivos no seu workspace
CREATE POLICY "Users can insert lead files in their workspace"
ON lead_files FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Policy: Usuários podem atualizar arquivos do seu workspace
CREATE POLICY "Users can update lead files in their workspace"
ON lead_files FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Policy: Usuários podem deletar arquivos do seu workspace
CREATE POLICY "Users can delete lead files in their workspace"
ON lead_files FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- 5. Storage Policies para o bucket
CREATE POLICY "Users can upload lead files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lead-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view lead files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lead-files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete lead files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lead-files' AND
  auth.role() = 'authenticated'
);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_lead_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_files_updated_at ON lead_files;
CREATE TRIGGER lead_files_updated_at
  BEFORE UPDATE ON lead_files
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_files_updated_at();

-- Verificar
SELECT 'Tabela lead_files e bucket criados com sucesso!' as status;
