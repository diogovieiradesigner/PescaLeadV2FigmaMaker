# 🔍 Diagnóstico: Extrações Travadas por Scraping

## 🎯 Problema Identificado

**3 extrações estão travadas em `enriching` devido a gargalo na fila de SCRAPING.**

---

## 📊 Análise das 3 Extrações

### **1. Restaurantes 09:07**
- **Status:** `enriching`
- **Horas decorridas:** 1.8h
- **Pendentes:** 111 leads
  - 2 pendentes de WHOIS
  - **110 pendentes de SCRAPING** ⚠️
- **Última atualização:** 13:56 (há poucos minutos)
- **Sendo processados agora:** 4 leads

### **2. Restaurantes 09:03**
- **Status:** `enriching`
- **Horas decorridas:** 1.9h
- **Pendentes:** 13 leads
  - 6 pendentes de WHOIS
  - **13 pendentes de SCRAPING** ⚠️
- **Última atualização:** 13:45 (há ~10 minutos)
- **Sendo processados agora:** 0 leads

### **3. Restaurantes 04:42**
- **Status:** `enriching`
- **Horas decorridas:** 6.2h
- **Pendentes:** 8 leads
  - **8 pendentes de SCRAPING** ⚠️
- **Última atualização:** 13:45 (há ~10 minutos)
- **Sendo processados agora:** 0 leads

---

## ⚠️ Causa Raiz: Fila de Scraping Sobrecarregada

### **Estatísticas da Fila:**

- **Total de mensagens pendentes:** **2.154** 🔴
- **Mensagens dessas 3 extrações:** **97**
- **Taxa de processamento:** Insuficiente para dar conta do volume

### **Por que está travando:**

1. **Volume excessivo:** 2.154 mensagens na fila
2. **Processamento lento:** Scraping é um processo mais demorado que WHOIS/CNPJ
3. **Acúmulo:** Mensagens se acumulam mais rápido do que são processadas
4. **Leads aguardando:** Leads ficam horas esperando na fila

---

## 🔍 Detalhes dos Leads Pendentes

### **Padrão identificado:**

- **Todos os leads pendentes precisam de SCRAPING**
- **WHOIS e CNPJ já foram processados** (quando aplicável)
- **Scraping é o último passo** antes de completar

### **Tempo de espera:**

- **Restaurantes 04:42:** Leads esperando há **6+ horas**
- **Restaurantes 09:03:** Leads esperando há **1-2 horas**
- **Restaurantes 09:07:** Alguns sendo processados agora, outros esperando

---

## 💡 Soluções Possíveis

### **Solução 1: Escalar Processamento de Scraping** (Recomendado)

**Ação:** Aumentar capacidade de processamento da fila de scraping

**Opções:**
1. Executar múltiplas instâncias de `process-scraping-queue` em paralelo
2. Aumentar frequência de execução do cron job
3. Processar em batches maiores

**Como verificar taxa atual:**
```sql
-- Ver quantas mensagens são processadas por hora
SELECT 
  DATE_TRUNC('hour', updated_at) as hora,
  COUNT(*) as processados
FROM lead_extraction_staging
WHERE scraping_enriched = true
  AND updated_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', updated_at)
ORDER BY hora DESC;
```

### **Solução 2: Priorizar Essas Extrações**

**Ação:** Processar primeiro leads dessas 3 extrações

**Como fazer:**
- Modificar `process-scraping-queue` para priorizar leads mais antigos
- Ou criar fila separada para leads urgentes

### **Solução 3: Timeout e Retry**

**Ação:** Implementar timeout para leads que ficam muito tempo na fila

**Como fazer:**
- Se lead está há mais de X horas pendente, marcar como `completed` mesmo sem scraping
- Ou aumentar número de tentativas

---

## 📈 Monitoramento

### **Verificar status da fila:**
```sql
SELECT 
  COUNT(*) as total_pendente,
  COUNT(*) FILTER (WHERE vt <= NOW()) as pronto_para_processar,
  COUNT(*) FILTER (WHERE vt > NOW()) as aguardando_timeout
FROM pgmq.q_scraping_queue;
```

### **Verificar taxa de processamento:**
```sql
SELECT 
  DATE_TRUNC('hour', updated_at) as hora,
  COUNT(*) as leads_completados
FROM lead_extraction_staging
WHERE scraping_enriched = true
  AND updated_at >= NOW() - INTERVAL '6 hours'
GROUP BY DATE_TRUNC('hour', updated_at)
ORDER BY hora DESC;
```

### **Verificar leads travados:**
```sql
SELECT 
  ler.run_name,
  COUNT(*) as leads_travados,
  MIN(les.updated_at) as mais_antigo,
  MAX(les.updated_at) as mais_recente
FROM lead_extraction_runs ler
JOIN lead_extraction_staging les ON les.extraction_run_id = ler.id
WHERE les.status_enrichment IN ('pending', 'enriching')
  AND les.primary_website IS NOT NULL
  AND les.scraping_enriched = false
  AND les.updated_at < NOW() - INTERVAL '2 hours'
GROUP BY ler.id, ler.run_name;
```

---

## ✅ Conclusão

**Problema:** Fila de scraping sobrecarregada (2.154 mensagens)

**Impacto:** 3 extrações travadas aguardando scraping

**Solução imediata:** Escalar processamento de scraping ou priorizar essas extrações

**Solução de longo prazo:** Otimizar taxa de processamento e implementar timeout

---

## 🎯 Próximos Passos Recomendados

1. ✅ **Verificar taxa de processamento atual** de scraping
2. ✅ **Escalar processamento** (múltiplas instâncias ou maior frequência)
3. ✅ **Monitorar progresso** nas próximas horas
4. ✅ **Considerar timeout** para leads muito antigos

