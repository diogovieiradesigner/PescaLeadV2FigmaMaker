import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createClient } from '../utils/supabase/client';
import { LeadsSummary, LeadsFilters } from '../types/leads.types';

const supabase = createClient();

export function useLeadsSummary(workspaceId: string, filters: LeadsFilters) {
  return useQuery<LeadsSummary | null>({
    queryKey: ['leads-summary', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_leads_summary', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd'),
        p_funnel_id: filters.funnelId || null
      });

      if (error) {
        console.error('Erro ao buscar resumo de leads:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}