# 🔧 Correção: Trigger Não Executava para scraping_data

## 📋 Resumo

**Data:** 10/12/2025  
**Problema:** 321 leads com emails do scraping formatados mas não consolidados  
**Causa:** Trigger não executava quando apenas `scraping_data` era atualizado  
**Solução:** Adicionado `scraping_data` à condição WHEN do trigger  
**Status:** ✅ **RESOLVIDO**

---

## 🐛 Problema Identificado

### **Sintoma:**
- 321 leads tinham emails formatados em `scraping_data->'emails'`
- Esses emails não apareciam no array `emails` consolidado
- Array `emails` estava vazio nesses leads

### **Causa Raiz:**
O trigger `trg_normalize_and_consolidate_staging_v2` tinha uma condição `WHEN` que só incluía:
- `extracted_data`
- `whois_data`
- `cnpj_data`

**Mas NÃO incluía:**
- `scraping_data` ❌

**Resultado:**
Quando apenas `scraping_data` era atualizado (após scraping ser processado), o trigger **não executava**, e os emails/phones/websites do scraping não eram consolidados.

---

## ✅ Solução Aplicada

### **1. Atualizar Condição do Trigger**

**Antes:**
```sql
CREATE TRIGGER trg_normalize_and_consolidate_staging_v2
BEFORE INSERT OR UPDATE ON lead_extraction_staging
FOR EACH ROW
WHEN (
  (NEW.extracted_data IS NOT NULL) OR
  (NEW.whois_data IS NOT NULL) OR
  (NEW.cnpj_data IS NOT NULL)
)
EXECUTE FUNCTION normalize_and_consolidate_staging_v2();
```

**Depois:**
```sql
CREATE TRIGGER trg_normalize_and_consolidate_staging_v2
BEFORE INSERT OR UPDATE ON lead_extraction_staging
FOR EACH ROW
WHEN (
  (NEW.extracted_data IS NOT NULL) OR
  (NEW.whois_data IS NOT NULL) OR
  (NEW.cnpj_data IS NOT NULL) OR
  (NEW.scraping_data IS NOT NULL)  -- ✅ ADICIONADO
)
EXECUTE FUNCTION normalize_and_consolidate_staging_v2();
```

### **2. Corrigir Leads Existentes**

Forçamos a execução do trigger em todos os 321 leads afetados:

```sql
UPDATE lead_extraction_staging
SET updated_at = NOW()
WHERE scraping_enriched = true
  AND jsonb_array_length(COALESCE(scraping_data->'emails', '[]'::jsonb)) > 0
  AND jsonb_array_length(COALESCE(emails, '[]'::jsonb)) = 0;
```

---

## 📊 Resultados

### **Antes da Correção:**
- ❌ 321 leads com scraping formatado mas não consolidado
- ❌ Trigger não executava para `scraping_data`

### **Depois da Correção:**
- ✅ Trigger executa para todas as fontes de dados
- ✅ 321 leads corrigidos automaticamente
- ✅ Emails/phones/websites do scraping agora são consolidados

---

## ✅ Validação

### **Teste 1: Trigger Executa Corretamente**
```sql
-- Forçar execução em lead específico
UPDATE lead_extraction_staging
SET updated_at = NOW()
WHERE id = '95ba902d-f9d8-4268-9931-f91f11207b78';

-- Resultado: ✅ 1 email consolidado (antes: 0)
```

### **Teste 2: Função de Consolidação Funciona**
```sql
-- Testar diretamente
SELECT consolidate_all_emails(
  '[]'::jsonb,  -- serpdev
  '[]'::jsonb,  -- whois
  '[]'::jsonb,  -- cnpj
  '[{"address": "contato@avnmarketing.com.br", "source": "scraping", ...}]'::jsonb  -- scraping
);

-- Resultado: ✅ Email consolidado corretamente
```

### **Teste 3: Correção em Massa**
```sql
-- Verificar quantos leads ainda têm problema
SELECT COUNT(*) 
FROM lead_extraction_staging
WHERE scraping_enriched = true
  AND jsonb_array_length(COALESCE(scraping_data->'emails', '[]'::jsonb)) > 0
  AND jsonb_array_length(COALESCE(emails, '[]'::jsonb)) = 0;

-- Resultado: ✅ 0 leads (antes: 321)
```

---

## 🎯 Impacto

### **Leads Afetados:**
- ✅ **321 leads** corrigidos automaticamente
- ✅ **100%** dos leads com scraping agora têm dados consolidados

### **Funcionalidade:**
- ✅ Trigger agora executa para todas as fontes de dados
- ✅ Emails/phones/websites do scraping são consolidados corretamente
- ✅ Sistema funciona perfeitamente para todas as fontes

---

## 📝 Migração Aplicada

**Arquivo:** `supabase/migrations/fix_trigger_condition_include_scraping.sql`

**Mudanças:**
1. ✅ Removido trigger antigo
2. ✅ Recriado trigger com condição corrigida
3. ✅ Adicionado comentário explicativo

---

**Correção realizada em:** 10/12/2025  
**Status:** ✅ **RESOLVIDO E VALIDADO**

