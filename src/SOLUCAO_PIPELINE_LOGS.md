# 🎯 Solução: Pipeline Logs Não Apareciam

## ❌ Problema

Você observou nos logs:
```javascript
{
  "pipelineId": "e325b10a-c1a5-44b5-a4d3-554a8266003a",  // ✅ Presente
  "hasPipeline": false,                                    // ❌ Faltando!
  "pipelineStepsCount": 0                                  // ❌ Zero!
}
⚠️ [useAIBuilderChat] ⚠️ No pipeline data in response
```

## 🔍 Causa Raiz

A Edge Function `ai-preview-chat` tentava chamar outra função chamada `ai-process-conversation`, mas **essa função não existia no projeto!**

Por isso:
- O `pipelineId` aparecia (gerado pela `ai-preview-chat`)
- Mas o objeto `pipeline` vinha vazio (porque nunca era criado no banco)

## ✅ Solução

Criei a Edge Function que faltava: **`ai-process-conversation`**

Ela é responsável por:
1. Processar a mensagem com IA
2. Criar registro na tabela `ai_pipeline_logs`
3. Executar 5 steps e salvar cada um na tabela `ai_pipeline_steps`
4. Retornar o `pipeline_id` para a `ai-preview-chat` buscar

## 📋 Checklist para Implementar

### 1️⃣ Criar as tabelas no banco

Execute o script SQL:
```bash
# No painel do Supabase, vá em SQL Editor e execute:
/supabase/migrations/create_pipeline_logs_tables.sql
```

Ou via CLI:
```bash
supabase migration up
```

### 2️⃣ Deploy da Edge Function

```bash
# Deploy da função que faltava
supabase functions deploy ai-process-conversation
```

### 3️⃣ Verificar se está funcionando

Após deploy:
1. Abra o Chat de Preview
2. Envie uma mensagem
3. No console deve aparecer:
   ```
   ✅ Pipeline data received: { id: "...", status: "success", steps: 5 }
   ```

## 📊 Estrutura do Fluxo

```
Frontend (useAIBuilderChat)
   ↓ POST /ai-preview-chat
   { agentId, message, preview: true, debug: true }

Edge Function: ai-preview-chat
   ↓ Salva mensagem do usuário
   ↓ POST /ai-process-conversation
   { conversation_id, agent_id, message_ids }

Edge Function: ai-process-conversation ✨ NOVO!
   ↓ INSERT ai_pipeline_logs (id, status, started_at)
   ↓ Executa Step 1: Guardrail Input
   ↓   INSERT ai_pipeline_steps (step_number: 1, status: "success")
   ↓ Executa Step 2: RAG Retrieval
   ↓   INSERT ai_pipeline_steps (step_number: 2, status: "success")
   ↓ Executa Step 3: LLM Generation
   ↓   INSERT ai_pipeline_steps (step_number: 3, status: "success")
   ↓ Executa Step 4: Tools Execution
   ↓   INSERT ai_pipeline_steps (step_number: 4, status: "skipped")
   ↓ Executa Step 5: Guardrail Output
   ↓   INSERT ai_pipeline_steps (step_number: 5, status: "success")
   ↓ UPDATE ai_pipeline_logs (status: "success", completed_at)
   ↓ Salva mensagem da IA
   ↓ RETURN { pipeline_id, response_text }

Edge Function: ai-preview-chat
   ↓ SELECT * FROM ai_pipeline_logs WHERE id = pipeline_id
   ↓ SELECT * FROM ai_pipeline_steps WHERE pipeline_log_id = pipeline_id
   ↓ Constrói objeto pipeline completo
   ↓ RETURN { pipelineId, pipeline: {...} }

Frontend (useAIBuilderChat)
   ↓ Salva mensagem com metadata.pipeline
   ↓ PipelineLogsViewer exibe os 5 steps
```

## 📁 Arquivos Criados

1. **`/supabase/functions/ai-process-conversation/index.ts`** - Edge Function principal ✨
2. **`/supabase/migrations/create_pipeline_logs_tables.sql`** - Schema do banco
3. **`/CORRECAO_PIPELINE_ID.md`** - Documentação detalhada
4. **`/SOLUCAO_PIPELINE_LOGS.md`** - Este resumo

## 🧪 Testando

### Teste 1: Verificar tabelas

```sql
-- Deve retornar 2 linhas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('ai_pipeline_logs', 'ai_pipeline_steps');
```

### Teste 2: Enviar mensagem de teste

No Chat de Preview:
1. Envie: "Teste"
2. Console deve mostrar: `✅ Pipeline data received`
3. Verifique no banco:

```sql
-- Deve mostrar logs recentes
SELECT id, status, agent_name, started_at 
FROM ai_pipeline_logs 
ORDER BY started_at DESC 
LIMIT 5;

-- Deve mostrar 5 steps por pipeline
SELECT 
  pl.id as pipeline_id,
  COUNT(ps.id) as steps_count
FROM ai_pipeline_logs pl
LEFT JOIN ai_pipeline_steps ps ON ps.pipeline_log_id = pl.id
GROUP BY pl.id
ORDER BY pl.started_at DESC
LIMIT 5;
```

### Teste 3: Ver no componente

No frontend, abra o `PipelineLogsViewer` e você deve ver:

```
Pipeline: e325b10a-...
Status: success ✅
Duração: 2.5s
Tokens: 870

Steps:
  1. 🛡️ Guardrail de Entrada - success (150ms)
  2. 📚 RAG - Base de Conhecimento - success (300ms)
  3. 🤖 Geração de Resposta - success (1200ms)
  4. 🔧 Execução de Tools - skipped (10ms)
  5. 🛡️ Guardrail de Saída - success (200ms)
```

## ⚠️ Importante

A função atual está **simulando** as respostas da IA. Para integração real:

1. Substituir simulação por chamada real ao OpenRouter/OpenAI
2. Implementar busca RAG no PostgreSQL
3. Adicionar execução de tools/functions
4. Conectar guardrails de conteúdo

Mas a **infraestrutura de logs está 100% pronta**!

## 🎉 Resultado

Depois do deploy:

✅ Toda mensagem cria um `pipeline_log` no banco  
✅ Cada pipeline tem 5 steps salvos  
✅ Frontend recebe objeto `pipeline` completo  
✅ `PipelineLogsViewer` mostra detalhes  
✅ Zero avisos de "No pipeline data"
