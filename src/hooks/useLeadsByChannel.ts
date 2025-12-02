import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { createClient } from '../utils/supabase/client';
import { LeadsFilters } from '../types/leads.types';

// Tipo de retorno baseado na documentação RPC
interface LeadsByChannel {
  total: number;
  channels: {
    whatsapp?: number;
    instagram?: number;
    email?: number;
    form?: number;
    extraction?: number;
    manual?: number;
    other?: number;
  };
  chart_data: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
}

const supabase = createClient();

export function useLeadsByChannel(workspaceId: string, filters: LeadsFilters) {
  return useQuery<LeadsByChannel | null>({
    queryKey: ['leads-by-channel', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_leads_by_channel', {
        p_workspace_id: workspaceId,
        p_start_date: format(filters.startDate, 'yyyy-MM-dd'),
        p_end_date: format(filters.endDate, 'yyyy-MM-dd')
      });

      if (error) {
        console.error('Erro ao buscar leads por canal:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}
