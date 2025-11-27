# 🚀 GUIA DE EXECUÇÃO DAS MIGRATIONS

**Projeto:** CRM Kanban - Supabase Database  
**Total de Migrations:** 5 arquivos obrigatórios  
**Tempo estimado:** 5-10 minutos  
**Projeto ID:** nlbcwaxkeaddfocigwuk

---

## ⚠️ **IMPORTANTE - LEIA ANTES DE EXECUTAR**

### **O QUE EXECUTAR:**
✅ Arquivos numerados (001, 002, 003, 004, 005)  
❌ **NÃO** executar: README.md, example_queries.sql, verify.sql (esses são apenas para referência)

### **ONDE EXECUTAR:**
1. Acesse: https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk
2. Menu lateral → **SQL Editor**
3. Clique em **"New query"**

---

## 📋 **ORDEM DE EXECUÇÃO (OBRIGATÓRIA)**

Execute **EXATAMENTE** nesta ordem:

```
1️⃣ 001_initial_schema.sql       → Criar 19 tabelas + estrutura base
2️⃣ 002_rls_policies.sql         → Aplicar segurança (14 tabelas antigas)
3️⃣ 003_triggers.sql             → Ativar automações
4️⃣ 004_performance_indexes.sql  → Otimizar performance
5️⃣ 005_rls_new_tables.sql       → Segurança (5 tabelas novas + agents)
```

### **Por que essa ordem?**
- `001` cria as tabelas e foreign keys
- `002` precisa das tabelas existirem para criar policies
- `003` precisa das tabelas para criar triggers
- `004` precisa das tabelas para criar índices
- `005` precisa das tabelas e funções RLS do `002`

---

## 🎯 **PASSO A PASSO DETALHADO**

### **MIGRATION 1/5: Estrutura Base**

1. Abra o arquivo: `001_initial_schema.sql`
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)
3. No Supabase SQL Editor:
   - Cole o código (Ctrl+V)
   - Clique em **"Run"** (ou Ctrl+Enter)
   - Aguarde: ~10-15 segundos

**✅ Sucesso esperado:**
```
Success. No rows returned
```

**❌ Se der erro:**
- Verifique se já existe alguma tabela com mesmo nome
- Delete as tabelas existentes se necessário
- Execute novamente

**O que foi criado:**
- 19 tabelas relacionais
- 25+ foreign keys
- 20+ unique constraints
- 60+ índices básicos
- Comentários em todos os campos

---

### **MIGRATION 2/5: Segurança (Parte 1)**

1. Abra: `002_rls_policies.sql`
2. Copie todo o conteúdo
3. Cole e execute no SQL Editor
4. Aguarde: ~5-8 segundos

**✅ Sucesso esperado:**
```
Success. No rows returned
```

**O que foi criado:**
- RLS habilitado em 14 tabelas
- 5 funções helper (is_workspace_member, has_write_permission, etc)
- 51 policies CRUD
- Segurança multi-tenancy ativada

---

### **MIGRATION 3/5: Automações**

1. Abra: `003_triggers.sql`
2. Copie todo o conteúdo
3. Cole e execute no SQL Editor
4. Aguarde: ~3-5 segundos

**✅ Sucesso esperado:**
```
Success. No rows returned
```

**O que foi criado:**
- 15 triggers automáticos
- Função update_updated_at_column()
- Auto-update de timestamps
- Auditoria automática
- Validações de integridade

---

### **MIGRATION 4/5: Performance**

1. Abra: `004_performance_indexes.sql`
2. Copie todo o conteúdo
3. Cole e execute no SQL Editor
4. Aguarde: ~5-8 segundos

**✅ Sucesso esperado:**
```
Success. No rows returned
```

**O que foi criado:**
- 10 índices compostos críticos
- 3 índices parciais
- 4 GIN indexes (arrays + full-text)
- UNIQUE constraint adicional
- Otimização de queries (10-100x mais rápido!)

---

### **MIGRATION 5/5: Segurança (Parte 2)**

1. Abra: `005_rls_new_tables.sql`
2. Copie todo o conteúdo
3. Cole e execute no SQL Editor
4. Aguarde: ~3-5 segundos

**✅ Sucesso esperado:**
```
Success. No rows returned
```

**O que foi criado:**
- RLS em 5 tabelas novas
- 21 policies adicionais
- Proteção para: conversations, messages, audit_log, funnel_stats, inbox_instances
- RLS completo para agents
- **100% de cobertura de segurança!**

---

## ✅ **VERIFICAÇÃO FINAL**

Após executar as 5 migrations, execute este comando para verificar:

