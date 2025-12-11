# 🚨 AÇÃO NECESSÁRIA: Aplicar Migração SQL

## ⚠️ STATUS ATUAL

**Resultado da Verificação:** "Success. No rows returned"
**Significado:** A função `increment_segmented_searches_completed` **NÃO EXISTE** no banco de dados.

---

## ✅ SOLUÇÃO: APLICAR MIGRAÇÃO AGORA

### **Você já tem o arquivo aberto!**

O arquivo `create_increment_segmented_searches_completed.sql` já está aberto no seu editor.

### **Passos para Aplicar:**

1. **Selecione TODO o conteúdo** do arquivo SQL (Ctrl+A)
2. **Copie** (Ctrl+C)
3. **Cole** no SQL Editor do Supabase Dashboard
4. **Execute** (clicar em "RUN" ou pressionar Ctrl+Enter)

---

## 📋 CONTEÚDO DO ARQUIVO (já está aberto)

O arquivo contém:

```sql
CREATE OR REPLACE FUNCTION increment_segmented_searches_completed(p_run_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_value INTEGER;
BEGIN
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
  
  IF v_new_value IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN v_new_value;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_segmented_searches_completed(UUID) IS 
'V16: Incrementa atomicamente segmented_searches_completed em progress_data para evitar race conditions';
```

---

## ✅ APÓS APLICAR

Execute novamente a verificação:

```sql
SELECT proname 
FROM pg_proc 
WHERE proname = 'increment_segmented_searches_completed';
```

**Resultado Esperado:**
- ✅ Deve retornar **1 linha** com o nome da função
- ✅ Mensagem: "Success. 1 row returned"

---

## 🎯 RESUMO

**Status Atual:**
- ✅ Edge Functions deployadas
- ❌ **Migração SQL NÃO aplicada** ← **CORRIGIR AGORA!**

**Ação Imediata:**
1. Copiar conteúdo do arquivo SQL aberto
2. Colar no SQL Editor do Supabase
3. Executar
4. Verificar novamente

---

## ⚠️ IMPORTANTE

**Sem esta função SQL, o sistema pode ter:**
- ❌ Race conditions na contagem
- ❌ Finalização incorreta de extrações
- ❌ Dados inconsistentes

**Aplique AGORA antes de usar o sistema!**

