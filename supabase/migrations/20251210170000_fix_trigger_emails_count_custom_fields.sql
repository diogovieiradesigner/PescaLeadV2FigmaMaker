-- =============================================================================
-- FIX: Atualizar trigger para também verificar custom_fields
-- =============================================================================
-- Problema: Trigger resetava emails_count para 0 quando lead_extraction_staging
-- não tinha dados, mesmo que custom_fields tivesse e-mail
-- Solução: Atualizar trigger para também verificar custom_fields
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
  v_has_email_in_custom_fields BOOLEAN := false;
BEGIN
  -- 1. Buscar dados de lead_extraction_staging se lead_extraction_id existir
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
    
    -- Calcular emails_count de staging
    IF v_emails IS NOT NULL AND jsonb_typeof(v_emails) = 'array' THEN
      v_emails_count := jsonb_array_length(v_emails);
    ELSIF v_primary_email IS NOT NULL AND v_primary_email != '' THEN
      v_emails_count := 1;
    END IF;
  END IF;
  
  -- 2. Se não encontrou e-mail em staging, verificar custom_fields
  IF v_emails_count = 0 THEN
    SELECT EXISTS (
      SELECT 1
      FROM lead_custom_values lcv
      JOIN custom_fields cf ON cf.id = lcv.custom_field_id
      WHERE lcv.lead_id = NEW.id
        AND cf.name ILIKE '%email%'
        AND lcv.value IS NOT NULL 
        AND lcv.value != ''
        AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
    ) INTO v_has_email_in_custom_fields;
    
    IF v_has_email_in_custom_fields THEN
      v_emails_count := 1;
    END IF;
  END IF;
  
  -- 3. Atualizar campos
  NEW.emails_count := v_emails_count;
  NEW.whatsapp_valid := COALESCE(v_has_whatsapp, false);
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_lead_contact_counts() IS 
'Atualiza emails_count e whatsapp_valid na tabela leads baseado nos dados de lead_extraction_staging E custom_fields. Agora verifica custom_fields quando staging não tem dados.';