```sql
-- Cole isso no SQL Editor e execute:

-- 1. Verificar tabelas criadas
SELECT 
  '✅ Tabelas' as item,
  COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'users', 'workspaces', 'workspace_members', 'funnels', 
  'funnel_columns', 'leads', 'lead_activities', 'lead_attachments',
  'custom_fields', 'lead_custom_values', 'instances', 'inboxes',
  'inbox_instances', 'agents', 'workspace_invites', 
  'conversations', 'messages', 'audit_log', 'funnel_stats'
);
-- Resultado esperado: total = 19

-- 2. Verificar índices
SELECT 
  '✅ Índices' as item,
  COUNT(*) as total
FROM pg_indexes 
WHERE schemaname = 'public';
-- Resultado esperado: total >= 90

-- 3. Verificar RLS habilitado
SELECT 
  '✅ RLS Habilitado' as item,
  COUNT(*) as total
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
-- Resultado esperado: total = 19

-- 4. Verificar policies
SELECT 
  '✅ Policies' as item,
  COUNT(*) as total
FROM pg_policies 
WHERE schemaname = 'public';
-- Resultado esperado: total >= 72

-- 5. Verificar triggers
SELECT 
  '✅ Triggers' as item,
  COUNT(DISTINCT trigger_name) as total
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
-- Resultado esperado: total >= 15
```

**✅ Resultado Esperado:**
```
item                | total
--------------------|-------
✅ Tabelas          | 19
✅ Índices          | 90+
✅ RLS Habilitado   | 19
✅ Policies         | 72+
✅ Triggers         | 15+
```

---

## 🔍 **SOLUÇÃO DE PROBLEMAS**

### **Erro: "relation already exists"**
**Causa:** Tabela já existe de execução anterior  
**Solução:**
```sql
-- Deletar TODAS as tabelas (cuidado, isso apaga tudo!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Depois execute as 5 migrations novamente
```

### **Erro: "function already exists"**
**Causa:** Função já existe  
**Solução:** Ignore, o código usa `CREATE OR REPLACE FUNCTION`

### **Erro: "permission denied"**
**Causa:** Você não está usando o usuário correto  
**Solução:** Execute como postgres ou service_role

### **Erro: "foreign key violation"**
**Causa:** Ordem de execução incorreta  
**Solução:** Execute na ordem 001 → 002 → 003 → 004 → 005

---

## 📊 **CHECKLIST DE EXECUÇÃO**

Marque conforme for executando:

```
Preparação:
[ ] Acessei o Supabase Dashboard
[ ] Estou no projeto nlbcwaxkeaddfocigwuk
[ ] Abri o SQL Editor

Execução:
[ ] ✅ 001_initial_schema.sql       (19 tabelas)
[ ] ✅ 002_rls_policies.sql         (51 policies)
[ ] ✅ 003_triggers.sql             (15 triggers)
[ ] ✅ 004_performance_indexes.sql  (10 índices)
[ ] ✅ 005_rls_new_tables.sql       (21 policies)

Verificação:
[ ] Executei o script de verificação
[ ] 19 tabelas criadas ✅
[ ] 90+ índices criados ✅
[ ] RLS em 19/19 tabelas ✅
[ ] 72+ policies ativas ✅
[ ] 15+ triggers ativos ✅

Conclusão:
[ ] ✅ TUDO FUNCIONANDO!
```

---

## 📁 **ARQUIVOS DE REFERÊNCIA (NÃO EXECUTAR)**

Esses arquivos são apenas para consulta:

### **README.md**
- Documentação geral das migrations
- Não executar

### **example_queries.sql**
- Exemplos de queries comuns
- Use para testar depois das migrations
- Não é obrigatório executar

### **verify.sql**
- Queries de verificação
- Já incluídas na seção "Verificação Final" acima
- Não é obrigatório executar

---

## 🎯 **PRÓXIMOS PASSOS (APÓS MIGRATIONS)**

1. ✅ **Testar Inserção de Dados**
```sql
-- Exemplo: Criar primeiro usuário e workspace
-- (use example_queries.sql como referência)
```

2. ✅ **Atualizar Backend**
- Deletar `kanban-helpers.ts` (usa KV)
- Reescrever usando Supabase client
- Queries SQL diretas

3. ✅ **Testar Funcionalidades**
- Signup/Login
- Criar workspace
- Convidar membros
- Criar funis e leads
- Sistema de chat
- Drag and drop

4. ✅ **Monitorar Performance**
- Usar Dashboard → Database → Query Performance
- Verificar índices sendo usados

---

## 💡 **DICAS IMPORTANTES**

### **✅ FAÇA:**
- Execute na ordem correta (001 → 005)
- Leia as mensagens de erro se houver
- Execute a verificação final
- Faça backup antes se tiver dados existentes

### **❌ NÃO FAÇA:**
- Pular migrations
- Executar fora de ordem
- Modificar o código das migrations
- Executar duas vezes (pode dar erro de duplicação)

---

## 📞 **SUPORTE**

**Se algo der errado:**
1. Copie a mensagem de erro completa
2. Verifique qual migration falhou
3. Verifique se executou na ordem correta
4. Se necessário, delete tudo e recomece

**Mensagem de erro comum:**
```
ERROR: relation "table_name" already exists
```
**Solução:** Tabela já existe, pode ignorar OU deletar schema e reexecutar

---

## 🎉 **SUCESSO!**

Se todas as verificações passaram, você tem:

```
✅ 19 tabelas relacionais
✅ 90+ índices otimizados
✅ 72+ RLS policies (100% seguro)
✅ 15 triggers automáticos
✅ Sistema pronto para produção!
```

**Pode começar a desenvolver!** 🚀

---

**Tempo estimado total:** 5-10 minutos  
**Dificuldade:** Fácil (copiar e colar)  
**Reversível:** Sim (DROP SCHEMA public CASCADE)
