# 🔍 Auditoria Completa - Sistema de Campanhas

## 📋 Resumo Executivo

Esta auditoria analisa o sistema de campanhas em múltiplas camadas, identificando problemas críticos, graves e moderados que podem afetar a estabilidade, confiabilidade e performance do sistema.

**Data da Auditoria:** 2025-01-XX  
**Escopo:** Edge Functions, SQL Functions, Database Schema, Race Conditions, Timezone Handling, Error Handling

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **DUPLICAÇÃO DE FUNÇÃO SQL: `increment_campaign_run_metrics`**

**Severidade:** 🔴 CRÍTICA

**Problema:**
Existem **DUAS versões** da função `increment_campaign_run_metrics` no banco de dados:

1. **Versão 1:** `increment_campaign_run_metrics(p_run_id uuid, p_field text, p_increment integer DEFAULT 1)`
2. **Versão 2:** `increment_campaign_run_metrics(p_run_id uuid, p_success integer DEFAULT 0, p_failed integer DEFAULT 0, p_skipped integer DEFAULT 0)`

**Localização:**
- Banco de dados: `public.increment_campaign_run_metrics` (2 definições)

**Impacto:**
- PostgreSQL pode escolher a versão errada baseado na assinatura
- Comportamento imprevisível quando chamado
- Pode causar erros silenciosos ou falhas em produção

**Código Afetado:**
```typescript
// campaign-process-queue/index.ts (linhas 744, 786)
await supabase.rpc('increment_campaign_run_metrics', {
  p_run_id: runId,
  p_success: 1,
  p_failed: 0,
  p_skipped: 0
});
```

**Solução:**
1. Remover a versão antiga (`p_field`, `p_increment`)
2. Manter apenas a versão nova (`p_success`, `p_failed`, `p_skipped`)
3. Verificar se há outros lugares usando a versão antiga

---

### 2. **RACE CONDITION: Finalização de Campanha**

**Severidade:** 🔴 CRÍTICA

**Problema:**
A verificação de finalização em `campaign-process-queue/index.ts` (linhas 797-816) pode ter race condition:

```typescript
// Verificar runs completos
const runIds = [...new Set(messages.map(m => m.campaign_runs.id))];
for (const runId of runIds) {
  const { data: run } = await supabase
    .from('campaign_runs')
    .select('leads_total, leads_processed, status')
    .eq('id', runId)
    .single();

  if (run && run.status === 'running' && run.leads_processed >= run.leads_total) {
    await supabase
      .from('campaign_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', runId);
  }
}
```

**Cenário de Falha:**
1. Worker A processa última mensagem → `leads_processed = 100`, `leads_total = 100`
2. Worker B também processa mensagem → `leads_processed = 101` (devido a race condition em `increment_campaign_run_metrics`)
3. Worker A verifica: `100 >= 100` → marca como `completed`
4. Worker B verifica: `101 >= 100` → também marca como `completed` (redundante, mas não crítico)
5. **PROBLEMA REAL:** Se `increment_campaign_run_metrics` tiver race condition, `leads_processed` pode estar incorreto

**Impacto:**
- Campanha pode finalizar prematuramente
- Campanha pode nunca finalizar
- Métricas incorretas

