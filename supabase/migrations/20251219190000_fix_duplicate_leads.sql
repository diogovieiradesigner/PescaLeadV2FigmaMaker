-- =============================================================================
-- Migration: Prevent Duplicate Leads from Extractions
-- =============================================================================
-- 1. Add deduplication_hash to leads table
-- 2. Add unique index to prevent duplicates
-- 3. Update migration function to handle conflicts
-- =============================================================================

-- 1. Add deduplication_hash column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'deduplication_hash') THEN
        ALTER TABLE public.leads ADD COLUMN deduplication_hash text;
    END IF;
END $$;

-- 2. Add unique index (safely)
-- Using IF NOT EXISTS via a DO block to avoid errors if run multiple times
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_leads_deduplication_hash' AND n.nspname = 'public') THEN
        CREATE UNIQUE INDEX idx_leads_deduplication_hash ON public.leads (workspace_id, deduplication_hash) WHERE deduplication_hash IS NOT NULL;
    END IF;
END $$;

-- 3. Update the migration function to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.migrate_staging_to_leads()
 RETURNS TABLE(migrated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  staging_record RECORD;
  run_record RECORD;
  extraction_record RECORD;
  new_lead_id UUID;
  migrated_count INTEGER := 0;
  skipped_by_filter INTEGER := 0;
  v_passes_filters BOOLEAN;
  v_has_email BOOLEAN;
  v_has_phone BOOLEAN;
  v_has_website BOOLEAN;
  v_rating NUMERIC;
  v_reviews INTEGER;
  v_tags TEXT[];
  v_category TEXT;
BEGIN
  -- Loop pelos leads prontos para migração
  -- Adicionado SKIP LOCKED para evitar race conditions em execuções paralelas
  FOR staging_record IN
    SELECT *
    FROM public.lead_extraction_staging
    WHERE should_migrate = true
      AND migrated_at IS NULL
      AND status_extraction = 'google_fetched'
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Buscar dados do run e extração para aplicar filtros
      SELECT r.*, e.* INTO run_record
      FROM public.lead_extraction_runs r
      JOIN public.lead_extractions e ON e.id = r.extraction_id
      WHERE r.id = staging_record.extraction_run_id;

      -- ================================================================
      -- APLICAR FILTROS APÓS ENRIQUECIMENTO
      -- ================================================================
      v_passes_filters := TRUE;

      -- Verificar se tem email (de qualquer fonte: serpdev, whois, cnpj, scraping)
      v_has_email := (
        staging_record.emails IS NOT NULL
        AND staging_record.emails != '[]'::jsonb
        AND jsonb_array_length(staging_record.emails) > 0
      ) OR (
        staging_record.primary_email IS NOT NULL
        AND staging_record.primary_email != ''
      );

      -- Verificar se tem telefone
      v_has_phone := (
        staging_record.phones IS NOT NULL
        AND staging_record.phones != '[]'::jsonb
        AND jsonb_array_length(staging_record.phones) > 0
      ) OR (
        staging_record.primary_phone IS NOT NULL
        AND staging_record.primary_phone != ''
      );

      -- Verificar se tem website
      v_has_website := (
        staging_record.websites IS NOT NULL
        AND staging_record.websites != '[]'::jsonb
        AND jsonb_array_length(staging_record.websites) > 0
      ) OR (
        staging_record.primary_website IS NOT NULL
        AND staging_record.primary_website != ''
      );

      -- Rating e reviews do extracted_data
      v_rating := COALESCE((staging_record.extracted_data->>'rating')::numeric, 0);
      v_reviews := COALESCE((staging_record.extracted_data->>'reviews')::integer, 0);

      -- Aplicar filtro: require_email
      IF run_record.require_email = TRUE AND v_has_email = FALSE THEN
        v_passes_filters := FALSE;
        RAISE NOTICE 'Lead % filtrado: sem email', staging_record.client_name;
      END IF;

      -- Aplicar filtro: require_phone
      IF run_record.require_phone = TRUE AND v_has_phone = FALSE THEN
        v_passes_filters := FALSE;
        RAISE NOTICE 'Lead % filtrado: sem telefone', staging_record.client_name;
      END IF;

      -- Aplicar filtro: require_website
      IF run_record.require_website = TRUE AND v_has_website = FALSE THEN
        v_passes_filters := FALSE;
        RAISE NOTICE 'Lead % filtrado: sem website', staging_record.client_name;
      END IF;

      -- Aplicar filtro: min_rating
      IF COALESCE(run_record.min_rating, 0) > 0 AND v_rating < run_record.min_rating THEN
        v_passes_filters := FALSE;
        RAISE NOTICE 'Lead % filtrado: rating % < %', staging_record.client_name, v_rating, run_record.min_rating;
      END IF;

      -- Aplicar filtro: min_reviews
      IF COALESCE(run_record.min_reviews, 0) > 0 AND v_reviews < run_record.min_reviews THEN
        v_passes_filters := FALSE;
        RAISE NOTICE 'Lead % filtrado: reviews % < %', staging_record.client_name, v_reviews, run_record.min_reviews;
      END IF;

      -- ================================================================
      -- DECIDIR: MIGRAR OU MARCAR COMO FILTRADO
      -- ================================================================
      IF v_passes_filters THEN
        -- ================================================================
        -- CONSTRUIR TAGS PARA O LEAD
        -- ================================================================
        v_tags := ARRAY['google-maps-extraction'];

        -- Adicionar categoria do negócio como tag (se existir)
        v_category := staging_record.extracted_data->>'category';
        IF v_category IS NOT NULL AND v_category != '' THEN
          -- Normalizar categoria: lowercase, trocar espaços por hífens
          v_tags := array_append(v_tags, lower(regexp_replace(v_category, '\s+', '-', 'g')));
        END IF;

        -- Adicionar tag de rating alto (4.5+)
        IF v_rating >= 4.5 THEN
          v_tags := array_append(v_tags, 'alta-avaliacao');
        END IF;

        -- Adicionar tag de muitas avaliações (50+)
        IF v_reviews >= 50 THEN
          v_tags := array_append(v_tags, 'popular');
        END IF;

        -- Inserir na tabela leads com tratamento de duplicação
        INSERT INTO public.leads (
          workspace_id,
          funnel_id,
          column_id,
          client_name,
          company,
          lead_extraction_id,
          lead_extraction_run_id,
          whatsapp_valid,
          whatsapp_jid,
          whatsapp_name,
          tags,
          deduplication_hash, -- NOVO CAMPO
          created_at
        )
        VALUES (
          staging_record.workspace_id,
          (SELECT funnel_id FROM public.lead_extractions e JOIN public.lead_extraction_runs r ON r.extraction_id = e.id WHERE r.id = staging_record.extraction_run_id),
          (SELECT column_id FROM public.lead_extractions e JOIN public.lead_extraction_runs r ON r.extraction_id = e.id WHERE r.id = staging_record.extraction_run_id),
          staging_record.client_name,
          COALESCE(staging_record.company, staging_record.client_name),
          (SELECT extraction_id FROM public.lead_extraction_runs WHERE id = staging_record.extraction_run_id),
          staging_record.extraction_run_id,
          staging_record.whatsapp_valid,
          staging_record.whatsapp_jid,
          staging_record.whatsapp_name,
          v_tags,
          staging_record.deduplication_hash, -- Passando o hash
          NOW()
        )
        ON CONFLICT (workspace_id, deduplication_hash) DO NOTHING
        RETURNING id INTO new_lead_id;

        -- Se não inseriu (duplicado), tentar buscar o ID existente
        IF new_lead_id IS NULL THEN
            SELECT id INTO new_lead_id
            FROM public.leads
            WHERE workspace_id = staging_record.workspace_id
              AND deduplication_hash = staging_record.deduplication_hash
            LIMIT 1;
            
            RAISE NOTICE 'Lead duplicado encontrado (hash %): ID existente %', staging_record.deduplication_hash, new_lead_id;
        END IF;

        -- Marcar como migrado (mesmo se foi duplicado, marcamos como processado para não tentar novamente)
        UPDATE public.lead_extraction_staging
        SET
          migrated_lead_id = new_lead_id,
          migrated_at = NOW(),
          filter_passed = TRUE
        WHERE id = staging_record.id;

        migrated_count := migrated_count + 1;
        RAISE NOTICE 'Migrado lead: % -> % (WhatsApp: %, Tags: %)', staging_record.client_name, new_lead_id, staging_record.whatsapp_valid, v_tags;
      ELSE
        -- Marcar como filtrado (não migrar)
        UPDATE public.lead_extraction_staging
        SET
          should_migrate = FALSE,
          filter_passed = FALSE
        WHERE id = staging_record.id;

        skipped_by_filter := skipped_by_filter + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao migrar lead %: %', staging_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Migração concluída: % migrados, % filtrados', migrated_count, skipped_by_filter;

  RETURN QUERY SELECT migrated_count;
END;
$function$;
