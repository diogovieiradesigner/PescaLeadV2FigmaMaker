# Índices Otimizados para o Banco de Dados CNPJ

Este documento descreve os índices otimizados criados para melhorar o desempenho das consultas mais comuns na API de prospecção de empresas.

## Índices Compostos para Prospecção

### 1. idx_est_situacao_uf_cnae
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_situacao_uf_cnae
  ON estabelecimento(situacao_cadastral, uf, cnae_fiscal_principal)
  INCLUDE (nome_fantasia, correio_eletronico, ddd_1, telefone_1, municipio, cnpj_basico, cnpj_ordem, cnpj_dv, data_inicio_atividade);
```
**Propósito**: Otimiza a combinação mais comum de filtros para prospecção:
- situação_cadastral (empresas ativas)
- uf (estado)
- cnae_fiscal_principal (atividade econômica)

**Benefícios**:
- Inclui campos frequentemente selecionados para evitar acessos adicionais à tabela
- Permite consultas rápidas para prospecção por nicho em estados específicos

### 2. idx_est_situacao_uf_municipio
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_situacao_uf_municipio
  ON estabelecimento(situacao_cadastral, uf, municipio)
  INCLUDE (nome_fantasia, correio_eletronico, ddd_1, telefone_1, cnae_fiscal_principal, cnpj_basico, cnpj_ordem, cnpj_dv, data_inicio_atividade);
```
**Propósito**: Otimiza a prospecção por região específica:
- situação_cadastral (empresas ativas)
- uf (estado)
- municipio (cidade)

**Benefícios**:
- Ideal para campanhas geolocalizadas
- Inclui dados de contato para campanhas de marketing direto

### 3. idx_simples_opcoes_completas
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simples_opcoes_completas
  ON simples(opcao_pelo_simples, opcao_mei)
  INCLUDE (cnpj_basico, data_opcao_simples, data_exclusao_simples, data_opcao_mei, data_exclusao_mei);
```
**Propósito**: Otimiza filtros por regime tributário:
- opcao_pelo_simples (optante do Simples Nacional)
- opcao_mei (optante pelo MEI)

**Benefícios**:
- Permite segmentação de empresas por regime tributário
- Inclui datas para análise temporal

### 4. idx_emp_porte_capital
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_porte_capital
  ON empresa(porte_empresa, capital_social_numeric)
  INCLUDE (cnpj_basico, razao_social, natureza_juridica);
```
**Propósito**: Otimiza filtros por porte e capital social:
- porte_empresa (micro, pequena, média, grande)
- capital_social_numeric (capital social formatado como número)

**Benefícios**:
- Permite segmentação por tamanho e poder econômico
- Inclui dados identificadores da empresa

## Índices para Filtros de Contato

### 5. idx_est_contato_completo
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_contato_completo
  ON estabelecimento(correio_eletronico, telefone_1)
  WHERE correio_eletronico IS NOT NULL AND correio_eletronico != '' AND telefone_1 IS NOT NULL AND telefone_1 != '';
```
**Propósito**: Encontra empresas com dados de contato completos:
- correio_eletronico (email)
- telefone_1 (telefone principal)

**Benefícios**:
- Índice parcial que só indexa registros válidos
- Ideal para campanhas multicanal (email + telefone)

### 6. idx_est_com_email_valido
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_com_email_valido
  ON estabelecimento(correio_eletronico)
  WHERE correio_eletronico IS NOT NULL AND correio_eletronico != '' AND correio_eletronico LIKE '%@%';
```
**Propósito**: Encontra empresas com email válido:
- correio_eletronico (email)

**Benefícios**:
- Índice parcial que só indexa emails válidos
- Ideal para campanhas de email marketing

### 7. idx_est_com_telefone
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_est_com_telefone
  ON estabelecimento(telefone_1)
  WHERE telefone_1 IS NOT NULL AND telefone_1 != '';
```
**Propósito**: Encontra empresas com telefone:
- telefone_1 (telefone principal)

**Benefícios**:
- Índice parcial que só indexa telefones válidos
- Ideal para campanhas de telemarketing

## Índices Parciais para Segmentação

### 8. idx_emp_porte_micro
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_porte_micro
  ON empresa(porte_empresa)
  WHERE porte_empresa = '01';
```
**Propósito**: Segmenta Micro Empresas (MEI):
- porte_empresa = '01' (Micro Empresa)

**Benefícios**:
- Índice parcial otimizado para segmento específico
- Melhora desempenho em consultas específicas

### 9. idx_emp_porte_pequeno
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emp_porte_pequeno
  ON empresa(porte_empresa)
  WHERE porte_empresa = '03';
```
**Propósito**: Segmenta Empresas de Pequeno Porte:
- porte_empresa = '03' (Empresa de Pequeno Porte)

**Benefícios**:
- Índice parcial otimizado para segmento específico
- Melhora desempenho em consultas específicas

### 10. idx_simples_mei_ativo
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simples_mei_ativo
  ON simples(opcao_mei)
  WHERE opcao_mei = 'S';
```
**Propósito**: Segmenta empresas MEI ativas:
- opcao_mei = 'S' (optante MEI)

**Benefícios**:
- Índice parcial otimizado para MEIs
- Melhora desempenho em consultas específicas

### 11. idx_simples_opcao_ativo
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simples_opcao_ativo
  ON simples(opcao_pelo_simples)
  WHERE opcao_pelo_simples = 'S';
```
**Propósito**: Segmenta empresas optantes do Simples Nacional:
- opcao_pelo_simples = 'S' (optante Simples)

**Benefícios**:
- Índice parcial otimizado para empresas do Simples
- Melhora desempenho em consultas específicas

## Considerações de Performance

### Impacto Positivo
1. **Consultas Otimizadas**: Os índices compostos aceleram significativamente as consultas mais comuns
2. **Índices Parciais**: Reduzem o tamanho do índice e melhoram a performance em filtros específicos
3. **INCLUDE**: Evita acessos adicionais à tabela principal ao incluir campos frequentemente selecionados

### Impacto Negativo Mínimo
1. **Inserções/Atualizações**: Os índices podem impactar ligeiramente o desempenho de inserções, mas isso é aceitável para um banco de dados de leitura
2. **Espaço em Disco**: Os índices consomem espaço adicional, mas o benefício em performance justifica o custo
3. **Manutenção**: Os índices são criados com CONCURRENTLY para evitar bloqueios durante a criação

## Recomendações

1. **Monitoramento**: Monitore o uso dos índices regularmente usando `pg_stat_user_indexes`
2. **Atualização de Estatísticas**: Execute `ANALYZE` regularmente para manter o query planner atualizado
3. **Revisão Periódica**: Revise os índices periodicamente para remover os que não estão sendo utilizados
4. **Testes de Performance**: Execute os testes de performance incluídos no script após qualquer modificação