# 🔍 ANÁLISE: Tool de Notificação na Edge Function AI

## 📊 SITUAÇÃO ATUAL

### 1. **Como as Tools Funcionam no Sistema**

A edge function `ai-process-conversation` busca as tools disponíveis através da RPC `get_agent_tools`:

```typescript
// Linha 735
const { data: tools } = await supabase.rpc("get_agent_tools", { p_agent_id: payload.agent_id });
```

Depois passa para o LLM:
```typescript
// Linha 815
if (tools && tools.length > 0) { 
  llmPayload.tools = tools; 
  llmPayload.tool_choice = "auto"; 
}
```

Quando o LLM chama uma tool:
```typescript
// Linha 838-848
if (assistantMessage.tool_calls?.length > 0) {
  for (const toolCall of assistantMessage.tool_calls) {
    const args = JSON.parse(toolCall.function.arguments);
    const result = await executeSystemTool(supabase, openrouterApiKey, toolCall.function.name, args, {...});
  }
}
```

### 2. **Tools Hardcoded Existentes**

Na função `executeSystemTool` (linha 424), existem apenas 3 tools:

```typescript
switch(toolName) {
  case "transferir_para_humano": { ... }
  case "finalizar_atendimento": { ... }
  case "atualizar_crm": { ... }
}
```

### 3. **Problema Identificado**

❌ **Não existe a tool `notificar_atendente` ou similar!**

Isso significa que mesmo que você defina uma tool no banco de dados através da RPC `get_agent_tools`, a função `executeSystemTool` **NÃO** tem um case para executar notificações.

---

## 🎯 PLANEJAMENTO DE SOLUÇÃO

### **OPÇÃO A: Adicionar Tool no Switch (Recomendado)**

**Vantagens:**
- ✅ Integração nativa com o fluxo existente
- ✅ Logs automáticos no pipeline
- ✅ Preview mode suportado
- ✅ Controle total sobre execução

**Implementação:**
1. Adicionar case `"notificar_atendente"` no `executeSystemTool`
2. Chamar edge function `send-notification` diretamente
3. Retornar resultado estruturado

**Código necessário:**
```typescript
case "notificar_atendente": {
  const stepStart = Date.now();
  
  // Validações
  if (!args.user_id || !args.title || !args.body) {
    return { 
      success: false, 
      message: "Parâmetros obrigatórios: user_id, title, body" 
    };
  }
  
  // Criar notificação no banco
  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      user_id: args.user_id,
      workspace_id: args.workspace_id,
      title: args.title,
      body: args.body,
      type: "manual",
      priority: args.priority || "normal",
      channels_requested: {
        push: true,
        email: args.send_email || false,
        whatsapp: args.send_whatsapp || false
      },
      reference_type: "conversation",
      reference_id: context.conversationId,
      metadata: {
        contact_name: args.contact_name || "Cliente",
        sent_by_ai: true,
        agent_id: context.agentId
      }
    })
    .select("id")
    .single();
  
  if (notifError) {
    await logger.step(
      "tool_notificar_atendente", 
      "Notificar Atendente", 
      "🔔", 
      "error", 
      "❌ Erro ao criar notificação",
      { preview_mode: isPreview },
      `Destinatário: ${args.user_id}`,
      args,
      null,
      null,
      0, 0,
      Date.now() - stepStart,
      notifError.message
    );
    return { 
      success: false, 
      message: `Erro ao criar notificação: ${notifError.message}` 
    };
  }
  
  // Enviar notificação (se não for preview)
  if (!isPreview) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    try {
      const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ notification_id: notification.id })
      });
      
      if (!sendResponse.ok) {
        throw new Error(`HTTP ${sendResponse.status}`);
      }
    } catch (sendError) {
      console.error("[Tool Notification] Send error:", sendError);
      // Não falhar - notificação será enviada em background
    }
  }
  
  await logger.step(
    "tool_notificar_atendente", 
    "Notificar Atendente", 
    "🔔", 
    "success", 
    `✅ Notificação ${isPreview ? "criada (preview)" : "enviada"}`,
    { 
      preview_mode: isPreview,
      channels: args.send_whatsapp ? "whatsapp" : "push"
    },
    `Para: ${args.user_id} | Título: ${args.title}`,
    args,
    isPreview ? "Notificação criada (preview)" : "Notificação enviada",
    { 
      notification_id: notification.id,
      sent: !isPreview 
    },
    0, 0,
    Date.now() - stepStart
  );
  
  return { 
    success: true, 
    result: { notification_id: notification.id },
    message: previewPrefix + `Notificação enviada para o atendente sobre: ${args.title}`
  };
}
```

---

### **OPÇÃO B: Criar Tool Dinâmica (Mais Complexo)**

**Vantagens:**
- ✅ Não precisa editar código para cada nova tool
- ✅ Tools podem ser criadas via interface

**Desvantagens:**
- ❌ Mais complexo de implementar
- ❌ Precisa de sistema de "executores" customizados
- ❌ Difícil de debugar

