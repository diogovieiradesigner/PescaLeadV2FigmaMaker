import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { TopRankings, DashboardFilters } from '../types/dashboard.types';

export function useTopRankings(
  workspaceId: string,
  filters: DashboardFilters,
  rankingType: 'all' | 'leads_engaged' | 'attendants' | 'sources' | 'campaigns' = 'all',
  limit: number = 5
) {
  return useQuery({
    queryKey: ['top-rankings', workspaceId, filters, rankingType, limit],
    queryFn: async (): Promise<TopRankings> => {
      const { data, error } = await supabase.rpc('get_top_rankings', {
        p_workspace_id: workspaceId,
        p_start_date: filters.startDate.toISOString().split('T')[0],
        p_end_date: filters.endDate.toISOString().split('T')[0],
        p_ranking_type: rankingType,
        p_limit: limit,
      });

      if (error) throw error;
      return data as TopRankings;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!workspaceId,
  });
}