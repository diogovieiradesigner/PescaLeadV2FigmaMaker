-- Migration: Create google_calendar_connections table
-- Armazena tokens OAuth por usuário para sincronização com Google Calendar

CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- OAuth Tokens (criptografados via pgcrypto)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Info do usuário Google
  google_email TEXT NOT NULL,
  google_user_id TEXT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_workspace_google UNIQUE(user_id, workspace_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_google_conn_user ON google_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_google_conn_workspace ON google_calendar_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_conn_active ON google_calendar_connections(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_google_conn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_google_conn_updated_at ON google_calendar_connections;
CREATE TRIGGER trigger_google_conn_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_google_conn_updated_at();

-- RLS (Row Level Security)
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver suas próprias conexões
DROP POLICY IF EXISTS "Users can view own google connections" ON google_calendar_connections;
CREATE POLICY "Users can view own google connections" ON google_calendar_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Usuários podem criar suas próprias conexões
DROP POLICY IF EXISTS "Users can create own google connections" ON google_calendar_connections;
CREATE POLICY "Users can create own google connections" ON google_calendar_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar suas próprias conexões
DROP POLICY IF EXISTS "Users can update own google connections" ON google_calendar_connections;
CREATE POLICY "Users can update own google connections" ON google_calendar_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Usuários podem deletar suas próprias conexões
DROP POLICY IF EXISTS "Users can delete own google connections" ON google_calendar_connections;
CREATE POLICY "Users can delete own google connections" ON google_calendar_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Service role tem acesso total (para Edge Functions)
DROP POLICY IF EXISTS "Service role has full access to google connections" ON google_calendar_connections;
CREATE POLICY "Service role has full access to google connections" ON google_calendar_connections
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE google_calendar_connections IS 'Armazena conexões OAuth do Google Calendar por usuário';
COMMENT ON COLUMN google_calendar_connections.access_token IS 'Token de acesso do Google (criptografado)';
COMMENT ON COLUMN google_calendar_connections.refresh_token IS 'Token de refresh do Google (criptografado)';
COMMENT ON COLUMN google_calendar_connections.token_expires_at IS 'Data/hora de expiração do access_token';
COMMENT ON COLUMN google_calendar_connections.google_email IS 'Email da conta Google conectada';
COMMENT ON COLUMN google_calendar_connections.sync_error IS 'Último erro de sincronização, se houver';
