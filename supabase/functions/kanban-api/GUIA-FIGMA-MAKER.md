# 🎨 Guia de Implementação - Nova Kanban API (Figma Maker)

**Data:** 10/12/2025

---

## 📋 Resumo das Mudanças

A nova `kanban-api` substitui a API antiga (`make-server-e4f9d774`) com:
- ✅ **Filtros no backend** (corrige contadores e paginação)
- ✅ **Carregamento lazy** (10 leads por coluna inicialmente)
- ✅ **Performance otimizada** (queries paralelas)
- ✅ **CRUD completo** (todas as operações)

---

## 🔄 Mudanças Principais

### **1. URL Base**
```typescript
// ❌ ANTES
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/make-server-e4f9d774'

// ✅ AGORA
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api'
```

### **2. Estrutura de Rotas**
```typescript
// ✅ Todas as rotas seguem o padrão:
/workspaces/:workspaceId/funnels/:funnelId/...
```

---

## 📚 Rotas Disponíveis

### **LEITURA (GET)**

```typescript
// Listar funis
GET /workspaces/:workspaceId/funnels

// Buscar funil específico
GET /workspaces/:workspaceId/funnels/:funnelId

// Listar colunas
GET /workspaces/:workspaceId/funnels/:funnelId/columns

// Buscar leads iniciais (10 por coluna)
GET /workspaces/:workspaceId/funnels/:funnelId/leads

// Buscar leads de uma coluna (com paginação e filtros)
GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads?limit=10&offset=0&hasEmail=true

// Buscar lead específico
GET /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId

// Buscar estatísticas
GET /workspaces/:workspaceId/funnels/:funnelId/stats
```

### **CRIAÇÃO (POST)**

```typescript
// Criar funil
POST /workspaces/:workspaceId/funnels
Body: { name: string, description?: string }

// Criar lead
POST /workspaces/:workspaceId/funnels/:funnelId/leads
Body: { clientName: string, column_id: string, company?: string, dealValue?: number, priority?: 'high' | 'medium' | 'low' }
```

### **ATUALIZAÇÃO (PUT)**

```typescript
// Atualizar funil
PUT /workspaces/:workspaceId/funnels/:funnelId
Body: { name?: string, description?: string, columns?: Array<{id: string, title: string, position: number}> }

// Atualizar lead
PUT /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
Body: { clientName?: string, dealValue?: number, priority?: 'high' | 'medium' | 'low', ... }
```

### **MOVIMENTAÇÃO (POST)**

```typescript
// Mover lead (drag & drop)
POST /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move
Body: { toColumnId: string, toPosition: number }

// Mover múltiplos leads
POST /workspaces/:workspaceId/funnels/:funnelId/leads/batch-move
Body: { moves: Array<{leadId: string, toColumnId: string, toPosition: number}> }
```

### **DELEÇÃO (DELETE)**

```typescript
// Deletar lead
DELETE /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId

// Deletar funil (soft delete)
DELETE /workspaces/:workspaceId/funnels/:funnelId
```

---

## 💻 Exemplos de Implementação

### **1. Inicializar Cliente API**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nlbcwaxkeaddfocigwuk.supabase.co',
  'SUA_ANON_KEY'
);

// Obter token do usuário
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// URL base da API
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api';
```

### **2. Buscar Funis**

```typescript
async function getFunnels(workspaceId: string) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const { funnels } = await response.json();
  return funnels;
}
```

### **3. Buscar Leads Iniciais (Carregamento Lazy)**

```typescript
async function getInitialLeads(workspaceId: string, funnelId: string) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const { columns } = await response.json();
  // columns = { [columnId]: { leads: [], total: number, hasMore: boolean } }
  return columns;
}
```

### **4. Buscar Leads de uma Coluna (Com Filtros e Paginação)**

```typescript
async function getColumnLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  options: {
    limit?: number;
    offset?: number;
    hasEmail?: boolean;
    hasWhatsapp?: boolean;
    searchQuery?: string;
    priority?: 'high' | 'medium' | 'low';
  } = {}
) {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  if (options.hasEmail) params.append('hasEmail', 'true');
  if (options.hasWhatsapp) params.append('hasWhatsapp', 'true');
  if (options.searchQuery) params.append('searchQuery', options.searchQuery);
  if (options.priority) params.append('priority', options.priority);
  
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/columns/${columnId}/leads?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const { leads, total, hasMore, limit, offset } = await response.json();
  return { leads, total, hasMore, limit, offset };
}
```

### **5. Criar Lead**

```typescript
async function createLead(
  workspaceId: string,
  funnelId: string,
  leadData: {
    clientName: string;
    column_id: string;
    company?: string;
    dealValue?: number;
    priority?: 'high' | 'medium' | 'low';
  }
) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(leadData)
    }
  );
  
  const { lead } = await response.json();
  return lead;
}
```

### **6. Mover Lead (Drag & Drop)**

```typescript
async function moveLead(
  workspaceId: string,
  funnelId: string,
  leadId: string,
  toColumnId: string,
  toPosition: number
) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}/move`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ toColumnId, toPosition })
    }
  );
  
  const { lead } = await response.json();
  return lead;
}
```

