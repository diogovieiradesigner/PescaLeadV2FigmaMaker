# 📊 DOCUMENTAÇÃO: Funcionamento Atual do Sistema de Leads no Kanban

## 🎯 VISÃO GERAL

Este documento descreve **como o sistema funciona atualmente** para consultar leads, aplicar filtros e calcular contadores no kanban.

---

## 1️⃣ CONSULTA DE LEADS DO BACKEND

### 1.1 Estrutura de Estado (`useKanbanData.ts`)

O hook mantém um estado para cada coluna do funil:

```typescript
// Linha 8-16 de /hooks/useKanbanData.ts
interface ColumnLeadsState {
  [columnId: string]: {
    leads: CRMLead[];      // Array de leads carregados
    offset: number;        // Posição atual na paginação
    total: number;         // Total de leads na coluna (do backend)
    hasMore: boolean;      // Se há mais leads para carregar
    loading: boolean;      // Estado de loading
  };
}
```

### 1.2 Carregamento Inicial de Leads

**Arquivo:** `/hooks/useKanbanData.ts` (linhas 83-163)

Quando um funil é carregado:

```typescript
const loadFunnel = useCallback(async (funnelId: string) => {
  // 1. Buscar estrutura do funil (colunas)
  const { funnel } = await funnelsService.getFunnelById(funnelId, { limit: 0, offset: 0 });
  
  // 2. Para cada coluna, fazer request separado
  for (const column of funnel.columns) {
    const { leads: columnLeads, total } = await funnelsService.getLeadsByColumn(
      column.id,
      workspaceId,
      { limit: 10, offset: 0 }  // Parâmetro: 10 leads por vez
    );

    // 3. Armazenar no estado
    newColumnState[column.id] = {
      leads: columnLeads || [],           // Array retornado do backend
      offset: columnLeads?.length || 0,   // Próxima posição para carregar
      total: total || 0,                  // Total retornado pela query COUNT
      hasMore: (columnLeads?.length || 0) < (total || 0),
      loading: false,
    };
  }
  
  setColumnLeadsState(newColumnState);
}, [workspaceId]);
```

### 1.3 Query SQL no Backend

**Arquivo:** `/services/funnels-service.ts` (linhas 224-274)

A função `getLeadsByColumn` executa duas queries:

```typescript
export async function getLeadsByColumn(
  columnId: string,
  workspaceId: string,
  options?: { limit?: number; offset?: number; }
) {
  const limit = options?.limit || 10;
  const offset = options?.offset || 0;

  // Query 1: Contar total
  const { count, error: countError } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('column_id', columnId)
    .eq('status', 'active');

  // Query 2: Buscar leads paginados
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('column_id', columnId)
    .eq('status', 'active')
    .order('position')
    .range(offset, offset + limit - 1);

  return { leads, total: count || 0, error: null };
}
```

**Resultado típico:**
- `count` = 150 (total de leads na coluna)
- `leads` = array com 10 objetos (leads paginados)

### 1.4 Conversão para Formato do Kanban

**Arquivo:** `/hooks/useKanbanData.ts` (linhas 75-82)

O hook expõe `columns` que são usadas no App.tsx:

```typescript
const columns: KanbanColumn[] = useMemo(() => {
  if (!currentFunnel) return [];
  
  return currentFunnel.columns.map(col => ({
    id: col.id,
    title: col.title,
    leads: columnLeadsState[col.id]?.leads || [],  // Apenas leads carregados
  }));
}, [currentFunnel, columnLeadsState]);
```

**Estrutura resultante:**
```javascript
columns = [
  {
    id: 'uuid-coluna-1',
    title: 'Novos',
    leads: [/* array com 10 leads */]
  },
  {
    id: 'uuid-coluna-2',
    title: 'Contato',
    leads: [/* array com 8 leads */]
  }
]
```

---

## 2️⃣ PAGINAÇÃO (Load More)

### 2.1 Função de Carregar Mais

**Arquivo:** `/hooks/useKanbanData.ts` (linhas 168-250)

Quando o usuário rola até o fim da coluna:

