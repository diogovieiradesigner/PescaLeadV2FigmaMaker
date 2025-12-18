-- Migration: Correções de índices e constraints do Google Calendar
-- Data: 2024-12-17

-- ============================================
-- FASE 4.1: Corrigir índices duplicados
-- ============================================

-- Remover índice duplicado se existir
DROP INDEX IF EXISTS idx_google_sync_queue_status;

-- ============================================
-- FASE 4.2: Adicionar índice para cron job
-- ============================================

-- Índice otimizado para buscar conexões que precisam de sync
CREATE INDEX IF NOT EXISTS idx_google_conn_sync_needed
ON google_calendar_connections(is_active, last_sync_at DESC)
WHERE is_active = true AND sync_error IS NULL;

-- Índice para buscar conexões com erro (para retry)
CREATE INDEX IF NOT EXISTS idx_google_conn_with_error
ON google_calendar_connections(updated_at DESC)
WHERE sync_error IS NOT NULL;

-- ============================================
-- FASE 4.3: Remover constraint UNIQUE problemática
-- ============================================

-- Verificar e remover constraint se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'google_sync_queue_connection_id_status_key'
  ) THEN
    ALTER TABLE google_sync_queue
    DROP CONSTRAINT google_sync_queue_connection_id_status_key;
  END IF;
END $$;

-- Adicionar constraint mais flexível: apenas 1 item 'processing' por conexão
DROP INDEX IF EXISTS google_sync_queue_one_processing_per_connection;
CREATE UNIQUE INDEX google_sync_queue_one_processing_per_connection
ON google_sync_queue(connection_id)
WHERE status = 'processing';

-- ============================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================

-- Índice para limpar itens antigos da fila
CREATE INDEX IF NOT EXISTS idx_sync_queue_cleanup
ON google_sync_queue(completed_at)
WHERE status IN ('completed', 'error') AND completed_at IS NOT NULL;

-- Índice para buscar calendários ativos por workspace
CREATE INDEX IF NOT EXISTS idx_google_sync_workspace_enabled
ON google_calendar_sync(workspace_id, sync_enabled)
WHERE sync_enabled = true;
