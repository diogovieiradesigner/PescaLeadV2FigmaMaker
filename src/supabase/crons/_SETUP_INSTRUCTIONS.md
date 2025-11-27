# 🚀 INSTRUÇÕES DE CONFIGURAÇÃO - CRON JOBS

## 📋 PRÉ-REQUISITOS

Antes de configurar os Cron Jobs, certifique-se de que:

- ✅ Extensão `pg_cron` está instalada no Supabase
- ✅ Extensão `pgmq` está instalada e configurada
- ✅ Extensão `pg_net` está instalada (para `http_post`)
- ✅ Extensão `http` está instalada (para `http()`)
- ✅ Todas as Edge Functions estão deployadas
- ✅ Tabelas do banco estão criadas (via migrações)

---

## 🔧 CONFIGURAÇÃO PASSO A PASSO

### **PASSO 1: Configurar Service Role Key no Database**

O cron `process-google-maps-queue` precisa chamar Edge Functions com autenticação.

```sql
-- Via SQL Editor no Dashboard do Supabase:

-- 1. Buscar sua Service Role Key:
-- Dashboard → Settings → API → service_role key (secret)

-- 2. Configurar no database:
ALTER DATABASE postgres 
SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
-- ⚠️ IMPORTANTE: Substituir pelo valor REAL da sua Service Role Key!

-- 3. Verificar configuração:
SELECT current_setting('app.settings.service_role_key', true);
-- Deve retornar sua key
```

---

### **PASSO 2: Deletar Crons Antigos/Conflitantes**

Antes de criar novos, remova os antigos para evitar duplicatas.

```sql
-- Via SQL Editor no Dashboard:

-- Listar todos os crons atuais:
SELECT jobid, jobname, schedule, command 
FROM cron.job 
ORDER BY jobname;

-- Deletar os 4 crons se existirem:
SELECT cron.unschedule('process-enrichment-queue');
SELECT cron.unschedule('consume-enrichment-queue');
SELECT cron.unschedule('process-google-maps-queue');
SELECT cron.unschedule('migrate-completed-leads');

-- Confirmar que foram deletados:
SELECT jobid, jobname FROM cron.job;
-- Deve retornar 0 linhas (ou não mostrar os 4 crons acima)
```

---

### **PASSO 3: Criar Cron #1 - process-enrichment-queue**

⚠️ **ANTES DE CRIAR:** Corrigir a função SQL!

```sql
-- CORREÇÃO NECESSÁRIA na função enqueue_enrichment_leads():

CREATE OR REPLACE FUNCTION enqueue_enrichment_leads()
RETURNS void AS $$
DECLARE
  lead RECORD;
  enqueued_count INTEGER := 0;
BEGIN
  FOR lead IN
    SELECT 
      id, 
      extraction_run_id,
      workspace_id,
      extracted_data
    FROM lead_extraction_staging
    WHERE status_enrichment = 'pending'
      AND status_extraction = 'google_fetched'  -- ✅ CORRIGIDO! Era 'ready'
      AND filter_passed = true
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    PERFORM pgmq_send(
      'enrichment_queue',
      jsonb_build_object(
        'lead_id', lead.id,
        'run_id', lead.extraction_run_id,
        'workspace_id', lead.workspace_id,
        'data', lead.extracted_data
      )
    );
    
    UPDATE lead_extraction_staging
    SET status_enrichment = 'enriching'
    WHERE id = lead.id;
    
    enqueued_count := enqueued_count + 1;
  END LOOP;
  
  IF enqueued_count > 0 THEN
    RAISE NOTICE 'Enfileirados % leads para enriquecimento', enqueued_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Agora sim, criar o cron:
SELECT cron.schedule(
  'process-enrichment-queue',
  '1 minute',
  'SELECT enqueue_enrichment_leads();'
);
```

**Verificar:**
```sql
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'process-enrichment-queue';
```

---

### **PASSO 4: Criar Cron #2 - process-google-maps-queue**

```sql
-- Via SQL Editor no Dashboard:

SELECT cron.schedule(
  'process-google-maps-queue',
  '15 seconds',  -- ✅ 15 segundos (não 10 minutos!)
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

**⚠️ IMPORTANTE:** 
- Substituir a URL pela URL do SEU projeto Supabase!
- Certificar que `app.settings.service_role_key` foi configurado no PASSO 1

**Verificar:**
```sql
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'process-google-maps-queue';
```

---

### **PASSO 5: Decidir sobre Enriquecimento**

Você tem 3 opções para o sistema de enriquecimento:

#### **Opção A: Desativar enriquecimento (mais rápido para testar)**

```sql
-- NÃO criar os crons:
-- - consume-enrichment-queue
-- - migrate-completed-leads (ajustar para não esperar enriquecimento)