```typescript
const loadMoreLeads = useCallback(async (columnId: string) => {
  setColumnLeadsState(prev => {
    const columnState = prev[columnId];
    const offset = columnState.offset;
    
    // Executar carregamento assíncrono
    (async () => {
      const { leads: newLeads, total } = await funnelsService.getLeadsByColumn(
        columnId,
        workspaceId,
        { limit: 10, offset }  // Carregar próximos 10
      );

      // Adicionar novos leads ao array existente
      setColumnLeadsState(prev => ({
        ...prev,
        [columnId]: {
          ...prev[columnId],
          leads: [...prev[columnId].leads, ...newLeads],  // Concatenar
          offset: prev[columnId].offset + newLeads.length,
          total,
          hasMore: (prev[columnId].offset + newLeads.length) < total,
          loading: false,
        },
      }));
    })();
    
    return { ...prev, [columnId]: { ...prev[columnId], loading: true } };
  });
}, [workspaceId]);
```

**Comportamento:**
- Cada chamada adiciona mais 10 leads ao array existente
- Array cresce progressivamente: 10 → 20 → 30 → ...
- `total` continua sendo o valor retornado do backend (não muda)

---

## 3️⃣ FILTROS NO FRONTEND

### 3.1 Pipeline de Filtros em Cascata

**Arquivo:** `/App.tsx` (linhas 338-419)

Os filtros são aplicados em sequência:

#### Filtro 1: Busca por Texto

```typescript
const filteredColumns = useMemo(() => {
  if (!searchQuery.trim()) return columns;

  const query = searchQuery.toLowerCase();
  
  return columns.map(column => ({
    ...column,
    leads: column.leads.filter(lead =>
      lead.clientName.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      lead.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }));
}, [columns, searchQuery]);
```

**O que acontece:**
- Recebe `columns` do hook (com leads carregados)
- Aplica `.filter()` no array de leads
- Retorna novo array com apenas leads que passam no filtro

#### Filtro 2: E-mail e Whatsapp

```typescript
const filteredAndFilteredColumns = useMemo(() => {
  const hasActiveFilters = leadFilters.hasEmail || leadFilters.hasWhatsapp;
  if (!hasActiveFilters) return filteredColumns;

  return filteredColumns.map(column => ({
    ...column,
    leads: column.leads.filter(lead => {
      let passesFilter = true;

      // Filtro: Tem E-mail
      if (leadFilters.hasEmail) {
        const hasEmail = 
          (lead.email && lead.email.trim() !== '') || 
          (lead.customFields?.some(field => 
            field.fieldType === 'email' && 
            field.fieldValue && 
            field.fieldValue.trim() !== ''
          ));
        if (!hasEmail) passesFilter = false;
      }

      // Filtro: Tem Whatsapp
      if (leadFilters.hasWhatsapp) {
        const hasWhatsapp = 
          (lead.phone && lead.phone.trim() !== '') ||
          (lead.customFields?.some(field => 
            (field.fieldType === 'phone' || 
             field.fieldName.toLowerCase().includes('whatsapp')) && 
            field.fieldValue && 
            field.fieldValue.trim() !== ''
          ));
        if (!hasWhatsapp) passesFilter = false;
      }

      return passesFilter;
    })
  }));
}, [filteredColumns, leadFilters]);
```

**O que acontece:**
- Recebe `filteredColumns` (já filtrado por texto)
- Aplica `.filter()` novamente no array de leads
- Verifica campos padrão (`email`, `phone`)
- Verifica `customFields` (campos personalizados)
- Retorna novo array com leads que passam em TODOS os filtros

### 3.2 Exemplo de Fluxo de Dados

```javascript
// Entrada inicial (do backend):
columns[0].leads = [
  { id: '1', clientName: 'João', email: 'joao@email.com', phone: '11999999999' },
  { id: '2', clientName: 'Maria', email: '', phone: '11888888888' },
  { id: '3', clientName: 'José', email: 'jose@email.com', phone: '' },
  { id: '4', clientName: 'Ana', email: '', phone: '' },
  // ... mais 6 leads (total de 10 carregados)
]

// Após filtro de busca por "joão":
filteredColumns[0].leads = [
  { id: '1', clientName: 'João', email: 'joao@email.com', phone: '11999999999' }
]

// Após filtro "Tem E-mail":
// (aplicado em cima do resultado anterior)
filteredAndFilteredColumns[0].leads = [
  { id: '1', clientName: 'João', email: 'joao@email.com', phone: '11999999999' }
]
// Apenas 1 lead restante
```

---

## 4️⃣ CÁLCULO DE CONTADORES

### 4.1 Estado de Contadores Filtrados

**Arquivo:** `/App.tsx` (linhas 421-437)

