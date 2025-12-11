# 🔍 Debug: Por que as Stats Mostram 0 Leads?

**Data:** 10/12/2025

---

## ✅ Status Atual

- ✅ API retorna **200 OK**
- ✅ Path corrigido (`/kanban-api` removido)
- ✅ Autenticação funcionando
- ✅ Workspace access funcionando
- ✅ Rota `/leads` sendo alcançada
- ❓ **Stats mostram 0 leads em todas as colunas**

---

## 🔍 Possíveis Causas

### **1. Não há leads no banco para esse funil**

Verifique executando:
```sql
SELECT COUNT(*) 
FROM leads 
WHERE funnel_id = '16712ae6-78b5-47d4-9504-b66e84315341' 
  AND status = 'active';
```

### **2. Leads estão em outro funil**

Verifique se os leads estão no funil correto:
```sql
SELECT funnel_id, COUNT(*) 
FROM leads 
WHERE workspace_id = '47e86ae3-4d5c-4e03-a881-293fa802424d'
  AND status = 'active'
GROUP BY funnel_id;
```

### **3. Leads estão com status diferente de 'active'**

Verifique:
```sql
SELECT status, COUNT(*) 
FROM leads 
WHERE funnel_id = '16712ae6-78b5-47d4-9504-b66e84315341'
GROUP BY status;
```

### **4. Query está filtrando incorretamente**

A query usa:
- `workspace_id = '47e86ae3-4d5c-4e03-a881-293fa802424d'`
- `funnel_id = '16712ae6-78b5-47d4-9504-b66e84315341'`
- `column_id IN (colunas do funil)`
- `status = 'active'`

Verifique se todos esses filtros estão corretos.

---

## 🧪 Próximos Passos

1. ✅ **Logs adicionados** - Ver o que a API está retornando
2. ⏳ **Verificar banco** - Executar queries SQL para verificar se há leads
3. ⏳ **Verificar logs** - Ver o que aparece nos logs da Edge Function

---

## 📊 Logs Esperados

Após recarregar a página, você deve ver nos logs:

```
[LEADS] GET /leads - Iniciando...
[LEADS] workspaceId: ... funnelId: ...
[getColumnLeads] Coluna xxx: X leads encontrados de Y total
[LEADS] ✅ Leads encontrados por coluna: { ... }
[LEADS] 📦 JSON completo (primeiros 500 chars): { ... }
```

---

**Status:** 🔍 **AGUARDANDO LOGS PARA DIAGNÓSTICO**

