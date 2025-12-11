# 📊 Monitoramento: Scraping com MAX_CONCURRENT = 60

## 🎯 Configuração Atual

**MAX_CONCURRENT:** `60` (aumentado de 30)  
**batch_size (cron):** `60`  
**Frequência:** `1 minuto`  
**Taxa Esperada:** ~60 leads/minuto

---

## ⚠️ O que Monitorar

### **1. Taxa de Processamento**

**Verificar se está processando ~60 leads/minuto:**
```sql
SELECT 
  DATE_TRUNC('minute', updated_at) as minuto,
  COUNT(*) as leads_completados
FROM lead_extraction_staging
WHERE scraping_enriched = true
  AND updated_at >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', updated_at)
ORDER BY minuto DESC
LIMIT 10;
```

**Esperado:** ~60 leads por minuto

---

### **2. Tamanho da Fila**

**Verificar se a fila está diminuindo:**
```sql
SELECT 
  COUNT(*) as total_pendente,
  COUNT(*) FILTER (WHERE vt <= NOW()) as pronto_para_processar,
  COUNT(*) FILTER (WHERE vt > NOW()) as aguardando_timeout
FROM pgmq.q_scraping_queue;
```

**Esperado:** Fila diminuindo gradualmente

---

### **3. Taxa de Erros da API**

**Verificar logs da Edge Function:**
- Supabase Dashboard > Edge Functions > `process-scraping-queue` > Logs
- Procurar por:
  - `❌ [ERROR]` - Erros de API
  - `⚠️ [TIMEOUT]` - Timeouts
  - `Scraper API returned` - Erros HTTP

**Esperado:** Taxa de erro < 5%

---

### **4. Leads em Processamento Simultâneo**

**Verificar quantos leads estão sendo processados ao mesmo tempo:**
```sql
SELECT 
  COUNT(*) as sendo_processados_agora
FROM lead_extraction_staging
WHERE scraping_status = 'processing';
```

**Esperado:** Até 60 simultaneamente

---

### **5. Tempo Médio de Processamento**

**Verificar se não está demorando muito:**
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (scraping_completed_at - scraping_started_at))) as tempo_medio_segundos,
  MAX(EXTRACT(EPOCH FROM (scraping_completed_at - scraping_started_at))) as tempo_maximo_segundos,
  COUNT(*) as total_completados
FROM lead_extraction_staging
WHERE scraping_enriched = true
  AND scraping_started_at IS NOT NULL
  AND scraping_completed_at IS NOT NULL
  AND scraping_completed_at >= NOW() - INTERVAL '1 hour';
```

**Esperado:** Tempo médio < 30 segundos por lead

---

## 🚨 Sinais de Problema

### **1. Taxa de Erro Alta (> 10%)**
- **Sintoma:** Muitos erros nos logs
- **Ação:** Reduzir MAX_CONCURRENT para 40-50

### **2. Timeouts Frequentes**
- **Sintoma:** Muitos `TIMEOUT` nos logs
- **Ação:** Verificar se API está sobrecarregada, reduzir para 40-50

### **3. Fila Não Diminuindo**
- **Sintoma:** Fila continua crescendo mesmo com processamento
- **Ação:** Verificar se API está bloqueando requisições, reduzir para 30-40

### **4. Rate Limit da API**
- **Sintoma:** Erros 429 (Too Many Requests)
- **Ação:** Reduzir MAX_CONCURRENT para 30-40

---

## 📈 Métricas Esperadas

### **Antes (MAX_CONCURRENT = 30):**
- Taxa: ~30 leads/minuto
- Tempo para 2.088 mensagens: ~70 minutos

### **Depois (MAX_CONCURRENT = 60):**
- Taxa: ~60 leads/minuto
- Tempo para 2.088 mensagens: ~35 minutos

**Melhoria:** 2x mais rápido! 🚀

---

## 🔧 Ajustes Rápidos (Se Necessário)

### **Reduzir para 50:**
```typescript
const MAX_CONCURRENT = 50;
```

### **Reduzir para 40:**
```typescript
const MAX_CONCURRENT = 40;
```

### **Voltar para 30 (se houver problemas):**
```typescript
const MAX_CONCURRENT = 30;
```

**E atualizar cron:**
```sql
SELECT cron.unschedule('process-scraping-queue-v2');
SELECT cron.schedule(
  'process-scraping-queue-v2',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
        url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-scraping-queue',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
            'Content-Type', 'application/json'
        ),
        body := '{"batch_size": 30}'::jsonb  -- Ajustar aqui também
    );
  $$
);
```

---

## ✅ Checklist de Monitoramento

- [ ] Verificar taxa de processamento (deve ser ~60/min)
- [ ] Verificar tamanho da fila (deve estar diminuindo)
- [ ] Verificar logs de erro (deve ser < 5%)
- [ ] Verificar timeouts (deve ser mínimo)
- [ ] Verificar se API está respondendo bem
- [ ] Acompanhar por 1-2 horas antes de considerar estável

---

## 📝 Notas

- **API de Scraping:** `https://proxy-scraper-api.diogo-vieira-pb-f91.workers.dev`
- **Timeout:** 180 segundos (3 minutos) por requisição
- **Frequência:** Executa a cada 1 minuto

---

**Status:** ✅ **Configurado para 60 leads simultâneos**

**Próximo passo:** Deploy da Edge Function e monitoramento por 1-2 horas

