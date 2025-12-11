# 🔧 CORREÇÃO RÁPIDA - ERROS DE CONFIGURAÇÃO

## 🚨 ERROS ENCONTRADOS:

1. ❌ Permission denied ao configurar `app.settings.service_role_key`
2. ❌ Schema "net" does not exist (pg_net não instalado)
3. ❌ Schedule "2 minutes" inválido (deve ser "2 minute" ou "120 seconds")
4. ❌ Column reference "custom_field_id" is ambiguous (trigger com bug)

---

## ⚡ SOLUÇÃO PASSO A PASSO:

### **PASSO 1: Instalar extensão pg_net**

```sql
-- Via SQL Editor:
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verificar:
SELECT * FROM pg_extension WHERE extname = 'pg_net';
-- ✅ Deve retornar 1 linha
```

---

### **PASSO 2: Desativar trigger problemática (temporário)**

```sql
-- Listar triggers na tabela leads:
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'leads'::regclass
ORDER BY tgname;

-- Copiar o resultado aqui para análise
-- Se aparecer algum trigger relacionado a "custom_fields_from_staging":

-- Desativar temporariamente:
ALTER TABLE leads DISABLE TRIGGER ALL;

-- ⚠️ IMPORTANTE: Isso desativa TODOS os triggers!
-- Após criar os leads, reativar:
-- ALTER TABLE leads ENABLE TRIGGER ALL;
```

**Alternativa mais segura:**
```sql
-- Desativar APENAS o trigger problemático:
-- (substituir NOME_DO_TRIGGER pelo nome real que aparecer):
DROP TRIGGER IF EXISTS on_lead_insert_custom_fields ON leads;
DROP FUNCTION IF EXISTS create_custom_fields_from_staging() CASCADE;
```

---

### **PASSO 3: Deletar TODOS os crons antigos**

```sql
-- Listar:
SELECT jobname FROM cron.job;

-- Deletar todos:
SELECT cron.unschedule(jobname) FROM cron.job;

-- Confirmar:
SELECT COUNT(*) FROM cron.job;
-- ✅ Deve retornar 0
```

---

### **PASSO 4: Criar CRON 1 - process-google-maps-queue (15 segundos)**

⚠️ **IMPORTANTE:** Substituir `SUA_SERVICE_ROLE_KEY_AQUI` pela sua key real do Vault!

