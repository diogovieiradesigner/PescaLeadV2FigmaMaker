-- =============================================================================
-- FIX: Atualizar emails_count para TODOS os leads baseado em custom_fields
-- =============================================================================
-- Versão simplificada usando JOIN direto
-- =============================================================================

UPDATE leads l
SET 
  emails_count = 1,
  updated_at = NOW()
FROM lead_custom_values lcv
JOIN custom_fields cf ON cf.id = lcv.custom_field_id
WHERE l.id = lcv.lead_id
  AND l.status = 'active'
  AND l.emails_count = 0
  AND cf.name ILIKE '%email%'
  AND lcv.value IS NOT NULL 
  AND lcv.value != ''
  AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$';

