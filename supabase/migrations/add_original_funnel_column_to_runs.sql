-- =============================================================================
-- MIGRATION: Guardar Configuração Original de Funnel/Column no Run
-- =============================================================================
-- PROBLEMA: A função migrate_leads_with_custom_values() usa a configuração
--           ATUAL da extração, não a configuração que estava quando o run
--           foi criado. Se a configuração mudar depois, os leads serão
--           criados no kanban errado.
--
-- SOLUÇÃO:
-- 1. Adicionar campos original_funnel_id e original_column_id no run
-- 2. Trigger que popula esses campos quando run é criado
-- 3. Modificar função de migração para usar configuração do run
-- =============================================================================

-- =============================================================================
-- 1. ADICIONAR CAMPOS NO RUN
-- =============================================================================

ALTER TABLE public.lead_extraction_runs
ADD COLUMN IF NOT EXISTS original_funnel_id UUID,
ADD COLUMN IF NOT EXISTS original_column_id UUID;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_extraction_runs_original_funnel 
ON public.lead_extraction_runs(original_funnel_id);

CREATE INDEX IF NOT EXISTS idx_lead_extraction_runs_original_column 
ON public.lead_extraction_runs(original_column_id);

-- Comentários
COMMENT ON COLUMN public.lead_extraction_runs.original_funnel_id IS 
'Funnel ID que estava configurado na extração quando o run foi criado. Usado para garantir que leads sejam criados no kanban correto mesmo se a configuração mudar depois.';

COMMENT ON COLUMN public.lead_extraction_runs.original_column_id IS 
'Column ID que estava configurado na extração quando o run foi criado. Usado para garantir que leads sejam criados no kanban correto mesmo se a configuração mudar depois.';

-- =============================================================================
-- 2. TRIGGER PARA POPULAR CAMPOS ORIGINAIS
-- =============================================================================

CREATE OR REPLACE FUNCTION set_original_funnel_column()
RETURNS TRIGGER AS $$
DECLARE
  v_funnel_id UUID;
  v_column_id UUID;
BEGIN
  -- Se já foram definidos, não fazer nada (permite override manual)
  IF NEW.original_funnel_id IS NOT NULL AND NEW.original_column_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar configuração atual da extração
  SELECT le.funnel_id, le.column_id
  INTO v_funnel_id, v_column_id
  FROM public.lead_extractions le
  WHERE le.id = NEW.extraction_id;
  
  -- Popular campos originais com valores da configuração atual
  NEW.original_funnel_id := COALESCE(NEW.original_funnel_id, v_funnel_id);
  NEW.original_column_id := COALESCE(NEW.original_column_id, v_column_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_set_original_funnel_column ON public.lead_extraction_runs;
CREATE TRIGGER trg_set_original_funnel_column
  BEFORE INSERT ON public.lead_extraction_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_original_funnel_column();

COMMENT ON TRIGGER trg_set_original_funnel_column ON public.lead_extraction_runs IS 
'Popula automaticamente original_funnel_id e original_column_id quando uma nova run é criada, usando a configuração atual da extração.';

-- =============================================================================
-- 3. ATUALIZAR RUNS EXISTENTES (BACKFILL)
-- =============================================================================

-- Popular campos originais para runs existentes que não têm esses valores
UPDATE public.lead_extraction_runs ler
SET 
  original_funnel_id = COALESCE(ler.original_funnel_id, le.funnel_id),
  original_column_id = COALESCE(ler.original_column_id, le.column_id)
FROM public.lead_extractions le
WHERE ler.extraction_id = le.id
  AND (ler.original_funnel_id IS NULL OR ler.original_column_id IS NULL);

-- =============================================================================
-- 4. MODIFICAR FUNÇÃO DE MIGRAÇÃO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.migrate_leads_with_custom_values()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_funnel_id UUID;  -- ✅ NOVO: Usar do run
  v_column_id UUID;  -- ✅ NOVO: Usar do run
BEGIN
  -- Buscar leads prontos para migrar (LIMIT 200)
  FOR v_lead IN 
    SELECT 
      s.*,
      r.original_funnel_id,  -- ✅ NOVO: Usar configuração original do run
      r.original_column_id,   -- ✅ NOVO: Usar configuração original do run
      e.funnel_id,            -- Fallback se original_funnel_id for NULL
      e.column_id,            -- Fallback se original_column_id for NULL
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
    
    -- ✅ NOVO: Usar configuração original do run (fallback para config atual se NULL)
    v_funnel_id := COALESCE(v_lead.original_funnel_id, v_lead.funnel_id);
    v_column_id := COALESCE(v_lead.original_column_id, v_lead.column_id);
    
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
      -- ✅ MODIFICADO: Usar v_funnel_id e v_column_id do run (configuração original)
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
        v_funnel_id,      -- ✅ Usa configuração original do run
        v_column_id,      -- ✅ Usa configuração original do run
        v_lead.client_name,
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
  
  -- ================================================================
  -- ATUALIZAR MÉTRICAS DO RUN (filtered_out + created_quantity real)
  -- ================================================================
  IF v_run_id IS NOT NULL THEN
    -- Contar leads reais no Kanban para este run
    SELECT COUNT(*) INTO v_real_count
    FROM leads
    WHERE lead_extraction_run_id = v_run_id;
    
    UPDATE lead_extraction_runs
    SET 
      filtered_out = COALESCE(filtered_out, 0) + v_filtered_count,
      created_quantity = v_real_count  -- Sincronizar com Kanban real
    WHERE id = v_run_id;
  END IF;
  
  IF v_migrated_count > 0 OR v_filtered_count > 0 THEN
    RAISE NOTICE 'Migração: % migrados, % filtrados', v_migrated_count, v_filtered_count;
  END IF;
  
  RETURN v_migrated_count;
END;
$$;

COMMENT ON FUNCTION public.migrate_leads_with_custom_values() IS 
'Migra leads de lead_extraction_staging para leads. Agora usa original_funnel_id e original_column_id do run para garantir que leads sejam criados no kanban correto mesmo se a configuração da extração mudar depois.';

