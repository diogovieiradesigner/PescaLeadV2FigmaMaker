-- =============================================================================
-- SCRIPT DE OTIMIZAÇÃO DE ÍNDICES - CNPJ API
-- Data: 2025-12-17
-- Executar via: psql -U postgres -d Dados_RFB -f optimize_indexes.sql
-- Ou copiar/colar no terminal do container PostgreSQL no Portainer
-- =============================================================================

-- Mostrar estado inicial
\echo '=============================================='
\echo 'ESTADO INICIAL DOS ÍNDICES'
\echo '=============================================='

SELECT
    indexname as indice,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as tamanho
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC
LIMIT 20;

\echo ''
\echo 'Espaço total em índices ANTES:'
SELECT pg_size_pretty(sum(pg_relation_size(indexname::regclass))) as total_indices
FROM pg_indexes WHERE schemaname = 'public';

-- =============================================================================
-- FASE 1: DROPAR ÍNDICES NÃO UTILIZADOS (~7GB)
-- =============================================================================
\echo ''
\echo '=============================================='
\echo 'FASE 1: DROPANDO ÍNDICES NÃO UTILIZADOS'
\echo '=============================================='

\echo 'Dropando idx_prospeccao_composto (5.4GB)...'
DROP INDEX IF EXISTS idx_prospeccao_composto;

\echo 'Dropando idx_est_ddd (439MB)...'
DROP INDEX IF EXISTS idx_est_ddd;

\echo 'Dropando idx_est_situacao (439MB)...'
DROP INDEX IF EXISTS idx_est_situacao;

\echo 'Dropando idx_est_tipo (439MB)...'
DROP INDEX IF EXISTS idx_est_tipo;

\echo 'Dropando idx_emp_porte (418MB)...'
DROP INDEX IF EXISTS idx_emp_porte;

\echo 'Dropando idx_emp_natureza (se existir)...'
DROP INDEX IF EXISTS idx_emp_natureza;

\echo 'Dropando idx_est_uf (se existir - vai ser substituído)...'
DROP INDEX IF EXISTS idx_est_uf;

\echo ''
\echo 'Índices dropados com sucesso!'

-- =============================================================================
-- FASE 2: VACUUM PARA RECUPERAR ESPAÇO
-- =============================================================================
\echo ''
\echo '=============================================='
\echo 'FASE 2: VACUUM (pode demorar alguns minutos)'
\echo '=============================================='

\echo 'Executando VACUUM na tabela estabelecimento...'
VACUUM estabelecimento;

\echo 'Executando VACUUM na tabela empresa...'
VACUUM empresa;

\echo 'VACUUM concluído!'

-- =============================================================================
-- FASE 3: CRIAR NOVOS ÍNDICES OTIMIZADOS
-- =============================================================================
\echo ''
\echo '=============================================='
\echo 'FASE 3: CRIANDO NOVOS ÍNDICES OTIMIZADOS'
\echo '=============================================='

-- Índice principal para prospecção (UF + Situação + CNAE)
-- Cobre os filtros mais comuns da API /search
\echo 'Criando idx_search_uf_situacao_cnae (pode demorar ~10-15 min)...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_uf_situacao_cnae
ON estabelecimento (uf, situacao_cadastral, cnae_fiscal_principal)
INCLUDE (cnpj_basico, cnpj_ordem, cnpj_dv, nome_fantasia, correio_eletronico, ddd_1, telefone_1, municipio, data_inicio_atividade);

\echo 'idx_search_uf_situacao_cnae criado!'

-- Índice para filtro por DDD (prospecção por região)
\echo 'Criando idx_search_ddd...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_ddd
ON estabelecimento (ddd_1)
WHERE ddd_1 IS NOT NULL AND ddd_1 != '';

\echo 'idx_search_ddd criado!'

-- Índice parcial para empresas com email (muito usado em prospecção)
\echo 'Criando idx_search_com_email...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_com_email
ON estabelecimento (uf, situacao_cadastral)
WHERE correio_eletronico IS NOT NULL AND correio_eletronico LIKE '%@%';

\echo 'idx_search_com_email criado!'

-- Índice para filtro por município
\echo 'Criando idx_search_municipio...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_municipio
ON estabelecimento (municipio, uf)
WHERE situacao_cadastral = '02';

\echo 'idx_search_municipio criado!'

-- Índice para ordenação por data de abertura (muito usado)
\echo 'Criando idx_search_data_abertura...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_data_abertura
ON estabelecimento (data_inicio_atividade DESC)
WHERE situacao_cadastral = '02';

\echo 'idx_search_data_abertura criado!'

-- =============================================================================
-- FASE 4: ANALYZE PARA ATUALIZAR ESTATÍSTICAS
-- =============================================================================
\echo ''
\echo '=============================================='
\echo 'FASE 4: ANALYZE (atualizando estatísticas)'
\echo '=============================================='

\echo 'Analisando estabelecimento...'
ANALYZE estabelecimento;

\echo 'Analisando empresa...'
ANALYZE empresa;

\echo 'Analisando simples...'
ANALYZE simples;

\echo 'Analisando socios...'
ANALYZE socios;

\echo 'ANALYZE concluído!'

-- =============================================================================
-- VERIFICAÇÃO FINAL
-- =============================================================================
\echo ''
\echo '=============================================='
\echo 'VERIFICAÇÃO FINAL'
\echo '=============================================='

\echo 'Novos índices criados:'
SELECT
    indexname as indice,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as tamanho
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_search_%'
ORDER BY pg_relation_size(indexname::regclass) DESC;

\echo ''
\echo 'Espaço total em índices DEPOIS:'
SELECT pg_size_pretty(sum(pg_relation_size(indexname::regclass))) as total_indices
FROM pg_indexes WHERE schemaname = 'public';

\echo ''
\echo 'TOP 15 índices por tamanho:'
SELECT
    indexname as indice,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as tamanho,
    idx_scan as vezes_usado
FROM pg_indexes i
JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
WHERE i.schemaname = 'public'
ORDER BY pg_relation_size(i.indexname::regclass) DESC
LIMIT 15;

\echo ''
\echo '=============================================='
\echo 'OTIMIZAÇÃO CONCLUÍDA COM SUCESSO!'
\echo '=============================================='
