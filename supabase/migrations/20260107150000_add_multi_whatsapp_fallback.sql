-- =============================================================================
-- FEATURE: Sistema de Fallback Multi-WhatsApp para Campanhas
-- =============================================================================
-- Permite configurar múltiplos números WhatsApp (1 principal + N reservas) para
-- campanhas, com switch automático ou pausa quando o principal desconecta.
--
-- Funcionalidades:
-- 1. Tabela campaign_instance_config: Múltiplos inboxes por campanha
-- 2. Coluna fallback_behavior: Usuário escolhe "pausar" ou "trocar"
-- 3. Coluna current_inbox_id: Rastreia inbox ativo na execução
-- 4. Coluna inbox_switches: Histórico de trocas de inbox
-- 5. Função get_next_available_inbox: Busca próximo inbox conectado
-- =============================================================================

-- ========================================
-- 1. CRIAR TABELA campaign_instance_config
-- ========================================
CREATE TABLE IF NOT EXISTS campaign_instance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_config_id UUID NOT NULL REFERENCES campaign_configs(id) ON DELETE CASCADE,
  inbox_id UUID NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
  priority INT NOT NULL CHECK (priority > 0), -- 1 = principal, 2+ = reservas
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Garante que não há duplicação de inbox na mesma campanha
  UNIQUE(campaign_config_id, inbox_id),

  -- Garante que não há duplicação de prioridade na mesma campanha
  UNIQUE(campaign_config_id, priority)
);

-- Índice para buscar inboxes por campanha ordenados por prioridade
CREATE INDEX idx_campaign_instance_priority ON campaign_instance_config(campaign_config_id, priority ASC);

-- Índice para buscar campanhas por inbox
CREATE INDEX idx_campaign_instance_inbox ON campaign_instance_config(inbox_id);

-- Comentários
COMMENT ON TABLE campaign_instance_config IS
'Configuração de múltiplos WhatsApp por campanha. priority=1 é principal, 2+ são reservas';

COMMENT ON COLUMN campaign_instance_config.priority IS
'Ordem de prioridade: 1=Principal, 2=Reserva 1, 3=Reserva 2, etc. Menor valor = maior prioridade';

-- ========================================
-- 2. ADICIONAR COLUNAS EM campaign_configs
-- ========================================
ALTER TABLE campaign_configs
ADD COLUMN IF NOT EXISTS fallback_behavior TEXT
  CHECK (fallback_behavior IN ('pause', 'switch_to_reserve'))
  DEFAULT 'pause';

COMMENT ON COLUMN campaign_configs.fallback_behavior IS
'Comportamento quando principal desconecta: "pause" pausa campanha, "switch_to_reserve" troca para reserva automaticamente';

-- ========================================
-- 3. ADICIONAR COLUNAS EM campaign_runs
-- ========================================
ALTER TABLE campaign_runs
ADD COLUMN IF NOT EXISTS current_inbox_id UUID REFERENCES inboxes(id),
ADD COLUMN IF NOT EXISTS inbox_switches JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN campaign_runs.current_inbox_id IS
'Inbox atualmente em uso nesta execução. Pode mudar durante a run se houver fallback';

COMMENT ON COLUMN campaign_runs.inbox_switches IS
'Histórico de trocas de inbox: [{"from_inbox_id": "uuid", "to_inbox_id": "uuid", "reason": "disconnected", "switched_at": "ISO timestamp"}]';

-- ========================================
-- 4. FUNÇÃO: get_next_available_inbox
-- ========================================
-- Busca o próximo inbox conectado disponível para fallback
CREATE OR REPLACE FUNCTION get_next_available_inbox(
  p_campaign_config_id UUID,
  p_current_inbox_id UUID DEFAULT NULL
)
RETURNS TABLE(
  inbox_id UUID,
  inbox_name TEXT,
  instance_id UUID,
  instance_name TEXT,
  instance_status TEXT,
  priority INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Busca próxima instância conectada (ordem: priority ASC)
  -- Se p_current_inbox_id for NULL, busca a partir da priority 1 (principal)
  -- Se p_current_inbox_id fornecido, busca próxima após ela

  RETURN QUERY
  SELECT
    cic.inbox_id,
    i.name as inbox_name,
    inst.id as instance_id,
    inst.name as instance_name,
    inst.status as instance_status,
    cic.priority
  FROM campaign_instance_config cic
  JOIN inboxes i ON i.id = cic.inbox_id
  JOIN inbox_instances ii ON ii.inbox_id = i.id
  JOIN instances inst ON inst.id = ii.instance_id
  WHERE cic.campaign_config_id = p_campaign_config_id
    AND cic.is_active = true
    AND inst.status = 'connected'
    AND (
      -- Se não tem inbox atual, busca qualquer inbox conectado
      p_current_inbox_id IS NULL
      OR
      -- Se tem inbox atual, busca inbox diferente do atual
      cic.inbox_id != p_current_inbox_id
    )
  ORDER BY cic.priority ASC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_next_available_inbox(UUID, UUID) IS
'Busca próximo inbox conectado para fallback. Retorna por ordem de prioridade (1=principal, 2+=reservas)';

-- ========================================
-- 5. TRIGGER: Atualizar updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_campaign_instance_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_instance_config_updated_at
  BEFORE UPDATE ON campaign_instance_config
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_instance_config_updated_at();

-- ========================================
-- 6. MIGRAR DADOS EXISTENTES
-- ========================================
-- Para campanhas existentes, criar entrada na campaign_instance_config
-- usando o inbox_id atual como principal (priority = 1)

INSERT INTO campaign_instance_config (campaign_config_id, inbox_id, priority, is_active)
SELECT
  id as campaign_config_id,
  inbox_id,
  1 as priority, -- Inbox atual vira principal
  true as is_active
FROM campaign_configs
WHERE inbox_id IS NOT NULL
  AND NOT EXISTS (
    -- Evita duplicação se rodar migração novamente
    SELECT 1 FROM campaign_instance_config cic
    WHERE cic.campaign_config_id = campaign_configs.id
  );

-- ========================================
-- 7. PERMISSÕES
-- ========================================
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_instance_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_instance_config TO service_role;

GRANT EXECUTE ON FUNCTION get_next_available_inbox(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_available_inbox(UUID, UUID) TO service_role;

-- ========================================
-- 8. ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ========================================
-- Índice para buscar runs por inbox atual
CREATE INDEX IF NOT EXISTS idx_campaign_runs_current_inbox
  ON campaign_runs(current_inbox_id)
  WHERE current_inbox_id IS NOT NULL;

-- Índice para buscar configs com fallback ativo
CREATE INDEX IF NOT EXISTS idx_campaign_configs_fallback
  ON campaign_configs(fallback_behavior)
  WHERE fallback_behavior = 'switch_to_reserve';
