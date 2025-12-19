-- Migration: Fix update_lead_contact_counts to respect whatsapp_valid from custom fields
-- Created: 2025-12-19
-- Description: Modifies the update_lead_contact_counts trigger to check custom field "WhatsApp Válido"
--              instead of always overwriting with staging data

CREATE OR REPLACE FUNCTION public.update_lead_contact_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_emails_count INTEGER := 0;
  v_has_whatsapp BOOLEAN := false;
  v_primary_email TEXT;
  v_emails JSONB;
  v_has_email_in_custom_fields BOOLEAN := false;
  v_whatsapp_custom_field TEXT;
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

  -- 3. Verificar custom field "WhatsApp Válido" (prioritário sobre staging)
  SELECT lcv.value INTO v_whatsapp_custom_field
  FROM lead_custom_values lcv
  JOIN custom_fields cf ON cf.id = lcv.custom_field_id
  WHERE lcv.lead_id = NEW.id
    AND (cf.name ILIKE '%whatsapp válido%' OR cf.name ILIKE '%whatsapp valido%')
  LIMIT 1;

  -- Se custom field existe, usar ele; senão usar staging
  IF v_whatsapp_custom_field IS NOT NULL THEN
    v_has_whatsapp := LOWER(v_whatsapp_custom_field) IN ('sim', 'yes', 'true', '1');
  END IF;

  -- 4. Atualizar campos
  NEW.emails_count := v_emails_count;
  NEW.whatsapp_valid := COALESCE(v_has_whatsapp, false);

  RETURN NEW;
END;
$function$;
