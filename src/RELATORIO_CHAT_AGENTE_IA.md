# Relatório Técnico: Sistema de Chat para Teste de Agentes de IA

## 📋 Visão Geral

O sistema **Pesca Lead** possui um chat de pré-visualização integrado na página de Agentes de IA (`AIServiceView.tsx`) que permite testar conversas com os agentes configurados. Atualmente, o chat possui toda a interface visual e lógica de gerenciamento de mensagens funcionando, **MAS NÃO ESTÁ CONECTADO COM A IA** - é apenas um chat "mock" que armazena mensagens localmente sem processar respostas automáticas.

---

## 🏗️ Arquitetura Atual

### 1. Componentes Principais

#### **AIServiceView.tsx** (Componente Pai)
- Renderiza a tela completa de Agentes de IA
- Possui um painel resizável com 3 seções:
  - Lista de agentes (esquerda)
  - Formulário de configuração (centro)
  - Chat de teste (direita)
- Gerencia o estado do agente selecionado

#### **AIBuilderChatIntegrated** (Componente do Chat - linha 321)
```tsx
function AIBuilderChatIntegrated({
  conversation,
  isDark,
  onSendMessage,
  onDeleteMessage,
  onResetChat,
  agentId
}: AIBuilderChatIntegradoProps)
```

**Props recebidas:**
- `conversation`: Objeto com array de mensagens
- `isDark`: Modo escuro/claro
- `onSendMessage`: Callback para enviar mensagem
- `onDeleteMessage`: Callback para deletar mensagem
- `onResetChat`: Callback para resetar chat
- `agentId`: ID do agente atual (CRÍTICO para integração)

### 2. Hook de Gerenciamento: useAIBuilderChat

```tsx
const {
  conversation,
  handleSendMessage,
  handleDeleteMessage,
  handleResetChat
} = useAIBuilderChat(selectedAgentId);
```

**Localização:** `/hooks/useAIBuilderChat.ts` (precisa ser verificado/criado)

**Responsabilidades ATUAIS:**
- ✅ Armazena mensagens em estado local
- ✅ Adiciona novas mensagens ao array
- ✅ Remove mensagens
- ✅ Reseta conversa
- ❌ **NÃO processa respostas da IA**
- ❌ **NÃO se comunica com backend**
- ❌ **NÃO usa configurações do agente**

---

## 💬 Fluxo Atual de Mensagens

### Quando o usuário envia uma mensagem:

1. **Input do usuário** → Digita texto e pressiona Enter ou clica no botão enviar
2. **handleSendMessage()** → Chamado com `{ text: "mensagem", contentType: "text" }`
3. **Hook adiciona mensagem** → Cria objeto:
   ```tsx
   {
     id: uuid(),
     type: 'sent',
     text: "mensagem do usuário",
     timestamp: new Date()
   }
   ```
4. **Mensagem renderizada** → Aparece na tela (bolha azul à direita)
5. **❌ NADA ACONTECE** → Não há resposta automática da IA

### Estrutura das Mensagens

```typescript
interface Message {
  id: string;           // UUID único
  type: 'sent' | 'received';  // 'sent' = usuário, 'received' = IA
  text: string;         // Conteúdo da mensagem
  timestamp: Date;      // Quando foi enviada
}

interface Conversation {
  id: string;
  messages: Message[];
}
```

---

## 🔴 O Que Está Faltando

### 1. Integração com Backend/IA

**Problema:** O chat não se comunica com nenhum serviço de IA.

**O que precisa ser implementado:**
- Criar endpoint no servidor Supabase Edge Function
- Enviar mensagens do usuário para o backend
- Backend deve processar com o modelo de IA configurado
- Retornar resposta e adicionar como mensagem 'received'

### 2. Uso das Configurações do Agente

**Problema:** O agentId é passado mas não é usado para buscar configurações.

**O que o agente possui (tabela `ai_agents`):**
```sql
- id (uuid)
- name (varchar)
- instructions (text)  -- Prompt/personalidade do agente
- model (varchar)      -- Ex: "gpt-4", "claude-3-5-sonnet"
- temperature (numeric)
- max_tokens (integer)
- knowledge_base (text)
- tools_config (jsonb)
- active (boolean)
```

