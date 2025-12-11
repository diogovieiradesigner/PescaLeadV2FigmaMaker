/**
 * AI RAG Service
 * Gerencia documentos RAG (Retrieval-Augmented Generation)
 */

import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface RAGDocument {
  id: string;
  agent_id: string;
  collection_id: string;
  title: string;
  external_file_id: string;
  processing_status: 'uploading' | 'processing' | 'ready' | 'error';
  metadata: {
    file_size?: string;
    vectors_count?: number;
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
  created_at: string;
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
 * Upload de documento para Gemini File Search
 */
export async function uploadRAGDocument(
  agentId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<RAGDocument> {
  try {
    // Obter token de autenticação
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error('No active session. Please login again.');
    }

    // Converter arquivo para base64
    const base64 = await fileToBase64(file);

    // Preparar payload
    const payload = {
      agent_id: agentId,
      title: file.name,
      file_data: base64,
      mime_type: file.type,
      file_size: formatFileSize(file.size),
    };

    // Enviar para Edge Function
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/ai/rag/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload document');
    }

    const result = await response.json();
    return result.document;
  } catch (error) {
    console.error('[AI-RAG-SERVICE] Error uploading document:', error);
    throw error;
  }
}

/**
 * Deletar documento do Gemini File Search
 */
export async function deleteRAGDocument(documentId: string): Promise<void> {
  try {
    // Obter token de autenticação
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error('No active session. Please login again.');
    }

    // Enviar para Edge Function
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/ai/rag/documents/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Verificar tipos de arquivo suportados
 */
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
];

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function isFileSupported(file: File): boolean {
  return SUPPORTED_FILE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE;
}

export function getFileTypeError(file: File): string | null {
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return 'Tipo de arquivo não suportado. Use PDF, DOCX, TXT, MD, HTML, CSV ou JSON.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Arquivo muito grande. Tamanho máximo: 100MB.';
  }
  return null;
}