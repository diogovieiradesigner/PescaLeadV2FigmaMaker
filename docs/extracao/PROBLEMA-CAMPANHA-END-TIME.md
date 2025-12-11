# 🚨 Problema: Campanha Continuou Após `end_time`

## 📊 Dados da Campanha

- **Início:** 10:57:29 (13:57:29 UTC)
- **Fim configurado:** 18:00:00
- **Fim real:** 22:50:10 (01:50:10 UTC)
- **Tipo:** Execução MANUAL via `campaign-execute-now`
- **Mensagens enviadas após 18:00:** 8 mensagens
- **Última mensagem agendada:** 22:49:49 (4h 49min após o limite!)

---

## 🔍 Análise do Problema

### **Problema #1: `campaign-execute-now` não respeita `end_time`**

**Arquivo:** `supabase/functions/campaign-execute-now/index.ts`

**Código atual (linha 245-250):**
```typescript
// 7. Gerar horários aleatórios (começando AGORA)
const now = new Date();
const minInterval = config.min_interval_seconds || 120;
const maxInterval = minInterval * 2.5;

const schedules = generateRandomSchedule(now, leads.length, minInterval, maxInterval);
```

**Problema:**
- ❌ Não verifica se `now` está dentro da janela `start_time` / `end_time`
- ❌ Não verifica se os horários calculados ultrapassam o `end_time`
- ❌ Usa `generateRandomSchedule` que **não tem limite de horário**

**Resultado:**
- Mensagens foram agendadas até **22:49:49** (4h 49min após o limite de 18:00)

---

### **Problema #2: `campaign-process-queue` não verifica `end_time`**

**Arquivo:** `supabase/functions/campaign-process-queue/index.ts`

**Código atual (linha 342-365):**
```typescript
// 2. Buscar mensagens prontas para envio
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
        max_split_parts
      )
    )
  `)
  .eq('status', 'pending')
  .eq('campaign_runs.status', 'running')
  .lte('scheduled_at', now.toISOString())  // ⚠️ Só verifica se já passou o horário agendado
  .order('scheduled_at', { ascending: true })
  .limit(batch_size);
```

**Problema:**
- ❌ Não busca `end_time` da configuração
- ❌ Não verifica se `NOW()` está após o `end_time`
- ❌ Processa mensagens mesmo que já tenha passado do horário limite

**Resultado:**
- 8 mensagens foram enviadas após 18:00, sendo a última às **22:50:10**

---

## ✅ Solução Proposta

### **Correção #1: `campaign-execute-now` deve respeitar `end_time`**

**Mudanças necessárias:**

1. **Verificar se está dentro da janela de horário:**
   ```typescript
   // Verificar se está dentro da janela de horário
   const now = new Date();
   const currentTime = timeToDate(now.toTimeString().slice(0, 8), now);
   const endTimeToday = timeToDate(config.end_time, now);
   
   if (currentTime > endTimeToday) {
     return new Response(JSON.stringify({ 
       error: `Horário limite (${config.end_time}) já passou. Não é possível executar.`,
       error_code: 'END_TIME_PASSED'
     }), { status: 400, ... });
   }
   ```

2. **Usar `generateRandomScheduleWithLimit` (igual ao scheduler):**
   ```typescript
   const { schedules, fitsAll, scheduledCount } = generateRandomScheduleWithLimit(
     now,
     leads.length,
     minInterval,
     maxInterval,
     endTimeToday  // ✅ Passar limite de horário
   );
   ```

3. **Avisar se não couber todos:**
   ```typescript
   if (!fitsAll) {
     await log(supabase, run.id, 'AGENDAMENTO', 'warning', 
       `⚠️ Apenas ${scheduledCount} de ${leads.length} leads cabem no horário de hoje (até ${config.end_time}).`
     );
   }
   ```

---

### **Correção #2: `campaign-process-queue` deve verificar `end_time`**

**Mudanças necessárias:**

1. **Buscar `end_time` na query:**
   ```typescript
   campaign_configs!inner(
     workspace_id,
     inbox_id,
     target_column_id,
     ai_instructions,
     split_messages,
     max_split_parts,
     end_time  // ✅ Adicionar end_time
   )
   ```

2. **Verificar `end_time` antes de processar cada mensagem:**
   ```typescript
   for (const msg of messages) {
     const config = msg.campaign_runs.campaign_configs;
     
     // ✅ NOVO: Verificar se já passou do horário limite
     if (config.end_time) {
       const now = new Date();
       const currentTime = timeToDate(now.toTimeString().slice(0, 8), now);
       const endTimeToday = timeToDate(config.end_time, now);
       
       if (currentTime > endTimeToday) {
         await log(supabase, runId, 'PAUSA', 'warning', 
           `⏸️ Horário limite (${config.end_time}) atingido. Pausando campanha.`,
           { end_time: config.end_time, current_time: currentTime.toTimeString() }
         );
         
         await pauseRun(supabase, runId, `Horário limite (${config.end_time}) atingido`);
         paused++;
         break; // Para de processar mensagens desta run
       }
     }
     
     // ... resto do processamento
   }
   ```

3. **Alternativa: Filtrar na query SQL:**
   ```typescript
   // Adicionar filtro para não buscar mensagens se já passou do end_time
   // (mais eficiente, mas requer função helper)
   ```

---

## 🎯 Impacto

### **Antes (Com Bug):**
- ❌ Campanha executada manualmente às 10:57
- ❌ Agendou mensagens até 22:49 (4h 49min após limite)
- ❌ Enviou 8 mensagens após 18:00
- ❌ Última mensagem às 22:50

### **Depois (Corrigido):**
- ✅ `campaign-execute-now` verifica se está dentro da janela
- ✅ `campaign-execute-now` respeita `end_time` ao agendar
- ✅ `campaign-process-queue` verifica `end_time` antes de processar
- ✅ Mensagens agendadas após `end_time` são automaticamente pausadas/skipped

---

## 📝 Notas Adicionais

1. **Execução Manual vs Automática:**
   - Execução manual (`campaign-execute-now`) deveria respeitar `end_time` igual ao scheduler
   - Ou pelo menos avisar o usuário se vai ultrapassar

2. **Mensagens já agendadas:**
   - Se mensagens já foram agendadas (via bug anterior), o processor deve pausar ao detectar `end_time` passado

3. **Timezone:**
   - Verificar se o `end_time` está sendo comparado no timezone correto da campanha

---

**Data da análise:** 09/12/2025
**Status:** 🔴 **CRÍTICO** - Precisa correção urgente

