import { useState } from 'react';
import { supabase } from '../utils/supabase/client';

const RAG_MANAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-rag-manage`;

// MIME types permitidos
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'text/html': 'HTML',
  'text/csv': 'CSV',
  'application/json': 'JSON',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface UploadResult {
  success: boolean;
  document?: any;
  error?: string;
}

export function useRagUpload(agentId: string | null, defaultStoreName: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Verificar tipo
    if (!ALLOWED_MIME_TYPES[file.type]) {
      return {
        valid: false,
        error: `Tipo de arquivo não suportado: ${file.type}. Use: PDF, DOCX, TXT, MD, HTML, CSV ou JSON.`
      };
    }

    // Verificar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Arquivo muito grande. Máximo: 100MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      };
    }

    return { valid: true };
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:xxx;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // storeName pode ser passado como parâmetro para usar um valor atualizado
  // (útil quando o store é criado durante o upload)
  const uploadDocument = async (file: File, storeName?: string): Promise<UploadResult> => {
    const storeToUse = storeName || defaultStoreName;

    if (!agentId) {
      return { success: false, error: 'Agent ID não encontrado' };
    }

    if (!storeToUse) {
      return { success: false, error: 'Store não configurado' };
    }

    // Validar
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Converter para base64
      setUploadProgress(30);
      const base64Content = await fileToBase64(file);

      setUploadProgress(50);

      // Fazer upload
      const response = await fetch(RAG_MANAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'upload_document',
          agent_id: agentId,
          store_name: storeToUse,
          file_name: file.name,
          file_type: file.type,
          file_base64: base64Content
        })
      });

      setUploadProgress(90);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Falha no upload');
      }

      setUploadProgress(100);

      return {
        success: true,
        document: result.document
      };

    } catch (err: any) {
      console.error('[useRagUpload] Error:', err);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  return {
    uploadDocument,
    validateFile,
    isUploading,
    uploadProgress,
    allowedTypes: Object.keys(ALLOWED_MIME_TYPES)
  };
}
