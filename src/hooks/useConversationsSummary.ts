import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { format } from 'date-fns';
import type { ConversationsSummaryData, ConversationsFilters } from '../types/conversations.types';

/**
 * Hook para buscar resumo de conversas (cards principais)
 * RPC: get_conversations_summary
 */
export function useConversationsSummary(
  workspaceId: string | undefined,
  filters: ConversationsFilters
) {
  return useQuery<ConversationsSummaryData | null>({
    queryKey: ['conversations-summary', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_conversations_summary', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd'),
      });

      if (error) {
        console.error('[useConversationsSummary] Error:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}