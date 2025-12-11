# Plano de Correções: Terceira Auditoria - Performance e Escalabilidade

## Objetivo

Corrigir problemas críticos, moderados e baixos identificados na terceira auditoria, focando em performance, escalabilidade, resiliência e manutenibilidade do sistema de campanhas.

---

## FASE 1: Correções Críticas (Prioridade Alta)

### 1.1 Implementar Processamento Paralelo

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** Processamento 100% sequencial limita throughput e pode causar timeout.

**Solução:**
- Implementar processamento paralelo com `Promise.allSettled`
- Limitar concorrência a 5-10 mensagens simultâneas
- Adicionar `AbortController` para timeout individual (30s por mensagem)
- Aumentar `batch_size` padrão de 5 para 15

**Código a modificar:**
```typescript
// Substituir loop sequencial (linha 435) por processamento paralelo
const CONCURRENCY_LIMIT = 5;
const messagesChunks = [];
for (let i = 0; i < messages.length; i += CONCURRENCY_LIMIT) {
  messagesChunks.push(messages.slice(i, i + CONCURRENCY_LIMIT));
}

for (const chunk of messagesChunks) {
  const results = await Promise.allSettled(
    chunk.map(msg => processMessageWithTimeout(msg, 30000))
  );
  // Processar resultados
}
```

**Função auxiliar:**
```typescript
async function processMessageWithTimeout(
  msg: any,
  timeoutMs: number
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    await processMessage(msg, controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

### 1.2 Tratar Rate Limit do OpenRouter

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** Não trata status `429` (Rate Limit), causando falhas imediatas.

**Solução:**
- Verificar status `429` em `generateMessage` e `splitMessageWithAI`
- Implementar retry com backoff exponencial (1s, 2s, 4s)
- Respeitar header `Retry-After` se presente
- Máximo de 3 tentativas

**Código a modificar:**
```typescript
// generateMessage (linha 163-207)
async function generateMessage(
  apiKey: string,
  systemPrompt: string,
  leadContext: string,
  model: string,
  maxRetries: number = 3
): Promise<{ message: string; tokens: number; timeMs: number }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(OPENROUTER_URL, {...});
      
      // Tratar rate limit
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        const backoffMs = Math.min(retryAfter * 1000, 60000); // Max 60s
        
        if (attempt < maxRetries) {
          console.log(`[GenerateMessage] Rate limit, waiting ${backoffMs}ms...`);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Processar resposta...
      return { message, tokens, timeMs: Date.now() - startTime };
      
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries && err.message.includes('429')) {
        const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}
```

**Aplicar mesma lógica em `splitMessageWithAI`.**

---

### 1.3 Criar Índices Otimizados

**Arquivo:** `supabase/migrations/create_campaign_performance_indexes.sql` (novo)

**Problema:** Falta índice composto para otimizar seleção atômica de mensagens.

**Solução:** Criar índices compostos otimizados.

**Código:**
```sql
-- =============================================================================
-- MIGRAÇÃO: Índices de Performance para Sistema de Campanhas
-- =============================================================================

-- Índice para seleção atômica de mensagens
CREATE INDEX IF NOT EXISTS idx_campaign_messages_atomic_selection 
ON campaign_messages (run_id, status, scheduled_at) 
WHERE status = 'pending';

-- Índice para JOIN em get_and_lock_campaign_messages
CREATE INDEX IF NOT EXISTS idx_campaign_runs_id_status 
ON campaign_runs (id, status) 
WHERE status = 'running';

-- Índice para busca de contexto de lead (se usado frequentemente)
CREATE INDEX IF NOT EXISTS idx_leads_id_for_context 
ON leads (id) 
INCLUDE (client_name, primary_email, primary_phone, primary_website);

-- Comentários
COMMENT ON INDEX idx_campaign_messages_atomic_selection IS 
'Otimiza seleção atômica de mensagens pendentes por run_id e scheduled_at';

