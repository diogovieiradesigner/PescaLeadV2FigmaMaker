import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { format, subDays } from 'date-fns';
import { IATabCompleteData } from '../types/ia-tab.types';

interface UseIATabParams {
  workspaceId: string;
  periodDays?: number;
  minutesPerAIMsg?: number;
  minutesPerFollowup?: number;
  hourlyRate?: number;
}

export function useIATab({ 
  workspaceId, 
  periodDays = 30,
  minutesPerAIMsg = 2,
  minutesPerFollowup = 3,
  hourlyRate = 25.00
}: UseIATabParams) {
  const endDate = new Date();
  const startDate = subDays(endDate, periodDays);

  return useQuery<IATabCompleteData>({
    queryKey: ['ia-tab', workspaceId, periodDays, minutesPerAIMsg, minutesPerFollowup, hourlyRate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ia_tab_complete', {
        p_workspace_id: workspaceId,
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
        p_minutes_per_ai_msg: minutesPerAIMsg,
        p_minutes_per_followup: minutesPerFollowup,
        p_hourly_rate: hourlyRate
      });

      if (error) {
        console.error('❌ Erro ao buscar dados de I.A:', error);
        throw error;
      }
      
      if (!data) {
        console.warn('⚠️ Nenhum dado retornado pela RPC');
      } else {
        console.log('✅ Dados de I.A carregados:', {
          hasStatsCards: !!data.stats_cards,
          hasIAvsHuman: !!data.ia_vs_human,
          hasSuccessRate: !!data.success_rate,
          hasFollowupStats: !!data.followup_stats,
          hasTimeSavings: !!data.time_savings
        });
      }
      
      return data;
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });
}
