# 🧪 Teste Rápido: Chat de Preview com Logs

## ✅ Tudo Já Está Implementado!

Não precisa criar nada. Tudo funciona:
- ✅ Hook `useAIBuilderChat.ts`
- ✅ Componente `PipelineLogsViewer.tsx`
- ✅ Integração em `AIServiceView.tsx`

## 🚀 Como Testar AGORA (3 minutos)

### Passo 1: Abrir AI Builder
1. Iniciar aplicação
2. Fazer login
3. Ir para **"Agentes de IA"** no menu lateral
4. Selecionar qualquer agente (ou criar um novo)

### Passo 2: Abrir Console (F12)
Pressione **F12** no navegador para ver os logs

### Passo 3: Enviar Mensagem
No chat de preview (lado direito da tela):
1. Digite: `"Olá"`
2. Pressione **Enter**

### Passo 4: Verificar Logs no Console
Você DEVE ver esses 3 logs:

```javascript
✅ [useAIBuilderChat] Enviando para API: { agentId: "...", messageLength: 4 }

✅ [useAIBuilderChat] Resposta recebida: { 
  replyLength: 97, 
  tokensUsed: 736, 
  pipelineId: "e325b10a-...",
  hasPipeline: true,        // <-- DEVE SER true
  pipelineStepsCount: 7     // <-- DEVE SER 7
}

✅ [useAIBuilderChat] ✅ Pipeline data received: { 
  id: "e325b10a-...", 
  status: "success", 
  steps: 7 
}
```

**Se aparecer `⚠️ No pipeline data in response`**: Problema na API

### Passo 5: Verificar UI
Na mensagem da IA (cinza, esquerda), você deve ver:

**Abaixo do texto da resposta**:
```
🤖 gpt-4.1-mini | 🎫 736 tokens | ⏱️ 4.3s | 📚 RAG
```

**Logo abaixo**:
```
┌────────────────────────────────────────┐
│ 🔍 Pipeline de Processamento  ✓ 7/7   │  ← Clique aqui!
│    ⏱️ 4282ms | 🎫 736 tokens          │
└────────────────────────────────────────┘
```

### Passo 6: Expandir Pipeline
Clique no header **"Pipeline de Processamento"**

Deve expandir e mostrar **7 steps**:

```
1. ⚙️  Configuração Inicial      ✓ success
2. 📨 Agrupamento de Mensagens   ✓ success
3. 🛡️  Validação de Segurança    ✓ success
4. 🧠 Orquestrador              ⊘ skipped
5. 📚 Base de Conhecimento      ✗ error   ← Pode ter erro (normal se RAG não configurado)
6. 🤖 Geração de Resposta        ✓ success
7. 💾 Salvar Resposta (Preview)  ✓ success
```

### Passo 7: Ver Detalhes
Clique em qualquer step (ex: **"🤖 Geração de Resposta"**)

Deve expandir e mostrar:
```
Input:  Prompt: 355 chars | Histórico: 3 msgs
Output: Resposta com 97 caracteres
Tokens: 710 in → 26 out = 736 total
```

## ✅ O Que Significa Sucesso?

### Console (F12):
- ✅ `hasPipeline: true`
- ✅ `pipelineStepsCount: 7`
- ✅ `✅ Pipeline data received`

### UI:
- ✅ Dropdown "Pipeline de Processamento" aparece
- ✅ Mostra "✓ 7/7" ou "✓ 6/7" (se algum step falhou)
- ✅ Ao clicar, expande e mostra 7 linhas
- ✅ Cada linha tem ícone + nome + status
- ✅ Clique em uma linha mostra detalhes

## ❌ Troubleshooting

### Problema 1: `⚠️ No pipeline data in response`

**Causa**: API não retornou `pipeline` na resposta

**Solução**:
1. Verificar se Edge Function `ai-preview-chat` existe
2. Verificar logs da função:
   ```bash
   supabase functions logs ai-preview-chat --tail
   ```
3. Procurar por `get_pipeline_with_steps` nos logs
4. Se não aparecer, RPC não foi chamada

### Problema 2: Dropdown não aparece

**Causa**: Dados chegaram mas componente não renderiza

**Solução**:
1. Verificar no console se `message.metadata.pipeline` existe:
   ```javascript
   // No console (F12)
   const messages = document.querySelectorAll('.group');
   console.log('Total mensagens:', messages.length);
   ```
2. Verificar se há erro no React DevTools

### Problema 3: Steps não expandem

**Causa**: Evento de clique não está funcionando

**Solução**:
1. Verificar se `cursor: pointer` aparece ao hover
2. Inspecionar elemento no DevTools
3. Ver se há erros de JavaScript no console

### Problema 4: API retorna erro 400

**Causa**: `agentId` não está sendo enviado

**Solução**:
1. Verificar se agente está selecionado na UI
2. Checar se `agentId` não é `null`:
   ```javascript
   console.log('AgentId:', window.location.href);
   // Deve ter algo como /ai-agents/abc123-...
   ```

### Problema 5: API retorna erro 500

**Causa**: Erro interno na Edge Function

**Solução**:
1. Ver logs da Edge Function:
   ```bash
   supabase functions logs ai-preview-chat --tail
   supabase functions logs ai-process-conversation --tail
   ```
2. Procurar por erros relacionados a:
   - `log_pipeline_start`
   - `log_pipeline_step`
   - `log_pipeline_complete`
   - `get_pipeline_with_steps`

## 🔍 Debug Avançado

### Ver estrutura completa do pipeline no console:

```javascript
// No console do navegador, após enviar mensagem
const lastMessage = document.querySelectorAll('.group');
const lastAIMessage = lastMessage[lastMessage.length - 1];

// Expandir no console para ver tudo
console.log('Pipeline completo:', lastAIMessage);
```

