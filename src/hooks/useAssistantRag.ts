import { useState, useEffect, useCallback } from 'react';
import {
  importConversationToRag,
  checkConversationImported,
  listRagDocuments,
  deleteRagDocument,
  countRagDocuments,
} from '../services/ai-assistant-rag-service';
import type { AssistantRagDocument } from '../types/ai-assistant';
import { toast } from 'sonner';

// ============================================================================
// useRagImport - Hook para importar conversa para o RAG
// ============================================================================

interface UseRagImportReturn {
  isImporting: boolean;
  isImported: boolean;
  importedAt: string | null;
  importConversation: () => Promise<void>;
  checkImported: () => Promise<void>;
}

export function useRagImport(
  workspaceId: string | null,
  conversationId: string | null
): UseRagImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [importedAt, setImportedAt] = useState<string | null>(null);

  const checkImported = useCallback(async () => {
    if (!workspaceId || !conversationId) return;

    try {
      const result = await checkConversationImported(workspaceId, conversationId);
      setIsImported(result.imported);
      setImportedAt(result.imported_at || null);
    } catch (error) {
      console.error('[useRagImport] Error checking imported:', error);
    }
  }, [workspaceId, conversationId]);

  // Verificar ao carregar
  useEffect(() => {
    checkImported();
  }, [checkImported]);

  const importConversation = useCallback(async () => {
    if (!workspaceId || !conversationId) return;

    setIsImporting(true);
    try {
      await importConversationToRag(workspaceId, conversationId);
      setIsImported(true);
      setImportedAt(new Date().toISOString());
      toast.success('Conversa salva na base de conhecimento!');
    } catch (error: any) {
      console.error('[useRagImport] Error importing:', error);
      toast.error(error.message || 'Erro ao salvar conversa');
    } finally {
      setIsImporting(false);
    }
  }, [workspaceId, conversationId]);

  return {
    isImporting,
    isImported,
    importedAt,
    importConversation,
    checkImported,
  };
}

// ============================================================================
// useRagDocuments - Hook para listar e gerenciar documentos do RAG
// ============================================================================

interface UseRagDocumentsReturn {
  documents: AssistantRagDocument[];
  totalDocuments: number;
  savedConversationIds: string[]; // IDs das conversas já salvas no RAG
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
}

export function useRagDocuments(workspaceId: string | null): UseRagDocumentsReturn {
  const [documents, setDocuments] = useState<AssistantRagDocument[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [savedConversationIds, setSavedConversationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listRagDocuments(workspaceId);
      setDocuments(result.documents);
      setTotalDocuments(result.total);
      // Extrair IDs das conversas salvas
      const ids = result.documents
        .map(doc => doc.conversation_id)
        .filter((id): id is string => !!id);
      setSavedConversationIds(ids);
    } catch (err: any) {
      console.error('[useRagDocuments] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      await deleteRagDocument(documentId);
      // Remover da lista local
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      setTotalDocuments(prev => Math.max(0, prev - 1));
      toast.success('Conversa removida da base de conhecimento');
    } catch (err: any) {
      console.error('[useRagDocuments] Error deleting:', err);
      toast.error(err.message || 'Erro ao remover conversa');
      throw err;
    }
  }, []);

  return {
    documents,
    totalDocuments,
    savedConversationIds,
    isLoading,
    error,
    refresh,
    deleteDocument,
  };
}

// ============================================================================
// useRagCount - Hook simples para contar documentos
// ============================================================================

export function useRagCount(workspaceId: string | null): {
  count: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setIsLoading(false);
      return;
    }

    try {
      const total = await countRagDocuments(workspaceId);
      setCount(total);
    } catch (err) {
      console.error('[useRagCount] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, isLoading, refresh };
}
