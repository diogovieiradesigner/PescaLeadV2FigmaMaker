-- =============================================================================
-- Migration: AI Assistant RAG System
-- =============================================================================
-- Sistema de RAG (Retrieval-Augmented Generation) para o AI Assistant
-- Permite importar conversas para uma base de conhecimento por workspace
-- Usa Gemini File Search API para busca semântica
-- =============================================================================

-- Store do Gemini por workspace (1 store por workspace)
CREATE TABLE IF NOT EXISTS ai_assistant_rag_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  external_store_id TEXT,  -- Gemini store name (ex: fileSearchStores/xxx)
  total_documents INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id)
);

-- Conversas importadas para o RAG
CREATE TABLE IF NOT EXISTS ai_assistant_rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES ai_assistant_rag_stores(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  external_file_id TEXT,  -- Gemini document name
  title TEXT NOT NULL,
  message_count INT DEFAULT 0,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, conversation_id)  -- Permite apenas 1 doc por conversa
);

-- =============================================================================
-- Índices
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_assistant_rag_stores_workspace
ON ai_assistant_rag_stores(workspace_id);

CREATE INDEX IF NOT EXISTS idx_ai_assistant_rag_documents_store
ON ai_assistant_rag_documents(store_id);

CREATE INDEX IF NOT EXISTS idx_ai_assistant_rag_documents_conversation
ON ai_assistant_rag_documents(conversation_id);

-- =============================================================================
-- Funções auxiliares
-- =============================================================================

-- Função para incrementar contador de documentos
CREATE OR REPLACE FUNCTION increment_assistant_rag_documents(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_assistant_rag_stores
  SET total_documents = total_documents + 1,
      updated_at = NOW()
  WHERE id = p_store_id;
END;
$$;

-- Função para decrementar contador de documentos
CREATE OR REPLACE FUNCTION decrement_assistant_rag_documents(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_assistant_rag_stores
  SET total_documents = GREATEST(total_documents - 1, 0),
      updated_at = NOW()
  WHERE id = p_store_id;
END;
$$;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Trigger para decrementar contador quando documento é deletado
CREATE OR REPLACE FUNCTION trigger_decrement_rag_doc_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM decrement_assistant_rag_documents(OLD.store_id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_assistant_rag_doc_count ON ai_assistant_rag_documents;
CREATE TRIGGER trg_decrement_assistant_rag_doc_count
AFTER DELETE ON ai_assistant_rag_documents
FOR EACH ROW
EXECUTE FUNCTION trigger_decrement_rag_doc_count();

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE ai_assistant_rag_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assistant_rag_documents ENABLE ROW LEVEL SECURITY;

-- Stores: usuários podem ver/criar stores do seu workspace
DROP POLICY IF EXISTS "Users can view own workspace rag stores" ON ai_assistant_rag_stores;
CREATE POLICY "Users can view own workspace rag stores" ON ai_assistant_rag_stores
FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert own workspace rag stores" ON ai_assistant_rag_stores;
CREATE POLICY "Users can insert own workspace rag stores" ON ai_assistant_rag_stores
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own workspace rag stores" ON ai_assistant_rag_stores;
CREATE POLICY "Users can update own workspace rag stores" ON ai_assistant_rag_stores
FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Documents: usuários podem ver/criar/deletar docs do seu workspace
DROP POLICY IF EXISTS "Users can view own workspace rag documents" ON ai_assistant_rag_documents;
CREATE POLICY "Users can view own workspace rag documents" ON ai_assistant_rag_documents
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT id FROM ai_assistant_rag_stores
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert own workspace rag documents" ON ai_assistant_rag_documents;
CREATE POLICY "Users can insert own workspace rag documents" ON ai_assistant_rag_documents
FOR INSERT TO authenticated
WITH CHECK (
  store_id IN (
    SELECT id FROM ai_assistant_rag_stores
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete own workspace rag documents" ON ai_assistant_rag_documents;
CREATE POLICY "Users can delete own workspace rag documents" ON ai_assistant_rag_documents
FOR DELETE TO authenticated
USING (
  store_id IN (
    SELECT id FROM ai_assistant_rag_stores
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

-- =============================================================================
-- Grants
-- =============================================================================

GRANT EXECUTE ON FUNCTION increment_assistant_rag_documents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_assistant_rag_documents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_assistant_rag_documents(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_assistant_rag_documents(UUID) TO service_role;

-- Permissões para service_role (Edge Functions)
GRANT ALL ON ai_assistant_rag_stores TO service_role;
GRANT ALL ON ai_assistant_rag_documents TO service_role;

-- Comentários
COMMENT ON TABLE ai_assistant_rag_stores IS 'Stores do Gemini File Search por workspace para o AI Assistant';
COMMENT ON TABLE ai_assistant_rag_documents IS 'Conversas importadas para o RAG do AI Assistant';
COMMENT ON COLUMN ai_assistant_rag_stores.external_store_id IS 'ID do store no Gemini (fileSearchStores/xxx)';
COMMENT ON COLUMN ai_assistant_rag_documents.external_file_id IS 'ID do documento no Gemini';