### Forçar renderização:

```javascript
// Se suspeitar que é problema de state/render
// Envie outra mensagem ou use React DevTools
```

### Verificar RPCs no banco:

```sql
-- No SQL Editor do Supabase
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'log_pipeline%' OR routine_name = 'get_pipeline_with_steps';

-- Deve retornar 4 linhas:
-- log_pipeline_start
-- log_pipeline_step
-- log_pipeline_complete
-- get_pipeline_with_steps
```

### Testar RPC manualmente:

```sql
-- No SQL Editor, pegar último pipeline
SELECT get_pipeline_with_steps(
  (SELECT id FROM ai_pipeline_logs ORDER BY created_at DESC LIMIT 1)
);

-- Deve retornar JSON com steps
```

## 📊 Exemplo de Resposta Completa

```json
{
  "success": true,
  "reply": "Olá! Claro, estou aqui para ajudar. Como posso auxiliar você hoje?",
  "conversationId": "abc-123",
  "userMessageId": "def-456",
  "aiMessageId": "ghi-789",
  "pipelineId": "e325b10a-c1a5-44b5-a4d3-554a8266003a",
  "tokensUsed": 736,
  "durationMs": 6560,
  "aiProcessingMs": 4282,
  "metadata": {
    "ragUsed": true,
    "specialistUsed": null,
    "guardrailPassed": true,
    "previewMode": true
  },
  "pipeline": {
    "id": "e325b10a-c1a5-44b5-a4d3-554a8266003a",
    "status": "success",
    "statusMessage": "[PREVIEW] ✅ Preview concluído",
    "startedAt": "2025-11-29T14:45:03.156902+00:00",
    "completedAt": "2025-11-29T14:45:07.438937+00:00",
    "totalDurationMs": 4282,
    "totalTokensUsed": 736,
    "totalCostEstimate": 0,
    "stepsCompleted": 7,
    "responseSent": false,
    "errorMessage": null,
    "errorStep": null,
    "steps": [
      {
        "number": 1,
        "key": "setup",
        "name": "Configuração Inicial",
        "icon": "⚙️",
        "status": "success",
        "statusMessage": "[PREVIEW] ✅ Configuração carregada",
        "inputSummary": "Agente: Assistente | Modelo: gpt-4.1-mini",
        "outputSummary": "RAG: ✅ | Orquestrador: ❌",
        "durationMs": null,
        "tokensTotal": 0
      },
      {
        "number": 2,
        "key": "debouncer",
        "name": "Agrupamento de Mensagens",
        "icon": "📨",
        "status": "success",
        "statusMessage": "[PREVIEW] 📨 1 mensagem(ns) recebida(s)",
        "inputSummary": "1 mensagem(ns) do cliente",
        "outputSummary": "Mensagens prontas para processamento",
        "durationMs": null,
        "tokensTotal": 0
      },
      {
        "number": 3,
        "key": "guardrail",
        "name": "Validação de Segurança",
        "icon": "🛡️",
        "status": "success",
        "statusMessage": "[PREVIEW] ✅ Mensagem aprovada",
        "inputSummary": "Mensagem: Tudo bem? Pode me ajudar?",
        "outputSummary": "Todas as validações passaram",
        "durationMs": 44,
        "tokensTotal": 0
      },
      {
        "number": 4,
        "key": "orchestrator",
        "name": "Orquestrador",
        "icon": "🧠",
        "status": "skipped",
        "statusMessage": "[PREVIEW] ℹ️ Orquestrador desabilitado",
        "outputSummary": "Feature desabilitada nas configurações do agente",
        "durationMs": null,
        "tokensTotal": 0
      },
      {
        "number": 5,
        "key": "rag",
        "name": "Base de Conhecimento (RAG)",
        "icon": "📚",
        "status": "error",
        "statusMessage": "[PREVIEW] ❌ Erro na busca",
        "inputSummary": "Busca: Tudo bem? Pode me ajudar?",
        "outputSummary": "Falha na API do Gemini",
        "durationMs": 936,
        "tokensTotal": 0,
        "errorMessage": "Invalid JSON payload received. Unknown name \"retrieval\""
      },
      {
        "number": 6,
        "key": "llm",
        "name": "Geração de Resposta",
        "icon": "🤖",
        "status": "success",
        "statusMessage": "[PREVIEW] ✍️ Resposta gerada (736 tokens)",
        "inputSummary": "Prompt: 355 chars | Histórico: 3 msgs",
        "outputSummary": "Resposta com 97 caracteres",
        "durationMs": 2296,
        "tokensInput": 710,
        "tokensOutput": 26,
        "tokensTotal": 736
      },
      {
        "number": 7,
        "key": "preview_save",
        "name": "Salvar Resposta (Preview)",
        "icon": "💾",
        "status": "success",
        "statusMessage": "[PREVIEW] ✅ Mensagem salva no banco",
        "inputSummary": "Mensagem com 97 caracteres",
        "outputSummary": "Salvo com sucesso",
        "durationMs": 83,
        "tokensTotal": 0
      }
    ]
  }
}
```

## ✅ Resumo

### O que fazer:
1. Abrir AI Builder
2. Abrir console (F12)
3. Enviar mensagem `"Olá"`
4. Verificar logs no console
5. Clicar em "Pipeline de Processamento"
6. Ver 7 steps expandirem

### O que NÃO fazer:
- ❌ Criar novos componentes
- ❌ Modificar Edge Functions
- ❌ Criar RPCs no banco
- ❌ Modificar tipos TypeScript

### Status:
✅ **TUDO PRONTO - SÓ TESTAR!**

---

**Tempo estimado**: 3 minutos  
**Dificuldade**: Muito fácil  
**Resultado esperado**: Dropdown com 7 steps expandindo
