import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase/client';
import { LeadsCaptureEvolution } from '../types/leads.types';

export function useLeadsCaptureEvolution(workspaceId: string, days: number = 7) {
  return useQuery<LeadsCaptureEvolution | null>({
    queryKey: ['leads-capture-evolution', workspaceId, days],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase.rpc('get_leads_capture_evolution_chart', {
        p_workspace_id: workspaceId,
        p_days: days
      });

      if (error) {
        console.error('Erro ao buscar evolução de captação de leads:', error);
        throw error;
      }

      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1
  });
}