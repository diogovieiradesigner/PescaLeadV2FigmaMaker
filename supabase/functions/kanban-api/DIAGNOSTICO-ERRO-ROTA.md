# 🔍 Diagnóstico: Erro "Route not found"

## ❌ Erro Reportado

```
❌ [FUNNELS SERVICE] Erro ao carregar leads: Error: Route not found
❌ [KANBAN] Failed to load more leads: Error: Route not found
```

## 🔍 Possíveis Causas

### **1. URL Incorreta no Frontend**

O frontend pode estar chamando uma URL incorreta. Verificar se está usando:

**✅ URL Correta:**
```
GET /kanban-api/workspaces/{workspaceId}/funnels/{funnelId}/leads?limit=10
```

**❌ URLs Incorretas (comuns):**
```
GET /kanban-api/workspaces/{workspaceId}/funnels/{funnelId}/leads/columns/{columnId}/leads
GET /kanban-api/funnels/{funnelId}/leads
GET /workspaces/{workspaceId}/funnels/{funnelId}/leads
```

### **2. Path não está sendo corrigido**

O handler principal (`index.ts`) remove `/kanban-api` do path, mas pode haver problemas se:
- O frontend não está incluindo `/kanban-api` no path
- O Supabase está adicionando o prefixo duas vezes

### **3. Rota não registrada corretamente**

Verificar se a rota está sendo registrada:
```typescript
// index.ts linha 57
app.route('/workspaces/:workspaceId/funnels/:funnelId/leads', leadsRouter);
```

E se o router tem a rota:
```typescript
// routes/leads.ts linha 30
router.get('/', async (c) => { ... });
```

## ✅ Solução

### **1. Verificar URL no Frontend**

O frontend deve chamar:
```typescript
const response = await fetch(
  `/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads?limit=10`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);
```

### **2. Verificar Logs da Edge Function**

Os logs devem mostrar:
```
[PATH-FIX] Path corrigido: /kanban-api/workspaces/... -> /workspaces/...
[LEADS] GET /leads - Iniciando...
```

### **3. Testar Rota Diretamente**

```bash
curl -X GET \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/{workspaceId}/funnels/{funnelId}/leads?limit=10" \
  -H "Authorization: Bearer {token}"
```

## 📝 Checklist de Debug

- [ ] Frontend está usando `/kanban-api` no path?
- [ ] Frontend está passando `workspaceId` e `funnelId` corretos?
- [ ] Token de autenticação está sendo enviado?
- [ ] Logs da Edge Function mostram a requisição chegando?
- [ ] Rota catch-all está retornando 404 com path detalhado?

## 🔧 Próximos Passos

1. Verificar logs da Edge Function no Supabase Dashboard
2. Verificar URL exata que o frontend está chamando
3. Testar rota diretamente com curl/Postman
4. Verificar se o middleware de autenticação está bloqueando a requisição

