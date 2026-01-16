/**
 * AI Assistant RAG Service
 * Gerencia a base de conhecimento do AI Assistant
 */

import { SUPABASE_URL } from '../utils/api-config';
import { supabase } from '../utils/supabase/client';
import type { AssistantRagDocument, AssistantRagStore, RagSearchResult } from '../types/ai-assistant';

const RAG_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-assistant-rag`;

async function callRagFunction(action: string, params: Record<string, any>) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(RAG_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

// ============================================================================
// Import/Export Conversations
// ============================================================================

/**
 * Importa uma conversa para o RAG
 */
export async function importConversationToRag(
  workspaceId: string,
  conversationId: string
): Promise<{ document: AssistantRagDocument }> {
  return callRagFunction('import_conversation', {
    workspace_id: workspaceId,
    conversation_id: conversationId,
  });
}

/**
 * Verifica se uma conversa já foi importada
 */
export async function checkConversationImported(
  workspaceId: string,
  conversationId: string
): Promise<{ imported: boolean; imported_at?: string }> {
  return callRagFunction('check_imported', {
    workspace_id: workspaceId,
    conversation_id: conversationId,
  });
}

// ============================================================================
// Document Management
// ============================================================================

/**
 * Lista todos os documentos do RAG do workspace
 */
export async function listRagDocuments(
  workspaceId: string
): Promise<{ documents: AssistantRagDocument[]; total: number; store_id?: string }> {
  return callRagFunction('list_documents', {
    workspace_id: workspaceId,
  });
}

/**
 * Deleta um documento do RAG
 */
export async function deleteRagDocument(documentId: string): Promise<void> {
  await callRagFunction('delete_document', {
    document_id: documentId,
  });
}

// ============================================================================
// Search
// ============================================================================

/**
 * Busca no RAG do workspace
 */
export async function searchRag(
  workspaceId: string,
  query: string
): Promise<RagSearchResult> {
  return callRagFunction('search', {
    workspace_id: workspaceId,
    query,
  });
}

// ============================================================================
// Store Management
// ============================================================================

/**
 * Busca o store RAG do workspace (via Edge Function para evitar problemas de RLS)
 */
export async function getRagStore(workspaceId: string): Promise<AssistantRagStore | null> {
  try {
    const result = await listRagDocuments(workspaceId);
    if (result.store_id) {
      return {
        id: '',
        workspace_id: workspaceId,
        external_store_id: result.store_id,
        total_documents: result.total,
        created_at: '',
        updated_at: '',
      };
    }
    return null;
  } catch (error) {
    console.error('[RAG Service] Error fetching store:', error);
    return null;
  }
}

/**
 * Conta documentos importados (via Edge Function)
 */
export async function countRagDocuments(workspaceId: string): Promise<number> {
  try {
    const result = await listRagDocuments(workspaceId);
    return result.total || 0;
  } catch (error) {
    console.error('[RAG Service] Error counting documents:', error);
    return 0;
  }
}
