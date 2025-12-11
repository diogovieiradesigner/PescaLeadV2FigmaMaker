# 🔧 Setup do Banco de Dados - Pesca Lead

## ⚠️ PROBLEMA IDENTIFICADO

O erro que você está enfrentando:
```
insert or update on table "messages" violates foreign key constraint "messages_conversation_id_fkey"
Key (conversation_id)=(0ee2a54e-0224-4f33-b639-2f2676be17da) is not present in table "conversations".
```

**Causa:** O código está tentando chamar uma função RPC `save_incoming_message` que não existe no banco de dados. Essa função deveria criar a conversa E a mensagem atomicamente, mas como ela não existe, o sistema está falhando.

## ✅ SOLUÇÃO

Execute a função SQL que criei em `/database/save_incoming_message.sql` no seu Supabase.

### Como executar:

1. **Acesse o Supabase Dashboard**
   - Vá para o seu projeto no Supabase
   - Clique em "SQL Editor" no menu lateral

2. **Cole o conteúdo do arquivo**
   - Abra o arquivo `/database/save_incoming_message.sql`
   - Copie TODO o conteúdo
   - Cole no SQL Editor do Supabase

3. **Execute a query**
   - Clique em "Run" ou pressione Ctrl+Enter
   - Você deve ver a mensagem de sucesso

4. **Verifique se a função foi criada**
   ```sql
   SELECT 
     routine_name, 
     routine_schema
   FROM information_schema.routines
   WHERE routine_name = 'save_incoming_message';
   ```

## 🎯 O que essa função faz:

A função `save_incoming_message` é uma RPC (Remote Procedure Call) que:

1. **Limpa o número de telefone** removendo `@s.whatsapp.net` e caracteres especiais
2. **Procura por uma conversa existente** no workspace/inbox com esse telefone
3. **Se não encontrar:**
   - Cria uma nova conversa
   - Define status inicial como 'waiting'
   - Configura attendant_type (human ou ai) via trigger
   - Incrementa contadores
4. **Se encontrar:**
   - Atualiza a conversa existente
   - Incrementa total_messages e unread_count (se não for fromMe)
   - Atualiza last_message e last_message_at
5. **Insere a mensagem** com o conversation_id correto
6. **Retorna** informações sobre a conversa e mensagem criadas

## 🔍 Testando após executar:

Após executar a função SQL, teste enviando uma mensagem via WhatsApp. O erro deve desaparecer e você deve ver nos logs:

```
✅ [CHAT-SERVICE] Message saved successfully via RPC
   Message ID: xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx
   Conversation ID: xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx
   Is new conversation? true
```

## 📝 Notas Importantes:

- Esta função usa `SECURITY DEFINER` para executar com privilégios elevados
- Ela trata corretamente mensagens `fromMe=true` (enviadas pelo atendente via WhatsApp Web)
- Ela preserva timestamps originais do webhook
- Ela é atômica: ou cria tudo com sucesso ou reverte tudo em caso de erro

## 🐛 Se ainda houver erros:

Verifique os logs do Supabase para ver mensagens de NOTICE/WARNING da função:
```sql
-- Os logs aparecem como:
[save_incoming_message] Cleaning phone: 5521964594565@s.whatsapp.net -> 5521964594565
[save_incoming_message] Creating new conversation for phone: 5521964594565
[save_incoming_message] New conversation created: xxxxx-xxxx
```

Se você ver erros, compartilhe comigo e ajustarei a função!