```typescript
const filteredColumnLeadsState = useMemo(() => {
  const hasActiveFilters = leadFilters.hasEmail || leadFilters.hasWhatsapp;
  if (!hasActiveFilters) return columnLeadsState;

  // Quando há filtros ativos
  const newState: { [columnId: string]: any } = {};
  
  filteredAndFilteredColumns.forEach(column => {
    const originalState = columnLeadsState[column.id];
    newState[column.id] = {
      ...originalState,
      total: column.leads.length,  // Tamanho do array filtrado
      hasMore: false,              // Paginação desabilitada
    };
  });

  return newState;
}, [columnLeadsState, filteredAndFilteredColumns, leadFilters]);
```

**O que acontece:**
- Sem filtros: retorna `columnLeadsState` original (com `total` do backend)
- Com filtros: cria novo estado onde `total` = tamanho do array filtrado

### 4.2 Passagem para KanbanBoard

**Arquivo:** `/App.tsx` (linha ~1090)

```typescript
<KanbanBoard
  columns={filteredAndFilteredColumns}      // Leads filtrados
  columnStates={filteredColumnLeadsState}   // Estado com contadores
  onLeadMove={handleLeadMove}
  // ...
/>
```

### 4.3 Renderização no Componente

**Arquivo:** `/components/KanbanColumn.tsx` (linhas 20-52, 93, 126)

```typescript
interface KanbanColumnProps {
  id: string;
  title: string;
  leads: CRMLead[];      // Leads filtrados (para exibir)
  total?: number;        // Total (do estado)
  hasMore?: boolean;
  // ...
}

function KanbanColumnComponent({ id, title, leads, total, ... }) {
  // Linha 93:
  const displayTotal = total !== undefined ? total : leads.length;

  return (
    // Linha 126:
    <span className="...">
      {displayTotal}
    </span>
  );
}
```

**O que acontece:**
- Recebe `total` de `filteredColumnLeadsState`
- Se `total` existe, usa esse valor
- Senão, usa `leads.length` (tamanho do array)
- Renderiza o número na tela

---

## 5️⃣ FLUXO COMPLETO DE DADOS

### Cenário Sem Filtros

```
1. Backend:
   SELECT COUNT(*) FROM leads WHERE column_id = 'uuid' AND status = 'active';
   → Retorna: 150

   SELECT * FROM leads WHERE column_id = 'uuid' LIMIT 10 OFFSET 0;
   → Retorna: [10 leads]

2. Hook (useKanbanData):
   columnLeadsState['uuid'] = {
     leads: [10 leads],
     total: 150,
     hasMore: true
   }

3. App.tsx - Conversão:
   columns[0] = {
     id: 'uuid',
     title: 'Novos',
     leads: [10 leads]
   }

4. App.tsx - Sem filtros:
   filteredColumns = columns (não muda)
   filteredAndFilteredColumns = filteredColumns (não muda)
   filteredColumnLeadsState = columnLeadsState (não muda)

5. KanbanColumn:
   displayTotal = 150  (vem de total)
   Renderiza: "Novos (150)"
```

### Cenário Com Filtro "Tem E-mail"

```
1. Backend:
   (mesmas queries, nada muda)
   COUNT(*) → 150
   SELECT * → [10 leads]

2. Hook (useKanbanData):
   (mesmo estado)
   columnLeadsState['uuid'] = {
     leads: [10 leads],
     total: 150,
     hasMore: true
   }

3. App.tsx - Conversão:
   columns[0] = {
     id: 'uuid',
     title: 'Novos',
     leads: [10 leads]
   }

4. App.tsx - Filtro aplicado:
   // Dos 10 leads carregados, 6 têm e-mail
   filteredAndFilteredColumns[0] = {
     id: 'uuid',
     title: 'Novos',
     leads: [6 leads com e-mail]
   }

5. App.tsx - Estado de contadores:
   filteredColumnLeadsState['uuid'] = {
     leads: [6 leads],
     total: 6,           // column.leads.length
     hasMore: false
   }

6. KanbanColumn:
   displayTotal = 6    (vem de total)
   Renderiza: "Novos (6)"
```

---

## 6️⃣ DADOS DO BACKEND vs FRONTEND

### O que vem do Backend

**Primeira carga (`loadFunnel`):**
- Coluna "Novos": `total = 150`, `leads = [10 objetos]`
- Coluna "Contato": `total = 87`, `leads = [10 objetos]`

**Load more (paginação):**
- Coluna "Novos": `total = 150`, `leads = [10 objetos]` (próximos 10)
- Array acumula: 10 → 20 → 30 → ...

### O que é calculado no Frontend

