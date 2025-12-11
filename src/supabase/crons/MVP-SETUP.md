# 🚀 MVP - CONFIGURAÇÃO SIMPLIFICADA (APENAS 2 CRONS)

## 🎯 OBJETIVO DO MVP

Sistema básico de extração de leads:
1. ✅ Extrair dados do Google Maps via SerpDev (100 páginas)
2. ✅ Migrar leads para o Kanban (tabela `leads`)
3. ⏸️ **Enriquecimento fica para DEPOIS**

---

## ⚡ SETUP RÁPIDO (3 PASSOS)

### **PASSO 1: Configurar Service Role Key no Database**

⚠️ **IMPORTANTE:** O Vault do Supabase é diferente de Database Settings!

```sql
-- 1. Copiar sua Service Role Key do Vault (Dashboard → Settings → API)
-- Exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

-- 2. Executar no SQL Editor:
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'sua-key-completa-aqui';

-- 3. Verificar:
SELECT current_setting('app.settings.service_role_key', true);
-- ✅ Deve retornar sua key
```

**Por que precisa disso?**
```
┌──────────────────────────────────────────────┐
│ VAULT (para Edge Functions)                 │
│ - Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') │
│ - ✅ Você já configurou                      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ DATABASE SETTINGS (para Cron Jobs)           │
│ - current_setting('app.settings...')        │
│ - ❌ Precisa configurar agora                │
└──────────────────────────────────────────────┘
```

---

### **PASSO 2: Deletar Todos os Crons Antigos**

```sql
-- Listar crons atuais:
SELECT jobname, schedule FROM cron.job;

-- Deletar TODOS os crons (vamos criar do zero):
SELECT cron.unschedule('process-enrichment-queue');
SELECT cron.unschedule('consume-enrichment-queue');
SELECT cron.unschedule('consumer-enrichment-queue');  -- Se tiver este também
SELECT cron.unschedule('process-google-maps-queue');
SELECT cron.unschedule('migrate-completed-leads');

-- Confirmar que todos foram deletados:
SELECT jobname FROM cron.job;
-- ✅ Deve retornar 0 linhas (ou não mostrar os crons acima)
```

---

### **PASSO 3: Criar os 2 Crons do MVP**

#### **CRON 1: process-google-maps-queue (15 segundos)**

```sql
SELECT cron.schedule(
  'process-google-maps-queue',
  '15 seconds',
  $$
  SELECT net.http_post(
    url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-google-maps-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**O que faz:**
- Processa fila PGMQ das 100 páginas do Google Maps
- Chama Edge Function `process-google-maps-queue`
- Roda a cada 15 segundos → 100 páginas em ~25 minutos

---

#### **CRON 2: migrate-completed-leads (2 minutos)**

```sql
SELECT cron.schedule(
  'migrate-completed-leads',
  '2 minutes',
  $$
  WITH ready_to_migrate AS (
    SELECT 
      s.*,
      e.funnel_id,
      e.column_id
    FROM lead_extraction_staging s
    JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
    JOIN lead_extractions e ON e.id = r.extraction_id
    WHERE s.should_migrate = true
      AND s.migrated_at IS NULL
      AND s.status_extraction = 'google_fetched'
      -- ✅ NÃO exige enriquecimento (cliente vê leads rapidamente)
    LIMIT 100
  ),
  inserted_leads AS (
    INSERT INTO leads (
      workspace_id,
      funnel_id,
      column_id,
      client_name,
      company,
      lead_extraction_id,
      lead_extraction_run_id,
      created_at
    )
    SELECT
      s.workspace_id,
      s.funnel_id,
      s.column_id,
      s.client_name,
      s.company,
      (SELECT extraction_id FROM lead_extraction_runs WHERE id = s.extraction_run_id),
      s.extraction_run_id,
      s.created_at
    FROM ready_to_migrate s
    RETURNING id, lead_extraction_run_id, workspace_id
  )
  UPDATE lead_extraction_staging s
  SET 
    migrated_at = NOW(),
    migrated_lead_id = i.id
  FROM inserted_leads i
  WHERE s.extraction_run_id = i.lead_extraction_run_id
    AND s.workspace_id = i.workspace_id;
  $$
);
```

**O que faz:**
- Busca leads com `status_extraction = 'google_fetched'`
- Insere na tabela `leads` (kanban)
- Atualiza `lead_extraction_staging` com `migrated_at`
- **NÃO espera enriquecimento** → Cliente vê leads mais rápido!

---

### **VERIFICAR CONFIGURAÇÃO:**

```sql
-- Listar os 2 crons criados:
SELECT 
  jobname, 
  schedule, 
  active,
  command
FROM cron.job 
WHERE jobname IN ('process-google-maps-queue', 'migrate-completed-leads');

