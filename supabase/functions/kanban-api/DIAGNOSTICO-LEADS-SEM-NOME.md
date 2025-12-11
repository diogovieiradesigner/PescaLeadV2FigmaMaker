# 🔍 Diagnóstico: Leads Sem Nome no Kanban

## ❌ Problema Reportado

Os cards do Kanban estão aparecendo com "SN Sem nome" (SN = Sem Nome), indicando que o campo `client_name` está vindo como `NULL`, vazio (`""`) ou com o valor literal `"Sem nome"`.

---

## 🔍 Possíveis Causas

### **1. `client_name` no Staging está como "Sem nome"**

**Causa:** Durante a extração do Google Maps, se `place.title` não existir, o sistema define:
```typescript
client_name: place.title || 'Sem nome'
```

**Solução:** Verificar se o `extracted_data->>'title'` tem um valor válido que deveria ser usado.

### **2. Função de Migração não está usando dados alternativos**

**Causa:** A função `migrate_leads_with_custom_values()` copia diretamente:
```sql
client_name = v_lead.client_name
```

Se o staging tem `client_name = 'Sem nome'`, o lead também terá `'Sem nome'`.

**Solução:** A função deveria verificar `extracted_data->>'title'` ou `extracted_data->>'name'` se `client_name` for "Sem nome".

### **3. Dados no Staging estão corretos, mas não foram migrados**

**Causa:** O `client_name` no staging pode ter sido atualizado após a migração, mas o lead não foi atualizado.

**Solução:** Criar uma função para sincronizar `client_name` do staging para leads.

---

## ✅ Soluções Propostas

### **Solução 1: Corrigir Função de Migração (Recomendado)**

Modificar `migrate_leads_with_custom_values()` para usar dados alternativos:

```sql
-- Usar extracted_data->>'title' se client_name for "Sem nome"
v_final_client_name := COALESCE(
  NULLIF(v_lead.client_name, 'Sem nome'),
  v_lead.extracted_data->>'title',
  v_lead.extracted_data->>'name',
  'Sem nome'
);
```

### **Solução 2: Corrigir Leads Existentes**

Criar uma migration para atualizar leads existentes:

```sql
UPDATE leads l
SET client_name = COALESCE(
  NULLIF(les.client_name, 'Sem nome'),
  les.extracted_data->>'title',
  les.extracted_data->>'name',
  l.client_name
)
FROM lead_extraction_staging les
WHERE l.lead_extraction_id = les.id
  AND (l.client_name IS NULL OR l.client_name = '' OR l.client_name = 'Sem nome')
  AND (les.extracted_data->>'title' IS NOT NULL OR les.extracted_data->>'name' IS NOT NULL);
```

### **Solução 3: Corrigir na Extração (Preventivo)**

Modificar `fetch-google-maps/index.ts` para usar dados alternativos:

```typescript
const clientName = place.title || 
                   place.name || 
                   place.displayName || 
                   'Sem nome';
```

---

## 🔧 Próximos Passos

1. ✅ Verificar quantos leads estão sem nome
2. ✅ Verificar se staging tem dados alternativos (`extracted_data->>'title'`)
3. ✅ Criar migration para corrigir leads existentes
4. ✅ Atualizar função de migração para prevenir futuros problemas