-- Leads serão migrados SEM enriquecimento
```

#### **Opção B: Criar Edge Function de enriquecimento**

```typescript
// Criar: /supabase/functions/enrich-lead/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { lead_id, data } = await req.json();
  
  // TODO: Chamar APIs de enriquecimento
  // - WHOIS_URL_API
  // - CNPJ APIs
  // - Validações
  
  // Atualizar lead_extraction_staging
  await supabase
    .from('lead_extraction_staging')
    .update({
      status_enrichment: 'completed',
      enriched_data: { /* dados */ }
    })
    .eq('id', lead_id);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

Depois criar o cron:
```sql
SELECT cron.schedule(
  'consume-enrichment-queue',
  '30 seconds',
  'SELECT consume_enrichment_queue();'
);
```

#### **Opção C: Integrar com make-server (recomendado)**

```typescript
// Adicionar rota em /supabase/functions/server/index.tsx:

app.post('/make-server-e4f9d774/enrich-lead', async (c) => {
  const { lead_id, data } = await c.req.json();
  
  // Chamar APIs de enriquecimento
  // Atualizar lead_extraction_staging
  
  return c.json({ success: true });
});
```

Depois atualizar função SQL:
```sql
CREATE OR REPLACE FUNCTION consume_enrichment_queue()
RETURNS void AS $$
DECLARE
  msg RECORD;
  http_result RECORD;
BEGIN
  FOR msg IN 
    SELECT msg_id, message
    FROM pgmq.read('enrichment_queue', 20, 120)
  LOOP
    BEGIN
      SELECT status, content INTO http_result
      FROM http((
        'POST',
        'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/make-server-e4f9d774/enrich-lead',  -- ✅ Rota no make-server
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
        ],
        'application/json',
        msg.message::text
      )::http_request);
      
      IF http_result.status BETWEEN 200 AND 299 THEN
        PERFORM pgmq.delete('enrichment_queue', msg.msg_id);
      ELSE
        RAISE WARNING 'HTTP %: %', http_result.status, http_result.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao enriquecer lead %: %', msg.msg_id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Criar cron:
SELECT cron.schedule(
  'consume-enrichment-queue',
  '30 seconds',
  'SELECT consume_enrichment_queue();'
);
```

---

### **PASSO 6: Criar Cron #3 - migrate-completed-leads**

⚠️ **DECISÃO NECESSÁRIA:** Migrar COM ou SEM enriquecimento?

#### **Opção A: Migrar SEM exigir enriquecimento (código atual)**

```sql
-- Via SQL Editor no Dashboard:

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
      -- NÃO verifica status_enrichment
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

#### **Opção B: Migrar APENAS leads enriquecidos**

```sql
-- Adicionar condição de enriquecimento:

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
      AND s.status_enrichment = 'completed'  -- ✅ ADICIONADO!
    LIMIT 100
  ),
  -- ... resto igual ...
  $$
);
```

---

### **PASSO 7: Verificar Status dos Crons**

```sql
-- Listar todos os crons criados:
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
ORDER BY jobname;

-- Ver logs de execução:
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 50;

-- Ver apenas erros:
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 20;
```

---

## 🧪 TESTANDO OS CRONS

### **Teste 1: process-enrichment-queue**

```sql
-- Criar um lead de teste:
INSERT INTO lead_extraction_staging (
  workspace_id,
  extraction_run_id,
  status_extraction,
  status_enrichment,
  filter_passed,
  client_name,
  company
) VALUES (
  'seu-workspace-id',
  (SELECT id FROM lead_extraction_runs LIMIT 1),
  'google_fetched',  -- ✅ Status correto
  'pending',
  true,
  'Teste Cliente',
  'Teste Empresa'
);

-- Forçar execução manual:
SELECT enqueue_enrichment_leads();

-- Verificar se foi enfileirado:
SELECT * FROM pgmq.q_enrichment_queue;
```

### **Teste 2: process-google-maps-queue**

```sql
-- Enfileirar um lead de teste:
SELECT pgmq_send(
  'google_maps_queue',
  jsonb_build_object(
    'lead_id', 123,
    'page_number', 1,
    'query_params', '{}'::jsonb
  )
);

-- Aguardar 15 segundos e verificar logs:
SELECT * 
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-google-maps-queue')
ORDER BY start_time DESC 
LIMIT 1;
```

### **Teste 3: migrate-completed-leads**

```sql
-- Marcar um lead como pronto para migrar:
UPDATE lead_extraction_staging
SET 
  should_migrate = true,
  migrated_at = NULL,
  status_extraction = 'google_fetched'
WHERE id = 123;