**Não recomendado para este caso.**

---

## 🗂️ ESTRUTURA DA TOOL NO BANCO

Para que a IA reconheça e use a tool, ela precisa estar cadastrada corretamente na função RPC `get_agent_tools`. 

**Exemplo de formato esperado (OpenAI Function Calling):**

```json
{
  "type": "function",
  "function": {
    "name": "notificar_atendente",
    "description": "Envia uma notificação urgente para um atendente humano quando você precisa alertá-lo sobre algo importante na conversa com o cliente. Use quando: o cliente solicitar falar com humano, houver uma reclamação grave, ou situação que exija atenção imediata de um atendente.",
    "parameters": {
      "type": "object",
      "properties": {
        "user_id": {
          "type": "string",
          "description": "ID do usuário atendente que deve receber a notificação. Obtenha da lista de atendentes disponíveis."
        },
        "title": {
          "type": "string",
          "description": "Título curto e direto da notificação (ex: 'Cliente solicita falar com humano')"
        },
        "body": {
          "type": "string",
          "description": "Corpo da mensagem explicando o motivo da notificação e contexto da conversa"
        },
        "priority": {
          "type": "string",
          "enum": ["low", "normal", "high", "urgent"],
          "description": "Nível de prioridade da notificação. Use 'urgent' para situações críticas."
        },
        "send_whatsapp": {
          "type": "boolean",
          "description": "Se true, envia também via WhatsApp além de notificação push"
        },
        "send_email": {
          "type": "boolean",
          "description": "Se true, envia também via email além de notificação push"
        }
      },
      "required": ["user_id", "title", "body"]
    }
  }
}
```

---

## 📝 MELHORIAS NO PROMPT DO AGENTE

### **❌ Prompt Ruim (Vago):**
```
Você pode notificar atendentes quando necessário.
```

### **✅ Prompt Bom (Específico):**
```
=== NOTIFICAÇÕES PARA ATENDENTES ===

Você tem acesso à ferramenta "notificar_atendente" para alertar humanos em situações específicas.

QUANDO USAR:
✅ Cliente solicita explicitamente falar com humano
✅ Reclamação grave que precisa atenção imediata
✅ Cliente está muito insatisfeito ou irritado
✅ Situação complexa que você não consegue resolver
✅ Cliente menciona cancelamento ou desistência
✅ Oportunidade de venda que precisa follow-up humano

QUANDO NÃO USAR:
❌ Para perguntas simples que você pode responder
❌ Para confirmar agendamentos (use finalizar_atendimento)
❌ Para atualizar CRM (use atualizar_crm)
❌ Como primeira resposta sem tentar resolver

COMO USAR:
1. Identifique o melhor atendente (se houver lista)
2. Escreva título claro e objetivo (max 50 caracteres)
3. No corpo, explique: motivo + resumo do que cliente disse + urgência
4. Defina prioridade correta:
   - "urgent": Cliente pediu humano, reclamação grave
   - "high": Cliente insatisfeito, situação delicada
   - "normal": Oportunidade de venda, follow-up
   - "low": Informativo, não urgente

EXEMPLO:
notificar_atendente({
  user_id: "abc-123",
  title: "Cliente solicita falar com gerente",
  body: "Cliente João Silva está insatisfeito com prazo de entrega e pediu para falar com responsável. Conversa iniciou às 14h30. Ele mencionou que precisa do produto até sexta-feira.",
  priority: "urgent",
  send_whatsapp: true
})

IMPORTANTE: Após notificar, SEMPRE confirme ao cliente que um atendente foi notificado e responderá em breve.
```

---

## 🎨 EXEMPLO DE USO NA CONVERSA

**Cliente:** "Olá, preciso falar com um atendente humano, é urgente!"

**IA (pensa):**
1. Cliente pediu humano explicitamente
2. Mencionou urgência
3. Devo notificar atendente e confirmar
4. Vou chamar a tool notificar_atendente

**IA (executa tool):**
```json
{
  "name": "notificar_atendente",
  "arguments": {
    "user_id": "user-abc-123",
    "title": "Cliente solicita atendimento urgente",
    "body": "Cliente pediu explicitamente para falar com atendente humano mencionando urgência. Aguardando resposta. Conversa iniciada às 15:42.",
    "priority": "urgent",
    "send_whatsapp": true
  }
}
```

**IA (responde ao cliente):**
"Entendi! Já notifiquei nosso time de atendimento sobre sua solicitação urgente. Um atendente humano irá te responder em instantes. Enquanto isso, posso ajudar com mais alguma informação?"

---

## ⚙️ CHECKLIST DE IMPLEMENTAÇÃO

### **1. Backend (Edge Function)**
- [ ] Adicionar case `"notificar_atendente"` em `executeSystemTool`
- [ ] Validar parâmetros obrigatórios
- [ ] Criar registro na tabela `notifications`
- [ ] Chamar edge function `send-notification`
- [ ] Adicionar logs no pipeline
- [ ] Tratar preview mode
- [ ] Retornar resultado estruturado

