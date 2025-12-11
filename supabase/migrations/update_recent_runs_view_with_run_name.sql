-- =============================================================================
-- MIGRAÇÃO: Atualizar view lead_extraction_recent_runs para incluir run_name
-- =============================================================================
-- PROBLEMA: View não retorna campo run_name necessário para o frontend
-- SOLUÇÃO: Dropar e recriar view incluindo run_name
-- =============================================================================

-- Dropar view existente primeiro
DROP VIEW IF EXISTS lead_extraction_recent_runs CASCADE;

-- Recriar view com run_name incluído
CREATE VIEW lead_extraction_recent_runs AS
SELECT 
    r.id,
    r.extraction_id,
    e.extraction_name,
    r.run_name,  -- ✅ NOVO: Campo run_name adicionado
    r.workspace_id,
    r.search_term,
    r.location,
    r.status,
    r.target_quantity,
    r.pages_consumed,
    r.found_quantity,
    r.created_quantity,
    r.duplicates_skipped,
    r.filtered_out,
    r.credits_consumed,
    r.started_at,
    r.finished_at,
    r.execution_time_ms,
    r.error_message,
    r.ai_decisions,
    r.created_at
FROM lead_extraction_runs r
LEFT JOIN lead_extractions e ON e.id = r.extraction_id
ORDER BY r.created_at DESC
LIMIT 30;

-- Comentário
COMMENT ON VIEW lead_extraction_recent_runs IS 
'View das últimas 30 runs de extração, incluindo run_name (nome único de cada run)';

-- Conceder permissões SELECT para authenticated
GRANT SELECT ON lead_extraction_recent_runs TO authenticated;

