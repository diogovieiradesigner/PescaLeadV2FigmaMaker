# TESTES DE VALIDAÇÃO: FIXES DE FOLLOW-UPS

## 🎯 OBJETIVO

Validar que as correções de follow-ups foram aplicadas corretamente **SEM precisar testar com clientes reais**.

---

## ✅ TESTE 1: Verificar UNIQUE Constraint

### SQL para executar:

```sql
-- Verificar se a constraint única foi criada
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'follow_up_history_job_sequence_unique'
  AND conrelid = 'public.follow_up_history'::regclass;
```

### Resultado Esperado:

```
constraint_name                          | constraint_type | definition
-----------------------------------------+-----------------+------------------------------------------
follow_up_history_job_sequence_unique   | u               | UNIQUE (job_id, sequence_number)
```

✅ Se retornar 1 linha → **CONSTRAINT CRIADA COM SUCESSO**
❌ Se retornar 0 linhas → **ERRO: constraint não foi criada**

---

## ✅ TESTE 2: Verificar Lock Pessimista na Função

### SQL para executar:

```sql
-- Buscar definição da função get_ready_follow_up_jobs
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'get_ready_follow_up_jobs'
  AND pronamespace = 'public'::regnamespace;
```

### Resultado Esperado:

A definição deve conter:

```sql
...
FOR UPDATE SKIP LOCKED;
...
```

✅ Se contém `FOR UPDATE SKIP LOCKED` → **LOCK PESSIMISTA ATIVO**
❌ Se NÃO contém → **ERRO: função não foi atualizada**

---

## ✅ TESTE 3: Verificar Duplicatas Removidas

### SQL para executar:

```sql
-- Buscar duplicatas restantes em follow_up_history
SELECT
  job_id,
  sequence_number,
  COUNT(*) as duplicates
FROM public.follow_up_history
GROUP BY job_id, sequence_number
HAVING COUNT(*) > 1;
```

### Resultado Esperado:

```
(0 rows)
```

✅ Se retornar 0 linhas → **TODAS AS DUPLICATAS REMOVIDAS**
❌ Se retornar linhas → **AINDA HÁ DUPLICATAS** (execute a limpeza novamente)

---

## ✅ TESTE 4: Testar UNIQUE Constraint (INSERT Duplicado)

### SQL para executar:

```sql
-- Criar um job de teste
DO $$
DECLARE
  v_test_job_id UUID;
  v_test_conversation_id UUID;
BEGIN
  -- Buscar uma conversa real para testar (ou criar uma fake)
  SELECT id INTO v_test_conversation_id
  FROM public.conversations
  LIMIT 1;

  -- Criar job de teste
  INSERT INTO public.follow_up_jobs (
    workspace_id,
    conversation_id,
    trigger_message_id,
    status,
    current_model_index,
    next_execution_at
  )
  SELECT
    workspace_id,
    v_test_conversation_id,
    (SELECT id FROM messages WHERE conversation_id = v_test_conversation_id LIMIT 1),
    'pending',
    0,
    NOW()
  FROM workspaces
  LIMIT 1
  RETURNING id INTO v_test_job_id;

  -- Tentar inserir primeiro histórico
  INSERT INTO public.follow_up_history (
    job_id,
    conversation_id,
    sequence_number,
    message_sent,
    status
  ) VALUES (
    v_test_job_id,
    v_test_conversation_id,
    1,
    'Teste primeira mensagem',
    'sent'
  );

  RAISE NOTICE 'Primeira inserção OK: job_id = %, sequence = 1', v_test_job_id;

  -- Tentar inserir DUPLICATA (deve FALHAR)
  BEGIN
    INSERT INTO public.follow_up_history (
      job_id,
      conversation_id,
      sequence_number,
      message_sent,
      status
    ) VALUES (
      v_test_job_id,
      v_test_conversation_id,
      1,  -- MESMA SEQUÊNCIA!
      'Teste DUPLICATA (não deve inserir)',
      'sent'
    );

    RAISE EXCEPTION 'ERRO: DUPLICATA FOI INSERIDA! Constraint não está funcionando!';

  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ SUCESSO: Constraint bloqueou duplicata (esperado)';
  END;

  -- Limpar teste
  DELETE FROM public.follow_up_history WHERE job_id = v_test_job_id;
  DELETE FROM public.follow_up_jobs WHERE id = v_test_job_id;

  RAISE NOTICE '✅ Teste concluído e limpeza feita';
END $$;
```

