-- =============================================================================
-- MIGRAÇÃO: Índices de Performance para Kanban API
-- =============================================================================
-- Data: 2025-01-15
-- Descrição: Cria índices otimizados para queries do Kanban
-- =============================================================================

-- 1. Índice composto principal: (workspace_id, funnel_id, column_id, status)
-- Otimiza: Queries principais do Kanban que filtram por workspace, funnel, column e status
CREATE INDEX IF NOT EXISTS idx_leads_workspace_funnel_column_status 
  ON leads(workspace_id, funnel_id, column_id, status)
  WHERE status = 'active';

-- 2. Índice para busca por client_name: (workspace_id, funnel_id, client_name)
-- Otimiza: Filtros de busca por nome do cliente
CREATE INDEX IF NOT EXISTS idx_leads_workspace_funnel_client_name 
  ON leads(workspace_id, funnel_id, client_name)
  WHERE status = 'active' AND client_name IS NOT NULL AND client_name != '';

-- 3. Índice para lead_custom_values: (lead_id)
-- Otimiza: JOINs e buscas de custom fields por lead
CREATE INDEX IF NOT EXISTS idx_lead_custom_values_lead_id 
  ON lead_custom_values(lead_id);

-- Comentários para documentação
COMMENT ON INDEX idx_leads_workspace_funnel_column_status IS 
'Otimiza queries principais do Kanban que filtram por workspace, funnel, column e status. Usado em getColumnLeads e getFunnelLeadsInitial.';

COMMENT ON INDEX idx_leads_workspace_funnel_client_name IS 
'Otimiza filtros de busca por nome do cliente (searchQuery). Melhora performance de ILIKE queries em client_name.';

COMMENT ON INDEX idx_lead_custom_values_lead_id IS 
'Otimiza JOINs e buscas de custom fields (email, phone) por lead_id. Usado em getColumnLeads para buscar emails e telefones.';

