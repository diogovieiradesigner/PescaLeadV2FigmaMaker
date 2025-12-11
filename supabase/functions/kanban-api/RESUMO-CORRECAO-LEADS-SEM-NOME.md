# ✅ Correção: Leads Sem Nome

## 🔍 Problema Identificado

Os cards do Kanban estavam aparecendo com "SN Sem nome" porque:

1. **Durante a extração:** Se `place.title` não existir, o sistema define `client_name: place.title || 'Sem nome'`
2. **Durante a migração:** A função `migrate_leads_with_custom_values()` copiava diretamente `v_lead.client_name`, incluindo "Sem nome"
3. **Resultado:** Leads migrados com `client_name = 'Sem nome'` mesmo quando `extracted_data->>'title'` tinha um valor válido

---

## ✅ Solução Implementada

### **1. Correção de Leads Existentes**

Migration aplicada que atualiza leads existentes:

```sql
UPDATE leads l
SET 
  client_name = COALESCE(
    NULLIF(les.client_name, 'Sem nome'),
    les.extracted_data->>'title',
    les.extracted_data->>'name',
    les.extracted_data->>'displayName',
    l.client_name
  )
FROM lead_extraction_staging les
WHERE l.lead_extraction_id = les.id
  AND (l.client_name IS NULL OR l.client_name = '' OR l.client_name = 'Sem nome')
  AND (les.extracted_data tem título válido);
```

**Resultado:** ✅ Leads existentes foram corrigidos automaticamente.

---

### **2. Correção da Função de Migração**

A função `migrate_leads_with_custom_values()` foi atualizada para:

1. **Verificar se `client_name` é "Sem nome"**
2. **Tentar usar `extracted_data->>'title'`**
3. **Tentar usar `extracted_data->>'name'`**
4. **Tentar usar `extracted_data->>'displayName'`**
5. **Usar "Sem nome" apenas como último recurso**

**Código:**
```sql
v_final_client_name := COALESCE(
  NULLIF(v_lead.client_name, 'Sem nome'),
  v_lead.extracted_data->>'title',
  v_lead.extracted_data->>'name',
  v_lead.extracted_data->>'displayName',
  'Sem nome'
);
```

**Resultado:** ✅ Novos leads serão migrados com nomes corretos.

---

## 📊 Status

- ✅ Migration aplicada com sucesso
- ✅ Leads existentes corrigidos
- ✅ Função de migração atualizada
- ✅ Novos leads usarão nomes corretos

---

## 🔄 Próximos Passos

1. **Verificar no Kanban:** Os cards devem agora mostrar nomes reais em vez de "Sem nome"
2. **Monitorar:** Novos leads migrados devem ter nomes corretos
3. **Se ainda houver problemas:** Verificar se `extracted_data` realmente tem `title`/`name`/`displayName`

---

## 📝 Notas

- A correção usa `COALESCE` para tentar múltiplas fontes de dados
- Prioridade: `client_name` (se não for "Sem nome") > `title` > `name` > `displayName` > "Sem nome"
- A correção é retroativa (afeta leads existentes) e preventiva (afeta novos leads)

