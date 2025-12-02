-- ============================================
-- SCRIPT DE TESTE - DASHBOARD ANALYTICS BACKEND
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- para verificar se o backend está configurado
-- ============================================

-- 1. Verificar se as FUNÇÕES RPC existem
SELECT 
  routine_name as "Função",
  CASE 
    WHEN routine_name = 'get_dashboard_summary' THEN '✅'
    WHEN routine_name = 'get_leads_by_channel' THEN '✅'
    WHEN routine_name = 'get_funnel_analytics' THEN '✅'
    WHEN routine_name = 'get_engagement_heatmap' THEN '✅'
    WHEN routine_name = 'get_top_rankings' THEN '✅'
    ELSE '❓'
  END as "Status"
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (
  routine_name = 'get_dashboard_summary'
  OR routine_name = 'get_leads_by_channel'
  OR routine_name = 'get_funnel_analytics'
  OR routine_name = 'get_engagement_heatmap'
  OR routine_name = 'get_top_rankings'
)
ORDER BY routine_name;

-- Resultado esperado: 5 funções encontradas
-- Se retornar 0 linhas, o backend não está configurado

-- ============================================

-- 2. Verificar se as TABELAS OLAP existem
SELECT 
  table_name as "Tabela",
  CASE 
    WHEN table_name = 'analytics_daily_summary' THEN '✅'
    WHEN table_name = 'analytics_period_cache' THEN '✅'
    WHEN table_name = 'analytics_rankings' THEN '✅'
    WHEN table_name = 'analytics_funnel_snapshot' THEN '✅'
    ELSE '❓'
  END as "Status"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name = 'analytics_daily_summary'
  OR table_name = 'analytics_period_cache'
  OR table_name = 'analytics_rankings'
  OR table_name = 'analytics_funnel_snapshot'
)
ORDER BY table_name;

-- Resultado esperado: 4 tabelas encontradas
-- Se retornar 0 linhas, as tabelas OLAP não existem

-- ============================================

-- 3. Verificar se há DADOS nas tabelas analytics
SELECT 
  'analytics_daily_summary' as tabela,
  COUNT(*) as total_registros
FROM analytics_daily_summary
WHERE EXISTS (SELECT 1 FROM analytics_daily_summary)

UNION ALL

SELECT 
  'analytics_period_cache' as tabela,
  COUNT(*) as total_registros
FROM analytics_period_cache
WHERE EXISTS (SELECT 1 FROM analytics_period_cache)

UNION ALL

SELECT 
  'analytics_rankings' as tabela,
  COUNT(*) as total_registros
FROM analytics_rankings
WHERE EXISTS (SELECT 1 FROM analytics_rankings);

-- Resultado esperado: dados > 0
-- Se todas retornarem 0, precisa fazer backfill

-- ============================================

-- 4. TESTE DE CHAMADA SIMULADA (substitua os valores)
-- 
-- ⚠️ IMPORTANTE: 
-- Substitua 'SEU_WORKSPACE_ID_AQUI' pelo ID real do seu workspace
-- antes de executar este teste
-- ============================================

-- Teste get_dashboard_summary
SELECT get_dashboard_summary(
  'SEU_WORKSPACE_ID_AQUI'::uuid,
  (CURRENT_DATE - INTERVAL '30 days')::text,
  CURRENT_DATE::text,
  'all'
);

-- Se funcionar, retorna JSON com dados do dashboard
-- Se der erro, mostrará a mensagem de erro

-- ============================================

-- 5. Verificar TRIGGERS
SELECT 
  trigger_name as "Trigger",
  event_object_table as "Tabela",
  action_statement as "Ação"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (
  trigger_name LIKE 'trg_analytics_%'
  OR trigger_name LIKE '%_analytics_%'
)
ORDER BY trigger_name;

-- Resultado esperado: 4+ triggers encontrados
-- Se retornar 0 linhas, os triggers não estão configurados

-- ============================================
-- DIAGNÓSTICO RÁPIDO
-- ============================================

DO $$
DECLARE
  v_functions_count INTEGER;
  v_tables_count INTEGER;
  v_triggers_count INTEGER;
  v_data_count INTEGER;
BEGIN
  -- Contar funções
  SELECT COUNT(*) INTO v_functions_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_dashboard_summary',
    'get_leads_by_channel',
    'get_funnel_analytics',
    'get_engagement_heatmap',
    'get_top_rankings'
  );

  -- Contar tabelas
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'analytics_daily_summary',
    'analytics_period_cache',
    'analytics_rankings',
    'analytics_funnel_snapshot'
  );

  -- Contar triggers
  SELECT COUNT(*) INTO v_triggers_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'trg_analytics_%';

  -- Verificar se há dados
  EXECUTE 'SELECT COUNT(*) FROM analytics_daily_summary' INTO v_data_count;

  -- Exibir resultado
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 DIAGNÓSTICO DO DASHBOARD ANALYTICS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Funções RPC: % de 5', v_functions_count;
  RAISE NOTICE '✅ Tabelas OLAP: % de 4', v_tables_count;
  RAISE NOTICE '✅ Triggers: %', v_triggers_count;
  RAISE NOTICE '✅ Registros em analytics_daily_summary: %', v_data_count;
  RAISE NOTICE '';

  IF v_functions_count = 5 AND v_tables_count = 4 THEN
    RAISE NOTICE '🎉 BACKEND COMPLETO! O Dashboard Analytics está pronto.';
  ELSIF v_functions_count = 0 AND v_tables_count = 0 THEN
    RAISE NOTICE '❌ BACKEND NÃO CONFIGURADO!';
    RAISE NOTICE '   Execute o script de criação em:';
    RAISE NOTICE '   /supabase/analytics/01_create_analytics_tables.sql';
  ELSE
    RAISE NOTICE '⚠️  BACKEND PARCIALMENTE CONFIGURADO';
    RAISE NOTICE '   Verifique os scripts em /supabase/analytics/';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao executar diagnóstico: %', SQLERRM;
    RAISE NOTICE '   Possível causa: Tabelas analytics não existem';
END $$;
