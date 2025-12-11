# 🔧 Troubleshooting: Erro 404 - Kanban API

**Data:** 10/12/2025

---

## ❌ Problema

```
❌ [KANBAN] Resposta não-JSON recebida: 404 Not Found
❌ [KANBAN] Failed to load funnel: Error: A API kanban-api não está disponível.
```

---

## ✅ Solução

### **1. Verificar se a Função está Deployada**

A função `kanban-api` foi deployada com sucesso! ✅

**URL da função:**
```
https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api
```

### **2. Verificar URL no Frontend**

O frontend deve usar a URL correta:

```typescript
// ✅ CORRETO
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api';

// ❌ ERRADO (URL antiga)
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/make-server-e4f9d774';
```

### **3. Verificar Estrutura de Rotas**

Todas as rotas seguem o padrão:
```
/workspaces/:workspaceId/funnels/:funnelId/...
```

**Exemplo:**
```typescript
// ✅ CORRETO
GET /workspaces/47e86ae3-4d5c-4e03-a881-293fa802424d/funnels

// ❌ ERRADO (sem workspaceId)
GET /funnels
```

### **4. Verificar Autenticação**

Todas as rotas (exceto `/health`) requerem autenticação:

```typescript
// ✅ CORRETO
fetch(`${API_URL}/workspaces/${workspaceId}/funnels`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// ❌ ERRADO (sem token)
fetch(`${API_URL}/workspaces/${workspaceId}/funnels`);
```

---

## 🔍 Checklist de Verificação

### **Frontend:**

- [ ] URL base está correta: `/kanban-api` (não `/make-server-e4f9d774`)
- [ ] Token JWT está sendo enviado no header `Authorization: Bearer <token>`
- [ ] `workspaceId` está sendo passado corretamente na URL
- [ ] Estrutura de rotas está correta: `/workspaces/:workspaceId/funnels/...`

### **Backend:**

- [x] ✅ Função deployada com sucesso
- [x] ✅ Todos os arquivos foram enviados
- [x] ✅ Estrutura modular está correta

---

## 🧪 Teste Rápido

### **1. Testar Health Check (Pode retornar 401 - normal)**

```bash
curl https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/health
```

### **2. Testar com Token (Deve funcionar)**

```typescript
// No console do navegador (com usuário logado)
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

fetch('https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/47e86ae3-4d5c-4e03-a881-293fa802424d/funnels', {
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

## 📝 Código de Exemplo para Frontend

```typescript
// Configuração da API
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api';

// Obter token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Buscar funis
async function getFunnels(workspaceId: string) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { funnels } = await response.json();
  return funnels;
}

// Usar
const funnels = await getFunnels('47e86ae3-4d5c-4e03-a881-293fa802424d');
```

---

## ⚠️ Possíveis Causas do 404

1. **URL incorreta** - Verificar se está usando `/kanban-api` e não `/make-server-e4f9d774`
2. **Token ausente** - Verificar se o token está sendo enviado
3. **Workspace ID incorreto** - Verificar se o workspaceId está correto
4. **Estrutura de rota incorreta** - Verificar se está seguindo o padrão `/workspaces/:workspaceId/...`

---

## 🚀 Próximos Passos

1. ✅ Verificar URL no frontend
2. ✅ Verificar se token está sendo enviado
3. ✅ Testar endpoint manualmente
4. ✅ Verificar logs da função no Supabase Dashboard

---

**Status:** ✅ Função deployada e pronta para uso!