### **2. Banco de Dados (RPC get_agent_tools)**
- [ ] Criar/atualizar função `get_agent_tools`
- [ ] Retornar tool `notificar_atendente` com schema completo
- [ ] Definir parâmetros required e optional
- [ ] Adicionar descrições claras

### **3. Frontend (Prompt do Agente)**
- [ ] Atualizar system prompt com instruções claras
- [ ] Adicionar exemplos de uso
- [ ] Definir quando usar e quando não usar
- [ ] Explicar níveis de prioridade
- [ ] Testar no Preview Mode

### **4. Testes**
- [ ] Testar com cliente pedindo humano
- [ ] Testar com reclamação grave
- [ ] Testar com diferentes prioridades
- [ ] Verificar se notificação é enviada
- [ ] Confirmar mensagem aparece no sistema
- [ ] Validar preview mode (não envia de verdade)

---

## 🚨 PONTOS CRÍTICOS

### **1. Lista de Atendentes**
❓ Como a IA vai saber qual `user_id` usar?

**Opções:**
- **A)** Adicionar no system prompt uma lista fixa de IDs
  ```
  Atendentes disponíveis:
  - João (user-abc-123): Vendas
  - Maria (user-def-456): Suporte técnico
  - Pedro (user-ghi-789): Gerente
  ```

- **B)** Criar outra tool `listar_atendentes_disponiveis` que retorna a lista
  
- **C)** Usar sempre um ID genérico que dispara para "atendente de plantão"

**Recomendação:** Começar com opção A (mais simples) e evoluir para B se necessário.

### **2. Workspace ID**
A tool precisa saber o workspace_id para criar a notificação. 

**Solução:** Pegar do `context` que já é passado para `executeSystemTool`:
```typescript
workspace_id: agent.workspace_id, // precisa adicionar ao context
```

### **3. Preview Mode**
No preview, a notificação deve ser criada mas NÃO enviada.

**Solução:** Já implementado no código acima com `if (!isPreview)`.

---

## 📊 FLUXO COMPLETO

```
1. Cliente envia mensagem
   ↓
2. Edge function ai-process-conversation é chamada
   ↓
3. Busca tools disponíveis (RPC get_agent_tools)
   ↓
4. LLM recebe tools + prompt + histórico
   ↓
5. LLM decide chamar "notificar_atendente"
   ↓
6. executeSystemTool é chamado
   ↓
7. Cria registro em "notifications"
   ↓
8. Chama edge function "send-notification"
   ↓
9. send-notification envia WhatsApp + Cria conversa interna
   ↓
10. Retorna sucesso para a IA
   ↓
11. IA confirma ao cliente que atendente foi notificado
```

---

## 🎯 DECISÕES NECESSÁRIAS

### **Antes de implementar, precisamos decidir:**

1. **Como a IA vai saber qual atendente notificar?**
   - [ ] Lista fixa no prompt
   - [ ] Tool adicional de listagem
   - [ ] ID genérico "plantão"

2. **Quais canais habilitar por padrão?**
   - [ ] Sempre Push + WhatsApp
   - [ ] Apenas Push (mais discreto)
   - [ ] IA decide baseado em urgência

3. **Prioridade padrão?**
   - [ ] Sempre "urgent" (garante atenção)
   - [ ] "high" (mais equilibrado)
   - [ ] IA decide baseado em contexto

4. **Confirmar ao cliente?**
   - [ ] Sim, sempre confirmar que notificou
   - [ ] Apenas se cliente pediu humano
   - [ ] IA decide quando mencionar

5. **Limite de notificações?**
   - [ ] Máximo 1 por conversa
   - [ ] Máximo 3 por conversa
   - [ ] Sem limite (pode spammar)

---

## 💡 RECOMENDAÇÃO FINAL

**Abordagem Gradual:**

### **FASE 1 - MVP (Mais Simples):**
✅ Adicionar tool com ID fixo de atendente
✅ Sempre envia Push + WhatsApp
✅ Prioridade sempre "high"
✅ Prompt explica quando usar
✅ Preview mode não envia

### **FASE 2 - Melhorias:**
✅ Lista de atendentes no prompt
✅ IA escolhe prioridade
✅ Logs detalhados
✅ Dashboard de notificações

### **FASE 3 - Avançado:**
✅ Tool de listar atendentes
✅ Seleção inteligente de atendente
✅ Análise de disponibilidade
✅ Métricas de resposta

---

**📌 PRÓXIMOS PASSOS:**
1. Decidir opções acima
2. Implementar case no executeSystemTool
3. Criar/atualizar RPC get_agent_tools
4. Atualizar prompt do agente
5. Testar no Preview Mode
6. Deploy e monitoramento

---

**Documentação criada em:** Dezembro 2024
**Versão da Edge Function:** v39
