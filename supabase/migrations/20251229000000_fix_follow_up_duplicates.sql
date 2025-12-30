-- ============================================================================
-- Migration: Fix Follow-up Duplicates
-- ============================================================================
-- PROBLEMA: Follow-ups sendo enviados em duplicata quando cron roda < 1min
-- CAUSA: Sem lock pessimista, múltiplas execuções podem pegar o mesmo job
-- SOLUÇÃO:
--   1. Lock pessimista (FOR UPDATE SKIP LOCKED) em get_ready_follow_up_jobs
--   2. UNIQUE constraint em follow_up_history (job_id + sequence_number)
-- ============================================================================

-- ============================================================================
-- 1. ADICIONAR UNIQUE CONSTRAINT EM FOLLOW_UP_HISTORY
-- ============================================================================
-- Previne inserção duplicada do mesmo follow-up (job + sequência)
-- Se já foi enviado, não pode enviar de novo

DO $$
BEGIN
  -- Primeiro, remover duplicatas existentes (manter apenas a primeira)
  DELETE FROM public.follow_up_history
  WHERE id IN (
    SELECT id
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY job_id, sequence_number
          ORDER BY sent_at ASC NULLS LAST, id ASC
        ) as rn
      FROM public.follow_up_history
    ) t
    WHERE rn > 1
  );

  -- Agora adicionar constraint única
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follow_up_history_job_sequence_unique'
  ) THEN
    ALTER TABLE public.follow_up_history
      ADD CONSTRAINT follow_up_history_job_sequence_unique
      UNIQUE (job_id, sequence_number);

    RAISE NOTICE 'Constraint única adicionada: follow_up_history_job_sequence_unique';
  END IF;
END $$;

COMMENT ON CONSTRAINT follow_up_history_job_sequence_unique ON public.follow_up_history IS
'Previne envio duplicado do mesmo follow-up (mesmo job + mesma sequência). Garante idempotência.';

-- ============================================================================
-- 2. CRIAR/RECRIAR get_ready_follow_up_jobs COM LOCK PESSIMISTA
-- ============================================================================
-- Lock pessimista (FOR UPDATE SKIP LOCKED) garante que:
-- - Apenas 1 execução processa cada job
-- - Jobs já travados são pulados (SKIP LOCKED)
-- - Sem race conditions entre múltiplas chamadas simultâneas

DROP FUNCTION IF EXISTS public.get_ready_follow_up_jobs(INTEGER);

