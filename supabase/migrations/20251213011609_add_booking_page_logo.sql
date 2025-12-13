-- ============================================
-- ADD BOOKING PAGE LOGO
-- Migration: Add logo URL for public booking page
-- ============================================

-- Adicionar coluna de logo para página de agendamento público
ALTER TABLE calendar_settings
ADD COLUMN IF NOT EXISTS booking_page_logo TEXT DEFAULT NULL;

-- Comentário na coluna
COMMENT ON COLUMN calendar_settings.booking_page_logo IS 'URL da logo para exibir na página pública de agendamento';
