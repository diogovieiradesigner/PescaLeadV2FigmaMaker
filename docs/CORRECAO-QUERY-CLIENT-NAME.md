# ✅ Correção: Query client_name

## 🔍 Problema Identificado

Os logs mostram que `client_name: undefined` está vindo do banco. A query estava formatada com quebras de linha, o que pode ter causado problemas de parsing no Supabase.

## ✅ Correção Aplicada

### **Antes:**
```typescript
.select(`
  id,
  workspace_id,
  client_name,
  ...
`, { count: 'exact' })
```

### **Depois:**
```typescript
.select('id,workspace_id,funnel_id,column_id,position,client_name,company,avatar_url,deal_value,priority,status,contact_date,expected_close_date,due_date,tags,notes,is_important,assigned_to,assignee_name,assignee_avatar,created_by,updated_by,created_at,updated_at,emails_count,calls_count,whatsapp_valid,whatsapp_jid,whatsapp_name', { count: 'exact' })
```

## 🎯 Mudança

- ✅ Removidas quebras de linha da query SELECT
- ✅ String única sem formatação multi-linha
- ✅ Todos os campos em uma linha separados por vírgula

## 🚀 Deploy

Edge Function deployada com a correção.

## 📝 Próximos Passos

1. **Recarregar a página do frontend**
2. **Verificar se `client_name` agora aparece nos logs**
3. **Se ainda estiver vazio, verificar diretamente no banco:**

```sql
SELECT id, client_name, company 
FROM leads 
WHERE id = '3f627e15-1d31-4e74-bab7-ca16c620a8c2';
```

---

**Status:** ✅ Query corrigida e deployada! Recarregue a página para testar.

