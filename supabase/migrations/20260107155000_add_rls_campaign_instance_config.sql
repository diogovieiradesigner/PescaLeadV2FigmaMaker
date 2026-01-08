-- =============================================================================
-- SECURITY: RLS Policies para campaign_instance_config
-- =============================================================================
-- Garante que usuários só podem ver/modificar inboxes de campanhas do seu workspace
-- =============================================================================

-- Habilitar RLS
ALTER TABLE campaign_instance_config ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Ver apenas inboxes de campanhas do seu workspace
CREATE POLICY "Users can view campaign inboxes from their workspace"
  ON campaign_instance_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_configs cc
      WHERE cc.id = campaign_instance_config.campaign_config_id
        AND cc.workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Policy: INSERT - Inserir apenas em campanhas do seu workspace
CREATE POLICY "Users can insert campaign inboxes in their workspace"
  ON campaign_instance_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_configs cc
      WHERE cc.id = campaign_instance_config.campaign_config_id
        AND cc.workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Policy: UPDATE - Atualizar apenas em campanhas do seu workspace
CREATE POLICY "Users can update campaign inboxes in their workspace"
  ON campaign_instance_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_configs cc
      WHERE cc.id = campaign_instance_config.campaign_config_id
        AND cc.workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Policy: DELETE - Deletar apenas em campanhas do seu workspace
CREATE POLICY "Users can delete campaign inboxes from their workspace"
  ON campaign_instance_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaign_configs cc
      WHERE cc.id = campaign_instance_config.campaign_config_id
        AND cc.workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Policy: service_role bypass (para edge functions)
CREATE POLICY "Service role bypass for campaign_instance_config"
  ON campaign_instance_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Users can view campaign inboxes from their workspace" ON campaign_instance_config IS
'Permite usuários verem apenas inboxes de campanhas do seu workspace';

COMMENT ON POLICY "Service role bypass for campaign_instance_config" ON campaign_instance_config IS
'Edge functions podem acessar todos os dados via service_role';
