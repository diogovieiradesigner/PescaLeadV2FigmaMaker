# ✅ Correção: Rota `/columns/:columnId/leads` não encontrada

## 🔍 Problema Identificado

**Erro:** `404 Route not found` ao chamar:
```
GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads
```

### **Causa Raiz:**
A rota `/columns/:columnId/leads` estava definida no **router de leads**, mas o frontend estava chamando através do **router de columns**.

### **Estrutura de Rotas:**
- Router de columns montado em: `/workspaces/:workspaceId/funnels/:funnelId/columns`
- Router de leads montado em: `/workspaces/:workspaceId/funnels/:funnelId/leads`
- Frontend chamava: `/workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads`

## 🔧 Correção Aplicada

**Arquivo:** `supabase/functions/kanban-api/routes/columns.ts`

### **Mudanças:**
1. ✅ Adicionada rota `/columns/:columnId/leads` no router de columns
2. ✅ Rota posicionada **ANTES** de `/:columnId` para evitar conflito
3. ✅ Importado `getColumnLeads` do service de leads
4. ✅ Suporte completo a paginação e filtros

### **Código Adicionado:**
```typescript
// GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads
// Busca leads de uma coluna específica com paginação e filtros
// IMPORTANTE: Esta rota deve vir ANTES de /:columnId para evitar conflito
router.get('/:columnId/leads', async (c) => {
  // ... implementação completa com paginação e filtros
});
```

## ✅ Resultado

Agora a rota está no lugar correto e funciona quando o frontend chama:
```
GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads?limit=10&offset=10
```

## 📝 Nota

A rota também permanece no router de leads (`/leads/columns/:columnId/leads`) para compatibilidade, mas a rota principal agora está no router de columns, que é semanticamente mais correto.

---

**Status:** ✅ Corrigido e deployado!

