# ✅ Correção: Cálculo de Agendamento Considerando `start_time` e `end_time`

## 📋 Problema Identificado

O usuário identificou que o cálculo de agendamento de mensagens **não estava considerando o `start_time`** no momento de calcular os horários, apenas o `end_time`.

### **Cenário Problemático:**
- Campanha configurada: `start_time = 09:00`, `end_time = 18:00`
- Usuário executa manualmente às **08:00**
- Sistema agendava mensagens a partir de **08:00** ❌ (antes do `start_time` permitido!)

---

## 🔧 Correções Implementadas

### **1. `campaign-execute-now` - Agora considera `start_time` e `end_time`**

**Arquivo:** `supabase/functions/campaign-execute-now/index.ts`

**Mudanças:**
- ✅ Verifica se `start_time` já chegou antes de executar
- ✅ Verifica se `end_time` já passou antes de executar
- ✅ Calcula `actualStartTime = MAX(now, start_time)` para garantir que não agende antes do permitido
- ✅ Usa `actualStartTime` na função `generateRandomScheduleWithLimit()`
- ✅ Logs detalhados sobre a janela de horário

**Comportamento:**
- Se `now < start_time` → **Erro 400** (horário de início ainda não chegou)
- Se `now > end_time` → **Erro 400** (horário limite já passou)
- Se `now` está dentro da janela → Usa `MAX(now, start_time)` como início real
- Agendamento respeita ambos os limites

---

### **2. `campaign-scheduler` - Agora considera `start_time` no cálculo**

**Arquivo:** `supabase/functions/campaign-scheduler/index.ts`

**Mudanças:**
- ✅ Calcula `actualStartTime = MAX(now, start_time)`
- ✅ Usa `actualStartTime` no cálculo de intervalos ótimos
- ✅ Usa `actualStartTime` na função `generateRandomScheduleWithLimit()`
- ✅ Logs detalhados sobre `start_time` e `end_time`

**Comportamento:**
- O `should_campaign_run` já garante que estamos dentro da janela
- Mas o cálculo agora usa `actualStartTime` para garantir que não agende antes do `start_time`
- Se o scheduler rodar antes do `start_time`, aguarda até o horário correto

---

## 📊 Exemplos de Comportamento

### **Exemplo 1: Executar Agora ANTES do `start_time`**
```
Configuração: start_time = 09:00, end_time = 18:00
Usuário executa: 08:00
Resultado: ❌ Erro 400 - "Horário de início (09:00) ainda não chegou"
```

### **Exemplo 2: Executar Agora DENTRO da janela**
```
Configuração: start_time = 09:00, end_time = 18:00
Usuário executa: 10:57
Resultado: ✅ Agenda mensagens de 10:57 até 18:00
```

### **Exemplo 3: Executar Agora DEPOIS do `end_time`**
```
Configuração: start_time = 09:00, end_time = 18:00
Usuário executa: 19:00
Resultado: ❌ Erro 400 - "Horário limite (18:00) já passou"
```

### **Exemplo 4: Scheduler roda ANTES do `start_time`**
```
Configuração: start_time = 09:00, end_time = 18:00
Scheduler roda: 08:30
should_campaign_run: ❌ Retorna false (fora da janela)
Resultado: Não executa (correto)
```

### **Exemplo 5: Scheduler roda DENTRO da janela**
```
Configuração: start_time = 09:00, end_time = 18:00
Scheduler roda: 10:00
should_campaign_run: ✅ Retorna true
actualStartTime: 10:00 (MAX(10:00, 09:00))
Resultado: ✅ Agenda mensagens de 10:00 até 18:00
```

---

## 🎯 Validação do Cálculo

### **Antes (Com Bug):**
```typescript
// ❌ Usava sempre 'now', ignorando start_time
const schedules = generateRandomScheduleWithLimit(
  now,  // Podia ser 08:00 mesmo com start_time = 09:00
  leads.length,
  minInterval,
  maxInterval,
  endTimeToday
);
```

### **Depois (Corrigido):**
```typescript
// ✅ Calcula actualStartTime considerando start_time
const actualStartTime = startTimeToday && startTimeToday > now 
  ? startTimeToday  // Se start_time > now, usa start_time
  : now;            // Senão, usa now

const schedules = generateRandomScheduleWithLimit(
  actualStartTime,  // ✅ Sempre dentro da janela permitida
  leads.length,
  minInterval,
  maxInterval,
  endTimeToday
);
```

---

## 📝 Logs Adicionados

### **`campaign-execute-now`:**
- `VERIFICAÇÃO` - Mostra janela completa (`start_time` até `end_time`)
- `AGENDAMENTO` - Indica se começa "AGORA" ou "a partir de `start_time`"
- `ERRO` - Mensagens específicas para `start_time` não alcançado

### **`campaign-scheduler`:**
- `CÁLCULO_INTERVALO` - Mostra `actual_start_time` e `respects_start_time`
- `AGENDAMENTO` - Inclui `start_time` e `actual_start_time` nos detalhes

---

## ✅ Validação Final

### **Cenário Real (Bug Original):**
```
Campanha: start_time = 09:00, end_time = 18:00
Executada: 10:57:29
Última mensagem: 22:50:10 ❌ (4h 50min após limite)
```

### **Cenário Corrigido:**
```
Campanha: start_time = 09:00, end_time = 18:00
Executada: 10:57:29
Verificação: ✅ Dentro da janela (10:57 entre 09:00 e 18:00)
actualStartTime: 10:57 (MAX(10:57, 09:00))
Última mensagem: Antes de 18:00 ✅
Mensagens após 18:00: 0 ✅
```

---

## 🚀 Deploy Necessário

```bash
# Deploy das Edge Functions corrigidas
supabase functions deploy campaign-execute-now
supabase functions deploy campaign-scheduler
```

---

**Data da correção:** 09/12/2025
**Status:** ✅ **IMPLEMENTADO** - Aguardando deploy

