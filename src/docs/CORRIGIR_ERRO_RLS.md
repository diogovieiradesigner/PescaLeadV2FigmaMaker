# 🔧 Correção: "permission denied for table workspace_members"

## 📋 Problema

```
Error: Failed to get members: permission denied for table workspace_members
```

---

## 🔍 Causa Raiz

A tabela `workspace_members` no Supabase tem **Row Level Security (RLS)** ativado, mas:
- ❌ Não tem políticas configuradas para permitir acesso do `SERVICE_ROLE_KEY`
- ❌ As políticas existentes bloqueiam até queries com privilégios de admin

---

## ✅ Solução (3 Passos)

### **Passo 1: Executar SQL no Supabase Dashboard**

1. Abra seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **"New query"**
4. Cole o SQL abaixo e clique em **"Run"**

```sql
-- ============================================
-- FIX: Workspace Members RLS Permissions
-- ============================================

-- 1. Criar função RPC para get workspace members
CREATE OR REPLACE FUNCTION get_workspace_members(p_workspace_id UUID)
RETURNS TABLE (
  workspace_id UUID,
  user_id UUID,
  role TEXT,
  permissions JSONB,
  joined_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID,
  user_name TEXT,
  user_email TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.workspace_id,
    wm.user_id,
    wm.role,
    wm.permissions,
    wm.joined_at,
    wm.invited_by,
    u.name as user_name,
    u.email as user_email
  FROM workspace_members wm
  LEFT JOIN users u ON u.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id;
END;
$$;

-- 2. Dar permissões para usar a função
GRANT EXECUTE ON FUNCTION get_workspace_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_members(UUID) TO service_role;

-- 3. Adicionar política para Service Role bypass RLS
CREATE POLICY IF NOT EXISTS "Service role bypass RLS"
  ON workspace_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Adicionar política para usuários verem membros dos seus workspaces
CREATE POLICY IF NOT EXISTS "Users can view members of their workspaces"
  ON workspace_members
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- 5. Adicionar política para admins/owners gerenciarem membros
CREATE POLICY IF NOT EXISTS "Admins can manage workspace members"
  ON workspace_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );
```

---

### **Passo 2: Verificar se a Função Foi Criada**

Execute este SQL para verificar:

```sql
-- Listar funções criadas
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'get_workspace_members'
  AND routine_schema = 'public';
```

**Resultado esperado:**
```
routine_name            | routine_type | security_type
------------------------|--------------|---------------
get_workspace_members   | FUNCTION     | DEFINER
```

---

### **Passo 3: Verificar Políticas RLS**

Execute este SQL para listar as políticas:

```sql
-- Listar políticas da tabela
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'workspace_members'
ORDER BY policyname;
```

**Resultado esperado:**
```
policyname                                  | permissive | roles          | cmd
--------------------------------------------|------------|----------------|------
Admins can manage workspace members         | PERMISSIVE | public         | ALL
Service role bypass RLS                     | PERMISSIVE | service_role   | ALL
Users can view members of their workspaces  | PERMISSIVE | public         | SELECT
```

---

## 🔧 O Que Foi Corrigido no Código

### **1. Servidor - Fallback para RPC**
**Arquivo:** `/supabase/functions/server/index.tsx`

```tsx
// ✅ Tenta usar RPC primeiro (bypass RLS)
const { data: members, error } = await supabase.rpc('get_workspace_members', {
  p_workspace_id: workspaceId
});

// ✅ Se RPC falhar, tenta query direta (com SERVICE_ROLE_KEY)
if (error) {
  const { data: directMembers, error: directError } = await supabase
    .from('workspace_members')
    .select(...)
    .eq('workspace_id', workspaceId);
}
```

**Benefícios:**
- ✅ RPC com `SECURITY DEFINER` bypass RLS
- ✅ Fallback para query direta se RPC não existir
- ✅ Logs detalhados para debugging

---

### **2. Cliente Supabase - Logs de Debug**
**Arquivo:** `/supabase/functions/server/supabase-client.ts`

```tsx
console.log('🔑 Creating service client with key:', serviceRoleKey.substring(0, 20) + '...');
```

**Benefício:** Confirma que está usando SERVICE_ROLE_KEY correto

---

## 📊 Como Funciona

### **Antes da Correção:**
```
Frontend → API → Supabase Client (SERVICE_ROLE_KEY)
                       ↓
                 workspace_members table (RLS ATIVO)
                       ↓
                 ❌ BLOQUEADO (sem política para service_role)
```

