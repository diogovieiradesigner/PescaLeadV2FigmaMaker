# 🔍 Análise: Extração Lead Food - "Restaurantes" em Aricanduva

## 📊 Status Atual

**Run ID:** `c4826ce3-dcd9-498e-9ffc-513083593b22`  
**Nome:** Restaurantes - 10/12/2025 10:20  
**Status:** `running`  
**Início:** 10/12/2025 13:20:12 (há ~4 minutos)  
**Meta:** 10 leads  
**Capturados:** 0 leads (0%)  
**Páginas consumidas:** 0  

---

## 🔎 Diagnóstico

### ✅ **O que está funcionando:**

1. **Inicialização OK:**
   - ✅ Run criada com sucesso
   - ✅ 1 página enfileirada na fila `google_maps_queue`
   - ✅ Histórico consultado (0 páginas já processadas)

2. **Fila PGMQ:**
   - ✅ Mensagem na fila: `msg_id: 1767`
   - ✅ Status: **PRONTA** para processamento (`vt <= NOW()`)
   - ✅ Criada em: `2025-12-10 13:20:12`
   - ✅ Payload correto com `run_id`, `page: 1`, `workspace_id`

3. **Edge Functions Ativas:**
   - ✅ `process-google-maps-queue` rodando (logs recentes)
   - ✅ `fetch-google-maps` rodando (logs recentes)

---

### ⚠️ **Problemas Identificados:**

#### **1. Mensagem não está sendo processada**

**Situação:**
- Mensagem está **PRONTA** na fila há ~4 minutos
- Mas não foi processada ainda
- Não há leads em staging
- `pages_consumed` ainda é 0

**Possíveis causas:**
1. **Rate limiting do Google Maps API** - muitas requisições simultâneas
2. **Erro silencioso** no processamento da mensagem
3. **Mensagem sendo lida mas não deletada** (visibility timeout)

#### **2. Configuração da Extração**

```json
{
  "search_term": "Restaurantes",
  "location": "Aricanduva, Sao Paulo, Brazil",
  "target_quantity": 10,
  "require_phone": true,
  "require_website": false,
  "require_email": false,
  "min_rating": 0.0,
  "min_reviews": 0,
  "expand_state_search": false
}
```

**Filtros aplicados:**
- ✅ Requer telefone (`require_phone: true`)
- ✅ Sem filtro de rating mínimo
- ✅ Sem filtro de reviews mínimo

---

## 🔧 Ações Recomendadas

### **1. Verificar se mensagem está sendo processada**

```sql
-- Verificar se mensagem ainda está na fila
SELECT 
    msg_id,
    vt,
    NOW() as agora,
    message->>'run_id' as run_id,
    message->>'page' as page
FROM pgmq.q_google_maps_queue
WHERE message->>'run_id' = 'c4826ce3-dcd9-498e-9ffc-513083593b22';
```

**Se ainda estiver na fila:**
- Mensagem não está sendo lida pela `process-google-maps-queue`
- Verificar logs da Edge Function para erros

**Se não estiver na fila:**
- Mensagem foi lida mas pode estar em visibility timeout
- Verificar se `fetch-google-maps` está processando

---

### **2. Verificar logs detalhados**

```sql
-- Verificar logs de extração recentes
SELECT 
    el.step_name,
    el.level,
    el.message,
    el.details,
    el.created_at
FROM extraction_logs el
WHERE el.run_id = 'c4826ce3-dcd9-498e-9ffc-513083593b22'
ORDER BY el.created_at DESC;
```

---

### **3. Verificar se há erros no processamento**

**No Supabase Dashboard:**
1. Ir em **Edge Functions** → **process-google-maps-queue**
2. Verificar logs das últimas execuções
3. Procurar por erros relacionados ao `run_id`

**No Supabase Dashboard:**
1. Ir em **Edge Functions** → **fetch-google-maps**
2. Verificar logs das últimas execuções
3. Procurar por erros relacionados ao `run_id`

---

### **4. Verificar rate limiting do Google Maps**

**Possível problema:**
- Muitas extrações simultâneas podem estar causando rate limiting
- Google Maps API pode estar bloqueando requisições temporariamente

**Solução:**
- Aguardar alguns minutos
- Verificar se outras extrações estão funcionando
- Considerar aumentar intervalo entre requisições

---

## 📈 Próximos Passos

### **Imediato:**
1. ✅ Verificar se mensagem ainda está na fila
2. ✅ Verificar logs detalhados da Edge Function
3. ✅ Verificar se há erros no processamento

### **Se mensagem não estiver sendo processada:**
1. Verificar se `process-google-maps-queue` está rodando corretamente
2. Verificar se há problemas de conectividade com Google Maps API
3. Considerar re-enfileirar a mensagem manualmente

### **Se mensagem estiver sendo processada mas sem resultados:**
1. Verificar se há restaurantes em Aricanduva com telefone
2. Verificar se filtros estão muito restritivos
3. Considerar ajustar `require_phone` para `false` temporariamente

---

## 🎯 Conclusão

**Status:** ⚠️ **EXTRAÇÃO PARADA** - Mensagem na fila mas não processada

**Causa mais provável:**
- Mensagem está na fila mas não está sendo lida pela `process-google-maps-queue`
- Ou está sendo lida mas falhando silenciosamente

**Ação imediata:**
- Verificar logs da Edge Function `process-google-maps-queue`
- Verificar se há erros relacionados ao `run_id`
- Se necessário, re-enfileirar a mensagem manualmente

---

**Última atualização:** 10/12/2025 13:24

