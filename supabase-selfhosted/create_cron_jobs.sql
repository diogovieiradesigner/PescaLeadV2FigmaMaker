-- Criar todos os cron jobs no Supabase Self-Hosted
-- IMPORTANTE: URLs atualizadas para https://supabase.pescalead.com.br

-- 1. Process Google Maps Queue (10 seconds)
SELECT cron.schedule(
  'process-google-maps-queue',
  '10 seconds',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/process-google-maps-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- 2. AI Process Queue (10 seconds)
SELECT cron.schedule(
  'ai-process-queue',
  '10 seconds',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/ai-process-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- 3. Send Notifications (every minute)
SELECT cron.schedule(
  'send-notifications',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := jsonb_build_object('batch_size', 20)
    );
  $$
);

-- 4. Enqueue Scraping Leads (every minute)
SELECT cron.schedule(
  'enqueue-scraping-leads',
  '*/1 * * * *',
  $$SELECT enqueue_scraping_leads();$$
);

-- 5. Enqueue CNPJ Enrichment (every 2 minutes)
SELECT cron.schedule(
  'enqueue-cnpj-enrichment',
  '*/2 * * * *',
  $$SELECT enqueue_cnpj_enrichment();$$
);

-- 6. Enqueue WHOIS Enrichment (every 2 minutes, odd minutes)
SELECT cron.schedule(
  'enqueue-whois-enrichment',
  '1-59/2 * * * *',
  $$SELECT enqueue_whois_enrichment();$$
);

-- 7. Process CNPJ Queue (every minute)
SELECT cron.schedule(
  'process-cnpj-queue',
  '*/1 * * * *',
  $$SELECT process_cnpj_queue();$$
);

-- 8. Process WHOIS Queue (every minute)
SELECT cron.schedule(
  'process-whois-queue',
  '*/1 * * * *',
  $$SELECT process_whois_queue();$$
);

-- 9. AI Debouncer to PGMQ (every minute)
SELECT cron.schedule(
  'ai-debouncer-to-pgmq',
  '*/1 * * * *',
  $$SELECT ai_debouncer_to_pgmq();$$
);

-- 10. Trigger Scheduled Extractions (every minute)
SELECT cron.schedule(
  'trigger-scheduled-extractions',
  '* * * * *',
  $$SELECT trigger_scheduled_extractions();$$
);

-- 11. Cleanup Analytics Cache (every 15 minutes)
SELECT cron.schedule(
  'cleanup-analytics-cache',
  '*/15 * * * *',
  $$SELECT cleanup_analytics_cache();$$
);

-- 12. Recalculate Daily Analytics (3 AM daily)
SELECT cron.schedule(
  'recalculate-daily-analytics',
  '0 3 * * *',
  $$SELECT recalculate_daily_analytics();$$
);

-- 13. Check Runs for Filter Compensation (every 2 minutes)
SELECT cron.schedule(
  'check-filter-compensation',
  '*/2 * * * *',
  $$SELECT check_all_runs_for_filter_compensation()$$
);

-- 14. Migrate Leads with Custom Values (every minute)
SELECT cron.schedule(
  'migrate-leads-custom-values',
  '* * * * *',
  $$SELECT migrate_leads_with_custom_values()$$
);

-- 15. Reconcile Analytics Data (6 AM daily)
SELECT cron.schedule(
  'reconcile-analytics',
  '0 6 * * *',
  $$
    SELECT reconcile_analytics_data(NULL, CURRENT_DATE - INTERVAL '1 day');
    SELECT reconcile_analytics_data(NULL, CURRENT_DATE);
  $$
);

-- 16. Campaign Scheduler (every minute)
SELECT cron.schedule(
  'campaign-scheduler',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/campaign-scheduler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- 17. Campaign Process Queue (every minute)
SELECT cron.schedule(
  'campaign-process-queue',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/campaign-process-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{"batch_size": 5}'::jsonb
    ) as request_id;
  $$
);

-- 18. Campaign Generate Report (11:59 PM daily)
SELECT cron.schedule(
  'campaign-generate-report',
  '59 23 * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/campaign-generate-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- 19. WhatsApp Validation Cycle 1 (every minute)
SELECT cron.schedule(
  'whatsapp-validation-cycle-1',
  '* * * * *',
  $$SELECT run_whatsapp_validation_cycle();$$
);

-- 20. WhatsApp Validation Cycle 2 (every minute, offset 30s)
SELECT cron.schedule(
  'whatsapp-validation-cycle-2',
  '* * * * *',
  $$SELECT pg_sleep(30); SELECT run_whatsapp_validation_cycle();$$
);

-- 21. Repair Stuck Transcriptions (every 2 minutes)
SELECT cron.schedule(
  'repair-stuck-transcriptions',
  '*/2 * * * *',
  $$SELECT repair_stuck_transcriptions(2, 20);$$
);

-- 22. Disable JWT All Functions (every minute)
SELECT cron.schedule(
  'disable-jwt-functions',
  '* * * * *',
  $$SELECT disable_jwt_all_functions_with_log();$$
);

-- 23. Process Follow-up Queue (every minute)
SELECT cron.schedule(
  'process-follow-up-queue',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/process-follow-up-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 24. System Watchdog (every 15 minutes)
SELECT cron.schedule(
  'system-watchdog',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/system-watchdog',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- 25. Fix Inconsistent Run Status (hourly)
SELECT cron.schedule(
  'fix-inconsistent-status',
  '0 * * * *',
  $$SELECT * FROM fix_runs_with_inconsistent_status()$$
);

-- 26. Process Scraping Queue (every minute)
SELECT cron.schedule(
  'process-scraping-queue',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/process-scraping-queue',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        'Content-Type', 'application/json'
      ),
      body := '{"batch_size": 60}'::jsonb
    );
  $$
);

-- 27. AI Transcription Queue (every minute)
SELECT cron.schedule(
  'ai-transcription-queue',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/ai-transcription-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 28. Process Lead Migration Queue (10 seconds)
SELECT cron.schedule(
  'process-lead-migration-queue',
  '10 seconds',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/process-lead-migration-queue',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('batch_size', 100)
    );
  $$
);

-- 29. Enqueue Enrichment Leads (every minute)
SELECT cron.schedule(
  'enqueue-enrichment-leads',
  '*/1 * * * *',
  $$SELECT enqueue_enrichment_leads();$$
);

-- 30. Consume Enrichment Queue (every 30 seconds)
SELECT cron.schedule(
  'consume-enrichment-queue',
  '*/30 * * * * *',
  $$SELECT consume_enrichment_queue();$$
);

-- 31. Enqueue Pending Reminders (every minute)
SELECT cron.schedule(
  'enqueue-pending-reminders',
  '* * * * *',
  $$SELECT enqueue_pending_reminders();$$
);

-- 32. Process Reminders (every minute)
SELECT cron.schedule(
  'process-reminders',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/process-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := jsonb_build_object('batch_size', 10)
    );
  $$
);

-- 33. Cleanup Old Reminder Queue (3 AM daily)
SELECT cron.schedule(
  'cleanup-reminder-queue',
  '0 3 * * *',
  $$SELECT cleanup_old_reminder_queue();$$
);

-- 34. Process Column Leads Migration Queue (10 seconds)
SELECT cron.schedule(
  'process-column-migration-queue',
  '10 seconds',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/process-column-leads-migration-queue',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('batch_size', 100)
    );
  $$
);

-- 35. Google Calendar Sync Cron (every minute)
SELECT cron.schedule(
  'google-calendar-sync',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/google-calendar-sync-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- 36. Process CNPJ Extraction Queue (10 seconds)
SELECT cron.schedule(
  'process-cnpj-extraction-queue',
  '10 seconds',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/process-cnpj-extraction-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := jsonb_build_object('batch_size', 50)
    );
  $$
);

-- 37. Process Instagram Queue (every minute)
SELECT cron.schedule(
  'process-instagram-queue',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/process-instagram-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- 38. CNPJ Extraction Cron (every minute)
SELECT cron.schedule(
  'cnpj-extraction-cron',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/cnpj-extraction-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 39. Instagram Website Enqueue (every minute)
SELECT cron.schedule(
  'instagram-website-enqueue',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://supabase.pescalead.com.br/functions/v1/instagram-website-enqueue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- 40. Process Instagram Migrations (every minute)
SELECT cron.schedule(
  'process-instagram-migrations',
  '* * * * *',
  $$SELECT process_pending_instagram_migrations();$$
);

-- Verificar quantos crons foram criados
SELECT COUNT(*) as total_crons_created FROM cron.job;
