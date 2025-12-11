import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { format } from 'date-fns';
import type { AiVsHumanDistributionData, ConversationsFilters } from '../types/conversations.types';

/**
 * Hook para buscar distribuição I.A vs Humano
 * RPC: get_ai_vs_human_distribution
 */
export function useAiVsHumanDistribution(
  workspaceId: string | undefined,
  filters: ConversationsFilters
) {
  return useQuery<AiVsHumanDistributionData | null>({
    queryKey: ['ai-vs-human', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_ai_vs_human_distribution', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd'),
      });

      if (error) {
        console.error('[useAiVsHumanDistribution] Error:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}