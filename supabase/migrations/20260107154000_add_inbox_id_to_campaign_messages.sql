-- =============================================================================
-- ENHANCEMENT: Adicionar inbox_id em campaign_messages
-- =============================================================================
-- Motivo: Rastrear qual inbox foi usado para enviar cada mensagem
-- Permite analytics: "Principal: 120 msgs, Reserva 1: 35 msgs"
-- =============================================================================

ALTER TABLE campaign_messages
ADD COLUMN IF NOT EXISTS inbox_id UUID REFERENCES inboxes(id);

COMMENT ON COLUMN campaign_messages.inbox_id IS
'Inbox usado para enviar esta mensagem. Permite rastrear uso de cada inbox quando há fallback';

-- Índice para consultas de contagem por inbox
CREATE INDEX IF NOT EXISTS idx_campaign_messages_inbox
  ON campaign_messages(run_id, inbox_id)
  WHERE inbox_id IS NOT NULL;

-- Atualizar mensagens existentes com inbox da run
UPDATE campaign_messages cm
SET inbox_id = cr.current_inbox_id
FROM campaign_runs cr
WHERE cm.run_id = cr.id
  AND cm.inbox_id IS NULL
  AND cr.current_inbox_id IS NOT NULL;

-- Para mensagens antigas sem current_inbox_id, usar inbox_id da config
UPDATE campaign_messages cm
SET inbox_id = cc.inbox_id
FROM campaign_runs cr
JOIN campaign_configs cc ON cc.id = cr.config_id
WHERE cm.run_id = cr.id
  AND cm.inbox_id IS NULL
  AND cc.inbox_id IS NOT NULL;
