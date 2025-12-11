-- =============================================================================
-- EXEMPLO: Mover Leads das Extrações "Restaurantes" para "Emails Gih"
-- =============================================================================
-- Este é um exemplo de como usar o sistema de fila para mover leads
-- Execute este script após aplicar as migrations do sistema de fila
-- =============================================================================

-- IDs das runs a mover:
-- - 81bfc716-3b7c-4b2b-bb13-adde77adf59d (Restaurantes - 10/12/2025 09:07)
-- - 75e677d5-a9e0-49e9-9a5c-5f25573e8bd2 (Restaurantes - 10/12/2025 09:03)

-- IDs do kanban destino:
-- - Funnel: 3657418b-d030-48d2-ba1b-87793dcd1d16 (Emails Gih)
-- - Column: dae0e522-248e-4528-a458-8941c310158b (Novo - primeira coluna)

-- =============================================================================
-- 1. ENFILEIRAR MOVIMENTAÇÃO DA PRIMEIRA RUN
-- =============================================================================

SELECT queue_lead_migration(
  '81bfc716-3b7c-4b2b-bb13-adde77adf59d'::UUID,  -- run_id
  '3657418b-d030-48d2-ba1b-87793dcd1d16'::UUID,  -- funnel_id (Emails Gih)
  'dae0e522-248e-4528-a458-8941c310158b'::UUID,  -- column_id (Novo)
  100  -- batch_size (100 leads por batch)
);

-- =============================================================================
-- 2. ENFILEIRAR MOVIMENTAÇÃO DA SEGUNDA RUN
-- =============================================================================

SELECT queue_lead_migration(
  '75e677d5-a9e0-49e9-9a5c-5f25573e8bd2'::UUID,  -- run_id
  '3657418b-d030-48d2-ba1b-87793dcd1d16'::UUID,  -- funnel_id (Emails Gih)
  'dae0e522-248e-4528-a458-8941c310158b'::UUID,  -- column_id (Novo)
  100  -- batch_size (100 leads por batch)
);

-- =============================================================================
-- 3. VERIFICAR STATUS DA FILA
-- =============================================================================

SELECT * FROM get_lead_migration_queue_status();

-- =============================================================================
-- 4. VERIFICAR PROGRESSO (executar após alguns segundos)
-- =============================================================================

-- Verificar quantos leads ainda precisam ser movidos
SELECT 
    ler.run_name,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE l.funnel_id = '3657418b-d030-48d2-ba1b-87793dcd1d16' 
                      AND l.column_id = 'dae0e522-248e-4528-a458-8941c310158b') as leads_no_destino,
    COUNT(*) FILTER (WHERE l.funnel_id != '3657418b-d030-48d2-ba1b-87793dcd1d16' 
                      OR l.column_id != 'dae0e522-248e-4528-a458-8941c310158b') as leads_restantes
FROM lead_extraction_runs ler
JOIN leads l ON l.lead_extraction_run_id = ler.id
WHERE ler.id IN (
  '81bfc716-3b7c-4b2b-bb13-adde77adf59d',
  '75e677d5-a9e0-49e9-9a5c-5f25573e8bd2'
)
GROUP BY ler.id, ler.run_name;

-- =============================================================================
-- 5. VERIFICAR RESULTADO FINAL (após processamento completo)
-- =============================================================================

SELECT 
    ler.run_name,
    COUNT(*) as total_leads,
    f.name as funnel_name,
    fc.title as column_name
FROM lead_extraction_runs ler
JOIN leads l ON l.lead_extraction_run_id = ler.id
LEFT JOIN funnels f ON f.id = l.funnel_id
LEFT JOIN funnel_columns fc ON fc.id = l.column_id
WHERE ler.id IN (
  '81bfc716-3b7c-4b2b-bb13-adde77adf59d',
  '75e677d5-a9e0-49e9-9a5c-5f25573e8bd2'
)
GROUP BY ler.id, ler.run_name, f.name, fc.title
ORDER BY ler.run_name;

