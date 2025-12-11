# 📊 FLUXO COMPLETO: CONSULTA DE LEADS, FILTROS E CONTADORES NO KANBAN

## 🎯 VISÃO GERAL

O sistema usa uma **arquitetura de 3 camadas** com estado complexo e filtros em cascata:

```
Backend (Supabase) → Hook (useKanbanData) → Filtros Frontend (App.tsx) → UI (KanbanBoard)
```

---

## 📥 PARTE 1: CONSULTA DE LEADS DO BACKEND

### 1.1 Hook: `useKanbanData.ts`

**Estado principal:**
```typescript
const [columnLeadsState, setColumnLeadsState] = useState<ColumnLeadsState>({});

// Estrutura de ColumnLeadsState:
interface ColumnLeadsState {
  [columnId: string]: {
    leads: CRMLead[];      // ✅ Leads carregados (paginados)
    offset: number;        // ✅ Posição de paginação
    total: number;         // ✅ Total de leads na coluna (do backend)
    hasMore: boolean;      // ✅ Se há mais leads para carregar
    loading: boolean;      // ✅ Estado de loading
  };
}
```

### 1.2 Carregamento Inicial (`loadFunnel`)

**Linha 83-163 do `useKanbanData.ts`:**

```typescript
const loadFunnel = useCallback(async (funnelId: string) => {
  // 1️⃣ Buscar estrutura do funil (colunas)
  const { funnel } = await funnelsService.getFunnelById(funnelId, { limit: 0, offset: 0 });
  
  // 2️⃣ Para cada coluna, carregar PRIMEIROS 10 LEADS
  for (const column of funnel.columns) {
    const { leads: columnLeads, total } = await funnelsService.getLeadsByColumn(
      column.id,
      workspaceId,
      { limit: 10, offset: 0 }  // ⚠️ PAGINAÇÃO: Só carrega 10 leads
    );

    // 3️⃣ Armazenar no estado
    newColumnState[column.id] = {
      leads: columnLeads || [],           // ⚠️ Array com 10 leads
      offset: columnLeads?.length || 0,   // offset = 10
      total: total || 0,                  // ✅ TOTAL DO BACKEND (ex: 150)
      hasMore: (columnLeads?.length || 0) < (total || 0),  // true se 10 < 150
      loading: false,
    };
  }
}, [workspaceId]);
```

**Query SQL no backend (`funnels-service.ts` linha 241-259):**

```sql
-- 1. Contar TOTAL de leads na coluna
SELECT COUNT(id) 
FROM leads 
WHERE column_id = 'uuid-coluna' 
  AND status = 'active';
-- Retorna: total = 150

-- 2. Buscar leads PAGINADOS
SELECT * 
FROM leads 
WHERE column_id = 'uuid-coluna' 
  AND status = 'active'
ORDER BY position
LIMIT 10 OFFSET 0;
-- Retorna: array com 10 leads
```

**⚠️ PROBLEMA IDENTIFICADO:**

```typescript
// columnLeadsState tem:
{
  'coluna-1-id': {
    leads: [10 leads carregados],  // ⚠️ Array com 10 itens
    total: 150,                     // ✅ Total real do backend
    hasMore: true
  }
}
```

---

## 🔄 PARTE 2: TRANSFORMAÇÃO DOS DADOS NO APP.tsx

### 2.1 Conversão para formato do KanbanBoard

**Linha 75-82 do `useKanbanData.ts`:**

```typescript
// Hook retorna 'columns' que são usadas no App.tsx
const columns: KanbanColumn[] = useMemo(() => {
  if (!currentFunnel) return [];
  
  return currentFunnel.columns.map(col => ({
    id: col.id,
    title: col.title,
    leads: columnLeadsState[col.id]?.leads || [],  // ⚠️ Apenas leads carregados
  }));
}, [currentFunnel, columnLeadsState]);
```

**Estrutura resultante:**

```typescript
columns = [
  {
    id: 'coluna-1-id',
    title: 'Novos',
    leads: [10 leads]  // ⚠️ Array com 10 leads (não 150!)
  },
  {
    id: 'coluna-2-id',
    title: 'Contato',
    leads: [8 leads]
  }
]
```

---

## 🎨 PARTE 3: FILTROS NO APP.tsx

### 3.1 Pipeline de Filtros (Cascata)

