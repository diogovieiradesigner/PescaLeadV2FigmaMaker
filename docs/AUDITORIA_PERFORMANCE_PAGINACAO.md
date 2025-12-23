# Auditoria de Performance e Paginação - API CNPJ
**Data:** 2025-12-22
**Contexto:** Validação da recomendação de "Implementar paginação por cursor" da auditoria de 17/12/2025.

## 1. Resumo dos Testes

Foram realizados testes de performance na tabela `estabelecimento` simulando paginação profunda com `OFFSET`. A query utilizada filtrou por `uf='SP'` e `situacao_cadastral='02'` (Ativa), um cenário comum de uso.

### Cenários Testados
| Cenário | Página (Limit 100) | Offset | Tempo de Execução | Performance |
|---------|-------------------|--------|-------------------|-------------|
| Início | 1 | 0 | **1.558 ms** | 🟢 Excelente |
| Meio | 1.000 | 100.000 | **478.223 ms** | 🟡 Atenção |
| Fim | 10.000 | 1.000.000 | **5,086.919 ms** | 🔴 Crítico |

### Conclusão dos Testes
A performance degrada linearmente (quase exponencialmente devido ao custo de scan e heap fetches) conforme o `OFFSET` aumenta. Um tempo de resposta de 5 segundos para a página 10.000 é inaceitável para uma API de alta performance, confirmando a necessidade urgente de migração para **Keyset Pagination (Paginação por Cursor)**.

## 2. Análise Técnica

### O Problema do OFFSET
O PostgreSQL implementa `OFFSET` varrendo e descartando as linhas anteriores. Para retornar a linha 1.000.001, ele precisa ler, processar e descartar 1.000.000 linhas.
- **Heap Fetches no Offset 1M:** 75.385 (linhas que precisaram ser buscadas no disco/heap pois não estavam visíveis apenas no índice ou necessitavam de verificação de visibilidade MVCC).

### Índices Disponíveis
A tabela já possui índices que suportam paginação eficiente:
1. `idx_search_uf_situacao_cnae`: Cobre buscas por UF e Situação.
2. `idx_search_data_abertura`: Cobre ordenação por Data de Abertura.
3. `idx_estabelecimento_cnpj_completo`: Cobre unicidade por CNPJ.

## 3. Recomendação de Solução: Keyset Pagination

Substituir a paginação baseada em `OFFSET` por `WHERE` com cursor.

### Exemplo de Implementação

**Query Atual (Lenta):**
```sql
SELECT cnpj_basico, nome_fantasia 
FROM estabelecimento 
WHERE uf = 'SP' AND situacao_cadastral = '02' 
ORDER BY data_inicio_atividade DESC, cnpj_basico DESC
LIMIT 100 OFFSET 1000000;
```

**Query Proposta (Rápida - Cursor):**
```sql
SELECT cnpj_basico, nome_fantasia 
FROM estabelecimento 
WHERE uf = 'SP' AND situacao_cadastral = '02'
  AND (
    (data_inicio_atividade < '2023-01-01') OR 
    (data_inicio_atividade = '2023-01-01' AND cnpj_basico < '12345678')
  )
ORDER BY data_inicio_atividade DESC, cnpj_basico DESC
LIMIT 100;
```

### Próximos Passos
1. **Frontend:** Adaptar componente de tabela para suportar paginação "Carregar Mais" ou "Próxima Página" usando o token/cursor retornado pela API.
2. **Backend (API):**
    - Receber parâmetro `cursor` (base64 de `last_sort_value,last_id`).
    - Modificar queries para usar condições `WHERE` baseadas no cursor.
    - Retornar `next_cursor` na resposta.

## 4. Outras Pendências (Rate Limiting)
Confirmamos via análise de código (`supabase/functions/cnpj-api/index.ts`) que **não há implementação de Rate Limiting**. A API depende apenas da autenticação JWT.
- **Risco:** Um usuário autenticado pode fazer scraping massivo e degradar a performance do banco para outros usuários.
- **Recomendação:** Implementar Rate Limiting usando Redis (Upstash) ou tabela de controle no Postgres (menos performático mas funcional para MVP).

## 5. Status Final
- [x] Testes de performance de paginação executados.
- [x] Problema confirmado com dados reais.
- [ ] Implementação de Keyset Pagination (Pendente).
- [ ] Implementação de Rate Limiting (Pendente).