**Sem filtros:**
- Contador usa `total` do backend (150)
- Leads exibidos: todos os carregados (10, 20, 30...)

**Com filtros:**
- Contador usa `column.leads.length` (tamanho do array filtrado)
- Leads exibidos: apenas os que passam no filtro
- Backend não é consultado novamente

---

## 7️⃣ ESTATÍSTICAS DO FUNIL

### Função RPC para Stats

**Arquivo:** `/hooks/useKanbanData.ts` (linhas 131-155)

```typescript
const { stats: optimizedStats } = await funnelsService.getFunnelStats(funnel.id);

setStats({
  totalLeads: optimizedStats?.totalLeads || 0,
  totalValue: optimizedStats?.totalValue || 0,
  highPriorityCount: optimizedStats?.highPriorityCount || 0,
  activeLeads: optimizedStats?.activeLeads || 0,
  conversionRate: optimizedStats?.conversionRate || 0,
});
```

**O que acontece:**
- Chama RPC `get_funnel_stats` no Supabase
- Retorna estatísticas agregadas do funil completo
- Não é afetado por filtros do frontend

---

## 8️⃣ RESUMO TÉCNICO

### Arquitetura de Dados

```
Backend (Supabase)
  ├─ Tabela: leads
  │   ├─ 150 registros na coluna "Novos"
  │   └─ Query: SELECT * LIMIT 10 OFFSET 0
  │
  └─ Retorna: { leads: [10 objetos], total: 150 }

        ↓

Hook (useKanbanData)
  ├─ State: columnLeadsState
  │   └─ { leads: [10], offset: 10, total: 150, hasMore: true }
  │
  └─ Expõe: columns (array com leads)

        ↓

App.tsx (Transformações)
  ├─ columns → filteredColumns (busca)
  ├─ filteredColumns → filteredAndFilteredColumns (email/whatsapp)
  └─ Cria: filteredColumnLeadsState
      └─ { total: array.length, hasMore: false }

        ↓

KanbanColumn (Renderização)
  └─ Mostra: total (do estado)
```

### Características

1. **Paginação:** Leads carregados em lotes de 10
2. **Filtros:** Aplicados apenas nos leads já carregados
3. **Contadores sem filtros:** Vem do backend (COUNT query)
4. **Contadores com filtros:** Calculados no frontend (array.length)
5. **Backend:** Não recebe informação sobre filtros ativos

---

## 📊 DADOS NUMÉRICOS (Exemplo Real)

**Banco de dados:**
- Coluna "Novos": 150 leads totais
  - 87 leads têm e-mail preenchido
  - 63 leads não têm e-mail
  - 42 leads têm e-mail E whatsapp

**Frontend carregado (primeira carga):**
- Array de leads: 10 objetos
  - 6 têm e-mail
  - 4 não têm e-mail
  - 3 têm e-mail E whatsapp

**Com filtro "Tem E-mail" ativo:**
- Array filtrado: 6 objetos (filtrados dos 10 carregados)
- Contador exibido: 6
- Total no backend com e-mail: 87 (não consultado)

**Sem filtros:**
- Array completo: 10 objetos (carregados)
- Contador exibido: 150 (vem do COUNT do backend)

---

## 🔄 CICLO DE VIDA COMPLETO

```
1. Usuário abre o Kanban
   → loadFunnel() é chamado
   → Backend retorna: total=150, leads=[10]
   → Estado armazena: { leads: [10], total: 150 }

2. Usuário NÃO aplica filtros
   → columns[0].leads = [10]
   → filteredColumnLeadsState.total = 150 (do backend)
   → Contador mostra: 150

3. Usuário aplica filtro "Tem E-mail"
   → filteredAndFilteredColumns[0].leads = [6] (filtrados dos 10)
   → filteredColumnLeadsState.total = 6 (array.length)
   → Contador mostra: 6

4. Usuário remove filtro
   → filteredAndFilteredColumns = columns (volta ao original)
   → filteredColumnLeadsState = columnLeadsState (volta ao original)
   → Contador mostra: 150 (do backend novamente)

5. Usuário rola e carrega mais
   → loadMoreLeads() é chamado
   → Backend retorna: leads=[10] (próximos 10)
   → Estado atualiza: { leads: [20], total: 150 }
   → Contador continua: 150

6. Com 20 leads carregados, aplica filtro "Tem E-mail"
   → Filtra dos 20 carregados
   → Supondo 12 têm e-mail (dos 20)
   → Contador mostra: 12
```

---

Fim da documentação descritiva.
