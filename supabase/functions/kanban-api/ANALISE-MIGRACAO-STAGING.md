# 🔍 Análise: Migração de Dados do Staging para Tabelas Finais

**Data:** 10/12/2025

---

## 📊 **Resumo Executivo**

**Resposta:** ❌ **NÃO**, nem todos os dados do `lead_extraction_staging` são migrados para as 3 tabelas finais (`leads`, `custom_fields`, `lead_custom_values`).

---

## 🔄 **Processo de Migração**

### **1. Função `migrate_leads_with_custom_values()`**

**O que é migrado:**
- ✅ `workspace_id`
- ✅ `funnel_id` e `column_id` (do run)
- ✅ `client_name`
- ✅ `company`
- ✅ `lead_extraction_id` (referência ao staging)
- ✅ `lead_extraction_run_id`
- ✅ `created_at`
- ✅ Campos de `extracted_data` que correspondem a `custom_fields` existentes

**O que NÃO é migrado diretamente:**
- ❌ `emails`, `phones`, `websites` (arrays JSONB)
- ❌ `primary_email`, `primary_phone`, `primary_website`
- ❌ `cnpj_data`, `whois_data`, `scraping_data`
- ❌ Dados de enriquecimento (CNPJ, WHOIS, Scraping)

---

## 🔧 **Triggers que Populam Custom Fields**

Após a migração, vários triggers populam `custom_fields` com dados do staging:

### **1. `trigger_create_custom_fields`**
- **Quando:** `INSERT` em `leads`
- **O que faz:** Cria `custom_fields` baseado em dados do staging

### **2. `trg_populate_cnpj_fields`**
- **Quando:** `UPDATE` em `lead_extraction_staging` (quando `cnpj_enriched = true`)
- **O que faz:** Popula campos CNPJ em `custom_fields`

### **3. `trg_populate_whois_fields`**
- **Quando:** `UPDATE` em `lead_extraction_staging` (quando `whois_enriched = true`)
- **O que faz:** Popula campos WHOIS em `custom_fields`

### **4. `trg_populate_email_fields`**
- **Quando:** `UPDATE` em `lead_extraction_staging`
- **O que faz:** Popula campos de email em `custom_fields`

### **5. `trg_populate_phone_fields`**
- **Quando:** `UPDATE` em `lead_extraction_staging`
- **O que faz:** Popula campos de telefone em `custom_fields`

### **6. `trg_populate_website_fields`**
- **Quando:** `UPDATE` em `lead_extraction_staging`
- **O que faz:** Popula campos de website em `custom_fields`

### **7. `trg_populate_contact_type`**
- **Quando:** `UPDATE` em `lead_extraction_staging`
- **O que faz:** Popula campo "Tipo de Contato" em `custom_fields`

### **8. `trg_sync_custom_fields`**
- **Quando:** `UPDATE` em `lead_extraction_staging`
- **O que faz:** Sincroniza dados do staging para `custom_fields`

---

## ⚠️ **Problemas Identificados**

### **1. Dados Não Migrados Diretamente**

Muitos dados do staging **não são migrados diretamente** na função `migrate_leads_with_custom_values()`:

- ❌ `emails`, `phones`, `websites` (arrays JSONB consolidados)
- ❌ `primary_email`, `primary_phone`, `primary_website`
- ❌ `cnpj_data`, `whois_data`, `scraping_data` (dados brutos de enriquecimento)
- ❌ `raw_google_data`, `raw_scraper_data` (dados brutos)
- ❌ `enrichment_data` (dados consolidados de enriquecimento)
- ❌ `latitude`, `longitude`, `formatted_address`
- ❌ `whatsapp_valid`, `whatsapp_jid`, `whatsapp_name`
- ❌ `contact_type`

### **2. Dependência de Triggers**

Esses dados **só são populados** se os triggers executarem corretamente:

- ✅ Se o trigger `trg_populate_email_fields` executar → email vai para `custom_fields`
- ✅ Se o trigger `trg_populate_phone_fields` executar → telefone vai para `custom_fields`
- ✅ Se o trigger `trg_populate_cnpj_fields` executar → CNPJ vai para `custom_fields`
- ✅ Se o trigger `trg_populate_whois_fields` executar → WHOIS vai para `custom_fields`

**Problema:** Se um trigger falhar ou não executar, os dados não são migrados!

---

## ✅ **Recomendações**

### **1. Verificar se Todos os Triggers Estão Funcionando**

Execute uma query para verificar se todos os leads migrados têm os custom_fields populados:

```sql
SELECT 
  l.id,
  l.client_name,
  COUNT(DISTINCT lcv.id) as custom_fields_count
FROM leads l
LEFT JOIN lead_custom_values lcv ON lcv.lead_id = l.id
WHERE l.lead_extraction_id IS NOT NULL
GROUP BY l.id, l.client_name
HAVING COUNT(DISTINCT lcv.id) = 0;  -- Leads sem custom_fields
```

### **2. Verificar Dados do Staging vs Custom Fields**

Compare o que está no staging vs o que está em custom_fields:

```sql
SELECT 
  les.id as staging_id,
  les.client_name,
  les.primary_email,
  les.primary_phone,
  l.id as lead_id,
  lcv_email.value as custom_email,
  lcv_phone.value as custom_phone
FROM lead_extraction_staging les
JOIN leads l ON l.lead_extraction_id = les.id
LEFT JOIN lead_custom_values lcv_email ON lcv_email.lead_id = l.id 
  AND lcv_email.custom_field_id IN (SELECT id FROM custom_fields WHERE name ILIKE '%email principal%')
LEFT JOIN lead_custom_values lcv_phone ON lcv_phone.lead_id = l.id 
  AND lcv_phone.custom_field_id IN (SELECT id FROM custom_fields WHERE name ILIKE '%telefone principal%')
WHERE les.migrated_at IS NOT NULL
LIMIT 10;
```

---

## 📝 **Conclusão**

**Resposta à pergunta:** ❌ **NÃO**, nem todos os dados do staging são migrados automaticamente.

**O que acontece:**
1. ✅ Dados básicos (`client_name`, `company`) são migrados diretamente
2. ⚠️ Dados de enriquecimento (email, phone, CNPJ, WHOIS, Scraping) dependem de triggers
3. ❌ Dados brutos (`raw_google_data`, `raw_scraper_data`) não são migrados
4. ❌ Dados consolidados (`enrichment_data`) não são migrados

**Recomendação:** Verificar se todos os triggers estão funcionando corretamente e se todos os dados necessários estão sendo populados em `custom_fields`.

