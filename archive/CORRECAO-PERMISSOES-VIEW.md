# 🔧 Correção: Permissões da View `lead_extraction_recent_runs`

## 🎯 Problema Identificado

Após recriar a view `lead_extraction_recent_runs`, as permissões foram perdidas, causando erro:

```
permission denied for view lead_extraction_recent_runs
```

**Causa:** Quando uma view é recriada com `DROP VIEW` e `CREATE VIEW`, as permissões não são automaticamente herdadas.

---

## ✅ Solução Aplicada

### **Conceder Permissões SELECT**

```sql
GRANT SELECT ON lead_extraction_recent_runs TO authenticated;
```

**O que faz:**
- ✅ Concede permissão `SELECT` na view para usuários autenticados
- ✅ Permite que o frontend (usando `authenticated` role) consulte a view
- ✅ Mantém segurança (apenas SELECT, não INSERT/UPDATE/DELETE)

---

## 🔍 Verificação

### **Verificar Permissões:**

```sql
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'lead_extraction_recent_runs'
  AND grantee IN ('authenticated', 'anon', 'public');
```

**Deve retornar:**
```json
{
  "grantee": "authenticated",
  "privilege_type": "SELECT"
}
```

---

## 📝 Nota Importante

**Sempre que recriar uma view:**
1. ✅ Recriar a view com `CREATE VIEW`
2. ✅ Conceder permissões com `GRANT SELECT`
3. ✅ Verificar permissões com query acima

---

## ✅ Status

- ✅ Permissões concedidas para `authenticated`
- ✅ View acessível pelo frontend
- ✅ Migração atualizada para incluir `GRANT`

**Status:** ✅ **Permissões Corrigidas - Pronto para Usar!**

