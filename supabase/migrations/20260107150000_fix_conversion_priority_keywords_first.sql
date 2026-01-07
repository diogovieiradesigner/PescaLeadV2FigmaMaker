-- Migration: Fix conversion rate priority - keywords first, then last column
-- Date: 2026-01-07 15:00:00
-- Description: Atualiza get_funnel_stats para priorizar palavras-chave
--              (ganho, fechado, won) e só considerar última coluna se não houver
--              nenhuma coluna com palavras-chave no funil

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
  v_has_keyword_column boolean;
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

  -- ✅ PRIORIDADE: Verificar se existe alguma coluna com palavra-chave
  SELECT EXISTS(
    SELECT 1
    FROM funnel_columns fc
    WHERE fc.funnel_id = p_funnel_id
      AND (
        LOWER(fc.title) LIKE '%ganho%' OR
        LOWER(fc.title) LIKE '%fechado%' OR
        LOWER(fc.title) LIKE '%won%'
      )
  ) INTO v_has_keyword_column;

  -- ✅ FALLBACK: Buscar a última coluna do funil (maior position)
  -- Só será usada se NÃO houver colunas com palavras-chave
  SELECT fc.id INTO v_last_column_id
  FROM funnel_columns fc
  WHERE fc.funnel_id = p_funnel_id
  ORDER BY fc.position DESC
  LIMIT 1;

  -- Calcular total de leads
  SELECT COUNT(*)
  INTO v_total_leads
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id;

  -- Calcular valor total
  SELECT COALESCE(SUM(deal_value), 0)
  INTO v_total_value
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id;

  -- Calcular alta prioridade
  SELECT COUNT(*)
  INTO v_high_priority
  FROM leads
  WHERE funnel_id = p_funnel_id
    AND workspace_id = v_workspace_id
    AND priority = 'high';

  -- ✅ LÓGICA DE PRIORIDADE: Calcular leads convertidos
  -- PRIORIDADE 1: Se tiver coluna com palavra-chave (ganho, fechado, won) → usar APENAS essas
  -- PRIORIDADE 2: Se NÃO tiver palavra-chave → usar última coluna
  IF v_has_keyword_column THEN
    -- Usar APENAS colunas com palavras-chave
    SELECT COUNT(*)
    INTO v_converted_leads
    FROM leads l
    INNER JOIN funnel_columns fc ON l.column_id = fc.id
    WHERE l.funnel_id = p_funnel_id
      AND l.workspace_id = v_workspace_id
      AND (
        LOWER(fc.title) LIKE '%ganho%' OR
        LOWER(fc.title) LIKE '%fechado%' OR
        LOWER(fc.title) LIKE '%won%'
      );
  ELSE
    -- Usar última coluna como fallback
    SELECT COUNT(*)
    INTO v_converted_leads
    FROM leads l
    WHERE l.funnel_id = p_funnel_id
      AND l.workspace_id = v_workspace_id
      AND l.column_id = v_last_column_id;
  END IF;

  -- Calcular taxa de conversão
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
'Calcula estatísticas do funil. Prioriza colunas com palavras-chave (ganho, fechado, won) para conversão. Se não houver, usa última coluna.';
