-- ============================================
-- CALENDAR SYSTEM TABLES
-- Migration: Create internal calendar tables
-- ============================================

-- ============================================
-- 1. INTERNAL CALENDARS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  calendar_type VARCHAR(50) DEFAULT 'appointments',
  color VARCHAR(7) DEFAULT '#1976d2',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  is_active BOOLEAN DEFAULT true,
  ai_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para internal_calendars
CREATE INDEX IF NOT EXISTS idx_internal_calendars_workspace ON internal_calendars(workspace_id);
CREATE INDEX IF NOT EXISTS idx_internal_calendars_owner ON internal_calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_internal_calendars_active ON internal_calendars(workspace_id, is_active);

-- ============================================
-- 2. INTERNAL EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS internal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  internal_calendar_id UUID NOT NULL REFERENCES internal_calendars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('meeting', 'call', 'demo', 'reminder')),
  organizer_email TEXT,
  attendees JSONB DEFAULT '[]',
  location TEXT,
  event_status VARCHAR(50) DEFAULT 'confirmed' CHECK (event_status IN ('confirmed', 'tentative', 'cancelled')),
  show_as VARCHAR(20) DEFAULT 'busy' CHECK (show_as IN ('busy', 'free')),
  recurrence_rule TEXT,
  is_meeting BOOLEAN DEFAULT false,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  confirmed_via VARCHAR(50) CHECK (confirmed_via IN ('manual', 'whatsapp', 'email', 'ai')),
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para internal_events
CREATE INDEX IF NOT EXISTS idx_internal_events_workspace ON internal_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_internal_events_calendar ON internal_events(internal_calendar_id);
CREATE INDEX IF NOT EXISTS idx_internal_events_start_time ON internal_events(start_time);
CREATE INDEX IF NOT EXISTS idx_internal_events_end_time ON internal_events(end_time);
CREATE INDEX IF NOT EXISTS idx_internal_events_lead ON internal_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_internal_events_status ON internal_events(event_status);
CREATE INDEX IF NOT EXISTS idx_internal_events_type ON internal_events(event_type);
CREATE INDEX IF NOT EXISTS idx_internal_events_workspace_dates ON internal_events(workspace_id, start_time, end_time);

-- ============================================
-- 3. CALENDAR SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  internal_calendar_id UUID REFERENCES internal_calendars(id) ON DELETE CASCADE,
  availability JSONB DEFAULT '{
    "monday": [{"start": "08:00", "end": "18:00"}],
    "tuesday": [{"start": "08:00", "end": "18:00"}],
    "wednesday": [{"start": "08:00", "end": "18:00"}],
    "thursday": [{"start": "08:00", "end": "18:00"}],
    "friday": [{"start": "08:00", "end": "18:00"}],
    "saturday": [],
    "sunday": []
  }',
  default_durations JSONB DEFAULT '{"meeting": 60, "call": 30, "demo": 45, "reminder": 15}',
  buffer_between_events INTEGER DEFAULT 15,
  min_booking_notice_hours INTEGER DEFAULT 1,
  max_booking_days_ahead INTEGER DEFAULT 30,
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  allow_overlapping BOOLEAN DEFAULT false,
  whatsapp_confirmation_enabled BOOLEAN DEFAULT false,
  whatsapp_reminder_enabled BOOLEAN DEFAULT false,
  whatsapp_reminder_hours_before INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint único para evitar duplicatas de settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_settings_unique
