-- ============================================
-- EVENT REMINDERS SYSTEM
-- Migration: Create event reminders table and update internal_events
-- ============================================

-- ============================================
-- 1. ADD INBOX_ID TO INTERNAL_EVENTS
-- ============================================
-- Para saber qual caixa de entrada usar para enviar lembretes
ALTER TABLE internal_events
ADD COLUMN IF NOT EXISTS inbox_id UUID REFERENCES inboxes(id) ON DELETE SET NULL;

-- Índice para buscar eventos por inbox
CREATE INDEX IF NOT EXISTS idx_internal_events_inbox ON internal_events(inbox_id);

-- ============================================
-- 2. CREATE EVENT_REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES internal_events(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Caixa de entrada para envio (herda do evento ou específico)
  inbox_id UUID REFERENCES inboxes(id) ON DELETE SET NULL,

  -- Quando enviar
  remind_before_minutes INTEGER NOT NULL DEFAULT 60,
  remind_at TIMESTAMPTZ,

  -- Conteúdo personalizado (NULL = usar mensagem padrão)
  message_template TEXT,

  -- Status do lembrete
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES FOR EVENT_REMINDERS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_workspace ON event_reminders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_status ON event_reminders(status);
CREATE INDEX IF NOT EXISTS idx_event_reminders_remind_at ON event_reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_event_reminders_pending ON event_reminders(status, remind_at)
  WHERE status = 'pending';

-- ============================================
-- 4. TRIGGER PARA UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS trigger_event_reminders_updated_at ON event_reminders;
CREATE TRIGGER trigger_event_reminders_updated_at
  BEFORE UPDATE ON event_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. FUNCTION TO CALCULATE REMIND_AT
-- ============================================
CREATE OR REPLACE FUNCTION calculate_reminder_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar start_time do evento e calcular remind_at
  SELECT (ie.start_time - (NEW.remind_before_minutes || ' minutes')::interval)
  INTO NEW.remind_at
  FROM internal_events ie
  WHERE ie.id = NEW.event_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular remind_at automaticamente
DROP TRIGGER IF EXISTS trigger_calculate_reminder_time ON event_reminders;
CREATE TRIGGER trigger_calculate_reminder_time
  BEFORE INSERT OR UPDATE OF remind_before_minutes, event_id ON event_reminders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_reminder_time();

-- ============================================
-- 6. FUNCTION TO UPDATE REMINDERS WHEN EVENT TIME CHANGES
-- ============================================
CREATE OR REPLACE FUNCTION update_reminders_on_event_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular remind_at para todos os lembretes deste evento
  UPDATE event_reminders
  SET remind_at = (NEW.start_time - (remind_before_minutes || ' minutes')::interval),
      updated_at = NOW()
  WHERE event_id = NEW.id
    AND status = 'pending';

  -- Se evento foi cancelado, cancelar lembretes pendentes
  IF NEW.event_status = 'cancelled' AND OLD.event_status != 'cancelled' THEN
    UPDATE event_reminders
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE event_id = NEW.id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar lembretes quando evento muda
DROP TRIGGER IF EXISTS trigger_update_reminders_on_event_change ON internal_events;
CREATE TRIGGER trigger_update_reminders_on_event_change
  AFTER UPDATE OF start_time, event_status ON internal_events
  FOR EACH ROW
  EXECUTE FUNCTION update_reminders_on_event_change();

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuários podem ver lembretes do seu workspace
DROP POLICY IF EXISTS "Users can view workspace event reminders" ON event_reminders;
CREATE POLICY "Users can view workspace event reminders"
  ON event_reminders FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Usuários podem criar lembretes no seu workspace
DROP POLICY IF EXISTS "Users can create workspace event reminders" ON event_reminders;
CREATE POLICY "Users can create workspace event reminders"
  ON event_reminders FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Usuários podem atualizar lembretes do seu workspace
DROP POLICY IF EXISTS "Users can update workspace event reminders" ON event_reminders;
CREATE POLICY "Users can update workspace event reminders"
  ON event_reminders FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: Usuários podem deletar lembretes do seu workspace
DROP POLICY IF EXISTS "Users can delete workspace event reminders" ON event_reminders;
CREATE POLICY "Users can delete workspace event reminders"
  ON event_reminders FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 8. COMMENTS
-- ============================================
COMMENT ON TABLE event_reminders IS 'Lembretes de eventos do calendário para envio via WhatsApp';
COMMENT ON COLUMN event_reminders.remind_before_minutes IS 'Minutos antes do evento para enviar o lembrete (60=1h, 1440=1dia)';
COMMENT ON COLUMN event_reminders.remind_at IS 'Data/hora calculada para envio (event.start_time - remind_before_minutes)';
COMMENT ON COLUMN event_reminders.message_template IS 'Mensagem personalizada. Variáveis: {nome}, {empresa}, {titulo}, {data}, {hora}, {local}, {tipo}';
COMMENT ON COLUMN event_reminders.status IS 'pending=aguardando, scheduled=agendado, sent=enviado, failed=falhou, cancelled=cancelado';
COMMENT ON COLUMN internal_events.inbox_id IS 'Caixa de entrada para envio de lembretes WhatsApp';

-- ============================================
-- 9. DEFAULT REMINDER TEMPLATES TABLE (OPCIONAL)
-- ============================================
CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  message_template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reminder_templates_workspace ON reminder_templates(workspace_id);

-- RLS
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage workspace reminder templates" ON reminder_templates;
CREATE POLICY "Users can manage workspace reminder templates"
  ON reminder_templates FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_reminder_templates_updated_at ON reminder_templates;
CREATE TRIGGER trigger_reminder_templates_updated_at
  BEFORE UPDATE ON reminder_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reminder_templates IS 'Templates de mensagens de lembrete personalizáveis por workspace';
