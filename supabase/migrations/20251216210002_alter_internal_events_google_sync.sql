-- Migration: Alter internal_events table for Google Calendar sync
-- Adiciona campos para rastrear sincronização com Google Calendar

-- Adicionar coluna para ID do evento no Google Calendar
ALTER TABLE internal_events
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Adicionar coluna para o calendário Google de onde veio/vai
ALTER TABLE internal_events
ADD COLUMN IF NOT EXISTS google_calendar_sync_id UUID REFERENCES google_calendar_sync(id) ON DELETE SET NULL;

-- Adicionar coluna para marcar fonte do evento (internal, google, public_booking, ai)
ALTER TABLE internal_events
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal'
CHECK (source IN ('internal', 'google', 'public_booking', 'ai'));

-- Adicionar coluna para última sincronização
ALTER TABLE internal_events
ADD COLUMN IF NOT EXISTS google_synced_at TIMESTAMPTZ;

-- Adicionar coluna para hash do evento (para detectar alterações)
ALTER TABLE internal_events
ADD COLUMN IF NOT EXISTS google_etag TEXT;

-- Adicionar coluna para marcar se precisa sincronizar
ALTER TABLE internal_events
ADD COLUMN IF NOT EXISTS needs_google_sync BOOLEAN DEFAULT false;

-- Índice para buscar eventos que precisam sincronizar
CREATE INDEX IF NOT EXISTS idx_events_needs_google_sync
ON internal_events(needs_google_sync)
WHERE needs_google_sync = true;

-- Índice para buscar por google_event_id
CREATE INDEX IF NOT EXISTS idx_events_google_event_id
ON internal_events(google_event_id)
WHERE google_event_id IS NOT NULL;

-- Índice para buscar eventos por source
CREATE INDEX IF NOT EXISTS idx_events_source
ON internal_events(source);

-- Trigger para marcar evento para sincronização quando alterado
CREATE OR REPLACE FUNCTION mark_event_for_google_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o evento está conectado a um calendário Google e foi modificado
  IF NEW.google_calendar_sync_id IS NOT NULL AND NEW.source != 'google' THEN
    -- Marcar para sync se houve alteração relevante
    IF OLD.title IS DISTINCT FROM NEW.title OR
       OLD.description IS DISTINCT FROM NEW.description OR
       OLD.start_time IS DISTINCT FROM NEW.start_time OR
       OLD.end_time IS DISTINCT FROM NEW.end_time OR
       OLD.location IS DISTINCT FROM NEW.location OR
       OLD.event_status IS DISTINCT FROM NEW.event_status OR
       OLD.attendees IS DISTINCT FROM NEW.attendees THEN
      NEW.needs_google_sync = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_event_for_google_sync ON internal_events;
CREATE TRIGGER trigger_mark_event_for_google_sync
  BEFORE UPDATE ON internal_events
  FOR EACH ROW EXECUTE FUNCTION mark_event_for_google_sync();

COMMENT ON COLUMN internal_events.google_event_id IS 'ID do evento correspondente no Google Calendar';
COMMENT ON COLUMN internal_events.google_calendar_sync_id IS 'Referência ao calendário Google sincronizado';
COMMENT ON COLUMN internal_events.source IS 'Fonte do evento: internal, google, public_booking ou ai';
COMMENT ON COLUMN internal_events.google_synced_at IS 'Última vez que foi sincronizado com Google';
COMMENT ON COLUMN internal_events.google_etag IS 'ETag do Google para detectar alterações';
COMMENT ON COLUMN internal_events.needs_google_sync IS 'Flag para indicar que precisa sincronizar com Google';
