-- =============================================================================
-- SCRIPT DE VALIDAÇÃO PÓS-DEPLOY - Otimizações de Performance
-- =============================================================================
-- Execute este script após o deploy para validar que tudo está funcionando
-- =============================================================================

-- ==================== 1. VALIDAR ÍNDICES ====================

-- Verificar se índices foram criados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('campaign_messages', 'campaign_runs', 'leads')
  AND indexname LIKE 'idx_campaign%'
  OR indexname LIKE 'idx_leads_id_for_context'
ORDER BY tablename, indexname;

-- Resultado esperado:
-- ✅ idx_campaign_messages_atomic_selection
-- ✅ idx_campaign_runs_id_status
-- ✅ idx_leads_id_for_context

-- ==================== 2. VALIDAR FUNÇÃO SQL ====================

-- Verificar se função mark_old_campaign_messages_as_skipped existe
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname = 'mark_old_campaign_messages_as_skipped';

-- Resultado esperado:
-- ✅ mark_old_campaign_messages_as_skipped(p_one_hour_ago timestamp with time zone) -> integer

-- ==================== 3. VALIDAR EDGE FUNCTION ====================

-- Verificar se Edge Function está deployada (via Supabase Dashboard ou CLI)
-- CLI: supabase functions list | grep campaign-process-queue

-- ==================== 4. TESTAR FUNÇÃO DE MENSAGENS ANTIGAS ====================

-- Testar função (não deve retornar erro)
SELECT mark_old_campaign_messages_as_skipped(NOW() - INTERVAL '2 hours') AS skipped_count;

-- Resultado esperado:
-- ✅ Número de mensagens marcadas como skipped (pode ser 0 se não houver mensagens antigas)

-- ==================== 5. VERIFICAR PERFORMANCE DOS ÍNDICES ====================

-- Verificar se índices estão sendo usados
EXPLAIN ANALYZE
SELECT cm.*
FROM campaign_messages cm
JOIN campaign_runs cr ON cr.id = cm.run_id
JOIN campaign_configs cc ON cc.id = cr.config_id
WHERE cm.status = 'pending'
  AND cr.status = 'running'
  AND cm.scheduled_at <= NOW()
  AND cm.scheduled_at >= NOW() - INTERVAL '1 hour'
LIMIT 5;

-- Resultado esperado:
-- ✅ Query deve usar idx_campaign_messages_atomic_selection
-- ✅ Query deve usar idx_campaign_runs_id_status
-- ✅ Tempo de execução deve ser < 100ms

-- ==================== 6. VERIFICAR MÉTRICAS DE PERFORMANCE ====================

-- Tempo médio de processamento (última hora)
SELECT 
  AVG(EXTRACT(EPOCH FROM (sent_at - scheduled_at))) AS avg_processing_seconds,
  MIN(EXTRACT(EPOCH FROM (sent_at - scheduled_at))) AS min_processing_seconds,
  MAX(EXTRACT(EPOCH FROM (sent_at - scheduled_at))) AS max_processing_seconds,
  COUNT(*) AS total_messages
FROM campaign_messages
WHERE status = 'sent'
  AND sent_at > NOW() - INTERVAL '1 hour'
  AND scheduled_at IS NOT NULL;

-- Throughput (mensagens por minuto - última hora)
SELECT 
  DATE_TRUNC('minute', sent_at) AS minute,
  COUNT(*) AS messages_per_minute
FROM campaign_messages
WHERE status = 'sent'
  AND sent_at > NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute DESC
LIMIT 10;

-- Taxa de sucesso/erro (última hora)
SELECT 
  status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM campaign_messages
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status
ORDER BY count DESC;

-- ==================== 7. VERIFICAR PROCESSAMENTO PARALELO ====================

-- Verificar se há múltiplas mensagens sendo processadas simultaneamente
-- (status = 'generating' ao mesmo tempo para mesma run)
SELECT 
  run_id,
  COUNT(*) AS concurrent_generating
FROM campaign_messages
WHERE status = 'generating'
  AND updated_at > NOW() - INTERVAL '5 minutes'
GROUP BY run_id
HAVING COUNT(*) > 1
ORDER BY concurrent_generating DESC;

-- Resultado esperado:
-- ✅ Se houver processamento paralelo, deve mostrar múltiplas mensagens com status 'generating' para mesma run

-- ==================== 8. VERIFICAR BUSCA DE CONTEXTOS EM BATCH ====================

-- Verificar se há múltiplas mensagens da mesma run sendo processadas
-- (indica que contextos foram carregados em batch)
SELECT 
  run_id,
  COUNT(DISTINCT lead_id) AS unique_leads,
  COUNT(*) AS total_messages,
  MIN(updated_at) AS first_updated,
  MAX(updated_at) AS last_updated,
  EXTRACT(EPOCH FROM (MAX(updated_at) - MIN(updated_at))) AS processing_window_seconds
FROM campaign_messages
WHERE status IN ('generating', 'sending', 'sent')
  AND updated_at > NOW() - INTERVAL '1 hour'
GROUP BY run_id
HAVING COUNT(*) > 5
ORDER BY processing_window_seconds ASC
LIMIT 10;

-- Resultado esperado:
-- ✅ Se busca em batch estiver funcionando, processing_window_seconds deve ser baixo
-- ✅ (múltiplas mensagens processadas em janela de tempo pequena)

-- ==================== 9. VERIFICAR RETRY AUTOMÁTICO ====================

-- Verificar mensagens com retry
SELECT 
  run_id,
  retry_count,
  COUNT(*) AS message_count,
  status,
  error_message
FROM campaign_messages
WHERE retry_count > 0
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY run_id, retry_count, status, error_message
ORDER BY retry_count DESC, message_count DESC
LIMIT 20;

-- Resultado esperado:
-- ✅ Mensagens com retry_count > 0 devem ter scheduled_at futuro (para retry)
-- ✅ Mensagens com retry_count >= 3 devem ter status = 'failed'

-- ==================== 10. RESUMO FINAL ====================

-- Resumo de validação
SELECT 
  'Índices' AS categoria,
  COUNT(*) AS total,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ OK'
    ELSE '❌ FALTANDO'
  END AS status
FROM pg_indexes
WHERE tablename IN ('campaign_messages', 'campaign_runs', 'leads')
  AND (indexname LIKE 'idx_campaign%' OR indexname = 'idx_leads_id_for_context')

UNION ALL

SELECT 
  'Funções SQL' AS categoria,
  COUNT(*) AS total,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ OK'
    ELSE '❌ FALTANDO'
  END AS status
FROM pg_proc
WHERE proname = 'mark_old_campaign_messages_as_skipped'

UNION ALL

SELECT 
  'Mensagens Processadas (1h)' AS categoria,
  COUNT(*) AS total,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ OK'
    ELSE '⚠️ NENHUMA'
  END AS status
FROM campaign_messages
WHERE status = 'sent'
  AND sent_at > NOW() - INTERVAL '1 hour';

-- =============================================================================
-- FIM DO SCRIPT DE VALIDAÇÃO
-- =============================================================================
-- Se todos os itens acima retornarem ✅ OK, o deploy foi bem-sucedido!
-- =============================================================================