ON calendar_settings(workspace_id, COALESCE(internal_calendar_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Índices para calendar_settings
CREATE INDEX IF NOT EXISTS idx_calendar_settings_workspace ON calendar_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_settings_calendar ON calendar_settings(internal_calendar_id);

-- ============================================
-- 4. TRIGGERS PARA UPDATED_AT
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para internal_calendars
DROP TRIGGER IF EXISTS trigger_internal_calendars_updated_at ON internal_calendars;
CREATE TRIGGER trigger_internal_calendars_updated_at
  BEFORE UPDATE ON internal_calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para internal_events
DROP TRIGGER IF EXISTS trigger_internal_events_updated_at ON internal_events;
CREATE TRIGGER trigger_internal_events_updated_at
  BEFORE UPDATE ON internal_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calendar_settings
DROP TRIGGER IF EXISTS trigger_calendar_settings_updated_at ON calendar_settings;
CREATE TRIGGER trigger_calendar_settings_updated_at
  BEFORE UPDATE ON calendar_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE internal_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES PARA INTERNAL_CALENDARS
-- ============================================

-- SELECT: Usuários podem ver calendários do seu workspace
DROP POLICY IF EXISTS "Users can view workspace calendars" ON internal_calendars;
CREATE POLICY "Users can view workspace calendars"
  ON internal_calendars FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Usuários podem criar calendários no seu workspace
DROP POLICY IF EXISTS "Users can create workspace calendars" ON internal_calendars;
CREATE POLICY "Users can create workspace calendars"
  ON internal_calendars FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Usuários podem atualizar calendários do seu workspace
DROP POLICY IF EXISTS "Users can update workspace calendars" ON internal_calendars;
CREATE POLICY "Users can update workspace calendars"
  ON internal_calendars FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: Usuários podem deletar calendários do seu workspace
DROP POLICY IF EXISTS "Users can delete workspace calendars" ON internal_calendars;
CREATE POLICY "Users can delete workspace calendars"
  ON internal_calendars FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES PARA INTERNAL_EVENTS
-- ============================================

-- SELECT: Usuários podem ver eventos do seu workspace
DROP POLICY IF EXISTS "Users can view workspace events" ON internal_events;
CREATE POLICY "Users can view workspace events"
  ON internal_events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Usuários podem criar eventos no seu workspace
DROP POLICY IF EXISTS "Users can create workspace events" ON internal_events;
CREATE POLICY "Users can create workspace events"
  ON internal_events FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Usuários podem atualizar eventos do seu workspace
DROP POLICY IF EXISTS "Users can update workspace events" ON internal_events;
CREATE POLICY "Users can update workspace events"
  ON internal_events FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: Usuários podem deletar eventos do seu workspace
DROP POLICY IF EXISTS "Users can delete workspace events" ON internal_events;
CREATE POLICY "Users can delete workspace events"
  ON internal_events FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES PARA CALENDAR_SETTINGS
-- ============================================

-- SELECT: Usuários podem ver configurações do seu workspace
DROP POLICY IF EXISTS "Users can view workspace calendar settings" ON calendar_settings;
CREATE POLICY "Users can view workspace calendar settings"
  ON calendar_settings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Usuários podem criar configurações no seu workspace
DROP POLICY IF EXISTS "Users can create workspace calendar settings" ON calendar_settings;
CREATE POLICY "Users can create workspace calendar settings"
  ON calendar_settings FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Usuários podem atualizar configurações do seu workspace
DROP POLICY IF EXISTS "Users can update workspace calendar settings" ON calendar_settings;
CREATE POLICY "Users can update workspace calendar settings"
  ON calendar_settings FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: Usuários podem deletar configurações do seu workspace
DROP POLICY IF EXISTS "Users can delete workspace calendar settings" ON calendar_settings;
CREATE POLICY "Users can delete workspace calendar settings"
  ON calendar_settings FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 6. COMENTÁRIOS NAS TABELAS
-- ============================================
COMMENT ON TABLE internal_calendars IS 'Calendários internos do sistema para agendamentos';
COMMENT ON TABLE internal_events IS 'Eventos/agendamentos do calendário interno';
COMMENT ON TABLE calendar_settings IS 'Configurações de disponibilidade e preferências do calendário';

COMMENT ON COLUMN internal_events.event_type IS 'Tipo do evento: meeting, call, demo, reminder';
COMMENT ON COLUMN internal_events.event_status IS 'Status do evento: confirmed, tentative, cancelled';
COMMENT ON COLUMN internal_events.confirmed_via IS 'Método de confirmação: manual, whatsapp, email, ai';
COMMENT ON COLUMN calendar_settings.availability IS 'JSON com horários disponíveis por dia da semana';
COMMENT ON COLUMN calendar_settings.default_durations IS 'Durações padrão em minutos por tipo de evento';