### Resultado Esperado:

```
NOTICE:  Primeira inserção OK: job_id = xxx, sequence = 1
NOTICE:  ✅ SUCESSO: Constraint bloqueou duplicata (esperado)
NOTICE:  ✅ Teste concluído e limpeza feita
```

✅ Se aparecer "SUCESSO: Constraint bloqueou duplicata" → **CONSTRAINT FUNCIONANDO**
❌ Se aparecer "ERRO: DUPLICATA FOI INSERIDA" → **CONSTRAINT NÃO ESTÁ FUNCIONANDO**

---

## ✅ TESTE 5: Testar Lock Pessimista (Simulação de Concorrência)

### Como testar:

Abra **2 abas** do SQL Editor no Supabase Dashboard e execute simultaneamente:

**ABA 1:**
```sql
BEGIN;

-- Travar jobs prontos
SELECT * FROM get_ready_follow_up_jobs(5);

-- NÃO COMMITAR! Aguardar 10 segundos
-- (deixar transação aberta)

SELECT pg_sleep(10);

ROLLBACK;
```

**ABA 2 (executar enquanto Aba 1 está aguardando):**
```sql
BEGIN;

-- Tentar pegar jobs (deve pular os travados pela Aba 1)
SELECT * FROM get_ready_follow_up_jobs(5);

ROLLBACK;
```

### Resultado Esperado:

**Aba 1:** Retorna jobs A, B, C
**Aba 2:** Retorna jobs D, E, F (DIFERENTES dos da Aba 1)

✅ Se Aba 2 retorna jobs **DIFERENTES** → **LOCK FUNCIONANDO**
❌ Se Aba 2 retorna os **MESMOS** jobs → **LOCK NÃO ESTÁ FUNCIONANDO**

---

## ✅ TESTE 6: Verificar Índices Criados

### SQL para executar:

```sql
-- Listar índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_follow_up_jobs_ready',
  'idx_follow_up_history_job_sequence',
  'follow_up_history_job_sequence_unique' -- PostgreSQL cria índice automático para UNIQUE
)
ORDER BY indexname;
```

### Resultado Esperado:

```
tablename              | indexname
-----------------------+----------------------------------------------
follow_up_jobs         | idx_follow_up_jobs_ready
follow_up_history      | idx_follow_up_history_job_sequence
follow_up_history      | follow_up_history_job_sequence_unique
```

✅ Se retornar 3 linhas → **ÍNDICES CRIADOS**
❌ Se retornar menos → **ÍNDICES FALTANDO**

---

## ✅ TESTE 7: Verificar Permissions

### SQL para executar:

```sql
-- Verificar permissions de EXECUTE nas funções
SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_userbyid(p.proowner) AS owner,
  array_agg(DISTINCT pr.rolname) AS roles_with_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_proc_acl pa ON pa.proname = p.proname
LEFT JOIN pg_roles pr ON pr.oid = ANY(aclexplode(p.proacl).grantee)
WHERE n.nspname = 'public'
  AND p.proname IN ('get_ready_follow_up_jobs', 'validate_follow_up_execution')
GROUP BY p.proname, p.proowner;
```

### Resultado Esperado:

```
function_name                    | owner     | roles_with_execute
---------------------------------+-----------+----------------------------
get_ready_follow_up_jobs        | postgres  | {postgres, service_role, ...}
validate_follow_up_execution    | postgres  | {postgres, service_role, ...}
```

✅ Se `service_role` está na lista → **PERMISSIONS OK**
❌ Se `service_role` NÃO está → **ERRO: grant permissions**

