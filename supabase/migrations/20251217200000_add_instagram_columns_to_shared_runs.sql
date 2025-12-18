-- =============================================================================
-- MIGRATION: Adicionar colunas do Instagram à lead_extraction_runs
-- =============================================================================
-- Esta migration adiciona as colunas necessárias para suportar extração do Instagram
-- na tabela compartilhada lead_extraction_runs
-- =============================================================================

-- Adicionar coluna source se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'source') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN source TEXT DEFAULT 'google_maps';
    END IF;
END $$;

-- Adicionar coluna funnel_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'funnel_id') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN funnel_id UUID;
    END IF;
END $$;

-- Adicionar coluna column_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'column_id') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN column_id UUID;
    END IF;
END $$;

-- Adicionar coluna niche se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'niche') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN niche TEXT;
    END IF;
END $$;

-- Adicionar coluna target_quantity se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'target_quantity') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN target_quantity INTEGER DEFAULT 100;
    END IF;
END $$;

-- Adicionar coluna discovery_status se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'discovery_status') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN discovery_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Adicionar coluna discovery_queries_total se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'discovery_queries_total') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN discovery_queries_total INTEGER DEFAULT 0;
    END IF;
END $$;

-- Adicionar coluna discovery_queries_completed se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'discovery_queries_completed') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN discovery_queries_completed INTEGER DEFAULT 0;
    END IF;
END $$;

-- Adicionar coluna discovery_profiles_found se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'discovery_profiles_found') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN discovery_profiles_found INTEGER DEFAULT 0;
    END IF;
END $$;

-- Adicionar coluna discovery_profiles_unique se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'discovery_profiles_unique') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN discovery_profiles_unique INTEGER DEFAULT 0;
    END IF;
END $$;

-- Adicionar coluna enrichment_status se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'enrichment_status') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN enrichment_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Adicionar coluna enrichment_snapshot_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'enrichment_snapshot_id') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN enrichment_snapshot_id TEXT;
    END IF;
END $$;

-- Adicionar coluna enrichment_profiles_total se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'enrichment_profiles_total') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN enrichment_profiles_total INTEGER DEFAULT 0;
    END IF;
END $$;

-- Adicionar coluna enrichment_profiles_completed se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'enrichment_profiles_completed') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN enrichment_profiles_completed INTEGER DEFAULT 0;
    END IF;
END $$;

-- Adicionar coluna enrichment_profiles_failed se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'enrichment_profiles_failed') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN enrichment_profiles_failed INTEGER DEFAULT 0;
    END IF;
END $$;

-- Adicionar coluna discovery_completed_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'discovery_completed_at') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN discovery_completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Adicionar coluna enrichment_completed_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'lead_extraction_runs' AND column_name = 'enrichment_completed_at') THEN
        ALTER TABLE lead_extraction_runs ADD COLUMN enrichment_completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Adicionar índice para source se não existir
CREATE INDEX IF NOT EXISTS idx_runs_source ON lead_extraction_runs(source);

-- =============================================================================
-- Comentários nas colunas
-- =============================================================================
COMMENT ON COLUMN lead_extraction_runs.source IS 'Fonte da extração: google_maps, instagram, cnpj, linkedin';
COMMENT ON COLUMN lead_extraction_runs.niche IS 'Nicho de busca (Instagram): dentista, advogado, etc';
COMMENT ON COLUMN lead_extraction_runs.discovery_status IS 'Status da etapa de descoberta (Instagram/Serper)';
COMMENT ON COLUMN lead_extraction_runs.enrichment_snapshot_id IS 'ID do snapshot na Bright Data (Instagram)';

-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
