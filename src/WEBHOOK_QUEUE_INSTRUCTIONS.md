# 🔄 Sistema de Fila de Webhooks - Pesca Lead

## 📋 **Visão Geral**

Sistema robusto de fila para **NUNCA mais perder mensagens do WhatsApp**. Todas as mensagens recebidas via webhook são salvas imediatamente no banco de dados e processadas de forma assíncrona.

---

## ✅ **Funcionamento**

### **1. Recebimento do Webhook**
```
WhatsApp → UAZAPI → Webhook → SALVAR NA FILA → Retornar 200 OK
```

✅ **Webhook SEMPRE retorna 200 OK** (mesmo com erro)  
✅ **Mensagem NUNCA é perdida** (salva antes de processar)  
✅ **Processamento assíncrono** (não trava o webhook)

### **2. Processamento**
```
Fila → Processar → Sucesso ✅ (marcar como "completed")
                 → Erro ❌ (marcar como "failed", retry automático)
```

✅ **Retry automático com backoff exponencial:**
- 1ª tentativa: **1 minuto** depois
- 2ª tentativa: **3 minutos** depois
- 3ª tentativa: **9 minutos** depois
- 4ª tentativa: **27 minutos** depois
- 5ª tentativa: **1h 21min** depois
- Após 5 tentativas: **para de tentar** (manual)

---

## 📊 **Status na Fila**

| Status | Descrição |
|--------|-----------|
| **pending** | Aguardando processamento |
| **processing** | Sendo processado agora |
| **completed** | Processado com sucesso ✅ |
| **failed** | Erro no processamento (aguardando retry) ❌ |

---

## 🛠️ **Endpoints da API**

### **1. Ver estatísticas da fila**
```bash
GET /make-server-e4f9d774/webhook/queue/stats
Authorization: Bearer {access_token}
```

**Resposta:**
```json
{
  "success": true,
  "stats": [
    { "status": "pending", "count": 5, "oldest": "2025-12-08T10:00:00Z" },
    { "status": "failed", "count": 2, "oldest": "2025-12-07T15:30:00Z" },
    { "status": "completed", "count": 1542, "avg_retries": 0.3 }
  ],
  "oldest_pending": "2025-12-08T10:00:00Z"
}
```

---

### **2. Listar mensagens com erro**
```bash
GET /make-server-e4f9d774/webhook/queue?status=failed&limit=50
Authorization: Bearer {access_token}
```

**Parâmetros:**
- `status` (opcional): `pending`, `failed`, `completed` (padrão: `failed`)
- `limit` (opcional): número máximo de itens (padrão: 50, máximo: 100)

**Resposta:**
```json
{
  "success": true,
  "count": 2,
  "items": [
    {
      "id": "abc-123-def",
      "instance_name": "diogotesteee",
      "event_type": "messages",
      "message_id": "558398564818:3EB09A7E26514AD254A6BD",
      "status": "failed",
      "error_message": "JWT token expired",
      "retry_count": 3,
      "max_retries": 5,
      "next_retry_at": "2025-12-08T11:30:00Z",
      "created_at": "2025-12-08T10:00:00Z",
      "payload": { ... }
    }
  ]
}
```

---

### **3. Reprocessar mensagens manualmente**

#### **3a. Reprocessar UMA mensagem específica**
```bash
POST /make-server-e4f9d774/webhook/queue/retry
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "queue_id": "abc-123-def"
}
```

#### **3b. Reprocessar TODAS as mensagens com erro**
```bash
POST /make-server-e4f9d774/webhook/queue/retry
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "limit": 100
}
```

**Resposta:**
```json
{
  "success": true,
  "processed": 8,
  "failed": 2,
  "results": [
    { "queue_id": "abc-123", "status": "success" },
    { "queue_id": "def-456", "status": "failed", "error": "Invalid phone number" }
  ]
}
```

---

### **4. Limpar webhooks antigos (>30 dias)**
```bash
POST /make-server-e4f9d774/webhook/queue/cleanup
Authorization: Bearer {access_token}
```

**Resposta:**
```json
{
  "success": true,
  "deleted_count": 3542
}
```

---

## 🚨 **Recuperação após Problemas**

### **Cenário 1: JWT expirou e travou tudo**

1. **Ver quantas mensagens falharam:**
```bash
curl -X GET "https://{projectId}.supabase.co/functions/v1/make-server-e4f9d774/webhook/queue/stats" \
  -H "Authorization: Bearer {token}"
```

