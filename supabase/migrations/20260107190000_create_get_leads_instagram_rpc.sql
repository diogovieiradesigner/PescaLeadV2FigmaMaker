-- Migration: Create RPC to get Instagram from custom fields
-- Date: 2026-01-07 19:00:00
-- Description: Busca Instagram dos custom fields para exibir no Kanban
--              Sem adicionar coluna na tabela leads

-- RPC para buscar Instagram de múltiplos leads
CREATE OR REPLACE FUNCTION get_leads_instagram(p_lead_ids UUID[])
RETURNS TABLE (
  lead_id UUID,
  instagram_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (lcv.lead_id)
    lcv.lead_id,
    lcv.value AS instagram_url
  FROM lead_custom_values lcv
  WHERE lcv.lead_id = ANY(p_lead_ids)
    AND lcv.value LIKE '%instagram.com%'
  ORDER BY lcv.lead_id, lcv.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário explicativo
COMMENT ON FUNCTION get_leads_instagram(UUID[]) IS
'Busca URLs do Instagram dos custom fields para exibição no Kanban.
Retorna o valor mais recente para cada lead que contenha instagram.com';

-- Grant para authenticated users
GRANT EXECUTE ON FUNCTION get_leads_instagram(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leads_instagram(UUID[]) TO service_role;