**App.tsx linhas 338-419:**

```typescript
// 🔍 FILTRO 1: Busca por texto
const filteredColumns = useMemo(() => {
  if (!searchQuery.trim()) return columns;  // Sem busca = retorna original

  const query = searchQuery.toLowerCase();
  
  return columns.map(column => ({
    ...column,
    leads: column.leads.filter(lead =>  // ⚠️ Filtra APENAS os leads carregados
      lead.clientName.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      lead.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }));
}, [columns, searchQuery]);

// 🔍 FILTRO 2: E-mail e Whatsapp
const filteredAndFilteredColumns = useMemo(() => {
  const hasActiveFilters = leadFilters.hasEmail || leadFilters.hasWhatsapp;
  if (!hasActiveFilters) return filteredColumns;  // Sem filtros = retorna do filtro 1

  return filteredColumns.map(column => ({
    ...column,
    leads: column.leads.filter(lead => {  // ⚠️ Filtra APENAS os leads já filtrados
      let passesFilter = true;

      // Filtro: Tem E-mail
      if (leadFilters.hasEmail) {
        const hasEmail = 
          (lead.email && lead.email.trim() !== '') || 
          (lead.customFields?.some(field => 
            field.fieldType === 'email' && field.fieldValue && field.fieldValue.trim() !== ''
          ));
        if (!hasEmail) passesFilter = false;
      }

      // Filtro: Tem Whatsapp
      if (leadFilters.hasWhatsapp) {
        const hasWhatsapp = 
          (lead.phone && lead.phone.trim() !== '') ||
          (lead.customFields?.some(field => 
            (field.fieldType === 'phone' || field.fieldName.toLowerCase().includes('whatsapp')) && 
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

**Exemplo Prático:**

```typescript
// Estado inicial (do backend):
columns[0] = {
  id: 'coluna-1',
  title: 'Novos',
  leads: [10 leads carregados de 150 totais]
}

// Após filtro de E-mail:
filteredAndFilteredColumns[0] = {
  id: 'coluna-1',
  title: 'Novos',
  leads: [6 leads com e-mail]  // ⚠️ Filtra APENAS dos 10 carregados!
}
```

---

## 🔢 PARTE 4: CONTADORES (O PROBLEMA!)

### 4.1 Estado de Contadores (tentativa de correção)

**App.tsx linhas 421-437:**

```typescript
const filteredColumnLeadsState = useMemo(() => {
  const hasActiveFilters = leadFilters.hasEmail || leadFilters.hasWhatsapp;
  if (!hasActiveFilters) return columnLeadsState;  // ✅ Sem filtros: usa total do backend

  // ⚠️ Com filtros: tenta calcular total baseado nos leads filtrados
  const newState: { [columnId: string]: any } = {};
  
  filteredAndFilteredColumns.forEach(column => {
    const originalState = columnLeadsState[column.id];
    newState[column.id] = {
      ...originalState,
      total: column.leads.length,  // ❌ ERRO! Conta apenas leads carregados e filtrados
      hasMore: false,              // Desabilita "carregar mais"
    };
  });

  return newState;
}, [columnLeadsState, filteredAndFilteredColumns, leadFilters]);
```

### 4.2 Passagem para KanbanBoard

**App.tsx linha 1090:**

```typescript
<KanbanBoard
  columns={filteredAndFilteredColumns}
  columnStates={filteredColumnLeadsState}  // ⚠️ Estado com contadores
  // ...
/>
```

### 4.3 Exibição no KanbanColumn

**KanbanColumn.tsx linha 93:**

```typescript
const displayTotal = total !== undefined ? total : leads.length;

// Renderização (linha 126):
<span className="...">
  {displayTotal}  // ⚠️ Mostra o total incorreto
</span>
```

---

## 🐛 ANÁLISE DO PROBLEMA

### ❌ Cenário com Erro:

```typescript
// BACKEND (realidade):
Coluna "Novos": 150 leads totais
  - 87 leads com e-mail
  - 63 leads sem e-mail

// FRONTEND (carregado):
columns[0].leads = [10 leads carregados]
  - 6 com e-mail
  - 4 sem e-mail

// APÓS FILTRO "Tem E-mail":
filteredAndFilteredColumns[0].leads = [6 leads]

