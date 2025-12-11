-- =============================================================================
-- ÍNDICES RECOMENDADOS PARA PERFORMANCE
-- =============================================================================
-- Aplicar estes índices no banco de dados para otimizar queries do kanban
-- =============================================================================

-- Índice composto para queries principais (workspace + funnel + column + status)
CREATE INDEX IF NOT EXISTS idx_leads_workspace_funnel_column_status 
  ON leads(workspace_id, funnel_id, column_id, status)
  WHERE status = 'active';

-- Índice para ordenação por posição
CREATE INDEX IF NOT EXISTS idx_leads_column_position 
  ON leads(column_id, position)
  WHERE status = 'active';

-- Índice para filtro de e-mail (usando emails_count)
CREATE INDEX IF NOT EXISTS idx_leads_emails_count 
  ON leads(emails_count, column_id)
  WHERE emails_count > 0 AND status = 'active';

-- Índice para filtro de WhatsApp (usando whatsapp_valid)
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_valid 
  ON leads(whatsapp_valid, column_id)
  WHERE whatsapp_valid = true AND status = 'active';

-- Índice GIN para busca full-text em client_name
CREATE INDEX IF NOT EXISTS idx_leads_client_name_gin 
  ON leads USING gin(to_tsvector('portuguese', client_name))
  WHERE status = 'active';

-- Índice GIN para busca full-text em company
CREATE INDEX IF NOT EXISTS idx_leads_company_gin 
  ON leads USING gin(to_tsvector('portuguese', company))
  WHERE status = 'active';

-- Índice para filtro de prioridade
CREATE INDEX IF NOT EXISTS idx_leads_priority 
  ON leads(priority, column_id)
  WHERE status = 'active';

-- Índice para filtro de assignee
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to 
  ON leads(assigned_to, column_id)
  WHERE assigned_to IS NOT NULL AND status = 'active';

-- Índice GIN para busca em tags (array)
CREATE INDEX IF NOT EXISTS idx_leads_tags_gin 
  ON leads USING gin(tags)
  WHERE status = 'active';

-- Índice para estatísticas (deal_value)
CREATE INDEX IF NOT EXISTS idx_leads_deal_value 
  ON leads(funnel_id, deal_value)
  WHERE status = 'active';

-- =============================================================================
-- ANÁLISE DE ÍNDICES
-- =============================================================================
-- Verificar se índices estão sendo usados:
-- EXPLAIN ANALYZE SELECT * FROM leads 
-- WHERE workspace_id = '...' AND funnel_id = '...' AND column_id = '...' AND status = 'active'
-- ORDER BY position LIMIT 10;
-- =============================================================================

