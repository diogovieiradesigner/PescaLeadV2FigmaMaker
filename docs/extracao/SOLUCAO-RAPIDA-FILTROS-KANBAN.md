# 🚀 SOLUÇÃO RÁPIDA: Filtros Não Funcionam no Kanban

## 🐛 PROBLEMA

**"Quando clico no filtro, nada muda"**

### **Causa:**
Os filtros estão sendo aplicados apenas no frontend (nos leads já carregados), mas **não estão sendo passados para o backend** para recarregar os leads com os filtros aplicados.

---

## ✅ SOLUÇÃO EM 3 PASSOS

### **PASSO 1: Backend - Atualizar Função `getColumnLeads`**

**Arquivo:** `supabase/functions/make-server-e4f9d774/kanban-helpers.ts`

**Localização:** Linha ~440

**Mudança:**

```typescript
// ❌ ANTES
export async function getColumnLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ leads: Lead[]; total: number; hasMore: boolean }> {
  // ... código atual ...
}

// ✅ DEPOIS
export async function getColumnLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  offset: number = 0,
  limit: number = 20,
  filters?: {  // ✅ ADICIONAR PARÂMETRO
    hasEmail?: boolean;
    hasWhatsapp?: boolean;
    searchQuery?: string;
  }
): Promise<{ leads: Lead[]; total: number; hasMore: boolean }> {
  const supabase = getSupabase();
  
  // Construir queries base
  let countQuery = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active');

  let leadsQuery = supabase
    .from('leads')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active');

  // ✅ APLICAR FILTROS
  if (filters?.hasEmail) {
    countQuery = countQuery.or('primary_email.not.is.null,emails.neq.[]');
    leadsQuery = leadsQuery.or('primary_email.not.is.null,emails.neq.[]');
  }

  if (filters?.hasWhatsapp) {
    countQuery = countQuery.or('primary_phone.not.is.null,phones.neq.[]');
    leadsQuery = leadsQuery.or('primary_phone.not.is.null,phones.neq.[]');
  }

  if (filters?.searchQuery?.trim()) {
    const search = filters.searchQuery.trim();
    countQuery = countQuery.or(`client_name.ilike.%${search}%,company.ilike.%${search}%`);
    leadsQuery = leadsQuery.or(`client_name.ilike.%${search}%,company.ilike.%${search}%`);
  }

  // Executar queries
  const { count, error: countError } = await countQuery;
  const { data: leads, error } = await leadsQuery
    .order('position', { ascending: true })
    .range(offset, offset + limit - 1);
  
  if (countError || error) {
    throw new Error(`Failed to fetch leads: ${countError?.message || error?.message}`);
  }
  
  return {
    leads: (leads || []).map(mapLeadFromDB),
    total: count ?? 0,
    hasMore: offset + limit < (count ?? 0),
  };
}
```

---

### **PASSO 2: Backend - Atualizar Rota da API**

**Arquivo:** `supabase/functions/make-server-e4f9d774/index.tsx`

**Localização:** Linha ~3217

**Mudança:**

```typescript
// ❌ ANTES
app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads', 
  validateAuth, validateWorkspaceAccess, async (c) => {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const columnId = c.req.param('columnId');
    const offset = parseInt(c.req.query('offset') || '0');
    const limit = parseInt(c.req.query('limit') || '10');
    
    const result = await kanbanHelpers.getColumnLeads(workspaceId, funnelId, columnId, offset, limit);
    
    return c.json(result);
  }
);

// ✅ DEPOIS
app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads', 
  validateAuth, validateWorkspaceAccess, async (c) => {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const columnId = c.req.param('columnId');
    const offset = parseInt(c.req.query('offset') || '0');
    const limit = parseInt(c.req.query('limit') || '10');
    
    // ✅ LER FILTROS DOS QUERY PARAMETERS
    const hasEmail = c.req.query('hasEmail') === 'true';
    const hasWhatsapp = c.req.query('hasWhatsapp') === 'true';
    const searchQuery = c.req.query('searchQuery') || undefined;
    
    const result = await kanbanHelpers.getColumnLeads(
      workspaceId, 
      funnelId, 
      columnId, 
      offset, 
      limit,
      { hasEmail, hasWhatsapp, searchQuery }  // ✅ PASSAR FILTROS
    );
    
    return c.json(result);
  }
);
```

---

### **PASSO 3: Frontend - Recarregar Quando Filtros Mudarem**

**Arquivo:** Onde o hook `useKanbanData` é usado (provavelmente `App.tsx` ou componente principal)

**Mudança:**

```typescript
// ✅ ADICIONAR: useEffect para recarregar quando filtros mudarem
useEffect(() => {
  if (currentFunnel) {
    // Limpar estado atual
    setColumnLeadsState({});
    
    // Recarregar com filtros
    loadFunnel(currentFunnel.id, {
      hasEmail: leadFilters.hasEmail,
      hasWhatsapp: leadFilters.hasWhatsapp,
      searchQuery: searchQuery
    });
  }
}, [currentFunnel, leadFilters.hasEmail, leadFilters.hasWhatsapp, searchQuery]);
```

**E atualizar a função `loadFunnel` para passar filtros na chamada da API:**

```typescript
// No hook useKanbanData ou onde loadFunnel está definido
const loadFunnel = useCallback(async (
  funnelId: string,
  filters?: { hasEmail?: boolean; hasWhatsapp?: boolean; searchQuery?: string; }
) => {
  // ... código existente ...
  
  for (const column of funnel.columns) {
    // ✅ ADICIONAR FILTROS NA CHAMADA DA API
    const queryParams = new URLSearchParams({
      limit: '10',
      offset: '0',
    });
    
    if (filters?.hasEmail) queryParams.append('hasEmail', 'true');
    if (filters?.hasWhatsapp) queryParams.append('hasWhatsapp', 'true');
    if (filters?.searchQuery) queryParams.append('searchQuery', filters.searchQuery);
    
    const response = await fetch(
      `/make-server-e4f9d774/workspaces/${workspaceId}/funnels/${funnelId}/columns/${column.id}/leads?${queryParams}`
    );
    
    const { leads: columnLeads, total } = await response.json();
    
    // ... resto do código ...
  }
}, [workspaceId]);
```

---

## 🎯 RESULTADO ESPERADO

### **Antes:**
- ❌ Clicar no filtro não faz nada
- ❌ Contador não muda
- ❌ Leads não mudam

### **Depois:**
- ✅ Clicar no filtro recarrega os leads do backend
- ✅ Contador mostra total correto (ex: 87 em vez de 6)
- ✅ Leads exibidos são apenas os que passam no filtro
- ✅ Paginação funciona corretamente com filtros

---

## ⚠️ IMPORTANTE

1. **Remover filtros do frontend:** Após implementar, remover toda lógica de filtro no `App.tsx` que filtra arrays localmente
2. **Testar:** Verificar que ao clicar no filtro, os leads são recarregados do backend
3. **Performance:** Filtros no backend são mais eficientes (menos dados transferidos)

---

**Prioridade:** 🔴 **CRÍTICA** - Filtros não funcionam atualmente