-- ✅ Deve mostrar:
-- process-google-maps-queue | 15 seconds | true
-- migrate-completed-leads   | 2 minutes  | true
```

---

## 🧪 TESTANDO O MVP

### **Teste 1: Iniciar extração via Frontend**

```typescript
// Frontend chama:
POST /make-server-e4f9d774/extractions/start
{
  "extraction_id": "uuid-aqui",
  "query_params": "restaurante"
}

// ✅ Deve enfileirar 100 páginas na PGMQ
```

### **Teste 2: Verificar fila do Google Maps**

```sql
-- Ver mensagens na fila:
SELECT COUNT(*) FROM pgmq.q_google_maps_queue;
-- ✅ Deve mostrar ~100 mensagens

-- Ver detalhes das mensagens:
SELECT msg_id, message 
FROM pgmq.q_google_maps_queue 
LIMIT 5;
```

### **Teste 3: Acompanhar processamento**

```sql
-- Aguardar 15 segundos e verificar logs do cron:
SELECT 
  jobname,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobname = 'process-google-maps-queue'
ORDER BY start_time DESC 
LIMIT 5;

-- ✅ Status deve ser 'succeeded'
-- ❌ Se 'failed', ver return_message para debugar
```

### **Teste 4: Ver leads sendo extraídos**

```sql
-- Contar leads por status:
SELECT 
  status_extraction,
  COUNT(*) as total
FROM lead_extraction_staging
GROUP BY status_extraction;

-- ✅ Deve ver:
-- pending         | (diminuindo)
-- google_fetched  | (aumentando)
```

### **Teste 5: Ver leads sendo migrados para o Kanban**

```sql
-- Aguardar 2 minutos e verificar:
SELECT COUNT(*) as total_migrated
FROM lead_extraction_staging
WHERE migrated_at IS NOT NULL;

-- ✅ Total deve aumentar a cada 2 minutos

-- Ver leads no Kanban:
SELECT 
  id,
  client_name,
  company,
  funnel_id,
  column_id,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 MONITORAMENTO EM TEMPO REAL

### **Dashboard de Progresso:**

```sql
-- Ver progresso completo do run:
SELECT 
  r.id as run_id,
  r.status as run_status,
  COUNT(s.*) as total_leads,
  COUNT(s.*) FILTER (WHERE s.status_extraction = 'pending') as pending,
  COUNT(s.*) FILTER (WHERE s.status_extraction = 'google_fetched') as fetched,
  COUNT(s.*) FILTER (WHERE s.migrated_at IS NOT NULL) as migrated,
  ROUND(
    (COUNT(s.*) FILTER (WHERE s.migrated_at IS NOT NULL)::DECIMAL / COUNT(s.*)::DECIMAL) * 100,
    2
  ) as percent_complete
FROM lead_extraction_runs r
JOIN lead_extraction_staging s ON s.extraction_run_id = r.id
WHERE r.id = 'seu-run-id-aqui'
GROUP BY r.id, r.status;
```

### **Status dos Crons (última hora):**

```sql
SELECT 
  j.jobname,
  COUNT(r.runid) as total_runs,
  COUNT(r.runid) FILTER (WHERE r.status = 'succeeded') as succeeded,
  COUNT(r.runid) FILTER (WHERE r.status = 'failed') as failed,
  MAX(r.start_time) as last_run
FROM cron.job j
LEFT JOIN cron.job_run_details r ON r.jobid = j.jobid AND r.start_time > NOW() - INTERVAL '1 hour'
WHERE j.jobname IN ('process-google-maps-queue', 'migrate-completed-leads')
GROUP BY j.jobid, j.jobname;
```

---

## 🔧 TROUBLESHOOTING MVP

### **❌ Problema: process-google-maps-queue falhando**

```sql
-- Ver erro exato:
SELECT 
  return_message,
  start_time
FROM cron.job_run_details
WHERE jobname = 'process-google-maps-queue'
  AND status = 'failed'
ORDER BY start_time DESC
LIMIT 1;
```

**Erros comuns:**

1. **"could not get setting app.settings.service_role_key"**
   ```sql
   -- Configurar no PASSO 1:
   ALTER DATABASE postgres SET app.settings.service_role_key = 'sua-key';
   ```

2. **"HTTP 401 Unauthorized"**
   ```sql
   -- Verificar se key está correta:
   SELECT current_setting('app.settings.service_role_key', true);
   ```

3. **"function process_google_maps_queue() does not exist"**
   ```sql
   -- Executar migração SQL:
   -- /sql-migrations/03-google-maps-queue.sql
   ```

---

### **❌ Problema: migrate-completed-leads falhando**

