import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { format } from 'date-fns';
import type { ResponseTimeComparisonData, ConversationsFilters } from '../types/conversations.types';

/**
 * Hook para buscar comparação de tempo de resposta I.A vs Humano
 * RPC: get_response_time_comparison
 */
export function useResponseTimeComparison(
  workspaceId: string | undefined,
  filters: ConversationsFilters
) {
  return useQuery<ResponseTimeComparisonData | null>({
    queryKey: ['response-time', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_response_time_comparison', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd'),
      });

      if (error) {
        console.error('[useResponseTimeComparison] Error:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}