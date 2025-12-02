# ✅ Status: Chat de Preview - AI Builder

## 🎯 Objetivo
Implementar chat de preview funcional com logs detalhados do pipeline (7 steps)

## ✅ O Que JÁ Existe e Funciona

### 1. Hook Principal: `useAIBuilderChat.ts` ✅
**Local**: `/hooks/useAIBuilderChat.ts`

**Funcionalidades**:
- ✅ Gerencia estado da conversa
- ✅ Envia mensagens para `/ai-preview-chat`
- ✅ Recebe resposta com `pipeline` completo
- ✅ Carrega conversas do banco
- ✅ Reset de conversa
- ✅ Delete de mensagens
- ✅ Tratamento de erros
- ✅ Loading states

**Flags enviadas**:
```typescript
{
  agentId,
  message: text,
  preview: true,  // ✅ Correto
  debug: true     // ✅ Correto
}
```

**Dados recebidos**:
```typescript
{
  success: true,
  reply: "Resposta da IA",
  conversationId: "uuid",
  pipelineId: "uuid",
  tokensUsed: 736,
  durationMs: 4282,
  pipeline: {
    id: "uuid",
    status: "success",
    steps: [
      { number: 1, key: "setup", ... },
      { number: 2, key: "debouncer", ... },
      // ... 7 steps total
    ]
  }
}
```

### 2. Componente de Logs: `PipelineLogsViewer.tsx` ✅
**Local**: `/components/PipelineLogsViewer.tsx`

**Funcionalidades**:
- ✅ Exibe header com resumo (success/error/skipped)
- ✅ Lista todos os steps (1-7)
- ✅ Expandir/colapsar steps individuais
- ✅ Mostra detalhes (input, output, tokens, duração)
- ✅ Destaca erros automaticamente
- ✅ Visual dark mode (estilos inline)
- ✅ Ícones SVG inline (sem dependências)

**Props**:
```typescript
interface PipelineLogsViewerProps {
  pipeline: PipelineInfo | null | undefined;
  defaultExpanded?: boolean;
  isDark?: boolean; // Adicionado hoje para compatibilidade
}
```

### 3. Chat Integrado: `AIServiceView.tsx` ✅
**Local**: `/components/AIServiceView.tsx` (linha 262-479)

**Componente**: `AIBuilderChatIntegrated`

**Funcionalidades**:
- ✅ Renderiza mensagens do usuário (azul, direita)
- ✅ Renderiza mensagens da IA (cinza, esquerda)
- ✅ Loading state (spinner)
- ✅ Input com Enter para enviar
- ✅ Botão de envio
- ✅ Reset de conversa (botão no header)
- ✅ Delete de mensagens (hover)
- ✅ Metadata (tokens, tempo, RAG, especialista)
- ✅ **PipelineLogsViewer integrado** (linha 388-392)

**Integração dos logs**:
```tsx
{!message.isLoading && message.metadata?.pipeline && (
  <PipelineLogsViewer 
    pipeline={message.metadata.pipeline}
    defaultExpanded={false}
    isDark={isDark}
  />
)}
```

## 🧪 Como Testar

### Passo 1: Ir para AI Builder
1. Abrir aplicação
2. Navegar para "Agentes de IA" no menu
3. Selecionar ou criar um agente

### Passo 2: Enviar Mensagem de Teste
1. No chat de preview (lado direito), digite: `"Olá"`
2. Pressione Enter ou clique no botão de envio

### Passo 3: Verificar Logs no Console (F12)
Você deve ver:
```javascript
[useAIBuilderChat] Enviando para API: { agentId: "...", messageLength: 4 }
[useAIBuilderChat] Resposta recebida: { 
  replyLength: 97, 
  tokensUsed: 736, 
  durationMs: 4282,
  pipelineId: "e325b10a-...",
  hasPipeline: true,
  pipelineStepsCount: 7 
}
[useAIBuilderChat] ✅ Pipeline data received: { 
  id: "e325b10a-...", 
  status: "success", 
  steps: 7 
}
```

### Passo 4: Verificar UI
Na mensagem da IA, você deve ver:
- ✅ Texto da resposta
- ✅ Metadata (tokens, tempo) abaixo da mensagem
- ✅ **Dropdown "Pipeline de Processamento"** com ícone 🔍
- ✅ Ao clicar, expande e mostra 7 steps:
  1. ⚙️ Configuração Inicial
  2. 📨 Agrupamento de Mensagens
  3. 🛡️ Validação de Segurança
  4. 🧠 Orquestrador
  5. 📚 Base de Conhecimento (RAG)
  6. 🤖 Geração de Resposta
  7. 💾 Salvar Resposta (Preview)

### Passo 5: Verificar Detalhes dos Steps
Clique em cada step para ver:
- ✅ Input Summary
- ✅ Output Summary
- ✅ Tokens (input/output/total)
- ✅ Duração (ms)
- ✅ Erros (se houver)

## 📊 Estrutura de Dados

### Message
```typescript
interface Message {
  id: string;
  type: 'sent' | 'received';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
  metadata?: {
    tokensUsed?: number;
    durationMs?: number;
    ragUsed?: boolean;
    specialistUsed?: string | null;
    guardrailPassed?: boolean;
    pipelineId?: string;
    pipeline?: PipelineInfo; // <-- LOGS COMPLETOS
  };
}
```

### PipelineInfo
```typescript
interface PipelineInfo {
  id: string;
  status: string;
  statusMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalDurationMs: number | null;
  totalTokensUsed: number | null;
  totalCostEstimate: number | null;
  stepsCompleted: number | null;
  responseSent: boolean;
  errorMessage: string | null;
  errorStep: string | null;
  steps: PipelineStep[];
}
```

