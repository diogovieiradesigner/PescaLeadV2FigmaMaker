import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';

const RAG_MANAGE_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/ai-rag-manage';

interface RagCollection {
  id: string;
  agent_id: string;
  external_store_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  total_documents: number;
  created_at: string;
  updated_at: string;
}

interface UseRagStoreReturn {
  collection: RagCollection | null;
  isLoading: boolean;
  error: string | null;
  ensureStoreExists: () => Promise<RagCollection>;
}

export function useRagStore(agentId: string | null): UseRagStoreReturn {
  const [collection, setCollection] = useState<RagCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar collection existente
  useEffect(() => {
    async function loadCollection() {
      if (!agentId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('ai_rag_collections')
          .select('*')
          .eq('agent_id', agentId)
          .maybeSingle();

        if (fetchError) {
          console.error('[useRagStore] Error fetching collection:', fetchError);
          throw fetchError;
        }

        console.log('[useRagStore] Collection loaded:', data?.name || 'None');
        setCollection(data);
      } catch (err: any) {
        console.error('[useRagStore] Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadCollection();
  }, [agentId]);

  // Criar store se não existir
  const ensureStoreExists = async (): Promise<RagCollection> => {
    if (collection) return collection;

    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    console.log('[useRagStore] Creating new store for agent:', agentId);
    setIsLoading(true);
    
    try {
      const response = await fetch(RAG_MANAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_store',
          agent_id: agentId
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar store');
      }

      console.log('[useRagStore] Store created successfully');

      // Buscar collection criada
      const { data, error: fetchError } = await supabase
        .from('ai_rag_collections')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (fetchError) throw fetchError;

      setCollection(data);
      return data;
    } catch (err: any) {
      console.error('[useRagStore] Error creating store:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { collection, isLoading, error, ensureStoreExists };
}
