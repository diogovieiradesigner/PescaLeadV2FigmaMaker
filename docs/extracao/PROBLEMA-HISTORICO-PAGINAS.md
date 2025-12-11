# ⚠️ Problema Identificado: Histórico de Páginas

## 🔍 Análise da Função SQL

### **Função Atual: `get_last_page_for_search`**

**Código atual:**
```sql
SELECT COALESCE(SUM(pages_consumed), 0)
INTO last_page
FROM lead_extraction_runs
WHERE workspace_id = p_workspace_id
  AND LOWER(TRIM(search_term)) = LOWER(TRIM(p_search_term))
  AND LOWER(TRIM(location)) = LOWER(TRIM(p_location))
  AND pages_consumed > 0;
```

**Problema:** ❌ **ESTÁ SOMANDO** `pages_consumed` de todas as extrações!

---

## 🐛 PROBLEMA IDENTIFICADO

### **Exemplo do Problema:**

**Extração 1:**
- `pages_consumed: 15`
- Terminou na página 4

**Extração 2:**
- `pages_consumed: 10`
- Terminou na página 19

**Extração 3:**
- `pages_consumed: 41`
- Terminou na página 41

**O que a função retorna:**
- `SUM(pages_consumed) = 15 + 10 + 41 = 66` ❌ **ERRADO!**

**O que deveria retornar:**
- `MAX(página processada) = 41` ✅ **CORRETO!**

**Resultado:**
- Nova extração começaria na página 67 (ERRADO!)
- Deveria começar na página 42 (CORRETO!)

---

## ⚠️ PROBLEMAS ADICIONAIS

### **1. Não Considera Compensação e Expansão**

A função atual usa apenas `pages_consumed`, mas deveria considerar:
- ✅ `last_page_target` (páginas iniciais)
- ❌ `last_compensation_page` (compensação) - **NÃO CONSIDERA**
- ❌ `last_filter_compensation_page` (compensação por filtros) - **NÃO CONSIDERA**
- ❌ Páginas de expansão segmentada - **NÃO CONSIDERA**

**Exemplo:**
- Extração processou páginas 1-10 (iniciais)
- Depois processou páginas 11-20 (compensação)
- `pages_consumed` pode ser 20
- Mas `last_compensation_page` = 20
- Função deveria retornar 20, não 20 (neste caso funciona, mas não considera expansão)

---

## ✅ SOLUÇÃO NECESSÁRIA

### **Corrigir Função SQL:**

A função deve retornar a **MÁXIMA página processada**, considerando:
1. `last_page_target` (páginas iniciais)
2. `last_compensation_page` (compensação)
3. `last_filter_compensation_page` (compensação por filtros)
4. Páginas de expansão segmentada (se houver)

**Nova função:**
```sql
CREATE OR REPLACE FUNCTION get_last_page_for_search(
  p_workspace_id UUID,
  p_search_term TEXT,
  p_location TEXT
)
RETURNS INTEGER AS $$
DECLARE
  max_page INTEGER := 0;
BEGIN
  SELECT MAX(
    GREATEST(
      COALESCE((progress_data->>'last_page_target')::INTEGER, 0),
      COALESCE((progress_data->>'last_compensation_page')::INTEGER, 0),
      COALESCE((progress_data->>'last_filter_compensation_page')::INTEGER, 0),
      pages_consumed
    )
  )
  INTO max_page
  FROM lead_extraction_runs
  WHERE workspace_id = p_workspace_id
    AND LOWER(TRIM(search_term)) = LOWER(TRIM(p_search_term))
    AND LOWER(TRIM(location)) = LOWER(TRIM(p_location))
    AND status IN ('completed', 'cancelled', 'failed')
    AND pages_consumed > 0;
  
  RETURN COALESCE(max_page, 0);
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 VALIDAÇÃO COM DADOS REAIS

### **Teste da Função Atual:**

**Resultado:** `66` (SOMA de todas as páginas consumidas) ❌

**Deveria retornar:** `41` (MÁXIMA página processada) ✅

**Diferença:** 25 páginas a mais!

---

## 🎯 IMPACTO

**Se não corrigir:**
- Nova extração começaria na página 67
- Deveria começar na página 42
- **25 páginas seriam puladas!**
- Leads seriam perdidos

---

## ✅ AÇÃO NECESSÁRIA

**Corrigir função SQL `get_last_page_for_search`** para:
1. ✅ Retornar MÁXIMA página (não soma)
2. ✅ Considerar compensação
3. ✅ Considerar compensação por filtros
4. ✅ Considerar expansão segmentada (se implementado)

