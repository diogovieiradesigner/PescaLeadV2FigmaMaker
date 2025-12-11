# 🎯 PROMPT PARA FIGMA MAKER: Corrigir Sistema de Filtros no Kanban

## 🐛 PROBLEMA IDENTIFICADO

### **Sintoma:**
**"Quando clico no filtro, nada muda"** - Os filtros não estão funcionando.

### **Causa Raiz:**

1. **Filtros aplicados apenas no frontend:**
   - Filtros são aplicados apenas nos leads **já carregados** (ex: 10 leads)
   - Se há 150 leads no backend, mas apenas 10 foram carregados, o filtro só vê esses 10
   - Contador mostra `6` quando deveria mostrar `87` (total real no backend com e-mail)

2. **Backend não recebe filtros:**
   - A função `getColumnLeads` no backend **não aceita parâmetros de filtro**
   - Quando o filtro é clicado, o frontend apenas filtra o array local
   - **NÃO recarrega os leads do backend com os filtros aplicados**

3. **Contadores incorretos:**
   - Sem filtros: mostra `150` (correto, vem do COUNT do backend)
   - Com filtros: mostra `6` (ERRADO, é apenas `array.length` dos 10 carregados)
   - Deveria mostrar `87` (total real no backend que tem e-mail)

4. **Leads exibidos incorretos:**
   - Mostra apenas os leads que passam no filtro **dos 10 carregados**
   - Não mostra os outros 77 leads que têm e-mail mas não foram carregados ainda

### **Exemplo do Problema:**

```
Backend tem:
- 150 leads na coluna "Novos"
- 87 leads têm e-mail
- 63 leads não têm e-mail

Frontend carregou:
- 10 leads (primeira página)
- 6 têm e-mail
- 4 não têm e-mail

Com filtro "Tem E-mail" ativo:
❌ Mostra: 6 leads (apenas os 6 dos 10 carregados)
❌ Contador: 6 (ERRADO)
✅ Deveria mostrar: 87 leads (todos que têm e-mail)
✅ Contador deveria: 87 (total real no backend)
```

---

## ✅ SOLUÇÃO CORRETA

### **Princípio:**
**Filtros devem ser aplicados no BACKEND, não no frontend.**

### **Mudanças Necessárias:**

#### **1. Backend: Receber Filtros como Parâmetros**

**Arquivo:** `supabase/functions/make-server-e4f9d774/kanban-helpers.ts`

**Função:** `getColumnLeads` (linha ~440)

**⚠️ IMPORTANTE:** Esta é a função que precisa ser modificada no backend!

**Mudança:**

```typescript
// ❌ ANTES (sem filtros) - CÓDIGO ATUAL
export async function getColumnLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ leads: Lead[]; total: number; hasMore: boolean }> {
  const supabase = getSupabase();
  
  // Get total count
  const { count, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active');
  
  // Get leads
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('funnel_id', funnelId)
    .eq('column_id', columnId)
    .eq('status', 'active')
    .order('position', { ascending: true })
    .range(offset, offset + limit - 1);
  
  return {
    leads: (leads || []).map(mapLeadFromDB),
    total: count ?? 0,
    hasMore: offset + limit < (count ?? 0),
  };
}

// ✅ DEPOIS (com filtros) - CÓDIGO CORRIGIDO
export async function getColumnLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  offset: number = 0,
  limit: number = 20,
  filters?: {
    hasEmail?: boolean;
    hasWhatsapp?: boolean;
    searchQuery?: string;
  }
): Promise<{ leads: Lead[]; total: number; hasMore: boolean }> {
  const supabase = getSupabase();
  
  // Construir query base
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

  // Aplicar filtro: Tem E-mail
  if (filters?.hasEmail) {
    countQuery = countQuery.or('primary_email.not.is.null,emails.neq.[]');
    leadsQuery = leadsQuery.or('primary_email.not.is.null,emails.neq.[]');
  }

  // Aplicar filtro: Tem Whatsapp (telefone)
  if (filters?.hasWhatsapp) {
    countQuery = countQuery.or('primary_phone.not.is.null,phones.neq.[]');
    leadsQuery = leadsQuery.or('primary_phone.not.is.null,phones.neq.[]');
  }

  // Aplicar filtro: Busca por texto
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
  
  if (countError) {
    console.error('Error counting leads:', countError);
    throw new Error(`Failed to count leads: ${countError.message}`);
  }
  
  if (error) {
    console.error('Error fetching leads:', error);
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }
  
  return {
    leads: (leads || []).map(mapLeadFromDB),
    total: count ?? 0,
    hasMore: offset + limit < (count ?? 0),
  };
}
```

