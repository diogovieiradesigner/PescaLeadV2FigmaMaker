-- =============================================================================
-- QUERIES DE VERIFICAÇÃO DA IMPLEMENTAÇÃO V17
-- Execute cada seção no SQL Editor do Supabase
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. VERIFICAR TABELAS CRIADAS
-- -----------------------------------------------------------------------------
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Criada'
    ELSE '❌ Não encontrada'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ai_neighborhood_config', 'neighborhood_cache', 'neighborhood_search_history')
ORDER BY table_name;

-- -----------------------------------------------------------------------------
-- 2. VERIFICAR FUNÇÕES SQL CRIADAS
-- -----------------------------------------------------------------------------
SELECT 
  proname as funcao,
  '✅ Criada' as status
FROM pg_proc 
WHERE proname IN (
  'get_location_search_history',
  'upsert_location_search_progress',
  'mark_location_as_suspect',
  'check_all_locations_exhausted',
  'get_next_page_for_location',
  'get_cache_locations',
  'save_cache_locations',
  'update_ai_neighborhood_config_timestamp',
  'update_nsh_timestamp'
)
ORDER BY proname;

-- -----------------------------------------------------------------------------
-- 3. VERIFICAR CONFIGURAÇÃO DA IA
-- -----------------------------------------------------------------------------
SELECT 
  id,
  is_active,
  model,
  fallback_models,
  max_tokens,
  temperature,
  max_ai_rounds,
  max_total_pages,
  cache_ttl_days,
  LENGTH(system_prompt) as system_prompt_length,
  LENGTH(user_prompt_city) as user_prompt_city_length,
  LENGTH(user_prompt_state) as user_prompt_state_length,
  LENGTH(user_prompt_additional) as user_prompt_additional_length,
  created_at
FROM ai_neighborhood_config
WHERE is_active = true;

-- -----------------------------------------------------------------------------
-- 4. VERIFICAR ÍNDICES
-- -----------------------------------------------------------------------------
SELECT 
  indexname,
  tablename,
  '✅ Criado' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_neighborhood_cache_lookup',
    'idx_nsh_lookup',
    'idx_nsh_active'
  )
ORDER BY tablename, indexname;

-- -----------------------------------------------------------------------------
-- 5. VERIFICAR TRIGGERS
-- -----------------------------------------------------------------------------
SELECT 
  trigger_name,
  event_object_table as tabela,
  '✅ Ativo' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_ai_neighborhood_config_updated',
    'trigger_nsh_updated'
  )
ORDER BY event_object_table;

-- -----------------------------------------------------------------------------
-- 6. TESTAR FUNÇÃO normalize_for_serpdev
-- -----------------------------------------------------------------------------
SELECT normalize_for_serpdev('Copacabana, Rio de Janeiro, State of Rio de Janeiro, Brazil') as resultado_esperado;
-- Esperado: "Copacabana, Rio de Janeiro, State of Rio de Janeiro, Brazil"

-- -----------------------------------------------------------------------------
-- 7. VERIFICAR SECRET DO OPENROUTER (apenas se existe, não mostra valor)
-- -----------------------------------------------------------------------------
SELECT 
  name,
  CASE 
    WHEN decrypted_secret IS NOT NULL AND LENGTH(decrypted_secret) > 0 THEN '✅ Configurada'
    ELSE '❌ Não encontrada'
  END as status
FROM decrypted_secrets 
WHERE name ILIKE '%openrouter%' OR name ILIKE '%OPENROUTER%';

-- =============================================================================
-- RESUMO ESPERADO:
-- - 3 tabelas criadas
-- - 9 funções criadas  
-- - 1 configuração ativa
-- - 3 índices criados
-- - 2 triggers ativos
-- - API Key do OpenRouter configurada
-- =============================================================================

