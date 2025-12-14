-- =====================================================
-- LEAD DOCUMENTS SYSTEM
-- Sistema de documentos estilo ClickUp/Notion para leads
-- =====================================================

-- 1. TABELA DE PASTAS DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS lead_document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS lead_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES lead_document_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Novo Documento',
  content JSONB DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  content_text TEXT DEFAULT '',
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE TEMPLATES DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS lead_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL,
  content_text TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE VERSÕES DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS lead_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES lead_documents(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  content_text TEXT DEFAULT '',
  version_number INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_lead_documents_lead_id ON lead_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_documents_workspace_id ON lead_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_documents_folder_id ON lead_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_lead_document_folders_lead_id ON lead_document_folders(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_document_templates_workspace_id ON lead_document_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_document_versions_document_id ON lead_document_versions(document_id);

-- 6. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_lead_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lead_documents_updated_at ON lead_documents;
CREATE TRIGGER trigger_lead_documents_updated_at
  BEFORE UPDATE ON lead_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_documents_updated_at();

DROP TRIGGER IF EXISTS trigger_lead_document_folders_updated_at ON lead_document_folders;
CREATE TRIGGER trigger_lead_document_folders_updated_at
  BEFORE UPDATE ON lead_document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_documents_updated_at();

DROP TRIGGER IF EXISTS trigger_lead_document_templates_updated_at ON lead_document_templates;
CREATE TRIGGER trigger_lead_document_templates_updated_at
  BEFORE UPDATE ON lead_document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_documents_updated_at();

-- 7. RLS POLICIES

-- Enable RLS
ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_document_versions ENABLE ROW LEVEL SECURITY;

-- Policies for lead_documents
CREATE POLICY "Users can view documents in their workspace"
  ON lead_documents FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents in their workspace"
  ON lead_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their workspace"
  ON lead_documents FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their workspace"
  ON lead_documents FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies for lead_document_folders
CREATE POLICY "Users can view folders in their workspace"
  ON lead_document_folders FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert folders in their workspace"
  ON lead_document_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update folders in their workspace"
  ON lead_document_folders FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete folders in their workspace"
  ON lead_document_folders FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies for lead_document_templates
CREATE POLICY "Users can view templates in their workspace"
  ON lead_document_templates FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert templates in their workspace"
  ON lead_document_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates in their workspace"
  ON lead_document_templates FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates in their workspace"
  ON lead_document_templates FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies for lead_document_versions
CREATE POLICY "Users can view versions of documents in their workspace"
  ON lead_document_versions FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM lead_documents WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert versions for documents in their workspace"
  ON lead_document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    document_id IN (
      SELECT id FROM lead_documents WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- 8. GRANTS
GRANT ALL ON lead_documents TO authenticated;
GRANT ALL ON lead_document_folders TO authenticated;
GRANT ALL ON lead_document_templates TO authenticated;
GRANT ALL ON lead_document_versions TO authenticated;
GRANT ALL ON lead_documents TO service_role;
GRANT ALL ON lead_document_folders TO service_role;
GRANT ALL ON lead_document_templates TO service_role;
GRANT ALL ON lead_document_versions TO service_role;
