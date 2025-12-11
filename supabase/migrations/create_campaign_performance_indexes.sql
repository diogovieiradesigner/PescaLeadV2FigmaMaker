-- =============================================================================
-- MIGRAÇÃO: Índices de Performance para Sistema de Campanhas
-- =============================================================================
-- PROBLEMA: Falta índices compostos para otimizar seleção atômica e JOINs
-- SOLUÇÃO: Criar índices otimizados para queries frequentes
-- =============================================================================

-- Índice para seleção atômica de mensagens
-- Otimiza: get_and_lock_campaign_messages WHERE run_id, status='pending', scheduled_at
CREATE INDEX IF NOT EXISTS idx_campaign_messages_atomic_selection 
ON campaign_messages (run_id, status, scheduled_at) 
WHERE status = 'pending';

-- Índice para JOIN em get_and_lock_campaign_messages
-- Otimiza: JOIN campaign_runs WHERE id, status='running'
CREATE INDEX IF NOT EXISTS idx_campaign_runs_id_status 
ON campaign_runs (id, status) 
WHERE status = 'running';

-- Índice para busca de contexto de lead (se usado frequentemente)
-- Otimiza: SELECT de leads com campos comuns para contexto
CREATE INDEX IF NOT EXISTS idx_leads_id_for_context 
ON leads (id) 
INCLUDE (client_name, primary_email, primary_phone, primary_website);

-- Comentários
COMMENT ON INDEX idx_campaign_messages_atomic_selection IS 
'Otimiza seleção atômica de mensagens pendentes por run_id e scheduled_at. Usado por get_and_lock_campaign_messages.';

COMMENT ON INDEX idx_campaign_runs_id_status IS 
'Otimiza JOIN em get_and_lock_campaign_messages para runs running. Melhora performance de queries com filtro status=running.';

COMMENT ON INDEX idx_leads_id_for_context IS 
'Otimiza busca de contexto de lead incluindo campos comuns (client_name, emails, phones, websites). Usado por get_lead_full_context.';

