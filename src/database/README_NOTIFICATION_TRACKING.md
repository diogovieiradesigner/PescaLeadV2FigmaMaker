# 📬 Sistema de Rastreamento de Notificações Internas

## 🎯 Objetivo

Quando uma notificação via WhatsApp é enviada para um atendente, essa mensagem também aparece como uma conversa interna no sistema, permitindo que o atendente visualize o histórico de notificações recebidas.

## ✅ Funcionalidades Implementadas

### 1. **Inbox de Notificações Internas**
- Nome: `"Notificações Internas"`
- Criada automaticamente no primeiro envio
- Reutilizada em envios subsequentes
- Canal: WhatsApp
- Descrição: "Mensagens de notificação enviadas aos atendentes"

### 2. **Conversas por Atendente**
- Uma conversa única por atendente (identificada pelo telefone)
- Status: `resolved` (notificações já são consideradas resolvidas)
- Attendant type: `human`
- Unread count: `0` (atendente já viu - ele que recebeu)
- Atualizada automaticamente a cada nova notificação

### 3. **Registro de Mensagens**
- Cada notificação enviada é salva na tabela `messages`
- Content type: `text`
- Message type: `sent`
- Is read: `true`
- Vinculada à conversa do atendente

## 🔧 Fluxo Técnico

### Quando uma notificação WhatsApp é enviada:

```
1. Envia mensagem via provider (Evolution/UAZAPI)
   ↓
2. Se enviado com sucesso → Cria rastreamento interno
   ↓
3. Busca inbox "Notificações Internas"
   ↓ (se não existe)
4. Cria inbox automaticamente
   ↓
5. Busca conversa com o telefone do atendente
   ↓ (se não existe)
6. Cria nova conversa
   ↓
7. Salva mensagem na tabela messages
   ↓
8. Atualiza last_message e total_messages
```

## 📊 Estrutura de Dados

### Inbox
```json
{
  "workspace_id": "uuid",
  "name": "Notificações Internas",
  "description": "Mensagens de notificação enviadas aos atendentes",
  "channel": "whatsapp",
  "is_active": true
}
```

### Conversation
```json
{
  "workspace_id": "uuid",
  "inbox_id": "uuid (inbox de notificações)",
  "contact_name": "Nome do Atendente",
  "contact_phone": "5521999999999",
  "status": "resolved",
  "channel": "whatsapp",
  "attendant_type": "human",
  "last_message": "Título da notificação",
  "unread_count": 0
}
```

### Message
```json
{
  "conversation_id": "uuid",
  "content_type": "text",
  "message_type": "sent",
  "text_content": "🐟 *Pesca Lead*\n\n*Título*\n\nCorpo da mensagem",
  "is_read": true
}
```

## 🎨 Visualização no Sistema

### Para o atendente:
1. Acessa a aba "Conversas"
2. Filtra pela inbox "Notificações Internas" (se disponível no filtro)
3. Vê sua própria conversa com histórico de notificações
4. Cada notificação recebida aparece como uma mensagem "enviada"

### Exemplo de mensagem salva:
```
🐟 *Pesca Lead*

*Nova mensagem recebida*

Você tem uma nova mensagem do cliente João Silva.
```

## 🔍 Logs Gerados

### Sucesso:
```
[WhatsApp] ✅ Sent via Uazapi
[WhatsApp] Creating internal conversation for tracking...
[WhatsApp] Using existing inbox: abc123-...
[WhatsApp] Using existing conversation: xyz789-...
[WhatsApp] ✅ Message saved to database: msg456-...
```

### Primeira notificação (cria inbox + conversa):
```
[WhatsApp] ✅ Sent via Evolution
[WhatsApp] Creating internal conversation for tracking...
[WhatsApp] Created new inbox: abc123-...
[WhatsApp] Created new conversation: xyz789-...
[WhatsApp] ✅ Message saved to database: msg456-...
```

## 💡 Benefícios

✅ **Histórico Completo**: Atendentes podem ver todas as notificações recebidas
✅ **Centralizado**: Tudo dentro do próprio sistema de conversas
✅ **Rastreável**: Cada notificação fica registrada no banco
✅ **Organizado**: Inbox dedicada apenas para notificações internas
✅ **Não invasivo**: Se falhar, não compromete o envio da notificação

## ⚠️ Comportamento em Erros

Se houver erro ao criar a conversa/mensagem interna:
- O erro é logado mas **não** interrompe o envio da notificação
- O WhatsApp é enviado normalmente
- Apenas o rastreamento interno é perdido

Exemplo:
```
[WhatsApp] ✅ Sent via Uazapi
[WhatsApp] Creating internal conversation for tracking...
[WhatsApp] Error creating inbox: <erro>
```
↑ Notificação foi enviada, mas não foi salva internamente.

## 🚀 Como Usar

Não requer configuração! O sistema funciona automaticamente quando:
1. Uma notificação é criada na tabela `notifications`
2. Com `channels_requested.whatsapp = true`
3. O atendente tem `phone` cadastrado
4. O workspace tem instance conectada

## 📝 Response Example

Quando WhatsApp é enviado com sucesso:
```json
{
  "status": "success",
  "results": [
    {
      "id": "notif-123",
      "status": "sent",
      "sent": {
        "whatsapp": {
          "sent": true,
          "conversation_id": "conv-abc-123"
        }
      },
      "failed": {}
    }
  ]
}
```

O campo `conversation_id` identifica onde a mensagem foi salva.

## 🔮 Possíveis Melhorias Futuras

- [ ] Filtro dedicado para "Notificações Internas" na UI
- [ ] Badge visual diferenciado para conversas de notificação
- [ ] Opção de desabilitar rastreamento interno (config)
- [ ] Relatório de notificações enviadas por atendente
- [ ] Link direto da notificação para o contexto original

---

**Versão da Edge Function:** `v9-push`  
**Arquivo:** `/supabase/functions/send-notification/index.ts`  
**Última atualização:** Dezembro 2024
