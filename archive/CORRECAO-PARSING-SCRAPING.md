# ✅ Correção: Parsing de Dados de Scraping

## 🔍 Problema Identificado

Os dados de scraping estavam sendo salvos como **JSON strings** nos custom fields, ao invés de serem parseados em campos individuais:

- **Antes:** `Scraping Emails` = `"[{\"type\": \"main\", \"source\": \"scraping\", \"address\": \"contato@hhsobrinho.com.br\", \"verified\": false}]"` ❌
- **Depois:** `Scraping Email 1` = `contato@hhsobrinho.com.br` ✅

### Causa Raiz

A função `sync_staging_to_lead_custom_fields()` estava usando `scraping_data->>'emails'` e `scraping_data->>'phones'`, que converte o JSONB para string, ao invés de iterar sobre os arrays e criar campos individuais.

**Código problemático:**
```sql
-- === SCRAPING ===
SELECT scraping_data->>'emails' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Scraping Emails', v_val, 'text');

SELECT scraping_data->>'phones' INTO v_val FROM lead_extraction_staging WHERE id = p_staging_id;
PERFORM set_custom_field_value(v_lead_id, v_workspace_id, 'Scraping Telefones', v_val, 'text');
```

---

## ✅ Solução Implementada

### Função `sync_staging_to_lead_custom_fields()` Corrigida

**Nova lógica para parsing de scraping:**

```sql
-- === SCRAPING (PARSEADO EM CAMPOS INDIVIDUAIS) ===
-- Parsear emails do scraping
IF v_scraping_data IS NOT NULL AND v_scraping_data->'emails' IS NOT NULL THEN
  FOR v_email_item IN 
    SELECT jsonb_array_elements(v_scraping_data->'emails')
  LOOP
    v_field_name := CASE 
      WHEN v_email_index = 1 THEN 'Scraping Email 1'
      WHEN v_email_index = 2 THEN 'Scraping Email 2'
      WHEN v_email_index = 3 THEN 'Scraping Email 3'
      ELSE 'Scraping Email ' || v_email_index::TEXT
    END;
    
    v_val := v_email_item->>'address';
    IF v_val IS NOT NULL AND v_val != '' THEN
      PERFORM set_custom_field_value(v_lead_id, v_workspace_id, v_field_name, v_val, 'email');
      v_email_index := v_email_index + 1;
    END IF;
  END LOOP;
END IF;

-- Parsear telefones do scraping
IF v_scraping_data IS NOT NULL AND v_scraping_data->'phones' IS NOT NULL THEN
  FOR v_phone_item IN 
    SELECT jsonb_array_elements(v_scraping_data->'phones')
  LOOP
    v_field_name := CASE 
      WHEN v_phone_index = 1 THEN 'Scraping Telefone 1'
      WHEN v_phone_index = 2 THEN 'Scraping Telefone 2'
      WHEN v_phone_index = 3 THEN 'Scraping Telefone 3'
      ELSE 'Scraping Telefone ' || v_phone_index::TEXT
    END;
    
    v_val := v_phone_item->>'number';
    IF v_val IS NOT NULL AND v_val != '' THEN
      PERFORM set_custom_field_value(v_lead_id, v_workspace_id, v_field_name, v_val, 'phone');
      v_phone_index := v_phone_index + 1;
    END IF;
  END LOOP;
END IF;

-- Parsear redes sociais do scraping
IF v_scraping_data IS NOT NULL AND v_scraping_data->'social_media' IS NOT NULL THEN
  FOR v_social_item IN 
    SELECT jsonb_array_elements(v_scraping_data->'social_media')
  LOOP
    v_field_name := CASE 
      WHEN v_social_index = 1 THEN 'Scraping Rede Social 1'
      WHEN v_social_index = 2 THEN 'Scraping Rede Social 2'
      WHEN v_social_index = 3 THEN 'Scraping Rede Social 3'
      ELSE 'Scraping Rede Social ' || v_social_index::TEXT
    END;
    
    v_val := v_social_item->>'url';
    IF v_val IS NOT NULL AND v_val != '' THEN
      PERFORM set_custom_field_value(v_lead_id, v_workspace_id, v_field_name, v_val, 'url');
      v_social_index := v_social_index + 1;
    END IF;
  END LOOP;
END IF;
```

