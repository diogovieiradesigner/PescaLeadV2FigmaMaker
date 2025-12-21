# 🔧 Guia Frontend: Como Mover Leads de Extração

## 🎯 Problema Resolvido

O erro **"Unauthorized - Invalid token"** ocorre porque a função `queue_lead_migration` é uma **função RPC do Supabase**, não um endpoint HTTP. Ela precisa ser chamada usando o **Supabase Client** com autenticação adequada.

---

## ✅ Solução: Como Chamar do Frontend

### **1. Usar Supabase Client com Token de Autenticação**

A função `queue_lead_migration` é uma **RPC function** do Supabase. Você deve chamá-la usando o método `.rpc()` do Supabase Client.

### **2. Código Exemplo (TypeScript/JavaScript)**

```typescript
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase Client com token de autenticação
const supabase = createClient(
  'https://nlbcwaxkeaddfocigwuk.supabase.co',
  'SUA_ANON_KEY', // Use a anon key do Supabase
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Função para mover leads de uma extração
async function moverLeadsExtracao(
  runId: string,
  funnelId: string,
  columnId: string
) {
  try {
    // Obter sessão do usuário autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Usuário não autenticado. Faça login primeiro.');
    }

    // Chamar função RPC com autenticação
    const { data, error } = await supabase.rpc('queue_lead_migration', {
      p_run_id: runId,
      p_funnel_id: funnelId,
      p_column_id: columnId,
      p_batch_size: 100 // Opcional, padrão é 100
    });

    if (error) {
      console.error('Erro ao enfileirar movimentação:', error);
      throw new Error(`Erro: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Erro desconhecido');
    }

    return {
      success: true,
      message: data.message,
      messageId: data.message_id,
      runId: data.run_id,
      runName: data.run_name
    };

  } catch (error) {
    console.error('Erro ao mover leads:', error);
    throw error;
  }
}