```sql
SELECT cron.schedule(
  'process-google-maps-queue',
  '15 seconds',
  $$
  SELECT net.http_post(
    url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-google-maps-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY_AQUI'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**Como pegar sua Service Role Key:**
1. Dashboard → Settings → API
2. Copiar `service_role` (secret)
3. Cole no lugar de `SUA_SERVICE_ROLE_KEY_AQUI`

**Exemplo:**
```sql
'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...'
```

---

### **PASSO 5: Criar CRON 2 - migrate-completed-leads (120 segundos)**

```sql
SELECT cron.schedule(
  'migrate-completed-leads',
  '120 seconds',  -- ✅ Correto! (não usar "2 minutes")
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

---

### **PASSO 6: Verificar se os 2 crons foram criados**

```sql
SELECT 
  jobname, 
  schedule, 
  active,
  LEFT(command, 50) as command_preview
FROM cron.job 
ORDER BY jobname;
```

**Resultado esperado:**
```
jobname                     | schedule    | active | command_preview
----------------------------+-------------+--------+------------------
migrate-completed-leads     | 120 seconds | true   | WITH ready_to_migrate AS (...
process-google-maps-queue   | 15 seconds  | true   | SELECT net.http_post(...
```

---

### **PASSO 7: Testar execução dos crons**

```sql
-- Aguardar 15 segundos e verificar logs:
SELECT 
  j.jobname,
  r.status,
  r.return_message,
  r.start_time,
  r.end_time
FROM cron.job j
JOIN cron.job_run_details r ON r.jobid = j.jobid
WHERE j.jobname IN ('process-google-maps-queue', 'migrate-completed-leads')
ORDER BY r.start_time DESC
LIMIT 10;
```

**Status esperado:**
- ✅ `status = 'succeeded'` → Funcionando!
- ❌ `status = 'failed'` → Ver `return_message` para debugar

---

## 🔍 TROUBLESHOOTING:

### **Se process-google-maps-queue falhar:**

**Erro: "HTTP 401 Unauthorized"**
```sql
-- Verificar se a Service Role Key está correta:
-- Copiar novamente do Dashboard → Settings → API
-- Recriar o cron com a key correta
```

**Erro: "could not resolve host"**
```sql
-- URL do projeto está errada
-- Verificar se é: https://nlbcwaxkeaddfocigwuk.supabase.co
-- Dashboard → Settings → API → URL
```

**Erro: "function does not exist"**
```sql
-- Edge Function não está deployada
-- Verificar: Dashboard → Edge Functions → process-google-maps-queue
```

---

### **Se migrate-completed-leads falhar:**

**Erro: "foreign key violation on funnel_id"**
```sql
-- Verificar se extraction tem funnel_id válido:
SELECT 
  e.id,
  e.funnel_id,
  f.id as funnel_exists
FROM lead_extractions e
LEFT JOIN funnels f ON f.id = e.funnel_id
WHERE e.funnel_id IS NOT NULL
LIMIT 5;

-- Se funnel_exists for NULL, o funnel não existe!
-- Criar um funnel de teste ou corrigir o funnel_id
```

**Erro: "foreign key violation on column_id"**
```sql
-- Verificar se extraction tem column_id válido:
SELECT 
  e.id,
  e.column_id,
  c.id as column_exists
FROM lead_extractions e
LEFT JOIN funnel_columns c ON c.id = e.column_id
WHERE e.column_id IS NOT NULL
LIMIT 5;

-- Se column_exists for NULL, a coluna não existe!
```

**Erro: "column reference is ambiguous" (ainda)**
```sql
-- Desativar TODOS os triggers temporariamente:
ALTER TABLE leads DISABLE TRIGGER ALL;

-- Testar novamente
-- Se funcionar, o problema está em algum trigger

-- Identificar trigger problemático:
SELECT 
  t.tgname,
  p.proname,
  pg_get_functiondef(p.oid) as function_code
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'leads'::regclass;

-- Analisar o código de cada função
-- Procurar por variáveis com nomes iguais a colunas da tabela
```

---

## ✅ CHECKLIST FINAL:

Após seguir todos os passos:

- [ ] Extensão `pg_net` instalada e verificada
- [ ] Trigger problemática desativada/removida
- [ ] Todos os crons antigos deletados
- [ ] Cron `process-google-maps-queue` criado (15 seconds)
- [ ] Cron `migrate-completed-leads` criado (120 seconds)
- [ ] Service Role Key hardcoded no cron 1
- [ ] Ambos os crons com status `active = true`
- [ ] Logs mostram `status = 'succeeded'`
- [ ] Nenhum erro de "ambiguous column" ao inserir leads

---

## 🧪 TESTE FINAL:

```sql
-- 1. Enfileirar 1 lead de teste:
INSERT INTO lead_extraction_staging (
  workspace_id,
  extraction_run_id,
  status_extraction,
  status_enrichment,
  should_migrate,
  filter_passed,
  client_name,
  company,
  extracted_data
) VALUES (
  (SELECT id FROM workspaces LIMIT 1),
  (SELECT id FROM lead_extraction_runs LIMIT 1),
  'google_fetched',
  'pending',
  true,
  true,
  'Cliente Teste',
  'Empresa Teste',
  '{}'::jsonb
);

-- 2. Aguardar 120 segundos (2 minutos)

-- 3. Verificar se foi migrado:
SELECT 
  id,
  client_name,
  company,
  created_at
FROM leads
WHERE client_name = 'Cliente Teste'
ORDER BY created_at DESC
LIMIT 1;

-- ✅ Se aparecer o lead, está funcionando!

-- 4. Verificar staging:
SELECT 
  migrated_at,
  migrated_lead_id
FROM lead_extraction_staging
WHERE client_name = 'Cliente Teste';

-- ✅ migrated_at deve estar preenchido
-- ✅ migrated_lead_id deve ter o ID do lead criado
```

---

## 🚀 PRÓXIMOS PASSOS:

Após os crons estarem funcionando:

1. **Testar extração completa via Frontend**
2. **Monitorar logs dos crons**
3. **Verificar se leads aparecem no Kanban**
4. **Depois do MVP: Implementar enriquecimento**

---

**Data:** 2025-11-24  
**Versão:** Quick Fix 1.0
