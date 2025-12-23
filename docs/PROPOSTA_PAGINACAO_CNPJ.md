# Proposta de Paginação e Continuidade - Extração CNPJ

**Data:** 2025-12-22
**Status:** Proposta Técnica

## 1. Objetivo
Implementar a funcionalidade de "continuar de onde parou" para extrações de CNPJ, similar ao sistema de extração do Instagram. Isso permite que o usuário pause e retome extrações ou faça extrações em lotes menores sem perder o progresso ou repetir leads.

## 2. Problema Atual
Atualmente, toda nova extração inicia do `OFFSET 0`. Se o usuário quiser extrair 10.000 leads de um filtro que tem 50.000 resultados, ele consegue os primeiros 10.000. Se tentar extrair novamente com o mesmo filtro, receberá os mesmos 10.000 leads (duplicados), desperdiçando recursos e tempo.

## 3. Solução Proposta (Baseada no Instagram)

A solução consiste em persistir o progresso da busca no banco de dados, associado a um hash único dos filtros utilizados.

### 3.1. Nova Tabela de Controle
Criar tabela `cnpj_search_progress` (já preparada na migration `supabase/migrations/20251222_cnpj_pagination.sql`):

```sql
CREATE TABLE public.cnpj_search_progress (
    workspace_id UUID,
    filters_hash TEXT, -- Hash SHA256 dos filtros (UF+CNAE+etc)
    last_offset INTEGER, -- Onde parou (ex: 10000)
    total_extracted INTEGER, -- Total já extraído
    ...
);
```

### 3.2. Fluxo de Execução (`start-cnpj-extraction`)

1.  **Receber Filtros:** A Edge Function recebe os filtros da campanha.
2.  **Calcular Hash:** Gera um hash SHA256 dos filtros normalizados (ex: `sha256(json_encode(filters))`).
3.  **Consultar Progresso:** Verifica se já existe progresso para este hash no workspace.
    *   **Se existir:** Recupera `last_offset`. A nova busca começa de `last_offset`.
    *   **Se não existir:** Começa de `offset = 0`.
4.  **Executar Busca:** Chama a `cnpj-api/search` com `offset` calculado.
5.  **Atualizar Progresso:** Ao final do sucesso (inserção no staging), atualiza o `last_offset` incrementando a quantidade retornada.

### 3.3. Exemplo Prático

**Cenário:** Extrair restaurantes em SP (Total: 50.000).

1.  **Rodada 1:** Usuário pede 1.000 leads.
    *   Hash: `abc123...`
    *   Start Offset: 0
    *   Busca: OFFSET 0, LIMIT 1000
    *   Resultado: Retorna 1.000 leads.
    *   Update: `last_offset` = 1000.

2.  **Rodada 2:** Usuário pede mais 1.000 leads (mesmos filtros).
    *   Hash: `abc123...` (mesmo hash)
    *   Start Offset: 1000 (recuperado do banco)
    *   Busca: OFFSET 1000, LIMIT 1000
    *   Resultado: Retorna os PRÓXIMOS 1.000 leads (1001-2000).
    *   Update: `last_offset` = 2000.

## 4. Considerações de Performance (Alerta)

Embora esta solução resolva o problema funcional (evitar duplicatas e permitir continuação), ela **NÃO RESOLVE** o problema de performance do banco de dados com `OFFSET` alto (identificado na auditoria).

*   **Páginas Iniciais (Offset < 100k):** Rápido (< 500ms).
*   **Páginas Profundas (Offset > 1M):** Lento (> 5s).

Como a maioria das extrações foca nos primeiros milhares de resultados, esta solução é aceitável para o MVP e alinha a experiência com a do Instagram. Para volumes massivos (> 1 milhão), a recomendação de **Keyset Pagination** (cursor técnico) continua válida para o futuro.

## 5. Implementação Necessária

1.  [x] Criar migration SQL para tabela e funções RPC.
2.  [ ] Atualizar `supabase/functions/start-cnpj-extraction/index.ts` para usar a lógica de progresso.
3.  [ ] (Opcional) Adicionar opção "Reiniciar Busca" no frontend para forçar offset 0.
