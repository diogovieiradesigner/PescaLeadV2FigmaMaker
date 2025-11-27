# 🔀 Switch de Habilitação do RAG

## ✅ Status: Implementado

O sistema de toggle para habilitar/desabilitar a Base de Conhecimento (RAG) foi completamente implementado.

---

## 📁 Arquivos Criados

### 1. Hook: `/hooks/useRagEnabled.ts`
Hook React que gerencia o estado `rag_enabled` do agente:

- **Carrega** o valor do banco ao montar
- **Atualiza** o valor com `setRagEnabled(boolean)`
- **Toggle** com `toggleRagEnabled()`
- **Logs** detalhados no console

```typescript
const { ragEnabled, isLoading, setRagEnabled, toggleRagEnabled } = useRagEnabled(agentId);
```

---

### 2. Componente: `/components/RagEnabledSwitch.tsx`
Componente visual do switch com estados:

- ✅ **Ativo** (verde) - RAG consultará documentos
- ⏸️ **Inativo** (cinza) - RAG ignorado
- ⚠️ **Sem documentos** - Switch desabilitado
- ⏳ **Salvando** - Spinner durante atualização

---

### 3. Integração: `/components/RagKnowledgeBase.tsx`
O switch foi integrado **acima** da área de upload de documentos.

---

## 🎨 Visual do Componente

```
┌─────────────────────────────────────────────────────────────┐
│  📖 Usar Base de Conhecimento              [========●] ON   │
│  O agente consultará os documentos para responder           │
│  🟢 Ativo                                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Como Funciona

### No Frontend
1. Usuário clica no switch
2. `useRagEnabled` atualiza o campo `rag_enabled` no Supabase
3. Toast de confirmação aparece
4. Status visual muda instantaneamente

### No Backend (Edge Function)
O backend **deve** verificar `agent.rag_enabled` antes de fazer RAG:

```typescript
// Buscar agente do banco
const agent = await supabase
  .from('ai_agents')
  .select('rag_enabled, ...')
  .eq('id', agentId)
  .single();

// Verificar se RAG está ativo
if (agent.rag_enabled && agent.rag_collection_id) {
  // Consultar Gemini File Search
  const ragResults = await searchGemini(...);
  // Adicionar ao contexto
}
```

---

## 🗄️ Estrutura do Banco de Dados

### Campo na Tabela `ai_agents`

| Coluna | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `rag_enabled` | `boolean` | `true` | Habilita/desabilita consulta RAG |

**Nota:** O campo `rag_enabled` já deve existir no banco. Se não existir, é necessário criar com:

```sql
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true;
```

---

## 🧪 Como Testar

### 1. Verificar Estado no Console
```javascript
const { data } = await supabase
  .from('ai_agents')
  .select('id, name, rag_enabled')
  .eq('id', 'SEU_AGENT_ID')
  .single();

console.log('RAG Enabled:', data.rag_enabled);
```

### 2. Atualizar Manualmente
```javascript
// Desativar RAG
await supabase
  .from('ai_agents')
  .update({ rag_enabled: false })
  .eq('id', 'SEU_AGENT_ID');

// Ativar RAG
await supabase
  .from('ai_agents')
  .update({ rag_enabled: true })
  .eq('id', 'SEU_AGENT_ID');
```

### 3. Verificar Logs da Edge Function
**Com RAG ativo:**
```
[ai-process-conversation] RAG: Searching in fileSearchStores/xxx with query: ...
[ai-process-conversation] RAG: Found 3 relevant chunks
[ai-process-conversation] RAG context added (1234 chars)
```

**Com RAG desativado:**
```
[ai-process-conversation] Using agent: Assistente, model: claude-3.5-sonnet, RAG enabled: false
```

---

## 🔔 Comportamentos Importantes

### ✅ O Que Acontece Quando Desativo o RAG?
- ❌ **NÃO** deleta documentos
- ❌ **NÃO** deleta a collection do Gemini
- ✅ **APENAS** pula a etapa de consulta RAG no processamento
- ✅ Mensagens continuam sendo processadas normalmente

### ✅ Quando o Switch Fica Desabilitado?
- Quando `agentId` é `null` (agente não salvo)
- Quando `hasDocuments` é `false` (sem documentos)

### ✅ Comportamento com Documentos
- **0 documentos:** Switch desabilitado + aviso amarelo
- **1+ documentos:** Switch habilitado + status (Ativo/Inativo)

---

## 📋 Checklist de Implementação

- ✅ Hook `useRagEnabled` criado
- ✅ Componente `RagEnabledSwitch` criado
- ✅ Integrado em `RagKnowledgeBase`
- ✅ Estados visuais (ativo/inativo/sem docs/salvando)
- ✅ Toast de feedback
- ✅ Logs no console
- ✅ Desabilita quando não há documentos
- ✅ Indicador de status (bolinha verde/cinza)

---

## 🚀 Próximos Passos

### 1. Verificar/Criar Coluna no Banco
```sql
-- Verificar se existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='ai_agents' AND column_name='rag_enabled';

-- Criar se não existir
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true;
```

### 2. Atualizar Edge Function
O backend de processamento de conversação deve:
1. Buscar `agent.rag_enabled` do banco
2. **Pular RAG** se `rag_enabled === false`
3. **Executar RAG** se `rag_enabled === true` e há documentos

---

## 🐛 Debug

### Problema: Switch não muda de estado
**Causa:** `rag_enabled` não existe no banco  
**Solução:** Criar coluna com SQL acima

### Problema: Erro ao salvar
**Causa:** Permissões do Supabase  
**Solução:** Verificar RLS policies da tabela `ai_agents`

### Problema: RAG continua sendo executado mesmo desativado
**Causa:** Backend não está verificando `rag_enabled`  
**Solução:** Adicionar verificação no backend

---

## 📚 Referências

- **Hook:** `/hooks/useRagEnabled.ts`
- **Component:** `/components/RagEnabledSwitch.tsx`
- **Integration:** `/components/RagKnowledgeBase.tsx`
- **RAG System:** `/RAG_IMPLEMENTATION.md`

---

**✨ Sistema pronto para uso!**