// CONTADOR MOSTRADO:
filteredColumnLeadsState[columnId].total = 6  // ❌ ERRADO!
// Deveria ser: 87 (total real do backend com e-mail)
```

---

## ✅ SOLUÇÃO NECESSÁRIA

### Opção 1: RPC no Supabase (Recomendado)

Criar função SQL que retorna contadores filtrados:

```sql
CREATE OR REPLACE FUNCTION get_filtered_lead_counts(
  p_funnel_id UUID,
  p_has_email BOOLEAN DEFAULT FALSE,
  p_has_whatsapp BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  column_id UUID,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.column_id,
    COUNT(*) as total_count
  FROM leads l
  LEFT JOIN lead_custom_fields lcf ON lcf.lead_id = l.id
  WHERE l.funnel_id = p_funnel_id
    AND l.status = 'active'
    -- Filtro de e-mail
    AND (
      NOT p_has_email 
      OR l.email IS NOT NULL AND l.email != ''
      OR EXISTS (
        SELECT 1 FROM lead_custom_fields 
        WHERE lead_id = l.id 
          AND field_type = 'email' 
          AND field_value IS NOT NULL 
          AND field_value != ''
      )
    )
    -- Filtro de whatsapp
    AND (
      NOT p_has_whatsapp
      OR l.phone IS NOT NULL AND l.phone != ''
      OR EXISTS (
        SELECT 1 FROM lead_custom_fields 
        WHERE lead_id = l.id 
          AND (field_type = 'phone' OR field_name ILIKE '%whatsapp%')
          AND field_value IS NOT NULL 
          AND field_value != ''
      )
    )
  GROUP BY l.column_id;
END;
$$ LANGUAGE plpgsql;
```

**Uso no frontend:**

```typescript
const { data: filteredCounts } = await supabase.rpc('get_filtered_lead_counts', {
  p_funnel_id: currentFunnelId,
  p_has_email: leadFilters.hasEmail,
  p_has_whatsapp: leadFilters.hasWhatsapp
});

// Atualizar contadores com valores reais do backend
```

### Opção 2: Consulta Direta (Mais Simples, mas múltiplas queries)

Para cada coluna, fazer uma query count com filtros:

```typescript
const { count } = await supabase
  .from('leads')
  .select('id', { count: 'exact', head: true })
  .eq('column_id', columnId)
  .eq('status', 'active')
  .not('email', 'is', null);  // Filtro de e-mail
```

---

## 📊 RESUMO DO FLUXO ATUAL

```
┌─────────────────────────────────────────────────────────────┐
│ 1. BACKEND (Supabase)                                       │
│    - Total real: 150 leads na coluna                        │
│    - Retorna: 10 leads + total=150                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. useKanbanData.ts                                         │
│    - columnLeadsState[columnId].leads = [10 leads]          │
│    - columnLeadsState[columnId].total = 150                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. App.tsx - Conversão                                      │
│    - columns[0].leads = [10 leads] (do estado)              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. App.tsx - Filtro Busca                                   │
│    - filteredColumns[0].leads = [8 leads] (busca 'joão')    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. App.tsx - Filtro E-mail/Whatsapp                         │
│    - filteredAndFilteredColumns[0].leads = [6 leads]        │
│      ⚠️ Filtra APENAS dos 8 leads (já filtrados)            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. App.tsx - Contador                                       │
│    - filteredColumnLeadsState[columnId].total = 6           │
│      ❌ ERRADO! Deveria consultar backend                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. KanbanColumn.tsx - Exibição                              │
│    - Mostra: "Novos (6)" ❌                                 │
│    - Deveria mostrar: "Novos (87)" ✅                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 CONCLUSÃO

**O problema:**
- Os filtros só aplicam em **leads já carregados** (paginação de 10 em 10)
- Os contadores mostram quantidade de **leads filtrados carregados**, não o **total real do backend**

**Por que está errado:**
```
Backend tem: 150 leads (87 com e-mail)
Frontend carregou: 10 leads (6 com e-mail)
Filtro aplicado: "Tem e-mail"
Contador mostra: 6 ❌
Contador deveria mostrar: 87 ✅
```

**Solução necessária:**
- Criar RPC no Supabase que conta leads filtrados DIRETAMENTE NO BANCO
- Chamar essa RPC quando filtros mudarem
- Atualizar `filteredColumnLeadsState` com valores reais do backend

