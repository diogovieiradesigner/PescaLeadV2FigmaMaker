-- =============================================================================
-- FIX: Corrigir client_name usando extracted_data se client_name for "Sem nome"
-- =============================================================================
-- PROBLEMA: Leads estão sendo migrados com client_name = "Sem nome" mesmo quando
-- extracted_data->>'title' tem um valor válido.
-- 
-- SOLUÇÃO: Atualizar função de migração e corrigir leads existentes
-- =============================================================================

-- 1. Corrigir leads existentes que têm "Sem nome" mas extracted_data tem título
UPDATE leads l
SET 
  client_name = COALESCE(
    NULLIF(les.client_name, 'Sem nome'),
    les.extracted_data->>'title',
    les.extracted_data->>'name',
    les.extracted_data->>'displayName',
    l.client_name  -- Manter atual se não houver alternativa
  ),
  updated_at = NOW()
FROM lead_extraction_staging les
WHERE l.lead_extraction_id = les.id
  AND (l.client_name IS NULL OR l.client_name = '' OR l.client_name = 'Sem nome')
  AND (
    les.extracted_data->>'title' IS NOT NULL 
    OR les.extracted_data->>'name' IS NOT NULL
    OR les.extracted_data->>'displayName' IS NOT NULL
  );

-- 2. Atualizar função de migração para usar extracted_data se client_name for "Sem nome"
CREATE OR REPLACE FUNCTION public.migrate_leads_with_custom_values()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead RECORD;
  v_extraction RECORD;
  v_new_lead_id UUID;
  v_custom_field RECORD;
  v_value TEXT;
  v_migrated_count INTEGER := 0;
  v_filtered_count INTEGER := 0;
  v_passes_filters BOOLEAN;
  v_has_email BOOLEAN;
  v_has_phone BOOLEAN;
  v_has_website BOOLEAN;
  v_rating NUMERIC;
  v_reviews INTEGER;
  v_filter_reason TEXT;
  v_run_id UUID;
  v_real_count INTEGER;
  v_funnel_id UUID;
  v_column_id UUID;
  v_final_client_name TEXT;  -- ✅ NOVO: Nome final a ser usado
