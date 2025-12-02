# 🚀 Deploy Rápido - Pipeline Logs

## ⚠️ PROBLEMA REAL DESCOBERTO

As Edge Functions **JÁ EXISTEM** e estão corretas!  
O problema é que faltam as **stored procedures (RPCs)** no banco.

## O que fazer AGORA

### Passo 1: Criar tabelas no banco ⏱️ 1min

Abra o **SQL Editor** no painel do Supabase e cole este script:

```sql
-- Copie todo o conteúdo de:
-- /supabase/migrations/create_pipeline_logs_tables.sql

-- Ou execute este comando resumido:
CREATE TABLE IF NOT EXISTS ai_pipeline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  workspace_id UUID,
  contact_name TEXT,
  contact_phone TEXT,
  agent_name TEXT,
  status TEXT NOT NULL,
  status_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_duration_ms INTEGER,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_estimate DECIMAL(10, 6) DEFAULT 0,
  steps_completed INTEGER DEFAULT 0,
  response_text TEXT,
  response_sent BOOLEAN DEFAULT FALSE,
  provider_message_id TEXT,
  error_message TEXT,
  error_step TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_pipeline_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_log_id UUID NOT NULL,
  step_number INTEGER NOT NULL,
  step_key TEXT NOT NULL,
  step_name TEXT NOT NULL,
  step_icon TEXT,
  status TEXT NOT NULL,
  status_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  config JSONB,
  input_summary TEXT,
  input_data JSONB,
  output_summary TEXT,
  output_data JSONB,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10, 6),
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pipeline_logs_conversation ON ai_pipeline_logs(conversation_id);
CREATE INDEX idx_pipeline_logs_agent ON ai_pipeline_logs(agent_id);
CREATE INDEX idx_pipeline_steps_pipeline ON ai_pipeline_steps(pipeline_log_id);
CREATE INDEX idx_pipeline_steps_pipeline_ordered ON ai_pipeline_steps(pipeline_log_id, step_number);

-- RLS
ALTER TABLE ai_pipeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pipeline_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access logs"
  ON ai_pipeline_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access steps"
  ON ai_pipeline_steps FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users view logs in workspace"
  ON ai_pipeline_logs FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users view steps in workspace"
  ON ai_pipeline_steps FOR SELECT TO authenticated
  USING (pipeline_log_id IN (
    SELECT id FROM ai_pipeline_logs WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));
```

Clique em **RUN** ✅

### Passo 2: Criar RPCs no banco ⏱️ 1min ⭐ **CRÍTICO!**

As Edge Functions chamam 3 stored procedures que **não existem**:
- `log_pipeline_start()`
- `log_pipeline_step()`
- `log_pipeline_complete()`

No **SQL Editor** do Supabase, cole e execute:

```sql
-- Copie todo o conteúdo de:
-- /supabase/migrations/create_pipeline_rpc_functions.sql

-- Este script cria as 3 funções RPC que estavam faltando!
```

Veja o arquivo completo em `/supabase/migrations/create_pipeline_rpc_functions.sql`

Clique em **RUN** ✅

### Passo 3: Testar ⏱️ 30seg

1. Abra o app
2. Vá para o **AI Builder** → **Chat de Preview**
3. Envie qualquer mensagem: `"Olá"`
4. Abra o **DevTools** (F12) → aba **Console**
5. Procure por: `✅ Pipeline data received`

Se aparecer, **FUNCIONOU!** 🎉

### Passo 4: Verificar no banco ⏱️ 30seg

No **SQL Editor**:

```sql
-- Ver últimos pipelines
SELECT 
  id,
  agent_name,
  status,
  total_tokens_used,
  started_at
FROM ai_pipeline_logs
ORDER BY started_at DESC
LIMIT 5;

-- Ver steps do último pipeline
SELECT 
  step_number,
  step_name,
  status,
  duration_ms,
  tokens_total
FROM ai_pipeline_steps
WHERE pipeline_log_id = (
  SELECT id FROM ai_pipeline_logs ORDER BY started_at DESC LIMIT 1
)
ORDER BY step_number;
```

Deve mostrar 5 steps:
1. Guardrail de Entrada
2. RAG - Base de Conhecimento
3. Geração de Resposta
4. Execução de Tools
5. Guardrail de Saída

## 🐛 Se não funcionar

### Erro: "function log_pipeline_start does not exist"

As RPCs não foram criadas! Volte ao **Passo 2** e execute o script SQL.

Para testar se as funções existem:
```sql
-- Deve retornar 3 linhas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('log_pipeline_start', 'log_pipeline_step', 'log_pipeline_complete');
```

### Erro: "relation ai_pipeline_logs does not exist"

As tabelas não foram criadas. Volte ao **Passo 1** e execute o SQL novamente.

### Erro: "No pipeline data in response"

Verifique os logs da Edge Function:
```bash
supabase functions logs ai-process-conversation --tail
```

## 📊 Como ver os logs no frontend

No arquivo que renderiza o chat, adicione o componente:

```tsx
import { PipelineLogsViewer } from './components/PipelineLogsViewer';

// No render, onde mostra as mensagens:
{message.metadata?.pipeline && (
  <PipelineLogsViewer pipeline={message.metadata.pipeline} />
)}
```

## ✅ Checklist Final

- [ ] Tabelas criadas no banco (Passo 1)
- [ ] **RPCs criadas no banco** (Passo 2) ⭐ **MAIS IMPORTANTE!**
- [ ] Teste no console funcionou (Passo 3)
- [ ] Dados aparecem no banco (Passo 4)
- [ ] Componente `PipelineLogsViewer` mostra os logs

**Se todos marcados: SUCESSO!** 🎊

## 💡 Por que Não Funcionava?

As Edge Functions `ai-preview-chat` e `ai-process-conversation` **JÁ EXISTIAM** e estavam corretas!

Mas a `ai-process-conversation` chama:
```typescript
await supabase.rpc("log_pipeline_start", ...)  // ❌ Função não existia!
await supabase.rpc("log_pipeline_step", ...)   // ❌ Função não existia!
await supabase.rpc("log_pipeline_complete", ...) // ❌ Função não existia!
```

Sem essas stored procedures, os logs nunca eram salvos no banco. ✅ Agora existem!

## 📞 Suporte

Se algo der errado, compartilhe:

1. **Logs do console** (F12 → Console)
2. **Logs da Edge Function**:
   ```bash
   supabase functions logs ai-process-conversation --tail
   ```
3. **Query no banco**:
   ```sql
   SELECT COUNT(*) FROM ai_pipeline_logs;
   SELECT COUNT(*) FROM ai_pipeline_steps;
   ```

---

**Tempo total estimado: ~4 minutos** ⏱️
