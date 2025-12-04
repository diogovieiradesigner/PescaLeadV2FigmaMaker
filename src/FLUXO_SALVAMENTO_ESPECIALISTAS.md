# 📊 Fluxo Completo de Salvamento - Agentes Especialistas

## 🎯 Campos Visíveis na Tela

Com base na imagem fornecida, os campos são:

1. **Nome** (ex: "Outbou", "Inbour")
2. **Tipo** (dropdown: "Outbound (prospecção)", "Inbound (cliente iniciou)", "Personalizado (temático)")
3. **Toggle/Switcher** (azul = ativo, cinza = inativo)
4. **Prompt Adicional do Especialista** (textarea)

---

## 📍 Estrutura de Dados Completa (TypeScript)

```typescript
export interface SpecialistAgent {
  id: string;                                    // UUID gerado automaticamente
  name: string;                                  // Campo "Nome" da tela
  description: string;                           // Não visível na imagem, mas existe
  function_key: string;                          // Gerado automaticamente a partir do nome
  extra_prompt: string;                          // Campo "Prompt Adicional" da tela
  is_active: boolean;                            // Toggle/Switcher da tela
  priority: number;                              // Ordem do agente na lista
  type: 'inbound' | 'outbound' | 'custom';      // Campo "Tipo" da tela
}
```

---

## 🔄 Fluxo de Salvamento Passo a Passo

### 1️⃣ **EDIÇÃO NA TELA** (Frontend - Estado React)

**Arquivo:** `/components/AgentConfigForm.tsx`

Quando o usuário edita qualquer campo, a função `updateSpecialistAgent()` é chamada:

```typescript
const updateSpecialistAgent = (
  id: string, 
  field: keyof SpecialistAgent, 
  value: string | boolean | number
) => {
  setSpecialistAgents(prev => {
    return prev.map(agent => {
      if (agent.id === id) {
        const updated = { ...agent, [field]: value };
        
        // Auto-gerar function_key quando o nome mudar
        if (field === 'name' && typeof value === 'string') {
          updated.function_key = generateFunctionKey(value);
        }
        
        return updated;
      }
      return agent;
    });
  });
  setHasChanges(true); // ⚠️ IMPORTANTE: Marca que há mudanças não salvas
};
```

**O que acontece:**
- Os dados ficam apenas no **estado React** (`specialistAgents`)
- ❌ **NÃO salva no banco de dados ainda**
- ✅ Marca `hasChanges = true` para indicar que precisa salvar

---

### 2️⃣ **CLIQUE NO BOTÃO "SALVAR"** (Trigger)

**Arquivo:** `/components/AgentConfigForm.tsx`

Quando o usuário clica em "Salvar Alterações", a função `handleSave()` é executada:

```typescript
const handleSave = async () => {
  // ... validações ...
  
  const agentData = {
    workspace_id: workspaceId,
    name: agentName,
    model,
    is_active: isActive,
    default_attendant_type: defaultAttendantType,
    system_prompt: systemPrompt,
    specialist_agents: specialistAgents,  // ⬅️ AQUI! Array completo
    orchestrator_enabled: orchestratorEnabled,
    crm_auto_update: crmAutoUpdate,
    crm_update_prompt: crmUpdatePrompt || null,
    behavior_config: { /* ... */ },
  };

  if (agentId) {
    // MODO UPDATE (editar agente existente)
    await updateAIAgent(agentId, agentData);
  } else {
    // MODO INSERT (criar novo agente)
    await createAIAgent(agentData);
  }
};
```

**O que acontece:**
- Cria objeto `agentData` com TODOS os dados do formulário
- O campo `specialist_agents` recebe o array completo do estado React
- Chama o service para salvar

---

### 3️⃣ **SERVICE LAYER** (Camada de Serviço)

**Arquivo:** `/services/ai-agent-service.ts`

#### Para ATUALIZAR agente existente:

