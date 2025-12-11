# ✅ Correção: Rota /leads Aceita Parâmetros

**Data:** 10/12/2025

---

## 🔧 Problema Identificado

O frontend estava chamando:
```
GET /workspaces/:workspaceId/funnels/:funnelId/leads?mode=kanban&limit=10
```

Mas a rota não aceitava `limit` como parâmetro, causando 404.

---

## ✅ Correção Aplicada

### **1. Rota Atualizada**

A rota `/leads` agora aceita:
- ✅ `limit` (opcional, padrão 10, máximo 100)
- ✅ `mode` (ignorado, mas não causa erro)
- ✅ `hasEmail` (filtro)
- ✅ `hasWhatsapp` (filtro)
- ✅ `searchQuery` (filtro)

### **2. Service Atualizado**

A função `getFunnelLeadsInitial` agora aceita `GetLeadsOptions` completo, permitindo customizar `limit` e `offset`.

---

## 📝 Exemplo de Uso

```typescript
// ✅ Funciona agora
GET /workspaces/:workspaceId/funnels/:funnelId/leads?limit=10&mode=kanban

// ✅ Também funciona
GET /workspaces/:workspaceId/funnels/:funnelId/leads?limit=20

// ✅ Com filtros
GET /workspaces/:workspaceId/funnels/:funnelId/leads?limit=10&hasEmail=true
```

---

## 🚀 Deploy Realizado

✅ **Correção deployada com sucesso!**

A rota agora é compatível com o frontend existente.

---

**Status:** ✅ **CORRIGIDO E DEPLOYADO**