---

## ✅ TESTE 8: Verificar Sanitização de Aspas (Mock)

### SQL para executar:

```sql
-- Criar template de teste com aspas
DO $$
DECLARE
  v_test_category_id UUID;
  v_test_model_id UUID;
BEGIN
  -- Buscar uma categoria existente
  SELECT id INTO v_test_category_id
  FROM public.follow_up_categories
  WHERE is_published = true
  LIMIT 1;

  IF v_test_category_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhuma categoria publicada encontrada. Pule este teste.';
    RETURN;
  END IF;

  -- Inserir modelo com ASPAS (para testar sanitização no Edge Function)
  INSERT INTO public.follow_up_models (
    workspace_id,
    category_id,
    name,
    message,
    wait_time,
    time_unit,
    sequence_order,
    is_active
  )
  SELECT
    workspace_id,
    v_test_category_id,
    'TESTE - Mensagem com Aspas',
    '"Olá {nome}, esta mensagem tem aspas!"',  -- ✅ COM ASPAS
    1,
    'hours',
    999,
    false  -- INATIVO para não afetar produção
  FROM follow_up_categories
  WHERE id = v_test_category_id
  RETURNING id INTO v_test_model_id;

  -- Verificar se foi inserido
  RAISE NOTICE '✅ Modelo de teste criado: id = %', v_test_model_id;
  RAISE NOTICE '📝 Mensagem original: "%"', (
    SELECT message FROM follow_up_models WHERE id = v_test_model_id
  );

  -- Limpar teste
  DELETE FROM public.follow_up_models WHERE id = v_test_model_id;
  RAISE NOTICE '🧹 Teste limpo';
END $$;
```

### Resultado Esperado:

```
NOTICE:  ✅ Modelo de teste criado: id = xxx
NOTICE:  📝 Mensagem original: "Olá {nome}, esta mensagem tem aspas!"
NOTICE:  🧹 Teste limpo
```

**Observação:** A sanitização acontece no **Edge Function**, não no SQL. Este teste apenas confirma que mensagens com aspas podem ser salvas. A sanitização será testada após o deploy da edge function.

---

## ✅ TESTE 9: Verificar Edge Function Deploy (Após Deploy)

### Como testar após deploy de `process-follow-up-queue`:

```sql
-- Buscar versão da função nos logs
-- Dashboard → Edge Functions → process-follow-up-queue → Logs
-- Buscar por: "Processando fila de follow-ups"
```

**Logs esperados após deploy:**
- `🧹 [FOLLOW-UP] Mensagem sanitizada: "..." -> "..."`
  (quando sanitizar aspas)

---

## ✅ TESTE 10: Teste End-to-End Seguro (Conversa Interna)

### Passo a Passo:

1. **Criar conversa de teste interna:**
```sql
-- Criar conversa fake (não vai enviar WhatsApp real)
INSERT INTO public.conversations (
  workspace_id,
  contact_phone,
  contact_name,
  status,
  inbox_id
)
SELECT
  id,
  '5511999999999',  -- Número fake
  'Lead Teste Follow-up',
  'active',
  NULL
FROM workspaces
LIMIT 1
RETURNING id;
-- Anote o conversation_id retornado
```

2. **Criar mensagem inicial (trigger):**
```sql
-- Substitua <CONVERSATION_ID> pelo ID retornado acima
INSERT INTO public.messages (
  conversation_id,
  message_type,
  content_type,
  text_content,
  created_at
) VALUES (
  '<CONVERSATION_ID>',
  'received',
  'text',
  'Olá, tenho interesse no produto',
  NOW() - INTERVAL '2 hours'
);
-- Anote o message_id retornado
```

