# FIX: DUPLICATAS DE FOLLOW-UPS

## 📋 PROBLEMA

Quando o cron de follow-ups roda com intervalo < 1 minuto, **o mesmo follow-up pode ser enviado múltiplas vezes** para o mesmo lead, no mesmo horário.

### Cenário de Falha

```
10:00:00 - Cron 1 inicia
10:00:01 - Cron 1 busca jobs prontos → encontra Job X
10:00:05 - Cron 2 inicia (antes do Cron 1 terminar)
10:00:06 - Cron 2 busca jobs prontos → TAMBÉM encontra Job X ❌
10:00:10 - Cron 1 envia mensagem para Job X
10:00:12 - Cron 2 envia MESMA mensagem para Job X (DUPLICATA!)
```

### Causas Raiz

1. **Sem Lock Pessimista**: Função `get_ready_follow_up_jobs` não trava os jobs selecionados
2. **Sem UNIQUE Constraint**: Tabela `follow_up_history` permite múltiplos registros de `(job_id, sequence_number)`
3. **Race Condition**: Múltiplas execuções simultâneas processam o mesmo job

---

## ✅ SOLUÇÃO

### 1. Lock Pessimista (`FOR UPDATE SKIP LOCKED`)

**Antes:**
```sql
SELECT *
FROM follow_up_jobs
WHERE status IN ('pending', 'active')
  AND next_execution_at <= NOW()
ORDER BY next_execution_at ASC
LIMIT 10;
```

**Depois:**
```sql
SELECT *
FROM follow_up_jobs
WHERE status IN ('pending', 'active')
  AND next_execution_at <= NOW()
ORDER BY next_execution_at ASC
LIMIT 10
FOR UPDATE SKIP LOCKED;  -- ✅ CRÍTICO!
```

**Como Funciona:**

| Tempo | Cron 1 | Cron 2 | Resultado |
|-------|--------|--------|-----------|
| 10:00:00 | Busca jobs → Trava Job X | - | Job X TRAVADO |
| 10:00:05 | Processando Job X... | Busca jobs → PULA Job X (já travado) | Sem duplicata ✅ |
| 10:00:10 | Envia mensagem Job X | Processa Job Y | Cada um processa job diferente ✅ |

**Benefícios:**
- ✅ Apenas 1 execução processa cada job
- ✅ Jobs travados são PULADOS (SKIP LOCKED)
- ✅ Sem espera/deadlock (pula e segue)
- ✅ Funciona mesmo com 10+ execuções simultâneas

---

### 2. UNIQUE Constraint (`job_id + sequence_number`)

**Schema:**
```sql
ALTER TABLE follow_up_history
ADD CONSTRAINT follow_up_history_job_sequence_unique
UNIQUE (job_id, sequence_number);
```

**Proteção de Última Camada:**

Mesmo se houver bug/race condition e 2 execuções tentarem inserir o mesmo follow-up:

```sql
-- Cron 1
INSERT INTO follow_up_history (job_id, sequence_number, ...)
VALUES ('abc-123', 1, ...);  -- ✅ OK

-- Cron 2 (tentando duplicar)
INSERT INTO follow_up_history (job_id, sequence_number, ...)
VALUES ('abc-123', 1, ...);  -- ❌ ERRO: duplicate key value violates unique constraint
```

**Resultado:** Edge function recebe erro e NÃO envia mensagem duplicada.

---

## 🔒 GARANTIAS DA SOLUÇÃO

### Cenário 1: Cron a cada 5 minutos
✅ **Sem problema:** Jobs diferentes em cada execução

### Cenário 2: Cron a cada 30 segundos
✅ **Lock garante:** Cada execução pega jobs diferentes
✅ **UNIQUE garante:** Se 2 pegarem o mesmo (bug), apenas 1 insere

### Cenário 3: Cron a cada 10 segundos (extremo)
✅ **Lock + UNIQUE:** Múltiplas proteções em camadas

### Cenário 4: 10 execuções simultâneas
✅ **SKIP LOCKED:** Cada uma pega jobs diferentes
✅ **Performance:** Sem espera, sem deadlock

---

## 📊 ANTES vs DEPOIS

### Antes da Migração

```
┌─────────────┬──────────────┬──────────────┐
│ Execução    │ Jobs Pegados │ Jobs Enviados│
├─────────────┼──────────────┼──────────────┤
│ Cron 1      │ Job X, Y, Z  │ X, Y, Z      │
│ Cron 2 (30s)│ Job X, Y, Z  │ X, Y, Z (DUP)│ ❌
│ Cron 3 (1m) │ Job X, Y, Z  │ X, Y, Z (DUP)│ ❌
└─────────────┴──────────────┴──────────────┘

Resultado: 3 mensagens duplicadas enviadas! 😱
```

