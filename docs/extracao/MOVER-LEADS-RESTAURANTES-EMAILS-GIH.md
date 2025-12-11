# 📋 Movimentação de Leads: Restaurantes → Emails Gih

## 🎯 Objetivo

Mover todos os leads das duas extrações "Restaurantes" para o kanban **"Emails Gih"** na primeira coluna **"Novo"**.

---

## 📊 Extrações Afetadas

1. **Restaurantes - 10/12/2025 09:07**
   - Run ID: `81bfc716-3b7c-4b2b-bb13-adde77adf59d`
   - Total de leads: **478**

2. **Restaurantes - 10/12/2025 09:03**
   - Run ID: `75e677d5-a9e0-49e9-9a5c-5f25573e8bd2`
   - Total de leads: **514**

**Total de leads a mover:** **992 leads**

---

## 🎯 Destino

- **Kanban:** Emails Gih
- **Funnel ID:** `3657418b-d030-48d2-ba1b-87793dcd1d16`
- **Coluna:** Novo (primeira coluna)
- **Column ID:** `dae0e522-248e-4528-a458-8941c310158b`

---

## ⚙️ Como Executar

### **Opção 1: Via Supabase SQL Editor (Recomendado)**

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo: `supabase/migrations/move_restaurantes_leads_to_emails_gih.sql`
4. Copie e cole o conteúdo
5. Execute o script

### **Opção 2: Via Migration**

```bash
# O arquivo já está criado em:
supabase/migrations/move_restaurantes_leads_to_emails_gih.sql
```

---

## 🔍 Verificação

Após executar, verifique se todos os leads foram movidos:

```sql
SELECT 
    ler.run_name,
    COUNT(*) as total_leads,
    f.name as funnel_name,
    fc.title as column_name
FROM lead_extraction_runs ler
JOIN leads l ON l.lead_extraction_run_id = ler.id
LEFT JOIN funnels f ON f.id = l.funnel_id
LEFT JOIN funnel_columns fc ON fc.id = l.column_id
WHERE ler.id IN (
  '81bfc716-3b7c-4b2b-bb13-adde77adf59d',
  '75e677d5-a9e0-49e9-9a5c-5f25573e8bd2'
)
GROUP BY ler.id, ler.run_name, f.name, fc.title
ORDER BY ler.run_name;
```

**Resultado esperado:**
- `funnel_name`: "Emails Gih"
- `column_name`: "Novo"
- `total_leads`: 992 (478 + 514)

---

## ⚠️ Observações

- ✅ Script processa em **batches de 100 leads** para evitar timeout
- ✅ Usa `FOR UPDATE SKIP LOCKED` para evitar conflitos
- ✅ Atualiza apenas leads que ainda não estão no destino correto
- ✅ Mantém `updated_at` atualizado

---

**Status:** ✅ **Script criado e pronto para execução**

