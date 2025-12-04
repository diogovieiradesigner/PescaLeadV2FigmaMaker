# 📋 Resumo para o Claude - Problema com Especialistas

## 🎯 Contexto
Os agentes especialistas "Ana (produto HIPER)" e "Ana (produto Matcom)" aparecem no frontend mas NÃO existem no banco de dados.

---

## 📊 ONDE OS DADOS ESTÃO SENDO SALVOS

### 🔹 Estrutura Completa

```
TELA (Frontend)
    ↓
ESTADO REACT (Memória)
    ↓
handleSave() [Clique "Salvar Alterações"]
    ↓
updateAIAgent() ou createAIAgent() [Service]
    ↓
Supabase Client
    ↓
BANCO DE DADOS (PostgreSQL)
    ↓
Tabela: ai_agents
    ↓
Coluna: specialist_agents (tipo JSONB)
```

---

## 🗃️ Estrutura no Banco de Dados

**Tabela:** `ai_agents`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID do agente principal |
| `workspace_id` | UUID | ID do workspace |
| `name` | TEXT | Nome do agente (ex: "Ana") |
| `specialist_agents` | **JSONB** | **⬅️ ARRAY com todos os especialistas** |
| `orchestrator_enabled` | BOOLEAN | Toggle do orquestrador |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data da última atualização |

---

## 📝 Estrutura de Cada Especialista (dentro do JSONB)

```json
{
  "id": "uuid-gerado",
  "name": "Outbound",                    // ⬅️ Campo "Nome" da tela
  "type": "outbound",                    // ⬅️ Campo "Tipo" (dropdown)
  "is_active": true,                     // ⬅️ Toggle/Switcher
  "extra_prompt": "Prompt aqui...",      // ⬅️ Campo "Prompt Adicional"
  "description": "",                     // Usado para tipo "custom"
  "function_key": "outbound",            // Gerado automaticamente
  "priority": 0                          // Ordem na lista
}
```

---

## 🔄 Campos da Tela → Banco de Dados

Com base na imagem fornecida:

| Campo na Tela | Propriedade | Localização no Banco |
|---------------|-------------|----------------------|
| **Nome** (ex: "Outbou") | `name` | `ai_agents.specialist_agents[0].name` |
| **Tipo** (dropdown) | `type` | `ai_agents.specialist_agents[0].type` |
| **Toggle** (azul/cinza) | `is_active` | `ai_agents.specialist_agents[0].is_active` |
| **Prompt Adicional** (textarea) | `extra_prompt` | `ai_agents.specialist_agents[0].extra_prompt` |

---

## 💾 Exemplo Real de Dado Salvo

```json
// Tabela: ai_agents
// Linha do agente "Ana"
{
  "id": "uuid-agente-ana",
  "name": "Ana",
  "workspace_id": "uuid-workspace",
  "orchestrator_enabled": true,
  "specialist_agents": [
    {
      "id": "uuid-1",
      "name": "Outbound",
      "type": "outbound",
      "is_active": true,
      "extra_prompt": "A primeira pergunta para se fazer antes de qualquer coisa é:\n\"Qual a sua cor favorita?\"\n\nSó continue se ele responder.",
      "description": "",
      "function_key": "outbound",
      "priority": 0
    },
    {
      "id": "uuid-2",
      "name": "Inbound",
      "type": "inbound",
      "is_active": true,
      "extra_prompt": "A primeira pergunta para se fazer antes de qualquer coisa é:\n\"Qual a sua comida favorita?\"",
      "description": "",
      "function_key": "inbound",
      "priority": 1
    }
  ]
}
```

---

## 🔍 Código Responsável pelo Salvamento

### 1️⃣ **Função que atualiza estado (não salva ainda)**
**Arquivo:** `/components/AgentConfigForm.tsx` (linha ~414)

```typescript
const updateSpecialistAgent = (
  id: string, 
  field: keyof SpecialistAgent, 
  value: string | boolean | number
) => {
  setSpecialistAgents(prev => {
    return prev.map(agent => {
      if (agent.id === id) {
        return { ...agent, [field]: value };
      }
      return agent;
    });
  });
  setHasChanges(true); // ⚠️ Marca que tem mudanças NÃO SALVAS
};
```

### 2️⃣ **Função que REALMENTE salva no banco**
**Arquivo:** `/components/AgentConfigForm.tsx` (linha ~292)

```typescript
const handleSave = async () => {
  // ...
  const agentData = {
    workspace_id: workspaceId,
    name: agentName,
    specialist_agents: specialistAgents, // ⬅️ AQUI: Array completo
    orchestrator_enabled: orchestratorEnabled,
    // ... outros campos ...
  };

  if (agentId) {
    // ATUALIZAR agente existente
    await updateAIAgent(agentId, agentData);
  } else {
    // CRIAR novo agente
    await createAIAgent(agentData);
  }
};
```

