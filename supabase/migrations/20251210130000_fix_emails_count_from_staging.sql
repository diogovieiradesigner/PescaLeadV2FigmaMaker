-- =============================================================================
-- FIX: Atualizar emails_count e whatsapp_valid baseado em lead_extraction_staging
-- =============================================================================
-- Problema: emails_count na tabela leads não está sendo atualizado quando
-- os leads são migrados de lead_extraction_staging
-- =============================================================================

-- =============================================================================
-- 1. FUNÇÃO PARA ATUALIZAR emails_count E whatsapp_valid
-- =============================================================================

CREATE OR REPLACE FUNCTION update_lead_contact_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emails_count INTEGER := 0;
  v_has_whatsapp BOOLEAN := false;
  v_primary_email TEXT;
  v_emails JSONB;
BEGIN
  -- Buscar dados de lead_extraction_staging se lead_extraction_id existir
  IF NEW.lead_extraction_id IS NOT NULL THEN
    SELECT 
      primary_email,
      emails,
      CASE 
        WHEN phones IS NOT NULL THEN
          EXISTS(
            SELECT 1 
            FROM jsonb_array_elements(phones) phone
            WHERE (phone->>'whatsapp')::boolean = true
          )
        ELSE false
      END
    INTO v_primary_email, v_emails, v_has_whatsapp
    FROM lead_extraction_staging
    WHERE id = NEW.lead_extraction_id;
    
    -- Calcular emails_count
    IF v_emails IS NOT NULL AND jsonb_typeof(v_emails) = 'array' THEN
      v_emails_count := jsonb_array_length(v_emails);
    ELSIF v_primary_email IS NOT NULL AND v_primary_email != '' THEN
      v_emails_count := 1;
    END IF;
    
    -- Atualizar campos
    NEW.emails_count := v_emails_count;
    NEW.whatsapp_valid := COALESCE(v_has_whatsapp, false);
  END IF;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. CRIAR TRIGGER
-- =============================================================================

DROP TRIGGER IF EXISTS trg_update_lead_contact_counts ON leads;

CREATE TRIGGER trg_update_lead_contact_counts
BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW
WHEN (NEW.lead_extraction_id IS NOT NULL)
EXECUTE FUNCTION update_lead_contact_counts();

-- =============================================================================
-- 3. BACKFILL: Atualizar leads existentes
-- =============================================================================

UPDATE leads l
SET 
  emails_count = COALESCE(
    CASE 
      WHEN les.emails IS NOT NULL AND jsonb_typeof(les.emails) = 'array' THEN
        jsonb_array_length(les.emails)
      WHEN les.primary_email IS NOT NULL AND les.primary_email != '' THEN
        1
      ELSE 0
    END,
    0
  ),
  whatsapp_valid = COALESCE(
    CASE 
      WHEN les.phones IS NOT NULL THEN
        EXISTS(
          SELECT 1 
          FROM jsonb_array_elements(les.phones) phone
          WHERE (phone->>'whatsapp')::boolean = true
        )
      ELSE false
    END,
    false
  ),
  updated_at = NOW()
FROM lead_extraction_staging les
WHERE l.lead_extraction_id = les.id
  AND l.status = 'active'
  AND (
    -- Atualizar se emails_count está errado
    l.emails_count != COALESCE(
      CASE 
        WHEN les.emails IS NOT NULL AND jsonb_typeof(les.emails) = 'array' THEN
          jsonb_array_length(les.emails)
        WHEN les.primary_email IS NOT NULL AND les.primary_email != '' THEN
          1
        ELSE 0
      END,
      0
    )
    OR
    -- Atualizar se whatsapp_valid está errado
    l.whatsapp_valid != COALESCE(
      CASE 
        WHEN les.phones IS NOT NULL THEN
          EXISTS(
            SELECT 1 
            FROM jsonb_array_elements(les.phones) phone
            WHERE (phone->>'whatsapp')::boolean = true
          )
        ELSE false
      END,
      false
    )
  );

-- =============================================================================
-- 4. COMENTÁRIOS
-- =============================================================================

COMMENT ON FUNCTION update_lead_contact_counts() IS 
'Atualiza emails_count e whatsapp_valid na tabela leads baseado nos dados de lead_extraction_staging';

COMMENT ON TRIGGER trg_update_lead_contact_counts ON leads IS 
'Trigger que atualiza emails_count e whatsapp_valid automaticamente quando lead é criado ou atualizado';