COMMENT ON INDEX idx_campaign_runs_id_status IS 
'Otimiza JOIN em get_and_lock_campaign_messages para runs running';
```

---

### 1.4 Implementar Retry Automático de Mensagens Falhadas

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** Mensagens falhadas são marcadas como `failed` e nunca reenviadas.

**Solução:**
- Reenfileirar mensagens com `retry_count < 3` após delay
- Usar backoff exponencial (5min, 15min, 30min)
- Marcar como `failed` apenas após max retries

**Código a modificar:**
```typescript
// Após marcar mensagem como failed (linha 879-902)
// Adicionar lógica de retry
if (msg.retry_count < 3) {
  const backoffMinutes = [5, 15, 30][msg.retry_count] || 30;
  const retryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
  
  await supabase
    .from('campaign_messages')
    .update({
      status: 'pending', // Reenfileirar
      scheduled_at: retryAt.toISOString(),
      error_message: `Retry ${msg.retry_count + 1}/3: ${err.message?.substring(0, 200)}`
    })
    .eq('id', msg.id);
  
  await log(supabase, runId, 'RETRY', 'info', 
    `Mensagem ${msg.id} agendada para retry em ${backoffMinutes} minutos`,
    { retry_count: msg.retry_count + 1, retry_at: retryAt.toISOString() },
    msg.lead_id, msg.id
  );
} else {
  // Max retries atingido - marcar como failed permanentemente
  await supabase
    .from('campaign_messages')
    .update({
      status: 'failed',
      error_message: `Max retries (3) exceeded: ${err.message?.substring(0, 200)}`
    })
    .eq('id', msg.id);
}
```

---

## FASE 2: Correções Moderadas (Prioridade Média)

### 2.1 Otimizar Busca de Contexto

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** `get_lead_full_context` chamado sequencialmente em loop.

**Solução:** Buscar contextos em batch antes do loop (se possível) ou processar em paralelo.

**Código a modificar:**
```typescript
// ANTES do loop (linha 434)
// Buscar contextos em paralelo
const leadIds = messages.map(m => m.lead_id);
const contextPromises = leadIds.map(leadId => 
  supabase.rpc('get_lead_full_context', { p_lead_id: leadId })
);

const contexts = await Promise.allSettled(contextPromises);
const contextMap = new Map();

contexts.forEach((result, index) => {
  if (result.status === 'fulfilled' && result.value.data) {
    contextMap.set(leadIds[index], result.value.data);
  }
});

// No loop, usar contextMap.get(msg.lead_id) em vez de RPC
```

---

### 2.2 Adicionar Timeouts Explícitos

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** `fetch` sem timeout pode travar indefinidamente.

**Solução:** Adicionar `AbortController` com timeout em todas as chamadas `fetch`.

**Código a modificar:**
```typescript
// generateMessage - adicionar timeout (linha 171)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

try {
  const response = await fetch(OPENROUTER_URL, {
    signal: controller.signal,
    // ... resto
  });
} finally {
  clearTimeout(timeoutId);
}

// splitMessageWithAI - adicionar timeout (linha 272)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s

// internal-send-ai-message - adicionar timeout (linha 781)
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s
```

---

### 2.3 Melhorar Logging de Performance

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** Falta métricas de tempo e tokens usados.

**Solução:** Logar tempo de cada etapa e salvar tokens em `campaign_messages`.

**Código a modificar:**
```typescript
// Após generateMessage (linha 608-613)
const aiStartTime = Date.now();
const aiResult = await generateMessage(...);
const aiTimeMs = Date.now() - aiStartTime;

await log(supabase, runId, 'GERAÇÃO_IA', 'debug', 
  `Mensagem gerada em ${aiTimeMs}ms, ${aiResult.tokens} tokens`,
  { 
    generation_time_ms: aiTimeMs,
    tokens_used: aiResult.tokens,
    model: aiModel
  },
  msg.lead_id, msg.id
);

// Salvar tokens em campaign_messages
await supabase
  .from('campaign_messages')
  .update({
    ai_tokens_used: aiResult.tokens,
    ai_generation_time_ms: aiTimeMs
  })
  .eq('id', msg.id);

// Aplicar mesmo padrão para splitMessageWithAI e envio
```

---

### 2.4 Otimizar Query de Mensagens Antigas

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** Query executada sempre, mesmo sem necessidade.

**Solução:** Executar apenas se necessário ou mover para função SQL.

**Código a modificar:**
```typescript
// Substituir query direta (linha 394-421) por função SQL
// Criar função: mark_old_campaign_messages_as_skipped(p_one_hour_ago TIMESTAMPTZ)

const { error: skipOldError } = await supabase.rpc(
  'mark_old_campaign_messages_as_skipped',
  { p_one_hour_ago: oneHourAgo.toISOString() }
);

