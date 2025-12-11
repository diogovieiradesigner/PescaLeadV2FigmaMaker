-- =============================================================================
-- MIGRAÇÃO: Adicionar campo run_name à tabela lead_extraction_runs
-- =============================================================================
-- PROBLEMA: Todas as runs da mesma extração aparecem com o mesmo nome no frontend
-- SOLUÇÃO: Adicionar campo run_name para cada run ter seu próprio nome/título
-- =============================================================================

-- Adicionar coluna run_name
ALTER TABLE lead_extraction_runs
ADD COLUMN IF NOT EXISTS run_name TEXT;

-- Criar índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_lead_extraction_runs_run_name 
ON lead_extraction_runs(run_name);

-- Comentário
COMMENT ON COLUMN lead_extraction_runs.run_name IS 
'Nome/título individual da run. Se NULL, será gerado automaticamente baseado em extraction_name + data/hora';

-- Função para gerar nome automático da run
CREATE OR REPLACE FUNCTION generate_extraction_run_name(
  p_extraction_name TEXT,
  p_run_created_at TIMESTAMP WITHOUT TIME ZONE
)
RETURNS TEXT AS $$
DECLARE
  v_formatted_date TEXT;
  v_formatted_time TEXT;
  v_timestamp TIMESTAMP WITHOUT TIME ZONE;
BEGIN
  -- Converter para TIMESTAMP WITHOUT TIME ZONE se necessário
  v_timestamp := p_run_created_at::TIMESTAMP WITHOUT TIME ZONE;
  
  -- Formatar data: DD/MM/YYYY
  v_formatted_date := TO_CHAR(v_timestamp, 'DD/MM/YYYY');
  
  -- Formatar hora: HH24:MI
  v_formatted_time := TO_CHAR(v_timestamp, 'HH24:MI');
  
  -- Retornar: "Nome da Extração - DD/MM/YYYY HH:MI"
  RETURN TRIM(p_extraction_name) || ' - ' || v_formatted_date || ' ' || v_formatted_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_extraction_run_name IS 
'Gera nome automático para run de extração no formato: "Nome da Extração - DD/MM/YYYY HH:MI"';

-- Trigger para gerar nome automaticamente quando run é criada (se run_name for NULL)
CREATE OR REPLACE FUNCTION set_extraction_run_name()
RETURNS TRIGGER AS $$
DECLARE
  v_extraction_name TEXT;
BEGIN
  -- Se run_name já foi definido, não fazer nada
  IF NEW.run_name IS NOT NULL AND NEW.run_name != '' THEN
    RETURN NEW;
  END IF;
  
  -- Buscar extraction_name da config
  SELECT le.extraction_name INTO v_extraction_name
  FROM lead_extractions le
  WHERE le.id = NEW.extraction_id;
  
  -- Gerar nome automático se extraction_name encontrado
  IF v_extraction_name IS NOT NULL THEN
    NEW.run_name := generate_extraction_run_name(
      v_extraction_name,
      COALESCE(NEW.created_at, NOW())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_set_extraction_run_name ON lead_extraction_runs;
CREATE TRIGGER trg_set_extraction_run_name
  BEFORE INSERT ON lead_extraction_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_extraction_run_name();

COMMENT ON TRIGGER trg_set_extraction_run_name ON lead_extraction_runs IS 
'Gera automaticamente run_name quando uma nova run é criada, se não foi definido manualmente';

-- Atualizar runs existentes que não têm nome
UPDATE lead_extraction_runs ler
SET run_name = generate_extraction_run_name(
  le.extraction_name,
  COALESCE(ler.created_at, NOW())::TIMESTAMP WITHOUT TIME ZONE
)
FROM lead_extractions le
WHERE ler.extraction_id = le.id
  AND (ler.run_name IS NULL OR ler.run_name = '');

