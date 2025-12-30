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
      
      // O RPC pode retornar objetos como strings JSON - fazer parse
      let result = data as any;
      
      if (!result || typeof result !== 'object') {
        return {
          period: {
            start: filters.startDate.toISOString(),
            end: filters.endDate.toISOString(),
            days: 0,
            comparison_start: filters.startDate.toISOString(),
            comparison_end: filters.endDate.toISOString(),
          },
          cards: {
            leads: { value: 0, previous: 0, change_percent: 0 },
            conversations: { value: 0, previous: 0, change_percent: 0 },
            messages: { value: 0, previous: 0, change_percent: 0 },
            economy_hours: { value: 0, previous: 0, change_percent: 0 },
          },
          conversations_breakdown: {
            total: 0,
            ai: 0,
            human: 0,
            resolved: 0,
            ai_percentage: 0,
          },
          messages_breakdown: {
            total: 0,
            sent: 0,
            received: 0,
            by_ai: 0,
            by_human: 0,
            ai_percentage: 0,
          },
          followups: {
            created: 0,
            sent: 0,
            with_response: 0,
            response_rate: 0,
          },
          generated_at: new Date().toISOString(),
        };
      }
      
      // Parse de objetos aninhados que podem vir como string
      const objectFields = ['period', 'cards', 'conversations_breakdown', 'messages_breakdown', 'followups'];
      
      for (const field of objectFields) {
        if (typeof result[field] === 'string') {
          try {
            result[field] = JSON.parse(result[field]);
          } catch (e) {
            console.error(`[useDashboardSummary] Erro ao fazer parse de ${field}:`, e);
            // Manter valor padrão
          }
        }
      }
      
      // Parse de sub-objetos dentro de 'cards' se necessário
      if (result.cards && typeof result.cards === 'object') {
        const cardFields = ['leads', 'conversations', 'messages', 'economy_hours'];
        for (const cardField of cardFields) {
          if (typeof result.cards[cardField] === 'string') {
            try {
              result.cards[cardField] = JSON.parse(result.cards[cardField]);
            } catch (e) {
              console.error(`[useDashboardSummary] Erro ao fazer parse de cards.${cardField}:`, e);
              result.cards[cardField] = { value: 0, previous: 0, change_percent: 0 };
            }
          }
        }
      }
      
      return result as DashboardSummary;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos (igual ao cache do backend)
    enabled: !!workspaceId,
  });
}