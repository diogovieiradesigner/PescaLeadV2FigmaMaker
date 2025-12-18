-- Migration: Create google_sync_log table
-- Log de operações de sincronização para auditoria e debugging

CREATE TABLE IF NOT EXISTS google_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_calendar_sync_id UUID REFERENCES google_calendar_sync(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Operação
  operation TEXT NOT NULL CHECK (operation IN (
    'full_sync',
    'incremental_sync',
    'push_to_google',
    'pull_from_google',
    'webhook_received',
    'token_refresh',
    'webhook_setup',
    'webhook_renew'
  )),

  -- Status
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'success', 'error', 'partial')),

  -- Detalhes
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  events_skipped INTEGER DEFAULT 0,

  -- Erro (se houver)
  error_message TEXT,
  error_details JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Duração em ms
  duration_ms INTEGER
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sync_log_calendar ON google_sync_log(google_calendar_sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_workspace ON google_sync_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user ON google_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_operation ON google_sync_log(operation);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON google_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON google_sync_log(started_at DESC);

-- RLS
ALTER TABLE google_sync_log ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios logs
DROP POLICY IF EXISTS "Users can view own sync logs" ON google_sync_log;
CREATE POLICY "Users can view own sync logs" ON google_sync_log
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role pode inserir/atualizar (para Edge Functions)
DROP POLICY IF EXISTS "Service role can manage sync logs" ON google_sync_log;
CREATE POLICY "Service role can manage sync logs" ON google_sync_log
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Função para limpar logs antigos (manter últimos 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM google_sync_log
  WHERE started_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE google_sync_log IS 'Log de operações de sincronização com Google Calendar';
COMMENT ON COLUMN google_sync_log.operation IS 'Tipo de operação de sync realizada';
COMMENT ON COLUMN google_sync_log.status IS 'Status final da operação: started, success, error, partial';
COMMENT ON COLUMN google_sync_log.duration_ms IS 'Tempo total da operação em milissegundos';