BEGIN
  -- Buscar leads prontos para migrar (LIMIT 200)
  FOR v_lead IN 
    SELECT 
      s.*,
      r.original_funnel_id,
      r.original_column_id,
      e.funnel_id,
      e.column_id,
      e.require_email,
      e.require_phone,
      e.require_website,
      e.min_rating,
      e.min_reviews
    FROM lead_extraction_staging s
    JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
    JOIN lead_extractions e ON e.id = r.extraction_id
    WHERE s.should_migrate = true
      AND s.migrated_at IS NULL
      AND s.status_extraction = 'google_fetched'
    LIMIT 200
  LOOP
    v_run_id := v_lead.extraction_run_id;
    v_filter_reason := NULL;
    
    -- Usar configuração original do run (fallback para config atual se NULL)
    v_funnel_id := COALESCE(v_lead.original_funnel_id, v_lead.funnel_id);
    v_column_id := COALESCE(v_lead.original_column_id, v_lead.column_id);
    
    -- ✅ NOVO: Determinar client_name final usando dados alternativos
    v_final_client_name := COALESCE(
      NULLIF(v_lead.client_name, 'Sem nome'),  -- Se não for "Sem nome", usar
      v_lead.extracted_data->>'title',          -- Tentar title
      v_lead.extracted_data->>'name',          -- Tentar name
      v_lead.extracted_data->>'displayName',   -- Tentar displayName
      'Sem nome'                                -- Último recurso
    );
    
    v_passes_filters := TRUE;
    
    v_has_email := (
      v_lead.emails IS NOT NULL 
      AND v_lead.emails != '[]'::jsonb 
      AND jsonb_array_length(v_lead.emails) > 0
    ) OR (
      v_lead.primary_email IS NOT NULL 
      AND v_lead.primary_email != ''
    );
    
    v_has_phone := (
      v_lead.phones IS NOT NULL 
      AND v_lead.phones != '[]'::jsonb 
      AND jsonb_array_length(v_lead.phones) > 0
    ) OR (
      v_lead.primary_phone IS NOT NULL 
      AND v_lead.primary_phone != ''
    );
    
    v_has_website := (
      v_lead.websites IS NOT NULL 
      AND v_lead.websites != '[]'::jsonb 
      AND jsonb_array_length(v_lead.websites) > 0
    ) OR (
      v_lead.primary_website IS NOT NULL 
      AND v_lead.primary_website != ''
    );
    
    v_rating := COALESCE((v_lead.extracted_data->>'rating')::numeric, 0);
    v_reviews := COALESCE((v_lead.extracted_data->>'reviews')::integer, 0);
    
    IF v_lead.require_email = TRUE AND v_has_email = FALSE THEN
      v_passes_filters := FALSE;
      v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_email';
    END IF;
    
    IF v_lead.require_phone = TRUE AND v_has_phone = FALSE THEN
      v_passes_filters := FALSE;
      v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_telefone';
    END IF;
    
    IF v_lead.require_website = TRUE AND v_has_website = FALSE THEN
      v_passes_filters := FALSE;
      v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_website';
    END IF;
    
    IF COALESCE(v_lead.min_rating, 0) > 0 AND v_rating < v_lead.min_rating THEN
      v_passes_filters := FALSE;
      v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'rating_baixo';
    END IF;
    
    IF COALESCE(v_lead.min_reviews, 0) > 0 AND v_reviews < v_lead.min_reviews THEN
      v_passes_filters := FALSE;
      v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'rating_baixo';
    END IF;
    
    IF v_passes_filters THEN
      -- ✅ MODIFICADO: Usar v_final_client_name em vez de v_lead.client_name
      INSERT INTO leads (
        workspace_id,
        funnel_id,
        column_id,
        client_name,
        company,
        lead_extraction_id,
        lead_extraction_run_id,
        created_at
      ) VALUES (
        v_lead.workspace_id,
        v_funnel_id,
        v_column_id,
        v_final_client_name,  -- ✅ Usa nome final calculado
        v_lead.company,
        (SELECT extraction_id FROM lead_extraction_runs WHERE id = v_lead.extraction_run_id),
        v_lead.extraction_run_id,
        v_lead.created_at
      )
      RETURNING id INTO v_new_lead_id;
      
      FOR v_custom_field IN 
        SELECT id, name 
        FROM custom_fields 
        WHERE workspace_id = v_lead.workspace_id
      LOOP
        v_value := v_lead.extracted_data->>v_custom_field.name;
        
        IF v_value IS NOT NULL THEN
          INSERT INTO lead_custom_values (lead_id, custom_field_id, value, created_at)
          VALUES (v_new_lead_id, v_custom_field.id, v_value, NOW())
          ON CONFLICT (lead_id, custom_field_id) DO UPDATE SET value = EXCLUDED.value;
        END IF;
      END LOOP;
      
      UPDATE lead_extraction_staging
      SET 
        migrated_at = NOW(),
        migrated_lead_id = v_new_lead_id,
        filter_passed = TRUE,
        filter_reason = NULL
      WHERE id = v_lead.id;
      
      v_migrated_count := v_migrated_count + 1;
    ELSE
      UPDATE lead_extraction_staging
      SET 
        should_migrate = FALSE,
        filter_passed = FALSE,
        filter_reason = v_filter_reason
      WHERE id = v_lead.id;
      
      v_filtered_count := v_filtered_count + 1;
    END IF;
  END LOOP;
  
  -- Atualizar métricas do run
  IF v_run_id IS NOT NULL THEN
    UPDATE lead_extraction_runs
    SET 
      filtered_out = filtered_out + v_filtered_count,
      created_quantity = (
        SELECT COUNT(*) 
        FROM leads 
        WHERE lead_extraction_run_id = v_run_id
      )
    WHERE id = v_run_id;
  END IF;
  
  RETURN v_migrated_count;
END;
$$;

COMMENT ON FUNCTION public.migrate_leads_with_custom_values() IS 
'Migra leads do staging para tabela leads. 
✅ CORRIGIDO: Agora usa extracted_data->>''title'' se client_name for "Sem nome"';

