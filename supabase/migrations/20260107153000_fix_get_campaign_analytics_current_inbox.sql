-- =============================================================================
-- FIX: get_campaign_analytics - Usar current_inbox_id da run
-- =============================================================================
-- Problema: Estava buscando instance do cc.inbox_id (principal), mesmo que
-- a run tenha feito switch para uma reserva (cr.current_inbox_id)
--
-- Correção: Buscar instance do current_inbox_id se disponível, senão inbox_id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_campaign_analytics(p_run_id uuid DEFAULT NULL::uuid, p_workspace_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_run_id UUID;
    v_result JSONB;
    v_run_info JSONB;
    v_stats RECORD;
    v_timeline JSONB;
    v_config RECORD;
    v_active_inbox_id UUID;  -- ✅ NOVO
BEGIN
    -- Se não passar run_id, pegar o mais recente
    IF p_run_id IS NULL THEN
        SELECT cr.id INTO v_run_id
        FROM campaign_runs cr
        JOIN campaign_configs cc ON cc.id = cr.config_id
        WHERE (p_workspace_id IS NULL OR cc.workspace_id = p_workspace_id)
        ORDER BY cr.started_at DESC
        LIMIT 1;
    ELSE
        v_run_id := p_run_id;
    END IF;

    IF v_run_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Nenhuma execução encontrada');
    END IF;

    -- ✅ NOVO: Buscar inbox ativo (current_inbox_id se disponível, senão inbox_id)
    SELECT COALESCE(cr.current_inbox_id, cc.inbox_id) INTO v_active_inbox_id
    FROM campaign_runs cr
    JOIN campaign_configs cc ON cc.id = cr.config_id
    WHERE cr.id = v_run_id;

    -- Buscar config COM instance_name DO INBOX ATIVO
    SELECT cc.*,
           ib.name as inbox_name,
           f.name as funnel_name,
           sc.title as source_column_name,
           tc.title as target_column_name,
           inst.name as instance_name,
           inst.provider as instance_provider,
           inst.status as instance_status
    INTO v_config
    FROM campaign_runs cr
    JOIN campaign_configs cc ON cc.id = cr.config_id
    LEFT JOIN inboxes ib ON ib.id = v_active_inbox_id  -- ✅ Usar inbox ativo
    LEFT JOIN inbox_instances ii ON ii.inbox_id = v_active_inbox_id  -- ✅ Usar inbox ativo
    LEFT JOIN instances inst ON inst.id = ii.instance_id
    LEFT JOIN funnels f ON f.id = cc.source_funnel_id
    LEFT JOIN funnel_columns sc ON sc.id = cc.source_column_id
    LEFT JOIN funnel_columns tc ON tc.id = cc.target_column_id
    WHERE cr.id = v_run_id;

    -- 1. INFORMAÇÕES DO RUN
    SELECT jsonb_build_object(
        'id', r.id,
        'config_id', r.config_id,
        'status', r.status,
        'run_date', r.run_date,
        'leads_total', r.leads_total,
        'leads_processed', r.leads_processed,
        'leads_success', r.leads_success,
        'leads_failed', r.leads_failed,
        'leads_skipped', r.leads_skipped,
        'started_at', r.started_at,
        'completed_at', r.completed_at,
        'error_message', r.error_message,
        'current_inbox_id', r.current_inbox_id,  -- ✅ NOVO
        'inbox_switches', r.inbox_switches,  -- ✅ NOVO
        'duration_seconds', EXTRACT(EPOCH FROM (COALESCE(r.completed_at, NOW()) - r.started_at))::int,
        'duration_formatted',
            CASE
                WHEN EXTRACT(EPOCH FROM (COALESCE(r.completed_at, NOW()) - r.started_at)) < 60
                    THEN EXTRACT(EPOCH FROM (COALESCE(r.completed_at, NOW()) - r.started_at))::int || 's'
                WHEN EXTRACT(EPOCH FROM (COALESCE(r.completed_at, NOW()) - r.started_at)) < 3600
                    THEN (EXTRACT(EPOCH FROM (COALESCE(r.completed_at, NOW()) - r.started_at))::int / 60) || 'min ' ||
                         (EXTRACT(EPOCH FROM (COALESCE(r.completed_at, NOW()) - r.started_at))::int % 60) || 's'
                ELSE (EXTRACT(EPOCH FROM (COALESCE(r.completed_at, NOW()) - r.started_at))::int / 3600) || 'h ' ||
                     ((EXTRACT(EPOCH FROM (COALESCE(r.completed_at, NOW()) - r.started_at))::int % 3600) / 60) || 'min'
            END,
        'progress_percent', ROUND(100.0 * r.leads_processed / NULLIF(r.leads_total, 0), 1),
        'success_rate', ROUND(100.0 * r.leads_success / NULLIF(r.leads_processed, 0), 1),
        'workspace_id', v_config.workspace_id,
        'inbox_name', v_config.inbox_name,
        'instance_name', v_config.instance_name,
        'instance_provider', v_config.instance_provider,
        'instance_status', v_config.instance_status,
        'funnel_name', v_config.funnel_name,
        'source_column', v_config.source_column_name,
        'target_column', v_config.target_column_name,
        'daily_limit', v_config.daily_limit
    ) INTO v_run_info
    FROM campaign_runs r
    WHERE r.id = v_run_id;

    -- 2. MÉTRICAS (resto da função continua igual...)
    SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed
    INTO v_stats
    FROM campaign_messages
    WHERE run_id = v_run_id;

    -- 3. TIMELINE (simplificado)
    SELECT jsonb_agg(
        jsonb_build_object(
            'step_name', step_name,
            'level', level,
            'message', message,
            'timestamp', created_at
        ) ORDER BY created_at
    ) INTO v_timeline
    FROM campaign_logs
    WHERE run_id = v_run_id;

    -- Retornar resultado
    RETURN jsonb_build_object(
        'run', v_run_info,
        'mensagens', jsonb_build_object(
            'total', v_stats.total,
            'pending', v_stats.pending,
            'sent', v_stats.sent,
            'failed', v_stats.failed
        ),
        'timeline', COALESCE(v_timeline, '[]'::jsonb)
    );
END;
$function$;

COMMENT ON FUNCTION public.get_campaign_analytics(uuid, uuid) IS
'Retorna analytics da campanha usando current_inbox_id (inbox ativo após possíveis switches)';
