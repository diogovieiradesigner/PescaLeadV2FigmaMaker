# 🔍 Análise: Mover Lead Durante Extração

## 🎯 Cenário da Pergunta

**Situação:**
1. Extração está rodando
2. Leads estão sendo enriquecidos (em `lead_extraction_staging`)
3. **No meio da extração**, usuário move um lead manualmente para outro kanban
4. **O que acontece quando o lead for migrado?**

---

## 🔍 Análise do Fluxo

### **1. Estado Inicial do Lead**

**Enquanto está enriquecendo:**
- ✅ Lead está em `lead_extraction_staging`
- ✅ `migrated_at = NULL` (ainda não migrado)
- ✅ `migrated_lead_id = NULL` (ainda não tem ID no kanban)
- ✅ `status_enrichment = 'enriching'` ou `'pending'`

**⚠️ IMPORTANTE:** O lead **NÃO EXISTE** na tabela `leads` ainda!

---

### **2. O que Significa "Mover Lead Manualmente"?**

**Possibilidades:**

#### **Cenário A: Lead já foi migrado antes** ✅ (Mais Provável)

1. Lead foi migrado → existe na tabela `leads`
2. Usuário move manualmente para outro kanban
3. Função de migração tenta migrar novamente

**O que acontece:**
- ✅ Função busca leads com `migrated_at IS NULL`
- ✅ Se `migrated_at` já está preenchido, **não será migrado novamente**
- ✅ Lead permanece no kanban onde foi movido manualmente

**Resultado:** ✅ **Nada acontece** - Lead não será migrado novamente

---

#### **Cenário B: Lead ainda não foi migrado** ⚠️ (Menos Provável)

1. Lead está em `lead_extraction_staging` (não existe em `leads`)
2. Usuário tenta mover manualmente

**O que acontece:**
- ❌ **Não é possível mover** - Lead não existe no kanban ainda
- ✅ Lead só aparece no kanban **depois** da migração

**Resultado:** ✅ **Não é possível mover** - Lead não existe no kanban

---

## 🔍 Análise da Função de Migração

### **Código Atual:**

```sql
-- Busca leads prontos para migrar
SELECT 
  s.*,
  ...
FROM lead_extraction_staging s
WHERE s.should_migrate = true
  AND s.migrated_at IS NULL  -- ✅ Só migra se ainda não foi migrado
  AND s.status_extraction = 'google_fetched'
LIMIT 200
```

**Proteção:**
- ✅ `migrated_at IS NULL` → Só migra leads que ainda não foram migrados
- ✅ Se `migrated_at` já está preenchido, lead não será processado

---

### **O que Acontece na Migração:**

```sql
INSERT INTO leads (
  workspace_id,
  funnel_id,      -- ✅ Usa original_funnel_id do run
  column_id,      -- ✅ Usa original_column_id do run
  ...
) VALUES (...)
RETURNING id INTO v_new_lead_id;

UPDATE lead_extraction_staging
SET 
  migrated_at = NOW(),           -- ✅ Marca como migrado
  migrated_lead_id = v_new_lead_id,  -- ✅ Guarda ID do lead criado
  ...
WHERE id = v_lead.id;
```

**Se lead já foi migrado:**
- ✅ `migrated_at` já está preenchido
- ✅ Lead não será buscado pela função
- ✅ Nada acontece

---

## 💡 Resposta Direta

### **Cenário Realista:**

**Se você mover um lead manualmente durante a extração:**

1. ✅ **Se o lead já foi migrado:**
   - Lead já existe na tabela `leads`
   - `migrated_at` já está preenchido
   - Função de migração **não tentará migrar novamente**
   - Lead permanece no kanban onde você moveu

2. ✅ **Se o lead ainda não foi migrado:**
   - Lead não existe na tabela `leads` ainda
   - **Não é possível mover** (lead não aparece no kanban)
   - Quando for migrado, será criado no kanban configurado (`original_funnel_id` e `original_column_id`)

---

## ⚠️ Possível Problema Identificado

### **Cenário de Conflito:**

**Se houver algum problema e a função tentar migrar um lead que já existe:**

```sql
INSERT INTO leads (...) VALUES (...)
-- ❌ Se lead já existe (mesmo ID ou constraint UNIQUE), haverá ERRO
```

**Mas isso não acontece porque:**
- ✅ Função só busca leads com `migrated_at IS NULL`
- ✅ Após migrar, `migrated_at` é preenchido
- ✅ Lead não será migrado novamente

---

## 🔍 Verificações Necessárias

### **1. Verificar se há Constraint UNIQUE**

**Query:**
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'leads'
  AND constraint_type = 'UNIQUE';
```

**Resultado:** Apenas `PRIMARY KEY` em `id` (UUID único)

**Conclusão:** Não há constraint UNIQUE que previne duplicatas por conteúdo.

---

### **2. Verificar Proteção na Função**

**Código atual:**
```sql
WHERE s.migrated_at IS NULL  -- ✅ Proteção contra re-migração
```

**Conclusão:** ✅ **Proteção existe** - Leads já migrados não serão migrados novamente.

---

## 📋 Resumo

| Cenário | O que Acontece | Status |
|---------|----------------|--------|
| **Lead já migrado + movido manualmente** | Função não tenta migrar novamente | ✅ **Seguro** |
| **Lead ainda não migrado** | Não é possível mover (não existe no kanban) | ✅ **Seguro** |
| **Lead migrado + função tenta migrar novamente** | Não acontece (proteção `migrated_at IS NULL`) | ✅ **Protegido** |

---

## ✅ Conclusão

**Resposta:** 

✅ **Não há problema!**

1. Se você mover um lead manualmente durante a extração:
   - Se já foi migrado → Função não tentará migrar novamente
   - Se ainda não foi migrado → Não é possível mover (não existe no kanban)

2. A função de migração tem proteção:
   - ✅ Só migra leads com `migrated_at IS NULL`
   - ✅ Após migrar, marca `migrated_at = NOW()`
   - ✅ Lead não será migrado novamente

3. O lead permanecerá no kanban onde você moveu:
   - ✅ Se foi movido manualmente, permanece lá
   - ✅ Função não sobrescreve posição manual

---

**Status:** ✅ **SISTEMA PROTEGIDO - Nenhum problema identificado**

