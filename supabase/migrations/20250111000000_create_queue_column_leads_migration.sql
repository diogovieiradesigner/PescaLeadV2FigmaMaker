-- =============================================================================
-- Sistema de Fila para Movimentação de Leads de Coluna
-- =============================================================================
-- Permite mover todos os leads de uma coluna para outra coluna/funil
-- usando fila assíncrona para evitar timeout em grandes volumes
-- =============================================================================

-- Criar fila PGMQ se não existir
SELECT pgmq.create('column_leads_migration_queue');

-- =============================================================================
-- Função: queue_column_leads_migration
-- =============================================================================
-- Enfileira movimentação de todos os leads de uma coluna
-- =============================================================================

CREATE OR REPLACE FUNCTION queue_column_leads_migration(
  p_source_column_id UUID,
  p_target_funnel_id UUID,
  p_target_column_id UUID,
  p_batch_size INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id UUID;
  v_source_funnel_id UUID;
  v_source_column_title TEXT;
  v_target_column_title TEXT;
  v_total_leads INTEGER;
  v_message_id BIGINT;
  v_message JSONB;
BEGIN
  -- 1. Validar coluna origem
  SELECT 
    c.workspace_id,
    c.funnel_id,
    c.title
  INTO 
    v_workspace_id,
    v_source_funnel_id,
    v_source_column_title
  FROM kanban_columns c
  WHERE c.id = p_source_column_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coluna origem não encontrada'
    );
  END IF;

  -- 2. Validar coluna destino
  SELECT title
  INTO v_target_column_title
  FROM kanban_columns
  WHERE id = p_target_column_id
    AND funnel_id = p_target_funnel_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coluna destino não encontrada ou não pertence ao funil selecionado'
    );
  END IF;

  -- 3. Verificar se não é a mesma coluna
  IF p_source_column_id = p_target_column_id AND v_source_funnel_id = p_target_funnel_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Os leads já estão nesta coluna'
    );
  END IF;

  -- 4. Contar total de leads na coluna origem
  SELECT COUNT(*)
  INTO v_total_leads
  FROM leads
  WHERE column_id = p_source_column_id
    AND status = 'active';

  IF v_total_leads = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não há leads para mover nesta coluna'
    );
  END IF;

  -- 5. Criar mensagem para a fila
  v_message := jsonb_build_object(
    'source_column_id', p_source_column_id,
    'source_funnel_id', v_source_funnel_id,
    'source_column_title', v_source_column_title,
    'target_funnel_id', p_target_funnel_id,
    'target_column_id', p_target_column_id,
    'target_column_title', v_target_column_title,
    'workspace_id', v_workspace_id,
    'batch_size', p_batch_size,
    'total_leads', v_total_leads,
    'moved_leads', 0,
    'created_at', NOW()
  );

  -- 6. Enfileirar mensagem
  SELECT msg_id
  INTO v_message_id
  FROM pgmq.send(
    'column_leads_migration_queue',
    v_message
  );

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id,
    'source_column_id', p_source_column_id,
    'source_column_title', v_source_column_title,
    'target_funnel_id', p_target_funnel_id,
    'target_column_id', p_target_column_id,
    'target_column_title', v_target_column_title,
    'total_leads', v_total_leads,
    'message', format('Movimentação enfileirada: %s leads serão movidos', v_total_leads)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =============================================================================
-- Função: process_column_leads_migration_batch
-- =============================================================================
-- Processa um batch de movimentação de leads de coluna
-- =============================================================================