#### **2. Frontend: Passar Filtros para o Backend**

**Arquivo:** `/hooks/useKanbanData.ts` (ou onde o hook está localizado)

**Função:** `loadFunnel`

**⚠️ IMPORTANTE:** Precisamos adicionar um `useEffect` que recarrega os leads quando os filtros mudarem!

**Mudança:**

```typescript
// ❌ ANTES (sem passar filtros)
const loadFunnel = useCallback(async (funnelId: string) => {
  for (const column of funnel.columns) {
    const { leads: columnLeads, total } = await funnelsService.getLeadsByColumn(
      column.id,
      workspaceId,
      { limit: 10, offset: 0 }
    );
  }
}, [workspaceId]);

// ✅ DEPOIS (passando filtros)
const loadFunnel = useCallback(async (
  funnelId: string,
  filters?: { hasEmail?: boolean; hasWhatsapp?: boolean; searchQuery?: string; }
) => {
  for (const column of funnel.columns) {
    const { leads: columnLeads, total } = await funnelsService.getLeadsByColumn(
      column.id,
      workspaceId,
      { 
        limit: 10, 
        offset: 0,
        filters: filters  // ✅ Passar filtros para o backend
      }
    );
  }
}, [workspaceId]);
```

**Função:** `loadMoreLeads`

**Mudança:**

```typescript
// ❌ ANTES
const loadMoreLeads = useCallback(async (columnId: string) => {
  const { leads: newLeads, total } = await funnelsService.getLeadsByColumn(
    columnId,
    workspaceId,
    { limit: 10, offset }
  );
}, [workspaceId]);

// ✅ DEPOIS
const loadMoreLeads = useCallback(async (
  columnId: string,
  filters?: { hasEmail?: boolean; hasWhatsapp?: boolean; searchQuery?: string; }
) => {
  const { leads: newLeads, total } = await funnelsService.getLeadsByColumn(
    columnId,
    workspaceId,
    { 
      limit: 10, 
      offset,
      filters: filters  // ✅ Passar filtros para o backend
    }
  );
}, [workspaceId]);
```

#### **3. Frontend: Remover Filtros do App.tsx**

**Arquivo:** `/App.tsx`

**Mudança:**

```typescript
// ❌ REMOVER: Filtros aplicados no frontend
const filteredColumns = useMemo(() => {
  // REMOVER TODO ESTE CÓDIGO
  if (!searchQuery.trim()) return columns;
  return columns.map(column => ({
    ...column,
    leads: column.leads.filter(lead => /* ... */)
  }));
}, [columns, searchQuery]);

const filteredAndFilteredColumns = useMemo(() => {
  // REMOVER TODO ESTE CÓDIGO
  return filteredColumns.map(column => ({
    ...column,
    leads: column.leads.filter(lead => {
      // REMOVER LÓGICA DE FILTRO
    })
  }));
}, [filteredColumns, leadFilters]);

// ✅ USAR: Colunas direto do hook (já filtradas pelo backend)
const columns = useKanbanData(/* ... */);

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

#### **4. Frontend: Atualizar Contadores**

**Arquivo:** `/App.tsx`

**Mudança:**

```typescript
// ❌ REMOVER: Cálculo de contadores filtrados no frontend
const filteredColumnLeadsState = useMemo(() => {
  // REMOVER TODO ESTE CÓDIGO
  if (!hasActiveFilters) return columnLeadsState;
  return /* ... */;
}, [/* ... */]);

// ✅ USAR: Contadores direto do hook (já calculados pelo backend)
// O hook já retorna columnLeadsState com total correto do backend
// Não precisa recalcular no frontend
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Backend (Edge Function):**

- [ ] **ATUALIZAR ROTA** em `index.tsx` (linha ~3217) para receber filtros:
  ```typescript
  app.get('/make-server-e4f9d774/workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads', 
    validateAuth, validateWorkspaceAccess, async (c) => {
      const hasEmail = c.req.query('hasEmail') === 'true';
      const hasWhatsapp = c.req.query('hasWhatsapp') === 'true';
      const searchQuery = c.req.query('searchQuery') || undefined;
      
      const result = await kanbanHelpers.getColumnLeads(
        workspaceId, 
        funnelId, 
        columnId, 
        offset, 
        limit,
        { hasEmail, hasWhatsapp, searchQuery }  // ✅ Passar filtros
      );
    }
  );
  ```