**Características:**
- ✅ Itera sobre arrays JSONB usando `jsonb_array_elements()`
- ✅ Cria campos individuais numerados (`Scraping Email 1`, `Scraping Email 2`, etc.)
- ✅ Extrai apenas valores relevantes (`address` para emails, `number` para telefones, `url` para redes sociais)
- ✅ Valida valores antes de salvar (não salva NULL ou vazio)
- ✅ Usa tipos corretos de campo (`email`, `phone`, `url`)

---

## 📊 Estrutura dos Dados de Scraping

### Formato Original (JSONB):

```json
{
  "emails": [
    {
      "type": "main",
      "source": "scraping",
      "address": "contato@hhsobrinho.com.br",
      "verified": false
    }
  ],
  "phones": [
    {
      "number": "(21) 2411-4678",
      "source": "scraping",
      "verified": false
    }
  ],
  "social_media": [
    {
      "url": "https://pt-br.facebook.com/hhsobrinho/",
      "type": "social",
      "source": "scraping",
      "platform": "facebook"
    },
    {
      "url": "https://www.instagram.com/h.h.sobrinho/",
      "type": "social",
      "source": "scraping",
      "platform": "instagram"
    }
  ]
}
```

### Formato Parseado (Custom Fields):

| Campo | Valor | Tipo |
|-------|-------|------|
| `Scraping Email 1` | `contato@hhsobrinho.com.br` | `email` |
| `Scraping Telefone 1` | `(21) 2411-4678` | `phone` |
| `Scraping Rede Social 1` | `https://pt-br.facebook.com/hhsobrinho/` | `url` |
| `Scraping Rede Social 2` | `https://www.instagram.com/h.h.sobrinho/` | `url` |

---

## 🔄 Como Funciona Agora

### Fluxo de Parsing:

1. **Buscar dados de scraping:**
   - Carrega `scraping_data` JSONB do `lead_extraction_staging`

2. **Parsear emails:**
   - Itera sobre `scraping_data->'emails'`
   - Extrai `address` de cada item
   - Cria campos `Scraping Email 1`, `Scraping Email 2`, etc.

3. **Parsear telefones:**
   - Itera sobre `scraping_data->'phones'`
   - Extrai `number` de cada item
   - Cria campos `Scraping Telefone 1`, `Scraping Telefone 2`, etc.

4. **Parsear redes sociais:**
   - Itera sobre `scraping_data->'social_media'`
   - Extrai `url` de cada item
   - Cria campos `Scraping Rede Social 1`, `Scraping Rede Social 2`, etc.

---

## ✅ Resultados

### Antes da Correção:
- ❌ `Scraping Emails` = JSON string completo
- ❌ `Scraping Telefones` = JSON string completo
- ❌ Dados não utilizáveis diretamente no CRM
- ❌ Difícil de filtrar ou buscar

### Depois da Correção:
- ✅ `Scraping Email 1` = email individual parseado
- ✅ `Scraping Telefone 1` = telefone individual parseado
- ✅ `Scraping Rede Social 1`, `2`, etc. = URLs individuais
- ✅ Dados utilizáveis diretamente no CRM
- ✅ Fácil de filtrar, buscar e usar em campanhas

---

## 🎯 Benefícios

1. ✅ **Dados Utilizáveis:** Campos individuais podem ser usados diretamente no CRM
2. ✅ **Filtros e Buscas:** Possível filtrar por email ou telefone específico
3. ✅ **Campanhas:** Fácil usar emails parseados em campanhas de email marketing
4. ✅ **Validação:** Tipos corretos (`email`, `phone`, `url`) permitem validação automática
5. ✅ **Escalável:** Suporta múltiplos emails, telefones e redes sociais

---

## 📝 Custom Fields Criados Automaticamente

A função `set_custom_field_value()` cria automaticamente os campos se não existirem:

- `Scraping Email 1`, `Scraping Email 2`, `Scraping Email 3`, ...
- `Scraping Telefone 1`, `Scraping Telefone 2`, `Scraping Telefone 3`, ...
- `Scraping Rede Social 1`, `Scraping Rede Social 2`, `Scraping Rede Social 3`, ...

**Tipos de campo:**
- Emails: `email` (permite validação de formato)
- Telefones: `phone` (permite formatação automática)
- Redes Sociais: `url` (permite validação de URL)

---

## ✅ Status Final

- ✅ Função `sync_staging_to_lead_custom_fields()` corrigida
- ✅ Parsing de emails implementado
- ✅ Parsing de telefones implementado
- ✅ Parsing de redes sociais implementado
- ✅ Lead HH Sobrinho corrigido: campos individuais criados ✅

**Problema resolvido!** 🎉

