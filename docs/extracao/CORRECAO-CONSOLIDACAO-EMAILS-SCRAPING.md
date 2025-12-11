# ✅ Correção: Consolidação de Emails do Scraping

## 🔍 Problema Identificado

Emails do scraping não estavam sendo consolidados no array `emails` nem no `primary_email`:

- **Email existe em `scraping_data`:** `contato@hhsobrinho.com.br` ✅
- **Array `emails` está vazio:** `[]` ❌
- **`primary_email` está null:** `null` ❌
- **Impacto:** Email não disponível no CRM

### Causa Raiz

A função `normalize_and_consolidate_staging_v2()` (executada pelo trigger BEFORE UPDATE) não estava extraindo emails do `scraping_data`. A função `consolidate_all_emails()` só aceitava 3 fontes:
1. `emails_serpdev` (Google Maps)
2. `emails_whois` (WHOIS)
3. `emails_cnpj` (CNPJ)

**Faltava:** `emails_scraping` (Scraping)

---

## ✅ Solução Implementada

### 1. Função `consolidate_all_emails()` Corrigida

**Adicionado parâmetro `emails_scraping`:**

```sql
CREATE OR REPLACE FUNCTION consolidate_all_emails(
  emails_serpdev JSONB,
  emails_whois JSONB,
  emails_cnpj JSONB,
  emails_scraping JSONB DEFAULT '[]'::jsonb  -- NOVO PARÂMETRO
)
RETURNS JSONB AS $$
```

**Nova seção de processamento de scraping:**

```sql
-- Processar SCRAPING com exception handling (NOVO)
IF emails_scraping IS NOT NULL AND jsonb_typeof(emails_scraping) = 'array' THEN
  FOR email_entry IN SELECT * FROM jsonb_array_elements(emails_scraping) LOOP
    BEGIN
      email_raw := COALESCE(email_entry->>'address', email_entry::text);
      email_lower := lower(trim(email_raw));
      v_source := COALESCE(email_entry->>'source', 'scraping');
      
      IF email_lower IS NOT NULL AND email_lower ~ '^[^@]+@[^@]+\.[^@]+$' 
         AND NOT (email_lower = ANY(seen_emails)) THEN
        all_emails := all_emails || jsonb_build_object(
          'address', email_lower,
          'source', v_source,
          'type', COALESCE(email_entry->>'type', 'main'),
          'verified', COALESCE((email_entry->>'verified')::boolean, false)
        );
        seen_emails := array_append(seen_emails, email_lower);
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        PERFORM log_error(...);
    END;
  END LOOP;
END IF;
```

**Características:**
- ✅ Extrai `address` de cada email do scraping
- ✅ Valida formato de email com regex
- ✅ Remove duplicatas usando array `seen_emails`
- ✅ Preserva metadados (`type`, `verified`, `source`)
- ✅ Tratamento de erros com exception handling

---

### 2. Função `normalize_and_consolidate_staging_v2()` Corrigida

**Adicionada extração de emails do scraping:**

```sql
-- SCRAPING: scraping_data (NOVO - CORREÇÃO)
IF NEW.scraping_data IS NOT NULL THEN
  IF NEW.scraping_data->'emails' IS NOT NULL THEN
    v_emails_scraping := NEW.scraping_data->'emails';
  END IF;
END IF;
```

**Chamada atualizada para incluir scraping:**

```sql
-- CONSOLIDAR emails (sem duplicatas) - AGORA INCLUI SCRAPING
NEW.emails := consolidate_all_emails(
  v_emails_serpdev,
  v_emails_whois,
  v_emails_cnpj,
  v_emails_scraping  -- NOVO PARÂMETRO
);

-- Escolher email principal
NEW.primary_email := get_primary_email(NEW.emails);
```

---

## 🔄 Como Funciona Agora

### Fluxo de Consolidação:

1. **Trigger `trg_normalize_and_consolidate_staging_v2` executa (BEFORE UPDATE):**
   - Extrai emails de todas as fontes:
     - `extracted_data->emails` (Google Maps/SerpDev)
     - `whois_data->emails` (WHOIS)
     - `cnpj_data->emails` (CNPJ)
     - `scraping_data->emails` (Scraping) ✅ **NOVO**

2. **Função `consolidate_all_emails()` consolida:**
   - Processa emails de todas as 4 fontes
   - Remove duplicatas por endereço (case-insensitive)
   - Valida formato de email
   - Retorna array JSONB consolidado

3. **Função `get_primary_email()` escolhe principal:**
   - Prioridade: Verified + CNPJ > CNPJ > Sales/Contact > WHOIS > SerpDev > Scraping
   - Atualiza `primary_email`

4. **Trigger `trg_populate_email_fields` executa (AFTER UPDATE):**
   - Popula custom field "Email Principal" no CRM
   - Popula custom field "Todos os Emails (JSON)"

---

## ✅ Resultados

### Antes da Correção:

| Campo | Valor | Status |
|-------|-------|--------|
| `scraping_data->emails` | `[{"address": "contato@hhsobrinho.com.br", ...}]` | ✅ Existe |
| `emails` | `[]` | ❌ Vazio |
| `primary_email` | `null` | ❌ Null |

### Depois da Correção:

| Campo | Valor | Status |
|-------|-------|--------|
| `scraping_data->emails` | `[{"address": "contato@hhsobrinho.com.br", ...}]` | ✅ Existe |
| `emails` | `[{"address": "contato@hhsobrinho.com.br", "source": "scraping", ...}]` | ✅ Consolidado |
| `primary_email` | `contato@hhsobrinho.com.br` | ✅ Preenchido |

---

## 🎯 Benefícios

1. ✅ **Emails Disponíveis no CRM:** Emails do scraping agora aparecem no CRM
2. ✅ **Email Principal:** `primary_email` é preenchido automaticamente
3. ✅ **Consolidação Completa:** Todas as 4 fontes são consolidadas
4. ✅ **Sem Duplicatas:** Sistema remove duplicatas automaticamente
5. ✅ **Priorização Inteligente:** Email principal escolhido por prioridade

---

## 📝 Função para Corrigir Leads Existentes

Criada função `fix_unconsolidated_scraping_emails()` para corrigir leads antigos:

```sql
-- Corrigir leads existentes
SELECT * FROM fix_unconsolidated_scraping_emails();
```

**Esta função:**
- ✅ Busca leads com emails no scraping mas não consolidados
- ✅ Força trigger para consolidar emails
- ✅ Retorna lista de leads corrigidos
- ✅ Limita a 1000 leads por execução

---

## ✅ Status Final

- ✅ Função `consolidate_all_emails()` corrigida (aceita scraping)
- ✅ Função `normalize_and_consolidate_staging_v2()` corrigida (extrai scraping)
- ✅ Lead HH Sobrinho corrigido: email consolidado ✅
- ✅ `primary_email` preenchido: `contato@hhsobrinho.com.br` ✅

**Problema resolvido!** 🎉

