-- =============================================================================
-- MIGRATION: Mover Leads das Extrações "Restaurantes" para Kanban "Emails Gih"
-- =============================================================================
-- OBJETIVO: Mover todos os leads das duas extrações "Restaurantes" 
--           (09:03 e 09:07 de 10/12/2025) para o kanban "Emails Gih"
--           na primeira coluna "Novo"
-- =============================================================================

-- IDs das runs a mover:
-- - 81bfc716-3b7c-4b2b-bb13-adde77adf59d (Restaurantes - 10/12/2025 09:07)
-- - 75e677d5-a9e0-49e9-9a5c-5f25573e8bd2 (Restaurantes - 10/12/2025 09:03)

-- IDs do kanban destino:
-- - Funnel: 3657418b-d030-48d2-ba1b-87793dcd1d16 (Emails Gih)
-- - Column: dae0e522-248e-4528-a458-8941c310158b (Novo - primeira coluna)

-- =============================================================================
-- ATUALIZAR LEADS EM BATCHES (para evitar timeout)
-- =============================================================================

DO $$
DECLARE
  v_batch_size INTEGER := 100;
  v_count INTEGER;
  v_total INTEGER := 0;
  v_run_ids UUID[] := ARRAY[
    '81bfc716-3b7c-4b2b-bb13-adde77adf59d'::UUID,
    '75e677d5-a9e0-49e9-9a5c-5f25573e8bd2'::UUID
  ];
  v_funnel_id UUID := '3657418b-d030-48d2-ba1b-87793dcd1d16'::UUID;
  v_column_id UUID := 'dae0e522-248e-4528-a458-8941c310158b'::UUID;
BEGIN
  RAISE NOTICE 'Iniciando movimentação de leads...';
  
  LOOP
    UPDATE leads
    SET 
      funnel_id = v_funnel_id,
      column_id = v_column_id,
      updated_at = NOW()
    WHERE lead_extraction_run_id = ANY(v_run_ids)
      AND (funnel_id != v_funnel_id OR column_id != v_column_id)
      AND id IN (
        SELECT id FROM leads
        WHERE lead_extraction_run_id = ANY(v_run_ids)
          AND (funnel_id != v_funnel_id OR column_id != v_column_id)
        LIMIT v_batch_size
        FOR UPDATE SKIP LOCKED
      );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total := v_total + v_count;
    
    RAISE NOTICE 'Batch processado: % leads movidos (total: %)', v_count, v_total;
    
    EXIT WHEN v_count = 0;
    
    -- Pequeno delay para evitar locks
    PERFORM pg_sleep(0.05);
  END LOOP;
  
  RAISE NOTICE 'Movimentação concluída! Total: % leads movidos', v_total;
END $$;

-- =============================================================================
-- VERIFICAR RESULTADO
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

