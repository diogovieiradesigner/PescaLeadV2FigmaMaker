# 🔍 Diagnóstico: clientName Vazio nos Cards

## 📋 Problema

Os cards do Kanban estão mostrando "Sem nome" mesmo quando os outros dados (email, telefone) estão aparecendo corretamente.

## 🔍 Análise

### **1. Fluxo de Dados**

```
Banco de Dados (leads.client_name)
  ↓
Backend API (leads.service.ts → getColumnLeads)
  ↓
Mapper (leads.mapper.ts → mapLeadFromDB)
  ↓
API Response (JSON com clientName)
  ↓
Frontend (funnels-service.ts → getAllColumnsLeads)
  ↓
Hook (useKanbanData.ts → conversão)
  ↓
Componente (KanbanCard.tsx → exibição)
```

### **2. Pontos de Verificação**

#### **Backend (leads.mapper.ts)**
- ✅ Linha 34: `clientName: dbLead.client_name || ''`
- ⚠️ Se `client_name` for `null`, `undefined` ou `''`, retorna string vazia

#### **Frontend (useKanbanData.ts)**
- ✅ Linha 191: `clientName: lead.clientName || lead.client_name || ''`
- ⚠️ Agora verifica ambos `clientName` (camelCase) e `client_name` (snake_case)

#### **Frontend (funnels-service.ts)**
- ✅ Linha 324: `clientName: lead.clientName || lead.client_name || ''`
- ⚠️ Agora verifica ambos formatos

#### **Componente (KanbanCard.tsx)**
- ✅ Linha 155: `name={lead.clientName || 'Sem nome'}`
- ✅ Linha 171: `{lead.clientName || 'Sem nome'}`
- ⚠️ Mostra "Sem nome" se `clientName` for vazio

## 🎯 Correções Aplicadas

### **1. Backend (leads.mapper.ts)**
- ✅ Adicionado log de warning se `client_name` estiver vazio/null
- ✅ Garantido que sempre retorne string (não null/undefined)
- ✅ Filtro para não retornar "Sem nome" literal

### **2. Frontend (useKanbanData.ts)**
- ✅ Adicionado fallback para `client_name` (snake_case)
- ✅ Adicionado log de warning se `clientName` estiver vazio
- ✅ Garantido que sempre tenha um valor

### **3. Frontend (funnels-service.ts)**
- ✅ Adicionado fallback para `client_name` (snake_case)
- ✅ Adicionado log de warning se `clientName` estiver vazio
- ✅ Garantido que sempre tenha um valor

## 🚨 Próximos Passos

### **1. Verificar Logs**

Após fazer deploy, verificar os logs da Edge Function para ver:
- Quantos leads estão vindo sem `client_name` do banco
- Se o problema está na query ou no mapeamento

### **2. Verificar Banco de Dados**

Rodar query para verificar se há leads com `client_name` vazio/null:

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

### **3. Se houver leads sem nome no banco**

Aplicar a migration que corrige `client_name` a partir de `extracted_data`:

```sql
-- Verificar se a migration foi aplicada
SELECT * FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%fix_client_name%';
```

## 📝 Notas

- O problema pode estar no banco de dados (leads com `client_name` vazio/null)
- Ou pode estar na conversão entre backend e frontend
- Os logs adicionados vão ajudar a identificar onde está o problema

---

**Status:** ✅ Logs adicionados. Fazer deploy e verificar logs para identificar a causa raiz.

