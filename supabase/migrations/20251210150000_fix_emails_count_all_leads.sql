-- =============================================================================
-- FIX: Atualizar emails_count para TODOS os leads baseado em custom_fields
-- =============================================================================
-- Problema: Migration anterior não atualizou todos os leads
-- Solução: Atualizar todos os leads ativos que têm e-mail em custom_fields
-- =============================================================================

-- =============================================================================
-- ATUALIZAR emails_count BASEADO EM CUSTOM_FIELDS
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
  AND (
    -- Atualizar se emails_count = 0 mas tem e-mail em custom_fields
    (l.emails_count = 0 AND EXISTS (
      SELECT 1
      FROM lead_custom_values lcv
      JOIN custom_fields cf ON cf.id = lcv.custom_field_id
      WHERE lcv.lead_id = l.id
        AND cf.name ILIKE '%email%'
        AND lcv.value IS NOT NULL 
        AND lcv.value != ''
        AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
    ))
    OR
    -- Atualizar se emails_count > 0 mas não tem mais e-mail (corrigir inconsistências)
    (l.emails_count > 0 AND NOT EXISTS (
      SELECT 1
      FROM lead_custom_values lcv
      JOIN custom_fields cf ON cf.id = lcv.custom_field_id
      WHERE lcv.lead_id = l.id
        AND cf.name ILIKE '%email%'
        AND lcv.value IS NOT NULL 
        AND lcv.value != ''
        AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
    ) AND NOT EXISTS (
      SELECT 1
      FROM lead_extraction_staging les
      WHERE les.id = l.lead_extraction_id
        AND (
          (les.emails IS NOT NULL AND jsonb_typeof(les.emails) = 'array' AND jsonb_array_length(les.emails) > 0)
          OR (les.primary_email IS NOT NULL AND les.primary_email != '')
        )
    ))
  );

-- =============================================================================
-- COMENTÁRIO
-- =============================================================================

COMMENT ON FUNCTION update_lead_contact_counts() IS 
'Atualiza emails_count e whatsapp_valid na tabela leads baseado nos dados de lead_extraction_staging E custom_fields. Esta migration garante que todos os leads ativos tenham emails_count correto.';

