-- =============================================================================
-- MIGRATION: CNPJ Extraction System
-- Data: 2025-12-17
-- Descrição: Adiciona suporte a extração de leads via banco CNPJ
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Adicionar campo 'source' às tabelas existentes
-- -----------------------------------------------------------------------------

-- lead_extractions: configurações de extração
ALTER TABLE lead_extractions
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_maps';

-- lead_extraction_runs: execuções de extração
ALTER TABLE lead_extraction_runs
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_maps';

-- extraction_logs: logs de extração
ALTER TABLE extraction_logs
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'google_maps';

-- Comentários explicativos
COMMENT ON COLUMN lead_extractions.source IS 'Fonte da extração: google_maps, cnpj, instagram';
COMMENT ON COLUMN lead_extraction_runs.source IS 'Fonte da extração: google_maps, cnpj, instagram';
COMMENT ON COLUMN extraction_logs.source IS 'Fonte da extração: google_maps, cnpj, instagram';

-- -----------------------------------------------------------------------------
-- 2. Criar tabela cnpj_extraction_staging
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cnpj_extraction_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES lead_extraction_runs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,

  -- Dados do CNPJ
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  email TEXT,
  telefone TEXT,
  uf TEXT,
  municipio TEXT,
  cnae TEXT,
  cnae_descricao TEXT,
  porte TEXT,
  capital_social NUMERIC,
  situacao TEXT,
  data_abertura DATE,
  tipo TEXT, -- MATRIZ/FILIAL
  simples BOOLEAN,
  mei BOOLEAN,

  -- Dados completos da API
  raw_data JSONB,

  -- Status de processamento
  status TEXT DEFAULT 'pending', -- pending, migrated, failed
  error_message TEXT,
  migrated_at TIMESTAMPTZ,

  -- Destino
  funnel_id UUID,
  column_id UUID,
  lead_id UUID, -- referência ao lead criado após migração

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cnpj_staging_run ON cnpj_extraction_staging(run_id);
CREATE INDEX IF NOT EXISTS idx_cnpj_staging_workspace ON cnpj_extraction_staging(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cnpj_staging_status ON cnpj_extraction_staging(status);
CREATE INDEX IF NOT EXISTS idx_cnpj_staging_cnpj ON cnpj_extraction_staging(cnpj);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cnpj_staging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cnpj_staging_updated_at ON cnpj_extraction_staging;
CREATE TRIGGER trigger_cnpj_staging_updated_at
  BEFORE UPDATE ON cnpj_extraction_staging
  FOR EACH ROW
  EXECUTE FUNCTION update_cnpj_staging_updated_at();

-- RLS (Row Level Security)
ALTER TABLE cnpj_extraction_staging ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver apenas dados do seu workspace
CREATE POLICY "Users can view own workspace cnpj staging"
  ON cnpj_extraction_staging FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: inserir apenas no próprio workspace
CREATE POLICY "Users can insert to own workspace cnpj staging"
  ON cnpj_extraction_staging FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: atualizar apenas no próprio workspace
CREATE POLICY "Users can update own workspace cnpj staging"
  ON cnpj_extraction_staging FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: service role pode fazer tudo (Edge Functions)
CREATE POLICY "Service role full access to cnpj staging"
  ON cnpj_extraction_staging FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Comentário na tabela
COMMENT ON TABLE cnpj_extraction_staging IS 'Staging de leads extraídos via banco CNPJ antes de migração para tabela leads';

-- -----------------------------------------------------------------------------
-- 3. Criar fila PGMQ para extração CNPJ
-- -----------------------------------------------------------------------------

-- Criar fila se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'cnpj_extraction_queue') THEN
    PERFORM pgmq.create('cnpj_extraction_queue');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Função auxiliar para contar leads por source
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_extraction_counts_by_source(p_workspace_id UUID)
RETURNS TABLE (
  source TEXT,
  total_extractions BIGINT,
  total_runs BIGINT,
  total_leads_extracted BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(le.source, 'google_maps') as source,
    COUNT(DISTINCT le.id) as total_extractions,
    COUNT(DISTINCT ler.id) as total_runs,
    COALESCE(SUM(ler.created_quantity), 0) as total_leads_extracted
  FROM lead_extractions le
  LEFT JOIN lead_extraction_runs ler ON ler.extraction_id = le.id
  WHERE le.workspace_id = p_workspace_id
  GROUP BY COALESCE(le.source, 'google_maps');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 5. Função para obter status de extração CNPJ
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_cnpj_extraction_status(p_run_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'run_id', p_run_id,
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'migrated', COUNT(*) FILTER (WHERE status = 'migrated'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'with_email', COUNT(*) FILTER (WHERE email IS NOT NULL AND email != ''),
    'with_phone', COUNT(*) FILTER (WHERE telefone IS NOT NULL AND telefone != '')
  )
  INTO result
  FROM cnpj_extraction_staging
  WHERE run_id = p_run_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 6. Adicionar coluna filters_json em lead_extractions para CNPJ
-- -----------------------------------------------------------------------------

ALTER TABLE lead_extractions
ADD COLUMN IF NOT EXISTS filters_json JSONB;

COMMENT ON COLUMN lead_extractions.filters_json IS 'Filtros CNPJ em formato JSON (uf, cnae, porte, etc)';

-- -----------------------------------------------------------------------------
-- FIM DA MIGRATION
-- -----------------------------------------------------------------------------
