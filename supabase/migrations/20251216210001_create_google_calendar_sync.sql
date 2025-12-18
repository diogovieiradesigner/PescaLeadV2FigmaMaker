-- Migration: Create google_calendar_sync table
-- Armazena calendários Google selecionados para sincronização

CREATE TABLE IF NOT EXISTS google_calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES google_calendar_connections(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Calendário Google
  google_calendar_id TEXT NOT NULL,
  google_calendar_name TEXT NOT NULL,
  google_calendar_color TEXT,

  -- Configurações de sync
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'both' CHECK (sync_direction IN ('to_google', 'from_google', 'both')),

  -- Webhook
  webhook_channel_id TEXT,
  webhook_resource_id TEXT,
  webhook_expiration TIMESTAMPTZ,

  -- Status
  last_sync_at TIMESTAMPTZ,
  last_sync_token TEXT, -- Para incremental sync
  sync_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_google_calendar_per_connection UNIQUE(connection_id, google_calendar_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_google_sync_connection ON google_calendar_sync(connection_id);
CREATE INDEX IF NOT EXISTS idx_google_sync_workspace ON google_calendar_sync(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_sync_user ON google_calendar_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_google_sync_enabled ON google_calendar_sync(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_google_sync_webhook ON google_calendar_sync(webhook_channel_id) WHERE webhook_channel_id IS NOT NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_google_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_google_sync_updated_at ON google_calendar_sync;
CREATE TRIGGER trigger_google_sync_updated_at
  BEFORE UPDATE ON google_calendar_sync
  FOR EACH ROW EXECUTE FUNCTION update_google_sync_updated_at();

-- RLS (Row Level Security)
ALTER TABLE google_calendar_sync ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios syncs
DROP POLICY IF EXISTS "Users can view own google syncs" ON google_calendar_sync;
CREATE POLICY "Users can view own google syncs" ON google_calendar_sync
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Usuários podem criar seus próprios syncs
DROP POLICY IF EXISTS "Users can create own google syncs" ON google_calendar_sync;
CREATE POLICY "Users can create own google syncs" ON google_calendar_sync
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar seus próprios syncs
DROP POLICY IF EXISTS "Users can update own google syncs" ON google_calendar_sync;
CREATE POLICY "Users can update own google syncs" ON google_calendar_sync
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Usuários podem deletar seus próprios syncs
DROP POLICY IF EXISTS "Users can delete own google syncs" ON google_calendar_sync;
CREATE POLICY "Users can delete own google syncs" ON google_calendar_sync
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Service role tem acesso total
DROP POLICY IF EXISTS "Service role has full access to google syncs" ON google_calendar_sync;
CREATE POLICY "Service role has full access to google syncs" ON google_calendar_sync
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

COMMENT ON TABLE google_calendar_sync IS 'Calendários Google selecionados para sincronização';
COMMENT ON COLUMN google_calendar_sync.google_calendar_id IS 'ID único do calendário no Google Calendar';
COMMENT ON COLUMN google_calendar_sync.sync_direction IS 'Direção da sincronização: to_google, from_google ou both';
COMMENT ON COLUMN google_calendar_sync.webhook_channel_id IS 'ID do canal webhook para push notifications';
COMMENT ON COLUMN google_calendar_sync.last_sync_token IS 'Token para sincronização incremental do Google';
