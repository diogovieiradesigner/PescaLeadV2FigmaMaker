// ============================================
// FILTERED COUNTS SERVICE
// Busca contadores de leads filtrados do backend
// ============================================

import { supabase } from '../utils/supabase/client';

export interface FilteredCountsParams {
  funnelId: string;
  hasEmail: boolean;
  hasWhatsapp: boolean;
}

export interface ColumnCount {
  column_id: string;
  total_count: number;
}

/**
 * Busca contadores reais de leads por coluna aplicando filtros no backend
 * 
 * Esta função chama uma RPC do Supabase que faz a contagem DIRETAMENTE NO BANCO,
 * resolvendo o problema de contadores incorretos quando filtros são aplicados
 * em leads paginados no frontend.
 * 
 * @param params - Parâmetros de filtro
 * @returns Map com column_id -> total_count
 */
export async function getFilteredLeadCounts(
  params: FilteredCountsParams
): Promise<{
  counts: Map<string, number>;
  error: Error | null;
}> {
  try {
    console.log('[FILTERED-COUNTS] 🔍 Buscando contadores filtrados:', params);

    const { data, error } = await supabase.rpc('get_filtered_lead_counts', {
      p_funnel_id: params.funnelId,
      p_has_email: params.hasEmail,
      p_has_whatsapp: params.hasWhatsapp,
    });

    if (error) {
      console.error('[FILTERED-COUNTS] ❌ Erro ao buscar contadores:', error);
      return { counts: new Map(), error };
    }

    if (!data) {
      console.warn('[FILTERED-COUNTS] ⚠️ Nenhum dado retornado');
      return { counts: new Map(), error: null };
    }

    // Converter array para Map para acesso O(1)
    const countsMap = new Map<string, number>(
      (data as ColumnCount[]).map(c => [c.column_id, c.total_count])
    );

    console.log('[FILTERED-COUNTS] ✅ Contadores carregados:', {
      columns: countsMap.size,
      totals: Array.from(countsMap.entries()),
    });

    return { counts: countsMap, error: null };

  } catch (error) {
    console.error('[FILTERED-COUNTS] ❌ Erro inesperado:', error);
    return { counts: new Map(), error: error as Error };
  }
}

/**
 * Hook helper para usar contadores filtrados de forma reativa
 * (Opcional - pode ser integrado depois se necessário)
 */
export function useFilteredLeadCounts(
  funnelId: string | null,
  hasEmail: boolean,
  hasWhatsapp: boolean
) {
  // TODO: Implementar hook com useQuery se necessário
  // Por enquanto, usar a função diretamente é suficiente
}
