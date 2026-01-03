-- ============================================
-- FIX: ai_execute_query - Corrigir substituição de $workspace_id
-- ============================================

CREATE OR REPLACE FUNCTION ai_execute_query(
  p_workspace_id UUID,
  p_query TEXT,
  p_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_rate_check JSONB;
  v_clean_query TEXT;
  v_final_query TEXT;
  v_row_count INT;
  v_max_limit INT := LEAST(COALESCE(p_limit, 100), 100);
  v_allowed_tables TEXT[] := ARRAY[
    'leads', 'funnels', 'funnel_columns', 'lead_activities',
    'lead_attachments', 'custom_fields', 'lead_custom_values',
    'conversations', 'messages', 'inboxes', 'instances',
    'workspace_members', 'lead_extraction_runs',
    'instagram_extraction_runs', 'instagram_enriched_profiles',
    'ai_conversations', 'ai_messages'
  ];
  -- Keywords proibidas - usar \m e \M para match de palavra inteira (word boundary)
  -- Isso evita falsos positivos como "created_at" contendo "CREATE"
  v_forbidden_patterns TEXT[] := ARRAY[
    '\mINSERT\M', '\mUPDATE\M', '\mDELETE\M', '\mDROP\M', '\mCREATE\M', '\mALTER\M',
    '\mTRUNCATE\M', '\mGRANT\M', '\mREVOKE\M', '\mEXECUTE\M', '\mCOPY\M',
    '\mpg_', 'information_schema', 'pg_catalog',
    '; --', '/\*', '\*/', '\mUNION\s+ALL\s+SELECT\M',
    'INTO OUTFILE', 'INTO DUMPFILE', 'LOAD_FILE'
  ];
  v_pattern TEXT;
  v_table TEXT;
  v_has_allowed_table BOOLEAN := FALSE;
BEGIN
  -- 1. Rate limit check
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id, 50, 500);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rate limit exceeded: ' || (v_rate_check->>'reason'),
      'retry_after', v_rate_check->'retry_after'
    );
  END IF;

  -- 2. Limpar e normalizar query
  v_clean_query := TRIM(p_query);
  v_clean_query := REGEXP_REPLACE(v_clean_query, '\s+', ' ', 'g');

  -- 3. Verificar se começa com SELECT
  IF NOT (UPPER(v_clean_query) ~ '^SELECT\s') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only SELECT queries are allowed. Query must start with SELECT.'
    );
  END IF;

  -- 4. Verificar patterns proibidos usando regex (case insensitive)
  -- Usa \m e \M para word boundaries, evitando falsos positivos como "created_at"
  FOREACH v_pattern IN ARRAY v_forbidden_patterns LOOP
    IF v_clean_query ~* v_pattern THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Query contains forbidden pattern'
      );
    END IF;
  END LOOP;

  -- 5. Verificar se usa pelo menos uma tabela permitida
  FOREACH v_table IN ARRAY v_allowed_tables LOOP
    IF v_clean_query ~* ('\m' || v_table || '\M') THEN
      v_has_allowed_table := TRUE;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_has_allowed_table THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Query must reference at least one allowed table: ' || array_to_string(v_allowed_tables, ', ')
    );
  END IF;

  -- 6. Verificar se tem workspace_id na query
  IF NOT (v_clean_query ~* 'workspace_id') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Query must include workspace_id filter for security. Add WHERE workspace_id = $workspace_id'
    );
  END IF;

  -- 7. Substituir placeholder pelo valor real
  -- Formato principal: {{WORKSPACE}}
  v_final_query := REPLACE(v_clean_query, '{{WORKSPACE}}', quote_literal(p_workspace_id::TEXT));

  -- Formatos alternativos para compatibilidade
  v_final_query := REPLACE(v_final_query, '$workspace_id', quote_literal(p_workspace_id::TEXT));
  v_final_query := REPLACE(v_final_query, '{workspace_id}', quote_literal(p_workspace_id::TEXT));
  v_final_query := REPLACE(v_final_query, ':workspace_id', quote_literal(p_workspace_id::TEXT));

  -- 8. Adicionar LIMIT se não tiver
  IF NOT (UPPER(v_final_query) ~ '\mLIMIT\s+\d+') THEN
    v_final_query := v_final_query || ' LIMIT ' || v_max_limit;
  ELSE
    -- Se já tem LIMIT, garantir que não excede o máximo
    v_final_query := REGEXP_REPLACE(
      v_final_query,
      'LIMIT\s+(\d+)',
      'LIMIT ' || v_max_limit,
      'i'
    );
  END IF;

  -- 9. Executar query com timeout
  BEGIN
    SET LOCAL statement_timeout = '5000'; -- 5 segundos máximo

    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || v_final_query || ') t'
    INTO v_result;

    -- Contar resultados
    v_row_count := COALESCE(jsonb_array_length(v_result), 0);

    RETURN jsonb_build_object(
      'success', true,
      'data', COALESCE(v_result, '[]'::jsonb),
      'count', v_row_count,
      'query_executed', v_final_query
    );

  EXCEPTION
    WHEN query_canceled THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Query timeout - query took too long to execute (max 5 seconds)'
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Query execution error: ' || SQLERRM,
        'query_attempted', v_final_query
      );
  END;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION ai_execute_query TO authenticated;