// Exemplo de uso
async function exemploUso() {
  try {
    const resultado = await moverLeadsExtracao(
      '81bfc716-3b7c-4b2b-bb13-adde77adf59d', // run_id
      '3657418b-d030-48d2-ba1b-87793dcd1d16', // funnel_id
      'dae0e522-248e-4528-a458-8941c310158b'  // column_id
    );

    console.log('✅ Movimentação enfileirada:', resultado.message);
    console.log('📊 Run:', resultado.runName);
    
    // A movimentação será processada automaticamente pela fila
    // Você pode verificar o progresso usando get_lead_migration_queue_status
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}
```

---

## 🔑 Autenticação: Qual Token Usar?

### **Opção 1: Token de Sessão do Usuário (Recomendado)**

```typescript
// O Supabase Client gerencia automaticamente o token de sessão
const { data: { session } } = await supabase.auth.getSession();

// O token é enviado automaticamente nas requisições RPC
const { data, error } = await supabase.rpc('queue_lead_migration', { ... });
```

**Vantagens:**
- ✅ Seguro (usa token do usuário autenticado)
- ✅ Respeita RLS (Row Level Security)
- ✅ Valida permissões do usuário
- ✅ Gerenciamento automático de refresh

### **Opção 2: Service Role Key (NÃO RECOMENDADO para frontend)**

```typescript
// ⚠️ NUNCA use service_role_key no frontend!
// Ela bypassa todas as políticas de segurança
```

**Por que não usar:**
- ❌ Expõe credenciais sensíveis
- ❌ Bypassa RLS
- ❌ Risco de segurança crítico

---

## 📋 Checklist de Implementação

### **1. Configuração do Supabase Client**

```typescript
// ✅ CORRETO
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY, // Use anon key, não service role!
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

### **2. Verificar Autenticação**

```typescript
// ✅ Sempre verificar se usuário está autenticado
const { data: { session }, error } = await supabase.auth.getSession();

if (!session) {
  // Redirecionar para login ou mostrar erro
  throw new Error('Usuário não autenticado');
}
```

### **3. Chamar Função RPC**

```typescript
// ✅ CORRETO - Usar .rpc() com parâmetros nomeados
const { data, error } = await supabase.rpc('queue_lead_migration', {
  p_run_id: runId,
  p_funnel_id: funnelId,
  p_column_id: columnId,
  p_batch_size: 100 // Opcional
});
```

### **4. Tratamento de Erros**

```typescript
if (error) {
  // Erro de conexão/autenticação
  if (error.code === 'PGRST301' || error.message.includes('Unauthorized')) {
    // Token inválido ou expirado
    await supabase.auth.signOut();
    // Redirecionar para login
  }
  throw new Error(error.message);
}

if (!data?.success) {
  // Erro retornado pela função RPC
  throw new Error(data.error || 'Erro desconhecido');
}
```

---

## 🔍 Verificar Status da Movimentação

### **Função RPC: `get_lead_migration_queue_status()`**

```typescript
async function verificarStatusMovimentacao() {
  const { data, error } = await supabase.rpc('get_lead_migration_queue_status');

  if (error) {
    console.error('Erro ao verificar status:', error);
    return null;
  }

  return {
    queueName: data.queue_name,
    totalMessages: data.total_messages,
    oldestMessage: data.oldest_message,
    newestMessage: data.newest_message
  };
}
```

---

## 🎨 Exemplo Completo com React

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Seu cliente Supabase configurado

export function useMoveLeads() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moveLeads = async (
    runId: string,
    funnelId: string,
    columnId: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Chamar função RPC
      const { data, error: rpcError } = await supabase.rpc('queue_lead_migration', {
        p_run_id: runId,
        p_funnel_id: funnelId,
        p_column_id: columnId,
        p_batch_size: 100
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao mover leads');
      }

      return {
        success: true,
        message: data.message,
        messageId: data.message_id
      };

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { moveLeads, loading, error };
}

// Uso no componente
function MeuComponente() {
  const { moveLeads, loading, error } = useMoveLeads();

  const handleMove = async () => {
    try {
      const resultado = await moveLeads(
        'run-id-aqui',
        'funnel-id-aqui',
        'column-id-aqui'
      );
      
      console.log('✅ Sucesso:', resultado.message);
    } catch (err) {
      console.error('❌ Erro:', err);
    }
  };

  return (
    <button onClick={handleMove} disabled={loading}>
      {loading ? 'Movendo...' : 'Mover Leads'}
    </button>
  );
}
```

---

## ⚠️ Erros Comuns e Soluções

### **Erro 1: "Unauthorized - Invalid token"**

**Causa:** Token não está sendo enviado ou está inválido/expirado.

**Solução:**
```typescript
// Verificar se há sessão ativa
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  // Fazer login novamente
  await supabase.auth.signInWithPassword({ email, password });
}
```

### **Erro 2: "Function queue_lead_migration does not exist"**

**Causa:** Migration não foi aplicada ou função não existe.

**Solução:** Verificar se a migration `create_lead_migration_queue.sql` foi aplicada.

### **Erro 3: "Access denied"**

**Causa:** Usuário não tem permissão para acessar o workspace.

**Solução:** Verificar se o usuário é membro do workspace e tem permissões adequadas.

---

## 📚 Referências

- **Função RPC:** `queue_lead_migration(p_run_id, p_funnel_id, p_column_id, p_batch_size)`
- **Migration:** `supabase/migrations/create_lead_migration_queue.sql`
- **Documentação:** `docs/extracao/SISTEMA-FILA-MOVIMENTACAO-LEADS.md`

---

## ✅ Resumo

1. ✅ Use **Supabase Client** com **anon key** (nunca service role no frontend)
2. ✅ Verifique se usuário está **autenticado** antes de chamar RPC
3. ✅ Use método **`.rpc()`** para chamar `queue_lead_migration`
4. ✅ Passe parâmetros **nomeados** (`p_run_id`, `p_funnel_id`, etc.)
5. ✅ Trate erros de **autenticação** e **validação**
6. ✅ A movimentação é **assíncrona** - use `get_lead_migration_queue_status()` para verificar progresso

