-- Migration: Add instance_name to get_campaign_analytics
-- Date: 2026-01-07 13:00:00
-- Description: Adiciona o nome da instância WhatsApp no retorno da função get_campaign_analytics

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

    -- ✅ ALTERAÇÃO: Buscar config COM instance_name
    SELECT cc.*,
           ib.name as inbox_name,
           f.name as funnel_name,
           sc.title as source_column_name,
           tc.title as target_column_name,
           inst.name as instance_name,  -- ✅ NOVO
           inst.provider as instance_provider,  -- ✅ NOVO
           inst.status as instance_status  -- ✅ NOVO
    INTO v_config
    FROM campaign_runs cr
    JOIN campaign_configs cc ON cc.id = cr.config_id
    LEFT JOIN inboxes ib ON ib.id = cc.inbox_id
    LEFT JOIN inbox_instances ii ON ii.inbox_id = cc.inbox_id
    LEFT JOIN instances inst ON inst.id = ii.instance_id
    LEFT JOIN funnels f ON f.id = cc.source_funnel_id
    LEFT JOIN funnel_columns sc ON sc.id = cc.source_column_id
    LEFT JOIN funnel_columns tc ON tc.id = cc.target_column_id
    WHERE cr.id = v_run_id;

    -- 1. INFORMAÇÕES DO RUN (✅ COM INSTANCE_NAME)
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
        'instance_name', v_config.instance_name,  -- ✅ NOVO
        'instance_provider', v_config.instance_provider,  -- ✅ NOVO
        'instance_status', v_config.instance_status,  -- ✅ NOVO
        'funnel_name', v_config.funnel_name,
        'source_column', v_config.source_column_name,
        'target_column', v_config.target_column_name,
        'daily_limit', v_config.daily_limit
    ) INTO v_run_info
    FROM campaign_runs r
    WHERE r.id = v_run_id;

    -- 2. MÉTRICAS DAS MENSAGENS
    SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'queued')::int as queued,
        COUNT(*) FILTER (WHERE status = 'generating')::int as generating,
        COUNT(*) FILTER (WHERE status = 'sending')::int as sending,
        COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COUNT(*) FILTER (WHERE status = 'skipped')::int as skipped,
        COUNT(*) FILTER (WHERE status = 'replied')::int as replied,
        COALESCE(SUM(ai_tokens_used), 0)::int as total_tokens,
        COALESCE(AVG(COALESCE(ai_generation_time_ms, 0)), 0)::int as avg_generation_ms,
        COUNT(*) FILTER (WHERE conversation_id IS NOT NULL)::int as with_conversation,
        COUNT(*) FILTER (WHERE phone_normalized IS NOT NULL)::int as with_phone,
        COUNT(*) FILTER (WHERE generated_message IS NOT NULL)::int as with_message,
        COUNT(*) FILTER (WHERE retry_count > 0)::int as with_retry,
        COALESCE(AVG(retry_count), 0)::numeric(3,1) as avg_retries
    INTO v_stats
    FROM campaign_messages
    WHERE run_id = v_run_id;

    -- 3. TIMELINE DE LOGS
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'timestamp', TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS'),
                'datetime', created_at,
                'step', step_name,
                'level', level,
                'message', message,
                'details', details,
                'lead_id', lead_id,
                'icon', CASE
                    WHEN step_name = 'INICIALIZAÇÃO' THEN '🚀'
                    WHEN step_name = 'BUSCA_LEADS' THEN '🔍'
                    WHEN step_name = 'AGENDAMENTO' THEN '📅'
                    WHEN step_name = 'GERAÇÃO_IA' THEN '🤖'
                    WHEN step_name = 'ENVIO_WHATSAPP' THEN '📱'
                    WHEN step_name = 'MOVE_LEAD' THEN '➡️'
                    WHEN step_name = 'FINALIZAÇÃO' THEN '✅'
                    WHEN step_name = 'ERRO' THEN '❌'
                    WHEN step_name = 'RESPOSTA' THEN '💬'
                    ELSE '📊'
                END,
                'color', CASE level
                    WHEN 'success' THEN '#22c55e'
                    WHEN 'error' THEN '#ef4444'
                    WHEN 'warning' THEN '#f59e0b'
                    WHEN 'debug' THEN '#6b7280'
                    ELSE '#3b82f6'
                END
            ) ORDER BY created_at ASC
        ),
        '[]'::jsonb
    ) INTO v_timeline
    FROM campaign_logs
    WHERE run_id = v_run_id;

    -- 4. MONTAR RESULTADO FINAL
    v_result := jsonb_build_object(
        'run', v_run_info,
        'mensagens', jsonb_build_object(
            'total', COALESCE(v_stats.total, 0),
            'por_status', jsonb_build_object(
                'pending', COALESCE(v_stats.pending, 0),
                'queued', COALESCE(v_stats.queued, 0),
                'generating', COALESCE(v_stats.generating, 0),
                'sending', COALESCE(v_stats.sending, 0),
                'sent', COALESCE(v_stats.sent, 0),
                'failed', COALESCE(v_stats.failed, 0),
                'skipped', COALESCE(v_stats.skipped, 0),
                'replied', COALESCE(v_stats.replied, 0)
            ),
            'com_conversa', COALESCE(v_stats.with_conversation, 0),
            'com_telefone', COALESCE(v_stats.with_phone, 0),
            'com_mensagem_gerada', COALESCE(v_stats.with_message, 0),
            'com_retry', COALESCE(v_stats.with_retry, 0),
            'media_retries', COALESCE(v_stats.avg_retries, 0)
        ),
        'ia', jsonb_build_object(
            'tokens_total', COALESCE(v_stats.total_tokens, 0),
            'tokens_media', ROUND(COALESCE(v_stats.total_tokens, 0)::numeric / NULLIF(v_stats.with_message, 0), 0),
            'tempo_geracao_medio_ms', COALESCE(v_stats.avg_generation_ms, 0),
            'custo_estimado', ROUND((COALESCE(v_stats.total_tokens, 0) / 1000.0) * 0.00025, 4)
        ),
        'taxas', jsonb_build_object(
            'envio', ROUND(100.0 * COALESCE(v_stats.sent, 0) / NULLIF(v_stats.total, 0), 1),
            'falha', ROUND(100.0 * COALESCE(v_stats.failed, 0) / NULLIF(v_stats.total, 0), 1),
            'resposta', ROUND(100.0 * COALESCE(v_stats.replied, 0) / NULLIF(v_stats.sent, 0), 1),
            'geracao_ia', ROUND(100.0 * COALESCE(v_stats.with_message, 0) / NULLIF(v_stats.total, 0), 1)
        ),
        'graficos', jsonb_build_object(
            'pizza_status', jsonb_build_array(
                jsonb_build_object('name', 'Enviadas', 'value', COALESCE(v_stats.sent, 0), 'color', '#22c55e'),
                jsonb_build_object('name', 'Respondidas', 'value', COALESCE(v_stats.replied, 0), 'color', '#3b82f6'),
                jsonb_build_object('name', 'Falhas', 'value', COALESCE(v_stats.failed, 0), 'color', '#ef4444'),
                jsonb_build_object('name', 'Pendentes', 'value', COALESCE(v_stats.pending, 0) + COALESCE(v_stats.queued, 0) + COALESCE(v_stats.generating, 0) + COALESCE(v_stats.sending, 0), 'color', '#f59e0b')
            ),
            'barras_progresso', jsonb_build_array(
                jsonb_build_object('etapa', 'Agendadas', 'quantidade', COALESCE(v_stats.total, 0)),
                jsonb_build_object('etapa', 'IA Gerada', 'quantidade', COALESCE(v_stats.with_message, 0)),
                jsonb_build_object('etapa', 'Enviadas', 'quantidade', COALESCE(v_stats.sent, 0)),
                jsonb_build_object('etapa', 'Respondidas', 'quantidade', COALESCE(v_stats.replied, 0))
            )
        ),
        'timeline', v_timeline,
        'logs_count', (SELECT COUNT(*) FROM campaign_logs WHERE run_id = v_run_id),
        'gerado_em', NOW()
    );

    RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION public.get_campaign_analytics(uuid, uuid) IS
'Retorna analytics completo de uma campanha. Atualizado em 2026-01-07 para incluir instance_name.';
