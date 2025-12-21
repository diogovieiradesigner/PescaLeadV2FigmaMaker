# 🔧 Correção: Guardar Configuração Original de Kanban no Run

## 🎯 Problema Identificado

**Situação:**
- Cliente configurou extração para criar leads no kanban **"Emails Gih"**
- Executou extração (09:03 e 09:07)
- Alguém alterou configuração para **"teste"** (antes da migração)
- Leads foram criados no kanban **"teste"** (errado)

**Causa Raiz:**
A função `migrate_leads_with_custom_values()` usa a configuração **ATUAL** da extração (`lead_extractions.funnel_id` e `lead_extractions.column_id`), não a configuração que estava quando o run foi criado.

**Se a configuração mudar entre o início do run e a migração dos leads, os leads serão criados no kanban errado.**

---

## ✅ Solução Implementada

### **1. Novos Campos no Run**

Adicionados campos `original_funnel_id` e `original_column_id` na tabela `lead_extraction_runs`:

```sql
ALTER TABLE lead_extraction_runs
ADD COLUMN original_funnel_id UUID,
ADD COLUMN original_column_id UUID;
```

**Características:**
- ✅ Guardam a configuração que estava quando o run foi criado
- ✅ Não mudam mesmo se a configuração da extração for alterada depois
- ✅ Usados pela função de migração para garantir kanban correto

---

### **2. Trigger Automático**

Criado trigger `trg_set_original_funnel_column` que:

1. ✅ Executa **antes** de inserir nova run
2. ✅ Busca `funnel_id` e `column_id` da configuração atual da extração
3. ✅ Popula `original_funnel_id` e `original_column_id` automaticamente
4. ✅ Permite override manual se necessário

**Código:**
```sql
CREATE OR REPLACE FUNCTION set_original_funnel_column()
RETURNS TRIGGER AS $$
DECLARE
  v_funnel_id UUID;
  v_column_id UUID;
BEGIN
  -- Buscar configuração atual da extração
  SELECT le.funnel_id, le.column_id
  INTO v_funnel_id, v_column_id
  FROM lead_extractions le
  WHERE le.id = NEW.extraction_id;
  
  -- Popular campos originais
  NEW.original_funnel_id := COALESCE(NEW.original_funnel_id, v_funnel_id);
  NEW.original_column_id := COALESCE(NEW.original_column_id, v_column_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### **3. Função de Migração Modificada**

**Antes:**
```sql
-- ❌ Usava configuração ATUAL da extração
SELECT 
  e.funnel_id,    -- Configuração atual
  e.column_id     -- Configuração atual
FROM lead_extraction_staging s
JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
JOIN lead_extractions e ON e.id = r.extraction_id  -- Config ATUAL
```

**Depois:**
```sql
-- ✅ Usa configuração ORIGINAL do run
SELECT 
  r.original_funnel_id,  -- Configuração original (quando run foi criado)
  r.original_column_id   -- Configuração original (quando run foi criado)
FROM lead_extraction_staging s
JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
JOIN lead_extractions e ON e.id = r.extraction_id
```

**Fallback:** Se `original_funnel_id` ou `original_column_id` forem NULL (runs antigas), usa configuração atual da extração.

---

### **4. Backfill de Runs Existentes**

Runs existentes que não têm `original_funnel_id` e `original_column_id` são populados com a configuração atual da extração:

```sql
UPDATE lead_extraction_runs ler
SET 
  original_funnel_id = COALESCE(ler.original_funnel_id, le.funnel_id),
  original_column_id = COALESCE(ler.original_column_id, le.column_id)
FROM lead_extractions le
WHERE ler.extraction_id = le.id
  AND (ler.original_funnel_id IS NULL OR ler.original_column_id IS NULL);
```

---

## 🔍 Como Funciona Agora

### **Fluxo Completo:**

1. ✅ **Cliente cria run de extração**
   - Trigger `trg_set_original_funnel_column` executa
   - `original_funnel_id` e `original_column_id` são populados com valores da config atual

2. ✅ **Extração processa leads**
   - Leads são criados em `lead_extraction_staging`
   - Aguardam enriquecimento

3. ✅ **Configuração pode mudar** (não afeta mais!)
   - Cliente altera `funnel_id` e `column_id` da extração
   - Mas `original_funnel_id` e `original_column_id` do run **não mudam**

4. ✅ **Migração dos leads**
   - Função `migrate_leads_with_custom_values()` usa `original_funnel_id` e `original_column_id` do run
   - Leads são criados no kanban **correto** (o que estava configurado quando o run foi criado)

---

## 📊 Benefícios

| Benefício | Descrição |
|-----------|-----------|
| ✅ **Consistência** | Leads sempre vão para o kanban que estava configurado quando o run foi criado |
| ✅ **Prevenção** | Evita problemas futuros mesmo se configuração mudar |
| ✅ **Rastreabilidade** | Sabemos exatamente qual kanban estava configurado quando o run foi criado |
| ✅ **Backward Compatible** | Runs antigas funcionam com fallback para config atual |

---

## 🧪 Testes Recomendados

### **Teste 1: Run Nova**
1. Criar run de extração com kanban "A"
2. Alterar configuração para kanban "B"
3. Migrar leads
4. ✅ Verificar que leads foram para kanban "A" (original)

### **Teste 2: Run Antiga**
1. Usar run existente sem `original_funnel_id`
2. Migrar leads
3. ✅ Verificar que usa configuração atual (fallback)

### **Teste 3: Override Manual**
1. Criar run com `original_funnel_id` definido manualmente
2. ✅ Verificar que trigger não sobrescreve valor manual

---

## 📋 Arquivos Modificados

1. ✅ `supabase/migrations/add_original_funnel_column_to_runs.sql` - Migration completa
2. ✅ `docs/extracao/CORRECAO-KANBAN-ORIGINAL-CONFIG.md` - Esta documentação

---

**Status:** ✅ **IMPLEMENTADO - Pronto para deploy**

**Próximo passo:** Aplicar migration no Supabase

