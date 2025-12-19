import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xkwstpiajfelypnkudsq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- =============================================================================
-- FUNÇÃO RPC: Deletar extração Instagram com cascata
-- =============================================================================
CREATE OR REPLACE FUNCTION delete_instagram_extraction(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace_id UUID;
    v_user_id UUID;
    v_deleted_counts JSONB;
    v_discovery_count INT := 0;
    v_enriched_count INT := 0;
    v_logs_count INT := 0;
    v_staging_count INT := 0;
BEGIN
    -- Obter user_id da sessão
    v_user_id := auth.uid();

    -- Verificar se a run existe e pertence ao workspace do usuário
    SELECT workspace_id INTO v_workspace_id
    FROM lead_extraction_runs
    WHERE id = p_run_id AND source = 'instagram';

    IF v_workspace_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Extração não encontrada ou não é do tipo Instagram'
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

    -- 1. Orphan leads (set lead_id to NULL in enriched profiles)
    UPDATE instagram_enriched_profiles
    SET lead_id = NULL
    WHERE run_id = p_run_id AND lead_id IS NOT NULL;

    -- 2. Orphan leads in staging table
    UPDATE lead_extraction_staging
    SET lead_id = NULL
    WHERE run_id = p_run_id AND lead_id IS NOT NULL;

    -- Contar registros que serão deletados
    SELECT COUNT(*) INTO v_discovery_count
    FROM instagram_discovery_results WHERE run_id = p_run_id;

    SELECT COUNT(*) INTO v_enriched_count
    FROM instagram_enriched_profiles WHERE run_id = p_run_id;

    SELECT COUNT(*) INTO v_logs_count
    FROM instagram_extraction_logs WHERE run_id = p_run_id;

    SELECT COUNT(*) INTO v_staging_count
    FROM lead_extraction_staging WHERE run_id = p_run_id;

    -- 3. Deletar registros dependentes
    DELETE FROM instagram_discovery_results WHERE run_id = p_run_id;
    DELETE FROM instagram_enriched_profiles WHERE run_id = p_run_id;
    DELETE FROM instagram_extraction_logs WHERE run_id = p_run_id;
    DELETE FROM lead_extraction_staging WHERE run_id = p_run_id AND source = 'instagram';
    DELETE FROM extraction_logs WHERE run_id = p_run_id AND source = 'instagram';

    -- 4. Deletar a run
    DELETE FROM lead_extraction_runs WHERE id = p_run_id;

    -- Montar resposta
    v_deleted_counts := jsonb_build_object(
        'discovery_results', v_discovery_count,
        'enriched_profiles', v_enriched_count,
        'logs', v_logs_count,
        'staging', v_staging_count
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

COMMENT ON FUNCTION delete_instagram_extraction IS 'Deleta uma extração Instagram em cascata, mantendo os leads órfãos';
`;

async function runMigration() {
  console.log('Applying migration...');

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    // If exec_sql doesn't exist, try direct SQL
    console.log('exec_sql not available, trying raw SQL...');
    const { error: sqlError } = await supabase.from('_sqlquery').select(sql);
    if (sqlError) {
      console.error('Error:', sqlError);
      // Last resort - log the SQL for manual execution
      console.log('\n======== SQL TO EXECUTE MANUALLY ========\n');
      console.log(sql);
      console.log('\n==========================================\n');
    }
  } else {
    console.log('Migration applied successfully!');
    console.log(data);
  }
}

runMigration().catch(console.error);
