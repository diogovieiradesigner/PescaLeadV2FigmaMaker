# 🔧 Correção: Fila de Transcrição Travada

## ✅ Problema Identificado

**Causa Raiz:** Cron job estava configurado com schedule **inválido** (`"10 seconds"`).

**pg_cron não suporta:**
- ❌ Intervalos em segundos (`"10 seconds"`, `"30 seconds"`, etc.)
- ❌ Formato de intervalo direto

**pg_cron aceita apenas:**
- ✅ Formato cron padrão: `"*/1 * * * *"` (a cada 1 minuto)
- ✅ Formato cron padrão: `"*/2 * * * *"` (a cada 2 minutos)

---

## 🔧 Correção Implementada

### **1. Migration Criada**

**Arquivo:** `supabase/migrations/fix_transcription_queue_cron.sql`

**Ações:**
1. ✅ Remove cron job inválido (`ai-transcription-queue`)
2. ✅ Cria novo cron job com schedule correto (`ai-transcription-queue-v2`)
3. ✅ Schedule: `*/1 * * * *` (a cada 1 minuto)

---

### **2. Novo Cron Job**

| Item | Valor |
|------|-------|
| **Nome** | `ai-transcription-queue-v2` |
| **Schedule** | `*/1 * * * *` ✅ |
| **Frequência** | A cada 1 minuto |
| **Comando** | Chama Edge Function `ai-transcription-queue` |

---

## 📊 Status Atual

### **Fila de Transcrição**

| Métrica | Valor |
|---------|-------|
| **Total de mensagens** | 0 (vazia) |
| **Mensagens travadas** | 0 |
| **Mensagens pendentes** | 1 (não enfileirada) |

### **Mensagem Pendente**

| Campo | Valor |
|-------|-------|
| **ID** | `7b1466db-a21d-4276-94c3-1686df420df1` |
| **Status** | `pending` |
| **Tempo aguardando** | ~99 minutos |
| **Media URL** | Presente |

---

## 🚀 Próximos Passos

### **1. Aplicar Migration** ✅

```sql
-- Executar migration
-- Arquivo: supabase/migrations/fix_transcription_queue_cron.sql
```

### **2. Re-enfileirar Mensagem Pendente** ⏳

A mensagem com status `pending` precisa ser re-enfileirada manualmente ou via função RPC `ai_queue_transcription`:

```sql
-- Verificar se função existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'ai_queue_transcription';

-- Se existir, re-enfileirar mensagem pendente
SELECT ai_queue_transcription(
  p_message_id := '7b1466db-a21d-4276-94c3-1686df420df1',
  p_media_url := (SELECT media_url FROM messages WHERE id = '7b1466db-a21d-4276-94c3-1686df420df1'),
  p_content_type := (SELECT type FROM messages WHERE id = '7b1466db-a21d-4276-94c3-1686df420df1')
);
```

### **3. Monitorar** ⏳

Após aplicar a correção:
- ✅ Verificar se cron job está rodando (logs do Supabase)
- ✅ Verificar se fila está processando mensagens
- ✅ Testar com nova mensagem de áudio/imagem

---

## 📋 Checklist

- [x] Identificar problema (schedule inválido)
- [x] Criar migration para corrigir cron job
- [ ] Aplicar migration no Supabase
- [ ] Re-enfileirar mensagem pendente
- [ ] Monitorar funcionamento
- [ ] Testar com nova mensagem

---

**Status:** ✅ **CORREÇÃO CRIADA - Aguardando aplicação**

**Arquivo:** `supabase/migrations/fix_transcription_queue_cron.sql`

