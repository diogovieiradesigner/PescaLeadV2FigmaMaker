import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { FunnelAnalytics, DashboardFilters } from '../types/dashboard.types';

export function useFunnelAnalytics(
  workspaceId: string,
  filters: DashboardFilters
) {
  return useQuery({
    queryKey: ['funnel-analytics', workspaceId, filters],
    queryFn: async (): Promise<FunnelAnalytics> => {
      const { data, error } = await supabase.rpc('get_funnel_analytics', {
        p_workspace_id: workspaceId,
        p_start_date: filters.startDate.toISOString().split('T')[0],
        p_end_date: filters.endDate.toISOString().split('T')[0],
        p_funnel_id: filters.funnelId || null,
      });

      if (error) throw error;
      return data as FunnelAnalytics;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!workspaceId,
  });
}