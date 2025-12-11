# 🔧 Correção Completa dos Erros de Foreign Key

## ⚠️ PROBLEMAS IDENTIFICADOS

Você está enfrentando dois erros de foreign key diferentes, mas relacionados:

### Erro 1: Mensagens Recebidas do WhatsApp (Webhook)
```
Key (conversation_id)=(xxx) is not present in table "conversations"
```
**Causa:** O webhook chama uma RPC function `save_incoming_message` que não existe, fazendo o código falhar ao tentar criar conversas automaticamente.

### Erro 2: Mensagens Enviadas pela IA
```
❌ [SEND-MESSAGE] Error saving message
insert or update on table "messages" violates foreign key constraint
```
**Causa:** A IA chama `/functions/v1/internal-send-ai-message` que não existia, e o fallback tenta inserir mensagens sem validar se a conversa existe.

## ✅ SOLUÇÃO COMPLETA

Ambos os problemas foram corrigidos:

### 1. RPC Function para Webhooks (Receber Mensagens)

**Arquivo:** `/database/save_incoming_message.sql`

**O que faz:**
- Recebe mensagens do WhatsApp via webhook
- Cria conversa automaticamente se não existir
- Atualiza conversa existente
- Insere mensagem vinculada à conversa
- Trata corretamente mensagens `fromMe` (enviadas pelo atendente via WhatsApp Web)

**Como aplicar:**
1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole o conteúdo de `/database/save_incoming_message.sql`
4. Execute (Run ou Ctrl+Enter)

### 2. Endpoint Interno para IA (Enviar Mensagens)

**Arquivo:** `/supabase/functions/server/index.tsx`

**O que faz:**
- Nova rota: `/make-server-e4f9d774/internal-send-ai-message`
- **VALIDA SE A CONVERSA EXISTE** antes de tentar enviar
- Retorna erro 404 se conversa não existir (evita foreign key)
- Envia via provider WhatsApp
- Salva mensagem no banco

**Já aplicado automaticamente no código!** ✅

## 🔍 VERIFICAÇÃO

Após aplicar a RPC function SQL, teste:

### Teste 1: Receber mensagem do WhatsApp
```bash
# Envie uma mensagem para o número do WhatsApp conectado
# Deve aparecer nos logs:
✅ [CHAT-SERVICE] Message saved successfully via RPC
   Message ID: xxxxx
   Conversation ID: xxxxx
   Is new conversation? true
```

### Teste 2: IA enviando mensagem
```bash
# Conversa existente deve funcionar:
✅ [INTERNAL-AI-MESSAGE] Message sent and saved successfully

# Conversa inexistente deve retornar erro amigável:
❌ [INTERNAL-AI-MESSAGE] Conversation not found: xxxxx
```

## 📝 DETALHES TÉCNICOS

### RPC Function `save_incoming_message`

**Parâmetros:**
```sql
p_workspace_id uuid,
p_inbox_id uuid,
p_contact_phone text,
p_contact_name text,
p_content_type text,
p_text_content text,
p_media_url text DEFAULT NULL,
p_audio_duration integer DEFAULT NULL,
p_file_name text DEFAULT NULL,
p_file_size integer DEFAULT NULL,
p_provider_message_id text DEFAULT NULL,
p_lead_id uuid DEFAULT NULL,
p_message_timestamp bigint DEFAULT NULL,
p_from_me boolean DEFAULT FALSE
```

**Retorna:**
```json
{
  "conversation_id": "uuid",
  "message_id": "uuid",
  "conversation_is_new": boolean,
  "attendant_type": "human" | "ai",
  "agent_id": "uuid" | null
}
```

### Endpoint `/internal-send-ai-message`

**Request:**
```json
{
  "conversationId": "uuid",
  "text": "Mensagem da IA"
}
```

**Headers obrigatórios:**
```
X-Service-Role-Key: [seu service role key]
Content-Type: application/json
```

**Response (Sucesso):**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "text_content": "...",
    ...
  },
  "providerMessageId": "xxxxx:xxxx",
  "provider": "uazapi"
}
```

**Response (Conversa não encontrada):**
```json
{
  "error": "Conversation not found",
  "conversation_id": "uuid",
  "details": "..."
}
```

## 🎯 POR QUE ISSO RESOLVE O PROBLEMA?

### Antes (Bugado):
1. Webhook recebe mensagem → Chama RPC que não existe → Erro
2. IA tenta enviar → Chama endpoint que não existe → Fallback insere direto → Foreign key error

### Depois (Corrigido):
1. Webhook recebe mensagem → Chama RPC `save_incoming_message` → Cria conversa + mensagem atomicamente ✅
2. IA tenta enviar → Chama `/internal-send-ai-message` → Valida conversa existe → Envia + salva ✅

## ⚡ IMPORTANTE

**A RPC function DEVE ser executada no Supabase antes de tudo funcionar!**

Sem ela, o webhook continuará falhando ao receber mensagens do WhatsApp.

## 🐛 Se ainda houver erros

1. Verifique os logs do Supabase:
   ```sql
   SELECT * FROM pg_stat_user_functions 
   WHERE funcname = 'save_incoming_message';
   ```

2. Teste manualmente a RPC:
   ```sql
   SELECT save_incoming_message(
     p_workspace_id := 'seu-workspace-id',
     p_inbox_id := NULL,
     p_contact_phone := '5511999999999',
     p_contact_name := 'Teste',
     p_content_type := 'text',
     p_text_content := 'Mensagem de teste',
     p_from_me := FALSE
   );
   ```

3. Se retornar erro, compartilhe comigo os detalhes!