-- Forçar execução manual do comando do cron:
WITH ready_to_migrate AS (
  SELECT s.*, e.funnel_id, e.column_id
  FROM lead_extraction_staging s
  JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
  JOIN lead_extractions e ON e.id = r.extraction_id
  WHERE s.should_migrate = true
    AND s.migrated_at IS NULL
    AND s.status_extraction = 'google_fetched'
  LIMIT 1
)
SELECT * FROM ready_to_migrate;

-- Se retornar dados, tentar INSERT:
-- (copiar o CTE completo do arquivo 04-migrate-completed-leads.sql)
```

---

## 📊 MONITORAMENTO CONTÍNUO

### **Dashboard de Status:**

```sql
-- Criar view para monitoramento:
CREATE OR REPLACE VIEW v_cron_status AS
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  j.nodename,
  COUNT(r.runid) as total_executions,
  COUNT(r.runid) FILTER (WHERE r.status = 'succeeded') as successful,
  COUNT(r.runid) FILTER (WHERE r.status = 'failed') as failed,
  MAX(r.start_time) as last_run,
  MAX(r.end_time) FILTER (WHERE r.status = 'succeeded') as last_success,
  MAX(r.end_time) FILTER (WHERE r.status = 'failed') as last_failure
FROM cron.job j
LEFT JOIN cron.job_run_details r ON r.jobid = j.jobid
WHERE j.jobname IN (
  'process-enrichment-queue',
  'consume-enrichment-queue',
  'process-google-maps-queue',
  'migrate-completed-leads'
)
GROUP BY j.jobid, j.jobname, j.schedule, j.active, j.nodename;

-- Consultar:
SELECT * FROM v_cron_status;
```

### **Alertas de Falhas:**

```sql
-- Verificar se algum cron falhou nas últimas 24h:
SELECT 
  j.jobname,
  r.status,
  r.return_message,
  r.start_time,
  r.end_time
FROM cron.job j
JOIN cron.job_run_details r ON r.jobid = j.jobid
WHERE r.status = 'failed'
  AND r.start_time > NOW() - INTERVAL '24 hours'
  AND j.jobname IN (
    'process-enrichment-queue',
    'consume-enrichment-queue',
    'process-google-maps-queue',
    'migrate-completed-leads'
  )
ORDER BY r.start_time DESC;
```

---

## 🔧 TROUBLESHOOTING

### **Problema: Cron não executa**

```sql
-- Verificar se está ativo:
SELECT jobname, active FROM cron.job WHERE jobname = 'seu-cron';

-- Ativar se necessário:
UPDATE cron.job SET active = true WHERE jobname = 'seu-cron';
```

### **Problema: "could not connect to server"**

```sql
-- Verificar se pg_net está configurado:
SELECT * FROM pg_net.http_request_queue LIMIT 1;

-- Se der erro, instalar extensão:
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### **Problema: "permission denied"**

```sql
-- Crons rodam como usuário 'postgres'
-- Verificar permissões nas tabelas:
GRANT ALL ON lead_extraction_staging TO postgres;
GRANT ALL ON lead_extraction_runs TO postgres;
GRANT ALL ON lead_extractions TO postgres;
GRANT ALL ON leads TO postgres;
```

### **Problema: "function not found"**

```sql
-- Verificar se função existe:
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname LIKE '%enrichment%';

-- Se não existir, executar migração:
-- /sql-migrations/03-google-maps-queue.sql
```

---

## ✅ CHECKLIST FINAL

Antes de considerar a configuração completa:

- [ ] `app.settings.service_role_key` configurado no database
- [ ] Todos os crons antigos deletados
- [ ] Função `enqueue_enrichment_leads()` corrigida (status 'google_fetched')
- [ ] Cron `process-enrichment-queue` criado e ativo
- [ ] Cron `process-google-maps-queue` criado e ativo (15 segundos)
- [ ] Decisão sobre enriquecimento tomada (Opção A, B ou C)
- [ ] Cron `consume-enrichment-queue` criado (se aplicável)
- [ ] Cron `migrate-completed-leads` criado
- [ ] Todos os crons testados manualmente
- [ ] View `v_cron_status` criada para monitoramento
- [ ] Logs verificados (sem erros críticos)

---

**✅ Se todos os itens estão marcados, seu sistema de Cron Jobs está 100% configurado!**

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verificar logs de erro:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE status = 'failed' 
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

2. Verificar se Edge Functions estão deployadas:
   ```bash
   supabase functions list
   ```

3. Verificar se extensões estão instaladas:
   ```sql
   SELECT * FROM pg_extension 
   WHERE extname IN ('pg_cron', 'pgmq', 'pg_net', 'http');
   ```

4. Consultar documentação:
   - [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)
   - [PGMQ Documentation](https://github.com/tembo-io/pgmq)

---

**Data de criação:** 2025-11-24  
**Versão:** 1.0
