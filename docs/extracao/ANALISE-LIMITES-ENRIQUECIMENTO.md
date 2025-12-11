# 📊 Análise: Limites das Etapas de Enriquecimento

## 🎯 Resumo Executivo

Análise dos limites atuais e recomendações de otimização para cada etapa de enriquecimento.

---

## 📈 Status Atual das Filas

| Etapa | Fila Pendente | Completados (1h) | Pendentes (1h) | Status |
|-------|---------------|------------------|----------------|--------|
| **WHOIS** | 0 | 771 | 884 | ✅ OK |
| **CNPJ** | 0 | 413 | 7 | ✅ OK |
| **Scraping** | 2.088 | 337 | 2.064 | ⚠️ SOBRECARREGADO |

---

## 🔍 Limites Atuais por Etapa

### **1. SCRAPING** ✅ (Já Otimizado)

**Arquivo:** `supabase/functions/process-scraping-queue/index.ts`

**Limites Atuais:**
- **MAX_CONCURRENT:** `30` ✅ (acabamos de aumentar de 10)
- **batch_size (cron):** `30` ✅
- **Frequência:** `1 minuto` ✅
- **Processamento:** Paralelo (até 30 simultâneos)

**Taxa de Processamento:**
- ~30 leads/minuto (com MAX_CONCURRENT = 30)
- ~337 completados na última hora

**Status:** ✅ **Já otimizado**

---

### **2. WHOIS** ⚠️ (Pode Melhorar)

**Arquivo:** `supabase/functions/process-whois-queue/index.ts`

**Limites Atuais:**
- **qty (batch):** `10` (linha 162)
- **Processamento:** Sequencial (um por vez)
- **Delay entre requisições:** `500ms`
- **Frequência:** `1 minuto` (cron job)
- **Timeout:** `20 segundos` por requisição

**Taxa de Processamento:**
- ~10 leads/minuto (sequencial com delay)
- ~771 completados na última hora
- ~12-13 leads/minuto efetivo

**Problemas Identificados:**
- ❌ Processamento **sequencial** (muito lento)
- ❌ Delay de 500ms entre cada requisição
- ✅ Fila vazia (não está travando)

**Recomendação:**
- ⚠️ **Não urgente** (fila está vazia)
- 💡 Se começar a acumular, considerar processamento paralelo (5-10 simultâneos)

---

### **3. CNPJ** ⚠️ (Pode Melhorar)

**Arquivo:** `supabase/functions/process-cnpj-queue/index.ts`

**Limites Atuais:**
- **qty (batch):** `10` (linha 92)
- **Processamento:** Sequencial (um por vez)
- **Delay:** Nenhum (mas processa sequencialmente)
- **Frequência:** `1 minuto` (cron job)
- **Timeout:** `10-15 segundos` por requisição (depende da API)

**Taxa de Processamento:**
- ~10 leads/minuto (sequencial)
- ~413 completados na última hora
- ~7 leads/minuto efetivo

**Problemas Identificados:**
- ❌ Processamento **sequencial** (muito lento)
- ❌ Sem paralelismo
- ✅ Fila vazia (não está travando)

**Recomendação:**
- ⚠️ **Não urgente** (fila está vazia)
- 💡 Se começar a acumular, considerar processamento paralelo (5-10 simultâneos)

---

## 💡 Recomendações de Otimização

### **Prioridade ALTA** 🔴

**Nenhuma** - Scraping já foi otimizado e é o único com problema.

---

### **Prioridade MÉDIA** 🟡

#### **WHOIS: Adicionar Processamento Paralelo**

**Motivo:** Processamento sequencial é lento, mas fila está vazia agora.

**Implementação:**
```typescript
// Adicionar MAX_CONCURRENT similar ao scraping
const MAX_CONCURRENT = 10; // Processar 10 simultaneamente

// Processar em paralelo
const processingPromises = messages.slice(0, MAX_CONCURRENT).map(msg =>
  processWhoisMessage(msg)
);
await Promise.all(processingPromises);
```

**Impacto Esperado:**
- Taxa: ~10 leads/minuto → ~50-100 leads/minuto (5-10x mais rápido)
- **Quando implementar:** Se fila começar a acumular

---

#### **CNPJ: Adicionar Processamento Paralelo**

**Motivo:** Processamento sequencial é lento, mas fila está vazia agora.

**Implementação:**
```typescript
// Adicionar MAX_CONCURRENT
const MAX_CONCURRENT = 10; // Processar 10 simultaneamente

// Processar em paralelo
const processingPromises = messages.slice(0, MAX_CONCURRENT).map(msg =>
  processCNPJMessage(msg)
);
await Promise.all(processingPromises);
```

**Impacto Esperado:**
- Taxa: ~10 leads/minuto → ~50-100 leads/minuto (5-10x mais rápido)
- **Quando implementar:** Se fila começar a acumular

---

### **Prioridade BAIXA** 🟢

**Nenhuma** - Sistema está funcionando bem no momento.

---

## 📊 Comparação: Antes vs Depois (Scraping)

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| MAX_CONCURRENT | 10 | 30 | 3x |
| batch_size | 5 | 30 | 6x |
| Taxa (leads/min) | ~5 | ~30 | 6x |
| Tempo para 2.088 msgs | ~7h | ~70min | 6x mais rápido |

---

## 🎯 Conclusão

### **Status Atual:**

1. ✅ **Scraping:** Otimizado (MAX_CONCURRENT = 30)
2. ⚠️ **WHOIS:** Funcionando, mas pode melhorar se necessário
3. ⚠️ **CNPJ:** Funcionando, mas pode melhorar se necessário

### **Recomendação Final:**

**Não é necessário aumentar WHOIS e CNPJ agora** porque:
- ✅ Filas estão vazias (0 mensagens)
- ✅ Taxa atual está suficiente para demanda atual
- ✅ Não há travamentos

**Considerar aumentar apenas se:**
- ⚠️ Filas começarem a acumular (> 100 mensagens)
- ⚠️ Taxa de processamento não acompanhar entrada de novos leads
- ⚠️ Extrações começarem a travar por causa dessas etapas

---

## 📝 Monitoramento

### **Verificar status das filas:**
```sql
SELECT 
  'whois_queue' as fila,
  COUNT(*) as pendentes
FROM pgmq.q_whois_queue
WHERE vt <= NOW()

UNION ALL

SELECT 
  'cnpj_queue' as fila,
  COUNT(*) as pendentes
FROM pgmq.q_cnpj_queue
WHERE vt <= NOW()

UNION ALL

SELECT 
  'scraping_queue' as fila,
  COUNT(*) as pendentes
FROM pgmq.q_scraping_queue
WHERE vt <= NOW();
```

### **Verificar taxa de processamento:**
```sql
SELECT 
  DATE_TRUNC('hour', updated_at) as hora,
  COUNT(*) FILTER (WHERE whois_enriched = true) as whois_completos,
  COUNT(*) FILTER (WHERE cnpj_enriched = true) as cnpj_completos,
  COUNT(*) FILTER (WHERE scraping_enriched = true) as scraping_completos
FROM lead_extraction_staging
WHERE updated_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', updated_at)
ORDER BY hora DESC;
```

---

**Status:** ✅ **Sistema funcionando bem. Apenas scraping foi otimizado e era necessário.**

