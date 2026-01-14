-- Migration: Fix should_campaign_run to ignore paused campaigns
-- Date: 2026-01-07 12:00:00
-- Description: Atualiza a função should_campaign_run para não considerar campanhas
--              pausadas como bloqueio. Apenas campanhas 'running' devem bloquear novas execuções.

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

    -- Verificar se instância está conectada
    SELECT i.status, i.name INTO v_instance_status, v_instance_name
    FROM inbox_instances ii
    JOIN instances i ON i.id = ii.instance_id
    WHERE ii.inbox_id = v_config.inbox_id
    LIMIT 1;

    IF v_instance_status IS NULL THEN
        RETURN jsonb_build_object(
            'should_run', false,
            'reason', 'No instance linked to inbox',
            'error_code', 'NO_INSTANCE'
        );
    END IF;

    IF v_instance_status != 'connected' THEN
        RETURN jsonb_build_object(
            'should_run', false,
            'reason', 'Instance disconnected: ' || COALESCE(v_instance_name, 'Unknown'),
            'error_code', 'INSTANCE_DISCONNECTED',
            'instance_status', v_instance_status,
            'instance_name', v_instance_name
        );
    END IF;

    -- =====================================================
    -- ✅ ALTERAÇÃO: Verificar apenas campanhas com status 'running'
    -- Campanhas pausadas NÃO devem bloquear novas execuções
    -- =====================================================
    SELECT cr.id, cc.id as config_id
    INTO v_running_run
    FROM campaign_runs cr
    JOIN campaign_configs cc ON cc.id = cr.config_id
    WHERE cc.inbox_id = v_config.inbox_id
      AND cr.status = 'running'  -- ✅ Apenas 'running', não 'paused'
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
    -- =====================================================

    -- Verificar se funil existe e está ativo
    SELECT EXISTS(
        SELECT 1 FROM funnels WHERE id = v_config.source_funnel_id AND is_active = true
    ) INTO v_funnel_exists;

    IF NOT v_funnel_exists THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'Funnel not found or inactive');
    END IF;

    -- Verificar se colunas existem
    SELECT EXISTS(
        SELECT 1 FROM funnel_columns WHERE id = v_config.source_column_id
    ) AND EXISTS(
        SELECT 1 FROM funnel_columns WHERE id = v_config.target_column_id
    ) INTO v_columns_exist;

    IF NOT v_columns_exist THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'Source or target column not found');
    END IF;

    -- Hora atual no timezone da campanha
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

    -- Verificar se há leads disponíveis
    SELECT COUNT(*) INTO v_leads_count
    FROM get_campaign_eligible_leads(v_config.workspace_id, v_config.source_column_id, v_config.inbox_id, 1);

    IF v_leads_count = 0 THEN
        RETURN jsonb_build_object('should_run', false, 'reason', 'No eligible leads');
    END IF;

    RETURN jsonb_build_object(
        'should_run', true,
        'reason', 'All checks passed',
        'instance_status', v_instance_status,
        'config', jsonb_build_object(
            'workspace_id', v_config.workspace_id,
            'inbox_id', v_config.inbox_id,
            'source_column_id', v_config.source_column_id,
            'target_column_id', v_config.target_column_id,
            'daily_limit', v_config.daily_limit,
            'ai_instructions', v_config.ai_instructions
        )
    );
END;
$function$;

-- Comentário explicativo
COMMENT ON FUNCTION public.should_campaign_run(uuid) IS
'Verifica se uma campanha deve rodar. Atualizado em 2026-01-07 para ignorar campanhas pausadas e considerar apenas running como bloqueio.';
