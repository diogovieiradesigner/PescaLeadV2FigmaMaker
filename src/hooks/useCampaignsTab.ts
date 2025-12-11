import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { format, subDays } from 'date-fns';

interface UseCampaignsTabParams {
  workspaceId: string;
  periodDays?: number;
  rankingLimit?: number;
}

interface CampaignsTabData {
  stats_cards: {
    sent: {
      value: number;
      previous: number;
      change_percent: number;
    };
    messages: {
      value: number;
      previous: number;
      change_percent: number;
    };
    response_rate: {
      value: number;
      previous: number;
      change_pp: number;
      responses: number;
    };
    best_slot: {
      day: string;
      hours: string;
      rate: number;
    };
    period: {
      start: string;
      end: string;
      comparison_start: string;
      comparison_end: string;
    };
  };
  ranking: {
    order_by: string;
    limit: number;
    campaigns: Array<{
      position: number;
      id: string;
      name: string;
      sent: number;
      responses: number;
      response_rate: number;
    }>;
  };
  response_heatmap: {
    has_data: boolean;
    matrix: Array<{
      day: string;
      day_idx: number;
      slots: Array<{
        hour: string;
        hour_idx: number;
        rate: number;
        sent: number;
        received: number;
        level: 'low' | 'medium' | 'high' | 'very_high';
        color: string;
      }>;
    }>;
    best_slot: {
      day: string;
      hours: string;
      rate: number;
      insight: string;
    };
    avoid_insight: string;
    legend: Array<{ label: string; color: string }>;
  };
}

export function useCampaignsTab({ 
  workspaceId, 
  periodDays = 30,
  rankingLimit = 10
}: UseCampaignsTabParams) {
  const endDate = new Date();
  const startDate = subDays(endDate, periodDays);

  return useQuery<CampaignsTabData>({
    queryKey: ['campaigns-tab', workspaceId, periodDays, rankingLimit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_campaigns_tab_complete', {
        p_workspace_id: workspaceId,
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
        p_ranking_limit: rankingLimit
      });

      if (error) {
        console.error('❌ Erro ao buscar dados de campanhas:', error);
        throw error;
      }
      
      if (!data) {
        console.warn('⚠️ Nenhum dado retornado pela RPC');
      } else {
        console.log('✅ Dados de campanhas carregados:', {
          hasStatsCards: !!data.stats_cards,
          hasRanking: !!data.ranking,
          hasHeatmap: !!data.response_heatmap
        });
      }
      
      return data;
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });
}