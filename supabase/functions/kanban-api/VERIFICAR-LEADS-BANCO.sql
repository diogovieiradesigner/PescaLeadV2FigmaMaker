-- =============================================================================
-- Script para verificar se há leads no banco para o funil
-- =============================================================================

-- 1. Verificar se há leads no funil
SELECT 
  COUNT(*) as total_leads,
  COUNT(DISTINCT column_id) as colunas_com_leads
FROM leads
WHERE workspace_id = '47e86ae3-4d5c-4e03-a881-293fa802424d'
  AND funnel_id = '16712ae6-78b5-47d4-9504-b66e84315341'
  AND status = 'active';

-- 2. Verificar leads por coluna
SELECT 
  fc.title as coluna,
  fc.id as column_id,
  COUNT(l.id) as total_leads
FROM funnel_columns fc
LEFT JOIN leads l ON l.column_id = fc.id 
  AND l.workspace_id = '47e86ae3-4d5c-4e03-a881-293fa802424d'
  AND l.funnel_id = '16712ae6-78b5-47d4-9504-b66e84315341'
  AND l.status = 'active'
WHERE fc.funnel_id = '16712ae6-78b5-47d4-9504-b66e84315341'
GROUP BY fc.id, fc.title, fc.position
ORDER BY fc.position;

-- 3. Verificar se as colunas existem
SELECT 
  id,
  title,
  position
FROM funnel_columns
WHERE funnel_id = '16712ae6-78b5-47d4-9504-b66e84315341'
ORDER BY position;

-- 4. Verificar alguns leads (se existirem)
SELECT 
  id,
  client_name,
  company,
  column_id,
  position,
  status,
  emails_count,
  whatsapp_valid
FROM leads
WHERE workspace_id = '47e86ae3-4d5c-4e03-a881-293fa802424d'
  AND funnel_id = '16712ae6-78b5-47d4-9504-b66e84315341'
  AND status = 'active'
ORDER BY position
LIMIT 10;

