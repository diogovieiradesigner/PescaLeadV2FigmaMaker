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
      
      // O RPC pode retornar arrays como strings JSON - fazer parse
      let result = data as any;
      
      if (!result) {
        return {
          funnel_id: '',
          period: { start: filters.startDate.toISOString(), end: filters.endDate.toISOString() },
          columns: [],
          conversion_rates: [],
          summary: {
            total_first_stage: 0,
            total_last_stage: 0,
            total_conversion_rate: 0,
          },
          generated_at: new Date().toISOString(),
        };
      }
      
      // Parse de campos que podem vir como string
      if (typeof result.columns === 'string') {
        try {
          result.columns = JSON.parse(result.columns);
        } catch (e) {
          console.error('[useFunnelAnalytics] Erro ao fazer parse de columns:', e);
          result.columns = [];
        }
      }
      
      if (typeof result.conversion_rates === 'string') {
        try {
          result.conversion_rates = JSON.parse(result.conversion_rates);
        } catch (e) {
          console.error('[useFunnelAnalytics] Erro ao fazer parse de conversion_rates:', e);
          result.conversion_rates = [];
        }
      }
      
      if (typeof result.summary === 'string') {
        try {
          result.summary = JSON.parse(result.summary);
        } catch (e) {
          console.error('[useFunnelAnalytics] Erro ao fazer parse de summary:', e);
          result.summary = {
            total_first_stage: 0,
            total_last_stage: 0,
            total_conversion_rate: 0,
          };
        }
      }
      
      // Validar que os arrays foram parseados corretamente
      if (!Array.isArray(result.columns)) {
        result.columns = [];
      }
      
      if (!Array.isArray(result.conversion_rates)) {
        result.conversion_rates = [];
      }
      
      // Garantir que summary tenha a estrutura correta
      if (!result.summary || typeof result.summary !== 'object') {
        result.summary = {
          total_first_stage: 0,
          total_last_stage: 0,
          total_conversion_rate: 0,
        };
      }
      
      return result as FunnelAnalytics;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!workspaceId,
  });
}