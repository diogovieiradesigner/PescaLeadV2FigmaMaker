# 🔍 Análise: Migrar Antes de Enriquecer

## 🎯 Cenário da Pergunta

**Situação:**
1. Google Maps extrai 100 leads
2. Leads são **migrados para o kanban** (ainda sem enriquecimento completo)
3. Leads estão no kanban mas ainda estão sendo **enriquecidos** (scraping, WHOIS, CNPJ)
4. **Se você mover manualmente esses leads para outro kanban ANTES de terminarem o enriquecimento, o que acontece?**

---

## 🔍 Análise do Fluxo Atual

### **1. Quando a Migração Acontece?**

**Condições da função `migrate_leads_with_custom_values()`:**

```sql
WHERE s.should_migrate = true
  AND s.migrated_at IS NULL
  AND s.status_extraction = 'google_fetched'  -- ✅ Apenas após Google Maps
```

**⚠️ IMPORTANTE:** Migração acontece **APÓS** `status_extraction = 'google_fetched'`, mas **ANTES** de `status_enrichment = 'completed'`!

**Isso significa:**
- ✅ Leads são migrados **antes** do enriquecimento completo
- ✅ Leads aparecem no kanban **enquanto ainda estão sendo enriquecidos**
- ✅ Enriquecimento continua em background após migração

---

### **2. O que Acontece Durante o Enriquecimento?**

**Enriquecimento acontece em `lead_extraction_staging`:**
- ✅ Scraping atualiza `primary_email`, `primary_phone`, `primary_website`
- ✅ WHOIS atualiza `whois_data`, `whois_enriched`
- ✅ CNPJ atualiza `cnpj_data`, `cnpj_enriched`
- ✅ WhatsApp atualiza `whatsapp_valid`, `whatsapp_jid`

**Pergunta crítica:** Esses dados são sincronizados para a tabela `leads` após enriquecimento?

---

### **3. Verificando Sincronização**

**Funções encontradas:**
- ✅ `sync_staging_to_lead_custom_fields()` - Sincroniza custom fields
- ✅ `sync_whatsapp_staging_to_lead()` - Sincroniza dados WhatsApp
- ✅ `sync_all_migrated_leads_custom_fields()` - Sincroniza todos

**Pergunta:** Essas funções atualizam `email`, `phone`, `website` na tabela `leads`?

---

## 💡 Cenário Específico

### **Situação:**

1. **Google Maps extrai 100 leads**
   - Status: `status_extraction = 'google_fetched'`
   - Status: `status_enrichment = 'pending'` ou `'enriching'`

2. **Leads são migrados para o kanban**
   - Criados na tabela `leads` com dados básicos (nome, empresa)
   - `migrated_at` preenchido
   - `migrated_lead_id` guardado

3. **Enriquecimento continua em background**
   - Scraping busca email, telefone, website
   - WHOIS busca dados do domínio
   - CNPJ busca dados da empresa
   - Dados são atualizados em `lead_extraction_staging`

4. **Você move manualmente para outro kanban**
   - `funnel_id` e `column_id` são atualizados
   - Lead está no novo kanban

5. **Enriquecimento completa**
   - `status_enrichment = 'completed'`
   - Dados atualizados em `lead_extraction_staging`

**O que acontece?**
- ❓ Dados enriquecidos são sincronizados para `leads`?
- ❓ Se sim, o lead permanece no kanban onde você moveu?
- ❓ Há risco de sobrescrever posição manual?

---

## 🔍 Verificações Necessárias

### **1. Verificar Funções de Sincronização**

**Query:**
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname IN (
  'sync_staging_to_lead_custom_fields',
  'sync_whatsapp_staging_to_lead',
  'sync_all_migrated_leads_custom_fields'
);
```

**O que verificar:**
- ✅ Se atualizam `email`, `phone`, `website` na tabela `leads`
- ✅ Se atualizam `funnel_id` ou `column_id` (não devem!)
- ✅ Se usam `migrated_lead_id` para encontrar o lead correto

---

### **2. Verificar Triggers**

**Query:**
```sql
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'lead_extraction_staging'
  AND trigger_name ILIKE '%sync%';
```

**O que verificar:**
- ✅ Se há trigger automático que sincroniza após enriquecimento
- ✅ Se trigger atualiza posição do lead (não deve!)

---

## ⚠️ Possíveis Problemas

### **Problema 1: Dados Não Sincronizados** ⚠️

**Cenário:**
- Lead migrado com dados básicos
- Enriquecimento completa e atualiza `lead_extraction_staging`
- **Dados não são sincronizados para `leads`**

**Resultado:**
- ❌ Lead no kanban tem dados incompletos
- ❌ Email, telefone, website não aparecem no lead

---

### **Problema 2: Sincronização Sobrescreve Posição** ⚠️

**Cenário:**
- Lead migrado para kanban A
- Você move para kanban B
- Sincronização atualiza `funnel_id` e `column_id` de volta para A

**Resultado:**
- ❌ Lead volta para kanban original
- ❌ Movimentação manual é perdida

---

### **Problema 3: Sincronização Não Atualiza Dados** ⚠️

**Cenário:**
- Lead migrado com dados básicos
- Enriquecimento completa
- **Sincronização não acontece automaticamente**

**Resultado:**
- ❌ Lead no kanban tem dados desatualizados
- ❌ Dados enriquecidos ficam apenas em `lead_extraction_staging`

---

## 📋 Próximos Passos para Análise Completa

1. ✅ Verificar funções de sincronização completas
2. ✅ Verificar se há triggers automáticos
3. ✅ Verificar se sincronização atualiza `funnel_id`/`column_id`
4. ✅ Identificar se há problema ou se está funcionando corretamente

---

**Status:** 🔍 **ANÁLISE EM ANDAMENTO - Verificando sincronização de dados**

