// Script para criar a função RPC delete_instagram_extraction
// Execute com: node fix_rpc_now.js

console.log(`
================================================================================
POR FAVOR EXECUTE NO SQL EDITOR DO SUPABASE DASHBOARD:
https://supabase.com/dashboard/project/xkwstpiajfelypnkudsq/sql
================================================================================

CREATE OR REPLACE FUNCTION delete_instagram_extraction(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id UUID;
    v_user_id UUID;
    v_status TEXT;
    v_deleted_counts JSONB;
    v_staging_count INT := 0;
    v_logs_count INT := 0;
    v_watchdog_count INT := 0;
BEGIN
    -- Obter user_id da sessão
    v_user_id := auth.uid();

    -- Verificar se a run existe e obter workspace_id e status
    SELECT workspace_id, status INTO v_workspace_id, v_status
    FROM lead_extraction_runs
    WHERE id = p_run_id AND source = 'instagram';

    IF v_workspace_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Extração não encontrada ou não é do tipo Instagram'
        );
    END IF;

    -- Verificar se o status permite deleção (apenas completed, failed, cancelled, partial)
    IF v_status NOT IN ('completed', 'failed', 'cancelled', 'partial') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Não é possível deletar uma extração em andamento. Aguarde a conclusão ou falha.'
        );
    END IF;

    -- Verificar se o usuário tem acesso ao workspace
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = v_workspace_id AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usuário não tem permissão para deletar esta extração'
        );
    END IF;

    -- Contar registros que serão deletados
    SELECT COUNT(*) INTO v_staging_count
    FROM lead_extraction_staging WHERE extraction_run_id = p_run_id;

    SELECT COUNT(*) INTO v_logs_count
    FROM extraction_logs WHERE run_id = p_run_id;

    SELECT COUNT(*) INTO v_watchdog_count
    FROM watchdog_logs WHERE run_id = p_run_id;

    -- Deletar registros dependentes da tabela compartilhada
    -- NOTA: Os leads criados ficarão órfãos (não serão deletados)
    DELETE FROM lead_extraction_staging WHERE extraction_run_id = p_run_id;
    DELETE FROM extraction_logs WHERE run_id = p_run_id;
    DELETE FROM watchdog_logs WHERE run_id = p_run_id;

    -- Deletar a run
    DELETE FROM lead_extraction_runs WHERE id = p_run_id;

    -- Montar resposta
    v_deleted_counts := jsonb_build_object(
        'staging', v_staging_count,
        'logs', v_logs_count,
        'watchdog', v_watchdog_count
    );

    RETURN jsonb_build_object(
        'success', true,
        'deleted_counts', v_deleted_counts
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Garantir CASCADE em watchdog_logs -> lead_extraction_runs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'watchdog_logs_run_id_fkey'
        AND table_name = 'watchdog_logs'
    ) THEN
        ALTER TABLE watchdog_logs
            DROP CONSTRAINT watchdog_logs_run_id_fkey;
        ALTER TABLE watchdog_logs
            ADD CONSTRAINT watchdog_logs_run_id_fkey
            FOREIGN KEY (run_id) REFERENCES lead_extraction_runs(id) ON DELETE CASCADE;
    END IF;
END $$;

================================================================================
`);
