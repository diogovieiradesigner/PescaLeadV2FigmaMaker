-- =============================================================================
-- SCRIPT DE OTIMIZAÇÃO - VERSÃO PARA TERMINAL DOCKER
-- Executar no terminal do container PostgreSQL via Portainer:
-- psql -U postgres -d Dados_RFB
-- Depois cole este script ou use: \i /path/to/optimize_indexes_simple.sql
-- =============================================================================

-- VERIFICAR ESTADO INICIAL
SELECT 'ESTADO INICIAL' as fase;
SELECT pg_size_pretty(sum(pg_relation_size(indexname::regclass))) as espaco_total_indices
FROM pg_indexes WHERE schemaname = 'public';

-- =============================================================================
-- FASE 1: DROPAR ÍNDICES NÃO UTILIZADOS (~7GB)
-- =============================================================================
SELECT 'FASE 1: DROPANDO ÍNDICES' as fase;

DROP INDEX IF EXISTS idx_prospeccao_composto;
DROP INDEX IF EXISTS idx_est_ddd;
DROP INDEX IF EXISTS idx_est_situacao;
DROP INDEX IF EXISTS idx_est_tipo;
DROP INDEX IF EXISTS idx_emp_porte;
DROP INDEX IF EXISTS idx_emp_natureza;
DROP INDEX IF EXISTS idx_est_uf;

SELECT 'Índices dropados!' as status;

-- =============================================================================
-- FASE 2: VACUUM
-- =============================================================================
SELECT 'FASE 2: VACUUM' as fase;

VACUUM estabelecimento;
VACUUM empresa;

SELECT 'VACUUM concluído!' as status;

-- =============================================================================
-- FASE 3: CRIAR NOVOS ÍNDICES (pode demorar 15-30 minutos)
-- =============================================================================
SELECT 'FASE 3: CRIANDO ÍNDICES (aguarde...)' as fase;

-- Índice principal para prospecção
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_uf_situacao_cnae
ON estabelecimento (uf, situacao_cadastral, cnae_fiscal_principal)
INCLUDE (cnpj_basico, cnpj_ordem, cnpj_dv, nome_fantasia, correio_eletronico, ddd_1, telefone_1, municipio, data_inicio_atividade);

SELECT 'idx_search_uf_situacao_cnae criado!' as status;

-- Índice para DDD
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_ddd
ON estabelecimento (ddd_1)
WHERE ddd_1 IS NOT NULL AND ddd_1 != '';

SELECT 'idx_search_ddd criado!' as status;

-- Índice parcial para empresas com email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_com_email
ON estabelecimento (uf, situacao_cadastral)
WHERE correio_eletronico IS NOT NULL AND correio_eletronico LIKE '%@%';

SELECT 'idx_search_com_email criado!' as status;

-- Índice para município
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_municipio
ON estabelecimento (municipio, uf)
WHERE situacao_cadastral = '02';

SELECT 'idx_search_municipio criado!' as status;

-- Índice para ordenação por data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_data_abertura
ON estabelecimento (data_inicio_atividade DESC)
WHERE situacao_cadastral = '02';

SELECT 'idx_search_data_abertura criado!' as status;

-- =============================================================================
-- FASE 4: ANALYZE
-- =============================================================================
SELECT 'FASE 4: ANALYZE' as fase;

ANALYZE estabelecimento;
ANALYZE empresa;
ANALYZE simples;
ANALYZE socios;

SELECT 'ANALYZE concluído!' as status;

-- =============================================================================
-- VERIFICAÇÃO FINAL
-- =============================================================================
SELECT 'VERIFICAÇÃO FINAL' as fase;

SELECT pg_size_pretty(sum(pg_relation_size(indexname::regclass))) as espaco_total_indices_depois
FROM pg_indexes WHERE schemaname = 'public';

SELECT
    indexname as indice,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as tamanho
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 15;

SELECT 'OTIMIZAÇÃO CONCLUÍDA!' as status;
