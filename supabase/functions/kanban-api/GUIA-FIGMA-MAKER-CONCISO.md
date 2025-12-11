# 🎨 Guia Conciso - Nova Kanban API (Figma Maker)

**Data:** 10/12/2025

---

## 🔄 Mudança Principal

```typescript
// ❌ ANTES
const API_URL = '/make-server-e4f9d774'

// ✅ AGORA
const API_URL = '/kanban-api'
```

---

## 📍 Rotas Principais

### **Leitura**
```
GET  /workspaces/:workspaceId/funnels
GET  /workspaces/:workspaceId/funnels/:funnelId/leads          // 10 leads por coluna
GET  /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads?limit=10&offset=0&hasEmail=true
GET  /workspaces/:workspaceId/funnels/:funnelId/stats
```

### **Escrita**
```
POST   /workspaces/:workspaceId/funnels/:funnelId/leads
PUT    /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
POST   /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move
DELETE /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
```

---

## 💻 Código Essencial

### **1. Configuração Base**

```typescript
const API_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api';

// Obter token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Headers padrão
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### **2. Carregar Leads Iniciais (10 por coluna)**

```typescript
async function loadInitialLeads(workspaceId: string, funnelId: string) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads`,
    { headers }
  );
  
  const { columns } = await response.json();
  // Retorna: { [columnId]: { leads: [], total: number, hasMore: boolean } }
  return columns;
}
```

### **3. Carregar Mais Leads (Com Filtros)**

```typescript
async function loadMoreLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  offset: number,
  filters?: { hasEmail?: boolean; hasWhatsapp?: boolean; searchQuery?: string }
) {
  const params = new URLSearchParams({
    limit: '10',
    offset: offset.toString()
  });
  
  if (filters?.hasEmail) params.append('hasEmail', 'true');
  if (filters?.hasWhatsapp) params.append('hasWhatsapp', 'true');
  if (filters?.searchQuery) params.append('searchQuery', filters.searchQuery);
  
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/columns/${columnId}/leads?${params}`,
    { headers }
  );
  
  const { leads, total, hasMore } = await response.json();
  return { leads, total, hasMore };
}
```

### **4. Mover Lead (Drag & Drop)**

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
      headers,
      body: JSON.stringify({ toColumnId, toPosition })
    }
  );
  
  const { lead } = await response.json();
  return lead;
}
```

### **5. Criar Lead**

```typescript
async function createLead(
  workspaceId: string,
  funnelId: string,
  leadData: { clientName: string; column_id: string; company?: string }
) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(leadData)
    }
  );
  
  const { lead } = await response.json();
  return lead;
}
```

### **6. Atualizar Lead**

```typescript
async function updateLead(
  workspaceId: string,
  funnelId: string,
  leadId: string,
  updates: { clientName?: string; dealValue?: number; priority?: string }
) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    }
  );
  
  const { lead } = await response.json();
  return lead;
}
```

---

## ⚠️ Regras Importantes

### **1. Filtros SEMPRE no Backend**
```typescript
// ✅ CORRETO: Passar filtros como query params
GET /columns/:columnId/leads?hasEmail=true&hasWhatsapp=true

// ❌ ERRADO: Filtrar no frontend
const allLeads = await fetchAllLeads();
const filtered = allLeads.filter(lead => lead.email); // NÃO FAZER!
```

### **2. Usar `total` da API para Contadores**
```typescript
// ✅ CORRETO
const { total } = await loadMoreLeads(...);
setCounter(total); // Use este valor!

// ❌ ERRADO
const { leads } = await loadMoreLeads(...);
setCounter(leads.length); // NÃO FAZER!
```

### **3. Recarregar Quando Filtros Mudarem**
```typescript
useEffect(() => {
  // Limpar estado
  setLeads({});
  
  // Recarregar com novos filtros
  loadInitialLeads(workspaceId, funnelId, filters);
}, [filters.hasEmail, filters.hasWhatsapp, filters.searchQuery]);
```

---

## 📊 Estrutura de Respostas

### **GET /leads (Inicial)**
```json
{
  "columns": {
    "column-1": { "leads": [...], "total": 50, "hasMore": true },
    "column-2": { "leads": [...], "total": 30, "hasMore": true }
  }
}
```

### **GET /columns/:columnId/leads**
```json
{
  "leads": [...],
  "total": 50,
  "hasMore": true,
  "limit": 10,
  "offset": 0
}
```

---

## ✅ Checklist de Implementação

- [ ] Mudar URL de `/make-server-e4f9d774` para `/kanban-api`
- [ ] Adicionar `Authorization: Bearer <token>` em todas as requisições
- [ ] Atualizar função de carregar leads iniciais
- [ ] Passar filtros como query parameters (não filtrar no frontend)
- [ ] Usar `total` da API para contadores
- [ ] Implementar recarregamento quando filtros mudarem
- [ ] Atualizar função de mover lead
- [ ] Testar drag & drop
- [ ] Testar filtros
- [ ] Testar paginação

---

## 🚀 Exemplo Completo: Hook React

```typescript
function useKanban(workspaceId: string, funnelId: string) {
  const [columns, setColumns] = useState({});
  const [filters, setFilters] = useState({});
  
  const loadInitial = async () => {
    const params = new URLSearchParams();
    if (filters.hasEmail) params.append('hasEmail', 'true');
    if (filters.hasWhatsapp) params.append('hasWhatsapp', 'true');
    if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads?${params}`,
      { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
    );
    
    const { columns: leadsByColumn } = await response.json();
    setColumns(leadsByColumn);
  };
  
  const loadMore = async (columnId: string, offset: number) => {
    const params = new URLSearchParams({ limit: '10', offset: offset.toString() });
    if (filters.hasEmail) params.append('hasEmail', 'true');
    
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/columns/${columnId}/leads?${params}`,
      { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
    );
    
    const { leads, hasMore } = await response.json();
    setColumns(prev => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        leads: [...prev[columnId].leads, ...leads],
        hasMore
      }
    }));
  };
  
  const moveLead = async (leadId: string, toColumnId: string, toPosition: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads/${leadId}/move`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ toColumnId, toPosition })
      }
    );
    const { lead } = await response.json();
    return lead;
  };
  
  useEffect(() => {
    loadInitial();
  }, [filters.hasEmail, filters.hasWhatsapp, filters.searchQuery]);
  
  return { columns, loadMore, moveLead, setFilters };
}
```

---

## 📝 Resumo em 3 Pontos

1. **URL:** `/kanban-api` (não `/make-server-e4f9d774`)
2. **Filtros:** Query parameters, nunca no frontend
3. **Contadores:** Use `total` da API, não `leads.length`

---

**Pronto para implementar!** 🚀