**Solução:**
1. Usar `UPDATE ... WHERE id = $1 AND status = 'running' AND leads_processed >= leads_total RETURNING id` para finalização atômica
2. Verificar se `increment_campaign_run_metrics` é realmente atômico (ver problema #1)

---

### 3. **FUNÇÃO `timeToDate` COM LÓGICA INCORRETA DE TIMEZONE**

**Severidade:** 🔴 CRÍTICA

**Problema:**
A função `timeToDate` em `campaign-execute-now/index.ts` e `campaign-scheduler/index.ts` calcula offset de forma incorreta:

```typescript
// Calcular offset do timezone comparando UTC com timezone
const utcHour = now.getUTCHours();
const tzParts = formatter.formatToParts(now);
const tzHour = parseInt(tzParts.find(p => p.type === 'hour')!.value);

// Offset aproximado (pode variar com DST, mas é melhor que nada)
const offsetHours = utcHour - tzHour;
```

**Problemas:**
1. **Offset calculado no momento errado:** Usa `now` (horário atual) para calcular offset, mas deveria usar a data base
2. **Offset pode ser negativo ou positivo incorretamente:** A lógica `utcHour - tzHour` não considera se o timezone está à frente ou atrás de UTC
3. **Não funciona para timezones com DST:** Offset muda durante o ano
4. **Aplicação do offset está invertida:** `localDate.getTime() - (offsetHours * 60 * 60 * 1000)` subtrai quando deveria somar (ou vice-versa)

**Exemplo de Falha:**
- Timezone: `America/Sao_Paulo` (UTC-3)
- `now` = 15:00 UTC = 12:00 BRT
- `utcHour = 15`, `tzHour = 12`
- `offsetHours = 15 - 12 = 3` (ERRADO! Deveria ser -3)
- `localDate = 2025-01-15 10:00:00` (hora local desejada)
- `result = localDate - (3 * 3600000) = 2025-01-15 07:00:00` (ERRADO!)

**Solução:**
Usar `Intl.DateTimeFormat` corretamente ou biblioteca de timezone:

```typescript
function timeToDate(timeStr: string, baseDate: Date, timezone: string = 'America/Sao_Paulo'): Date {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  
  // Criar string de data/hora no formato ISO
  const dateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds || 0).padStart(2, '0')}`;
  
  // Usar Intl para converter para UTC considerando timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse da string considerando timezone
  // ... implementação correta usando Date ou biblioteca
}
```

**Alternativa Simples:**
Usar `luxon` ou `date-fns-tz` para manipulação correta de timezones.

---

## ⚠️ PROBLEMAS GRAVES

### 4. **FALTA VALIDAÇÃO: `campaign_messages.status` Pode Ser Inválido**

**Severidade:** ⚠️ GRAVE

**Problema:**
O CHECK constraint em `campaign_messages.status` permite apenas:
- `'pending'`, `'queued'`, `'generating'`, `'sending'`, `'sent'`, `'failed'`, `'skipped'`, `'replied'`

Mas o código pode tentar atualizar para outros valores ou valores NULL.

**Localização:**
- `campaign-process-queue/index.ts` (múltiplas linhas)

**Impacto:**
- Erros de constraint violation em produção
- Mensagens podem ficar em estado inválido

**Solução:**
Adicionar validação antes de atualizar status:

```typescript
const validStatuses = ['pending', 'queued', 'generating', 'sending', 'sent', 'failed', 'skipped', 'replied'];
if (!validStatuses.includes(newStatus)) {
  throw new Error(`Invalid status: ${newStatus}`);
}
```

---

### 5. **FALTA VALIDAÇÃO: `campaign_runs.status` Pode Ser Inválido**

**Severidade:** ⚠️ GRAVE

**Problema:**
Similar ao problema #4, mas para `campaign_runs.status`.

**CHECK Constraint permite:**
- `'running'`, `'completed'`, `'failed'`, `'cancelled'`

**Impacto:**
- Erros de constraint violation
- Runs podem ficar em estado inválido

**Solução:**
Adicionar validação antes de atualizar status.

---

### 6. **MENSAGENS ANTIGAS: Filtro de 1 Hora Pode Ser Insuficiente**

**Severidade:** ⚠️ GRAVE

**Problema:**
O código filtra mensagens agendadas há mais de 1 hora:

```typescript
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
.lte('scheduled_at', now.toISOString())
.gte('scheduled_at', oneHourAgo.toISOString())
```

**Cenários Problemáticos:**
1. **Campanha pausada e retomada:** Mensagens agendadas há 2 horas podem ser processadas
2. **Falha temporária do sistema:** Mensagens acumuladas podem ser processadas fora de ordem
3. **Timezone changes:** Durante mudança de horário, cálculo pode estar errado

**Impacto:**
- Mensagens enviadas fora do horário configurado
- Leads podem receber mensagens muito atrasadas

**Solução:**
1. Verificar `end_time` da campanha antes de processar mensagem antiga
2. Se `scheduled_at < end_time_today - 1h`, marcar como `skipped` com motivo específico
3. Adicionar log quando mensagem antiga é processada

---

### 7. **FALTA VALIDAÇÃO: `max_split_parts` Pode Ser > 5**

**Severidade:** ⚠️ GRAVE

**Problema:**
O CHECK constraint permite `max_split_parts` entre 1 e 5, mas o código não valida antes de usar:

```typescript
const maxSplitParts = config.max_split_parts || 3;
const safeMaxParts = Math.max(1, Math.min(5, maxParts));
```

**Impacto:**
- Se constraint falhar, código pode quebrar
- Se valor for NULL, usa 3 (pode não ser o desejado)

**Solução:**
Adicionar validação explícita:

```typescript
const maxSplitParts = config.max_split_parts;
if (!maxSplitParts || maxSplitParts < 1 || maxSplitParts > 5) {
  throw new Error(`Invalid max_split_parts: ${maxSplitParts}`);
}
```

---

## 📊 PROBLEMAS MODERADOS

### 8. **PERFORMANCE: Query de Mensagens Pode Ser Lenta**

**Severidade:** 📊 MODERADO

**Problema:**
A query em `campaign-process-queue/index.ts` (linhas 346-371) faz JOIN com `campaign_runs` e `campaign_configs`:

```typescript
const { data: messages, error: msgError } = await supabase
  .from('campaign_messages')
  .select(`
    *,
    campaign_runs!inner(
      id,
      config_id,
      status,
      campaign_configs!inner(
        workspace_id,
        inbox_id,
        target_column_id,
        ai_instructions,
        split_messages,
        max_split_parts,
        end_time,
        timezone
      )
    )
  `)
  .eq('status', 'pending')
  .eq('campaign_runs.status', 'running')
  .lte('scheduled_at', now.toISOString())
  .gte('scheduled_at', oneHourAgo.toISOString())
  .order('scheduled_at', { ascending: true })
  .limit(batch_size);
