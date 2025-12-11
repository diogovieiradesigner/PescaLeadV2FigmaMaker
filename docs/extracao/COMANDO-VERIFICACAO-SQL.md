# 🔍 Comando de Verificação: Função SQL

## 📋 Verificar se Migração SQL Foi Aplicada

Execute este comando no **SQL Editor** do Supabase Dashboard:

```sql
-- Verificar se função increment_segmented_searches_completed existe
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'increment_segmented_searches_completed';
```

---

## ✅ RESULTADO ESPERADO

### **Se a função EXISTE (✅ OK):**
```
function_name                              | function_definition
-------------------------------------------+-------------------
increment_segmented_searches_completed    | CREATE OR REPLACE FUNCTION increment_segmented_searches_completed...
```

**Ação:** ✅ Nada a fazer - migração já foi aplicada!

---

### **Se a função NÃO EXISTE (⚠️ PROBLEMA):**
```
(0 rows)
```

**Ação:** ⚠️ **APLICAR MIGRAÇÃO AGORA!**

---

## 🚨 SE A FUNÇÃO NÃO EXISTIR

### **Aplicar Migração via SQL Editor:**

1. Ir em **SQL Editor** no Dashboard Supabase
2. Copiar e colar este código:

```sql
-- =============================================================================
-- FUNÇÃO SQL: increment_segmented_searches_completed
-- =============================================================================
-- V16: Incrementa atomicamente o campo segmented_searches_completed em progress_data
-- Resolve race condition quando múltiplas páginas segmentadas processam simultaneamente
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_segmented_searches_completed(p_run_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_value INTEGER;
BEGIN
  -- Incremento atômico usando UPDATE com RETURNING
  UPDATE lead_extraction_runs
  SET progress_data = jsonb_set(
    progress_data,
    '{segmented_searches_completed}',
    to_jsonb(
      COALESCE((progress_data->>'segmented_searches_completed')::INTEGER, 0) + 1
    )
  )
  WHERE id = p_run_id
  RETURNING (progress_data->>'segmented_searches_completed')::INTEGER INTO v_new_value;
  
  -- Se não encontrou o registro, retornar 0
  IF v_new_value IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN v_new_value;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION increment_segmented_searches_completed(UUID) IS 
'V16: Incrementa atomicamente segmented_searches_completed em progress_data para evitar race conditions';
```

3. Clicar em **RUN** ou **Execute**

---

## ✅ APÓS APLICAR

Execute novamente a verificação:

```sql
SELECT proname FROM pg_proc 
WHERE proname = 'increment_segmented_searches_completed';
```

**Deve retornar 1 linha!**

---

## 🎯 RESUMO

**Status Atual:**
- ✅ `fetch-overpass-coordinates` - DEPLOYADO
- ✅ `fetch-google-maps` - DEPLOYADO
- ⚠️ **Migração SQL - VERIFICAR AGORA!**

**Ação Imediata:** Execute o comando de verificação acima!

