-- =============================================================================
-- DIAGNÓSTICO COMPLETO DE CAMPANHA
-- Execute esta query substituindo 'SEU_CONFIG_ID' pelo ID da campanha
-- =============================================================================

WITH config_info AS (
  SELECT 
    cc.*,
    -- Verificar inbox
    ii.id AS inbox_instance_id,
    i.id AS instance_id,
    i.status AS instance_status,
    i.provider AS instance_provider,
    -- Verificar colunas
    fc_source.id AS source_column_exists,
    fc_target.id AS target_column_exists,
    -- Verificar campanha running
    cr_running.id AS running_run_id
  FROM campaign_configs cc
  LEFT JOIN inbox_instances ii ON ii.inbox_id = cc.inbox_id
  LEFT JOIN instances i ON i.id = ii.instance_id
  LEFT JOIN funnel_columns fc_source ON fc_source.id = cc.source_column_id
  LEFT JOIN funnel_columns fc_target ON fc_target.id = cc.target_column_id
  LEFT JOIN campaign_runs cr_running ON cr_running.config_id = cc.id AND cr_running.status = 'running'
  WHERE cc.id = 'SEU_CONFIG_ID' -- ⚠️ SUBSTITUA AQUI
)
SELECT 
  '=== VALIDAÇÕES ===' AS secao,
  CASE 
    WHEN ci.id IS NULL THEN '❌ Config não encontrada'
    ELSE '✅ Config encontrada'
  END AS config_status,
  
  CASE 
    WHEN ci.inbox_instance_id IS NULL THEN '❌ Inbox não encontrado'
    WHEN ci.instance_id IS NULL THEN '❌ Instância não vinculada'
    WHEN ci.instance_status != 'connected' THEN '❌ Instância desconectada: ' || ci.instance_status
    ELSE '✅ Instância conectada'
  END AS instance_status,
  
  CASE 
    WHEN ci.source_column_exists IS NULL THEN '❌ Coluna origem não encontrada'
    ELSE '✅ Coluna origem OK'
  END AS source_column_status,
  
  CASE 
    WHEN ci.target_column_exists IS NULL THEN '❌ Coluna destino não encontrada'
    ELSE '✅ Coluna destino OK'
  END AS target_column_status,
  
  CASE 
    WHEN ci.start_time IS NULL OR ci.end_time IS NULL THEN '⚠️ Horários não configurados'
    WHEN ci.start_time > ci.end_time THEN '❌ start_time > end_time'
    ELSE '✅ Horários válidos'
  END AS time_range_status,
  
  CASE 
    WHEN ci.daily_limit IS NULL OR ci.daily_limit < 1 OR ci.daily_limit > 500 THEN '❌ daily_limit inválido: ' || COALESCE(ci.daily_limit::text, 'NULL')
    ELSE '✅ daily_limit OK: ' || ci.daily_limit
  END AS daily_limit_status,
  
  CASE 
    WHEN ci.min_interval_seconds IS NULL OR ci.min_interval_seconds < 30 THEN '❌ min_interval_seconds inválido: ' || COALESCE(ci.min_interval_seconds::text, 'NULL')
    ELSE '✅ min_interval_seconds OK: ' || ci.min_interval_seconds
  END AS interval_status,
  
  CASE 
    WHEN ci.running_run_id IS NOT NULL THEN '⚠️ Já existe campanha running: ' || ci.running_run_id
    ELSE '✅ Nenhuma campanha running'
  END AS running_status

FROM config_info ci

UNION ALL

SELECT 
  '=== DADOS DA CONFIG ===' AS secao,
  'ID: ' || ci.id AS config_status,
  'Inbox ID: ' || ci.inbox_id AS instance_status,
  'Source Column: ' || ci.source_column_id AS source_column_status,
  'Target Column: ' || ci.target_column_id AS target_column_status,
  'Start Time: ' || COALESCE(ci.start_time::text, 'NULL') AS time_range_status,
  'End Time: ' || COALESCE(ci.end_time::text, 'NULL') AS daily_limit_status,
  'Daily Limit: ' || COALESCE(ci.daily_limit::text, 'NULL') AS interval_status,
  'Min Interval: ' || COALESCE(ci.min_interval_seconds::text, 'NULL') AS running_status
FROM config_info ci;

-- =============================================================================
-- VERIFICAR SE HÁ LEADS DISPONÍVEIS
-- =============================================================================

-- Execute esta query também para verificar se há leads elegíveis
-- Substitua os valores pelos da sua campanha

SELECT 
  COUNT(*) AS leads_disponiveis,
  COUNT(CASE WHEN l.primary_phone IS NOT NULL AND l.whatsapp_valid = TRUE THEN 1 END) AS leads_com_whatsapp_valido
FROM leads l
WHERE l.workspace_id = 'SEU_WORKSPACE_ID' -- ⚠️ SUBSTITUA
  AND l.column_id = 'SEU_SOURCE_COLUMN_ID' -- ⚠️ SUBSTITUA (Coluna de Origem)
  AND l.deleted_at IS NULL;