**O que precisa acontecer:**
- Buscar configuração do agente pelo `agentId`
- Usar `instructions` como system prompt
- Usar `model` para escolher qual IA chamar
- Aplicar `temperature` e `max_tokens`
- Incluir `knowledge_base` no contexto

### 3. Gerenciamento de Histórico

**Problema:** Cada conversa é perdida ao recarregar a página.

**O que poderia ser implementado (opcional):**
- Salvar conversas no Supabase (tabela `chat_sessions`)
- Permitir retomar conversas anteriores
- Manter histórico de testes

---

## ✅ Solução Proposta

### Passo 1: Verificar/Criar Hook useAIBuilderChat

**Arquivo:** `/hooks/useAIBuilderChat.ts`

```typescript
import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';

interface Message {
  id: string;
  type: 'sent' | 'received';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface Conversation {
  id: string;
  messages: Message[];
}

export function useAIBuilderChat(agentId: string | null) {
  const [conversation, setConversation] = useState<Conversation>({
    id: uuid(),
    messages: []
  });

  const handleSendMessage = useCallback(async (payload: { text: string; contentType: string }) => {
    if (!agentId) {
      console.error('[useAIBuilderChat] No agentId provided');
      return;
    }

    // 1. Adicionar mensagem do usuário
    const userMessage: Message = {
      id: uuid(),
      type: 'sent',
      text: payload.text,
      timestamp: new Date()
    };

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));

    // 2. Adicionar mensagem de loading
    const loadingId = uuid();
    const loadingMessage: Message = {
      id: loadingId,
      type: 'received',
      text: '...',
      timestamp: new Date(),
      isLoading: true
    };

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, loadingMessage]
    }));

    // 3. ⚠️ AQUI ESTÁ O PROBLEMA - PRECISA CHAMAR A IA
    try {
      // TODO: Implementar chamada para backend
      const response = await callAIAgent(agentId, payload.text, conversation.messages);
      
      // 4. Substituir loading pela resposta real
      setConversation(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === loadingId 
            ? { ...msg, text: response, isLoading: false }
            : msg
        )
      }));
    } catch (error) {
      console.error('[useAIBuilderChat] Error calling AI:', error);
      
      // Remover loading e mostrar erro
      setConversation(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === loadingId 
            ? { ...msg, text: '❌ Erro ao processar resposta', isLoading: false }
            : msg
        )
      }));
    }
  }, [agentId, conversation.messages]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setConversation(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== messageId)
    }));
  }, []);

  const handleResetChat = useCallback(() => {
    setConversation({
      id: uuid(),
      messages: []
    });
  }, []);

  return {
    conversation,
    handleSendMessage,
    handleDeleteMessage,
    handleResetChat
  };
}

// ⚠️ FUNÇÃO QUE PRECISA SER IMPLEMENTADA
async function callAIAgent(
  agentId: string, 
  userMessage: string, 
  conversationHistory: Message[]
): Promise<string> {
  // TODO: Implementar integração com IA
  throw new Error('Not implemented');
}
```

### Passo 2: Criar Endpoint no Backend

**Arquivo:** `/supabase/functions/server/ai-chat.ts`

```typescript
import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

app.post('/make-server-e4f9d774/ai-chat', async (c) => {
  try {
    const { agentId, message, history } = await c.req.json();

    // 1. Buscar configuração do agente
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    // 2. Preparar contexto
    const systemPrompt = agent.instructions || 'Você é um assistente prestativo.';
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg: any) => ({
        role: msg.type === 'sent' ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    // 3. Chamar IA (OpenRouter/OpenAI)
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model || 'openai/gpt-4o-mini',
        messages: messages,
        temperature: agent.temperature || 0.7,
        max_tokens: agent.max_tokens || 1000
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices[0].message.content;

    return c.json({ reply });

  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return c.json({ 
      error: 'Failed to process message',
      details: error.message 
    }, 500);
  }
});

export default app;
```

### Passo 3: Implementar callAIAgent no Frontend

