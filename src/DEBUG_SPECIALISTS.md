# 🐛 Script de Debug - Agentes Especialistas

## 🔍 Comandos SQL para Investigar

### 1. Ver TODOS os agentes do workspace
```sql
SELECT 
  id,
  name,
  orchestrator_enabled,
  jsonb_array_length(specialist_agents) as num_specialists,
  created_at,
  updated_at
FROM ai_agents 
WHERE workspace_id = 'SEU_WORKSPACE_ID'
ORDER BY updated_at DESC;
```

### 2. Ver os especialistas do agente "Ana"
```sql
SELECT 
  id,
  name,
  orchestrator_enabled,
  jsonb_pretty(specialist_agents) as specialists_formatado
FROM ai_agents 
WHERE name = 'Ana';
```

### 3. Ver especialistas de TODOS os agentes (formatado)
```sql
SELECT 
  a.name as agente_nome,
  a.orchestrator_enabled,
  s.value->>'name' as specialist_name,
  s.value->>'type' as specialist_type,
  s.value->>'is_active' as specialist_active,
  s.value->>'extra_prompt' as specialist_prompt
FROM ai_agents a
CROSS JOIN LATERAL jsonb_array_elements(a.specialist_agents) s(value)
WHERE a.workspace_id = 'SEU_WORKSPACE_ID'
ORDER BY a.name, (s.value->>'priority')::int;
```

### 4. Contar quantos especialistas cada agente tem
```sql
SELECT 
  name,
  orchestrator_enabled,
  jsonb_array_length(specialist_agents) as total_specialists,
  updated_at
FROM ai_agents 
WHERE workspace_id = 'SEU_WORKSPACE_ID';
```

### 5. Ver agentes que TÊM especialistas
```sql
SELECT 
  id,
  name,
  jsonb_array_length(specialist_agents) as num_specialists
FROM ai_agents 
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND jsonb_array_length(specialist_agents) > 0;
```

### 6. Ver agentes que NÃO TÊM especialistas
```sql
SELECT 
  id,
  name,
  created_at,
  updated_at
FROM ai_agents 
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND (
    specialist_agents IS NULL 
    OR specialist_agents = '[]'::jsonb
    OR jsonb_array_length(specialist_agents) = 0
  );
```

---

## 🧪 Teste Completo Passo a Passo

### ANTES de editar:
1. Execute no Supabase SQL Editor:
```sql
SELECT 
  id,
  name,
  jsonb_pretty(specialist_agents) as specialists
FROM ai_agents 
WHERE name = 'Ana';
```

2. Copie o resultado e salve (para comparar depois)

### DURANTE a edição:
1. Abra DevTools do navegador (F12)
2. Vá para a aba "Console"
3. Cole este código para monitorar o estado:
```javascript
// Monitorar mudanças nos especialistas
setInterval(() => {
  const form = document.querySelector('[data-component="AgentConfigForm"]');
  if (form) {
    console.log('✅ Formulário encontrado, verificando estado...');
  }
}, 3000);
```

### DEPOIS de clicar em "Salvar":
1. Verifique o console do navegador para mensagens de:
   - `[AgentConfigForm] 🔄 MODO UPDATE`
   - `[AgentConfigForm] ✅ Agente atualizado`

2. Execute novamente no SQL:
```sql
SELECT 
  id,
  name,
  jsonb_pretty(specialist_agents) as specialists,
  updated_at
FROM ai_agents 
WHERE name = 'Ana';
```

3. Compare o `updated_at` - deve ter mudado!

---

## 🔧 Adicionar Logs Temporários

### Arquivo: /components/AgentConfigForm.tsx

#### 1. No início da função handleSave():
```typescript
const handleSave = async () => {
  console.group('🔍 DEBUG SALVAMENTO');
  console.log('agentId:', agentId);
  console.log('workspaceId:', workspaceId);
  console.log('specialistAgents (estado React):', JSON.stringify(specialistAgents, null, 2));
  console.log('Total de especialistas:', specialistAgents.length);
  console.groupEnd();

  try {
    setSaving(true);
    // ... resto do código ...
```

#### 2. Antes de chamar updateAIAgent():
```typescript
const agentData = {
  workspace_id: workspaceId,
  name: agentName,
  model,
  is_active: isActive,
  default_attendant_type: defaultAttendantType,
  system_prompt: systemPrompt,
  specialist_agents: specialistAgents,
  orchestrator_enabled: orchestratorEnabled,
  crm_auto_update: crmAutoUpdate,
  crm_update_prompt: crmUpdatePrompt || null,
  behavior_config: { /* ... */ },
};

console.group('🔍 DEBUG AGENT DATA');
console.log('agentData completo:', JSON.stringify(agentData, null, 2));
console.log('specialist_agents que será enviado:', JSON.stringify(agentData.specialist_agents, null, 2));
console.groupEnd();

if (agentId) {
  console.log('🔄 Chamando updateAIAgent com ID:', agentId);
  const updated = await updateAIAgent(agentId, agentData);
  console.log('✅ Resposta do updateAIAgent:', updated);
  console.log('✅ specialist_agents retornado:', updated.specialist_agents);
  // ...
}
```