2. **Listar mensagens com erro:**
```bash
curl -X GET "https://{projectId}.supabase.co/functions/v1/make-server-e4f9d774/webhook/queue?status=failed&limit=100" \
  -H "Authorization: Bearer {token}"
```

3. **Corrigir o problema (ex: renovar JWT)**

4. **Reprocessar TODAS as mensagens:**
```bash
curl -X POST "https://{projectId}.supabase.co/functions/v1/make-server-e4f9d774/webhook/queue/retry" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

✅ **Pronto! Todas as mensagens perdidas foram recuperadas!**

---

### **Cenário 2: Storage cheio, não conseguiu fazer upload de mídia**

1. **Ver mensagens com erro:**
```bash
GET /webhook/queue?status=failed
```

2. **Limpar espaço no Storage**

3. **Reprocessar:**
```bash
POST /webhook/queue/retry
{ "limit": 50 }
```

---

## 🔍 **Monitoramento**

### **Query SQL direto no Supabase:**

```sql
-- Ver estatísticas resumidas
SELECT * FROM webhook_queue_stats;

-- Ver mensagens com erro
SELECT id, instance_name, error_message, retry_count, created_at
FROM webhook_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 50;

-- Ver mensagens pendentes (aguardando processamento)
SELECT COUNT(*) as pending_count, 
       MIN(created_at) as oldest_pending
FROM webhook_queue
WHERE status = 'pending';

-- Ver taxa de sucesso nas últimas 24h
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM webhook_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

---

## 📝 **Logs para Debug**

Todos os logs incluem prefixo `[WEBHOOK-QUEUE]`:

```
✅ [UAZAPI-WEBHOOK] Saved to queue: abc-123-def
🚀 [UAZAPI-WEBHOOK] Processing message immediately...
✅ [UAZAPI-WEBHOOK] Event processed successfully
```

**Se der erro:**
```
⚠️ [UAZAPI-WEBHOOK] Processing failed, will retry from queue: JWT expired
```

---

## 🎯 **Boas Práticas**

1. ✅ **Monitorar diariamente:**
   - Ver `GET /webhook/queue/stats`
   - Se `failed > 0`, investigar

2. ✅ **Limpar mensagens antigas semanalmente:**
   - `POST /webhook/queue/cleanup`
   - Remove mensagens `completed` com +30 dias

3. ✅ **Configurar alerta:**
   - Se `pending > 100`: sistema pode estar lento
   - Se `failed > 50`: investigar erro recorrente

4. ✅ **Após resolver problema:**
   - Sempre rodar `POST /webhook/queue/retry` para reprocessar

---

## 🛡️ **Segurança**

- ✅ Todos os endpoints protegidos com JWT (`validateAuth`)
- ✅ Webhook público retorna 200 OK (não expõe erros)
- ✅ Erros detalhados salvos no banco (campo `error_details`)
- ✅ Payload original preservado (campo `payload` JSONB)

---

## 📦 **Estrutura do Banco**

```sql
webhook_queue
├── id (UUID)
├── workspace_id (UUID) - descoberto após processar
├── instance_name (TEXT)
├── event_type (TEXT)
├── message_id (TEXT)
├── remote_jid (TEXT)
├── payload (JSONB) - payload original completo
├── status (TEXT) - pending, processing, completed, failed
├── error_message (TEXT)
├── error_details (JSONB)
├── retry_count (INTEGER)
├── max_retries (INTEGER)
├── created_at (TIMESTAMPTZ)
├── processed_at (TIMESTAMPTZ)
└── next_retry_at (TIMESTAMPTZ)
```

---

## 🎉 **Benefícios**

✅ **Nunca mais perder mensagens** (mesmo com erro fatal)  
✅ **Retry automático** (backoff exponencial)  
✅ **Recovery manual** (reprocessar após corrigir problema)  
✅ **Auditoria completa** (payload original + logs de erro)  
✅ **Performance** (webhook retorna 200 OK imediatamente)  
✅ **Escalável** (processa em paralelo, queue infinita)

---

## 📞 **Suporte**

Se algo der errado:
1. Verificar logs no Supabase Edge Functions
2. Verificar `GET /webhook/queue/stats`
3. Verificar `GET /webhook/queue?status=failed`
4. Se necessário, reprocessar com `POST /webhook/queue/retry`

**Nenhuma mensagem será perdida! 🎯**
