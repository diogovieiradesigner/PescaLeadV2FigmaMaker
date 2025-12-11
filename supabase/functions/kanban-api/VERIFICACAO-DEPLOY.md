# ✅ Verificação de Deploy - Kanban API

**Data:** 10/12/2025

---

## 🚀 Status do Deploy

✅ **Edge Function `kanban-api` deployada com sucesso!**

**Deploy realizado em:** 10/12/2025

**URL Base:**
```
https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api
```

---

## 📋 Arquivos Deployados

Todos os arquivos foram enviados com sucesso:

- ✅ `index.ts` - Entry point
- ✅ `deno.json` - Configuração
- ✅ `middleware/auth.ts` - Autenticação
- ✅ `middleware/workspace.ts` - Validação workspace
- ✅ `database/client.ts` - Cliente Supabase
- ✅ `routes/*.ts` - Todas as rotas
- ✅ `services/*.ts` - Todos os services
- ✅ `types.ts` - Tipos TypeScript

---

## 🔍 Verificação no Dashboard

Acesse o dashboard do Supabase para verificar:

**URL:**
https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/functions

**Verificar:**
- [ ] Função `kanban-api` aparece na lista
- [ ] Status: "Active" ou "Deployed"
- [ ] Última atualização: Hoje

---

## 🧪 Teste Manual

### **1. Testar com cURL (PowerShell)**

```powershell
# Obter token (substituir pelo token real)
$token = "SEU_TOKEN_JWT"

# Testar buscar funis
$workspaceId = "47e86ae3-4d5c-4e03-a881-293fa802424d"
$url = "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$workspaceId/funnels"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri $url -Method Get -Headers $headers
```

### **2. Testar no Console do Navegador**

```javascript
// No console do navegador (com usuário logado)
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

const workspaceId = '47e86ae3-4d5c-4e03-a881-293fa802424d';
const url = `https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels`;

fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## ⚠️ Se Ainda Estiver Dando 404

### **1. Verificar URL no Frontend**

Certifique-se de que o frontend está usando:
```typescript
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api';
```

**NÃO:**
```typescript
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/make-server-e4f9d774'; // ❌ ERRADO
```

### **2. Verificar Estrutura de Rotas**

Certifique-se de que está usando o padrão correto:
```typescript
// ✅ CORRETO
GET /workspaces/:workspaceId/funnels

// ❌ ERRADO
GET /funnels
```

### **3. Verificar Autenticação**

Certifique-se de que está enviando o token:
```typescript
headers: {
  'Authorization': `Bearer ${token}`, // ✅ OBRIGATÓRIO
  'Content-Type': 'application/json'
}
```

### **4. Aguardar Propagação**

Após o deploy, pode levar alguns segundos para a função ficar disponível. Aguarde 10-30 segundos e tente novamente.

---

## 📊 Logs da Função

Para ver os logs em tempo real:

```bash
supabase functions logs kanban-api --follow
```

Ou no Dashboard:
https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/functions/kanban-api/logs

---

## ✅ Checklist Final

- [x] ✅ Função deployada
- [ ] ⏳ Frontend atualizado para usar `/kanban-api`
- [ ] ⏳ Token sendo enviado corretamente
- [ ] ⏳ Estrutura de rotas correta
- [ ] ⏳ Teste manual funcionando

---

**Status:** ✅ **DEPLOY CONCLUÍDO - Aguardando atualização do frontend**

