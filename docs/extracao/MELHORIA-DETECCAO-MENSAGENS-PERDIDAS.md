# 🔧 Melhoria: Detecção de Mensagens Perdidas na Fila

## 📋 Resumo

Implementada melhoria na Edge Function `fetch-google-maps` (V15) para detectar e tratar automaticamente mensagens de compensação perdidas/expiradas na fila PGMQ.

---

## 🎯 Problema Resolvido

**Situação anterior:**
- Quando páginas de compensação eram enfileiradas, se a mensagem expirasse ou fosse perdida na fila, a extração ficava travada em `running` indefinidamente
- Não havia mecanismo para detectar mensagens perdidas
- Era necessário intervenção manual para finalizar extrações travadas

**Solução implementada:**
- ✅ Detecção automática de mensagens perdidas após timeout (30 minutos)
- ✅ Finalização automática quando mensagens são detectadas como perdidas
- ✅ Log detalhado do motivo da finalização
- ✅ Não quebra o fluxo normal de extração

---

## 🔍 Como Funciona

### **1. Função `checkForLostCompensationMessages()`**

Verifica se há mensagens de compensação perdidas:

1. **Verifica timestamp:** Busca `compensation_enqueued_at` no `progress_data`
2. **Calcula timeout:** Se passou mais de 30 minutos desde o enfileiramento
3. **Verifica fila:** Tenta ler mensagens da fila `google_maps_queue` relacionadas ao `run_id`
4. **Compara páginas:** Verifica se as páginas enfileiradas ainda estão na fila
5. **Retorna resultado:** `true` se mensagens foram perdidas após timeout, `false` caso contrário

**Características de segurança:**
- ✅ Em caso de erro ao verificar fila, retorna `false` para não quebrar fluxo normal
- ✅ Só considera perdida após timeout de 30 minutos
- ✅ Não altera visibilidade das mensagens na fila (usa `visibility_timeout: 0`)

### **2. Integração na Lógica de Finalização**

A verificação é feita **apenas quando `is_last_page = true`** e antes de enfileirar novas compensações:

```typescript
// V15: Verificar se há mensagens de compensação anteriores que foram perdidas
const previousCompensationPages = progressData.compensation_pages_queued || [];
const hasLostMessages = previousCompensationPages.length > 0 && 
  await checkForLostCompensationMessages(supabase, run_id, previousCompensationPages, 30);

const shouldStop = 
  percentage >= 90 ||
  compensationCount >= MAX_COMPENSATION_PAGES ||
  apiExhausted ||
  hasLostMessages; // V15: Parar se mensagens foram perdidas
```

### **3. Timestamp de Enfileiramento**

Quando novas compensações são enfileiradas, salva timestamp:

```typescript
compensation_enqueued_at: new Date().toISOString() // V15: Timestamp para verificação de timeout
```

### **4. Log Detalhado**

Quando finaliza por mensagens perdidas, inclui flag no log:

```typescript
has_lost_messages: hasLostMessages || false // V15: Incluir flag de mensagens perdidas
```

---

## ✅ Garantias de Segurança

### **Não Quebra Fluxo Normal**

1. **Verificação apenas quando necessário:**
   - Só verifica quando `is_last_page = true`
   - Só verifica se há páginas de compensação anteriores enfileiradas
   - Não interfere no processamento normal de páginas

2. **Tratamento de erros:**
   - Se houver erro ao verificar fila, retorna `false` (não considera perdida)
   - Não lança exceções que possam quebrar o fluxo
   - Logs de erro são não-críticos

3. **Timeout conservador:**
   - 30 minutos é tempo suficiente para processar mensagens normalmente
   - Evita finalizações prematuras

### **Compatibilidade**

- ✅ Mantém todas funcionalidades V14
- ✅ Não altera comportamento quando não há mensagens perdidas
- ✅ Usa mesma fila (`google_maps_queue`) que o sistema já usa

---

## 📊 Cenários de Teste

### **Cenário 1: Fluxo Normal (Sem Mensagens Perdidas)**
- ✅ Páginas são enfileiradas normalmente
- ✅ Mensagens são processadas dentro do timeout
- ✅ Extração finaliza normalmente quando atinge condições

### **Cenário 2: Mensagens Perdidas (Após Timeout)**
- ✅ Páginas são enfileiradas
- ✅ Após 30 minutos, mensagens não estão mais na fila
- ✅ Sistema detecta mensagens perdidas
- ✅ Extração finaliza automaticamente com motivo "mensagens de compensação perdidas na fila"

### **Cenário 3: Erro ao Verificar Fila**
- ✅ Se houver erro ao verificar fila, não considera como perdida
- ✅ Fluxo normal continua
- ✅ Log de erro não-crítico é registrado

---

## 🔄 Próximos Passos Recomendados

1. **Monitoramento:** Criar alerta para extrações que finalizam por mensagens perdidas
2. **Ajuste de timeout:** Considerar tornar timeout configurável por workspace
3. **Métricas:** Adicionar métrica de mensagens perdidas no dashboard

---

## 📝 Arquivos Modificados

- `supabase/functions/fetch-google-maps/index.ts`
  - Adicionada função `checkForLostCompensationMessages()`
  - Integrada verificação na lógica de finalização
  - Adicionado timestamp `compensation_enqueued_at`
  - Atualizado version para V15

---

## ✅ Validação

- ✅ Sem erros de lint
- ✅ Mantém compatibilidade com código existente
- ✅ Não quebra fluxo normal
- ✅ Tratamento robusto de erros
- ✅ Logs detalhados para debugging

