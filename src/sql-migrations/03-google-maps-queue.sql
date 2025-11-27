-- =====================================================
-- MIGRATION: Adicionar filas e crons para Google Maps
-- Data: 2024-11-23
-- Descrição: Completa a arquitetura de filas PGMQ
-- =====================================================

-- =====================================================
-- 1. HABILITAR EXTENSÕES NECESSÁRIAS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pgmq CASCADE;

-- =====================================================
-- 2. CRIAR FILAS PGMQ QUE FALTAM
-- =====================================================

-- Fila para processar páginas do Google Maps (10 leads por página)
SELECT pgmq.create('google_maps_queue');

-- Fila para scraping de websites (será usada depois)
SELECT pgmq.create('scraping_queue');

-- =====================================================
-- 3. FUNÇÃO HELPER: Enviar mensagem para PGMQ
-- =====================================================

CREATE OR REPLACE FUNCTION pgmq_send(
  queue_name TEXT,
  message JSONB,
  delay_seconds INTEGER DEFAULT 0
)
RETURNS BIGINT AS $$
DECLARE
  msg_id BIGINT;
  queue_table TEXT;
BEGIN
  -- Nome da tabela da fila
  queue_table := 'pgmq.q_' || queue_name;
  
  -- Inserir mensagem na fila
  EXECUTE format(
    'INSERT INTO %I (message, vt) VALUES ($1, NOW() + INTERVAL ''%s seconds'') RETURNING msg_id',
    queue_table,
    delay_seconds
  ) INTO msg_id USING message;
  
  RETURN msg_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao enviar mensagem para fila %: %', queue_name, SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNÇÃO: Processar fila do Google Maps
-- =====================================================

CREATE OR REPLACE FUNCTION process_google_maps_queue()
RETURNS void AS $$
DECLARE
  msg RECORD;
  http_result RECORD;
BEGIN
  -- Buscar até 10 mensagens da fila
  FOR msg IN 
    SELECT msg_id, message
    FROM pgmq.read('google_maps_queue', 10, 120) -- 10 msgs, 120s visibility timeout
  LOOP
    BEGIN
      -- Chamar Edge Function via HTTP
      SELECT status, content INTO http_result
      FROM http((
        'POST',
        'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/fetch-google-maps',
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
        ],
        'application/json',
        msg.message::text
      )::http_request);
      
      -- Deletar mensagem da fila após processar com sucesso
      IF http_result.status BETWEEN 200 AND 299 THEN
        PERFORM pgmq.delete('google_maps_queue', msg.msg_id);
      ELSE
        RAISE WARNING 'HTTP %: %', http_result.status, http_result.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log de erro (a mensagem voltará para a fila após timeout)
      RAISE WARNING 'Erro ao processar mensagem %: %', msg.msg_id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CRON JOB: Processar fila do Google Maps
-- =====================================================

-- Remove o cron se já existir
SELECT cron.unschedule('process-google-maps-queue') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-google-maps-queue'
);

-- Criar cron que processa a fila a cada 15 segundos
SELECT cron.schedule(
  'process-google-maps-queue',
  '15 seconds',
  'SELECT process_google_maps_queue();'
);

-- =====================================================
-- 6. FUNÇÃO: Enfileirar leads para enriquecimento
-- =====================================================

CREATE OR REPLACE FUNCTION enqueue_enrichment_leads()
RETURNS void AS $$
DECLARE
  lead RECORD;
  enqueued_count INTEGER := 0;
BEGIN
  -- Buscar leads prontos para enriquecimento
  FOR lead IN
    SELECT 
      id, 
      extraction_run_id,
      workspace_id,
      extracted_data
    FROM lead_extraction_staging
    WHERE status_enrichment = 'pending'
      AND status_extraction = 'google_fetched'  -- ✅ CORRIGIDO: era 'ready', agora 'google_fetched'
      AND filter_passed = true
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    -- Enfileirar na PGMQ
    PERFORM pgmq_send(
      'enrichment_queue',
      jsonb_build_object(
        'lead_id', lead.id,
        'run_id', lead.extraction_run_id,
        'workspace_id', lead.workspace_id,
        'data', lead.extracted_data
      )
    );
    
    -- Marcar como 'enriching'
    UPDATE lead_extraction_staging
    SET status_enrichment = 'enriching'
    WHERE id = lead.id;
    
    enqueued_count := enqueued_count + 1;
  END LOOP;
  
  IF enqueued_count > 0 THEN
    RAISE NOTICE 'Enfileirados % leads para enriquecimento', enqueued_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. AJUSTAR CRON DE ENRIQUECIMENTO
