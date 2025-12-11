-- =============================================================================
-- QUERY: Verificar Leads com E-mail no Funil "Email Gih"
-- =============================================================================
-- Verifica quantos leads realmente têm e-mails no funil específico
-- =============================================================================

-- 1. Encontrar o workspace "Lead Food" e o funil "Email Gih"
SELECT 
  w.id AS workspace_id,
  w.name AS workspace_name,
  f.id AS funnel_id,
  f.name AS funnel_name
FROM workspaces w
JOIN funnels f ON f.workspace_id = w.id
WHERE w.name ILIKE '%Lead Food%' 
  AND f.name ILIKE '%Email Gih%'
LIMIT 5;

-- 2. Verificar leads com e-mails usando emails_count (campo direto na tabela leads)
-- Substitua WORKSPACE_ID e FUNNEL_ID pelos valores encontrados acima
SELECT 
  COUNT(*) AS total_leads,
  COUNT(CASE WHEN emails_count > 0 THEN 1 END) AS leads_com_email_count,
  COUNT(CASE WHEN emails_count = 0 OR emails_count IS NULL THEN 1 END) AS leads_sem_email_count
FROM leads
WHERE workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'  -- Substituir pelo workspace_id real
  AND funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'      -- Substituir pelo funnel_id real
  AND status = 'active';

-- 3. Verificar leads com e-mails usando custom_fields (verificação mais precisa)
-- Verifica se há custom_fields do tipo "email" associados aos leads
SELECT 
  COUNT(DISTINCT l.id) AS total_leads_com_email_custom_field
FROM leads l
JOIN lead_custom_values lcv ON lcv.lead_id = l.id
JOIN custom_fields cf ON cf.id = lcv.custom_field_id
WHERE l.workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'  -- Substituir pelo workspace_id real
  AND l.funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'      -- Substituir pelo funnel_id real
  AND l.status = 'active'
  AND cf.field_type = 'email'
  AND lcv.value IS NOT NULL 
  AND lcv.value != '';

-- 4. Comparação detalhada: emails_count vs custom_fields
SELECT 
  l.id,
  l.client_name,
  l.emails_count,
  COUNT(DISTINCT lcv.id) AS custom_fields_email_count,
  STRING_AGG(DISTINCT lcv.value, ', ') AS emails_encontrados
FROM leads l
LEFT JOIN lead_custom_values lcv ON lcv.lead_id = l.id
LEFT JOIN custom_fields cf ON cf.id = lcv.custom_field_id AND cf.field_type = 'email'
WHERE l.workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'  -- Substituir pelo workspace_id real
  AND l.funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'      -- Substituir pelo funnel_id real
  AND l.status = 'active'
GROUP BY l.id, l.client_name, l.emails_count
HAVING l.emails_count > 0 OR COUNT(DISTINCT lcv.id) > 0
ORDER BY l.emails_count DESC, custom_fields_email_count DESC
LIMIT 20;

-- 5. Verificar por coluna (para entender distribuição)
SELECT 
  fc.title AS column_title,
  COUNT(*) AS total_leads,
  COUNT(CASE WHEN l.emails_count > 0 THEN 1 END) AS leads_com_email_count,
  COUNT(CASE WHEN l.emails_count = 0 OR l.emails_count IS NULL THEN 1 END) AS leads_sem_email_count
FROM leads l
JOIN funnel_columns fc ON fc.id = l.column_id
WHERE l.workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'  -- Substituir pelo workspace_id real
  AND l.funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'      -- Substituir pelo funnel_id real
  AND l.status = 'active'
GROUP BY fc.id, fc.title, fc.position
ORDER BY fc.position;