3. **Criar job de follow-up:**
```sql
-- Substitua <CONVERSATION_ID> e <MESSAGE_ID>
INSERT INTO public.follow_up_jobs (
  workspace_id,
  conversation_id,
  trigger_message_id,
  last_checked_message_id,
  status,
  current_model_index,
  next_execution_at
)
SELECT
  workspace_id,
  '<CONVERSATION_ID>',
  '<MESSAGE_ID>',
  '<MESSAGE_ID>',
  'pending',
  0,
  NOW() - INTERVAL '1 minute'  -- Pronto para execução AGORA
FROM conversations
WHERE id = '<CONVERSATION_ID>'
RETURNING id;
-- Anote o job_id retornado
```

4. **Testar get_ready_follow_up_jobs (com lock):**
```sql
-- ABA 1: Travar job
BEGIN;
SELECT * FROM get_ready_follow_up_jobs(10);
-- Deve retornar o job criado

-- NÃO COMMITAR! Abrir outra aba...

-- ABA 2: Tentar pegar mesmo job
BEGIN;
SELECT * FROM get_ready_follow_up_jobs(10);
-- NÃO deve retornar o job (já travado pela Aba 1)
ROLLBACK;

-- Voltar para Aba 1
ROLLBACK;
```

5. **Testar UNIQUE constraint:**
```sql
-- Substitua <JOB_ID> e <CONVERSATION_ID>
-- Inserir primeiro histórico
INSERT INTO public.follow_up_history (
  job_id,
  conversation_id,
  sequence_number,
  message_sent,
  status
) VALUES (
  '<JOB_ID>',
  '<CONVERSATION_ID>',
  1,
  'Primeira mensagem',
  'sent'
);

-- Tentar inserir duplicata (deve FALHAR)
INSERT INTO public.follow_up_history (
  job_id,
  conversation_id,
  sequence_number,
  message_sent,
  status
) VALUES (
  '<JOB_ID>',
  '<CONVERSATION_ID>',
  1,  -- MESMA SEQUÊNCIA!
  'Duplicata (não deve inserir)',
  'sent'
);
-- ERRO ESPERADO: duplicate key value violates unique constraint
```

6. **Limpar dados de teste:**
```sql
-- Substitua <CONVERSATION_ID> e <JOB_ID>
DELETE FROM public.follow_up_history WHERE job_id = '<JOB_ID>';
DELETE FROM public.follow_up_jobs WHERE id = '<JOB_ID>';
DELETE FROM public.messages WHERE conversation_id = '<CONVERSATION_ID>';
DELETE FROM public.conversations WHERE id = '<CONVERSATION_ID>';
```

---

## ✅ TESTE 11: Verificar Sanitização (Após Deploy)

### Pré-requisito: Deploy de `process-follow-up-queue`

### Como testar:

1. **Criar modelo com aspas:**
```sql
-- Criar modelo com aspas para testar sanitização
INSERT INTO public.follow_up_models (
  workspace_id,
  category_id,
  name,
  message,
  wait_time,
  time_unit,
  sequence_order,
  is_active
)
SELECT
  workspace_id,
  id,
  'TESTE - Mensagem com Aspas',
  '"Olá {nome}, teste de aspas!"',
  1,
  'hours',
  1,
  true  -- ATIVO para testar
FROM follow_up_categories
WHERE is_published = true
LIMIT 1
RETURNING id;
-- Anote o model_id
```

2. **Criar job apontando para este modelo:**
```sql
-- (Usar passos do Teste 10 para criar conversa + job)
```

3. **Invocar process-follow-up-queue:**
```bash
# Via curl ou Dashboard → Edge Functions → process-follow-up-queue → Invoke
curl -X POST https://wntrfojbuwbxwonbimui.supabase.co/functions/v1/process-follow-up-queue \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

4. **Verificar logs:**
```
# Dashboard → Edge Functions → process-follow-up-queue → Logs

Buscar por:
🧹 [FOLLOW-UP] Mensagem sanitizada: ""Olá {nome}, teste de aspas!"" -> "Olá {nome}, teste de aspas!"
```

5. **Verificar histórico:**
```sql
-- Verificar se mensagem foi salva SEM aspas
SELECT
  message_sent,
  status
