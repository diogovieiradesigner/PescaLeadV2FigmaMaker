-- =============================================================================
-- MIGRAÇÃO: Adicionar índices para performance do sistema de campanhas
-- =============================================================================
-- PROBLEMA: Queries de mensagens e runs podem ser lentas sem índices adequados
-- SOLUÇÃO: Criar índices compostos e parciais para otimizar queries frequentes
-- =============================================================================

-- 1. Índice composto para query de mensagens pendentes agendadas
-- Query: SELECT * FROM campaign_messages WHERE status = 'pending' AND scheduled_at <= NOW() ORDER BY scheduled_at
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status_scheduled 
ON campaign_messages(status, scheduled_at) 
WHERE status = 'pending';

COMMENT ON INDEX idx_campaign_messages_status_scheduled IS 
'Índice para otimizar query de mensagens pendentes ordenadas por scheduled_at';

-- 2. Índice para query de runs por status
-- Query: SELECT * FROM campaign_runs WHERE status = 'running'
CREATE INDEX IF NOT EXISTS idx_campaign_runs_status 
ON campaign_runs(status) 
WHERE status IN ('running', 'paused');

COMMENT ON INDEX idx_campaign_runs_status IS 
'Índice para otimizar query de runs ativas (running, paused)';

-- 3. Índice composto para query de mensagens por run_id e status
-- Query: SELECT * FROM campaign_messages WHERE run_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_campaign_messages_run_status 
ON campaign_messages(run_id, status);

COMMENT ON INDEX idx_campaign_messages_run_status IS 
'Índice para otimizar queries de mensagens por run e status';

-- 4. Índice para query de runs por config_id e status
-- Query: SELECT * FROM campaign_runs WHERE config_id = ? AND status = 'running'
CREATE INDEX IF NOT EXISTS idx_campaign_runs_config_status 
ON campaign_runs(config_id, status) 
WHERE status = 'running';

COMMENT ON INDEX idx_campaign_runs_config_status IS 
'Índice para otimizar verificação de runs ativas por configuração';

-- 5. Índice para query de mensagens por scheduled_at (para filtro de mensagens antigas)
-- Query: SELECT * FROM campaign_messages WHERE scheduled_at < ?
CREATE INDEX IF NOT EXISTS idx_campaign_messages_scheduled_at 
ON campaign_messages(scheduled_at);

COMMENT ON INDEX idx_campaign_messages_scheduled_at IS 
'Índice para otimizar filtro de mensagens por scheduled_at';

