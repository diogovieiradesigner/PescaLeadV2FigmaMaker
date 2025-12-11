# Análise e Correção: Migração do Kanban para kanban-api

## 📋 Resumo

Análise completa do código do kanban para identificar e corrigir todas as chamadas que ainda usavam a Edge Function errada (`make-server-e4f9d774`) em vez da `kanban-api`.

---

## ✅ Correções Aplicadas

### 1. **Função `moveLead()` - `src/services/leads-service.ts`**
**Status:** ✅ **JÁ CORRIGIDO** (correção anterior)

- **Antes:** `make-server-e4f9d774/workspaces/:workspaceId/leads/:leadId/move`
- **Depois:** `kanban-api/workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move`
- **Mudança:** Agora busca `funnelId` do lead antes de fazer a chamada

---

### 2. **Função `updateFunnel()` - `src/services/funnels-service.ts`**
**Status:** ✅ **CORRIGIDO**

**Linha 499:**
```typescript
// ❌ ANTES
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${workspaceId}/funnels/${funnelId}`,
  // ...
);

// ✅ DEPOIS
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}`,
  // ...
);
```

**Rota na kanban-api:**
- `PUT /workspaces/:workspaceId/funnels/:funnelId`
- Implementada em `supabase/functions/kanban-api/routes/funnels.ts` (linha 68)

---

### 3. **Função `hardDeleteLead()` - `src/services/leads-service.ts`**
**Status:** ✅ **CORRIGIDO**

**Linha 1090:**
```typescript
// ❌ ANTES
const { data: leadData } = await supabase
  .from('leads')
  .select('workspace_id')
  .eq('id', leadId)
  .single();

const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/workspaces/${workspaceId}/leads/${leadId}`,
  // ...
);

// ✅ DEPOIS
const { data: leadData } = await supabase
  .from('leads')
  .select('workspace_id, funnel_id')  // ✅ Buscar funnelId também
  .eq('id', leadId)
  .single();

const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}`,
  // ...
);
```

**Rota na kanban-api:**
- `DELETE /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId`
- Implementada em `supabase/functions/kanban-api/routes/leads.ts` (linha 270)

---

## 📊 Status das Operações do Kanban

### ✅ **Operações Corrigidas (usando kanban-api)**

| Operação | Função | Arquivo | Status |
|----------|--------|---------|--------|
| Mover lead | `moveLead()` | `leads-service.ts` | ✅ Corrigido |
| Atualizar funil | `updateFunnel()` | `funnels-service.ts` | ✅ Corrigido |
| Deletar lead | `hardDeleteLead()` | `leads-service.ts` | ✅ Corrigido |
| Carregar leads | `getLeadsByColumn()` | `funnels-service.ts` | ✅ Já usava kanban-api |
| Carregar todas colunas | `getAllColumnsLeads()` | `funnels-service.ts` | ✅ Já usava kanban-api |
| Carregar funnel inicial | `loadFunnel()` | `useKanbanData.ts` | ✅ Já usava kanban-api |

---

## 🔍 Arquivos Verificados

### ✅ **Já usando kanban-api corretamente:**
- `src/hooks/useKanbanData.ts` - Carregamento inicial e refetch
- `src/services/funnels-service.ts` - `getLeadsByColumn()`, `getAllColumnsLeads()`

### ✅ **Corrigidos nesta análise:**
- `src/services/funnels-service.ts` - `updateFunnel()`
- `src/services/leads-service.ts` - `hardDeleteLead()`

### ⚠️ **Arquivo não utilizado:**
- `src/utils/kanban-api.ts` - **NÃO está sendo importado em nenhum lugar**
  - Este arquivo ainda usa `make-server-e4f9d774`
  - Pode ser removido ou atualizado no futuro se necessário

---

## 🎯 Rotas da kanban-api Disponíveis

### **Funnels**
- ✅ `GET /workspaces/:workspaceId/funnels` - Listar funis
- ✅ `GET /workspaces/:workspaceId/funnels/:funnelId` - Buscar funil
- ✅ `POST /workspaces/:workspaceId/funnels` - Criar funil
- ✅ `PUT /workspaces/:workspaceId/funnels/:funnelId` - Atualizar funil
- ✅ `DELETE /workspaces/:workspaceId/funnels/:funnelId` - Deletar funil

### **Leads**
- ✅ `GET /workspaces/:workspaceId/funnels/:funnelId/leads` - Listar leads (todas colunas)
- ✅ `GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads` - Leads de uma coluna
- ✅ `GET /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId` - Buscar lead
- ✅ `POST /workspaces/:workspaceId/funnels/:funnelId/leads` - Criar lead
- ✅ `PUT /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId` - Atualizar lead
- ✅ `POST /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move` - Mover lead
- ✅ `POST /workspaces/:workspaceId/funnels/:funnelId/leads/batch-move` - Mover múltiplos leads
- ✅ `DELETE /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId` - Deletar lead

### **Stats**
- ✅ `GET /workspaces/:workspaceId/funnels/:funnelId/stats` - Estatísticas do funil

---

## 📝 Notas Importantes

1. **Todas as operações do kanban agora usam `kanban-api`** ✅
2. **A rota da `kanban-api` requer `funnelId` na URL** - Isso é mais específico e correto
3. **O arquivo `src/utils/kanban-api.ts` não está sendo usado** - Pode ser removido no futuro
4. **Operações de chat/conversas ainda usam `make-server-e4f9d774`** - Isso está correto, pois não são operações do kanban

---

## ✅ Validação

### Como Testar

1. **Mover lead:**
   - Arraste um lead entre colunas
   - Atualize a página (F5)
   - Lead deve permanecer na nova coluna

2. **Atualizar funil:**
   - Edite nome ou colunas do funil
   - Mudanças devem persistir após atualizar

3. **Deletar lead:**
   - Delete um lead do kanban
   - Lead deve ser removido permanentemente

---

## 🎉 Resultado Final

**Todas as operações do kanban agora usam a Edge Function correta (`kanban-api`)** ✅

- ✅ Movimento de leads
- ✅ Atualização de funis
- ✅ Deleção de leads
- ✅ Carregamento de dados

**Status:** ✅ **MIGRAÇÃO COMPLETA**

