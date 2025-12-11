# 🚀 Sistema de Fila para Movimentação de Leads em Massa

## 🎯 Problema Resolvido

**Situação:**
- Movimentar muitos leads (ex: 992) causa **timeout** em UPDATE direto
- Processamento síncrono bloqueia outras operações
- Não há controle sobre progresso da movimentação

**Solução:**
- ✅ **Fila assíncrona** usando PGMQ
- ✅ **Processamento em batches** (100 leads por vez)
- ✅ **Edge Function** para processar a fila
- ✅ **Cron job** para execução automática
- ✅ **Rastreamento de progresso** em tempo real

---

## 📋 Componentes do Sistema

### **1. Fila PGMQ: `lead_migration_queue`**

Armazena requisições de movimentação de leads.

**Estrutura da mensagem:**
```json
{
  "run_id": "uuid",
  "run_name": "Nome da Run",
  "funnel_id": "uuid",
  "column_id": "uuid",
  "batch_size": 100,
  "created_at": "2025-12-10T12:00:00Z",
  "status": "pending",
  "progress": {
    "moved": 500,
    "remaining": 492,
    "total": 992,
    "last_batch_at": "2025-12-10T12:05:00Z"
  }
}
```

---

### **2. Função RPC: `queue_lead_migration()`**

**Enfileira uma movimentação de leads.**

**Parâmetros:**
- `p_run_id` (UUID): ID da run de extração
- `p_funnel_id` (UUID): ID do kanban destino
- `p_column_id` (UUID): ID da coluna destino
- `p_batch_size` (INTEGER, opcional): Tamanho do batch (padrão: 100)

**Retorno:**
```json
{
  "success": true,
  "message_id": 12345,
  "run_id": "uuid",
  "run_name": "Restaurantes - 10/12/2025 09:07",
  "funnel_id": "uuid",
  "column_id": "uuid",
  "message": "Movimentação enfileirada: 478 leads serão movidos"
}
```

**Exemplo de uso:**
```sql
SELECT queue_lead_migration(
  '81bfc716-3b7c-4b2b-bb13-adde77adf59d'::UUID,  -- run_id
  '3657418b-d030-48d2-ba1b-87793dcd1d16'::UUID,  -- funnel_id
  'dae0e522-248e-4528-a458-8941c310158b'::UUID   -- column_id
);
```

---

### **3. Função RPC: `process_lead_migration_batch()`**

**Processa um batch de movimentação da fila.**

**Parâmetros:**
- `p_batch_size` (INTEGER, opcional): Tamanho do batch (padrão: 100)

**Retorno:**
```json
{
  "message_id": 12345,
  "run_id": "uuid",
  "run_name": "Restaurantes - 10/12/2025 09:07",
  "leads_moved": 100,
  "leads_remaining": 378,
  "success": true,
  "error_message": "Batch processado: 100 leads movidos, 378 restantes"
}
```

**Características:**
- ✅ Processa até `batch_size` leads por vez
- ✅ Re-enfileira mensagem se ainda há leads restantes
- ✅ Deleta mensagem quando concluído
- ✅ Usa `FOR UPDATE SKIP LOCKED` para evitar conflitos

---

### **4. Edge Function: `process-lead-migration-queue`**

**Processa múltiplos batches da fila.**

**Configurações:**
- `MAX_BATCHES_PER_EXECUTION`: 10 batches por execução
- `DEFAULT_BATCH_SIZE`: 100 leads por batch

**Endpoint:**
```
POST /functions/v1/process-lead-migration-queue
```

**Body (opcional):**
```json
{
  "batch_size": 100
}
```

**Resposta:**
```json
{
  "success": true,
  "timestamp": "2025-12-10T12:00:00Z",
  "batches_processed": 5,
  "total_leads_moved": 500,
  "results": [
    {
      "batch": 1,
      "message_id": 12345,
      "run_id": "uuid",
      "run_name": "Restaurantes - 10/12/2025 09:07",
      "leads_moved": 100,
      "leads_remaining": 378,
      "success": true,
      "message": "Batch processado: 100 leads movidos, 378 restantes"
    }
  ],
  "message": "Processados 5 batch(es), 500 leads movidos"
}
```

---

### **5. Cron Job: `process-lead-migration-queue`**

**Executa automaticamente a cada 30 segundos.**

