import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';

const RAG_MANAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-rag-manage`;

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

    setIsLoading(true);

    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(RAG_MANAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'create_store',
          agent_id: agentId
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar store');
      }

      // Aguardar um pouco para o banco atualizar
      await new Promise(resolve => setTimeout(resolve, 500));

      // Buscar collection criada com retry
      let retries = 3;
      let data = null;

      while (retries > 0 && !data) {
        const { data: fetchedData, error: fetchError } = await supabase
          .from('ai_rag_collections')
          .select('*')
          .eq('agent_id', agentId)
          .maybeSingle();

        if (fetchError) {
          console.error('[useRagStore] Fetch error:', fetchError);
        }

        if (fetchedData) {
          data = fetchedData;
          break;
        }

        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!data) {
        throw new Error('Store criado mas collection não encontrada. Tente novamente.');
      }

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
