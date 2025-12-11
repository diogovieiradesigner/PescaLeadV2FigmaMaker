-- =============================================================================
-- MIGRAÇÃO: Operações Atômicas de Conclusão de Mensagem
-- =============================================================================
-- PROBLEMA: Update status + mover lead + métricas são 3 operações separadas
-- SOLUÇÃO: Função SQL que executa todas em uma única transação
-- =============================================================================

CREATE OR REPLACE FUNCTION complete_campaign_message_atomic(
  p_message_id UUID,
  p_run_id UUID,
  p_lead_id UUID,
  p_target_column_id UUID,
  p_conversation_id UUID,
  p_provider_message_id TEXT,
  p_success BOOLEAN -- true = sent, false = failed
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_current_column_id UUID;
  v_lead_moved BOOLEAN := false;
BEGIN
  -- Verificar se lead existe e obter column_id atual
  SELECT column_id INTO v_current_column_id
  FROM leads
  WHERE id = p_lead_id;
  
  -- Se lead não existe, apenas atualizar mensagem e métricas
  IF v_current_column_id IS NULL THEN
    -- Atualizar mensagem
    UPDATE campaign_messages
    SET 
      status = CASE WHEN p_success THEN 'sent' ELSE 'failed' END,
      sent_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
      conversation_id = p_conversation_id,
      provider_message_id = p_provider_message_id,
      error_message = CASE WHEN NOT p_success THEN 'Lead foi deletado antes do processamento' ELSE NULL END
    WHERE id = p_message_id;
    
    -- Incrementar métricas (skipped se lead não existe)
    IF p_success THEN
      PERFORM increment_campaign_run_metrics(p_run_id, 0, 0, 1);
    ELSE
      PERFORM increment_campaign_run_metrics(p_run_id, 0, 1, 0);
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'lead_exists', false,
      'lead_moved', false
    );
  END IF;
  
  -- Verificar se target_column_id existe
  IF NOT EXISTS (
    SELECT 1 FROM funnel_columns WHERE id = p_target_column_id
  ) THEN
    -- Coluna destino não existe - marcar como failed
    UPDATE campaign_messages
    SET 
      status = 'failed',
      error_message = format('Coluna destino não encontrada: %s', p_target_column_id)
    WHERE id = p_message_id;
    
    PERFORM increment_campaign_run_metrics(p_run_id, 0, 1, 0);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'target_column_not_found',
      'target_column_id', p_target_column_id
    );
  END IF;
  
  -- Atualizar mensagem
  UPDATE campaign_messages
  SET 
    status = CASE WHEN p_success THEN 'sent' ELSE 'failed' END,
    sent_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
    conversation_id = p_conversation_id,
    provider_message_id = p_provider_message_id
  WHERE id = p_message_id;
  
  -- Mover lead (apenas se sucesso e não já está na coluna destino)
  IF p_success THEN
    IF v_current_column_id = p_target_column_id THEN
      -- Já está na coluna destino - apenas atualizar last_activity_at
      UPDATE leads
      SET last_activity_at = NOW()
      WHERE id = p_lead_id;
      v_lead_moved := false; -- Não moveu, apenas atualizou
    ELSE
      -- Mover para coluna destino
      UPDATE leads
      SET 
        column_id = p_target_column_id,
        last_activity_at = NOW()
      WHERE id = p_lead_id;
      v_lead_moved := true;
    END IF;
  END IF;
  
  -- Incrementar métricas
  IF p_success THEN
    PERFORM increment_campaign_run_metrics(p_run_id, 1, 0, 0);
  ELSE
    PERFORM increment_campaign_run_metrics(p_run_id, 0, 1, 0);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'lead_exists', true,
    'lead_moved', v_lead_moved,
    'was_already_in_target', v_current_column_id = p_target_column_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_campaign_message_atomic IS 
'Executa atomicamente: atualiza status da mensagem, move lead para coluna destino (se necessário) e incrementa métricas. Trata casos de lead deletado e coluna destino inexistente.';

