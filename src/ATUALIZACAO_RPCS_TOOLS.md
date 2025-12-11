# ✅ ATUALIZAÇÃO: Uso de RPCs para Gerenciamento de Ferramentas

## 🎯 Mudanças Implementadas

O componente `AgentSystemToolsManager` foi atualizado para usar **RPCs (Remote Procedure Calls)** ao invés de queries diretas nas tabelas. Isso resolve problemas de permissão RLS (Row Level Security).

---

## 🔄 Antes vs Depois

### **1. Toggle Individual de Ferramenta**

#### ❌ ANTES (Query direta):
```typescript
const { error } = await supabase
  .from('ai_agent_system_tools')
  .upsert({
    agent_id: agentId,
    system_tool_id: toolId,
    is_enabled: !currentlyEnabled
  }, { onConflict: 'agent_id,system_tool_id' });
```

#### ✅ AGORA (RPC):
```typescript
const { error } = await supabase.rpc('toggle_agent_system_tool', {
  p_agent_id: agentId,
  p_tool_id: toolId,
  p_enabled: !currentlyEnabled
});
```

---

### **2. Habilitar Todas as Ferramentas**

#### ✅ JÁ ESTAVA CORRETO:
```typescript
const { error } = await supabase.rpc('enable_all_system_tools_for_agent', { 
  p_agent_id: agentId 
});
```

---

### **3. Desabilitar Todas as Ferramentas**

#### ❌ ANTES (Query direta):
```typescript
const { error } = await supabase
  .from('ai_agent_system_tools')
  .update({ is_enabled: false })
  .eq('agent_id', agentId);
```

#### ✅ AGORA (RPC):
```typescript
const { error } = await supabase.rpc('disable_all_system_tools_for_agent', { 
  p_agent_id: agentId 
});
```

---

## 📋 RPCs Utilizadas

O componente agora depende de **3 RPCs** que devem existir no Supabase:

### **1. `toggle_agent_system_tool`**
```sql
CREATE OR REPLACE FUNCTION toggle_agent_system_tool(
  p_agent_id UUID,
  p_tool_id UUID,
  p_enabled BOOLEAN
)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_agent_system_tools (agent_id, system_tool_id, is_enabled)
  VALUES (p_agent_id, p_tool_id, p_enabled)
  ON CONFLICT (agent_id, system_tool_id)
  DO UPDATE SET is_enabled = p_enabled;
END;
$$ LANGUAGE plpgsql;
```

### **2. `enable_all_system_tools_for_agent`**
```sql
CREATE OR REPLACE FUNCTION enable_all_system_tools_for_agent(
  p_agent_id UUID
)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_agent_system_tools (agent_id, system_tool_id, is_enabled)
  SELECT p_agent_id, id, true
  FROM ai_system_tools
  WHERE is_active = true
  ON CONFLICT (agent_id, system_tool_id)
  DO UPDATE SET is_enabled = true;
END;
$$ LANGUAGE plpgsql;
```

### **3. `disable_all_system_tools_for_agent`**
```sql
CREATE OR REPLACE FUNCTION disable_all_system_tools_for_agent(
  p_agent_id UUID
)
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_agent_system_tools
  SET is_enabled = false
  WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ Benefícios das RPCs

### **1. Segurança**
- ✅ `SECURITY DEFINER` permite que a função execute com permissões elevadas
- ✅ Usuários não precisam de acesso direto às tabelas
- ✅ Bypass de RLS (Row Level Security) de forma controlada

### **2. Encapsulamento**
- ✅ Lógica de negócio centralizada no banco
- ✅ Validações podem ser feitas na RPC
- ✅ Mais fácil de auditar e manter

### **3. Performance**
- ✅ Operações atômicas no banco
- ✅ Menos roundtrips entre frontend e backend
- ✅ Transações gerenciadas internamente

---

## 🔍 Queries que AINDA são Diretas (OK)

### **Buscar ferramentas disponíveis:**
```typescript
const { data: allTools } = await supabase
  .from('ai_system_tools')
  .select('id, name, display_name, description, category, is_active')
  .eq('is_active', true)
  .order('category, name');
```
**Por quê?** Leitura simples, não precisa de permissões especiais.

### **Buscar ferramentas habilitadas do agente:**
```typescript
const { data: agentTools } = await supabase
  .from('ai_agent_system_tools')
  .select('system_tool_id, is_enabled')
  .eq('agent_id', agentId);
```
**Por quê?** Leitura filtrada pelo agentId, não modifica dados.

---

## 🚀 Status Final

### ✅ Componente Atualizado
- ✅ `toggleTool()` → usa `toggle_agent_system_tool`
- ✅ `enableAll()` → usa `enable_all_system_tools_for_agent`
- ✅ `disableAll()` → usa `disable_all_system_tools_for_agent`

### ✅ Testes Necessários
1. Habilitar ferramenta individual
2. Desabilitar ferramenta individual
3. Habilitar todas as ferramentas
4. Desabilitar todas as ferramentas
5. Verificar que estado persiste após reload

---

## 📝 Confirmação

Segundo o usuário, as 3 RPCs **já estão criadas e funcionando** no Supabase. O componente está pronto para uso! 🎉