CREATE OR REPLACE FUNCTION public.get_ready_follow_up_jobs(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  job_id UUID,
  conversation_id UUID,
  workspace_id UUID,
  trigger_message_id UUID,
  category_id UUID,
  current_model_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ✅ LOCK PESSIMISTA: FOR UPDATE SKIP LOCKED
  -- Trava jobs selecionados e pula jobs já travados por outra execução
  RETURN QUERY
  SELECT
    fj.id AS job_id,
    fj.conversation_id,
    fj.workspace_id,
    fj.trigger_message_id,
    fj.category_id,
    fj.current_model_index
  FROM public.follow_up_jobs fj
  WHERE fj.status IN ('pending', 'active')
    AND fj.next_execution_at <= NOW()
  ORDER BY fj.next_execution_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;  -- ✅ CRÍTICO: Previne processamento duplicado
END;
$$;

COMMENT ON FUNCTION public.get_ready_follow_up_jobs(INTEGER) IS
'Busca jobs prontos para execução COM LOCK PESSIMISTA (FOR UPDATE SKIP LOCKED). Previne race conditions quando cron < 1min.';

-- ============================================================================
-- 3. CRIAR/RECRIAR validate_follow_up_execution (garantir idempotência)
-- ============================================================================

DROP FUNCTION IF EXISTS public.validate_follow_up_execution(UUID);

CREATE OR REPLACE FUNCTION public.validate_follow_up_execution(p_job_id UUID)
RETURNS TABLE (
  valid BOOLEAN,
  reason TEXT,
  job_id UUID,
  conversation_id UUID,
  last_message_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_conversation RECORD;
  v_has_new_messages BOOLEAN;
BEGIN
  -- Buscar job
  SELECT * INTO v_job
  FROM public.follow_up_jobs
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'job_not_found'::TEXT, p_job_id, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Buscar conversa
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = v_job.conversation_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'conversation_not_found'::TEXT, p_job_id, v_job.conversation_id, NULL::UUID;
    RETURN;
  END IF;

  -- Verificar se conversa foi resolvida
  IF v_conversation.status = 'resolved' THEN
    RETURN QUERY SELECT FALSE, 'conversation_resolved'::TEXT, p_job_id, v_job.conversation_id, NULL::UUID;
    RETURN;
  END IF;

  -- Verificar se cliente respondeu após last_checked_message_id
  SELECT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.conversation_id = v_job.conversation_id
      AND m.message_type = 'received'
      AND m.created_at > (
        SELECT created_at
        FROM public.messages
        WHERE id = v_job.last_checked_message_id
      )
  ) INTO v_has_new_messages;

  IF v_has_new_messages THEN
    -- Retornar ID da última mensagem do cliente
    RETURN QUERY
    SELECT
      FALSE,
      'customer_replied'::TEXT,
      p_job_id,
      v_job.conversation_id,
      m.id
    FROM public.messages m
    WHERE m.conversation_id = v_job.conversation_id
      AND m.message_type = 'received'
    ORDER BY m.created_at DESC
    LIMIT 1;
    RETURN;
  END IF;

  -- Verificar se job ainda está ativo
  IF v_job.status NOT IN ('pending', 'active') THEN
    RETURN QUERY SELECT FALSE, 'job_inactive'::TEXT, p_job_id, v_job.conversation_id, NULL::UUID;
    RETURN;
  END IF;

  -- Tudo OK, pode executar
  RETURN QUERY SELECT TRUE, NULL::TEXT, p_job_id, v_job.conversation_id, v_job.last_checked_message_id;
END;
$$;

COMMENT ON FUNCTION public.validate_follow_up_execution(UUID) IS
'Valida se um job pode ser executado (conversa ativa, sem respostas novas, job ativo).';

-- ============================================================================
-- 4. CRIAR ÍNDICE PARA PERFORMANCE
-- ============================================================================
-- Índice para query de jobs prontos

CREATE INDEX IF NOT EXISTS idx_follow_up_jobs_ready
ON public.follow_up_jobs (next_execution_at, status)
WHERE status IN ('pending', 'active');

COMMENT ON INDEX idx_follow_up_jobs_ready IS
'Índice para busca rápida de jobs prontos (next_execution_at <= NOW() AND status IN (pending, active))';

-- ============================================================================
-- 5. ADICIONAR ÍNDICE PARA UNIQUE CONSTRAINT (performance)
-- ============================================================================
-- PostgreSQL cria automaticamente índice para UNIQUE, mas vamos garantir

CREATE INDEX IF NOT EXISTS idx_follow_up_history_job_sequence
ON public.follow_up_history (job_id, sequence_number);

COMMENT ON INDEX idx_follow_up_history_job_sequence IS
'Índice para busca rápida por job + sequência (suporta UNIQUE constraint)';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Permitir que service_role execute as funções
GRANT EXECUTE ON FUNCTION public.get_ready_follow_up_jobs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_follow_up_execution(UUID) TO service_role;

-- ============================================================================
-- RESUMO DA MIGRAÇÃO
-- ============================================================================
-- ✅ UNIQUE constraint em follow_up_history (job_id + sequence_number)
-- ✅ Lock pessimista em get_ready_follow_up_jobs (FOR UPDATE SKIP LOCKED)
-- ✅ Remoção de duplicatas existentes
-- ✅ Índices para performance
-- ✅ Permissions para service_role
--
-- RESULTADO: Follow-ups NÃO SERÃO MAIS DUPLICADOS mesmo se cron < 1min
-- ============================================================================
