-- =============================================================================
-- FIX: Corrigir inconsistências restantes de emails_count
-- =============================================================================
-- Problema: 64 leads têm e-mail em custom_fields mas emails_count = 0
-- Solução: Atualizar emails_count para 1 para esses leads
-- =============================================================================

UPDATE leads l
SET 
  emails_count = 1,
  updated_at = NOW()
FROM lead_custom_values lcv
JOIN custom_fields cf ON cf.id = lcv.custom_field_id
WHERE l.id = lcv.lead_id
  AND l.workspace_id = '81fb73c0-a368-4d73-9384-4af5f2e6a2ed'
  AND l.status = 'active'
  AND l.emails_count = 0
  AND cf.name ILIKE '%email%'
  AND lcv.value IS NOT NULL 
  AND lcv.value != ''
  AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$';

COMMENT ON FUNCTION update_lead_contact_counts() IS 
'Atualiza emails_count e whatsapp_valid na tabela leads baseado nos dados de lead_extraction_staging E custom_fields. Esta migration corrige inconsistências restantes.';