### Depois da Migração

```
┌─────────────┬──────────────┬──────────────┐
│ Execução    │ Jobs Pegados │ Jobs Enviados│
├─────────────┼──────────────┼──────────────┤
│ Cron 1      │ Job X        │ X            │ ✅
│ Cron 2 (30s)│ Job Y        │ Y            │ ✅
│ Cron 3 (1m) │ Job Z        │ Z            │ ✅
└─────────────┴──────────────┴──────────────┘

Resultado: Nenhuma duplicata! 🎉
```

---

## 🧪 COMO TESTAR

### 1. Testar Lock Pessimista

```sql
-- Terminal 1 (simular Cron 1)
BEGIN;
SELECT * FROM get_ready_follow_up_jobs(5);
-- NÃO COMMITAR AINDA!

-- Terminal 2 (simular Cron 2 simultâneo)
BEGIN;
SELECT * FROM get_ready_follow_up_jobs(5);
-- Deve retornar JOBS DIFERENTES (ou vazio se não houver mais)
ROLLBACK;

-- Terminal 1 (finalizar)
ROLLBACK;
```

**Resultado esperado:** Terminal 2 NÃO vê os jobs travados pelo Terminal 1.

---

### 2. Testar UNIQUE Constraint

```sql
-- Inserir follow-up
INSERT INTO follow_up_history (job_id, sequence_number, ...)
VALUES ('test-job-id', 1, ...);

-- Tentar duplicar
INSERT INTO follow_up_history (job_id, sequence_number, ...)
VALUES ('test-job-id', 1, ...);
-- ERRO: duplicate key value violates unique constraint "follow_up_history_job_sequence_unique"
```

**Resultado esperado:** Segunda inserção FALHA com erro de constraint única.

---

### 3. Testar em Produção (Logs)

**Antes:**
```
[10:00:10] ✅ Follow-up enviado: Job abc-123 (sequência 1)
[10:00:42] ✅ Follow-up enviado: Job abc-123 (sequência 1) ← DUPLICATA!
[10:01:15] ✅ Follow-up enviado: Job abc-123 (sequência 1) ← DUPLICATA!
```

**Depois:**
```
[10:00:10] ✅ Follow-up enviado: Job abc-123 (sequência 1)
[10:00:42] ✅ Follow-up enviado: Job def-456 (sequência 1)
[10:01:15] ✅ Follow-up enviado: Job ghi-789 (sequência 1)
```

---

## 🚀 DEPLOYMENT

### 1. Aplicar Migração

```bash
# Via Supabase CLI
supabase db push

# Ou aplicar manualmente via Dashboard
# SQL Editor → colar conteúdo de 20251229000000_fix_follow_up_duplicates.sql
```

### 2. Verificar Aplicação

```sql
-- Verificar constraint única
SELECT conname
FROM pg_constraint
WHERE conname = 'follow_up_history_job_sequence_unique';
-- Deve retornar 1 linha

-- Verificar definição da função
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_ready_follow_up_jobs';
-- Deve conter "FOR UPDATE SKIP LOCKED"
```

### 3. Monitorar Logs

```bash
# Via Supabase Dashboard
# Logs → Edge Functions → process-follow-up-queue
# Buscar por duplicatas nos próximos 24h
```

---

## 📚 REFERÊNCIAS

- **PostgreSQL Locking**: https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS
- **SKIP LOCKED**: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
- **UNIQUE Constraints**: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS

---

## 🎯 RESUMO EXECUTIVO

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Duplicatas** | Sim (frequentes) | Não ✅ |
| **Race Conditions** | Sim | Não ✅ |
| **Lock Pessimista** | Não | Sim ✅ |
| **UNIQUE Constraint** | Não | Sim ✅ |
| **Cron < 1min** | ❌ Quebra | ✅ Funciona |
| **Performance** | OK | OK ✅ |
| **Idempotência** | ❌ Não | ✅ Sim |

**Status:** ✅ PRONTO PARA PRODUÇÃO

**Migração:** `20251229000000_fix_follow_up_duplicates.sql`

**Risco:** BAIXO (migration adiciona proteções, não quebra código existente)

**Rollback:** Remover constraint e recriar função sem FOR UPDATE (não recomendado)
