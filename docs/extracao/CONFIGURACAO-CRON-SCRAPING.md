# ⚙️ Configuração: Cron para process-scraping-queue

## 🎯 Objetivo

Executar `process-scraping-queue` **a cada 1 minuto** para processar a fila de scraping mais rapidamente.

---

## ✅ Alterações Implementadas

### **1. MAX_CONCURRENT aumentado para 30**

**Arquivo:** `supabase/functions/process-scraping-queue/index.ts`

**Antes:**
```typescript
const MAX_CONCURRENT = 10;
```

**Depois:**
```typescript
const MAX_CONCURRENT = 30;
```

**Impacto:**
- ✅ Processa 30 leads simultaneamente (antes eram 10)
- ✅ 3x mais rápido
- ✅ Com fila de 2.149 mensagens: ~72 minutos (antes ~215 minutos)

---

## 🔧 Configuração do Cron

### **Opção 1: Supabase Dashboard (Recomendado)**

1. Acesse **Supabase Dashboard** > **Database** > **Cron Jobs**
2. Clique em **"New Cron Job"**
3. Configure:
   - **Name:** `process-scraping-queue-minute`
   - **Schedule:** `* * * * *` (a cada minuto)
   - **Command:** 
     ```sql
     SELECT net.http_post(
       url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-scraping-queue',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
         'Content-Type', 'application/json'
       ),
       body := jsonb_build_object('batch_size', 30)
     );
     ```

**⚠️ Nota:** Requer extensão `pg_net` habilitada.

---

### **Opção 2: Cron Externo (GitHub Actions)**

**Arquivo:** `.github/workflows/process-scraping-queue.yml`

```yaml
name: Process Scraping Queue

on:
  schedule:
    - cron: '* * * * *'  # A cada minuto
  workflow_dispatch:  # Permite execução manual

jobs:
  process-scraping:
    runs-on: ubuntu-latest
    steps:
      - name: Call process-scraping-queue
        run: |
          curl -X POST https://${{ secrets.SUPABASE_URL }}/functions/v1/process-scraping-queue \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"batch_size": 30}'
```

---

### **Opção 3: Cron do Servidor (Linux/Mac)**

**Adicionar ao crontab (`crontab -e`):**

```bash
# Processar fila de scraping a cada minuto
* * * * * curl -X POST https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-scraping-queue \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 30}' > /dev/null 2>&1
```

---

### **Opção 4: Usar pg_net (Se disponível)**

**SQL para criar cron com pg_net:**

```sql
-- Habilitar pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar função que chama Edge Function
CREATE OR REPLACE FUNCTION call_process_scraping_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_key text;
BEGIN
  -- Obter service key (precisa estar configurada)
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  -- Chamar Edge Function via HTTP
  PERFORM net.http_post(
    url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-scraping-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('batch_size', 30)
  );
END;
$$;

-- Criar cron job
SELECT cron.schedule(
  'process-scraping-queue-minute',
  '* * * * *',  -- A cada minuto
  'SELECT call_process_scraping_queue()'
);
```

---

## 📊 Impacto Esperado

### **Antes:**
- **MAX_CONCURRENT:** 10
- **Frequência:** ~5 minutos (assumindo)
- **Taxa:** ~2 leads/minuto
- **Tempo para processar 2.149 mensagens:** ~18 horas

### **Depois:**
- **MAX_CONCURRENT:** 30
- **Frequência:** 1 minuto
- **Taxa:** ~30 leads/minuto
- **Tempo para processar 2.149 mensagens:** ~72 minutos (~1h12min)

**Melhoria:** ~15x mais rápido! 🚀

---

## 🔍 Verificar Funcionamento

### **Ver logs da Edge Function:**
- Supabase Dashboard > Edge Functions > `process-scraping-queue` > Logs
- Verificar se está processando 30 leads por execução

### **Monitorar fila:**
```sql
SELECT 
  COUNT(*) as total_pendente,
  COUNT(*) FILTER (WHERE vt <= NOW()) as pronto_para_processar
FROM pgmq.q_scraping_queue;
```

### **Verificar taxa de processamento:**
```sql
SELECT 
  DATE_TRUNC('minute', updated_at) as minuto,
  COUNT(*) as leads_completados
FROM lead_extraction_staging
WHERE scraping_enriched = true
  AND updated_at >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', updated_at)
ORDER BY minuto DESC;
```

---

## ⚠️ Notas Importantes

1. **Scraping é apenas de sites:** O `process-scraping-queue` processa apenas scraping de websites, não inclui:
   - ❌ WHOIS (processado por `process-whois-queue`)
   - ❌ CNPJ (processado por `process-cnpj-queue`)
   - ✅ Apenas scraping de sites

2. **Rate Limits:** Verificar se a API de scraping tem rate limits que podem ser atingidos com 30 requisições simultâneas.

3. **Custos:** Processar mais rápido pode aumentar custos da API de scraping.

4. **Monitoramento:** Acompanhar logs nas primeiras horas para garantir que está funcionando corretamente.

---

## ✅ Próximos Passos

1. ✅ **Deploy da Edge Function** com MAX_CONCURRENT = 30
2. ⏳ **Configurar cron** para executar a cada minuto (escolher uma das opções acima)
3. ⏳ **Monitorar** taxa de processamento nas próximas horas
4. ⏳ **Ajustar** se necessário (frequência ou MAX_CONCURRENT)

---

**Status:** ✅ MAX_CONCURRENT atualizado | ⏳ Cron precisa ser configurado

