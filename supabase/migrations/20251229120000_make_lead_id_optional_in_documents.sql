-- ============================================================================
-- Migration: Make lead_id optional in documents and folders
-- ============================================================================
-- OBJETIVO: Permitir criação de documentos e pastas sem associação obrigatória a um lead
-- MUDANÇAS:
--   1. lead_id em lead_documents: NOT NULL → NULL
--   2. lead_id em lead_document_folders: NOT NULL → NULL
--   3. Atualizar foreign key constraint para ON DELETE SET NULL
-- ============================================================================

-- ============================================================================
-- 1. ALTERAR COLUNA lead_id EM lead_documents
-- ============================================================================

-- Remover constraint NOT NULL
ALTER TABLE public.lead_documents
  ALTER COLUMN lead_id DROP NOT NULL;

-- Recriar foreign key com ON DELETE SET NULL (ao invés de CASCADE)
ALTER TABLE public.lead_documents
  DROP CONSTRAINT IF EXISTS lead_documents_lead_id_fkey;

ALTER TABLE public.lead_documents
  ADD CONSTRAINT lead_documents_lead_id_fkey
  FOREIGN KEY (lead_id)
  REFERENCES public.leads(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.lead_documents.lead_id IS
'Lead associado (OPCIONAL). NULL = documento sem lead específico.';

-- ============================================================================
-- 2. ALTERAR COLUNA lead_id EM lead_document_folders
-- ============================================================================

-- Remover constraint NOT NULL
ALTER TABLE public.lead_document_folders
  ALTER COLUMN lead_id DROP NOT NULL;

-- Recriar foreign key com ON DELETE SET NULL (ao invés de CASCADE)
ALTER TABLE public.lead_document_folders
  DROP CONSTRAINT IF EXISTS lead_document_folders_lead_id_fkey;

ALTER TABLE public.lead_document_folders
  ADD CONSTRAINT lead_document_folders_lead_id_fkey
  FOREIGN KEY (lead_id)
  REFERENCES public.leads(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.lead_document_folders.lead_id IS
'Lead associado (OPCIONAL). NULL = pasta compartilhada sem lead específico.';

-- ============================================================================
-- 3. ATUALIZAR RLS POLICIES (já estão corretas, não precisam mudança)
-- ============================================================================
-- As policies baseadas em workspace_id continuam funcionando normalmente
-- Documentos/pastas sem lead ainda pertencem ao workspace

-- ============================================================================
-- RESUMO DA MIGRAÇÃO
-- ============================================================================
-- ✅ lead_id opcional em lead_documents (NULL permitido)
-- ✅ lead_id opcional em lead_document_folders (NULL permitido)
-- ✅ Foreign keys com ON DELETE SET NULL (ao deletar lead, documentos ficam orfãos)
-- ✅ RLS continua funcionando (baseado em workspace_id)
--
-- RESULTADO: Documentos e pastas podem existir sem lead associado
-- ============================================================================