FROM public.follow_up_history
WHERE model_id = '<MODEL_ID>'
ORDER BY sent_at DESC
LIMIT 1;
```

**Resultado esperado:**
```
message_sent                        | status
------------------------------------+--------
Olá {nome}, teste de aspas!        | sent
```

✅ Se mensagem **NÃO tem aspas** no início/fim → **SANITIZAÇÃO OK**
❌ Se mensagem **TEM aspas** → **SANITIZAÇÃO FALHOU**

6. **Limpar teste:**
```sql
DELETE FROM public.follow_up_models WHERE name = 'TESTE - Mensagem com Aspas';
```

---

## 📊 CHECKLIST DE VALIDAÇÃO

Marque cada item após executar o teste:

- [ ] **Teste 1:** UNIQUE constraint criada
- [ ] **Teste 2:** Lock pessimista (`FOR UPDATE SKIP LOCKED`) na função
- [ ] **Teste 3:** Duplicatas removidas
- [ ] **Teste 4:** INSERT duplicado é bloqueado
- [ ] **Teste 5:** Lock previne concorrência (2 abas)
- [ ] **Teste 6:** Índices criados
- [ ] **Teste 7:** Permissions corretas
- [ ] **Teste 8:** Edge function deployed
- [ ] **Teste 9:** Sanitização funcionando (logs)
- [ ] **Teste 10:** Mensagens salvas sem aspas

---

## 🎯 RESUMO DE VALIDAÇÃO

### Verificação Rápida (1 minuto)

Execute apenas estes 3 SQLs:

```sql
-- 1. Constraint única existe?
SELECT COUNT(*) as constraint_ok
FROM pg_constraint
WHERE conname = 'follow_up_history_job_sequence_unique';
-- Deve retornar: 1

-- 2. Lock pessimista ativo?
SELECT pg_get_functiondef(oid) LIKE '%FOR UPDATE SKIP LOCKED%' as lock_ok
FROM pg_proc
WHERE proname = 'get_ready_follow_up_jobs';
-- Deve retornar: true

-- 3. Duplicatas removidas?
SELECT COUNT(*) as duplicates_remaining
FROM (
  SELECT job_id, sequence_number, COUNT(*) as cnt
  FROM public.follow_up_history
  GROUP BY job_id, sequence_number
  HAVING COUNT(*) > 1
) t;
-- Deve retornar: 0
```

**Se os 3 retornarem os valores esperados → ✅ TUDO OK!**

---

## 🚀 PRÓXIMO PASSO

**Após validar tudo:**

1. ✅ Deploy de `process-follow-up-queue` (sanitização de aspas)
```bash
supabase functions deploy process-follow-up-queue
```

2. ✅ Monitorar logs por 24h
   - Buscar por duplicatas
   - Buscar por `🧹 [FOLLOW-UP] Mensagem sanitizada`
   - Verificar se mensagens estão limpas

3. ✅ Feedback dos usuários
   - Mensagens sem aspas extras?
   - Sem duplicatas de follow-ups?

---

## 📚 TROUBLESHOOTING

### Se o Teste 4 (INSERT duplicado) NÃO falhar:

```sql
-- Verificar se constraint realmente existe
\d+ follow_up_history
-- Deve listar a constraint

-- Re-aplicar constraint manualmente
ALTER TABLE public.follow_up_history
ADD CONSTRAINT follow_up_history_job_sequence_unique
UNIQUE (job_id, sequence_number);
```

### Se o Teste 5 (Lock) permitir mesmos jobs:

```sql
-- Verificar definição da função
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_ready_follow_up_jobs';

-- Deve conter: FOR UPDATE SKIP LOCKED

-- Se não contém, re-aplicar função:
DROP FUNCTION IF EXISTS get_ready_follow_up_jobs(INTEGER);
-- (copiar CREATE FUNCTION da migration)
```

---

**IMPORTANTE:** Estes testes validam que as correções foram aplicadas corretamente NO BANCO DE DADOS. A sanitização de aspas precisa do deploy da edge function para funcionar.
