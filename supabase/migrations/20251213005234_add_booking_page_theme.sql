-- ============================================
-- ADD BOOKING PAGE THEME SETTING
-- Migration: Add theme preference for public booking page
-- ============================================

-- Adicionar coluna de tema para página de agendamento público
ALTER TABLE calendar_settings
ADD COLUMN IF NOT EXISTS booking_page_theme VARCHAR(20) DEFAULT 'auto';

-- Adicionar constraint de validação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'calendar_settings_booking_page_theme_check'
  ) THEN
    ALTER TABLE calendar_settings
    ADD CONSTRAINT calendar_settings_booking_page_theme_check
    CHECK (booking_page_theme IN ('light', 'dark', 'auto'));
  END IF;
END $$;

-- Comentário na coluna
COMMENT ON COLUMN calendar_settings.booking_page_theme IS 'Tema da página pública de agendamento: light, dark, ou auto (segue preferência do sistema do usuário)';