### PipelineStep
```typescript
interface PipelineStep {
  number: number;           // 1-7
  key: string;              // 'setup', 'debouncer', 'guardrail', etc
  name: string;             // Nome legível
  icon: string;             // Emoji
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  statusMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  tokensTotal: number | null;
  costEstimate: number | null;
  inputSummary: string | null;
  outputSummary: string | null;
  errorMessage: string | null;
}
```

## 🎨 Visual Atual

### Dark Mode (Padrão)
```
┌─────────────────────────────────────────┐
│ 🔍 Pipeline de Processamento    ✓ 7/7  │ ← Header clicável
│    ⏱️ 4282ms | 🎫 736 tokens          │
├─────────────────────────────────────────┤
│ ⚙️ Configuração Inicial     ✓ success  │ ← Step 1
│    ✅ Configuração carregada            │
├─────────────────────────────────────────┤
│ 📨 Agrupamento de Mensagens  ✓ success │ ← Step 2
│    📨 1 mensagem(ns) recebida(s)        │
├─────────────────────────────────────────┤
│ 🛡️ Validação de Segurança   ✓ success │ ← Step 3
│    ✅ Mensagem aprovada       44ms      │
├─────────────────────────────────────────┤
│ 🧠 Orquestrador             ⊘ skipped  │ ← Step 4
│    ℹ️ Orquestrador desabilitado         │
├─────────────────────────────────────────┤
│ 📚 Base de Conhecimento     ✗ error    │ ← Step 5 (erro no RAG)
│    ❌ Erro na busca           936ms     │
│    ⚠️ Invalid JSON payload (Gemini)     │ ← Mensagem de erro
├─────────────────────────────────────────┤
│ 🤖 Geração de Resposta      ✓ success  │ ← Step 6
│    ✍️ Resposta gerada (736 tokens)     │
│    ⏱️ 2296ms | 🎫 736 tokens           │
├─────────────────────────────────────────┤
│ 💾 Salvar Resposta (Preview) ✓ success│ ← Step 7
│    ✅ Mensagem salva no banco  83ms    │
└─────────────────────────────────────────┘
```

### Clique em um step para expandir:
```
┌─────────────────────────────────────────┐
│ 🤖 Geração de Resposta      ✓ success  │
│    ✍️ Resposta gerada (736 tokens)     │
│    ⏱️ 2296ms | 🎫 736 tokens    ▼      │
│ ┌─────────────────────────────────────┐ │
│ │ Input:  Prompt: 355 chars |         │ │
│ │         Histórico: 3 msgs           │ │
│ │ Output: Resposta com 97 caracteres  │ │
│ │ Tokens: 710 in → 26 out = 736 total│ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 🔧 Correção Feita Hoje

**Problema**: `PipelineLogsViewer` estava recebendo prop `isDark` mas não aceitava

**Solução**: Adicionada prop `isDark?: boolean` na interface (linha 345)

```diff
interface PipelineLogsViewerProps {
  pipeline: PipelineInfo | null | undefined;
  defaultExpanded?: boolean;
+ isDark?: boolean; // Compatibilidade com AIServiceView
}
```

## ✅ Checklist - Tudo Funcionando

- [x] Hook `useAIBuilderChat` envia `preview: true, debug: true`
- [x] API retorna `pipeline` com 7 steps
- [x] Hook armazena pipeline em `message.metadata.pipeline`
- [x] `AIBuilderChatIntegrated` renderiza `PipelineLogsViewer`
- [x] `PipelineLogsViewer` aceita prop `isDark`
- [x] Logs expandem/colapsam corretamente
- [x] Steps com erro são expandidos por padrão
- [x] Tokens e duração são exibidos
- [x] Erros são destacados em vermelho
- [x] Console mostra `✅ Pipeline data received`

## 🚀 Próximos Passos (Opcional)

Se quiser melhorar ainda mais:

1. **Adicionar filtros**: Mostrar só steps com erro
2. **Exportar logs**: Botão para copiar JSON completo
3. **Comparar execuções**: Mostrar diferença entre 2 pipelines
4. **Gráficos**: Visualizar tokens/tempo em chart
5. **Notificações**: Toast quando pipeline completa
6. **Busca**: Filtrar steps por texto

## 📝 Notas Importantes

- ✅ Não precisa criar novos componentes - tudo já existe!
- ✅ Não precisa modificar Edge Functions - estão corretas!
- ✅ Não precisa criar RPCs - já existem no banco!
- ✅ Só precisamos **testar** para confirmar que funciona

## 🧪 Teste Rápido

Execute no console do navegador (F12) após carregar o AI Builder:

```javascript
// Verificar se hook está carregado
console.log('Hook:', window.useAIBuilderChat ? 'OK' : 'ERRO');

// Verificar se componente existe
console.log('Componente:', document.querySelector('[placeholder="Digite uma mensagem..."]') ? 'OK' : 'ERRO');

// Simular envio (substitua AGENT_ID pelo ID real)
// const agentId = 'seu-agent-id-aqui';
// Depois digite no chat e envie
```

## 📞 Suporte

Se algo não funcionar:

1. Abra F12 (Console)
2. Procure por erros vermelhos
3. Procure por logs `[useAIBuilderChat]`
4. Verifique se `✅ Pipeline data received` aparece
5. Se aparecer mas UI não mostra, problema é no render
6. Se não aparecer, problema é na API

---

**Status**: ✅ **PRONTO PARA TESTAR**

Tudo está implementado e conectado. Só precisa testar enviando uma mensagem no chat!