```sql
-- Testar query manualmente:
WITH ready_to_migrate AS (
  SELECT 
    s.*,
    e.funnel_id,
    e.column_id
  FROM lead_extraction_staging s
  JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
  JOIN lead_extractions e ON e.id = r.extraction_id
  WHERE s.should_migrate = true
    AND s.migrated_at IS NULL
    AND s.status_extraction = 'google_fetched'
  LIMIT 5
)
SELECT * FROM ready_to_migrate;

-- ✅ Se retornar dados, o SELECT funciona
-- ❌ Se der erro, verificar JOINs e chaves estrangeiras
```

**Erros comuns:**

1. **"foreign key violation on funnel_id"**
   ```sql
   -- Verificar se funnel existe:
   SELECT id, name FROM funnels WHERE workspace_id = 'seu-workspace';
   
   -- Se não existir, criar um funnel de teste
   ```

2. **"foreign key violation on column_id"**
   ```sql
   -- Verificar se column existe:
   SELECT id, name FROM columns WHERE funnel_id = 'seu-funnel-id';
   
   -- Se não existir, criar uma coluna de teste
   ```

3. **"duplicate key value violates unique constraint"**
   ```sql
   -- Verificar se há constraint UNIQUE em leads:
   SELECT conname, contype 
   FROM pg_constraint 
   WHERE conrelid = 'leads'::regclass;
   
   -- Se tiver UNIQUE em (extraction_run_id, client_name), pode estar bloqueando
   ```

---

## ⏸️ ENRIQUECIMENTO (PARA DEPOIS DO MVP)

Após o MVP estar 100% funcional, criar:

### **Edge Function: enrich-lead**

```typescript
// /supabase/functions/enrich-lead/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { lead_id, data } = await req.json();
  
  // TODO: Implementar enriquecimento
  // - Chamar WHOIS_URL_API
  // - Chamar APIs de CNPJ
  // - Validações diversas
  
  await supabase
    .from('lead_extraction_staging')
    .update({
      status_enrichment: 'completed',
      enriched_data: { /* dados */ }
    })
    .eq('id', lead_id);
  
  return new Response(JSON.stringify({ success: true }));
});
```

### **Depois criar o cron de enriquecimento:**

```sql
-- APENAS DEPOIS DO MVP!
SELECT cron.schedule(
  'consume-enrichment-queue',
  '30 seconds',
  'SELECT consume_enrichment_queue();'
);
```

---

## ✅ CHECKLIST MVP

Antes de testar no Frontend:

- [ ] `app.settings.service_role_key` configurado no database
- [ ] Todos os crons antigos deletados
- [ ] Cron `process-google-maps-queue` criado (15 segundos)
- [ ] Cron `migrate-completed-leads` criado (2 minutos)
- [ ] Edge Function `process-google-maps-queue` deployada
- [ ] Edge Function `fetch-google-maps` deployada
- [ ] Edge Function `start-extraction` deployada
- [ ] 17 chaves SerpDev configuradas no Vault (SERPDEV_API_KEY_01 a 17)
- [ ] Teste manual: enfileirar 1 lead e verificar processamento
- [ ] Teste manual: verificar migração para tabela `leads`
- [ ] Logs dos crons sem erros

---

## 🚀 FLUXO COMPLETO DO MVP

```
┌────────────────────────────────────────────────────┐
│ 1. USUÁRIO INICIA EXTRAÇÃO (Frontend)             │
│    POST /make-server-e4f9d774/extractions/start   │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ 2. EDGE FUNCTION: start-extraction                 │
│    - Enfileira 100 páginas na PGMQ                 │
│    - Cria registros na lead_extraction_staging     │
│    - Status: 'pending'                             │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ 3. CRON: process-google-maps-queue (15s)           │
│    - Lê mensagens da fila PGMQ                     │
│    - Chama Edge Function: fetch-google-maps        │
│    - Busca dados do SerpDev API                    │
│    - Salva em lead_extraction_staging              │
│    - Status: 'google_fetched'                      │
│    - Tempo: ~25 minutos para 100 páginas           │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ 4. CRON: migrate-completed-leads (2 min)           │
│    - Busca leads com status 'google_fetched'       │
│    - INSERT INTO leads (tabela definitiva)         │
│    - UPDATE staging com migrated_at                │
│    - Cliente vê leads no Kanban! 🎉                │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ 5. ENRIQUECIMENTO (FUTURO - DEPOIS DO MVP)         │
│    - Whois, CNPJ, validações                       │
│    - Roda em background                            │
│    - Não bloqueia visualização do lead             │
└────────────────────────────────────────────────────┘
```

---

**✅ MVP PRONTO! Leads aparecem no Kanban em ~27 minutos (25 min extração + 2 min migração)**

**Data:** 2025-11-24  
**Versão:** MVP 1.0