// Função SQL retorna count de mensagens marcadas
// Só logar se count > 0
```

**Nova função SQL:**
```sql
CREATE OR REPLACE FUNCTION mark_old_campaign_messages_as_skipped(
  p_one_hour_ago TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE campaign_messages cm
    SET 
      status = 'skipped',
      error_message = 'Mensagem agendada há mais de 1 hora - muito antiga para processar'
    FROM campaign_runs cr
    WHERE cm.run_id = cr.id
      AND cm.status = 'pending'
      AND cr.status = 'running'
      AND cm.scheduled_at < p_one_hour_ago
    RETURNING cm.id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## FASE 3: Correções Baixas (Prioridade Baixa)

### 3.1 Melhorar Validação de Mensagem

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** Validação insuficiente de mensagem vazia.

**Solução:** Validar tamanho mínimo e trim.

**Código a modificar:**
```typescript
// Após generateMessage (linha 615-617)
const MIN_MESSAGE_LENGTH = 10;

if (!aiResult.message || aiResult.message.trim().length < MIN_MESSAGE_LENGTH) {
  throw new Error(`AI generated invalid message (length: ${aiResult.message?.length || 0}, min: ${MIN_MESSAGE_LENGTH})`);
}

// Aplicar trim
aiResult.message = aiResult.message.trim();
```

---

### 3.2 Refatorar Lógica de Fallback

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Problema:** Lógica de parsing JSON complexa e difícil de manter.

**Solução:** Extrair para função separada e adicionar validação.

**Código a modificar:**
```typescript
// Nova função auxiliar
function parseSplitResponse(responseText: string, maxParts: number): string[] {
  try {
    const cleanResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanResponse);
    
    if (!parsed.messages || !Array.isArray(parsed.messages)) {
      throw new Error('Invalid response format: messages array not found');
    }
    
    const messages = parsed.messages
      .filter((m: string) => m && typeof m === 'string' && m.trim().length > 0)
      .slice(0, maxParts);
    
    if (messages.length === 0) {
      throw new Error('No valid messages found in response');
    }
    
    // Validar tamanho máximo por parte (ex: 1000 caracteres)
    const MAX_PART_LENGTH = 1000;
    const validMessages = messages.filter((m: string) => m.length <= MAX_PART_LENGTH);
    
    if (validMessages.length === 0) {
      throw new Error('All messages exceed max length');
    }
    
    return validMessages;
  } catch (err) {
    console.error('[ParseSplitResponse] Error:', err);
    throw err;
  }
}

// Usar em splitMessageWithAI (linha 301-320)
try {
  splitMessages = parseSplitResponse(responseText, safeMaxParts);
} catch (parseError) {
  console.error('[MessageSplit] Parse error:', parseError);
  splitMessages = [message]; // Fallback
}
```

---

## Estrutura de Migrações SQL

### Migração 1: `create_campaign_performance_indexes.sql`
- Índices compostos para otimização de queries

### Migração 2: `create_mark_old_messages_function.sql`
- Função SQL para marcar mensagens antigas como skipped

---

## Ordem de Implementação

1. **Fase 1.3** - Criar índices (mais rápido, impacto imediato)
2. **Fase 1.2** - Tratar rate limit (prevenção de erros)
3. **Fase 1.4** - Retry automático (melhora resiliência)
4. **Fase 1.1** - Processamento paralelo (mais complexo, requer testes)
5. **Fase 2** - Correções moderadas (após críticas)
6. **Fase 3** - Correções baixas (polimento)

---

## Testes Necessários

1. Testar processamento paralelo com batch de 20 mensagens
2. Testar rate limit do OpenRouter (simular 429)
3. Testar retry automático com mensagens falhadas
4. Testar timeout de Edge Function (simular lentidão)
5. Validar performance com índices novos (EXPLAIN ANALYZE)
6. Testar validação de mensagem vazia/curta

---

## Arquivos a Modificar

- `supabase/functions/campaign-process-queue/index.ts` (múltiplas correções)
- `supabase/migrations/create_campaign_performance_indexes.sql` (nova migração)
- `supabase/migrations/create_mark_old_messages_function.sql` (nova migração)

---

## Métricas de Sucesso

Após implementação, esperar:
- **Throughput:** Aumento de 3-5x (de ~5 msg/min para 15-25 msg/min)
- **Taxa de sucesso:** Aumento de 5-10% (devido a retry automático)
- **Tempo de execução:** Redução de 50-70% (devido a paralelismo)
- **Taxa de timeout:** Redução de 80-90% (devido a timeouts explícitos)

