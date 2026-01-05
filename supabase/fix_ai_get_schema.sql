-- FIX: ai_get_schema function
-- Execute este SQL no SQL Editor do Supabase para adicionar a função de busca de schema

-- ============================================
-- FUNCTION: ai_get_schema
-- Retorna informações de schema para tabelas permitidas
-- Permite que a IA entenda a estrutura das tabelas antes de fazer queries
-- ============================================
CREATE OR REPLACE FUNCTION ai_get_schema(
  p_workspace_id UUID,
  p_table_names TEXT[] DEFAULT '{leads,funnels,funnel_columns,conversations,messages}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_rate_check JSONB;
  v_table_name TEXT;
  v_table_schema JSONB;
  v_allowed_tables TEXT[] := ARRAY[
    'leads',
    'funnels',
    'funnel_columns',
    'conversations',
    'messages',
    'lead_activities',
    'lead_attachments',
    'custom_fields',
    'lead_custom_values',
    'inboxes',
    'workspace_members',
    'funnel_stats',
    'lead_extraction_runs',
    'instagram_extraction_runs',
    'instagram_enriched_profiles'
  ];
BEGIN
  -- Rate limit check
  v_rate_check := check_ai_tool_rate_limit(p_workspace_id);
  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Rate limit: ' || (v_rate_check->>'reason'), 'retry_after', v_rate_check->'retry_after');
  END IF;

  -- Filter to only allowed tables
  FOREACH v_table_name IN ARRAY p_table_names
  LOOP
    -- Skip if not in allowed tables
    IF NOT (v_table_name = ANY(v_allowed_tables)) THEN
      CONTINUE;
    END IF;

    -- Get column information for this table
    SELECT jsonb_build_object(
      'table_name', v_table_name,
      'columns', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'name', column_name,
              'type', data_type,
              'nullable', is_nullable = 'YES',
              'default', column_default
            )
            ORDER BY ordinal_position
          )
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = v_table_name
        ),
        '[]'::jsonb
      ),
      'primary_key', (
        SELECT jsonb_agg(kcu.column_name)
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = v_table_name
          AND tc.constraint_type = 'PRIMARY KEY'
      ),
      'foreign_keys', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'column', kcu.column_name,
              'references_table', ccu.table_name,
              'references_column', ccu.column_name
            )
          )
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = v_table_name
            AND tc.constraint_type = 'FOREIGN KEY'
        ),
        '[]'::jsonb
      ),
      'row_count_estimate', (
        SELECT reltuples::BIGINT
        FROM pg_class
        WHERE relname = v_table_name
          AND relnamespace = 'public'::regnamespace
      )
    ) INTO v_table_schema;

    -- Only add if table exists (has columns)
    IF (v_table_schema->'columns') IS NOT NULL AND jsonb_array_length(v_table_schema->'columns') > 0 THEN
      v_result := v_result || v_table_schema;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'tables', v_result,
    'allowed_tables', v_allowed_tables
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ai_get_schema TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION ai_get_schema IS 'Returns schema information (columns, types, keys) for allowed tables. Used by AI to understand database structure before querying.';
