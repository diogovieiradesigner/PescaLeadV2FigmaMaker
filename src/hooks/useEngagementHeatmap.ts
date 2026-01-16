import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { EngagementHeatmap, DashboardFilters } from '../types/dashboard.types';

export function useEngagementHeatmap(
  workspaceId: string,
  filters: DashboardFilters
) {
  return useQuery({
    queryKey: ['engagement-heatmap', workspaceId, filters],
    queryFn: async (): Promise<EngagementHeatmap> => {
      const { data, error } = await supabase.rpc('get_engagement_heatmap', {
        p_workspace_id: workspaceId,
        p_start_date: filters.startDate.toISOString().split('T')[0],
        p_end_date: filters.endDate.toISOString().split('T')[0],
      });

      if (error) throw error;
      
      // O RPC pode retornar objetos/arrays como strings JSON - fazer parse
      let result = data as any;
      
      if (!result || typeof result !== 'object') {
        return {
          heatmap: {},
          best_slot: null,
          max_value: 0,
          legend: [],
          days: [],
          hours: [],
          insight: 'Nenhum dado disponível',
          generated_at: new Date().toISOString(),
        };
      }
      
      // Parse de campos que podem vir como string
      if (typeof result.heatmap === 'string') {
        try {
          result.heatmap = JSON.parse(result.heatmap);
        } catch (e) {
          console.error('[useEngagementHeatmap] Erro ao fazer parse de heatmap:', e);
          result.heatmap = {};
        }
      }
      
      if (typeof result.legend === 'string') {
        try {
          result.legend = JSON.parse(result.legend);
        } catch (e) {
          console.error('[useEngagementHeatmap] Erro ao fazer parse de legend:', e);
          result.legend = [];
        }
      }
      
      if (typeof result.days === 'string') {
        try {
          result.days = JSON.parse(result.days);
        } catch (e) {
          console.error('[useEngagementHeatmap] Erro ao fazer parse de days:', e);
          result.days = [];
        }
      }
      
      if (typeof result.hours === 'string') {
        try {
          result.hours = JSON.parse(result.hours);
        } catch (e) {
          console.error('[useEngagementHeatmap] Erro ao fazer parse de hours:', e);
          result.hours = [];
        }
      }
      
      if (typeof result.best_slot === 'string') {
        try {
          result.best_slot = JSON.parse(result.best_slot);
        } catch (e) {
          console.error('[useEngagementHeatmap] Erro ao fazer parse de best_slot:', e);
          result.best_slot = null;
        }
      }
      
      // Validar tipos
      if (!result.heatmap || typeof result.heatmap !== 'object') {
        result.heatmap = {};
      }
      
      if (!Array.isArray(result.legend)) {
        result.legend = [];
      }
      
      if (!Array.isArray(result.days)) {
        result.days = [];
      }
      
      if (!Array.isArray(result.hours)) {
        result.hours = [];
      }
      
      return result as EngagementHeatmap;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!workspaceId,
  });
}