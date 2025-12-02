# 🧪 Script de Teste - Pipeline Logs

## Como Testar a Correção

### 1️⃣ Teste no Console do Navegador

Abra o **DevTools** (F12) e vá para a aba **Console**. Você deve ver logs como:

#### ✅ Ao Resetar Conversa:
```
[useAIBuilderChat] Conversa resetada
[useAIBuilderChat] Reset response: {
  success: true,
  pipelineId: "e325b10a-c1a5-44b5-a4d3-554a8266003a",
  hasPipeline: true
}
```

#### ✅ Ao Enviar Mensagem:
```
[useAIBuilderChat] Enviando para API: {
  agentId: "3267daee-b438-486f-a7b8-d52b84a46cf7",
  messageLength: 25
}

[useAIBuilderChat] Resposta recebida: {
  replyLength: 97,
  tokensUsed: 736,
  durationMs: 2500,
  pipelineId: "f89d3c12-a456-4b89-b3d2-9e8f7a6b5c4d",
  hasPipeline: true,
  pipelineStepsCount: 5
}

[useAIBuilderChat] ✅ Pipeline data received: {
  id: "f89d3c12-a456-4b89-b3d2-9e8f7a6b5c4d",
  status: "success",
  steps: 5
}
```

#### ❌ Se aparecer este aviso, ainda há problema:
```
⚠️ [useAIBuilderChat] ⚠️ No pipeline data in response
```

### 2️⃣ Teste Visual no PipelineLogsViewer

1. Abra o **Chat de Preview**
2. Envie uma mensagem qualquer
3. Clique no botão de **"Ver Logs"** ou **"Pipeline"**
4. Você deve ver:
   - ✅ ID do Pipeline
   - ✅ Status: success
   - ✅ Duração total
   - ✅ Tokens usados
   - ✅ Lista de 5 steps:
     1. 🛡️ Guardrail de Entrada
     2. 📚 RAG - Base de Conhecimento
     3. 🤖 Geração de Resposta
     4. 🔧 Execução de Tools
     5. 🛡️ Guardrail de Saída

### 3️⃣ Teste via API Direta (cURL)

```bash
# Obter seu token de acesso do localStorage
# No console do navegador, execute:
localStorage.getItem('supabase.auth.token')

# Depois use no cURL:
curl -X POST \
  'https://SEU_PROJECT_ID.supabase.co/functions/v1/ai-preview-chat' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "3267daee-b438-486f-a7b8-d52b84a46cf7",
    "message": "Teste de pipeline",
    "preview": true,
    "debug": true
  }'
```

**Resposta esperada**:
```json
{
  "success": true,
  "reply": "Olá! Sou o agente...",
  "conversationId": "uuid-conversa",
  "userMessageId": "uuid-user-msg",
  "aiMessageId": "uuid-ai-msg",
  "pipelineId": "uuid-pipeline",
  "tokensUsed": 870,
  "durationMs": 2500,
  "pipeline": {
    "id": "uuid-pipeline",
    "status": "success",
    "steps": [
      {
        "number": 1,
        "key": "guardrail_input",
        "name": "Guardrail de Entrada",
        "status": "success",
        "durationMs": 200
      }
      // ... mais 4 steps
    ]
  }
}
```

### 4️⃣ Verificação no Banco de Dados

Execute no **SQL Editor** do Supabase:

```sql
-- Ver últimas mensagens com metadata de pipeline
SELECT 
  m.id,
  m.text_content,
  m.message_type,
  m.metadata->>'pipelineId' as pipeline_id,
  m.metadata->>'tokensUsed' as tokens,
  m.created_at
FROM messages m
WHERE m.conversation_id IN (
  SELECT id FROM conversations WHERE channel = 'preview'
)
ORDER BY m.created_at DESC
LIMIT 10;
```

**Resultado esperado**:
Todas as mensagens do tipo `sent` (enviadas pela IA) devem ter `pipeline_id` preenchido.

## ✅ Checklist de Validação

- [ ] Console mostra "✅ Pipeline data received" ao enviar mensagem
- [ ] Console mostra "Reset response: { hasPipeline: true }" ao resetar
- [ ] PipelineLogsViewer mostra os 5 steps detalhados
- [ ] Metadata no banco tem `pipelineId` em todas mensagens da IA
- [ ] Não aparecem avisos "⚠️ No pipeline data in response"
- [ ] Cada step tem duração, tokens e status corretos

## 🐛 Troubleshooting

### Problema: "No pipeline data in response"

**Causa**: Edge Function não está retornando o objeto `pipeline`

**Solução**:
1. Verifique se a Edge Function `ai-preview-chat` foi deployada:
   ```bash
   supabase functions deploy ai-preview-chat
   ```
2. Verifique logs da Edge Function:
   ```bash
   supabase functions logs ai-preview-chat
   ```

### Problema: "Token de autenticação não fornecido"

**Causa**: Frontend não está enviando o token no header

**Solução**:
Verifique se o hook está pegando o token corretamente:
```typescript
const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData?.session?.access_token;
```

### Problema: Pipeline retorna mas não aparece no componente

**Causa**: `PipelineLogsViewer` pode estar esperando estrutura diferente

**Solução**:
Verifique se o componente está acessando `message.metadata?.pipeline` corretamente.

## 📊 Estrutura Esperada dos Logs

```typescript
message.metadata = {
  pipelineId: "uuid",
  tokensUsed: 870,
  durationMs: 2500,
  ragUsed: true,
  guardrailPassed: true,
  pipeline: {
    id: "uuid",
    status: "success",
    totalDurationMs: 2500,
    totalTokensUsed: 870,
    steps: [
      {
        number: 1,
        key: "guardrail_input",
        name: "Guardrail de Entrada",
        icon: "🛡️",
        status: "success",
        durationMs: 200,
        tokensTotal: 0,
        inputSummary: "...",
        outputSummary: "..."
      },
      // ... 4 mais steps
    ]
  }
}
```

## 🎯 Métricas de Sucesso

Após a correção:
- ✅ **100% das mensagens** têm `pipelineId`
- ✅ **100% dos resets** retornam pipeline completo
- ✅ **5 steps** sempre presentes (mesmo que alguns sejam skipped)
- ✅ **Tokens e duração** sempre calculados
- ✅ **Zero avisos** de "No pipeline data"
