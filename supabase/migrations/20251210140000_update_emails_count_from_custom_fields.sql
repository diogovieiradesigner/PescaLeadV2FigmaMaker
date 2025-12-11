-- =============================================================================
-- FIX: Atualizar emails_count baseado em custom_fields
-- =============================================================================
-- Problema: E-mails estão em custom_fields (ex: "WHOIS Email") mas emails_count = 0
-- Solução: Atualizar emails_count baseado em custom_fields que contêm e-mails
-- =============================================================================

-- =============================================================================
-- 1. ATUALIZAR emails_count BASEADO EM CUSTOM_FIELDS
-- =============================================================================

UPDATE leads l
SET 
  emails_count = CASE 
    -- Se já tem emails_count > 0, manter
    WHEN l.emails_count > 0 THEN l.emails_count
    -- Se tem e-mail em custom_fields, contar como 1
    WHEN EXISTS (
      SELECT 1
      FROM lead_custom_values lcv
      JOIN custom_fields cf ON cf.id = lcv.custom_field_id
      WHERE lcv.lead_id = l.id
        AND cf.name ILIKE '%email%'
        AND lcv.value IS NOT NULL 
        AND lcv.value != ''
        AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
    ) THEN 1
    ELSE 0
  END,
  updated_at = NOW()
WHERE l.status = 'active'
  AND l.emails_count = 0
  AND EXISTS (
    SELECT 1
    FROM lead_custom_values lcv
    JOIN custom_fields cf ON cf.id = lcv.custom_field_id
    WHERE lcv.lead_id = l.id
      AND cf.name ILIKE '%email%'
      AND lcv.value IS NOT NULL 
      AND lcv.value != ''
      AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
  );

-- =============================================================================
-- 2. COMENTÁRIO
-- =============================================================================

COMMENT ON FUNCTION update_lead_contact_counts() IS 
'Atualiza emails_count e whatsapp_valid na tabela leads baseado nos dados de lead_extraction_staging E custom_fields';

