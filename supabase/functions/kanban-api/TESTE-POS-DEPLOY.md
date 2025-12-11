# ✅ Teste Pós-Deploy - Kanban API

**Data:** 10/12/2025

---

## 🚀 Deploy Realizado

✅ **Edge Function `kanban-api` deployada com sucesso!**

**URL Base:**
```
https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api
```

---

## 🧪 Testes Rápidos

### **1. Health Check (Sem Autenticação)**

```bash
curl https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "service": "kanban-api",
  "version": "2.0.0",
  "timestamp": "2025-12-10T..."
}
```

### **2. Testar Autenticação (Sem Token - Deve retornar 401)**

```bash
curl https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/WORKSPACE_ID/funnels
```

**Resposta esperada:** `401 Unauthorized`

### **3. Testar com Token (Deve funcionar)**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/WORKSPACE_ID/funnels
```

**Resposta esperada:** `200 OK` com lista de funis

---

## 🔍 Verificar Logs

```bash
supabase functions logs kanban-api --follow
```

---

## ✅ Status

- ✅ Deploy realizado
- ✅ Health check funcionando
- ✅ Autenticação funcionando
- ⏳ Aguardando testes do frontend

---

**Próximo passo:** Testar no frontend!

