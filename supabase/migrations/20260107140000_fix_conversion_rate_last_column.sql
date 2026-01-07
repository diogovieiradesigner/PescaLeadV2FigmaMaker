-- Migration: Fix conversion rate to include last column
-- Date: 2026-01-07 14:00:00
-- Description: Atualiza get_funnel_stats para considerar também a última coluna
--              do funil como conversão, além das colunas com 'ganho', 'fechado', 'won'

CREATE OR REPLACE FUNCTION public.get_funnel_stats(p_funnel_id uuid)
RETURNS TABLE(total_leads bigint, total_value numeric, high_priority_count bigint, active_leads bigint, conversion_rate numeric)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_workspace_id uuid;
  v_total_leads bigint;
  v_total_value numeric;
  v_high_priority bigint;
  v_converted_leads bigint;
  v_conversion_rate numeric;
  v_last_column_id uuid;
BEGIN
  -- Buscar workspace_id do funil
  SELECT workspace_id INTO v_workspace_id
  FROM funnels
  WHERE id = p_funnel_id;

  -- Se o funil não existe, retornar zeros
  IF v_workspace_id IS NULL THEN
    RETURN QUERY
    SELECT 0::bigint, 0::numeric, 0::bigint, 0::bigint, 0::numeric;
    RETURN;
  END IF;

  -- ✅ NOVO: Buscar a última coluna do funil (maior position)
  SELECT fc.id INTO v_last_column_id
  FROM funnel_columns fc
  WHERE fc.funnel_id = p_funnel_id
  ORDER BY fc.position DESC
  LIMIT 1;

  -- ✅ Calcular total de leads
  SELECT COUNT(*)
  INTO v_total_leads
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id;

  -- ✅ Calcular valor total
  SELECT COALESCE(SUM(deal_value), 0)
  INTO v_total_value
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id;

  -- ✅ Calcular alta prioridade
  SELECT COUNT(*)
  INTO v_high_priority
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id
    AND priority = 'high';

  -- ✅ ALTERAÇÃO: Calcular leads convertidos
  -- Considera:
  -- 1. Colunas com nome contendo 'ganho', 'fechado', 'won'
  -- 2. OU a última coluna do funil (maior position)
  SELECT COUNT(*)
  INTO v_converted_leads
  FROM leads l
  INNER JOIN funnel_columns fc ON l.column_id = fc.id
  WHERE l.funnel_id = p_funnel_id
    AND l.workspace_id = v_workspace_id
    AND (
      LOWER(fc.title) LIKE '%ganho%' OR
      LOWER(fc.title) LIKE '%fechado%' OR
      LOWER(fc.title) LIKE '%won%' OR
      fc.id = v_last_column_id  -- ✅ NOVO: Considera última coluna como conversão
    );

  -- ✅ Calcular taxa de conversão
  IF v_total_leads > 0 THEN
    v_conversion_rate := ROUND((v_converted_leads::numeric / v_total_leads::numeric) * 100, 0);
  ELSE
    v_conversion_rate := 0;
  END IF;

  -- Retornar resultados
  RETURN QUERY
  SELECT
    v_total_leads,
    v_total_value,
    v_high_priority,
    v_total_leads, -- active_leads = total_leads
    v_conversion_rate;
END;
$function$;

COMMENT ON FUNCTION public.get_funnel_stats(uuid) IS
'Calcula estatísticas do funil. Atualizado em 2026-01-07 para considerar última coluna como conversão.';