CREATE OR REPLACE FUNCTION process_column_leads_migration_batch(
  p_batch_size INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message RECORD;
  v_leads_moved INTEGER;
  v_leads_remaining INTEGER;
  v_result JSONB;
BEGIN
  -- 1. Ler mensagem da fila
  SELECT 
    msg_id,
    message
  INTO v_message
  FROM pgmq.read('column_leads_migration_queue', 1, 30);

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Nenhuma mensagem na fila'
    );
  END IF;

  -- 2. Mover batch de leads
  WITH leads_to_move AS (
    SELECT id
    FROM leads
    WHERE column_id = (v_message.message->>'source_column_id')::UUID
      AND status = 'active'
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE leads
  SET 
    funnel_id = (v_message.message->>'target_funnel_id')::UUID,
    column_id = (v_message.message->>'target_column_id')::UUID,
    updated_at = NOW(),
    updated_by = auth.uid()
  FROM leads_to_move
  WHERE leads.id = leads_to_move.id
  RETURNING leads.id INTO STRICT v_leads_moved;

  -- 3. Calcular leads restantes
  SELECT COUNT(*)
  INTO v_leads_remaining
  FROM leads
  WHERE column_id = (v_message.message->>'source_column_id')::UUID
    AND status = 'active';

  -- 4. Atualizar progresso na mensagem
  v_message.message := jsonb_set(
    v_message.message,
    '{moved_leads}',
    to_jsonb((v_message.message->>'moved_leads')::INTEGER + v_leads_moved)
  );

  -- 5. Se ainda há leads restantes, re-enfileirar
  IF v_leads_remaining > 0 THEN
    PERFORM pgmq.send(
      'column_leads_migration_queue',
      v_message.message
    );
    
    -- Deletar mensagem antiga
    PERFORM pgmq.delete('column_leads_migration_queue', v_message.msg_id);
    
    RETURN jsonb_build_object(
      'success', true,
      'message_id', v_message.msg_id,
      'source_column_id', v_message.message->>'source_column_id',
      'source_column_title', v_message.message->>'source_column_title',
      'target_column_id', v_message.message->>'target_column_id',
      'target_column_title', v_message.message->>'target_column_title',
      'leads_moved', v_leads_moved,
      'leads_remaining', v_leads_remaining,
      'total_leads', (v_message.message->>'total_leads')::INTEGER,
      'message', format('Batch processado: %s leads movidos, %s restantes', v_leads_moved, v_leads_remaining)
    );
  ELSE
    -- 6. Se todos os leads foram movidos, deletar mensagem
    PERFORM pgmq.delete('column_leads_migration_queue', v_message.msg_id);
    
    RETURN jsonb_build_object(
      'success', true,
      'message_id', v_message.msg_id,
      'source_column_id', v_message.message->>'source_column_id',
      'source_column_title', v_message.message->>'source_column_title',
      'target_column_id', v_message.message->>'target_column_id',
      'target_column_title', v_message.message->>'target_column_title',
      'leads_moved', v_leads_moved,
      'leads_remaining', 0,
      'total_leads', (v_message.message->>'total_leads')::INTEGER,
      'message', 'Movimentação concluída!'
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, re-enfileirar mensagem
    IF v_message.msg_id IS NOT NULL THEN
      PERFORM pgmq.send(
        'column_leads_migration_queue',
        v_message.message
      );
      PERFORM pgmq.delete('column_leads_migration_queue', v_message.msg_id);
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =============================================================================
-- Função: get_column_leads_migration_status
-- =============================================================================
-- Retorna status da fila de movimentação de colunas
-- =============================================================================

CREATE OR REPLACE FUNCTION get_column_leads_migration_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_stats RECORD;
BEGIN
  SELECT 
    COUNT(*) as total_messages,
    MIN(created_at) as oldest_message,
    MAX(created_at) as newest_message
  INTO v_queue_stats
  FROM pgmq.q_table('column_leads_migration_queue');

  RETURN jsonb_build_object(
    'queue_name', 'column_leads_migration_queue',
    'total_messages', COALESCE(v_queue_stats.total_messages, 0),
    'oldest_message', v_queue_stats.oldest_message,
    'newest_message', v_queue_stats.newest_message
  );
END;
$$;

-- =============================================================================
-- Comentários
-- =============================================================================

COMMENT ON FUNCTION queue_column_leads_migration IS 'Enfileira movimentação de todos os leads de uma coluna para outra coluna/funil';
COMMENT ON FUNCTION process_column_leads_migration_batch IS 'Processa um batch de movimentação de leads de coluna';
COMMENT ON FUNCTION get_column_leads_migration_status IS 'Retorna status da fila de movimentação de colunas';

