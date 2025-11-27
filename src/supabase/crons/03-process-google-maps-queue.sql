-- =====================================================
-- CRON JOB: process-google-maps-queue
-- =====================================================
-- 
-- DESCRIÇÃO:
--   Chama Edge Function via HTTP POST para processar fila PGMQ do Google Maps
--
-- SCHEDULE: 
--   */10 * * * * (A cada 10 minutos) - Dashboard atual
--   '15 seconds' - Migração SQL sugere 15 segundos
--
-- COMANDO:
--   SELECT net.http_post(...) para chamar Edge Function
--
-- EDGE FUNCTION CHAMADA:
--   /supabase/functions/process-google-maps-queue/index.ts
--
-- O QUE FAZ:
--   1. Faz HTTP POST para Edge Function process-google-maps-queue
--   2. Edge Function lê mensagens da fila PGMQ 'google_maps_queue'
--   3. Para cada lead_id, chama Edge Function fetch-google-maps
--   4. fetch-google-maps busca dados do Google Maps via SerpDev API
--   5. Atualiza lead_extraction_staging com dados do Google Maps
--   6. Atualiza status_extraction para 'google_fetched'
--
-- DEPENDÊNCIAS:
--   - pg_net Extension (para http_post)
--   - Edge Function: process-google-maps-queue
--   - Edge Function: fetch-google-maps
--   - PGMQ Extension
--   - SerpDev API (17 chaves no Vault)
--
-- STATUS ATUAL:
--   🔴 FAILED (Falhando no Dashboard)
--
-- PROBLEMAS CONHECIDOS:
--   1. service_role_key precisa estar configurado em app.settings
--   2. URL da Edge Function pode estar incorreta
--   3. Timeout de 60 segundos pode ser insuficiente
--
-- OBSERVAÇÃO:
--   ⚠️ Este cron chama uma Edge Function via HTTP, não uma função SQL
--   ⚠️ Schedule diferente entre Dashboard (10 min) e migração SQL (15 seg)
--   Recomendado: 15 segundos para processar 100 páginas mais rápido
--
-- =====================================================

SELECT net.http_post(
      url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-google-maps-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) as request_id;
