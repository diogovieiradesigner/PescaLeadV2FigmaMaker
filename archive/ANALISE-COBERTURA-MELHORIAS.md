# 📋 Análise: Cobertura das Melhorias para Erros Identificados

## 🎯 Erros Identificados nas Extrações

### **Erro 1: Extração com status `running` mas `finished_at` preenchido**
- **Exemplo:** Restaurantes 10:20 (`c4826ce3-dcd9-498e-9ffc-513083593b22`)
- **Sintoma:** Frontend mostra "Executando" mas extração já finalizou
- **Causa:** `fetch-google-maps` pode ter definido `finished_at` sem atualizar status corretamente

### **Erro 2: Extrações em `enriching` que não finalizam automaticamente**
- **Sintoma:** Extrações ficam em `enriching` mesmo quando todos os leads completam
- **Causa:** Não havia processo que verificava quando último lead completava

### **Erro 3: Leads com status errado (não precisam de enriquecimento)**
- **Sintoma:** Leads sem domínio `.br`, CNPJ ou website ficavam pendentes
- **Causa:** Sistema não identificava que esses leads não precisavam de enriquecimento

---

## ✅ Melhorias Implementadas

### **1. Trigger Automático de Finalização** ✅

**Função:** `finalize_extraction_if_enrichment_complete()`
- ✅ Executa quando `status_enrichment` muda para `'completed'`
- ✅ Verifica se todos os leads completaram
- ✅ Finaliza automaticamente se não há pendentes
- ✅ Cobre **Erro 2** completamente

**Trigger:** `trg_finalize_extraction_on_enrichment_complete`
- ✅ Dispara após UPDATE em `lead_extraction_staging`
- ✅ Apenas quando status muda para `'completed'`

---

### **2. Função RPC para Correção** ✅

**Função:** `finalize_stuck_enriching_extractions()`
- ✅ Corrige extrações já travadas em `'enriching'`
- ✅ Pode ser executada manualmente ou por cron job
- ✅ Cobre **Erro 2** para casos históricos

---

### **3. Correção de Leads com Status Errado** ✅

**Correção aplicada:**
- ✅ 1.442 leads corrigidos (atualizados para `'completed'`)
- ✅ Leads sem campos para enriquecer agora têm status correto
- ✅ Cobre **Erro 3** para casos históricos

**⚠️ Limitação:** Não há proteção automática para evitar que isso aconteça novamente no futuro.

---

## ⚠️ Casos NÃO Cobertos

### **Erro 1: Status `running` com `finished_at` preenchido**

**Análise do código `fetch-google-maps`:**
- ✅ Todas as atualizações de `finished_at` também atualizam `status` corretamente
- ✅ Não encontrei casos onde `finished_at` é definido sem atualizar `status`

**Possíveis causas:**
1. ❓ Race condition entre múltiplas execuções simultâneas
2. ❓ Erro durante execução que interrompeu antes de atualizar status
3. ❓ Atualização manual no banco de dados

**Proteção atual:**
- ❌ **NÃO HÁ** trigger ou constraint que impeça `finished_at` sem `status = 'completed'`
- ❌ **NÃO HÁ** função que corrija automaticamente esse estado inconsistente

**Recomendação:**
- ⚠️ Adicionar constraint ou trigger que valide consistência entre `status` e `finished_at`
- ⚠️ Adicionar função RPC para corrigir runs com estado inconsistente

---

## 📊 Resumo de Cobertura

| Erro | Cobertura Automática | Cobertura Manual | Status |
|------|---------------------|------------------|--------|
| **Erro 2:** `enriching` não finaliza | ✅ Trigger automático | ✅ Função RPC | ✅ **COBERTO** |
| **Erro 3:** Leads com status errado | ❌ Não há proteção | ✅ Correção aplicada | ⚠️ **PARCIAL** |
| **Erro 1:** `running` com `finished_at` | ❌ Não há proteção | ❌ Não há função | ❌ **NÃO COBERTO** |

---

## 🔧 Recomendações Adicionais

### **1. Adicionar Constraint/Trigger para Erro 1**

```sql
-- Constraint que valida consistência entre status e finished_at
ALTER TABLE lead_extraction_runs
ADD CONSTRAINT check_status_finished_at_consistency
CHECK (
  (status = 'completed' AND finished_at IS NOT NULL)
  OR
  (status IN ('running', 'enriching', 'failed', 'cancelled') AND finished_at IS NULL)
  OR
  (status = 'completed' AND finished_at IS NULL) -- Permite completed sem finished_at temporariamente
);
```

**OU** criar trigger que corrige automaticamente:

```sql
CREATE OR REPLACE FUNCTION fix_inconsistent_run_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se finished_at está preenchido mas status não é completed, corrigir
  IF NEW.finished_at IS NOT NULL 
     AND NEW.status NOT IN ('completed', 'failed', 'cancelled') 
     AND NEW.completed_steps = 9 THEN
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fix_inconsistent_run_status
BEFORE UPDATE ON lead_extraction_runs
FOR EACH ROW
WHEN (OLD.finished_at IS NULL AND NEW.finished_at IS NOT NULL)
EXECUTE FUNCTION fix_inconsistent_run_status();
```

### **2. Adicionar Função RPC para Corrigir Erro 1**

```sql
CREATE OR REPLACE FUNCTION fix_runs_with_inconsistent_status()
RETURNS TABLE(
  run_id UUID,
  run_name TEXT,
  old_status TEXT,
  fixed BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_run RECORD;
BEGIN
  FOR v_run IN 
    SELECT id, run_name, status, finished_at, completed_steps
    FROM lead_extraction_runs
    WHERE finished_at IS NOT NULL
      AND status NOT IN ('completed', 'failed', 'cancelled')
      AND completed_steps = 9
  LOOP
    UPDATE lead_extraction_runs
    SET status = 'completed'
    WHERE id = v_run.id;
    
    RETURN QUERY SELECT 
      v_run.id,
      v_run.run_name,
      v_run.status,
      TRUE,
      'finished_at preenchido mas status incorreto'::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### **3. Melhorar Proteção para Erro 3**

Adicionar validação nas Edge Functions que atualizam `status_enrichment` para garantir que leads que não precisam de enriquecimento sejam marcados como `completed` imediatamente.

---

## ✅ Conclusão

**Status Atual:**
- ✅ **Erro 2:** Completamente coberto (trigger automático + função RPC)
- ⚠️ **Erro 3:** Coberto para casos históricos, mas sem proteção automática futura
- ❌ **Erro 1:** Não coberto - precisa de proteção adicional

**Próximos Passos Recomendados:**
1. Implementar constraint/trigger para Erro 1
2. Criar função RPC para corrigir Erro 1 em casos históricos
3. Adicionar validação nas Edge Functions para Erro 3

