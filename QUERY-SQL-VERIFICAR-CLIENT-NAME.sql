-- Query para verificar se client_name está no banco
-- Execute no Supabase SQL Editor

-- Verificar estrutura da tabela leads
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name = 'client_name';

-- Verificar leads sem client_name
SELECT 
  id,
  client_name,
  company,
  created_at,
  workspace_id,
  funnel_id
FROM leads
WHERE workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'
  AND funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16'
  AND (client_name IS NULL OR client_name = '' OR client_name = 'Sem nome')
LIMIT 20;

-- Verificar se há leads com client_name válido
SELECT 
  COUNT(*) as total_leads,
  COUNT(CASE WHEN client_name IS NOT NULL AND client_name != '' AND client_name != 'Sem nome' THEN 1 END) as leads_com_nome,
  COUNT(CASE WHEN client_name IS NULL OR client_name = '' OR client_name = 'Sem nome' THEN 1 END) as leads_sem_nome
FROM leads
WHERE workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'
  AND funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16';

-- Verificar um lead específico (do log)
SELECT 
  id,
  client_name,
  company,
  email,
  phone,
  created_at
FROM leads
WHERE id = '3f627e15-1d31-4e74-bab7-ca16c620a8c2';