```typescript
export async function updateAIAgent(
  agentId: string,
  updates: UpdateAIAgentData
): Promise<AIAgent> {
  const { data, error } = await supabase
    .from('ai_agents')
    .update({
      ...updates,  // ⬅️ Inclui specialist_agents aqui
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update AI agent: ${error.message}`);
  }

  return data;
}
```

#### Para CRIAR novo agente:

```typescript
export async function createAIAgent(
  agentData: CreateAIAgentData
): Promise<AIAgent> {
  const { data, error } = await supabase
    .from('ai_agents')
    .insert({
      ...agentData,  // ⬅️ Inclui specialist_agents aqui
      specialist_agents: agentData.specialist_agents || [],
      behavior_config,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create AI agent: ${error.message}`);
  }

  return data;
}
```

**O que acontece:**
- Faz a chamada para o Supabase
- Envia TODOS os dados, incluindo o array `specialist_agents`

---

### 4️⃣ **BANCO DE DADOS** (PostgreSQL via Supabase)

**Tabela:** `ai_agents`
**Coluna:** `specialist_agents`
**Tipo:** `JSONB` (JSON binário no PostgreSQL)

#### Estrutura no banco:

```sql
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  system_prompt TEXT,
  specialist_agents JSONB DEFAULT '[]'::jsonb,  -- ⬅️ AQUI!
  orchestrator_enabled BOOLEAN DEFAULT false,
  crm_auto_update BOOLEAN DEFAULT false,
  crm_update_prompt TEXT,
  behavior_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Exemplo de dado salvo:

```json
{
  "id": "uuid-do-agente-ana",
  "name": "Ana",
  "specialist_agents": [
    {
      "id": "uuid-1",
      "name": "Outbound",
      "description": "",
      "function_key": "outbound",
      "extra_prompt": "A primeira pergunta para se fazer antes de qualquer coisa é:\n\"Qual a sua cor favorita?\"\n\nSó continue se ele responder.",
      "is_active": true,
      "priority": 0,
      "type": "outbound"
    },
    {
      "id": "uuid-2",
      "name": "Inbound",
      "description": "",
      "function_key": "inbound",
      "extra_prompt": "A primeira pergunta para se fazer antes de qualquer coisa é:\n\"Qual a sua comida favorita?\"",
      "is_active": true,
      "priority": 1,
      "type": "inbound"
    }
  ]
}
```

---

## 🔍 MAPEAMENTO CAMPO POR CAMPO

| Campo na Tela | Propriedade TypeScript | Coluna no Banco | Exemplo |
|---------------|------------------------|-----------------|---------|
| **Nome** | `name` | `specialist_agents[].name` | "Outbound" |
| **Tipo** (dropdown) | `type` | `specialist_agents[].type` | "outbound" |
| **Toggle** (azul/cinza) | `is_active` | `specialist_agents[].is_active` | `true` |
| **Prompt Adicional** | `extra_prompt` | `specialist_agents[].extra_prompt` | "A primeira pergunta..." |
| *(Não visível)* Descrição | `description` | `specialist_agents[].description` | "" |
| *(Gerado auto)* Function Key | `function_key` | `specialist_agents[].function_key` | "outbound" |
| *(Gerado auto)* ID | `id` | `specialist_agents[].id` | "uuid-1" |
| *(Gerado auto)* Priority | `priority` | `specialist_agents[].priority` | 0 |

---

## 🚨 PROBLEMA IDENTIFICADO

### Por que os especialistas não aparecem no banco?

#### ❌ **Cenário 1: Estado React não está sincronizado**
```typescript
// Os dados estão apenas na memória do navegador
specialistAgents = [
  { id: "uuid-1", name: "Ana (produto HIPER)", ... },
  { id: "uuid-2", name: "Ana (produto Matcom)", ... }
]
// ⬆️ Isso está APENAS no React, não foi salvo
```

#### ❌ **Cenário 2: Não clicou em "Salvar Alterações"**
- Editou os campos
- Não clicou no botão "Salvar Alterações"
- Os dados ficaram apenas no estado React
- Ao recarregar a página, os dados são perdidos

#### ❌ **Cenário 3: Erro silencioso no salvamento**
```typescript
try {
  await updateAIAgent(agentId, agentData);
  // ⬆️ Pode ter dado erro aqui, mas não foi logado
} catch (error) {
  // Verificar console do navegador
}
```

#### ❌ **Cenário 4: Nome do agente não está correto**
- O agente mostrado na tela tem nome diferente do salvo no banco
- Está editando um agente, mas visualizando outro

---

## ✅ COMO VERIFICAR

### 1. Verificar estado React no navegador (DevTools):
```javascript
// No console do navegador, quando estiver na tela do agente:
// Inspecionar o componente AgentConfigForm
// Ver o state "specialistAgents"
```

### 2. Verificar no banco de dados:
```sql
-- Buscar agente "Ana"
SELECT id, name, specialist_agents 
FROM ai_agents 
WHERE name = 'Ana';

-- Ver TODOS os agentes do workspace
SELECT id, name, specialist_agents 
FROM ai_agents 
WHERE workspace_id = 'SEU_WORKSPACE_ID';
```

### 3. Verificar logs no console:
```
[AgentConfigForm] 🔄 MODO UPDATE - Agente ID: xxx
[AgentConfigForm] ✅ Agente atualizado: xxx
```

### 4. Adicionar logs de debug:
```typescript
const handleSave = async () => {
  console.log('🔍 specialist_agents antes de salvar:', specialistAgents);
  
  const agentData = {
    // ...
    specialist_agents: specialistAgents,
  };
  
  console.log('🔍 agentData completo:', agentData);
  
  if (agentId) {
    const updated = await updateAIAgent(agentId, agentData);
    console.log('🔍 Resposta do update:', updated);
  }
};
```

---

## 🛠️ SOLUÇÃO

### Se os especialistas não estão sendo salvos:

1. **Verificar se clicou em "Salvar Alterações"**
2. **Verificar erros no console do navegador**
3. **Adicionar logs de debug na função handleSave()**
4. **Verificar se o agentId está correto**
5. **Verificar permissões no Supabase** (RLS - Row Level Security)

### Query para verificar diretamente no Supabase:
```sql
-- Ver o JSON completo do specialist_agents
SELECT 
  id,
  name,
  jsonb_pretty(specialist_agents) as specialists
FROM ai_agents 
WHERE name = 'Ana';
```

---

## 📝 RESUMO FINAL

**Onde está salvando:**
- ✅ Tabela: `ai_agents`
- ✅ Coluna: `specialist_agents` (tipo JSONB)
- ✅ Formato: Array de objetos JSON com todos os campos

**Campos salvos:**
1. `name` → Nome do especialista
2. `type` → Tipo (inbound/outbound/custom)
3. `is_active` → Toggle (true/false)
4. `extra_prompt` → Prompt adicional
5. `description` → Descrição (quando tipo = custom)
6. `function_key` → Chave gerada automaticamente
7. `id` → UUID único
8. `priority` → Ordem na lista

**Fluxo:**
1. Editar campos → Estado React (`specialistAgents`)
2. Clicar "Salvar" → `handleSave()`
3. Service → `updateAIAgent()` ou `createAIAgent()`
4. Supabase → `UPDATE` ou `INSERT` na tabela `ai_agents`
5. Banco → Coluna `specialist_agents` (JSONB)