**Configuração:**
- **Schedule:** `*/30 * * * * *` (a cada 30 segundos)
- **Função:** Chama Edge Function `process-lead-migration-queue`

---

### **6. Funções Auxiliares**

#### **`get_lead_migration_queue_status()`**

Retorna status da fila.

**Retorno:**
```json
{
  "queue_name": "lead_migration_queue",
  "total_messages": 2,
  "oldest_message": "2025-12-10T12:00:00Z",
  "newest_message": "2025-12-10T12:05:00Z"
}
```

#### **`cancel_lead_migration(p_run_id)`**

Cancela todas as movimentações pendentes de uma run.

**Exemplo:**
```sql
SELECT cancel_lead_migration('81bfc716-3b7c-4b2b-bb13-adde77adf59d'::UUID);
```

---

## 🚀 Como Usar

### **1. Enfileirar Movimentação**

```sql
SELECT queue_lead_migration(
  '81bfc716-3b7c-4b2b-bb13-adde77adf59d'::UUID,  -- run_id
  '3657418b-d030-48d2-ba1b-87793dcd1d16'::UUID,  -- funnel_id (Emails Gih)
  'dae0e522-248e-4528-a458-8941c310158b'::UUID   -- column_id (Novo)
);
```

### **2. Verificar Status da Fila**

```sql
SELECT * FROM get_lead_migration_queue_status();
```

### **3. Processar Manualmente (Opcional)**

```bash
curl -X POST https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-lead-migration-queue \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 100}'
```

### **4. Cancelar Movimentação Pendente**

```sql
SELECT cancel_lead_migration('81bfc716-3b7c-4b2b-bb13-adde77adf59d'::UUID);
```

---

## 📊 Fluxo de Processamento

```
1. Usuário chama queue_lead_migration()
   ↓
2. Mensagem é enfileirada em lead_migration_queue
   ↓
3. Cron job executa a cada 30 segundos
   ↓
4. Edge Function process-lead-migration-queue é chamada
   ↓
5. Função process_lead_migration_batch() processa batch
   ↓
6. Se ainda há leads restantes:
   - Re-enfileira mensagem atualizada
   - Próximo batch será processado
   ↓
7. Se todos os leads foram movidos:
   - Deleta mensagem da fila
   - Movimentação concluída
```

---

## ✅ Vantagens

1. **Sem Timeout:** Processamento em batches pequenos evita timeout
2. **Assíncrono:** Não bloqueia outras operações
3. **Rastreável:** Progresso é atualizado em tempo real
4. **Resiliente:** Se um batch falhar, próximo continua
5. **Escalável:** Pode processar múltiplas movimentações simultaneamente
6. **Cancelável:** Pode cancelar movimentações pendentes

---

## 📝 Exemplo Completo

### **Mover Leads de Duas Runs**

```sql
-- Run 1: Restaurantes - 10/12/2025 09:07
SELECT queue_lead_migration(
  '81bfc716-3b7c-4b2b-bb13-adde77adf59d'::UUID,
  '3657418b-d030-48d2-ba1b-87793dcd1d16'::UUID,
  'dae0e522-248e-4528-a458-8941c310158b'::UUID
);

-- Run 2: Restaurantes - 10/12/2025 09:03
SELECT queue_lead_migration(
  '75e677d5-a9e0-49e9-9a5c-5f25573e8bd2'::UUID,
  '3657418b-d030-48d2-ba1b-87793dcd1d16'::UUID,
  'dae0e522-248e-4528-a458-8941c310158b'::UUID
);

-- Verificar status
SELECT * FROM get_lead_migration_queue_status();
```

**Resultado:**
- ✅ 2 movimentações enfileiradas
- ✅ Processamento automático a cada 30 segundos
- ✅ 992 leads serão movidos em ~10 batches (100 leads cada)
- ✅ Tempo estimado: ~5 minutos

---

## 🔧 Deploy

### **1. Aplicar Migrations**

```bash
# Aplicar migration da fila e funções
supabase db push
```

### **2. Deploy Edge Function**

```bash
supabase functions deploy process-lead-migration-queue
```

### **3. Aplicar Cron Job**

```bash
# Aplicar migration do cron job
supabase db push
```

---

**Status:** ✅ **Sistema completo e pronto para uso!**

