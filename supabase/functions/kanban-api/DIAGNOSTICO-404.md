# 🔍 Diagnóstico: Erro 404 na Rota /leads

**Data:** 10/12/2025

---

## ❌ Problema

O frontend está recebendo 404 ao chamar:
```
GET /workspaces/:workspaceId/funnels/:funnelId/leads?mode=kanban&limit=10
```

---

## 🔍 Possíveis Causas

### **1. Rota não está sendo registrada corretamente**

A rota está sendo registrada assim:
```typescript
app.route('/workspaces/:workspaceId/funnels/:funnelId/leads', leadsRouter);
```

E dentro do `leadsRouter`:
```typescript
router.get('/', async (c) => {
```

Isso deveria resultar em:
```
/workspaces/:workspaceId/funnels/:funnelId/leads
```

### **2. Middleware bloqueando antes da rota**

Os middlewares estão aplicados assim:
```typescript
app.use('/workspaces/:workspaceId/*', auth);
app.use('/workspaces/:workspaceId/*', workspace);
```

Se o middleware retornar antes de `next()`, a rota nunca será alcançada.

### **3. Ordem das rotas**

No Hono, a ordem das rotas importa. Rotas mais específicas devem vir antes de rotas genéricas.

---

## ✅ Correções Aplicadas

### **1. Logs de Debug Adicionados**

- ✅ Logs no middleware `auth` para verificar se está sendo chamado
- ✅ Logs na rota `/leads` para verificar se está sendo alcançada
- ✅ Logs no `index.ts` para listar rotas registradas

### **2. Verificação de Rotas**

As rotas estão registradas na ordem correta:
1. `/health` (público)
2. Middlewares aplicados em `/workspaces/:workspaceId/*`
3. Rotas específicas registradas

---

## 🧪 Como Testar

### **1. Verificar Logs no Dashboard**

Acesse:
https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/functions/kanban-api/logs

Procure por:
- `[AUTH] Verificando autenticação para:`
- `[LEADS] GET /leads - Iniciando...`
- `[KANBAN-API] Rotas registradas:`

### **2. Testar Manualmente**

```bash
# Obter token (substituir pelo token real)
$token = "SEU_TOKEN_JWT"

# Testar rota
$workspaceId = "47e86ae3-4d5c-4e03-a881-293fa802424d"
$funnelId = "16712ae6-78b5-47d4-9504-b66e84315341"
$url = "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$workspaceId/funnels/$funnelId/leads?mode=kanban&limit=10"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri $url -Method Get -Headers $headers
```

---

## 🔧 Próximos Passos

1. ✅ **Deploy com logs** - Realizado
2. ⏳ **Verificar logs** - Ver se a rota está sendo alcançada
3. ⏳ **Testar manualmente** - Validar se funciona com token correto
4. ⏳ **Ajustar se necessário** - Baseado nos logs

---

## 📝 Notas

- O erro 404 pode ser causado por:
  - Token inválido (middleware retorna antes da rota)
  - Rota não registrada corretamente
  - Problema com matching de rotas no Hono

- Os logs adicionados vão ajudar a identificar onde está o problema.

---

**Status:** 🔍 **AGUARDANDO LOGS PARA DIAGNÓSTICO**

