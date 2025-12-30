import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';

interface UseRagEnabledReturn {
  ragEnabled: boolean;
  isLoading: boolean;
  toggleRagEnabled: () => Promise<void>;
  setRagEnabled: (enabled: boolean) => Promise<void>;
}

export function useRagEnabled(agentId: string | null): UseRagEnabledReturn {
  const [ragEnabled, setRagEnabledState] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar estado atual do banco de dados
  useEffect(() => {
    async function loadRagEnabled() {
      if (!agentId) {
        setIsLoading(false);
        return;
      }

      try {

        const { data, error } = await supabase
          .from('ai_agents')
          .select('rag_enabled')
          .eq('id', agentId)
          .single();

        if (error) {
          console.error('[useRagEnabled] Error loading state:', error);
          throw error;
        }

        const enabled = data?.rag_enabled ?? true;
        setRagEnabledState(enabled);
      } catch (err) {
        console.error('[useRagEnabled] Failed to load state:', err);
        // Manter default true em caso de erro
      } finally {
        setIsLoading(false);
      }
    }

    loadRagEnabled();
  }, [agentId]);

  // Atualizar estado no banco de dados
  const setRagEnabled = async (enabled: boolean) => {
    if (!agentId) {
      console.error('[useRagEnabled] Cannot update: agentId is null');
      throw new Error('agentId is required');
    }

    try {

      const { error } = await supabase
        .from('ai_agents')
        .update({ rag_enabled: enabled })
        .eq('id', agentId);

      if (error) {
        console.error('[useRagEnabled] Error updating state:', error);
        throw error;
      }

      setRagEnabledState(enabled);
    } catch (err) {
      console.error('[useRagEnabled] Failed to update state:', err);
      throw err;
    }
  };

  // Toggle estado
  const toggleRagEnabled = async () => {
    await setRagEnabled(!ragEnabled);
  };

  return {
    ragEnabled,
    isLoading,
    toggleRagEnabled,
    setRagEnabled
  };
}