### **7. Atualizar Lead**

```typescript
async function updateLead(
  workspaceId: string,
  funnelId: string,
  leadId: string,
  updates: {
    clientName?: string;
    dealValue?: number;
    priority?: 'high' | 'medium' | 'low';
    // ... outros campos
  }
) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  
  const { lead } = await response.json();
  return lead;
}
```

### **8. Deletar Lead**

```typescript
async function deleteLead(
  workspaceId: string,
  funnelId: string,
  leadId: string
) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const { success } = await response.json();
  return success;
}
```

### **9. Aplicar Filtros (Backend)**

```typescript
// ✅ CORRETO: Filtros aplicados no backend
const { leads, total } = await getColumnLeads(workspaceId, funnelId, columnId, {
  hasEmail: true,
  searchQuery: 'restaurante',
  limit: 10,
  offset: 0
});

// ❌ ERRADO: Não filtrar no frontend após buscar todos os leads
// const allLeads = await getAllLeads();
// const filtered = allLeads.filter(lead => lead.email); // ❌ NÃO FAZER ISSO
```

---

## 🔄 Migração: Antes vs Depois

### **Buscar Leads Iniciais**

```typescript
// ❌ ANTES (API antiga)
const response = await fetch(
  `/make-server-e4f9d774/workspaces/${workspaceId}/funnels/${funnelId}/leads?offset=0&limit=30`
);
const { leads } = await response.json();
// Problema: Carregava TODOS os leads de uma vez

// ✅ AGORA (Nova API)
const response = await fetch(
  `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads`
);
const { columns } = await response.json();
// Retorna: { [columnId]: { leads: [], total: number, hasMore: boolean } }
// Apenas 10 leads por coluna inicialmente
```

### **Filtrar Leads**

```typescript
// ❌ ANTES (Filtro no frontend)
const allLeads = await fetchAllLeads();
const filtered = allLeads.filter(lead => {
  if (hasEmailFilter && !lead.email) return false;
  if (hasWhatsappFilter && !lead.whatsapp) return false;
  return true;
});
// Problema: Contadores e paginação incorretos

// ✅ AGORA (Filtro no backend)
const { leads, total } = await getColumnLeads(workspaceId, funnelId, columnId, {
  hasEmail: true,
  hasWhatsapp: true,
  limit: 10,
  offset: 0
});
// Contadores e paginação corretos!
```

### **Mover Lead**

```typescript
// ❌ ANTES
const response = await fetch(
  `/make-server-e4f9d774/workspaces/${workspaceId}/leads/${leadId}/move`,
  {
    method: 'POST',
    body: JSON.stringify({ toColumnId, toPosition })
  }
);

// ✅ AGORA
const response = await fetch(
  `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}/move`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ toColumnId, toPosition })
  }
);
```

---

## 📊 Estrutura de Respostas

### **GET /leads (Inicial)**
```json
{
  "columns": {
    "column-id-1": {
      "leads": [...],
      "total": 50,
      "hasMore": true,
      "limit": 10,
      "offset": 0
    },
    "column-id-2": {
      "leads": [...],
      "total": 30,
      "hasMore": true,
      "limit": 10,
      "offset": 0
    }
  }
}
```

