-- =============================================================================
-- MIGRATION: Adicionar Cron Job para Migração Automática do Instagram
-- =============================================================================
-- Cria cron job que roda a cada 1 minuto para processar perfis prontos para migração
-- =============================================================================

-- Habilitar extensão pg_cron se ainda não estiver
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Deletar cron job se já existir (para evitar duplicatas)
SELECT cron.unschedule('instagram-migration-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'instagram-migration-cron'
);

-- Criar função SQL para processar runs pendentes de migração
CREATE OR REPLACE FUNCTION process_pending_instagram_migrations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run RECORD;
  v_pending_count INTEGER;
  v_service_key TEXT;
  v_response JSONB;
BEGIN
  -- Buscar service key do secrets
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE WARNING '[instagram-migration-cron] service_role_key not found in vault';
    RETURN;
  END IF;

  -- Buscar runs com perfis prontos para migração
  FOR v_run IN
    SELECT DISTINCT
      iep.run_id,
      ler.workspace_id
    FROM instagram_enriched_profiles iep
    JOIN lead_extraction_runs ler ON ler.id = iep.run_id
    WHERE iep.migrated_to_leads = FALSE
      AND iep.processing_status = 'completed'
      AND (
        iep.external_url IS NULL
        OR iep.website_scraping_status IN ('completed', 'skipped', 'blocked', 'failed')
      )
      AND ler.source = 'instagram'
      AND ler.status != 'completed'
    LIMIT 10  -- Processar até 10 runs por vez
  LOOP
    -- Contar quantos perfis pendentes neste run
    SELECT COUNT(*) INTO v_pending_count
    FROM instagram_enriched_profiles
    WHERE run_id = v_run.run_id
      AND migrated_to_leads = FALSE
      AND processing_status = 'completed'
      AND (
        external_url IS NULL
        OR website_scraping_status IN ('completed', 'skipped', 'blocked', 'failed')
      );

    IF v_pending_count > 0 THEN
      RAISE NOTICE '[instagram-migration-cron] Processing run_id=% (%s profiles pending)', v_run.run_id, v_pending_count;

      -- Chamar edge function instagram-migrate via HTTP
      BEGIN
        SELECT content::jsonb INTO v_response
        FROM http((
          'POST',
          'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/instagram-migrate',
          ARRAY[
            http_header('Authorization', 'Bearer ' || v_service_key),
            http_header('Content-Type', 'application/json')
          ],
          'application/json',
          jsonb_build_object(
            'run_id', v_run.run_id,
            'action', 'start',
            'limit', 50
          )::text
        )::http_request);

        RAISE NOTICE '[instagram-migration-cron] Response: %', v_response;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[instagram-migration-cron] Error calling instagram-migrate for run_id=%: %', v_run.run_id, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION process_pending_instagram_migrations IS
  'Processa runs do Instagram com perfis prontos para migração automaticamente';

-- Criar cron job que roda a cada 1 minuto
SELECT cron.schedule(
  'instagram-migration-cron',                                    -- Nome do job
  '* * * * *',                                                   -- Cron schedule: a cada 1 minuto
  $$SELECT process_pending_instagram_migrations();$$
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - usado para crons do Instagram (scraping + migration)';