-- =====================================================

-- Remove o cron antigo
SELECT cron.unschedule('process-enrichment-queue') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-enrichment-queue'
);

-- Recriar com enfileiramento PGMQ
SELECT cron.schedule(
  'process-enrichment-queue',
  '1 minute',
  'SELECT enqueue_enrichment_leads();'
);

-- =====================================================
-- 8. FUNÇÃO: Consumir fila de enriquecimento
-- =====================================================

CREATE OR REPLACE FUNCTION consume_enrichment_queue()
RETURNS void AS $$
DECLARE
  msg RECORD;
  http_result RECORD;
BEGIN
  -- Buscar até 20 mensagens da fila
  FOR msg IN 
    SELECT msg_id, message
    FROM pgmq.read('enrichment_queue', 20, 120)
  LOOP
    BEGIN
      -- Chamar Edge Function de enriquecimento
      SELECT status, content INTO http_result
      FROM http((
        'POST',
        'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/enrich-lead',
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
        ],
        'application/json',
        msg.message::text
      )::http_request);
      
      -- Deletar mensagem da fila se processado com sucesso
      IF http_result.status BETWEEN 200 AND 299 THEN
        PERFORM pgmq.delete('enrichment_queue', msg.msg_id);
      ELSE
        RAISE WARNING 'HTTP %: %', http_result.status, http_result.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao enriquecer lead %: %', msg.msg_id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. CRON JOB: Consumir fila de enriquecimento
-- =====================================================

SELECT cron.schedule(
  'consume-enrichment-queue',
  '30 seconds',
  'SELECT consume_enrichment_queue();'
);

-- =====================================================
-- 10. ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =====================================================

-- Índice para buscar leads por status e data
CREATE INDEX IF NOT EXISTS idx_staging_extraction_status_created 
  ON lead_extraction_staging(status_extraction, created_at) 
  WHERE status_extraction IN ('pending', 'google_fetched');

-- Índice para buscar leads por run e status
CREATE INDEX IF NOT EXISTS idx_staging_run_status 
  ON lead_extraction_staging(extraction_run_id, status_extraction, status_enrichment);

-- =====================================================
-- 11. FUNÇÃO HELPER: Verificar progresso do run
-- =====================================================

CREATE OR REPLACE FUNCTION get_extraction_progress(p_run_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status_extraction = 'pending'),
    'google_fetched', COUNT(*) FILTER (WHERE status_extraction = 'google_fetched'),
    'scraped', COUNT(*) FILTER (WHERE status_extraction = 'scraped'),
    'ready', COUNT(*) FILTER (WHERE status_extraction = 'ready'),
    'filtered_out', COUNT(*) FILTER (WHERE status_extraction = 'filtered_out'),
    'enriching', COUNT(*) FILTER (WHERE status_enrichment = 'enriching'),
    'enriched', COUNT(*) FILTER (WHERE status_enrichment = 'completed'),
    'migrated', COUNT(*) FILTER (WHERE migrated_at IS NOT NULL)
  ) INTO result
  FROM lead_extraction_staging
  WHERE extraction_run_id = p_run_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Listar todas as filas criadas
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'FILAS PGMQ CRIADAS:';
  RAISE NOTICE '==============================================';
END $$;

SELECT queue_name FROM pgmq.list_queues() ORDER BY queue_name;

-- Listar todos os cron jobs ativos
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CRON JOBS ATIVOS:';
  RAISE NOTICE '==============================================';
END $$;

SELECT 
  jobname, 
  schedule,
  active
FROM cron.job 
WHERE jobname LIKE '%queue%' OR jobname LIKE '%leads%'
ORDER BY jobname;

-- Status inicial das filas (deve estar vazio)
DO $$
DECLARE
  google_count INTEGER;
  enrichment_count INTEGER;
  migration_count INTEGER;
BEGIN
  -- Contar mensagens nas filas
  SELECT COUNT(*) INTO google_count 
  FROM pgmq.q_google_maps_queue;
  
  SELECT COUNT(*) INTO enrichment_count 
  FROM pgmq.q_enrichment_queue;
  
  SELECT COUNT(*) INTO migration_count 
  FROM pgmq.q_migration_queue;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'STATUS DAS FILAS:';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'google_maps_queue: % mensagens', google_count;
  RAISE NOTICE 'enrichment_queue: % mensagens', enrichment_count;
  RAISE NOTICE 'migration_queue: % mensagens', migration_count;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SETUP COMPLETO! ✅';
  RAISE NOTICE '==============================================';
END $$;