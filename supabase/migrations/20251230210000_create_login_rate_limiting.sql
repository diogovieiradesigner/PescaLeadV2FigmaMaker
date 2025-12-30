-- ============================================
-- Rate Limiting para Login
-- Previne ataques de força bruta
-- ============================================

-- Tabela para rastrear tentativas de login
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- email ou IP
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'ip')),
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier
    ON login_attempts(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked_until
    ON login_attempts(blocked_until) WHERE blocked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_login_attempts_last_attempt
    ON login_attempts(last_attempt_at);

-- Função para verificar se está bloqueado
CREATE OR REPLACE FUNCTION check_login_rate_limit(
    p_identifier TEXT,
    p_identifier_type TEXT DEFAULT 'email'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record login_attempts%ROWTYPE;
    v_max_attempts INTEGER := 5; -- máximo de tentativas
    v_window_minutes INTEGER := 15; -- janela de tempo em minutos
    v_block_minutes INTEGER := 30; -- tempo de bloqueio em minutos
BEGIN
    -- Buscar registro existente
    SELECT * INTO v_record
    FROM login_attempts
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
    ORDER BY last_attempt_at DESC
    LIMIT 1;

    -- Se não existe registro, permitir
    IF NOT FOUND THEN
        RETURN json_build_object(
            'allowed', true,
            'attempts_remaining', v_max_attempts,
            'blocked_until', null
        );
    END IF;

    -- Se está bloqueado e ainda não expirou
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > NOW() THEN
        RETURN json_build_object(
            'allowed', false,
            'attempts_remaining', 0,
            'blocked_until', v_record.blocked_until,
            'message', 'Muitas tentativas. Tente novamente em ' ||
                CEIL(EXTRACT(EPOCH FROM (v_record.blocked_until - NOW())) / 60)::TEXT || ' minutos.'
        );
    END IF;

    -- Se a janela de tempo expirou, resetar contador
    IF v_record.first_attempt_at < NOW() - (v_window_minutes || ' minutes')::INTERVAL THEN
        RETURN json_build_object(
            'allowed', true,
            'attempts_remaining', v_max_attempts,
            'blocked_until', null
        );
    END IF;

    -- Calcular tentativas restantes
    RETURN json_build_object(
        'allowed', v_record.attempt_count < v_max_attempts,
        'attempts_remaining', GREATEST(0, v_max_attempts - v_record.attempt_count),
        'blocked_until', v_record.blocked_until
    );
END;
$$;

-- Função para registrar tentativa de login
CREATE OR REPLACE FUNCTION record_login_attempt(
    p_identifier TEXT,
    p_identifier_type TEXT DEFAULT 'email',
    p_success BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record login_attempts%ROWTYPE;
    v_max_attempts INTEGER := 5;
    v_window_minutes INTEGER := 15;
    v_block_minutes INTEGER := 30;
    v_new_count INTEGER;
BEGIN
    -- Se login bem sucedido, limpar tentativas
    IF p_success THEN
        DELETE FROM login_attempts
        WHERE identifier = p_identifier
          AND identifier_type = p_identifier_type;

        RETURN json_build_object(
            'success', true,
            'message', 'Tentativas resetadas'
        );
    END IF;

    -- Buscar registro existente dentro da janela
    SELECT * INTO v_record
    FROM login_attempts
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND first_attempt_at > NOW() - (v_window_minutes || ' minutes')::INTERVAL
    ORDER BY last_attempt_at DESC
    LIMIT 1;

    -- Se não existe ou janela expirou, criar novo registro
    IF NOT FOUND THEN
        INSERT INTO login_attempts (identifier, identifier_type, attempt_count, first_attempt_at, last_attempt_at)
        VALUES (p_identifier, p_identifier_type, 1, NOW(), NOW());

        RETURN json_build_object(
            'success', true,
            'attempts_remaining', v_max_attempts - 1,
            'blocked', false
        );
    END IF;

    -- Incrementar contador
    v_new_count := v_record.attempt_count + 1;

    -- Verificar se deve bloquear
    IF v_new_count >= v_max_attempts THEN
        UPDATE login_attempts
        SET attempt_count = v_new_count,
            last_attempt_at = NOW(),
            blocked_until = NOW() + (v_block_minutes || ' minutes')::INTERVAL
        WHERE id = v_record.id;

        RETURN json_build_object(
            'success', true,
            'attempts_remaining', 0,
            'blocked', true,
            'blocked_until', NOW() + (v_block_minutes || ' minutes')::INTERVAL,
            'message', 'Conta bloqueada por ' || v_block_minutes || ' minutos devido a muitas tentativas.'
        );
    ELSE
        UPDATE login_attempts
        SET attempt_count = v_new_count,
            last_attempt_at = NOW()
        WHERE id = v_record.id;

        RETURN json_build_object(
            'success', true,
            'attempts_remaining', v_max_attempts - v_new_count,
            'blocked', false
        );
    END IF;
END;
$$;

-- Função de limpeza automática (registros antigos > 24h)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM login_attempts
    WHERE last_attempt_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Agendar limpeza diária (requer pg_cron)
DO $$
BEGIN
    -- Verifica se pg_cron está disponível
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove job existente se houver
        PERFORM cron.unschedule('cleanup-login-attempts');

        -- Agenda novo job para rodar todo dia às 3h
        PERFORM cron.schedule(
            'cleanup-login-attempts',
            '0 3 * * *',
            'SELECT cleanup_old_login_attempts()'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Se pg_cron não está disponível, ignora silenciosamente
        NULL;
END;
$$;

-- Permissões: funções podem ser chamadas por qualquer usuário autenticado ou anônimo
GRANT EXECUTE ON FUNCTION check_login_rate_limit(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, TEXT, BOOLEAN) TO anon, authenticated;

-- RLS: tabela não precisa de RLS pois é acessada apenas via funções SECURITY DEFINER
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Comentários
COMMENT ON TABLE login_attempts IS 'Rastreia tentativas de login para rate limiting';
COMMENT ON FUNCTION check_login_rate_limit IS 'Verifica se um identificador está bloqueado por rate limiting';
COMMENT ON FUNCTION record_login_attempt IS 'Registra uma tentativa de login (sucesso ou falha)';
