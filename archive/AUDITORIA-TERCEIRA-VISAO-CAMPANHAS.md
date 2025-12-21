# 🔍 Terceira Auditoria: Sistema de Campanhas - Visão de Performance e Escalabilidade

**Data:** 2025-01-XX  
**Escopo:** Análise crítica focada em performance, escalabilidade, manutenibilidade e edge cases de produção  
**Objetivo:** Identificar problemas de performance, otimizações necessárias e melhorias de código

---

## 📋 Índice

1. [Análise de Performance de Queries](#1-análise-de-performance-de-queries)
2. [Análise de Escalabilidade](#2-análise-de-escalabilidade)
3. [Análise de Manutenibilidade](#3-análise-de-manutenibilidade)
4. [Análise de Edge Cases de Produção](#4-análise-de-edge-cases-de-produção)
5. [Análise de Monitoramento e Observabilidade](#5-análise-de-monitoramento-e-observabilidade)
6. [Análise de Resiliência e Retry Logic](#6-análise-de-resiliência-e-retry-logic)
7. [Análise de Índices e Otimizações](#7-análise-de-índices-e-otimizações)
8. [Problemas Identificados](#8-problemas-identificados)
9. [Recomendações](#9-recomendações)

---

## 1. Análise de Performance de Queries

### 1.1 Função `get_and_lock_campaign_messages` - JOINs Múltiplos

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Código SQL:**
```sql
-- create_atomic_message_selection.sql:16-25
UPDATE campaign_messages cm
SET status = 'generating'
FROM campaign_runs cr
JOIN campaign_configs cc ON cc.id = cr.config_id
WHERE cm.run_id = cr.id
  AND cm.status = 'pending'
  AND cr.status = 'running'
  AND cm.scheduled_at <= NOW()
  AND cm.scheduled_at >= p_one_hour_ago
```

**Problema:**
- JOIN com 2 tabelas (`campaign_runs` e `campaign_configs`) em cada UPDATE
- Pode ser lento com muitas mensagens pendentes
- Não há índice composto otimizado para esta query específica

**Análise de Índices Atuais:**
- ✅ `idx_campaign_messages_run_status` existe: `(run_id, status)`
- ✅ `idx_campaign_runs_config_status` existe: `(config_id, status) WHERE status = 'running'`
- ❌ **FALTA:** Índice composto em `campaign_messages` para `(run_id, status, scheduled_at)` com filtro `status = 'pending'`

**Impacto:**
- Query pode fazer scan completo em `campaign_messages` se não usar índice corretamente
- JOINs podem ser custosos com muitas runs ativas simultaneamente

**Solução Necessária:**
- Criar índice composto: `CREATE INDEX idx_campaign_messages_atomic_selection ON campaign_messages (run_id, status, scheduled_at) WHERE status = 'pending'`
- Considerar reescrever query para usar subquery em vez de JOIN se performance não melhorar

---

### 1.2 Query `get_lead_full_context` - RPC Chamado em Loop

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:590
const { data: leadContext } = await supabase
  .rpc('get_lead_full_context', { p_lead_id: msg.lead_id });
```

**Problema:**
- RPC chamado sequencialmente para cada mensagem no loop
- Se `batch_size = 100`, são 100 chamadas RPC sequenciais
- Cada RPC pode fazer múltiplas queries internas (leads, custom_fields, etc.)

**Impacto:**
- Latência acumulada: se cada RPC demora 100ms, 100 mensagens = 10 segundos só em busca de contexto
- Não aproveita paralelismo
- Pode causar timeout em batches grandes

**Solução Necessária:**
- Buscar contextos em batch antes do loop
- Ou processar mensagens em paralelo com `Promise.allSettled` (limitado a 5-10 simultâneas)
- Considerar cache de contextos se mesmo lead aparece múltiplas vezes

---

### 1.3 Query de Mensagens Antigas - Executada Sempre

⚠️ **PROBLEMA BAIXO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:394-421
const { error: skipOldError } = await supabase
  .from('campaign_messages')
  .update({ 
    status: 'skipped', 
    error_message: 'Mensagem agendada há mais de 1 hora - muito antiga para processar'
  })
  .eq('status', 'pending')
  .in('run_id', 
    supabase.from('campaign_runs')
      .select('id')
      .eq('status', 'running')
  )
  .lt('scheduled_at', oneHourAgo.toISOString());
```

**Problema:**
- Query executada em TODA invocação da Edge Function
- Subquery `supabase.from('campaign_runs').select('id')` não é eficiente
- Pode atualizar 0 registros na maioria das vezes (desperdício)

**Impacto:**
- Overhead desnecessário em cada execução
- Subquery pode ser lenta se houver muitas runs `running`

**Solução Necessária:**
- Executar apenas se necessário (ex: a cada 10 execuções ou via flag)
- Ou mover para função SQL que executa apenas se encontrar mensagens antigas
- Usar `EXISTS` em vez de `IN` com subquery

---

## 2. Análise de Escalabilidade

### 2.1 Processamento Sequencial de Mensagens

❌ **PROBLEMA CRÍTICO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:435
for (const msg of messages) {
  // Processa uma mensagem por vez
  // Geração IA, envio, etc. tudo sequencial
}
```

**Problema:**
- Processamento 100% sequencial
- Se uma mensagem demora 2 segundos (IA + envio), batch de 100 = 200 segundos
- Edge Function tem timeout de 60 segundos (Supabase padrão)
- Não aproveita paralelismo disponível

**Impacto:**
- **BATCH_SIZE limitado a ~5-10 mensagens** para evitar timeout
- Throughput muito baixo: ~5 mensagens/minuto por instância
- Não escala com aumento de carga

**Solução Necessária:**
- Implementar processamento paralelo com `Promise.allSettled`
- Limitar concorrência (ex: 5 mensagens simultâneas)
- Usar `AbortController` para timeout individual
- Considerar processamento assíncrono via PGMQ para mensagens individuais

---

### 2.2 Cache de Modelo e Instância - Escopo de Função

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:432-433
const modelCache: Map<string, string | null> = new Map();
const inboxStatusCache: Map<string, {connected: boolean, status?: string, name?: string}> = new Map();
```

**Problema:**
- Cache é criado a cada invocação da Edge Function
- Cache é perdido entre invocações
- Mesmos dados buscados repetidamente em execuções consecutivas

**Impacto:**
- Queries desnecessárias para modelo e status de instância
- Latência adicional em cada batch

**Solução Necessária:**
- Considerar cache compartilhado (Redis, Supabase KV)
- Ou aumentar `batch_size` para reduzir número de invocações
- Cache de modelo pode ser estático (raramente muda)

---

### 2.3 Limite de Batch Size - Hardcoded

✅ **STATUS:** CORRIGIDO

**Código:**
```typescript
// campaign-process-queue/index.ts:359-363
let { batch_size = 5 } = await req.json().catch(() => ({}));
if (!batch_size || batch_size < 1 || batch_size > 100) {
  console.warn(`[Processor] Invalid batch_size: ${batch_size}, using default: 5`);
  batch_size = 5;
}
```

**Observação:**
- Validação implementada corretamente
- Limite máximo de 100 é razoável
- Valor padrão de 5 é conservador (bom para evitar timeout)

**Recomendação:**
- Considerar aumentar padrão para 10-15 se processamento paralelo for implementado
- Adicionar métrica de tempo de execução para ajustar dinamicamente

---

## 3. Análise de Manutenibilidade

### 3.1 Função `generateMessage` - Sem Timeout Explícito

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:163-207
async function generateMessage(...): Promise<{ message: string; tokens: number; timeMs: number }> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {...},
    body: JSON.stringify({...})
  });
  // Sem timeout explícito
}
```

**Problema:**
- `fetch` sem timeout pode travar indefinidamente
- Depende do timeout padrão do Deno (pode ser muito longo)
- Se OpenRouter estiver lento, bloqueia toda mensagem

**Impacto:**
- Mensagens podem travar por minutos esperando resposta da IA
- Pode causar timeout da Edge Function inteira

**Solução Necessária:**
- Adicionar `AbortController` com timeout (ex: 30 segundos)
- Implementar retry com backoff exponencial
- Logar tempo de resposta para monitoramento

---

### 3.2 Função `splitMessageWithAI` - Lógica de Fallback Complexa

⚠️ **PROBLEMA BAIXO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:218-343
async function splitMessageWithAI(...): Promise<SplitResult> {
  // Lógica complexa de parsing JSON
  // Múltiplos try/catch aninhados
  // Fallback para mensagem original
}
```

**Problema:**
- Lógica de parsing JSON é frágil (regex para remover markdown)
- Múltiplos pontos de fallback dificultam debug
- Não há validação de tamanho das partes após split

**Impacto:**
- Dificulta manutenção
- Erros de parsing podem passar despercebidos
- Partes muito grandes podem causar problemas no envio

**Solução Necessária:**
- Extrair lógica de parsing para função separada
- Adicionar validação de tamanho máximo por parte
- Melhorar logging de erros de parsing

---

### 3.3 Código Duplicado - Validação de Status

✅ **STATUS:** BOM

**Código:**
```typescript
// campaign-process-queue/index.ts:29-39
function validateCampaignMessageStatus(status: string): void {
  if (!VALID_CAMPAIGN_MESSAGE_STATUSES.includes(status as any)) {
    throw new Error(`Invalid campaign message status: ${status}...`);
  }
}
```

**Observação:**
- Validação centralizada em helpers
- Reutilizada em múltiplos pontos
- Código limpo e manutenível

---

## 4. Análise de Edge Cases de Produção

### 4.1 OpenRouter API Rate Limit - Não Tratado

❌ **PROBLEMA CRÍTICO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:171-196
const response = await fetch(OPENROUTER_URL, {...});
if (!response.ok) {
  const error = await response.text();
  throw new Error(`OpenRouter error: ${response.status} - ${error}`);
}
```

**Problema:**
- Não verifica status `429` (Rate Limit)
- Não implementa retry com backoff
- Não respeita header `Retry-After`
- Comparar com `fetch-google-maps/index.ts:485-490` que TEM tratamento de rate limit

**Impacto:**
- Mensagens falham imediatamente em caso de rate limit
- Não há recuperação automática
- Pode causar falha em cascata se muitas mensagens forem processadas

**Solução Necessária:**
- Implementar tratamento de `429` similar ao `fetch-google-maps`
- Adicionar retry com backoff exponencial
- Respeitar `Retry-After` header
- Considerar fila de retry para rate limits prolongados

---

### 4.2 Timeout de Edge Function - Não Monitorado

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Problema:**
- Edge Function pode timeout (60s padrão Supabase)
- Não há monitoramento de tempo de execução
- Não há alerta se próximo do timeout

**Impacto:**
- Execuções podem falhar silenciosamente
- Dificulta diagnóstico de problemas de performance

**Solução Necessária:**
- Adicionar log de tempo de execução no início e fim
- Alertar se execução > 50 segundos
- Considerar dividir batch se tempo de execução alto

---

### 4.3 Mensagem Vazia da IA - Validação Insuficiente

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:615-617
if (!aiResult.message) {
  throw new Error('AI generated empty message');
}
```

**Problema:**
- Valida apenas se `message` é falsy
- Não valida se mensagem é muito curta (ex: < 10 caracteres)
- Não valida se mensagem contém apenas espaços

**Impacto:**
- Mensagens inválidas podem ser enviadas
- Pode causar problemas no WhatsApp (mensagem vazia)

**Solução Necessária:**
- Validar tamanho mínimo (ex: 10 caracteres)
- Trim e validar se não está vazio após trim
- Logar mensagem gerada para auditoria

---

### 4.4 Fracionamento Parcial - Estado Inconsistente

❌ **PROBLEMA CRÍTICO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:765-798
for (let i = 0; i < messagesToSend.length; i++) {
  const sendResponse = await fetch(...);
  if (!sendResponse.ok) {
    allSent = false;
    break; // Para de enviar partes restantes
  }
}
```

**Problema:**
- Se parte 2/3 falha, parte 1 já foi enviada
- Mensagem é marcada como `failed` mas parte 1 já foi enviada
- Não há rastreamento de quais partes foram enviadas

**Impacto:**
- Lead recebe mensagem parcial (confuso)
- Não há como retry apenas partes que falharam
- Estado inconsistente no banco

**Solução Necessária:**
- Rastrear partes enviadas em `campaign_messages` (campo JSONB)
- Permitir retry apenas de partes não enviadas
- Ou marcar como `partially_sent` e implementar lógica de retry

---

## 5. Análise de Monitoramento e Observabilidade

### 5.1 Logging de Performance - Insuficiente

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:608-613
const aiResult = await generateMessage(...);
// Não loga tempo de geração
// Não loga tokens usados
```

**Problema:**
- Tempo de geração de IA não é logado
- Tokens usados não são salvos em `campaign_messages`
- Não há métricas de performance por workspace

**Impacto:**
- Dificulta identificar problemas de performance
- Não é possível otimizar custos de IA
- Não há visibilidade de latência por etapa

**Solução Necessária:**
- Logar tempo de cada etapa (IA, split, envio)
- Salvar `ai_tokens_used` em `campaign_messages` (já existe campo!)
- Criar dashboard de métricas de performance

---

### 5.2 Erros Silenciosos - Try/Catch Genérico

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:855-904
} catch (err: any) {
  console.error(`[Processor] Error processing message ${msg.id}:`, err);
  // Loga mas continua processando
  // Não diferencia tipos de erro
}
```

**Problema:**
- Todos os erros são tratados igualmente
- Não diferencia erros temporários de permanentes
- Não há alertas para erros críticos

**Impacto:**
- Erros importantes podem passar despercebidos
- Dificulta diagnóstico de problemas sistêmicos

**Solução Necessária:**
- Classificar erros (temporário vs permanente)
- Alertar para erros críticos (ex: API key inválida)
- Implementar circuit breaker para APIs externas

---

## 6. Análise de Resiliência e Retry Logic

### 6.1 Retry de Mensagens Falhadas - Não Implementado

❌ **PROBLEMA CRÍTICO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:879-902
// Mensagem marcada como 'failed'
// retry_count incrementado
// Mas não há lógica para reenfileirar
```

**Problema:**
- Mensagens falhadas são marcadas como `failed` e esquecidas
- Não há retry automático
- `retry_count` é incrementado mas não usado

**Impacto:**
- Mensagens temporariamente falhadas nunca são reenviadas
- Taxa de sucesso artificialmente baixa
- Perda de oportunidades de negócio

**Solução Necessária:**
- Implementar lógica de retry baseada em `retry_count`
- Reenfileirar mensagens com `retry_count < 3` após delay
- Considerar backoff exponencial
- Marcar como `failed` apenas após max retries

---

### 6.2 Timeout de Envio - Não Implementado

⚠️ **PROBLEMA MODERADO IDENTIFICADO**

**Código:**
```typescript
// campaign-process-queue/index.ts:781-791
const sendResponse = await fetch(`${supabaseUrl}/functions/v1/internal-send-ai-message`, {
  method: 'POST',
  // Sem timeout
});
```

**Problema:**
- `fetch` para `internal-send-ai-message` sem timeout
- Pode travar indefinidamente se Edge Function estiver lenta
- Não há retry se timeout

**Impacto:**
- Mensagens podem travar esperando resposta
- Pode causar timeout da Edge Function principal

**Solução Necessária:**
- Adicionar `AbortController` com timeout (ex: 10 segundos)
- Implementar retry com backoff
- Logar tempo de envio para monitoramento

---

## 7. Análise de Índices e Otimizações

### 7.1 Índice Composto para Seleção Atômica - Faltando

❌ **PROBLEMA CRÍTICO IDENTIFICADO**

**Query:**
```sql
-- get_and_lock_campaign_messages usa:
WHERE cm.run_id = cr.id
  AND cm.status = 'pending'
  AND cr.status = 'running'
  AND cm.scheduled_at <= NOW()
  AND cm.scheduled_at >= p_one_hour_ago
```

**Índices Atuais:**
- ✅ `idx_campaign_messages_run_status`: `(run_id, status)`
- ✅ `idx_campaign_messages_status_scheduled`: `(status, scheduled_at) WHERE status = 'pending'`

**Problema:**
- Nenhum índice cobre `(run_id, status, scheduled_at)` com filtro `status = 'pending'`
- Query pode fazer scan em `campaign_messages` mesmo com índices existentes
- JOIN com `campaign_runs` pode ser custoso

**Solução Necessária:**
```sql
CREATE INDEX idx_campaign_messages_atomic_selection 
ON campaign_messages (run_id, status, scheduled_at) 
WHERE status = 'pending';

-- E índice em campaign_runs para JOIN:
CREATE INDEX idx_campaign_runs_id_status 
ON campaign_runs (id, status) 
WHERE status = 'running';
```

---

### 7.2 Índice para Finalização de Run - Verificar

✅ **STATUS:** VERIFICAR NECESSIDADE

**Query:**
```sql
-- finalize_campaign_run_if_complete usa:
WHERE id = p_run_id
  AND status = 'running'
  AND leads_processed >= leads_total
```

**Índices Atuais:**
- ✅ `campaign_runs_pkey`: `(id)` - PRIMARY KEY
- ✅ `idx_campaign_runs_status`: `(status) WHERE status = 'running'`

**Observação:**
- PRIMARY KEY já cobre `id`
- Índice parcial em `status` ajuda no filtro
- Query provavelmente já está otimizada

**Recomendação:**
- Monitorar `EXPLAIN ANALYZE` da query
- Se lenta, considerar índice composto `(id, status, leads_processed, leads_total)`

---

## 8. Problemas Identificados

### Resumo por Prioridade

#### ❌ CRÍTICOS (4 problemas)
1. **Processamento sequencial** - Limita throughput drasticamente
2. **Rate limit não tratado** - Falhas imediatas em caso de limite
3. **Fracionamento parcial** - Estado inconsistente quando parte falha
4. **Índice composto faltando** - Performance ruim em seleção atômica

#### ⚠️ MODERADOS (6 problemas)
1. **RPC em loop** - `get_lead_full_context` chamado sequencialmente
2. **JOINs múltiplos** - Query de seleção atômica pode ser lenta
3. **Sem timeout explícito** - `generateMessage` pode travar
4. **Cache perdido** - Cache recriado a cada invocação
5. **Logging insuficiente** - Falta métricas de performance
6. **Timeout não monitorado** - Edge Function pode timeout sem alerta

#### ⚠️ BAIXOS (3 problemas)
1. **Query de mensagens antigas** - Executada sempre, mesmo sem necessidade
2. **Validação de mensagem vazia** - Insuficiente
3. **Lógica de fallback complexa** - Dificulta manutenção

---

## 9. Recomendações

### Prioridade Alta

1. **Implementar processamento paralelo**
   - Usar `Promise.allSettled` com limite de concorrência (5-10)
   - Adicionar `AbortController` para timeout individual
   - Aumentar `batch_size` padrão para 15-20

2. **Tratar rate limit do OpenRouter**
   - Verificar status `429`
   - Implementar retry com backoff exponencial
   - Respeitar header `Retry-After`

3. **Criar índices otimizados**
   - `idx_campaign_messages_atomic_selection`
   - `idx_campaign_runs_id_status`

4. **Implementar retry automático**
   - Reenfileirar mensagens com `retry_count < 3`
   - Usar backoff exponencial
   - Marcar como `failed` apenas após max retries

### Prioridade Média

5. **Otimizar busca de contexto**
   - Buscar contextos em batch antes do loop
   - Ou processar mensagens em paralelo

6. **Adicionar timeouts explícitos**
   - `generateMessage`: 30 segundos
   - `splitMessageWithAI`: 20 segundos
   - `internal-send-ai-message`: 10 segundos

7. **Melhorar logging**
   - Logar tempo de cada etapa
   - Salvar `ai_tokens_used` em `campaign_messages`
   - Criar dashboard de métricas

8. **Otimizar query de mensagens antigas**
   - Executar apenas se necessário
   - Usar função SQL com `EXISTS`

### Prioridade Baixa

9. **Melhorar validação de mensagem**
   - Validar tamanho mínimo (10 caracteres)
   - Trim e validar após trim

10. **Refatorar lógica de fallback**
    - Extrair parsing JSON para função separada
    - Adicionar validação de tamanho por parte

---

## 📊 Métricas Sugeridas para Monitoramento

1. **Performance:**
   - Tempo médio de processamento por mensagem
   - Tempo por etapa (IA, split, envio)
   - Taxa de timeout

2. **Escalabilidade:**
   - Throughput (mensagens/minuto)
   - Taxa de utilização de batch_size
   - Número de mensagens processadas por execução

3. **Resiliência:**
   - Taxa de retry
   - Taxa de falha após retries
   - Taxa de rate limit

4. **Custos:**
   - Tokens de IA usados por mensagem
   - Custo estimado por campanha

---

**Fim da Auditoria**

