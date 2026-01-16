-- ============================================================================
-- VERIFICAR SECRETS/VAULT - Supabase Self-Hosted
-- ============================================================================
-- Execute via Supabase Studio ou psql
-- Data: 2026-01-05
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VERIFICAR TABELA VAULT (Secrets do Supabase)
-- ----------------------------------------------------------------------------

-- Ver todas as secrets cadastradas
SELECT
  id,
  name,
  description,
  created_at,
  updated_at
FROM vault.secrets
ORDER BY name;

-- Contar secrets
SELECT COUNT(*) as total_secrets FROM vault.secrets;

-- Secrets esperadas (segundo MIGRACAO_STATUS.md: 23 secrets)
-- APIFY_API_TOKEN
-- GEMINI_API_KEY
-- GROQ_API_KEY
-- OPENROUTER_API_KEY
-- RESEND_API_KEY
-- SERPDEV_API_KEY_01 até 15
-- BRIGHTDATA_*
-- WHOIS_URL_API

-- ----------------------------------------------------------------------------
-- 2. VERIFICAR SECRETS ESPECÍFICAS DAS EDGE FUNCTIONS
-- ----------------------------------------------------------------------------

-- Verificar se secrets críticas existem
SELECT
  name,
  CASE
    WHEN name LIKE '%API%' THEN 'API Key'
    WHEN name LIKE '%TOKEN%' THEN 'Token'
    WHEN name LIKE '%SECRET%' THEN 'Secret'
    ELSE 'Outro'
  END as tipo,
  created_at
FROM vault.secrets
WHERE
  name IN (
    'APIFY_API_TOKEN',
    'GEMINI_API_KEY',
    'GROQ_API_KEY',
    'OPENROUTER_API_KEY',
    'RESEND_API_KEY',
    'WHOIS_URL_API'
  )
ORDER BY name;

-- Verificar secrets do SERPDEV (01-15)
SELECT
  name,
  created_at
FROM vault.secrets
WHERE name LIKE 'SERPDEV_API_KEY_%'
ORDER BY name;

-- Verificar secrets do BRIGHTDATA
SELECT
  name,
  created_at
FROM vault.secrets
WHERE name LIKE 'BRIGHTDATA_%'
ORDER BY name;

-- ----------------------------------------------------------------------------
-- 3. VERIFICAR CONFIGURAÇÕES DO SISTEMA
-- ----------------------------------------------------------------------------

-- Se existe tabela de configuração do sistema
SELECT
  key,
  value,
  updated_at
FROM public.system_config
WHERE key IN ('supabase_url', 'environment', 'edge_functions_url')
ORDER BY key;

-- ----------------------------------------------------------------------------
-- 4. VERIFICAR VARIÁVEIS CRÍTICAS PARA EDGE FUNCTIONS
-- ----------------------------------------------------------------------------

-- Estas NÃO ficam no Vault, ficam como Environment Variables do Docker
-- Mas podemos verificar se existem funções que dependem delas

-- Buscar referências a SUPABASE_URL em functions
SELECT
  routine_name as function_name,
  routine_definition
FROM information_schema.routines
WHERE
  routine_type = 'FUNCTION'
  AND routine_schema = 'public'
  AND routine_definition ILIKE '%supabase%'
LIMIT 10;

-- ----------------------------------------------------------------------------
-- RESULTADO ESPERADO
-- ----------------------------------------------------------------------------

-- Total secrets: 23
-- APIFY_API_TOKEN: EXISTS
-- GEMINI_API_KEY: EXISTS
-- GROQ_API_KEY: EXISTS
-- OPENROUTER_API_KEY: EXISTS
-- RESEND_API_KEY: EXISTS
-- SERPDEV_API_KEY_01 até 15: 15 rows
-- BRIGHTDATA_*: EXISTS

-- Se faltar alguma secret:
-- 1. Adicionar via Supabase Studio (Vault)
-- 2. Ou via SQL:
--    SELECT vault.create_secret('SECRET_NAME', 'secret_value');