- [ ] Adicionar parâmetro `filters` à função `getColumnLeads` em `kanban-helpers.ts`
- [ ] Implementar filtro Supabase para `hasEmail`:
  ```typescript
  query = query.or('primary_email.not.is.null,emails.neq.[]');
  ```
- [ ] Implementar filtro Supabase para `hasWhatsapp`:
  ```typescript
  query = query.or('primary_phone.not.is.null,phones.neq.[]');
  ```
- [ ] Implementar filtro Supabase para `searchQuery`:
  ```typescript
  query = query.or(`client_name.ilike.%${search}%,company.ilike.%${search}%`);
  ```
- [ ] Garantir que `count` seja calculado COM os filtros aplicados
- [ ] Testar queries com diferentes combinações de filtros

### **Frontend (Hook useKanbanData):**

- [ ] Adicionar parâmetro `filters` à função `loadFunnel`
- [ ] Passar `filters` para a chamada da API (query parameters)
- [ ] Adicionar parâmetro `filters` à função `loadMoreLeads`
- [ ] Passar `filters` para a chamada da API no load more
- [ ] **CRÍTICO:** Adicionar `useEffect` que recarrega quando filtros mudarem
- [ ] Garantir que filtros sejam passados em todas as chamadas

### **Frontend (App.tsx):**

- [ ] **CRÍTICO:** Adicionar `useEffect` que observa mudanças nos filtros:
  ```typescript
  useEffect(() => {
    if (currentFunnel) {
      // Recarregar leads quando filtros mudarem
      loadFunnel(currentFunnel.id, {
        hasEmail: leadFilters.hasEmail,
        hasWhatsapp: leadFilters.hasWhatsapp,
        searchQuery: searchQuery
      });
    }
  }, [currentFunnel, leadFilters.hasEmail, leadFilters.hasWhatsapp, searchQuery]);
  ```
- [ ] **REMOVER** toda lógica de filtro no frontend (`filteredColumns`, `filteredAndFilteredColumns`)
- [ ] **REMOVER** cálculo de `filteredColumnLeadsState`
- [ ] Passar filtros para `loadFunnel` e `loadMoreLeads`
- [ ] Usar `columns` direto do hook (sem transformações)
- [ ] Usar `columnLeadsState` direto do hook (sem recálculos)

### **Frontend (KanbanColumn):**

- [ ] Garantir que `total` vem de `columnLeadsState` (já correto do backend)
- [ ] Não recalcular `total` baseado em `leads.length`
- [ ] Renderizar `total` diretamente do estado

---

## 🔍 VALIDAÇÃO E TESTES

### **Cenário 1: Sem Filtros**

```
1. Carregar kanban sem filtros
2. Verificar contador: deve mostrar total do backend (ex: 150)
3. Verificar leads exibidos: deve mostrar 10 leads (primeira página)
4. Rolar e carregar mais: deve adicionar mais 10 leads
5. Contador deve continuar: 150 (não muda)
```

### **Cenário 2: Filtro "Tem E-mail"**

```
1. Ativar filtro "Tem E-mail"
2. Verificar contador: deve mostrar total real (ex: 87)
3. Verificar leads exibidos: deve mostrar apenas leads com e-mail
4. Verificar quantidade: deve mostrar 10 leads (se houver 10+ com e-mail)
5. Rolar e carregar mais: deve adicionar mais 10 leads com e-mail
6. Contador deve continuar: 87 (não muda)
```

### **Cenário 3: Filtro "Tem Whatsapp"**

```
1. Ativar filtro "Tem Whatsapp"
2. Verificar contador: deve mostrar total real (ex: 42)
3. Verificar leads exibidos: deve mostrar apenas leads com whatsapp
4. Verificar quantidade: deve mostrar 10 leads (se houver 10+ com whatsapp)
5. Contador deve continuar: 42 (não muda)
```

### **Cenário 4: Filtro de Busca**

```
1. Digitar "João" na busca
2. Verificar contador: deve mostrar total de leads com "João" no nome/empresa
3. Verificar leads exibidos: deve mostrar apenas leads que contêm "João"
4. Contador deve refletir o total real no backend
```

### **Cenário 5: Múltiplos Filtros**

```
1. Ativar "Tem E-mail" E "Tem Whatsapp"
2. Verificar contador: deve mostrar total de leads com AMBOS
3. Verificar leads exibidos: deve mostrar apenas leads com e-mail E whatsapp
4. Contador deve refletir o total real no backend
```

