# ✅ Resposta: Mover Lead Durante Extração

## 🎯 Resposta Direta

**Não há problema!** O sistema está protegido contra esse cenário.

---

## 📋 Cenários Possíveis

### **Cenário 1: Lead já foi migrado e você move manualmente** ✅

**O que acontece:**
1. Lead foi migrado → existe na tabela `leads` com `migrated_at` preenchido
2. Você move manualmente para outro kanban → `funnel_id` e `column_id` são atualizados
3. Função de migração roda novamente

**Resultado:**
- ✅ Função busca apenas leads com `migrated_at IS NULL`
- ✅ Como `migrated_at` já está preenchido, lead **não será processado**
- ✅ Lead permanece no kanban onde você moveu
- ✅ **Nada acontece** - Sistema não interfere

---

### **Cenário 2: Lead ainda não foi migrado** ✅

**O que acontece:**
1. Lead está em `lead_extraction_staging` (enriquecendo)
2. Você tenta mover manualmente

**Resultado:**
- ❌ **Não é possível mover** - Lead não existe na tabela `leads` ainda
- ✅ Lead só aparece no kanban **depois** da migração
- ✅ Quando for migrado, será criado no kanban configurado (`original_funnel_id` e `original_column_id`)

---

## 🔍 Proteções do Sistema

### **1. Proteção na Função de Migração**

**Código:**
```sql
WHERE s.should_migrate = true
  AND s.migrated_at IS NULL  -- ✅ Só migra se ainda não foi migrado
  AND s.status_extraction = 'google_fetched'
```

**Resultado:**
- ✅ Leads já migrados (`migrated_at IS NOT NULL`) não são processados
- ✅ Não há risco de migração duplicada
- ✅ Não há risco de sobrescrever posição manual

---

### **2. Após Migração**

**Código:**
```sql
UPDATE lead_extraction_staging
SET 
  migrated_at = NOW(),           -- ✅ Marca como migrado
  migrated_lead_id = v_new_lead_id,  -- ✅ Guarda ID do lead criado
  ...
WHERE id = v_lead.id;
```

**Resultado:**
- ✅ Lead é marcado como migrado
- ✅ Próximas execuções da função não processarão este lead
- ✅ Lead pode ser movido manualmente sem interferência

---

## 💡 Resumo Visual

```
┌─────────────────────────────────────────────────────────┐
│  EXTRAÇÃO RODANDO                                       │
│                                                         │
│  1. Lead em lead_extraction_staging                    │
│     ├─ migrated_at = NULL                              │
│     ├─ status_enrichment = 'enriching'                  │
│     └─ NÃO existe na tabela leads ainda                │
│                                                         │
│  2. Lead é migrado → Criado na tabela leads            │
│     ├─ migrated_at = NOW()                             │
│     ├─ migrated_lead_id = [UUID do lead]               │
│     └─ funnel_id/column_id = original do run           │
│                                                         │
│  3. Você move manualmente para outro kanban            │
│     ├─ funnel_id/column_id são atualizados             │
│     └─ Lead permanece onde você moveu                  │
│                                                         │
│  4. Função de migração roda novamente                  │
│     ├─ Busca: migrated_at IS NULL                      │
│     ├─ Lead já tem migrated_at preenchido              │
│     └─ ❌ NÃO é processado novamente                   │
│                                                         │
│  ✅ RESULTADO: Lead permanece onde você moveu          │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Conclusão

**Resposta:** ✅ **Não há problema!**

1. ✅ **Se você mover um lead manualmente:**
   - Lead permanece onde você moveu
   - Função de migração não interfere
   - Sistema não sobrescreve posição manual

2. ✅ **Proteções existentes:**
   - Função só migra leads com `migrated_at IS NULL`
   - Após migrar, lead é marcado como migrado
   - Não há risco de migração duplicada

3. ✅ **Comportamento esperado:**
   - Lead pode ser movido livremente após migração
   - Sistema respeita movimentação manual
   - Não há conflito ou sobrescrita

---

**Status:** ✅ **SISTEMA PROTEGIDO - Nenhum problema identificado**

**Documentação:** `docs/extracao/ANALISE-MOVER-LEAD-DURANTE-EXTRACAO.md`