### **GET /columns/:columnId/leads**
```json
{
  "leads": [
    {
      "id": "lead-id",
      "clientName": "Nome do Cliente",
      "company": "Empresa",
      "dealValue": 1000,
      "priority": "high",
      "emailsCount": 2,
      "whatsappValid": true,
      ...
    }
  ],
  "total": 50,
  "hasMore": true,
  "limit": 10,
  "offset": 0
}
```

---

## ⚠️ Pontos Importantes

### **1. Autenticação Obrigatória**
Todas as rotas requerem `Authorization: Bearer <token>` no header.

### **2. Filtros no Backend**
✅ **SEMPRE** passe filtros como query parameters, nunca filtre no frontend.

### **3. Carregamento Lazy**
- Inicial: 10 leads por coluna
- Load More: Use `offset` e `limit` para paginar
- Verifique `hasMore` antes de carregar mais

### **4. Contadores Corretos**
O `total` retornado já reflete os filtros aplicados. Use diretamente para exibir contadores.

### **5. Estrutura de Lead**
```typescript
interface Lead {
  id: string;
  clientName: string;
  company: string;
  dealValue: number;
  priority: 'high' | 'medium' | 'low';
  emailsCount: number;      // ✅ Use este campo para filtro
  whatsappValid: boolean;   // ✅ Use este campo para filtro
  // ... outros campos
}
```

---

## 🚀 Checklist de Implementação

- [ ] Atualizar URL base da API
- [ ] Implementar autenticação (Bearer token)
- [ ] Atualizar função de buscar leads iniciais
- [ ] Implementar filtros como query parameters
- [ ] Atualizar função de mover lead
- [ ] Atualizar função de criar lead
- [ ] Atualizar função de atualizar lead
- [ ] Atualizar função de deletar lead
- [ ] Remover filtros do frontend
- [ ] Usar `total` da API para contadores
- [ ] Implementar paginação com `hasMore`
- [ ] Testar todos os endpoints

---

## 📝 Exemplo Completo: Hook React

```typescript
import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api';

export function useKanban(workspaceId: string, funnelId: string) {
  const supabase = useSupabaseClient();
  const [columns, setColumns] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  // Obter token
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };
  
  // Carregar leads iniciais
  const loadInitialLeads = async () => {
    setLoading(true);
    const token = await getToken();
    
    const response = await fetch(
      `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { columns: leadsByColumn } = await response.json();
    setColumns(leadsByColumn);
    setLoading(false);
  };
  
  // Carregar mais leads de uma coluna
  const loadMoreLeads = async (
    columnId: string,
    offset: number,
    filters?: any
  ) => {
    const token = await getToken();
    const params = new URLSearchParams({
      limit: '10',
      offset: offset.toString(),
      ...(filters?.hasEmail && { hasEmail: 'true' }),
      ...(filters?.hasWhatsapp && { hasWhatsapp: 'true' }),
      ...(filters?.searchQuery && { searchQuery: filters.searchQuery })
    });
    
    const response = await fetch(
      `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/columns/${columnId}/leads?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { leads, hasMore } = await response.json();
    
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        leads: [...(prev[columnId]?.leads || []), ...leads],
        hasMore
      }
    }));
    
    return { hasMore };
  };
  
  // Mover lead
  const moveLead = async (
    leadId: string,
    toColumnId: string,
    toPosition: number
  ) => {
    const token = await getToken();
    
    const response = await fetch(
      `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}/move`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toColumnId, toPosition })
      }
    );
    
    const { lead } = await response.json();
    
    // Atualizar estado local
    // ... lógica de atualização
    
    return lead;
  };
  
  useEffect(() => {
    loadInitialLeads();
  }, [workspaceId, funnelId]);
  
  return {
    columns,
    loading,
    loadMoreLeads,
    moveLead,
    reload: loadInitialLeads
  };
}
```

---

## ✅ Resumo

1. **URL:** `kanban-api` (não `make-server-e4f9d774`)
2. **Auth:** Sempre incluir `Authorization: Bearer <token>`
3. **Filtros:** Query parameters, não frontend
4. **Lazy Load:** 10 leads por coluna inicialmente
5. **Contadores:** Usar `total` da API
6. **Paginação:** Verificar `hasMore` antes de carregar mais

---

**Pronto para implementar!** 🚀

