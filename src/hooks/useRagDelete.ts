import { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import type { RagDocument } from './useRagDocuments';

const RAG_MANAGE_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://nlbcwaxkeaddfocigwuk.supabase.co'}/functions/v1/ai-rag-manage`;

export function useRagDelete() {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const deleteDocument = async (document: RagDocument): Promise<{ success: boolean; error?: string }> => {
    setIsDeleting(document.id);

    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const response = await fetch(RAG_MANAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'delete_document',
          document_name: document.external_file_id
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Falha ao deletar');
      }

      return { success: true };

    } catch (err: any) {
      console.error('[useRagDelete] Error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsDeleting(null);
    }
  };

  return { deleteDocument, isDeleting };
}