### 3️⃣ **Service que faz o UPDATE no Supabase**
**Arquivo:** `/services/ai-agent-service.ts` (linha ~217)

```typescript
export async function updateAIAgent(
  agentId: string,
  updates: UpdateAIAgentData
): Promise<AIAgent> {
  const { data, error } = await supabase
    .from('ai_agents')          // ⬅️ Tabela
    .update({
      ...updates,               // ⬅️ Inclui specialist_agents
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)          // ⬅️ WHERE id = agentId
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update AI agent: ${error.message}`);
  }

  return data;
}
```

---

## 🚨 Possíveis Causas do Problema

### ❌ Causa 1: Não clicou em "Salvar Alterações"
- Os dados ficam apenas no estado React
- Não são enviados ao banco
- **Solução:** Clicar no botão "Salvar Alterações"

### ❌ Causa 2: Erro silencioso no try/catch
- O update falhou mas o erro não foi logado
- **Solução:** Adicionar logs no console

### ❌ Causa 3: RLS (Row Level Security) bloqueando
- Políticas do Supabase impedem o UPDATE
- **Solução:** Verificar políticas

### ❌ Causa 4: Estado React desatualizado
- Cache do navegador mostrando dados antigos
- **Solução:** Hard reload (Ctrl + Shift + R)

### ❌ Causa 5: Editando agente diferente
- O agente mostrado na tela não é o mesmo do banco
- **Solução:** Verificar o `agentId` na URL e no banco

---

## ✅ Queries SQL para Investigar

### Ver especialistas do agente "Ana":
```sql
SELECT 
  id,
  name,
  orchestrator_enabled,
  jsonb_pretty(specialist_agents) as specialists
FROM ai_agents 
WHERE name = 'Ana';
```

### Ver TODOS os especialistas formatados:
```sql
SELECT 
  a.name as agente_nome,
  s.value->>'name' as specialist_name,
  s.value->>'type' as specialist_type,
  s.value->>'is_active' as specialist_active
FROM ai_agents a
CROSS JOIN LATERAL jsonb_array_elements(a.specialist_agents) s(value)
WHERE a.workspace_id = 'SEU_WORKSPACE_ID';
```

### Contar especialistas por agente:
```sql
SELECT 
  name,
  jsonb_array_length(specialist_agents) as total_specialists
FROM ai_agents;
```

---

## 🧪 Teste para Confirmar o Problema

### Passo 1: Antes de editar
```sql
SELECT specialist_agents FROM ai_agents WHERE name = 'Ana';
```
**Resultado esperado:** `[]` ou `null` (vazio)

### Passo 2: Editar na tela
1. Adicionar especialista "Teste"
2. Preencher tipo, prompt, etc
3. **CLICAR EM "SALVAR ALTERAÇÕES"** ⬅️ IMPORTANTE!

### Passo 3: Depois de salvar
```sql
SELECT specialist_agents FROM ai_agents WHERE name = 'Ana';
```
**Resultado esperado:** Array com o especialista "Teste"

### Passo 4: Verificar updated_at
```sql
SELECT name, updated_at FROM ai_agents WHERE name = 'Ana';
```
**Se `updated_at` NÃO mudou:** O UPDATE não foi executado!

---

## 🔧 Logs de Debug Recomendados

Adicionar no início de `handleSave()`:

```typescript
console.group('🔍 DEBUG SALVAMENTO');
console.log('agentId:', agentId);
console.log('specialistAgents:', specialistAgents);
console.log('Total de especialistas:', specialistAgents.length);
console.groupEnd();
```

Adicionar antes do `updateAIAgent()`:

```typescript
console.log('🔄 Enviando para banco:', {
  agentId,
  specialist_agents: agentData.specialist_agents
});
```

Adicionar depois do `updateAIAgent()`:

```typescript
const updated = await updateAIAgent(agentId, agentData);
console.log('✅ Resposta do banco:', updated.specialist_agents);
```

---

## 📌 Resumo Final para o Claude

**O que você precisa saber:**

1. Os especialistas são salvos na tabela `ai_agents`, coluna `specialist_agents` (tipo JSONB)
2. É um **array de objetos JSON**, não uma tabela separada
3. Cada especialista tem: `id`, `name`, `type`, `is_active`, `extra_prompt`, `description`, `function_key`, `priority`
4. O salvamento só acontece quando clica em "Salvar Alterações"
5. Antes disso, os dados ficam apenas no estado React (memória)

**Arquivos envolvidos:**
- `/components/AgentConfigForm.tsx` - UI e lógica do formulário
- `/services/ai-agent-service.ts` - Comunicação com o banco
- Tabela `ai_agents` no Supabase - Armazenamento final

**Campos da tela:**
- **Nome** → `specialist_agents[].name`
- **Tipo** → `specialist_agents[].type`
- **Toggle** → `specialist_agents[].is_active`
- **Prompt Adicional** → `specialist_agents[].extra_prompt`
