import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { EngagementHeatmap, DashboardFilters } from '../types/dashboard.types';

export function useEngagementHeatmap(
  workspaceId: string,
  filters: DashboardFilters
) {
  return useQuery({
    queryKey: ['engagement-heatmap', workspaceId, filters],
    queryFn: async (): Promise<EngagementHeatmap> => {
      const { data, error } = await supabase.rpc('get_engagement_heatmap', {
        p_workspace_id: workspaceId,
        p_start_date: filters.startDate.toISOString().split('T')[0],
        p_end_date: filters.endDate.toISOString().split('T')[0],
      });

      if (error) throw error;
      return data as EngagementHeatmap;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!workspaceId,
  });
}