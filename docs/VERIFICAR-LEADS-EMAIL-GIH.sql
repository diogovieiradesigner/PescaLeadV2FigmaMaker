-- =============================================================================
-- VERIFICAÇÃO: Leads com E-mail no Funil "Email Gih" - Workspace "Lead Food"
-- =============================================================================
-- Verifica se realmente existem 386 leads com e-mails
-- =============================================================================

-- 1. Encontrar workspace "Lead Food" e funil "Email Gih"
SELECT 
  w.id AS workspace_id,
  w.name AS workspace_name,
  f.id AS funnel_id,
  f.name AS funnel_name
FROM workspaces w
JOIN funnels f ON f.workspace_id = w.id
WHERE w.name ILIKE '%Lead Food%' 
  AND f.name ILIKE '%Email Gih%'
LIMIT 1;

-- 2. Contar total de leads e leads com e-mail (usando emails_count)
-- ⚠️ IMPORTANTE: Substituir os IDs pelos valores encontrados acima
SELECT 
  COUNT(*) AS total_leads,
  COUNT(CASE WHEN emails_count > 0 THEN 1 END) AS leads_com_email_emails_count,
  COUNT(CASE WHEN emails_count = 0 OR emails_count IS NULL THEN 1 END) AS leads_sem_email_emails_count,
  ROUND(100.0 * COUNT(CASE WHEN emails_count > 0 THEN 1 END) / COUNT(*), 2) AS percentual_com_email
FROM leads
WHERE workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'  -- ⚠️ Substituir pelo workspace_id real
  AND funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'      -- ⚠️ Substituir pelo funnel_id real
  AND status = 'active';

-- 3. Verificar leads com e-mail via custom_fields (verificação mais precisa)
-- Esta query verifica se há custom_fields do tipo "email" associados
SELECT 
  COUNT(DISTINCT l.id) AS total_leads_com_email_custom_field,
  COUNT(DISTINCT CASE WHEN l.emails_count > 0 THEN l.id END) AS leads_com_email_count_e_custom_field,
  COUNT(DISTINCT CASE WHEN l.emails_count = 0 AND lcv.id IS NOT NULL THEN l.id END) AS leads_sem_email_count_mas_com_custom_field
FROM leads l
LEFT JOIN lead_custom_values lcv ON lcv.lead_id = l.id
LEFT JOIN custom_fields cf ON cf.id = lcv.custom_field_id
WHERE l.workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'  -- ⚠️ Substituir pelo workspace_id real
  AND l.funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'      -- ⚠️ Substituir pelo funnel_id real
  AND l.status = 'active'
  AND (
    l.emails_count > 0 
    OR (
      cf.field_type = 'email'
      AND lcv.value IS NOT NULL 
      AND lcv.value != ''
      AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
    )
  );

-- 4. Distribuição por coluna (para entender onde estão os leads com e-mail)
SELECT 
  fc.title AS column_title,
  fc.position AS column_position,
  COUNT(*) AS total_leads,
  COUNT(CASE WHEN l.emails_count > 0 THEN 1 END) AS leads_com_email_count,
  COUNT(CASE WHEN l.emails_count = 0 OR l.emails_count IS NULL THEN 1 END) AS leads_sem_email_count,
  ROUND(100.0 * COUNT(CASE WHEN l.emails_count > 0 THEN 1 END) / COUNT(*), 2) AS percentual_com_email
FROM leads l
JOIN funnel_columns fc ON fc.id = l.column_id
WHERE l.workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'  -- ⚠️ Substituir pelo workspace_id real
  AND l.funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'      -- ⚠️ Substituir pelo funnel_id real
  AND l.status = 'active'
GROUP BY fc.id, fc.title, fc.position
ORDER BY fc.position;

-- 5. Verificar se há inconsistências (leads com e-mail em custom_fields mas emails_count = 0)
SELECT 
  COUNT(DISTINCT l.id) AS leads_com_email_custom_mas_sem_count,
  STRING_AGG(DISTINCT l.client_name, ', ') AS exemplos_leads
FROM leads l
JOIN lead_custom_values lcv ON lcv.lead_id = l.id
JOIN custom_fields cf ON cf.id = lcv.custom_field_id
WHERE l.workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'  -- ⚠️ Substituir pelo workspace_id real
  AND l.funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'      -- ⚠️ Substituir pelo funnel_id real
  AND l.status = 'active'
  AND l.emails_count = 0
  AND cf.field_type = 'email'
  AND lcv.value IS NOT NULL 
  AND lcv.value != ''
  AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
LIMIT 10;

