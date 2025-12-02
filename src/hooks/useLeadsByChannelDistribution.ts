import { useQuery } from '@tanstack/react-query';
import { createClient } from '../utils/supabase/client';
import { format } from 'date-fns';

const supabase = createClient();

export interface LeadsByChannelDistribution {
  total: number;
  has_data: boolean;
  channels: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  chart_data: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
}

interface ChannelFilters {
  startDate: Date;
  endDate: Date;
}

export function useLeadsByChannelDistribution(workspaceId: string, filters: ChannelFilters) {
  return useQuery<LeadsByChannelDistribution | null>({
    queryKey: ['leads-by-channel-distribution', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_leads_by_channel_distribution', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd')
      });

      if (error) {
        console.error('Erro ao buscar distribuição de leads por canal:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}
