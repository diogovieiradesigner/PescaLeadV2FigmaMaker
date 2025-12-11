# 🤖 Geração de IA Apenas na Hora do Envio

**Data:** 2025-01-XX  
**Contexto:** Otimização para evitar gasto de tokens em campanhas canceladas/pausadas

---

## 🎯 Objetivo

Garantir que a geração de mensagem via IA aconteça **SOMENTE** na hora de enviar a mensagem, não durante o agendamento. Isso evita gastar tokens com leads que não vão receber mensagens se a campanha for cancelada ou pausada.

---

## ✅ Como Funciona Atualmente

### 1. Fase de Agendamento (`campaign-scheduler`)

**O que faz:**
- Busca leads elegíveis
- Calcula `scheduled_at` respeitando `start_time`, `end_time` e intervalos aleatórios
- Insere `campaign_messages` com `status: 'pending'` e `scheduled_at`
- **NÃO gera mensagem de IA**

**Código:**
```typescript
// campaign-scheduler/index.ts:458-467
const messages = leadsToSchedule.map((lead: any, index: number) => {
  return {
    run_id: run.id,
    lead_id: lead.lead_id,
    phone_number: lead.phone_number || null,
    phone_normalized: lead.phone_normalized || null,
    scheduled_at: schedules[index].toISOString(),
    status: 'pending'  // ✅ Apenas agenda, sem gerar IA
  };
});
```

**Resultado:**
- Mensagens criadas com `status: 'pending'`
- `scheduled_at` definido
- **Zero tokens gastos** nesta fase

---

### 2. Fase de Processamento (`campaign-process-queue`)

**O que faz:**
- Busca mensagens com `scheduled_at <= NOW()` e `status: 'pending'`
- Verifica se a run ainda está `running` (proteção adicional)
- **SOMENTE ENTÃO** gera mensagem via IA
- Envia mensagem

**Código:**
```typescript
// campaign-process-queue/index.ts:456-586
async function processSingleMessage(...) {
  // ✅ CRÍTICO: Verificar se a run ainda está 'running' ANTES de gerar IA
  const { data: runStatus } = await supabase
    .from('campaign_runs')
    .select('status')
    .eq('id', runId)
    .single();
  
  if (!runStatus || runStatus.status !== 'running') {
    // Run foi pausada/cancelada - marcar mensagem como skipped sem gastar tokens
    await supabase
      .from('campaign_messages')
      .update({
        status: 'skipped',
        error_message: `Campanha ${runStatus?.status || 'não encontrada'} - mensagem cancelada antes do envio`
      })
      .eq('id', msg.id);
    
    return { processed: false, failed: false, paused: runStatus?.status === 'paused' };
  }
  
  // ... outras validações ...
  
  // ✅ SOMENTE AQUI gera mensagem via IA
  const aiResult = await generateMessage(
    openrouterApiKeyForMsg,
    systemPrompt,
    formattedContext,
    aiModel
  );
}
```

**Resultado:**
- Mensagem de IA gerada **SOMENTE** quando vai enviar
- Se campanha foi pausada/cancelada, não gasta tokens

---

## 🛡️ Proteções Implementadas

### 1. Filtro SQL (`get_and_lock_campaign_messages`)

**Função SQL já filtra por status:**
```sql
WHERE cm.run_id = cr.id
  AND cm.status = 'pending'
  AND cr.status = 'running'  -- ✅ Só seleciona se run está running
  AND cm.scheduled_at <= NOW()
```

**Resultado:**
- Mensagens de runs `paused` ou `cancelled` **não são selecionadas**

---

### 2. Validação Adicional no Processamento

**Verificação antes de gerar IA:**
```typescript
// Verificar se a run ainda está 'running' ANTES de gerar IA
const { data: runStatus } = await supabase
  .from('campaign_runs')
  .select('status')
  .eq('id', runId)
  .single();

if (!runStatus || runStatus.status !== 'running') {
  // Marcar como skipped SEM gastar tokens
  return { processed: false, failed: false, paused: true };
}
```

