-- Migration: AI Execute Query - SQL Dinâmico Seguro
-- Permite a IA executar consultas SQL dinâmicas com máxima segurança

-- ============================================
-- 1. FUNÇÃO PARA VALIDAR E EXECUTAR SQL
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
  v_forbidden_keywords TEXT[] := ARRAY[
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE', 'COPY',
    'pg_', 'information_schema', 'pg_catalog',
    '; --', '/*', '*/', 'UNION ALL SELECT',
    'INTO OUTFILE', 'INTO DUMPFILE', 'LOAD_FILE'
  ];
  v_keyword TEXT;
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

  -- 4. Verificar keywords proibidas
  FOREACH v_keyword IN ARRAY v_forbidden_keywords LOOP
    IF UPPER(v_clean_query) LIKE '%' || UPPER(v_keyword) || '%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Query contains forbidden keyword: ' || v_keyword
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

  -- 6. Verificar se já tem workspace_id na query
  IF NOT (v_clean_query ~* 'workspace_id') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Query must include workspace_id filter for security. Add WHERE workspace_id = $workspace_id'
    );
  END IF;

  -- 7. Construir query final com workspace_id substituído e LIMIT
  v_final_query := REGEXP_REPLACE(
    v_clean_query,
    '\$workspace_id|\{workspace_id\}|:workspace_id',
    quote_literal(p_workspace_id::TEXT),
    'gi'
  );

  -- Também substituir placeholder simples
  v_final_query := REPLACE(v_final_query, '''$workspace_id''', quote_literal(p_workspace_id::TEXT));

  -- Adicionar LIMIT se não tiver
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

  -- 8. Executar query com timeout
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
        'error', 'Query execution error: ' || SQLERRM
      );
  END;
END;
$$;

-- ============================================
-- 2. FUNÇÃO PARA OBTER SCHEMA DAS TABELAS
-- ============================================
CREATE OR REPLACE FUNCTION ai_get_database_schema(
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_rate_check JSONB;
BEGIN
  -- Rate limit check
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id, 10, 100);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Rate limit: ' || (v_rate_check->>'reason'));
  END IF;

  SELECT jsonb_object_agg(
    table_name,
    columns
  )
  INTO v_result
  FROM (
    SELECT
      c.table_name,
      jsonb_agg(
        jsonb_build_object(
          'column', c.column_name,
          'type', c.data_type,
          'nullable', c.is_nullable = 'YES'
        ) ORDER BY c.ordinal_position
      ) as columns
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name IN (
        'leads', 'funnels', 'funnel_columns', 'lead_activities',
        'lead_attachments', 'custom_fields', 'lead_custom_values',
        'conversations', 'messages', 'inboxes', 'instances',
        'workspace_members', 'lead_extraction_runs',
        'instagram_extraction_runs', 'instagram_enriched_profiles'
      )
    GROUP BY c.table_name
  ) schema_data;

  RETURN jsonb_build_object(
    'success', true,
    'schema', COALESCE(v_result, '{}'::jsonb),
    'allowed_tables', ARRAY[
      'leads', 'funnels', 'funnel_columns', 'lead_activities',
      'lead_attachments', 'custom_fields', 'lead_custom_values',
      'conversations', 'messages', 'inboxes', 'instances',
      'workspace_members', 'lead_extraction_runs',
      'instagram_extraction_runs', 'instagram_enriched_profiles'
    ],
    'instructions', 'Use $workspace_id as placeholder for workspace filtering. Only SELECT queries allowed. Max 100 rows returned.'
  );
END;
$$;

-- ============================================
-- 3. GRANTS
-- ============================================
GRANT EXECUTE ON FUNCTION ai_execute_query TO authenticated;
GRANT EXECUTE ON FUNCTION ai_get_database_schema TO authenticated;
