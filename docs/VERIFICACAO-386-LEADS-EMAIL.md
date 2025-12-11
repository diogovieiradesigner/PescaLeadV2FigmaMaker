# 🔍 Verificação: 386 Leads com E-mail no Funil "Email Gih"

## 📊 Como Verificar

O filtro "Tem E-mail" funciona verificando o campo `emails_count > 0` na tabela `leads`.

### **Query SQL para Verificar:**

Execute a query em `VERIFICAR-LEADS-EMAIL-GIH.sql` no SQL Editor do Supabase:

1. **Primeiro, encontre os IDs:**
```sql
SELECT 
  w.id AS workspace_id,
  w.name AS workspace_name,
  f.id AS funnel_id,
  f.name AS funnel_name
FROM workspaces w
JOIN funnels f ON f.workspace_id = w.id
WHERE w.name ILIKE '%Lead Food%' 
  AND f.name ILIKE '%Email Gih%';
```

2. **Depois, conte os leads com e-mail:**
```sql
SELECT 
  COUNT(*) AS total_leads,
  COUNT(CASE WHEN emails_count > 0 THEN 1 END) AS leads_com_email,
  COUNT(CASE WHEN emails_count = 0 OR emails_count IS NULL THEN 1 END) AS leads_sem_email
FROM leads
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND funnel_id = 'SEU_FUNNEL_ID'
  AND status = 'active';
```

## ⚠️ Possíveis Problemas

### **1. Inconsistência entre `emails_count` e `custom_fields`**

Se o `emails_count` não estiver atualizado, pode haver leads com e-mail em `custom_fields` mas com `emails_count = 0`.

**Verificar:**
```sql
-- Leads com e-mail em custom_fields mas emails_count = 0
SELECT COUNT(DISTINCT l.id) AS leads_com_email_custom_mas_sem_count
FROM leads l
JOIN lead_custom_values lcv ON lcv.lead_id = l.id
JOIN custom_fields cf ON cf.id = lcv.custom_field_id
WHERE l.workspace_id = 'SEU_WORKSPACE_ID'
  AND l.funnel_id = 'SEU_FUNNEL_ID'
  AND l.status = 'active'
  AND l.emails_count = 0
  AND cf.field_type = 'email'
  AND lcv.value IS NOT NULL 
  AND lcv.value != '';
```

### **2. Migrations não aplicadas**

Se as migrations que atualizam `emails_count` não foram aplicadas, o contador pode estar incorreto.

**Migrations relevantes:**
- `20251210140000_update_emails_count_from_custom_fields.sql`
- `20251210160000_fix_emails_count_simples.sql`
- `20251210180000_fix_remaining_emails_count_inconsistencies.sql`

## ✅ Solução Rápida

Se houver inconsistências, execute:

```sql
-- Atualizar emails_count baseado em custom_fields
UPDATE leads l
SET 
  emails_count = CASE 
    WHEN l.emails_count > 0 THEN l.emails_count
    WHEN EXISTS (
      SELECT 1
      FROM lead_custom_values lcv
      JOIN custom_fields cf ON cf.id = lcv.custom_field_id
      WHERE lcv.lead_id = l.id
        AND cf.name ILIKE '%email%'
        AND lcv.value IS NOT NULL 
        AND lcv.value != ''
        AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
    ) THEN 1
    ELSE 0
  END,
  updated_at = NOW()
WHERE l.workspace_id = 'SEU_WORKSPACE_ID'
  AND l.funnel_id = 'SEU_FUNNEL_ID'
  AND l.status = 'active'
  AND l.emails_count = 0
  AND EXISTS (
    SELECT 1
    FROM lead_custom_values lcv
    JOIN custom_fields cf ON cf.id = lcv.custom_field_id
    WHERE lcv.lead_id = l.id
      AND cf.name ILIKE '%email%'
      AND lcv.value IS NOT NULL 
      AND lcv.value != ''
      AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
  );
```

## 📝 Próximos Passos

1. Execute a query de verificação no SQL Editor
2. Compare o resultado com os 386 leads mostrados no frontend
3. Se houver diferença, execute a query de correção acima
4. Recarregue a página e verifique novamente

---

**Arquivo SQL completo:** `VERIFICAR-LEADS-EMAIL-GIH.sql`

