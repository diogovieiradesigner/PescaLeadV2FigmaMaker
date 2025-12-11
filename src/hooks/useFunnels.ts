import { useQuery } from '@tanstack/react-query';
import * as funnelsService from '../services/funnels-service';

/**
 * Hook para buscar funis de um workspace
 */
export function useFunnels(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['funnels', workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return { funnels: [], error: null };
      }
      return await funnelsService.getFunnelsByWorkspace(workspaceId);
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
