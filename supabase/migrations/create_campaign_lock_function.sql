-- Função para verificar e lock atômico de instância de campanha
-- Evita race conditions quando múltiplas execuções tentam criar runs simultaneamente

CREATE OR REPLACE FUNCTION check_and_lock_campaign_instance(
  p_inbox_id UUID,
  p_config_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_running_run RECORD;
  v_result JSONB;
BEGIN
  -- Verificar se já existe run RUNNING na mesma instância (com lock)
  SELECT cr.id, cr.config_id
  INTO v_running_run
  FROM campaign_runs cr
  JOIN campaign_configs cc ON cc.id = cr.config_id
  WHERE cc.inbox_id = p_inbox_id
    AND cr.status = 'running'
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Lock apenas se encontrar, skip se já estiver locked
  
  IF v_running_run.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'can_proceed', false,
      'reason', 'Já existe uma campanha em execução nesta instância',
      'error_code', 'INSTANCE_BUSY',
      'running_run_id', v_running_run.id,
      'running_config_id', v_running_run.config_id
    );
  END IF;
  
  -- Se chegou aqui, pode prosseguir
  RETURN jsonb_build_object(
    'can_proceed', true,
    'reason', 'Instância disponível'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'can_proceed', false,
      'reason', 'Erro ao verificar instância: ' || SQLERRM,
      'error_code', 'LOCK_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION check_and_lock_campaign_instance IS 
'Verifica se pode criar nova run de campanha na instância, usando lock atômico para evitar race conditions';

