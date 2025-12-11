import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';

interface RagDocument {
  id: string;
  agent_id: string;
  collection_id: string;
  title: string;
  file_type: string;
  external_file_id: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: {
    original_size: number;
    mime_type: string;
  };
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

interface UseRagDocumentsReturn {
  documents: RagDocument[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRagDocuments(agentId: string | null): UseRagDocumentsReturn {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!agentId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('ai_rag_documents')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[useRagDocuments] Error fetching documents:', fetchError);
        throw fetchError;
      }

      console.log('[useRagDocuments] Documents loaded:', data?.length || 0);
      setDocuments(data || []);
    } catch (err: any) {
      console.error('[useRagDocuments] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [agentId]);

  return { documents, isLoading, error, refetch: fetchDocuments };
}

export type { RagDocument };