### **Cenário 6: Remover Filtros**

```
1. Com filtros ativos, remover todos os filtros
2. Verificar contador: deve voltar ao total original (ex: 150)
3. Verificar leads exibidos: deve mostrar todos os leads novamente
4. Deve recarregar do backend (não usar cache)
```

---

## 📊 EXEMPLO DE QUERY SQL CORRETA

### **Sem Filtros:**

```sql
SELECT COUNT(*) FROM leads 
WHERE column_id = 'uuid' AND status = 'active';
-- Retorna: 150

SELECT * FROM leads 
WHERE column_id = 'uuid' AND status = 'active'
ORDER BY position
LIMIT 10 OFFSET 0;
-- Retorna: 10 leads
```

### **Com Filtro "Tem E-mail":**

```sql
SELECT COUNT(*) FROM leads 
WHERE column_id = 'uuid' 
  AND status = 'active'
  AND (primary_email IS NOT NULL OR emails != '[]'::jsonb);
-- Retorna: 87

SELECT * FROM leads 
WHERE column_id = 'uuid' 
  AND status = 'active'
  AND (primary_email IS NOT NULL OR emails != '[]'::jsonb)
ORDER BY position
LIMIT 10 OFFSET 0;
-- Retorna: 10 leads (apenas os que têm e-mail)
```

### **Com Filtro "Tem Whatsapp":**

```sql
SELECT COUNT(*) FROM leads 
WHERE column_id = 'uuid' 
  AND status = 'active'
  AND (primary_phone IS NOT NULL OR phones != '[]'::jsonb);
-- Retorna: 42

SELECT * FROM leads 
WHERE column_id = 'uuid' 
  AND status = 'active'
  AND (primary_phone IS NOT NULL OR phones != '[]'::jsonb)
ORDER BY position
LIMIT 10 OFFSET 0;
-- Retorna: 10 leads (apenas os que têm whatsapp)
```

### **Com Filtro de Busca:**

```sql
SELECT COUNT(*) FROM leads 
WHERE column_id = 'uuid' 
  AND status = 'active'
  AND (client_name ILIKE '%joão%' OR company ILIKE '%joão%');
-- Retorna: 5

SELECT * FROM leads 
WHERE column_id = 'uuid' 
  AND status = 'active'
  AND (client_name ILIKE '%joão%' OR company ILIKE '%joão%')
ORDER BY position
LIMIT 10 OFFSET 0;
-- Retorna: 5 leads (todos que contêm "joão")
```

---

## 🎯 RESULTADO ESPERADO

### **Antes da Correção (ERRADO):**

```
Backend: 150 leads, 87 têm e-mail
Frontend carregou: 10 leads, 6 têm e-mail

Com filtro "Tem E-mail":
❌ Contador: 6 (ERRADO - apenas dos 10 carregados)
❌ Leads exibidos: 6 (ERRADO - apenas dos 10 carregados)
❌ Não mostra os outros 81 leads com e-mail
```

### **Depois da Correção (CORRETO):**

```
Backend: 150 leads, 87 têm e-mail
Frontend carrega: 10 leads COM FILTRO APLICADO

Com filtro "Tem E-mail":
✅ Contador: 87 (CORRETO - total real no backend)
✅ Leads exibidos: 10 (CORRETO - primeira página filtrada)
✅ Ao rolar, carrega mais 10 leads com e-mail
✅ Mostra todos os 87 leads com e-mail (paginação)
```

---

## 📝 NOTAS IMPORTANTES

1. **Performance:**
   - Filtros no backend são mais eficientes (menos dados transferidos)
   - COUNT com filtros é rápido (índices no banco)
   - Frontend não precisa processar grandes arrays

2. **Consistência:**
   - Contadores sempre refletem o estado real do banco
   - Não há discrepância entre contador e leads exibidos
   - Paginação funciona corretamente com filtros

3. **UX:**
   - Usuário vê o total real de leads que passam no filtro
   - Paginação funciona corretamente
   - Filtros são aplicados instantaneamente (sem recarregar página inteira)

---

## 🚀 PRIORIDADE

**🔴 ALTA PRIORIDADE**

Este é um bug crítico que afeta:
- Contadores incorretos
- Leads incorretos sendo exibidos
- Experiência do usuário comprometida
- Decisões baseadas em dados incorretos

---

**Data:** 10/12/2025  
**Autor:** Sistema de Auditoria  
**Status:** ⚠️ **BUG CRÍTICO - REQUER CORREÇÃO IMEDIATA**