```

**Problemas:**
1. **JOIN aninhado:** Pode ser lento com muitas mensagens
2. **Falta índice:** `(status, scheduled_at)` pode não ter índice composto
3. **Filtro em JOIN:** `.eq('campaign_runs.status', 'running')` pode não usar índice

**Solução:**
1. Adicionar índice: `CREATE INDEX idx_campaign_messages_status_scheduled ON campaign_messages(status, scheduled_at) WHERE status = 'pending';`
2. Considerar buscar `campaign_configs` separadamente e fazer join em memória
3. Adicionar índice em `campaign_runs(status)` se não existir

---

### 9. **FALTA TRATAMENTO: Erro em `getWorkspaceAIModel`**

**Severidade:** 📊 MODERADO

**Problema:**
Se `getWorkspaceAIModel` retornar `null`, o código lança erro:

```typescript
if (!aiModel) {
  throw new Error('Nenhum modelo de IA configurado no ai_agents para este workspace. Configure o agente de IA primeiro.');
}
```

**Impacto:**
- Campanha falha completamente se modelo não configurado
- Não há fallback ou mensagem clara para o usuário

**Solução:**
1. Marcar mensagem como `failed` com motivo específico
2. Continuar processando outras mensagens
3. Logar erro detalhado

---

### 10. **FALTA VALIDAÇÃO: `daily_limit` Pode Ser > 500**

**Severidade:** 📊 MODERADO

**Problema:**
CHECK constraint permite `daily_limit` entre 1 e 500, mas código não valida antes de usar.

**Impacto:**
- Se constraint falhar, código pode quebrar
- Se valor for NULL, pode causar erro

**Solução:**
Adicionar validação explícita antes de usar.

---

### 11. **FALTA LOGGING: Erros em `splitMessageWithAI`**

**Severidade:** 📊 MODERADO

**Problema:**
Se `splitMessageWithAI` falhar, retorna mensagem original mas não loga o erro adequadamente:

```typescript
} catch (error) {
  console.error('[MessageSplit] Unexpected error:', error);
  return { messages: [message], tokensUsed: 0, delayMs: 500 };
}
```

**Impacto:**
- Erros de split são silenciosos
- Não há como rastrear problemas de split

**Solução:**
Adicionar log via `log()` function com detalhes do erro.

---

### 12. **FALTA VALIDAÇÃO: `min_interval_seconds` Pode Ser NULL**

**Severidade:** 📊 MODERADO

**Problema:**
Código usa `config.min_interval_seconds || 120`, mas se for NULL, usa 120. CHECK constraint não permite NULL, mas se constraint falhar, código pode quebrar.

**Solução:**
Adicionar validação explícita.

---

## 🔵 PROBLEMAS BAIXOS

### 13. **CÓDIGO DUPLICADO: Funções `timeToDate` e `getCurrentTimeInTimezone`**

**Severidade:** 🔵 BAIXO

**Problema:**
As funções `timeToDate` e `getCurrentTimeInTimezone` estão duplicadas em:
- `campaign-execute-now/index.ts`
- `campaign-scheduler/index.ts`
- `campaign-process-queue/index.ts` (parcialmente)

**Impacto:**
- Manutenção difícil
- Bugs corrigidos em um lugar não são corrigidos em outros

**Solução:**
Criar arquivo compartilhado ou módulo comum para essas funções.

---

### 14. **FALTA DOCUMENTAÇÃO: Parâmetros de `increment_campaign_run_metrics`**

**Severidade:** 🔵 BAIXO

**Problema:**
Não está claro se `p_success`, `p_failed`, `p_skipped` são incrementos ou valores absolutos.

**Solução:**
Adicionar comentário na função SQL explicando que são incrementos.

---

## 📋 RESUMO DE PRIORIDADES

### 🔴 CRÍTICO (Corrigir Imediatamente)
1. ✅ Remover duplicação de `increment_campaign_run_metrics`
2. ✅ Corrigir lógica de timezone em `timeToDate`
3. ✅ Corrigir race condition na finalização de campanha

### ⚠️ GRAVE (Corrigir em Breve)
4. ✅ Adicionar validação de status antes de atualizar
5. ✅ Melhorar filtro de mensagens antigas
6. ✅ Validar `max_split_parts` antes de usar

### 📊 MODERADO (Corrigir Quando Possível)
7. ✅ Adicionar índices para performance
8. ✅ Melhorar tratamento de erros em `getWorkspaceAIModel`
9. ✅ Adicionar validações explícitas de campos obrigatórios
10. ✅ Melhorar logging de erros em `splitMessageWithAI`

### 🔵 BAIXO (Melhorias)
11. ✅ Refatorar código duplicado
12. ✅ Adicionar documentação

---

## 🎯 RECOMENDAÇÕES GERAIS

1. **Testes:** Adicionar testes unitários para funções de timezone
2. **Monitoramento:** Adicionar métricas para campanhas que falham
3. **Alertas:** Configurar alertas para campanhas travadas
4. **Documentação:** Documentar comportamento esperado de cada função
5. **Code Review:** Revisar lógica de timezone com especialista

---

## ✅ CONCLUSÃO

A auditoria identificou **3 problemas críticos**, **4 problemas graves**, **4 problemas moderados** e **2 melhorias de baixa prioridade**.

**Prioridade de Correção:**
1. **Imediata:** Problemas críticos (#1, #2, #3)
2. **Urgente:** Problemas graves (#4, #5, #6, #7)
3. **Importante:** Problemas moderados (#8, #9, #10, #11)
4. **Opcional:** Melhorias (#13, #14)

**Estimativa de Tempo:**
- Críticos: 4-6 horas
- Graves: 3-4 horas
- Moderados: 2-3 horas
- Melhorias: 1-2 horas
- **Total: 10-15 horas**

