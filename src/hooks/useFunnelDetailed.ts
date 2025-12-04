import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../utils/supabase/client';
import { FunnelDetailed, LeadsFilters } from '../types/leads.types';

export function useFunnelDetailed(workspaceId: string, filters: LeadsFilters) {
  return useQuery<FunnelDetailed | null>({
    queryKey: ['funnel-detailed', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_funnel_detailed', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd'),
        p_funnel_id: filters.funnelId || null
      });

      if (error) {
        console.error('Erro ao buscar funil detalhado:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}