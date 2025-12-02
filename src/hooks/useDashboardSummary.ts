import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { DashboardSummary, DashboardFilters } from '../types/dashboard.types';

export function useDashboardSummary(
  workspaceId: string,
  filters: DashboardFilters
) {
  return useQuery({
    queryKey: ['dashboard-summary', workspaceId, filters],
    queryFn: async (): Promise<DashboardSummary> => {
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_workspace_id: workspaceId,
        p_start_date: filters.startDate.toISOString().split('T')[0],
        p_end_date: filters.endDate.toISOString().split('T')[0],
        p_funnel_filter: filters.funnelFilter || 'all',
      });

      if (error) throw error;
      return data as DashboardSummary;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos (igual ao cache do backend)
    enabled: !!workspaceId,
  });
}