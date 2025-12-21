# 🔍 Diagnóstico: Fila de Transcrição Travada

## 🎯 Problema Identificado

**Situação:** Fila de transcrição não está rodando e travou transcrições.

---

## 📊 Evidências Coletadas

### **1. Cron Job Configurado**

| Item | Valor | Status |
|------|-------|--------|
| **Job Name** | `ai-transcription-queue` | ✅ Ativo |
| **Schedule** | `10 seconds` | ❌ **INVÁLIDO** |
| **Comando** | Chama Edge Function `ai-transcription-queue` | ✅ OK |

**⚠️ PROBLEMA CRÍTICO:** O schedule `"10 seconds"` **NÃO É VÁLIDO** para `pg_cron`!

**pg_cron não suporta intervalos menores que 1 minuto.** O formato correto seria:
- `*/1 * * * *` - A cada 1 minuto
- `*/2 * * * *` - A cada 2 minutos
- `*/5 * * * *` - A cada 5 minutos

---

### **2. Status da Fila**

| Métrica | Valor | Status |
|---------|-------|--------|
| **Total de mensagens** | 0 | ✅ Vazia |
| **Prontas para processar** | 0 | ✅ |
| **Aguardando timeout** | 0 | ✅ |
| **Mensagens travadas** | 0 | ✅ |

**Resultado:** Fila está vazia, mas há mensagens com status `pending` que não foram enfileiradas.

---

### **3. Mensagens com Status Pending**

| Status | Total | Últimas 24h |
|--------|-------|-------------|
| **pending** | 1 | 1 |
| **processing** | 0 | 0 |

**Resultado:** Há 1 mensagem com status `pending` que não foi processada.

---

### **4. Configuração de Transcrição**

| Item | Valor | Status |
|------|-------|--------|
| **Audio Enabled** | `true` | ✅ |
| **Image Enabled** | `true` | ✅ |
| **Video Enabled** | `false` | ✅ |
| **Is Active** | `true` | ✅ |

**Resultado:** Configuração está ativa e correta.

---

## 🔍 Causa Raiz Identificada

### **Problema Principal: Cron Job com Schedule Inválido**

**Código atual:**
```sql
schedule: "10 seconds"  -- ❌ INVÁLIDO!
```

**pg_cron não aceita:**
- Intervalos em segundos (`"10 seconds"`, `"30 seconds"`, etc.)
- Formato de intervalo direto

**pg_cron aceita apenas:**
- Formato cron padrão: `"*/1 * * * *"` (a cada minuto)
- Formato cron padrão: `"*/2 * * * *"` (a cada 2 minutos)

---

## 💡 Solução

### **Opção 1: Corrigir Schedule para 1 Minuto** ✅ (Recomendado)

**Alterar de:**
```sql
schedule: "10 seconds"
```

**Para:**
```sql
schedule: "*/1 * * * *"  -- A cada 1 minuto
```

---

### **Opção 2: Usar Cron Mais Frequente (30 segundos)** ⚠️ (Não suportado)

**Não é possível** com pg_cron. Para intervalos menores que 1 minuto, seria necessário:
- Usar Edge Function com cron externo (GitHub Actions, etc.)
- Ou usar `pg_net` com loop interno (não recomendado)

---

## 🔧 Correção Necessária

### **1. Remover Cron Job Atual**

```sql
SELECT cron.unschedule('ai-transcription-queue');
```

### **2. Criar Novo Cron Job com Schedule Correto**

```sql
SELECT cron.schedule(
  'ai-transcription-queue-v2',
  '*/1 * * * *',  -- ✅ A cada 1 minuto (formato cron válido)
  $$
    SELECT net.http_post(
        url := 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/ai-transcription-queue',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
        ),
        body := '{}'::jsonb
    );
  $$
);
```

---

## 📋 Verificações Adicionais

### **1. Verificar se Mensagens Pendentes Precisam Ser Re-enfileiradas**

```sql
-- Mensagens com status pending que não estão na fila
SELECT 
    id,
    transcription_status,
    created_at,
    media_url
FROM messages
WHERE transcription_status = 'pending'
  AND id NOT IN (
    SELECT (message->>'message_id')::uuid
    FROM pgmq.q_ai_transcription_queue
  );
```

### **2. Verificar Função RPC `ai_queue_transcription`**

```sql
-- Verificar se função existe
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'ai_queue_transcription';
```

---

## 🚀 Próximos Passos

1. ✅ **Corrigir cron job** - Alterar schedule para formato válido
2. ✅ **Verificar mensagens pendentes** - Re-enfileirar se necessário
3. ✅ **Monitorar** - Verificar se fila volta a processar
4. ✅ **Testar** - Enviar nova mensagem de áudio/imagem para validar

---

**Status:** 🔍 **DIAGNÓSTICO COMPLETO - Cron job com schedule inválido**

**Ação necessária:** Corrigir schedule do cron job de `"10 seconds"` para `"*/1 * * * *"`

