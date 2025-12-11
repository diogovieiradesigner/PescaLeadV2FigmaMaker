# ✅ Correção: clientName Vazio - Aplicada

## 🔍 Problema Identificado

Os cards do Kanban estão mostrando "Sem nome" mesmo quando email e telefone aparecem corretamente, indicando que:
- ✅ Email e telefone estão sendo carregados corretamente (via `custom_fields`)
- ❌ `client_name` está vindo vazio/null do banco ou sendo perdido na conversão

## ✅ Correções Aplicadas

### **1. Backend (leads.mapper.ts)**
```typescript
// ✅ ANTES
clientName: dbLead.client_name || '',

// ✅ DEPOIS
clientName: (dbLead.client_name && dbLead.client_name !== 'Sem nome') 
  ? dbLead.client_name 
  : '',
```
- Adicionado log de warning se `client_name` estiver vazio
- Filtro para não retornar "Sem nome" literal

### **2. Frontend (useKanbanData.ts)**
```typescript
// ✅ ANTES
clientName: lead.clientName,

// ✅ DEPOIS
clientName: lead.clientName || lead.client_name || '',
```
- Adicionado fallback para `client_name` (snake_case)
- Adicionado log de warning se `clientName` estiver vazio

### **3. Frontend (funnels-service.ts)**
```typescript
// ✅ ANTES
clientName: lead.clientName,

// ✅ DEPOIS
clientName: lead.clientName || lead.client_name || '',
```
- Adicionado fallback para `client_name` (snake_case)
- Adicionado log de warning se `clientName` estiver vazio

### **4. Backend (leads.service.ts)**
- Adicionado logs detalhados antes e depois do mapeamento
- Logs mostram se `client_name` está vazio no banco

## 🔍 Logs Adicionados

### **Backend:**
- `[getColumnLeads] ⚠️ Lead sem client_name válido no banco` - Se `client_name` estiver vazio no banco
- `[getColumnLeads] ⚠️ Lead sem clientName após mapeamento` - Se `clientName` estiver vazio após mapeamento
- `[LEADS MAPPER] ⚠️ Lead sem client_name válido` - Se `client_name` estiver vazio no mapper

### **Frontend:**
- `[KANBAN DATA] ⚠️ Lead sem clientName` - Se `clientName` estiver vazio na conversão
- `[FUNNELS SERVICE] ⚠️ Lead sem clientName` - Se `clientName` estiver vazio no serviço

## 🚀 Próximos Passos

### **1. Fazer Deploy da Edge Function**
```bash
cd supabase/functions/kanban-api
supabase functions deploy kanban-api
```

### **2. Recarregar a Página**
- Recarregar o frontend
- Verificar console do navegador para logs
- Verificar logs da Edge Function no Supabase Dashboard

### **3. Verificar Logs**

**No Console do Navegador:**
- Procurar por `⚠️ Lead sem clientName`
- Verificar qual lead está sem nome
- Verificar se o problema está na conversão

**Nos Logs da Edge Function:**
- Procurar por `⚠️ Lead sem client_name válido no banco`
- Verificar se o problema está no banco de dados

### **4. Se o Problema Estiver no Banco**

Rodar query para verificar:
```sql
SELECT 
  id, 
  client_name, 
  company,
  created_at
FROM leads 
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND (client_name IS NULL OR client_name = '' OR client_name = 'Sem nome')
LIMIT 20;
```

Se houver leads sem nome, aplicar a migration:
```sql
-- Verificar se a migration foi aplicada
SELECT * FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%fix_client_name%';
```

## 📝 Resumo

- ✅ Logs adicionados em todos os pontos críticos
- ✅ Fallbacks adicionados para `client_name` (snake_case)
- ✅ Filtro para não retornar "Sem nome" literal
- ⏳ **Aguardando deploy e verificação dos logs**

---

**Status:** ✅ Correções aplicadas! Fazer deploy e verificar logs para identificar a causa raiz.

