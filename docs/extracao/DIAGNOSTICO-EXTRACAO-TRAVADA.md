# 🔍 Diagnóstico: Extração Travada

## 📋 Informações da Extração

**Status:** Em andamento há 4h 37min
**Progresso:** 13 de 40 leads (33%)
**Duplicados:** 50 de 60 encontrados (83%)
**Rejeitados:** 27 de 60 encontrados (45%)
**Total encontrado:** 60 leads
**Total criado:** 13 leads

---

## 🔍 POSSÍVEIS CAUSAS

### **1. Meta Não Atingida (33% < 90%)**

**Problema:**
- Sistema só finaliza quando atinge 90% da meta
- Atual: 13/40 = 33% (muito abaixo de 90%)
- Sistema está esperando mais leads

**Solução:**
- Verificar se há mais páginas para processar
- Verificar se API esgotou resultados
- Verificar se compensação foi tentada

---

### **2. Mensagens Perdidas na Fila**

**Problema:**
- Mensagens podem ter sido perdidas/expiradas na fila PGMQ
- Sistema não detecta automaticamente (antes das correções V15)

**Solução:**
- Verificar se há mensagens na fila para este run_id
- Verificar se há mensagens de compensação perdidas

---

### **3. API Esgotou Mas Não Tentou Expansão**

**Problema:**
- API pode ter esgotado resultados
- Sistema não tentou compensação ou expansão
- Extração ficou travada esperando mais resultados

**Solução:**
- Verificar se API esgotou (`api_exhausted` no progress_data)
- Verificar se compensação foi tentada
- Verificar se expansão por coordenadas foi tentada

---

### **4. Lógica de Finalização Não Executada**

**Problema:**
- Última página pode não ter sido processada
- Lógica de finalização não foi executada
- Sistema está esperando próxima página

**Solução:**
- Verificar se `is_last_page` foi processado
- Verificar se há mais páginas enfileiradas

---

## 🔍 QUERIES DE DIAGNÓSTICO

### **1. Verificar Status da Extração:**

```sql
SELECT 
  id,
  status,
  created_quantity,
  target_quantity,
  (created_quantity::float / NULLIF(target_quantity, 0) * 100) as percentage,
  started_at,
  completed_at,
  current_step,
  progress_data
FROM lead_extraction_runs
WHERE id = 'UUID-DA-EXTRACAO-AQUI'
ORDER BY started_at DESC
LIMIT 1;
```

### **2. Verificar Mensagens na Fila:**

```sql
-- Verificar mensagens relacionadas a esta extração
SELECT 
  msg_id,
  message->>'run_id' as run_id,
  message->>'page' as page,
  message->>'is_last_page' as is_last_page,
  message->>'is_compensation' as is_compensation,
  message->>'is_segmented' as is_segmented,
  enqueued_at,
  vt,
  read_ct
FROM pgmq.google_maps_queue
WHERE message->>'run_id' = 'UUID-DA-EXTRACAO-AQUI'
ORDER BY enqueued_at DESC;
```

### **3. Verificar Logs da Extração:**

```sql
SELECT 
  id,
  step_name,
  level,
  message,
  details,
  created_at
FROM extraction_logs
WHERE run_id = 'UUID-DA-EXTRACAO-AQUI'
ORDER BY created_at DESC
LIMIT 50;
```

### **4. Verificar Progress Data:**

```sql
SELECT 
  id,
  progress_data->>'api_exhausted' as api_exhausted,
  progress_data->>'compensation_count' as compensation_count,
  progress_data->>'compensation_pages_queued' as compensation_pages_queued,
  progress_data->>'segmented_searches_enqueued' as segmented_searches_enqueued,
  progress_data->>'segmented_searches_completed' as segmented_searches_completed,
  progress_data->>'segmentation_started_at' as segmentation_started_at,
  progress_data->>'last_compensation_page' as last_compensation_page
FROM lead_extraction_runs
WHERE id = 'UUID-DA-EXTRACAO-AQUI';
```

---

## 🛠️ SOLUÇÕES POSSÍVEIS

### **Solução 1: Finalizar Manualmente (Se Meta Não Será Atingida)**

Se a extração não consegue mais encontrar leads:

```sql
UPDATE lead_extraction_runs
SET 
  status = 'completed',
  completed_at = NOW(),
  current_step = 'Finalizada manualmente - API esgotou resultados'
WHERE id = 'UUID-DA-EXTRACAO-AQUI'
  AND status = 'running';
```

### **Solução 2: Verificar e Processar Mensagens Perdidas**

Se há mensagens na fila que não foram processadas:

```sql
-- Ver mensagens
SELECT * FROM pgmq.google_maps_queue
WHERE message->>'run_id' = 'UUID-DA-EXTRACAO-AQUI';

-- Se necessário, deletar mensagens antigas e finalizar
DELETE FROM pgmq.google_maps_queue
WHERE message->>'run_id' = 'UUID-DA-EXTRACAO-AQUI'
  AND enqueued_at < NOW() - INTERVAL '2 hours';
```

### **Solução 3: Usar Função de Finalização Automática (V15)**

Se você tem a função `finalize_stuck_extraction`:

```sql
SELECT finalize_stuck_extraction('UUID-DA-EXTRACAO-AQUI');
```

---

## 📋 CHECKLIST DE DIAGNÓSTICO

- [ ] Verificar status da extração no banco
- [ ] Verificar se há mensagens na fila
- [ ] Verificar logs da extração
- [ ] Verificar progress_data
- [ ] Verificar se API esgotou
- [ ] Verificar se compensação foi tentada
- [ ] Verificar se expansão foi tentada
- [ ] Decidir ação: finalizar manualmente ou tentar continuar

---

## 🎯 PRÓXIMOS PASSOS

1. **Executar queries de diagnóstico** acima
2. **Identificar causa raiz** do problema
3. **Aplicar solução apropriada**
4. **Monitorar** se problema se repete

---

## ⚠️ NOTA IMPORTANTE

Esta extração foi criada **ANTES** das melhorias V15 e V16:
- ❌ Não tem detecção automática de mensagens perdidas
- ❌ Não tem timeout automático para buscas segmentadas
- ❌ Não tem expansão por coordenadas automática

**Soluções V15/V16** só se aplicam a **novas extrações** criadas após os deploys.
