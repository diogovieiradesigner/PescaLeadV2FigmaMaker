-- =============================================================================
-- UPDATE: should_campaign_run() - Suporte a Fallback Multi-WhatsApp
-- =============================================================================
-- Atualiza função para:
-- 1. Buscar inbox principal via campaign_instance_config (priority=1)
-- 2. Se desconectado E fallback_behavior='switch_to_reserve': tentar próximo inbox
-- 3. Se desconectado E fallback_behavior='pause': retornar INSTANCE_DISCONNECTED
-- 4. Retornar inbox_id selecionado para uso na run
-- =============================================================================

CREATE OR REPLACE FUNCTION public.should_campaign_run(p_config_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_config RECORD;
    v_now TIMESTAMPTZ;
    v_current_time TIME;
    v_day_of_week INTEGER;
    v_running_run RECORD;
    v_leads_count INTEGER;
    v_funnel_exists BOOLEAN;
    v_columns_exist BOOLEAN;
    v_instance_status TEXT;
    v_instance_name TEXT;
    v_inbox_id UUID;
    v_primary_inbox_id UUID;
    v_fallback_inbox RECORD;
    v_fallback_enabled BOOLEAN;
BEGIN
    -- Buscar configuração
    SELECT * INTO v_config
    FROM campaign_configs
    WHERE id = p_config_id;

    IF v_config IS NULL THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'Config not found');
    END IF;

    IF NOT v_config.is_active THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'Campaign inactive');
    END IF;

    -- ========================================
    -- ✅ NOVO: Buscar inbox principal via campaign_instance_config
    -- ========================================
    -- Busca inbox com priority = 1 (principal)
    SELECT cic.inbox_id INTO v_primary_inbox_id
    FROM campaign_instance_config cic
    WHERE cic.campaign_config_id = p_config_id
      AND cic.is_active = true
    ORDER BY cic.priority ASC
    LIMIT 1;

    -- Fallback para compatibilidade com campanhas antigas
    IF v_primary_inbox_id IS NULL THEN
        v_primary_inbox_id := v_config.inbox_id;
    END IF;

    IF v_primary_inbox_id IS NULL THEN
        RETURN jsonb_build_object(
            'should_run', false,
            'reason', 'No inbox configured for campaign',
            'error_code', 'NO_INBOX'
        );
    END IF;

    -- ========================================
    -- Verificar se instância principal está conectada
    -- ========================================
    SELECT i.status, i.name INTO v_instance_status, v_instance_name
    FROM inbox_instances ii
    JOIN instances i ON i.id = ii.instance_id
    WHERE ii.inbox_id = v_primary_inbox_id
    LIMIT 1;

    IF v_instance_status IS NULL THEN
        RETURN jsonb_build_object(
            'should_run', false,
            'reason', 'No instance linked to inbox',
            'error_code', 'NO_INSTANCE'
        );
    END IF;

    -- ========================================
    -- ✅ NOVO: Lógica de Fallback
    -- ========================================
    v_inbox_id := v_primary_inbox_id; -- Usar principal por padrão

    IF v_instance_status != 'connected' THEN
        -- Verifica se fallback está habilitado
        v_fallback_enabled := v_config.fallback_behavior = 'switch_to_reserve';

        IF v_fallback_enabled THEN
            -- Tenta buscar próximo inbox disponível
            SELECT * INTO v_fallback_inbox
            FROM get_next_available_inbox(p_config_id, v_primary_inbox_id);

            IF v_fallback_inbox.inbox_id IS NOT NULL THEN
                -- Encontrou inbox reserva conectado
                v_inbox_id := v_fallback_inbox.inbox_id;
                v_instance_status := v_fallback_inbox.instance_status;
                v_instance_name := v_fallback_inbox.instance_name;

                RAISE NOTICE 'Fallback: Switched from primary to reserve inbox % (priority %)',
                    v_fallback_inbox.inbox_name, v_fallback_inbox.priority;
            ELSE
                -- Nenhum inbox reserva disponível
                RETURN jsonb_build_object(
                    'should_run', false,
                    'reason', 'All instances disconnected (primary + reserves)',
                    'error_code', 'ALL_INSTANCES_DISCONNECTED',
                    'instance_status', v_instance_status,
                    'instance_name', v_instance_name
                );
            END IF;
        ELSE
            -- Comportamento = 'pause': Retorna erro imediatamente
            RETURN jsonb_build_object(
                'should_run', false,
                'reason', 'Instance disconnected: ' || COALESCE(v_instance_name, 'Unknown'),
                'error_code', 'INSTANCE_DISCONNECTED',
                'instance_status', v_instance_status,
                'instance_name', v_instance_name
            );
        END IF;
    END IF;

    -- ========================================
    -- Verificar se outra campanha está rodando na mesma instância
    -- ========================================
    SELECT cr.id, cc.id as config_id
    INTO v_running_run
    FROM campaign_runs cr
    JOIN campaign_configs cc ON cc.id = cr.config_id
    WHERE (
        -- Verifica inbox antigo (compatibilidade)
        cc.inbox_id = v_inbox_id
        OR
        -- Verifica current_inbox_id (novo sistema)
        cr.current_inbox_id = v_inbox_id
    )
      AND cr.status = 'running'  -- Apenas 'running', não 'paused'
      AND cr.id != cr.id  -- Evita conflito consigo mesmo (caso de retry)
    LIMIT 1;

    IF v_running_run.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'should_run', false,
            'reason', 'Another campaign is already running on this instance',
            'error_code', 'INSTANCE_BUSY',
            'running_run_id', v_running_run.id,
            'running_config_id', v_running_run.config_id
        );
    END IF;

    -- ========================================
    -- Verificar se funil existe e está ativo
    -- ========================================
    SELECT EXISTS(
        SELECT 1 FROM funnels WHERE id = v_config.source_funnel_id AND is_active = true
    ) INTO v_funnel_exists;

    IF NOT v_funnel_exists THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'Funnel not found or inactive');
    END IF;

    -- ========================================
    -- Verificar se colunas existem
    -- ========================================
    SELECT EXISTS(
        SELECT 1 FROM funnel_columns WHERE id = v_config.source_column_id
    ) AND EXISTS(
        SELECT 1 FROM funnel_columns WHERE id = v_config.target_column_id
    ) INTO v_columns_exist;

    IF NOT v_columns_exist THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'Source or target column not found');
    END IF;

    -- ========================================
    -- Hora atual no timezone da campanha
    -- ========================================
    v_now := now() AT TIME ZONE v_config.timezone;
    v_current_time := v_now::TIME;
    v_day_of_week := EXTRACT(DOW FROM v_now);

    -- Verificar se é dia da semana válido (weekdays = seg-sex)
    IF v_config.frequency = 'weekdays' AND v_day_of_week IN (0, 6) THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'Weekend - weekdays only');
    END IF;

    -- Verificar se está dentro da janela de horário
    IF v_current_time < v_config.start_time OR v_current_time > v_config.end_time THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'Outside time window');
    END IF;

    -- ========================================
    -- Verificar se há leads disponíveis
    -- ========================================
    SELECT COUNT(*) INTO v_leads_count
    FROM get_campaign_eligible_leads(v_config.workspace_id, v_config.source_column_id, v_inbox_id, 1);

    IF v_leads_count = 0 THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'No eligible leads');
    END IF;

    -- ========================================
    -- ✅ RETORNO COM SUCESSO (incluindo inbox_id selecionado)
    -- ========================================
    RETURN jsonb_build_object(
        'should_run', true,
        'reason', 'All checks passed',
        'instance_status', v_instance_status,
        'instance_name', v_instance_name,
        'inbox_id', v_inbox_id,  -- ✅ NOVO: Inbox a ser usado
        'is_fallback', v_inbox_id != v_primary_inbox_id,  -- ✅ NOVO: Flag indicando se é fallback
        'config', jsonb_build_object(
            'workspace_id', v_config.workspace_id,
            'inbox_id', v_inbox_id,  -- ✅ Usar inbox selecionado (pode ser reserva)
            'source_column_id', v_config.source_column_id,
            'target_column_id', v_config.target_column_id,
            'daily_limit', v_config.daily_limit,
            'ai_instructions', v_config.ai_instructions,
            'fallback_behavior', v_config.fallback_behavior
        )
    );
END;
$function$;

-- Comentário explicativo
COMMENT ON FUNCTION public.should_campaign_run(uuid) IS
'Verifica se campanha deve rodar com suporte a fallback multi-WhatsApp. Atualizado em 2026-01-07.';
