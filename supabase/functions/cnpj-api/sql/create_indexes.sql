-- =============================================================================
-- SCRIPT DE CRIAÇÃO DE ÍNDICES - BANCO CNPJ (PostgreSQL Hetzner)
-- =============================================================================
-- Este script deve ser executado no banco de dados CNPJ no servidor Hetzner
-- para otimizar as queries de prospecção.
--
-- IMPORTANTE: Execute com CONCURRENTLY para não bloquear a tabela durante criação
-- ATENÇÃO: Em tabelas com 66 milhões de registros, isso pode levar várias horas!
--
-- Executar como:
-- psql -U user -d cnpj_db -f create_indexes.sql
-- =============================================================================

-- Habilitar extensão pg_trgm para busca textual (se não existir)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- 1. ÍNDICES BÁSICOS (Filtros mais comuns)
-- =============================================================================

-- UF (Estado) - filtro mais usado
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_uf
  ON estabelecimento(uf);

-- Situação cadastral (02=Ativa é o mais filtrado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_situacao
  ON estabelecimento(situacao_cadastral);

-- CNAE fiscal principal (filtro de nicho)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_cnae
  ON estabelecimento(cnae_fiscal_principal);

-- Município (código IBGE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_municipio
  ON estabelecimento(municipio);

-- DDD (filtro por região telefônica)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_ddd
  ON estabelecimento(ddd_1);

-- Data início atividade (filtro de idade da empresa)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_data_inicio
  ON estabelecimento(data_inicio_atividade);

-- Matriz/Filial
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_tipo
  ON estabelecimento(identificador_matriz_filial);

-- =============================================================================
-- 2. ÍNDICES NA TABELA EMPRESA
-- =============================================================================

-- Porte da empresa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_porte
  ON empresa(porte_empresa);

-- Natureza jurídica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_natureza
  ON empresa(natureza_juridica);

-- Capital social (coluna original é texto, precisamos criar coluna numérica)
-- Primeiro, verificar se a coluna já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresa' AND column_name = 'capital_social_numeric'
  ) THEN
    -- Adicionar coluna numérica
    ALTER TABLE empresa ADD COLUMN capital_social_numeric BIGINT;

    -- Popular coluna (capital_social está em formato '1234.56' como texto)
    -- Multiplica por 100 para manter centavos como inteiro
    UPDATE empresa
    SET capital_social_numeric =
      CASE
        WHEN capital_social IS NOT NULL AND capital_social ~ '^[0-9.]+$'
        THEN CAST(REPLACE(capital_social, '.', '') AS BIGINT)
        ELSE NULL
      END;

    RAISE NOTICE 'Coluna capital_social_numeric criada e populada';
  ELSE
    RAISE NOTICE 'Coluna capital_social_numeric já existe';
  END IF;
END $$;

-- Índice na coluna numérica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_capital_numeric
  ON empresa(capital_social_numeric);

-- =============================================================================
-- 3. ÍNDICES NA TABELA SIMPLES
-- =============================================================================

-- Optante do Simples Nacional
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simples_opcao
  ON simples(opcao_pelo_simples);

-- Optante MEI
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simples_mei
  ON simples(opcao_mei);

-- Índice composto Simples + MEI
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simples_opcoes
  ON simples(opcao_pelo_simples, opcao_mei);

-- =============================================================================
-- 4. ÍNDICE COMPOSTO PARA PROSPECÇÃO (Cenário mais comum)
-- =============================================================================
-- Este índice otimiza queries com múltiplos filtros comuns

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prospeccao_composto
  ON estabelecimento(situacao_cadastral, uf, cnae_fiscal_principal)
  INCLUDE (nome_fantasia, correio_eletronico, ddd_1, telefone_1, municipio);

-- =============================================================================
-- 5. ÍNDICES GIN TRIGRAM PARA BUSCA TEXTUAL (ILIKE)
-- =============================================================================
-- Estes índices aceleram buscas com ILIKE '%termo%'

-- Nome fantasia
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_nome_fantasia_trgm
  ON estabelecimento USING GIN (nome_fantasia gin_trgm_ops);

-- Razão social
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_razao_social_trgm
  ON empresa USING GIN (razao_social gin_trgm_ops);

-- =============================================================================
-- 6. ÍNDICES PARCIAIS (Para filtros específicos)
-- =============================================================================

-- Apenas estabelecimentos com email válido
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_com_email
  ON estabelecimento(correio_eletronico)
  WHERE correio_eletronico IS NOT NULL AND correio_eletronico LIKE '%@%';

-- Apenas estabelecimentos ativos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_ativos
  ON estabelecimento(uf, cnae_fiscal_principal)
  WHERE situacao_cadastral = '02';

-- =============================================================================
-- 7. ATUALIZAR ESTATÍSTICAS (CRÍTICO!)
-- =============================================================================
-- ANALYZE atualiza as estatísticas que o query planner usa para escolher
-- o melhor plano de execução. Sem isso, o PostgreSQL pode escolher
-- Seq Scan ao invés de Index Scan!

ANALYZE VERBOSE empresa;
ANALYZE VERBOSE estabelecimento;
ANALYZE VERBOSE simples;
ANALYZE VERBOSE socios;
ANALYZE VERBOSE cnae;
ANALYZE VERBOSE munic;
ANALYZE VERBOSE natju;

-- =============================================================================
-- 8. VERIFICAR ÍNDICES CRIADOS
-- =============================================================================
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
WHERE tablename IN ('estabelecimento', 'empresa', 'simples')
ORDER BY tablename, indexname;

-- =============================================================================
-- 9. TESTAR PERFORMANCE (Executar manualmente após criação dos índices)
-- =============================================================================
/*
-- Query de teste 1: Filtro simples por UF
EXPLAIN ANALYZE
SELECT COUNT(*) FROM estabelecimento WHERE uf = 'SP';
-- Esperado: Index Scan ou Bitmap Index Scan

-- Query de teste 2: Filtro composto de prospecção
EXPLAIN ANALYZE
SELECT est.*, emp.razao_social, emp.capital_social
FROM estabelecimento est
LEFT JOIN empresa emp ON est.cnpj_basico = emp.cnpj_basico
WHERE est.situacao_cadastral = '02'
  AND est.uf = 'SP'
  AND est.cnae_fiscal_principal LIKE '47%'
LIMIT 100;
-- Esperado: Index Scan usando idx_prospeccao_composto

-- Query de teste 3: Busca textual
EXPLAIN ANALYZE
SELECT * FROM estabelecimento
WHERE nome_fantasia ILIKE '%FARMACIA%'
LIMIT 100;
-- Esperado: Bitmap Index Scan usando idx_est_nome_fantasia_trgm
*/
