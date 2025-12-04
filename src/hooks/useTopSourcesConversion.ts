import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../utils/supabase/client';
import { TopSourcesByConversion, LeadsFilters } from '../types/leads.types';

export function useTopSourcesConversion(workspaceId: string, filters: LeadsFilters, limit: number = 5) {
  return useQuery<TopSourcesByConversion | null>({
    queryKey: ['top-sources-conversion', workspaceId, filters, limit],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_top_sources_by_conversion', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd'),
        p_limit: limit
      });

      if (error) {
        console.error('Erro ao buscar top fontes por conversão:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}