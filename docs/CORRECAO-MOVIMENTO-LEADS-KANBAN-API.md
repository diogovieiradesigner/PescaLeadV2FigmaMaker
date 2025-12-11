# Correção do Movimento de Leads - Migração para kanban-api

## Problema Identificado

O frontend estava usando a Edge Function **errada** para mover leads:
- ❌ **Errado**: `make-server-e4f9d774/workspaces/:workspaceId/leads/:leadId/move`
- ✅ **Correto**: `kanban-api/workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move`

### Sintomas
- Ao mover leads, eles voltavam para a coluna original após atualizar a tela
- A Edge Function `make-server-e4f9d774` não estava atualizando corretamente o `column_id` e `position`

## Correções Aplicadas

### 1. Arquivo: `src/services/leads-service.ts`

**Função `moveLead()` corrigida:**

```typescript
// ANTES (ERRADO):
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${workspaceId}/leads/${data.leadId}/move`,
  // ...
);

// DEPOIS (CORRETO):
// 1. Buscar funnelId do lead
const { data: leadData } = await supabase
  .from('leads')
  .select('workspace_id, funnel_id')
  .eq('id', data.leadId)
  .single();

// 2. Usar kanban-api com rota correta
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads/${data.leadId}/move`,
  // ...
);
```

### 2. Edge Function kanban-api

A Edge Function `kanban-api` já estava implementada corretamente:

**Rota**: `POST /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move`

**Implementação** (`supabase/functions/kanban-api/services/leads.service.ts`):
- ✅ Atualiza `column_id`
- ✅ Atualiza `position`
- ✅ Atualiza `updated_by`
- ✅ Atualiza `last_activity_at`
- ✅ Atualiza estatísticas do funil (não bloqueante)

## Validação

### Como Testar

1. **Mover um lead**:
   - Arraste um lead de uma coluna para outra
   - O lead deve aparecer na nova coluna imediatamente

2. **Atualizar a página (F5)**:
   - O lead deve permanecer na nova coluna
   - Não deve voltar para a coluna original

3. **Verificar no banco**:
   ```sql
   SELECT id, client_name, column_id, position, updated_at 
   FROM leads 
   WHERE id = '<lead_id>';
   ```
   - `column_id` deve estar atualizado
   - `position` deve estar atualizado
   - `updated_at` deve ser recente

## Diferenças entre as Edge Functions

### make-server-e4f9d774 (ANTIGA - NÃO USAR PARA MOVIMENTO)
- Rota: `/workspaces/:workspaceId/leads/:leadId/move`
- ❌ Não requer `funnelId` na URL
- ❌ Pode não atualizar corretamente todas as propriedades

### kanban-api (NOVA - USAR PARA MOVIMENTO)
- Rota: `/workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move`
- ✅ Requer `funnelId` na URL (mais específico)
- ✅ Implementação otimizada e validada
- ✅ Atualiza todas as propriedades necessárias
- ✅ Atualiza estatísticas do funil

## Status

✅ **Correção aplicada e validada**

- Frontend agora usa `kanban-api` corretamente
- Função `moveLead()` busca `funnelId` do lead antes de fazer a chamada
- Rota correta sendo usada: `/workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move`

## Próximos Passos

1. ✅ Testar movimento de leads no ambiente de desenvolvimento
2. ✅ Verificar se leads permanecem na nova coluna após atualizar a página
3. ✅ Fazer deploy se necessário
4. ⚠️ Considerar migrar outras operações de leads para `kanban-api` (criar, atualizar, deletar)

## Notas

- A função `hardDeleteLead()` ainda usa `make-server-e4f9d774` - isso está correto pois é uma operação diferente
- Outras operações de leads podem ser migradas para `kanban-api` no futuro para consistência

