/**
 * AI RAG Service
 * Gerencia documentos RAG (Retrieval-Augmented Generation) para agentes
 * Usa Gemini File Search API via edge functions
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface RAGDocument {
  id: string;
  agent_id: string;
  collection_id: string;
  title: string;
  file_type?: string;
  external_file_id: string;
  processing_status: 'uploading' | 'processing' | 'completed' | 'error';
  metadata: {
    original_size?: number;
    mime_type?: string;
  };
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RAGCollection {
  id: string;
  agent_id: string;
  external_store_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  total_documents: number;
  created_at: string;
  updated_at: string;
}

export interface RAGSearchResult {
  success: boolean;
  query: string;
  response: string;
  sources: Array<{
    content: string;
    title: string;
    uri: string;
  }>;
}

/**
 * Buscar documentos RAG de um agente
 */
export async function fetchRAGDocuments(agentId: string): Promise<RAGDocument[]> {
  const { data, error } = await supabase
    .from('ai_rag_documents')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AI-RAG-SERVICE] Error fetching documents:', error);
    throw new Error(`Failed to fetch RAG documents: ${error.message}`);
  }

  return data || [];
}

/**
 * Buscar coleção RAG de um agente
 */
export async function fetchRAGCollection(agentId: string): Promise<RAGCollection | null> {
  const { data, error } = await supabase
    .from('ai_rag_collections')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[AI-RAG-SERVICE] Error fetching collection:', error);
    throw new Error(`Failed to fetch RAG collection: ${error.message}`);
  }

  return data;
}

/**
 * Criar store do Gemini para um agente (se não existir)
 */
export async function createRAGStore(agentId: string): Promise<RAGCollection> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No active session');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-rag-manage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        'apikey': publicAnonKey,  // ✅ OBRIGATÓRIO: Kong exige apikey
      },
      body: JSON.stringify({
        action: 'create_store',
        agent_id: agentId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create RAG store');
  }

  const result = await response.json();

  // Buscar a coleção criada
  const collection = await fetchRAGCollection(agentId);
  if (!collection) {
    throw new Error('Store created but collection not found');
  }

  return collection;
}

/**
 * Upload de documento para Gemini File Search
 */
export async function uploadRAGDocument(
  agentId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<RAGDocument> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No active session. Please login again.');
    }

    // Verificar/criar store
    let collection = await fetchRAGCollection(agentId);
    if (!collection) {
      console.log('[AI-RAG-SERVICE] Creating store for agent:', agentId);
      collection = await createRAGStore(agentId);
    }

    if (!collection.external_store_id) {
      throw new Error('Store não tem external_store_id');
    }

    onProgress?.(10);

    // Converter arquivo para base64
    const base64 = await fileToBase64(file);
    onProgress?.(30);

    // Upload via edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-rag-manage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'apikey': publicAnonKey,  // ✅ OBRIGATÓRIO: Kong exige apikey
        },
        body: JSON.stringify({
          action: 'upload_document',
          agent_id: agentId,
          store_name: collection.external_store_id,
          file_base64: base64,
          file_name: file.name,
          file_type: file.type,
        }),
      }
    );

    onProgress?.(90);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload document');
    }

    const result = await response.json();
    onProgress?.(100);

    return result.document;
  } catch (error) {
    console.error('[AI-RAG-SERVICE] Error uploading document:', error);
    throw error;
  }
}

/**
 * Deletar documento do Gemini File Search
 */
export async function deleteRAGDocument(documentId: string, externalFileId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No active session. Please login again.');
    }

    // Deletar do Gemini via edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-rag-manage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'apikey': publicAnonKey,  // ✅ OBRIGATÓRIO: Kong exige apikey
        },
        body: JSON.stringify({
          action: 'delete_document',
          document_name: externalFileId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete document');
    }
  } catch (error) {
    console.error('[AI-RAG-SERVICE] Error deleting document:', error);
    throw error;
  }
}

/**
 * Buscar no RAG de um agente
 */
export async function searchRAG(agentId: string, query: string): Promise<RAGSearchResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-rag-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'apikey': publicAnonKey,  // ✅ OBRIGATÓRIO: Kong exige apikey
        },
        body: JSON.stringify({
          agent_id: agentId,
          query,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search RAG');
    }

    return await response.json();
  } catch (error) {
    console.error('[AI-RAG-SERVICE] Error searching RAG:', error);
    throw error;
  }
}

/**
 * Verificar se agente tem documentos RAG
 */
export async function hasRAGDocuments(agentId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('ai_rag_documents')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId);

  if (error) {
    console.error('[AI-RAG-SERVICE] Error checking documents:', error);
    return false;
  }

  return (count || 0) > 0;
}

/**
 * Contar documentos RAG de um agente
 */
export async function countRAGDocuments(agentId: string): Promise<number> {
  const { count, error } = await supabase
    .from('ai_rag_documents')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId);

  if (error) {
    console.error('[AI-RAG-SERVICE] Error counting documents:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Converter File para Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remover prefixo "data:mime/type;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Formatar tamanho do arquivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Tipos de arquivo suportados pelo Gemini
 */
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
];

export const SUPPORTED_EXTENSIONS = [
  '.pdf', '.docx', '.xlsx', '.txt', '.md', '.html', '.csv', '.json', '.xml'
];

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function isFileSupported(file: File): boolean {
  const isTypeSupported = SUPPORTED_FILE_TYPES.includes(file.type) ||
    SUPPORTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
  return isTypeSupported && file.size <= MAX_FILE_SIZE;
}

export function getFileTypeError(file: File): string | null {
  const isTypeSupported = SUPPORTED_FILE_TYPES.includes(file.type) ||
    SUPPORTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

  if (!isTypeSupported) {
    return 'Tipo de arquivo não suportado. Use PDF, DOCX, XLSX, TXT, MD, HTML, CSV, JSON ou XML.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Arquivo muito grande. Tamanho máximo: 100MB.';
  }
  return null;
}