#### 3. Na função updateSpecialistAgent():
```typescript
const updateSpecialistAgent = (id: string, field: keyof SpecialistAgent, value: string | boolean | number) => {
  console.log(`🔧 Atualizando especialista ${id}, campo: ${field}, valor:`, value);
  
  setSpecialistAgents(prev => {
    const updated = prev.map(agent => {
      if (agent.id === id) {
        const newAgent = { ...agent, [field]: value };
        console.log('🔧 Especialista após update:', newAgent);
        return newAgent;
      }
      return agent;
    });
    
    console.log('🔧 Array completo após update:', updated);
    return updated;
  });
  
  setHasChanges(true);
};
```

---

## 📊 Verificar Permissões (RLS)

### Verificar se as políticas do Supabase permitem UPDATE:
```sql
-- Ver políticas da tabela ai_agents
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'ai_agents';
```

### Testar UPDATE manualmente:
```sql
-- Tentar atualizar diretamente (com seu usuário logado)
UPDATE ai_agents 
SET specialist_agents = '[
  {
    "id": "test-1",
    "name": "Teste Manual",
    "description": "teste",
    "function_key": "teste_manual",
    "extra_prompt": "prompt de teste",
    "is_active": true,
    "priority": 0,
    "type": "custom"
  }
]'::jsonb
WHERE name = 'Ana';
```

Se der erro, o problema é de permissão (RLS).

---

## 🎯 Checklist de Investigação

- [ ] **1. Verificar se especialistas existem no banco**
  ```sql
  SELECT specialist_agents FROM ai_agents WHERE name = 'Ana';
  ```

- [ ] **2. Verificar se `updated_at` muda ao salvar**
  - Se não mudar → O UPDATE não está sendo executado

- [ ] **3. Verificar console do navegador**
  - Tem algum erro em vermelho?
  - Tem os logs de "🔄 MODO UPDATE"?

- [ ] **4. Verificar Network tab do DevTools**
  - Filtrar por "ai_agents"
  - Ver se o request tem `specialist_agents` no payload

- [ ] **5. Verificar estado React (React DevTools)**
  - Instalar React DevTools
  - Procurar componente AgentConfigForm
  - Ver state `specialistAgents`

- [ ] **6. Verificar se clicou em "Salvar Alterações"**
  - Simples, mas comum esquecer!

- [ ] **7. Verificar se está editando o agente correto**
  - O agentId mostrado na URL corresponde ao ID no banco?

---

## 🚨 Possíveis Causas e Soluções

### ❌ Causa 1: Dados apenas em memória (não salvou)
**Solução:** Clicar em "Salvar Alterações"

### ❌ Causa 2: Erro silencioso no catch
**Solução:** Adicionar logs no catch:
```typescript
} catch (error: any) {
  console.error('❌ ERRO AO SALVAR:', error);
  console.error('❌ Error message:', error?.message);
  console.error('❌ Error stack:', error?.stack);
  toast.error(error?.message || 'Erro ao salvar agente');
}
```

### ❌ Causa 3: RLS bloqueando UPDATE
**Solução:** Verificar políticas do Supabase

### ❌ Causa 4: Campo não está no tipo UpdateAIAgentData
**Solução:** Verificar `/services/ai-agent-service.ts`:
```typescript
export interface UpdateAIAgentData {
  specialist_agents?: SpecialistAgent[];  // ⬅️ Deve ter isso!
}
```

### ❌ Causa 5: Coluna não existe no banco
**Solução:** Verificar schema:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_agents' 
  AND column_name = 'specialist_agents';
```

### ❌ Causa 6: Cache do navegador
**Solução:** 
- Ctrl + Shift + R (hard reload)
- Ou abrir em aba anônima

---

## 📞 Próximos Passos

1. Execute a query SQL para ver o estado atual
2. Adicione os logs de debug no código
3. Tente editar um especialista
4. Clique em "Salvar Alterações"
5. Veja os logs no console
6. Execute novamente a query SQL
7. Compare os resultados

Se ainda não funcionar, compartilhe:
- Logs do console
- Resultado das queries SQL
- Screenshots da tela