```typescript
async function callAIAgent(
  agentId: string, 
  userMessage: string, 
  conversationHistory: Message[]
): Promise<string> {
  const { projectId, publicAnonKey } = await import('../utils/supabase/info.tsx');
  
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774/ai-chat`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentId,
        message: userMessage,
        history: conversationHistory
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || 'Failed to get AI response');
  }

  const data = await response.json();
  return data.reply;
}
```

### Passo 4: Adicionar Variável de Ambiente

**O usuário precisa adicionar:**
```
OPENROUTER_API_KEY=sk-or-v1-...
```

---

## 🔑 Pontos Críticos

### 1. O agentId PRECISA ser válido
- Verificar se está sendo passado corretamente de `AIServiceView` para o hook
- Garantir que existe um agente selecionado antes de permitir chat

### 2. Modelo de IA deve estar configurado
- O campo `model` na tabela `ai_agents` deve ter valor válido
- Ex: "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"

### 3. API Key é necessária
- OpenRouter API Key deve estar configurada
- Alternativa: usar outra API (OpenAI, Anthropic direto)

### 4. Histórico de contexto
- O array `history` no backend garante que a IA lembre da conversa
- Sem isso, cada mensagem seria independente

---

## 📊 Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuário digita "Olá"                                   │
│      ↓                                                      │
│  2. handleSendMessage() chamado                            │
│      ↓                                                      │
│  3. Adiciona mensagem 'sent' ao estado                     │
│      ↓                                                      │
│  4. Adiciona mensagem 'received' com "..." (loading)       │
│      ↓                                                      │
│  5. callAIAgent(agentId, "Olá", [...history])             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP POST
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Supabase Edge Function)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  6. Recebe { agentId, message, history }                   │
│      ↓                                                      │
│  7. Busca agente no Supabase:                              │
│     SELECT * FROM ai_agents WHERE id = agentId             │
│      ↓                                                      │
│  8. Monta array de mensagens:                              │
│     [                                                       │
│       { role: 'system', content: agent.instructions },     │
│       { role: 'user', content: 'Olá' }                     │
│     ]                                                       │
│      ↓                                                      │
│  9. Chama OpenRouter API                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP POST
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  OPENROUTER API                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  10. Processa com modelo escolhido (GPT-4, Claude, etc)    │
│      ↓                                                      │
│  11. Retorna resposta: "Olá! Como posso ajudar?"          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ JSON Response
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  12. Extrai reply do response                              │
│      ↓                                                      │
│  13. Retorna { reply: "Olá! Como posso ajudar?" }         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ JSON Response
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  14. Recebe resposta da IA                                 │
│      ↓                                                      │
│  15. Substitui mensagem de loading pela resposta real      │
│      ↓                                                      │
│  16. Usuário vê: "Olá! Como posso ajudar?" (cinza)        │
│                                                             │
└──────────���──────────────────────────────────────────────────┘
```

---

## 🎯 Checklist de Implementação

- [ ] 1. Verificar se `/hooks/useAIBuilderChat.ts` existe
- [ ] 2. Se não existir, criar com código fornecido acima
- [ ] 3. Implementar função `callAIAgent` no hook
- [ ] 4. Criar arquivo `/supabase/functions/server/ai-chat.ts`
- [ ] 5. Registrar rota no servidor principal (`index.tsx`)
- [ ] 6. Adicionar variável `OPENROUTER_API_KEY` no Supabase
- [ ] 7. Testar com um agente configurado
- [ ] 8. Adicionar indicador visual de "digitando..."
- [ ] 9. Tratar erros de API (mostrar mensagem amigável)
- [ ] 10. (Opcional) Salvar histórico no banco

---

## 🚨 Possíveis Problemas

### Problema 1: "Agent not found"
**Causa:** agentId inválido ou agente não existe no banco
**Solução:** Verificar se o agente foi salvo corretamente

### Problema 2: "AI API error: 401"
**Causa:** API Key inválida ou não configurada
**Solução:** Verificar `OPENROUTER_API_KEY` no Supabase Dashboard

### Problema 3: Resposta vazia ou erro 500
**Causa:** Modelo inválido no campo `model`
**Solução:** Garantir que o modelo existe no OpenRouter (ex: "openai/gpt-4o-mini")

### Problema 4: Chat não envia mensagem
**Causa:** agentId é null
**Solução:** Verificar se há um agente selecionado antes de abrir o chat

---

## 📝 Notas Finais

- O chat atual é **100% funcional visualmente**
- A **única coisa faltando é a chamada para IA**
- A estrutura está bem organizada e pronta para receber a integração
- Após implementar, o fluxo será: Usuário → Hook → Backend → IA → Backend → Hook → Usuário

**Próximo passo:** Implementar os 3 componentes descritos acima (hook completo, endpoint backend, função callAIAgent).
