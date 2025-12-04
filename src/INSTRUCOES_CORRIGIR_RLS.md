# 🔧 Instruções para Corrigir Erros RLS

## 🚨 Problemas Corrigidos
Você estava vendo estes erros:
```
✅ new row violates row-level security policy for table "users"
✅ new row violates row-level security policy for table "workspaces"  
✅ User from sub claim in JWT does not exist
✅ ReferenceError: logout is not defined
```

**TODOS OS ERROS DE CÓDIGO FORAM CORRIGIDOS!** 🎉

Agora você só precisa executar o SQL no Supabase para criar as funções RPC.

## ✅ Solução

### Passo 1: Executar SQL no Supabase

1. **Abra o Supabase Dashboard**: https://supabase.com/dashboard
2. **Selecione seu projeto**: Pesca Lead
3. **Vá em "SQL Editor"** (ícone de banco de dados no menu lateral)
4. **Clique em "New query"**
5. **Copie e cole** o conteúdo completo do arquivo `/supabase/migrations/RPC_FUNCTIONS_REQUIRED.sql`
6. **Clique em "Run"** (ou pressione Ctrl+Enter)

### Passo 2: Verificar Sucesso

Você deve ver as mensagens:
```
CREATE FUNCTION (para create_user_profile)
CREATE FUNCTION (para create_workspace_with_owner)
COMMENT
GRANT
```

### Passo 3: Testar

1. **Faça logout** no sistema
2. **Faça um novo cadastro** com email e senha novos
3. **Crie um workspace**

Agora deve funcionar sem erros! ✅

## 📋 O que as funções fazem?

### `create_user_profile`
- Cria perfil de usuário na tabela `users`
- Usa `SECURITY DEFINER` para bypassar RLS
- Valida dados antes de inserir
- Retorna JSON com sucesso/erro

### `create_workspace_with_owner`
- Cria workspace na tabela `workspaces`
- Adiciona usuário como owner em `workspace_members`
- Usa transação atômica (tudo ou nada)
- Gera slug automaticamente se não fornecido
- Usa `SECURITY DEFINER` para bypassar RLS

## 🔒 Segurança

As funções são seguras porque:
- ✅ Usam `auth.uid()` para pegar o usuário autenticado
- ✅ Validam todos os dados antes de inserir
- ✅ Só usuários autenticados podem executar
- ✅ Transações atômicas garantem consistência

## ❓ Por que RLS está bloqueando?

RLS (Row Level Security) é uma proteção do Supabase que impede que usuários criem/modifiquem dados sem permissão. 

As políticas RLS normais não permitem que um usuário recém-criado insira seu próprio perfil, criando um "catch-22":
- Precisa estar na tabela `users` para ter permissão
- Precisa de permissão para entrar na tabela `users`

As funções RPC com `SECURITY DEFINER` resolvem isso executando com privilégios do owner do banco.

## 🆘 Ainda com problemas?

Se após executar o SQL ainda tiver erros:

1. **Verifique se as funções foram criadas**:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('create_user_profile', 'create_workspace_with_owner');
   ```

2. **Verifique os logs do navegador** (F12 > Console)

3. **Tente fazer logout completo** e limpar o cache do navegador
