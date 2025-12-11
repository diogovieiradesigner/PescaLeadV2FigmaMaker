# 📊 Como Ver Logs das Edge Functions

## ⚠️ IMPORTANTE

O comando `supabase functions logs` **não está disponível** na sua versão do Supabase CLI.

---

## ✅ MÉTODO 1: Dashboard do Supabase (Recomendado)

### **Acesse o Dashboard:**

1. Vá para: https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/functions
2. Clique na function que você quer ver (ex: `fetch-google-maps`)
3. Vá na aba **"Logs"** ou **"Invocation Logs"**
4. Você verá todos os logs em tempo real

---

## ✅ MÉTODO 2: Logs Estruturados na Tabela (Melhor Opção)

### **Os logs que implementamos estão na tabela `extraction_logs`!**

Execute esta query SQL no SQL Editor do Supabase:

```sql
-- Ver todos os logs de uma extração específica
SELECT 
  el.step_name,
  el.level,
  el.message,
  el.details,
  el.created_at
FROM extraction_logs el
WHERE el.run_id = 'SEU_RUN_ID_AQUI'  -- Substitua pelo ID da extração
ORDER BY el.created_at ASC;
```

### **Ou ver logs recentes de todas as extrações:**

```sql
-- Ver logs recentes (últimas 2 horas)
SELECT 
  el.run_id,
  el.step_name,
  el.level,
  el.message,
  el.details,
  el.created_at
FROM extraction_logs el
WHERE el.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY el.created_at DESC
LIMIT 100;
```

### **Filtrar por tipo de log:**

```sql
-- Ver apenas logs de Segmentação (expansão por bairros)
SELECT 
  el.step_name,
  el.level,
  el.message,
  el.details,
  el.created_at
FROM extraction_logs el
WHERE el.step_name = 'Segmentação'
  AND el.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY el.created_at DESC;
```

```sql
-- Ver apenas logs de Compensação
SELECT 
  el.step_name,
  el.level,
  el.message,
  el.details,
  el.created_at
FROM extraction_logs el
WHERE el.step_name = 'Compensação'
  AND el.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY el.created_at DESC;
```

```sql
-- Ver apenas logs de Finalização
SELECT 
  el.step_name,
  el.level,
  el.message,
  el.details,
  el.created_at
FROM extraction_logs el
WHERE el.step_name = 'Finalização'
  AND el.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY el.created_at DESC;
```

---

## ✅ MÉTODO 3: Via API do Supabase

Se você quiser consultar via código, pode usar:

```typescript
const { data, error } = await supabase
  .from('extraction_logs')
  .select('*')
  .eq('run_id', 'SEU_RUN_ID')
  .order('created_at', { ascending: true });
```

---

## 🎯 ONDE ESTÃO OS LOGS?

### **1. Logs de Console (stdout/stderr):**
- **Onde:** Dashboard do Supabase → Functions → Logs
- **O que mostra:** `console.log()`, `console.error()`, etc.
- **Acesso:** https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/functions

### **2. Logs Estruturados (extraction_logs):**
- **Onde:** Tabela `extraction_logs` no banco de dados
- **O que mostra:** Todos os logs que implementamos (compensação, expansão, finalização, etc.)
- **Acesso:** SQL Editor do Supabase ou via API

---

## 📊 QUAIS LOGS FORAM IMPLEMENTADOS?

Todos estes logs estão na tabela `extraction_logs`:

### **Compensação:**
- ✅ Decisão de compensação (quando não é necessária)
- ✅ Enfileiramento de compensação (falhas)

### **Expansão por Bairros:**
- ✅ Decisão de expansão (quando não expande e por quê)
- ✅ Chamada Overpass API (tempo, erros)
- ✅ Processamento de bairros (filtros aplicados)
- ✅ Estratégia de expansão (ajustes dinâmicos)

### **Mensagens Perdidas:**
- ✅ Verificação de mensagens perdidas (verificações normais)

### **Finalização:**
- ✅ Decisão de finalização (todas as condições)
- ✅ Métricas finais consolidadas

### **Edge Functions Relacionadas:**
- ✅ fetch-overpass-coordinates (parsing, query)
- ✅ start-extraction (histórico estruturado)

---

## 🎯 COMO TESTAR OS LOGS

1. **Crie uma nova extração** no seu sistema
2. **Aguarde ela processar** (ou finalizar)
3. **Execute a query SQL** acima com o `run_id` da extração
4. **Verifique** se todos os logs aparecem corretamente

---

## 💡 DICA

Para ver os logs em tempo real enquanto uma extração está rodando:

```sql
-- Execute esta query várias vezes (refresh) para ver logs novos
SELECT 
  el.step_name,
  el.level,
  el.message,
  el.details,
  el.created_at
FROM extraction_logs el
WHERE el.run_id = 'SEU_RUN_ID_AQUI'
ORDER BY el.created_at DESC
LIMIT 50;
```

---

## ✅ RESUMO

- ❌ `supabase functions logs` não funciona na sua versão do CLI
- ✅ Use o **Dashboard do Supabase** para logs de console
- ✅ Use a **tabela `extraction_logs`** para logs estruturados (recomendado)
- ✅ Todos os logs implementados estão na tabela `extraction_logs`

