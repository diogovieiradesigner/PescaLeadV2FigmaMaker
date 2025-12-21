# 🚨 Diagnóstico: Extração Parada - Mensagem não sendo processada

## 🔴 Problema Crítico Identificado

**Run ID:** `c4826ce3-dcd9-498e-9ffc-513083593b22`  
**Status:** Mensagem na fila há **5+ minutos** sem ser processada

---

## 📊 Evidências

### **Mensagem na Fila:**
```json
{
  "msg_id": 1767,
  "visible_at": "2025-12-10 13:20:12",
  "status": "PRONTA",
  "read_ct": 0,  // ⚠️ NUNCA FOI LIDA!
  "minutos_esperando": 5.13
}
```

### **Análise:**
- ✅ Mensagem está **PRONTA** para processamento (`vt <= NOW()`)
- ❌ **Nunca foi lida** pela `process-google-maps-queue` (`read_ct = 0`)
- ⏱️ Aguardando há **5+ minutos** sem processamento

---

## 🔍 Possíveis Causas

### **1. Função não está rodando (IMPROVÁVEL)**
- Logs mostram que `process-google-maps-queue` está ativa
- Última execução: há poucos segundos
- **Status:** ✅ Função está rodando

### **2. Função está lendo outras mensagens primeiro**
- Pode haver outras mensagens na fila com prioridade
- A função lê em batch de 5 mensagens
- **Verificar:** Quantas mensagens há na fila total?

### **3. Problema com filtro/query da função**
- A função pode estar filtrando mensagens incorretamente
- Pode haver problema com `pgmq_read_batch`
- **Verificar:** Código da função `process-google-maps-queue`

### **4. Mensagem corrompida ou formato inválido**
- Payload pode estar em formato incorreto
- PGMQ pode estar rejeitando a mensagem
- **Verificar:** Estrutura do `message` JSON

---

## 🔧 Ações Imediatas

### **1. Verificar total de mensagens na fila**

```sql
SELECT COUNT(*) as total_mensagens_fila
FROM pgmq.q_google_maps_queue;
```

**Se houver muitas mensagens:**
- A função pode estar processando outras primeiro
- Aguardar alguns minutos para ver se processa

**Se houver poucas mensagens:**
- Problema pode ser com a função ou com a mensagem específica

---

### **2. Verificar estrutura da mensagem**

```sql
SELECT 
    msg_id,
    message,
    message->>'run_id' as run_id,
    message->>'page' as page,
    message->>'workspace_id' as workspace_id
FROM pgmq.q_google_maps_queue
WHERE message->>'run_id' = 'c4826ce3-dcd9-498e-9ffc-513083593b22';
```

**Verificar:**
- ✅ `run_id` está correto?
- ✅ `page` está presente?
- ✅ `workspace_id` está presente?
- ✅ Estrutura JSON está válida?

---

### **3. Verificar logs da Edge Function**

**No Supabase Dashboard:**
1. Edge Functions → `process-google-maps-queue`
2. Verificar logs das últimas execuções
3. Procurar por:
   - Quantas mensagens foram lidas
   - Se há erros ao ler mensagens
   - Se há filtros sendo aplicados

---

### **4. Testar leitura manual da mensagem**

```sql
-- Tentar ler a mensagem manualmente (teste)
SELECT pgmq_read_batch(
    'google_maps_queue',
    30,  -- visibility_timeout
    5    -- qty
);
```

**Se funcionar:**
- Mensagem pode ser lida manualmente
- Problema pode ser com a função Edge Function

**Se não funcionar:**
- Problema pode ser com a mensagem ou com PGMQ

---

## 🎯 Solução Recomendada

### **Opção 1: Aguardar processamento**
- A função pode estar processando outras mensagens primeiro
- Aguardar mais alguns minutos
- Verificar se mensagem é processada automaticamente

### **Opção 2: Re-enfileirar mensagem**
- Deletar mensagem atual da fila
- Criar nova mensagem com mesmo payload
- Forçar processamento imediato

### **Opção 3: Verificar função Edge Function**
- Verificar código da `process-google-maps-queue`
- Verificar se há filtros ou condições que impedem leitura
- Verificar se há problemas com batch size ou visibility timeout

---

## 📝 Próximos Passos

1. ✅ Verificar total de mensagens na fila
2. ✅ Verificar estrutura da mensagem
3. ✅ Verificar logs da Edge Function
4. ⏳ Aguardar alguns minutos para ver se processa
5. 🔧 Se não processar, re-enfileirar mensagem manualmente

---

**Última atualização:** 10/12/2025 13:25

