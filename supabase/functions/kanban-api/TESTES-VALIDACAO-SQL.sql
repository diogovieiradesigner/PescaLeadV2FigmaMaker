-- =============================================================================
-- TESTES DE VALIDAÇÃO SQL - Kanban API
-- =============================================================================
-- Validar dados que serão retornados pela API
-- =============================================================================

-- Dados de teste
\set workspace_id '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'
\set funnel_id '3657418b-d030-48d2-ba1b-87793dcd1d16'
\set column_id 'dae0e522-248e-4528-a458-8941c310158b'

-- =============================================================================
-- TESTE 1: Validar estrutura de funis
-- =============================================================================
SELECT 
  'TESTE 1: Funis' as teste,
  COUNT(*) as total_funis,
  COUNT(CASE WHEN is_active = true THEN 1 END) as funis_ativos
FROM funnels
WHERE workspace_id = :'workspace_id';

-- =============================================================================
-- TESTE 2: Validar estrutura de colunas
-- =============================================================================
SELECT 
  'TESTE 2: Colunas' as teste,
  COUNT(*) as total_colunas,
  COUNT(DISTINCT position) as posicoes_unicas
FROM funnel_columns
WHERE funnel_id = :'funnel_id';

-- =============================================================================
-- TESTE 3: Validar leads na coluna
-- =============================================================================
SELECT 
  'TESTE 3: Leads na Coluna' as teste,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as leads_ativos,
  COUNT(CASE WHEN emails_count > 0 THEN 1 END) as leads_com_email,
  COUNT(CASE WHEN whatsapp_valid = true THEN 1 END) as leads_com_whatsapp,
  MIN(position) as posicao_min,
  MAX(position) as posicao_max
FROM leads
WHERE column_id = :'column_id';

-- =============================================================================
-- TESTE 4: Validar query de leads (simular API)
-- =============================================================================
SELECT 
  'TESTE 4: Query Leads (limit 10)' as teste,
  COUNT(*) as total_no_banco,
  (SELECT COUNT(*) FROM (
    SELECT id
    FROM leads
    WHERE workspace_id = :'workspace_id'
      AND funnel_id = :'funnel_id'
      AND column_id = :'column_id'
      AND status = 'active'
    ORDER BY position
    LIMIT 10
  ) sub) as leads_retornados
FROM leads
WHERE workspace_id = :'workspace_id'
  AND funnel_id = :'funnel_id'
  AND column_id = :'column_id'
  AND status = 'active';

-- =============================================================================
-- TESTE 5: Validar filtro "Tem E-mail"
-- =============================================================================
SELECT 
  'TESTE 5: Filtro Tem E-mail' as teste,
  COUNT(*) as total_com_email,
  (SELECT COUNT(*) FROM (
    SELECT id
    FROM leads
    WHERE workspace_id = :'workspace_id'
      AND funnel_id = :'funnel_id'
      AND column_id = :'column_id'
      AND status = 'active'
      AND emails_count > 0
    ORDER BY position
    LIMIT 10
  ) sub) as leads_retornados
FROM leads
WHERE workspace_id = :'workspace_id'
  AND funnel_id = :'funnel_id'
  AND column_id = :'column_id'
  AND status = 'active'
  AND emails_count > 0;

-- =============================================================================
-- TESTE 6: Validar filtro "Tem WhatsApp"
-- =============================================================================
SELECT 
  'TESTE 6: Filtro Tem WhatsApp' as teste,
  COUNT(*) as total_com_whatsapp,
  (SELECT COUNT(*) FROM (
    SELECT id
    FROM leads
    WHERE workspace_id = :'workspace_id'
      AND funnel_id = :'funnel_id'
      AND column_id = :'column_id'
      AND status = 'active'
      AND whatsapp_valid = true
    ORDER BY position
    LIMIT 10
  ) sub) as leads_retornados
FROM leads
WHERE workspace_id = :'workspace_id'
  AND funnel_id = :'funnel_id'
  AND column_id = :'column_id'
  AND status = 'active'
  AND whatsapp_valid = true;

-- =============================================================================
-- TESTE 7: Validar performance dos índices
-- =============================================================================
EXPLAIN ANALYZE
SELECT 
  id,
  client_name,
  company,
  position,
  emails_count,
  whatsapp_valid
FROM leads
WHERE workspace_id = :'workspace_id'
  AND funnel_id = :'funnel_id'
  AND column_id = :'column_id'
  AND status = 'active'
ORDER BY position
LIMIT 10;

-- =============================================================================
-- TESTE 8: Validar performance com filtro
-- =============================================================================
EXPLAIN ANALYZE
SELECT 
  id,
  client_name,
  company,
  position,
  emails_count,
  whatsapp_valid
FROM leads
WHERE workspace_id = :'workspace_id'
  AND funnel_id = :'funnel_id'
  AND column_id = :'column_id'
  AND status = 'active'
  AND whatsapp_valid = true
ORDER BY position
LIMIT 10;

-- =============================================================================
-- TESTE 9: Validar todas as colunas do funil
-- =============================================================================
SELECT 
  'TESTE 9: Leads por Coluna' as teste,
  fc.id as column_id,
  fc.title as column_title,
  COUNT(l.id) as total_leads,
  COUNT(CASE WHEN l.emails_count > 0 THEN 1 END) as leads_com_email,
  COUNT(CASE WHEN l.whatsapp_valid = true THEN 1 END) as leads_com_whatsapp
FROM funnel_columns fc
LEFT JOIN leads l ON l.column_id = fc.id AND l.status = 'active'
WHERE fc.funnel_id = :'funnel_id'
GROUP BY fc.id, fc.title, fc.position
ORDER BY fc.position;

-- =============================================================================
-- TESTE 10: Validar estatísticas
-- =============================================================================
SELECT 
  'TESTE 10: Estatísticas' as teste,
  COUNT(*) as total_leads,
  COALESCE(SUM(deal_value), 0) as total_value,
  COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_leads
FROM leads
WHERE workspace_id = :'workspace_id'
  AND funnel_id = :'funnel_id'
  AND status = 'active';

