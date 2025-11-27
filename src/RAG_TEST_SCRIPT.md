# 🧪 Script de Teste - RAG Switch

## 📋 Teste Rápido no Console do Navegador

Cole este código no console do navegador (F12 → Console) para testar o sistema:

```javascript
// Importar Supabase client
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './utils/supabase/info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// ====================================
// 1. LISTAR TODOS OS AGENTES
// ====================================
async function listAgents() {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, rag_enabled, created_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.table(data);
  return data;
}

// ====================================
// 2. VER ESTADO DE UM AGENTE
// ====================================
async function getAgentRagStatus(agentId) {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('id, name, rag_enabled')
    .eq('id', agentId)
    .single();
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log('📊 Estado do Agente:', data);
  console.log(`🔀 RAG: ${data.rag_enabled ? '✅ ATIVO' : '❌ INATIVO'}`);
  return data;
}

// ====================================
// 3. ATIVAR RAG
// ====================================
async function enableRAG(agentId) {
  const { data, error } = await supabase
    .from('ai_agents')
    .update({ rag_enabled: true })
    .eq('id', agentId)
    .select();
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log('✅ RAG ATIVADO!');
  return data;
}

// ====================================
// 4. DESATIVAR RAG
// ====================================
async function disableRAG(agentId) {
  const { data, error } = await supabase
    .from('ai_agents')
    .update({ rag_enabled: false })
    .eq('id', agentId)
    .select();
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log('⏸️ RAG DESATIVADO!');
  return data;
}

// ====================================
// 5. TOGGLE RAG
// ====================================
async function toggleRAG(agentId) {
  const current = await getAgentRagStatus(agentId);
  
  if (current.rag_enabled) {
    await disableRAG(agentId);
  } else {
    await enableRAG(agentId);
  }
}

// ====================================
// 6. VERIFICAR DOCUMENTOS
// ====================================
async function listDocuments(agentId) {
  const { data, error } = await supabase
    .from('ai_rag_documents')
    .select('id, title, processing_status, metadata')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log(`📚 ${data.length} documento(s) encontrado(s):`);
  console.table(data);
  return data;
}

// ====================================
// EXEMPLO DE USO
// ====================================

// Listar todos os agentes
await listAgents();

// Ver estado de um agente específico
await getAgentRagStatus('SEU_AGENT_ID_AQUI');

// Ativar RAG
await enableRAG('SEU_AGENT_ID_AQUI');

// Desativar RAG
await disableRAG('SEU_AGENT_ID_AQUI');

// Toggle (inverter estado atual)
await toggleRAG('SEU_AGENT_ID_AQUI');

// Listar documentos do agente
await listDocuments('SEU_AGENT_ID_AQUI');
```

---

## 🔍 Teste Passo a Passo

### 1. **Abrir o Sistema**
```
http://localhost:5173
ou
https://seu-dominio.com
```

### 2. **Ir para a Página de Configuração do Agente**
```
Menu → Serviço IA → Configuração do Agente
```

### 3. **Verificar o Switch**
O switch deve aparecer na seção **Base de Conhecimento**, acima da área de upload:

```
┌──────────────────────────────────────────────────┐
│  📁 Base de Conhecimento              [2 doc(s)] │
│  Gemini File Search RAG                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  📖 Usar Base de Conhecimento    [====●] ON     │ ← AQUI
│  O agente consultará os documentos...           │
│  🟢 Ativo                                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4. **Testar o Toggle**

#### **Cenário 1: Sem Documentos**
- Switch deve estar **desabilitado**
- Deve mostrar aviso: "⚠️ Faça upload de documentos..."

#### **Cenário 2: Com Documentos**
- Switch deve estar **habilitado**
- Clicar no switch:
  - ✅ Toast de sucesso aparece
  - 🟢 Indicador muda de cor
  - ⏳ Spinner aparece durante salvamento

#### **Cenário 3: Agente Não Salvo**
- Switch deve estar **desabilitado**
- Mensagem: "Salve o agente primeiro..."

---

## 🐛 Verificar Logs

### Console do Navegador
```
[useRagEnabled] Loading state for agent: xxx-xxx-xxx
[useRagEnabled] Current state: true
[useRagEnabled] Updating state to: false
[useRagEnabled] State updated successfully
```

### Console da Edge Function
```
[ai-process-conversation] Agent: Assistente, RAG enabled: false
```

ou

```
[ai-process-conversation] RAG: Searching in fileSearchStores/xxx...
[ai-process-conversation] RAG: Found 3 relevant chunks
```

---

## ✅ Checklist de Teste

- [ ] Switch aparece na página
- [ ] Switch desabilitado quando sem documentos
- [ ] Switch habilitado quando há documentos
- [ ] Clicar no switch atualiza estado
- [ ] Toast de confirmação aparece
- [ ] Indicador visual muda (🟢 ↔️ ⚫)
- [ ] Estado persiste após recarregar página
- [ ] Logs aparecem no console
- [ ] Banco de dados atualiza corretamente

---

## 📊 Verificar no Supabase

### Via SQL Editor

```sql
-- Ver todos os agentes e seu status RAG
SELECT 
  id, 
  name, 
  rag_enabled,
  (SELECT COUNT(*) FROM ai_rag_documents WHERE agent_id = ai_agents.id) as doc_count
FROM ai_agents
ORDER BY created_at DESC;
```

### Via Table Editor

1. Ir para **Table Editor**
2. Selecionar tabela **ai_agents**
3. Procurar coluna **rag_enabled**
4. Verificar valor (✅ true / ❌ false)

---

## 🎯 Teste de Integração Completo

### 1. **Upload de Documento**
```
1. Arrastar arquivo PDF para área de upload
2. Aguardar upload completar
3. Verificar documento na lista
```

### 2. **Ativar RAG**
```
1. Clicar no switch (ON)
2. Verificar toast: "✅ Base de conhecimento ativada!"
3. Verificar indicador: "🟢 Ativo"
```

### 3. **Enviar Mensagem de Teste**
```
1. Ir para página de Chat
2. Enviar mensagem perguntando sobre o documento
3. Verificar resposta do agente (deve usar conteúdo do documento)
```

### 4. **Desativar RAG**
```
1. Voltar para configuração
2. Clicar no switch (OFF)
3. Verificar toast: "⏸️ Base de conhecimento desativada"
4. Verificar indicador: "⚫ Inativo"
```

### 5. **Enviar Mesma Mensagem**
```
1. Voltar para Chat
2. Enviar mesma pergunta
3. Verificar resposta (NÃO deve usar documento)
```

---

## 🚨 Problemas Comuns

### ❌ **Erro: Column "rag_enabled" does not exist**
**Solução:** Criar coluna no banco:
```sql
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true;
```

### ❌ **Switch não muda de estado**
**Verificar:**
1. Console do navegador - há erros?
2. Network tab - requisição foi enviada?
3. Supabase - RLS policies estão corretas?

### ❌ **RAG continua executando mesmo desativado**
**Causa:** Backend não verifica `rag_enabled`  
**Solução:** Atualizar Edge Function conforme documentação

---

## 📚 Referências

- **Documentação:** [RAG_ENABLED_SWITCH.md](./RAG_ENABLED_SWITCH.md)
- **Implementação:** [RAG_IMPLEMENTATION.md](./RAG_IMPLEMENTATION.md)
- **Código:** 
  - `/hooks/useRagEnabled.ts`
  - `/components/RagEnabledSwitch.tsx`
  - `/components/RagKnowledgeBase.tsx`

---

**✨ Bom teste!**
