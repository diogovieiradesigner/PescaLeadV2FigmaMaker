-- ============================================
-- Função: complete_campaign_message_atomic
-- Descrição: Completa uma mensagem de campanha atomicamente
-- Atualiza status, move lead para coluna destino, etc.
-- ============================================

CREATE OR REPLACE FUNCTION public.complete_campaign_message_atomic(
  p_message_id UUID,
  p_run_id UUID,
  p_lead_id UUID,
  p_target_column_id UUID,
  p_conversation_id UUID DEFAULT NULL,
  p_provider_message_id TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_success THEN
    -- Marcar mensagem como enviada
    UPDATE campaign_messages
    SET
      status = 'sent',
      sent_at = NOW(),
      provider_message_id = p_provider_message_id
    WHERE id = p_message_id;

    -- Mover lead para coluna de destino (se especificada)
    IF p_target_column_id IS NOT NULL THEN
      UPDATE leads
      SET column_id = p_target_column_id
      WHERE id = p_lead_id;
    END IF;

    -- Vincular conversa ao lead (se criada)
    IF p_conversation_id IS NOT NULL THEN
      UPDATE conversations
      SET lead_id = p_lead_id
      WHERE id = p_conversation_id AND lead_id IS NULL;
    END IF;

    -- Incrementar métricas de sucesso
    UPDATE campaign_runs
    SET
      leads_processed = COALESCE(leads_processed, 0) + 1,
      leads_success = COALESCE(leads_success, 0) + 1
    WHERE id = p_run_id;

    v_result := jsonb_build_object(
      'success', true,
      'message_id', p_message_id,
      'status', 'sent'
    );
  ELSE
    -- Marcar mensagem como falha
    UPDATE campaign_messages
    SET status = 'failed'
    WHERE id = p_message_id;

    -- Incrementar métricas de falha
    UPDATE campaign_runs
    SET
      leads_processed = COALESCE(leads_processed, 0) + 1,
      leads_failed = COALESCE(leads_failed, 0) + 1
    WHERE id = p_run_id;

    v_result := jsonb_build_object(
      'success', true,
      'message_id', p_message_id,
      'status', 'failed'
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.complete_campaign_message_atomic TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_campaign_message_atomic TO authenticated;

-- Comentário
COMMENT ON FUNCTION public.complete_campaign_message_atomic IS 'Completa uma mensagem de campanha atomicamente (sucesso ou falha)';