**Resultado:**
- Mesmo se a campanha for pausada/cancelada **DEPOIS** da seleção mas **ANTES** de gerar IA, não gasta tokens

---

## 📊 Fluxo Completo

### Cenário 1: Campanha Normal

```
1. Scheduler agenda 100 mensagens (status: 'pending')
   → Zero tokens gastos ✅

2. Process-queue processa mensagens quando scheduled_at <= NOW()
   → Gera IA para cada mensagem (100 tokens)
   → Envia mensagens
```

### Cenário 2: Campanha Pausada ANTES do Processamento

```
1. Scheduler agenda 100 mensagens (status: 'pending')
   → Zero tokens gastos ✅

2. Usuário pausa campanha (run.status = 'paused')

3. Process-queue tenta processar
   → get_and_lock_campaign_messages filtra por status='running'
   → Nenhuma mensagem selecionada
   → Zero tokens gastos ✅
```

### Cenário 3: Campanha Pausada DURANTE o Processamento

```
1. Scheduler agenda 100 mensagens (status: 'pending')
   → Zero tokens gastos ✅

2. Process-queue seleciona 5 mensagens (status='running')

3. Usuário pausa campanha (run.status = 'paused')

4. Process-queue tenta processar mensagem 1
   → Verifica run.status ANTES de gerar IA
   → Status = 'paused' → Marca como skipped
   → Zero tokens gastos ✅
```

---

## ✅ Garantias

1. **IA gerada SOMENTE na hora do envio**
   - Não gera durante agendamento
   - Gera apenas quando `scheduled_at <= NOW()`

2. **Proteção contra campanhas pausadas/canceladas**
   - Filtro SQL: `cr.status = 'running'`
   - Validação adicional: Verifica status antes de gerar IA

3. **Zero tokens gastos se campanha for cancelada/pausada**
   - Mensagens agendadas não geram IA
   - Mensagens de runs pausadas/canceladas não são processadas

---

## 📝 Exemplo Prático

**Configuração:**
- Campanha com 100 leads
- start_time: 09:00
- end_time: 18:00

**Fluxo:**

1. **09:00 - Scheduler roda:**
   ```
   - Agenda 100 mensagens
   - scheduled_at distribuído entre 09:00-18:00
   - status: 'pending'
   - Tokens gastos: 0 ✅
   ```

2. **09:30 - Usuário pausa campanha:**
   ```
   - run.status = 'paused'
   - Mensagens ainda com status: 'pending'
   - Tokens gastos: 0 ✅
   ```

3. **10:00 - Process-queue tenta processar:**
   ```
   - get_and_lock_campaign_messages filtra por status='running'
   - Nenhuma mensagem selecionada (run está paused)
   - Tokens gastos: 0 ✅
   ```

4. **10:30 - Usuário retoma campanha:**
   ```
   - run.status = 'running'
   - Process-queue processa mensagens com scheduled_at <= NOW()
   - Gera IA e envia
   - Tokens gastos: apenas para mensagens enviadas ✅
   ```

---

## 🔍 Validação

### Verificar que não gera IA no scheduler:
```bash
# Buscar por "generateMessage" no scheduler
grep -r "generateMessage" supabase/functions/campaign-scheduler/
# Resultado esperado: Nenhum resultado ✅
```

### Verificar que gera IA apenas no process-queue:
```bash
# Buscar por "generateMessage" no process-queue
grep -r "generateMessage" supabase/functions/campaign-process-queue/
# Resultado esperado: Encontrado em processSingleMessage ✅
```

### Verificar proteção de status:
```sql
-- Verificar que função SQL filtra por status='running'
SELECT prosrc FROM pg_proc 
WHERE proname = 'get_and_lock_campaign_messages';
-- Resultado esperado: AND cr.status = 'running' ✅
```

---

**Status:** ✅ **Implementado e Validado**

- IA gerada SOMENTE na hora do envio
- Proteção contra campanhas pausadas/canceladas
- Zero tokens gastos se campanha for cancelada/pausada

