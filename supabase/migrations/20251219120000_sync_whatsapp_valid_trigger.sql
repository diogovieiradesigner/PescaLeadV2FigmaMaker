-- Migration: Sync whatsapp_valid field from custom field to leads table
-- Created: 2025-12-19
-- Description: Creates a trigger that automatically syncs the "WhatsApp Válido" custom field
--              to the leads.whatsapp_valid column whenever it's updated

-- Função que sincroniza o campo whatsapp_valid do custom field para a tabela leads
CREATE OR REPLACE FUNCTION sync_whatsapp_valid_from_custom_field()
RETURNS TRIGGER AS $$
DECLARE
  v_whatsapp_field_id uuid;
  v_new_value boolean;
BEGIN
  -- Buscar o ID do custom field "WhatsApp Válido"
  SELECT id INTO v_whatsapp_field_id
  FROM custom_fields
  WHERE name ILIKE '%whatsapp válido%'
    OR name ILIKE '%whatsapp valido%'
  LIMIT 1;

  -- Se não for o campo "WhatsApp Válido", sair sem fazer nada
  IF v_whatsapp_field_id IS NULL OR
     (TG_OP IN ('INSERT', 'UPDATE') AND NEW.custom_field_id != v_whatsapp_field_id) THEN
    RETURN NEW;
  END IF;

  -- Determinar o novo valor baseado no custom field
  IF TG_OP = 'DELETE' THEN
    -- Se deletou o custom field, definir como false
    UPDATE leads
    SET whatsapp_valid = false,
        updated_at = NOW()
    WHERE id = OLD.lead_id;

    RETURN OLD;
  ELSE
    -- INSERT ou UPDATE
    v_new_value := LOWER(COALESCE(NEW.value, '')) IN ('sim', 'yes', 'true', '1');

    UPDATE leads
    SET whatsapp_valid = v_new_value,
        updated_at = NOW()
    WHERE id = NEW.lead_id;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger na tabela lead_custom_values
DROP TRIGGER IF EXISTS trg_sync_whatsapp_valid ON lead_custom_values;

CREATE TRIGGER trg_sync_whatsapp_valid
  AFTER INSERT OR UPDATE OR DELETE ON lead_custom_values
  FOR EACH ROW
  EXECUTE FUNCTION sync_whatsapp_valid_from_custom_field();

-- Sincronizar todos os leads existentes (correção inicial)
UPDATE leads l
SET whatsapp_valid = CASE
  WHEN LOWER(COALESCE(lcv.value, '')) IN ('sim', 'yes', 'true', '1') THEN true
  ELSE false
END,
updated_at = NOW()
FROM lead_custom_values lcv
JOIN custom_fields cf ON cf.id = lcv.custom_field_id
WHERE lcv.lead_id = l.id
  AND (cf.name ILIKE '%whatsapp válido%' OR cf.name ILIKE '%whatsapp valido%');

-- Log do resultado
DO $$
DECLARE
  v_updated_count integer;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Sincronizados % leads com o campo WhatsApp Válido', v_updated_count;
END $$;
