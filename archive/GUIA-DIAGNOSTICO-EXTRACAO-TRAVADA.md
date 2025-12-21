# 🔍 Guia Completo: Diagnóstico e Solução para Extração Travada

## 📋 Situação Atual

**Status:** Em andamento há 4h 37min  
**Progresso:** 13 de 40 leads (33%)  
**Duplicados:** 50 de 60 encontrados (83%)  
**Rejeitados:** 27 de 60 encontrados (45%)

---

## 🔍 DIAGNÓSTICO PASSO A PASSO

### **PASSO 1: Identificar UUID da Extração**

No dashboard, copie o UUID da extração travada (geralmente visível na URL ou nos detalhes).

---

### **PASSO 2: Executar Queries de Diagnóstico**

Abra o **SQL Editor** do Supabase e execute as queries do arquivo:
**`QUERIES-DIAGNOSTICO-EXTRACAO-TRAVADA.sql`**

**Substitua `'UUID-DA-EXTRACAO-AQUI'` pelo UUID real da extração.**

---

### **PASSO 3: Analisar Resultados**

#### **Query 1: Status da Extração**
- Verificar `status`, `percentage`, `current_step`
- Verificar `progress_data` para entender o estado interno

#### **Query 2: Mensagens na Fila**
- **Se retornar 0 linhas:** Mensagens foram perdidas/expiradas
- **Se retornar linhas:** Verificar `minutes_old` - se > 30min, mensagens podem estar travadas

#### **Query 3: Logs**
- Verificar última atividade
- Verificar se há erros ou avisos

#### **Query 4: Progress Data**
- Verificar `api_exhausted` - se `true`, API esgotou resultados
- Verificar `compensation_count` - quantas compensações foram tentadas
- Verificar `compensation_enqueued_at` - quando última compensação foi enfileirada

---

## 🎯 CAUSAS POSSÍVEIS

### **Causa 1: Mensagens Perdidas na Fila** ⚠️ MAIS PROVÁVEL

**Sintomas:**
- Query 2 retorna 0 linhas OU mensagens com `minutes_old > 30`
- `compensation_enqueued_at` existe mas mensagens não estão na fila
- Última atividade foi há mais de 30 minutos

**Solução:**
- Esta extração foi criada **ANTES** das melhorias V15
- V15 adiciona detecção automática de mensagens perdidas
- **Solução:** Finalizar manualmente (Opção 1 abaixo)

---

### **Causa 2: API Esgotou Mas Não Finalizou**

**Sintomas:**
- `api_exhausted = true` no progress_data
- `percentage < 90%` (33% no seu caso)
- Não tentou compensação ou compensação falhou

**Solução:**
- Sistema só finaliza quando `percentage >= 90%`
- Como está em 33%, não finaliza automaticamente
- **Solução:** Finalizar manualmente (Opção 1 abaixo)

---

### **Causa 3: Compensação Enfileirada Mas Não Processada**

**Sintomas:**
- `compensation_pages_queued` tem valores
- Mensagens na fila com `minutes_old > 30`
- `compensation_count` não aumentou

**Solução:**
- Mensagens podem ter expirado na fila
- **Solução:** Deletar mensagens antigas e finalizar (Opção 3 abaixo)

---

## 🛠️ SOLUÇÕES

### **SOLUÇÃO 1: Finalizar Manualmente (RECOMENDADO)**

Se a extração não consegue mais progredir:

1. Execute no SQL Editor:
```sql
UPDATE lead_extraction_runs
SET 
  status = 'completed',
  completed_at = COALESCE(completed_at, NOW()),
  finished_at = COALESCE(finished_at, NOW()),
  execution_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
  current_step = 'Finalizada manualmente - API esgotou resultados ou mensagens perdidas',
  completed_steps = 9,
  total_steps = 9,
  progress_data = jsonb_set(
    COALESCE(progress_data, '{}'::jsonb),
    '{final_reason}',
    '"finalizada_manualmente_api_esgotou"'
  )
WHERE id = 'UUID-DA-EXTRACAO-AQUI'  -- SUBSTITUIR PELO UUID REAL
  AND status = 'running';
```

2. Verificar se funcionou:
```sql
SELECT status, completed_at, current_step 
FROM lead_extraction_runs 
WHERE id = 'UUID-DA-EXTRACAO-AQUI';
```

---

### **SOLUÇÃO 2: Deletar Mensagens Perdidas (Se necessário)**

Se há mensagens antigas na fila que não serão processadas:

```sql
DELETE FROM pgmq.google_maps_queue
WHERE message->>'run_id' = 'UUID-DA-EXTRACAO-AQUI'
  AND enqueued_at < NOW() - INTERVAL '2 hours';
```

**ATENÇÃO:** Execute apenas se tiver certeza de que as mensagens não serão mais processadas.

---

## ⚠️ IMPORTANTE

### **Por que esta extração travou?**

Esta extração foi criada **ANTES** das melhorias V15 e V16:

- ❌ **Não tem** detecção automática de mensagens perdidas (V15)
- ❌ **Não tem** timeout automático para buscas segmentadas (V16)
- ❌ **Não tem** expansão por coordenadas automática (V16)
- ❌ **Não tem** finalização automática quando mensagens são perdidas

**Soluções V15/V16** só se aplicam a **novas extrações** criadas após os deploys.

---

## 📋 CHECKLIST DE AÇÃO

- [ ] Identificar UUID da extração
- [ ] Executar queries de diagnóstico
- [ ] Analisar resultados
- [ ] Identificar causa raiz
- [ ] Aplicar solução apropriada
- [ ] Verificar se extração foi finalizada
- [ ] Monitorar novas extrações para garantir que não repetem

---

## 🎯 PRÓXIMOS PASSOS

1. **Agora:** Diagnosticar e finalizar extração travada
2. **Depois:** Criar nova extração para testar melhorias V15/V16
3. **Monitorar:** Verificar se novas extrações finalizam corretamente

---

## 📝 ARQUIVOS CRIADOS

1. **`QUERIES-DIAGNOSTICO-EXTRACAO-TRAVADA.sql`** - Queries para diagnosticar
2. **`SOLUCAO-FINALIZAR-EXTRACAO-TRAVADA.sql`** - Soluções para finalizar
3. **`GUIA-DIAGNOSTICO-EXTRACAO-TRAVADA.md`** - Este guia completo

---

## ✅ CONCLUSÃO

**Ação Imediata:**
1. Execute as queries de diagnóstico
2. Identifique a causa raiz
3. Aplique a solução apropriada
4. Verifique se funcionou

**Prevenção Futura:**
- Novas extrações terão detecção automática de mensagens perdidas
- Novas extrações terão timeout automático
- Novas extrações terão expansão automática por coordenadas

