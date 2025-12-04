import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { format } from 'date-fns';
import type { AttendantsRankingData, ConversationsFilters } from '../types/conversations.types';

/**
 * Hook para buscar ranking de atendentes
 * RPC: get_attendants_ranking
 */
export function useAttendantsRanking(
  workspaceId: string | undefined,
  filters: ConversationsFilters,
  limit: number = 5
) {
  return useQuery<AttendantsRankingData | null>({
    queryKey: ['attendants-ranking', workspaceId, filters, limit],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_attendants_ranking', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd'),
        p_limit: limit,
      });

      if (error) {
        console.error('[useAttendantsRanking] Error:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}