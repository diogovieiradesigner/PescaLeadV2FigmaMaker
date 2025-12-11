# 🧪 Testes Completos - Kanban API

**Data:** 10/12/2025

---

## 📋 Como Executar os Testes

### **Opção 1: Script Bash (Recomendado)**

```bash
# 1. Dar permissão de execução
chmod +x supabase/functions/kanban-api/TESTES-ENDPOINTS-COMPLETOS.sh

# 2. Configurar variáveis de ambiente
export SUPABASE_URL="https://nlbcwaxkeaddfocigwuk.supabase.co"
export USER_TOKEN="seu-jwt-token-aqui"
export WORKSPACE_ID="seu-workspace-id"
export FUNNEL_ID="seu-funnel-id"  # Opcional (será criado se não existir)
export COLUMN_ID="seu-column-id"  # Opcional
export LEAD_ID="seu-lead-id"      # Opcional

# 3. Executar testes
./supabase/functions/kanban-api/TESTES-ENDPOINTS-COMPLETOS.sh
```

### **Opção 2: Testes Manuais com cURL**

Veja exemplos abaixo para cada endpoint.

---

## 🧪 Lista de Testes

### **1. TESTES DE LEITURA (GET)**

#### ✅ **GET** `/workspaces/:workspaceId/funnels`
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels"
```

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId`
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID"
```

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/columns`
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns"
```

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/leads`
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads"
```

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads`
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads"
```

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/leads/:leadId`
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID"
```

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/stats`
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/stats"
```

---

### **2. TESTES DE CRIAÇÃO (POST)**

#### ✅ **POST** `/workspaces/:workspaceId/funnels`
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kanban de Teste",
    "description": "Kanban criado para testes"
  }' \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels"
```

#### ✅ **POST** `/workspaces/:workspaceId/funnels/:funnelId/leads`
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Cliente de Teste",
    "column_id": "'$COLUMN_ID'",
    "company": "Empresa Teste",
    "dealValue": 1000,
    "priority": "medium"
  }' \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads"
```

---

### **3. TESTES DE ATUALIZAÇÃO (PUT)**

#### ✅ **PUT** `/workspaces/:workspaceId/funnels/:funnelId`
```bash
curl -X PUT \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kanban Atualizado",
    "columns": [
      {"id": "col1", "title": "Coluna 1", "position": 0},
      {"id": "col2", "title": "Coluna 2", "position": 1}
    ]
  }' \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID"
```

#### ✅ **PUT** `/workspaces/:workspaceId/funnels/:funnelId/leads/:leadId`
```bash
curl -X PUT \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Cliente Atualizado",
    "dealValue": 2000,
    "priority": "high"
  }' \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID"
```

---

### **4. TESTES DE MOVIMENTAÇÃO (POST MOVE)**

#### ✅ **POST** `/workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move`
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toColumnId": "'$COLUMN_ID'",
    "toPosition": 0
  }' \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID/move"
```

#### ✅ **POST** `/workspaces/:workspaceId/funnels/:funnelId/leads/batch-move`
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moves": [
      {
        "leadId": "'$LEAD_ID'",
        "toColumnId": "'$COLUMN_ID'",
        "toPosition": 1
      }
    ]
  }' \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/batch-move"
```

---

### **5. TESTES DE ESTATÍSTICAS (POST RECALCULATE)**

#### ✅ **POST** `/workspaces/:workspaceId/funnels/:funnelId/stats/recalculate`
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/stats/recalculate"
```

---

### **6. TESTES DE DELEÇÃO (DELETE)**

#### ✅ **DELETE** `/workspaces/:workspaceId/funnels/:funnelId/leads/:leadId`
```bash
curl -X DELETE \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID"
```

#### ✅ **DELETE** `/workspaces/:workspaceId/funnels/:funnelId`
```bash
curl -X DELETE \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID"
```

---

### **7. TESTES DE FILTROS**

#### ✅ **Filtro hasEmail**
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?hasEmail=true"
```

#### ✅ **Filtro hasWhatsapp**
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?hasWhatsapp=true"
```

#### ✅ **Filtro searchQuery**
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?searchQuery=teste"
```

#### ✅ **Filtro priority**
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?priority=high"
```

#### ✅ **Paginação**
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?limit=5&offset=0"
```

---

### **8. TESTES DE VALIDAÇÃO (ERROS ESPERADOS)**

#### ❌ **POST criar lead sem campos obrigatórios (deve retornar 400)**
```bash
curl -X POST \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Empresa Teste"
  }' \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads"
```

#### ❌ **GET funil inexistente (deve retornar 404)**
```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels/00000000-0000-0000-0000-000000000000"
```

---

## 📊 Checklist de Testes

- [ ] **GET** Listar funis
- [ ] **GET** Buscar funil específico
- [ ] **GET** Listar colunas
- [ ] **GET** Buscar leads iniciais
- [ ] **GET** Buscar leads de coluna
- [ ] **GET** Buscar lead específico
- [ ] **GET** Buscar estatísticas
- [ ] **POST** Criar funil
- [ ] **POST** Criar lead
- [ ] **PUT** Atualizar funil
- [ ] **PUT** Atualizar lead
- [ ] **POST** Mover lead
- [ ] **POST** Batch move leads
- [ ] **POST** Recalcular stats
- [ ] **DELETE** Deletar lead
- [ ] **DELETE** Deletar funil
- [ ] **Filtros** hasEmail
- [ ] **Filtros** hasWhatsapp
- [ ] **Filtros** searchQuery
- [ ] **Filtros** priority
- [ ] **Paginação** limit/offset
- [ ] **Validação** Erros esperados

---

## 🔍 Como Obter o Token JWT

1. Faça login no frontend da aplicação
2. Abra o DevTools (F12)
3. Vá para Application > Local Storage
4. Procure por `sb-<project-id>-auth-token`
5. Copie o valor do token

Ou use o Supabase Client:

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## 📝 Notas

- Todos os testes requerem autenticação (Bearer token)
- Alguns testes requerem IDs existentes (funnel, column, lead)
- Testes de DELETE são destrutivos - use com cuidado
- O script bash cria dados de teste automaticamente quando necessário