### **Depois da Correção:**
```
Frontend → API → Supabase Client (SERVICE_ROLE_KEY)
                       ↓
                 RPC: get_workspace_members()
                       ↓
                 SECURITY DEFINER (bypass RLS)
                       ↓
                 ✅ SUCESSO - Retorna membros
```

---

## 🧪 Teste Manual

Depois de executar o SQL, teste manualmente:

```sql
-- Testar a função RPC
SELECT * FROM get_workspace_members('SEU_WORKSPACE_ID_AQUI');
```

**Substitua `SEU_WORKSPACE_ID_AQUI`** pelo ID real de um workspace.

**Resultado esperado:**
```
workspace_id | user_id | role  | permissions | joined_at | invited_by | user_name | user_email
-------------|---------|-------|-------------|-----------|------------|-----------|------------
abc123...    | def456..| owner | []          | 2024-...  | def456...  | João      | joao@...
```

---

## 🎯 Checklist de Verificação

Após executar o SQL, marque os itens:

- [ ] **SQL executado com sucesso** no Supabase Dashboard
- [ ] **Função `get_workspace_members` criada** (verificado com query)
- [ ] **3 políticas RLS criadas** (verificado com query)
- [ ] **Teste manual da função passou** (retornou membros)
- [ ] **Página de configurações carrega** sem erro no frontend
- [ ] **Console não mostra erro** "permission denied"

---

## 🚨 Troubleshooting

### Erro: "function get_workspace_members does not exist"

**Solução:**
```sql
-- Verifique se a função foi criada no schema correto
SELECT routine_schema, routine_name 
FROM information_schema.routines
WHERE routine_name LIKE '%workspace_members%';

-- Se não encontrar, execute o CREATE FUNCTION novamente
```

---

### Erro: "policy already exists"

**Solução:**
```sql
-- Remover políticas existentes antes de recriar
DROP POLICY IF EXISTS "Service role bypass RLS" ON workspace_members;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON workspace_members;

-- Depois, execute o CREATE POLICY novamente
```

---

### Ainda aparece "permission denied"

**Diagnóstico:**

1. **Verificar se SERVICE_ROLE_KEY está correto:**
   - Vá em Supabase Dashboard > Settings > API
   - Copie o `service_role key` (secret)
   - Verifique se está configurado corretamente nas variáveis de ambiente

2. **Verificar logs do servidor:**
   - Procure por `[Supabase] Service client singleton created`
   - Verifique se a chave impressa começa com o prefixo correto

3. **Desabilitar RLS temporariamente (NÃO RECOMENDADO EM PRODUÇÃO):**
   ```sql
   ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
   ```

---

## 📝 Arquivos Relacionados

1. ✅ `/supabase/migrations/fix_workspace_members_rls.sql` - SQL completo
2. ✅ `/supabase/functions/server/index.tsx` - Lógica de fallback RPC
3. ✅ `/supabase/functions/server/supabase-client.ts` - Logs de debug
4. 📄 `/docs/CORRIGIR_ERRO_RLS.md` - Este documento

---

## 🎓 Entendendo RLS (Row Level Security)

**O que é RLS?**
- Sistema de segurança do PostgreSQL/Supabase
- Filtra linhas baseado em políticas (policies)
- Protege dados mesmo com acesso direto ao banco

**Por que SERVICE_ROLE_KEY precisa de política?**
- Por padrão, RLS bloqueia TUDO quando ativado
- Mesmo o `service_role` precisa de política explícita `USING (true)`
- Ou usar funções com `SECURITY DEFINER` que bypass RLS

**Alternativas:**
1. **RPC com SECURITY DEFINER** ← Recomendado (usado aqui)
2. **Política para service_role** ← Funciona também
3. **Desabilitar RLS** ← NÃO recomendado (inseguro)

---

## ✅ Status

**Erro Corrigido:** ✅ "permission denied for table workspace_members"

**Melhorias Adicionadas:**
- ✅ Função RPC para bypass RLS
- ✅ Políticas RLS apropriadas
- ✅ Fallback para query direta
- ✅ Logs de debug detalhados

**Data:** 27/11/2024  
**Versão:** 1.0.0

---

## 📞 Dúvidas?

Se ainda tiver problemas após seguir este guia:

1. Copie os logs completos do console do navegador
2. Copie os logs do servidor (procure por `[GET_MEMBERS]`)
3. Execute as queries de verificação e copie os resultados
4. Reporte com essas informações
