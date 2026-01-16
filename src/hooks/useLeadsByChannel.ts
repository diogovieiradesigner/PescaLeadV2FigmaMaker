import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../utils/supabase/client';
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

      // O RPC pode retornar arrays/objetos como strings JSON - fazer parse
      let result = data as any;
      
      if (!result || typeof result !== 'object') {
        return {
          total: 0,
          channels: {},
          chart_data: []
        };
      }

      // Parse de chart_data se vier como string
      if (typeof result.chart_data === 'string') {
        try {
          result.chart_data = JSON.parse(result.chart_data);
        } catch (e) {
          console.error('[useLeadsByChannel] Erro ao fazer parse de chart_data:', e);
          result.chart_data = [];
        }
      }
      
      // Parse de channels se vier como string
      if (typeof result.channels === 'string') {
        try {
          result.channels = JSON.parse(result.channels);
        } catch (e) {
          console.error('[useLeadsByChannel] Erro ao fazer parse de channels:', e);
          result.channels = {};
        }
      }

      // Garantir que chart_data seja sempre um array
      if (!Array.isArray(result.chart_data)) {
        result.chart_data = [];
      }
      
      // Garantir que channels seja um objeto
      if (!result.channels || typeof result.channels !== 'object') {
        result.channels = {};
      }

      return result as LeadsByChannel;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}