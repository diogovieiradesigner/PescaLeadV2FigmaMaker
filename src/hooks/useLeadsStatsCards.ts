import { useQuery } from '@tanstack/react-query';
import { createClient } from '../utils/supabase/client';
import { format } from 'date-fns';

const supabase = createClient();

export interface LeadsStatsCards {
  captured: {
    value: number;
    previous: number;
    change_percent: number;
  };
  qualification_rate: {
    value: number;
    qualified: number;
    total: number;
    previous_rate: number;
    change_percent: number;
  };
  funnel_time: {
    value_days: number;
    previous_days: number;
    change_minutes: number;
    is_improvement: boolean;
  };
  period: {
    start: string;
    end: string;
    comparison_start: string;
    comparison_end: string;
  };
}

interface LeadsStatsFilters {
  startDate: Date;
  endDate: Date;
  funnelId?: string | null;
}

export function useLeadsStatsCards(workspaceId: string, filters: LeadsStatsFilters) {
  return useQuery<LeadsStatsCards | null>({
    queryKey: ['leads-stats-cards', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_leads_stats_cards', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd'),
        p_funnel_id: filters.funnelId || null
      });

      if (error) {
        console.error('Erro ao buscar cards de estatísticas de leads:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}
