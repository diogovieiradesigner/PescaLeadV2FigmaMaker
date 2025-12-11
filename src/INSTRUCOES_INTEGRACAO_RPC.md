# 🔧 INSTRUÇÕES DE INTEGRAÇÃO: RPC de Contadores Filtrados

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] **Passo 1:** Executar SQL no Supabase Dashboard
- [ ] **Passo 2:** Testar RPC manualmente
- [ ] **Passo 3:** Integrar no App.tsx
- [ ] **Passo 4:** Verificar funcionamento
- [ ] **Passo 5:** (Opcional) Otimizar com cache

---

## 🗄️ PASSO 1: Criar RPC no Supabase

### 1.1 Acessar Supabase Dashboard

1. Abra: https://supabase.com/dashboard
2. Selecione o projeto: **nlbcwaxkeaddfocigwuk**
3. Vá em: **SQL Editor** (ícone de banco de dados no menu lateral)

### 1.2 Executar SQL

Copie e cole o conteúdo do arquivo `/SOLUCAO_RPC_CONTADORES.sql` no editor SQL e execute (botão "Run" ou Ctrl+Enter).

**⚠️ IMPORTANTE:** Verifique se a função foi criada com sucesso. Deve aparecer:

```
Success. No rows returned
```

---

## 🧪 PASSO 2: Testar RPC Manualmente

No mesmo SQL Editor, execute os testes:

### Teste 1: Sem filtros (deve retornar todos os leads)

```sql
SELECT * FROM get_filtered_lead_counts(
  (SELECT id FROM funnels LIMIT 1),  -- Pegar um funnel real
  FALSE,  -- has_email
  FALSE   -- has_whatsapp
);
```

**Resultado esperado:**
```
column_id                              | total_count
-------------------------------------  | -----------
uuid-coluna-1                          | 150
uuid-coluna-2                          | 87
```

### Teste 2: Com filtro de e-mail

```sql
SELECT * FROM get_filtered_lead_counts(
  (SELECT id FROM funnels LIMIT 1),
  TRUE,   -- has_email
  FALSE   -- has_whatsapp
);
```

**Resultado esperado:** Números menores que o teste 1 (apenas leads com e-mail)

---

## 🔗 PASSO 3: Integrar no App.tsx

### 3.1 Adicionar import

```typescript
import { getFilteredLeadCounts } from './services/filtered-counts-service';
```

### 3.2 Criar novo useMemo para contadores filtrados

**Substituir o `filteredColumnLeadsState` existente (linhas 421-437) por:**

```typescript
// Calculate filtered column states with correct totals FROM BACKEND
const filteredColumnLeadsState = useMemo(() => {
  const hasActiveFilters = leadFilters.hasEmail || leadFilters.hasWhatsapp;
  
  // ✅ Sem filtros: usar estado original do backend
  if (!hasActiveFilters) return columnLeadsState;

  // ❌ NÃO PODEMOS CALCULAR AQUI - precisa do backend
  // Retornar estado vazio temporariamente até a query assíncrona completar
  return columnLeadsState; // Placeholder
}, [columnLeadsState, leadFilters]);
```

### 3.3 Adicionar estado para contadores do backend

**Adicionar após as declarações de estado (linha ~70):**

```typescript
const [backendFilteredCounts, setBackendFilteredCounts] = useState<Map<string, number>>(new Map());
```

### 3.4 Adicionar useEffect para buscar contadores

**Adicionar após outros useEffects (linha ~250):**

```typescript
// ✅ Buscar contadores filtrados do backend quando filtros mudam
useEffect(() => {
  const hasActiveFilters = leadFilters.hasEmail || leadFilters.hasWhatsapp;
  
  // Sem filtros: limpar contadores do backend
  if (!hasActiveFilters) {
    setBackendFilteredCounts(new Map());
    return;
  }

  // Sem funnel selecionado: não fazer nada
  if (!currentFunnelId) {
    return;
  }

  // Buscar contadores do backend
  const fetchFilteredCounts = async () => {
    console.log('[APP] 🔍 Buscando contadores filtrados do backend...');
    
    const { counts, error } = await getFilteredLeadCounts({
      funnelId: currentFunnelId,
      hasEmail: leadFilters.hasEmail,
      hasWhatsapp: leadFilters.hasWhatsapp,
    });

    if (error) {
      console.error('[APP] ❌ Erro ao buscar contadores filtrados:', error);
      toast.error('Erro ao atualizar contadores');
      return;
    }

    console.log('[APP] ✅ Contadores filtrados carregados:', counts);
    setBackendFilteredCounts(counts);
  };

  fetchFilteredCounts();
}, [leadFilters, currentFunnelId]);
```

### 3.5 Atualizar `filteredColumnLeadsState` para usar contadores do backend

**Substituir o useMemo anterior por:**

```typescript
// Calculate filtered column states with correct totals FROM BACKEND
const filteredColumnLeadsState = useMemo(() => {
  const hasActiveFilters = leadFilters.hasEmail || leadFilters.hasWhatsapp;
  
  // ✅ Sem filtros: usar estado original do backend
  if (!hasActiveFilters) return columnLeadsState;

  // ✅ Com filtros: usar contadores do backend (RPC)
  const newState: { [columnId: string]: any } = {};
  
  filteredAndFilteredColumns.forEach(column => {
    const originalState = columnLeadsState[column.id];
    const backendTotal = backendFilteredCounts.get(column.id);
    
    newState[column.id] = {
      ...originalState,
      leads: column.leads, // Leads filtrados no frontend (para exibição)
      total: backendTotal !== undefined ? backendTotal : column.leads.length, // ✅ Total do backend
      hasMore: false, // Desabilitar paginação durante filtros
    };
  });

  return newState;
}, [columnLeadsState, filteredAndFilteredColumns, leadFilters, backendFilteredCounts]);
```

---

## ✅ PASSO 4: Verificar Funcionamento

### 4.1 Teste Manual

1. Abra o app e vá para a tela de Pipeline (Kanban)
2. Observe os contadores nas colunas (ex: "Novos (150)")
3. Ative o filtro "Tem E-mail"
4. **Aguarde ~1 segundo** (query do backend)
5. Contadores devem atualizar para o total real (ex: "Novos (87)")

### 4.2 Verificar no Console

Abra o DevTools (F12) e procure por logs:

```
[APP] 🔍 Buscando contadores filtrados do backend...
[FILTERED-COUNTS] 🔍 Buscando contadores filtrados: { funnelId: '...', hasEmail: true, hasWhatsapp: false }
[FILTERED-COUNTS] ✅ Contadores carregados: { columns: 3, totals: [...] }
[APP] ✅ Contadores filtrados carregados: Map(3) { ... }
```

### 4.3 Comparação Antes/Depois

**ANTES (Errado):**
```
Backend: 150 leads (87 com e-mail)
Frontend carregou: 10 leads
Filtro "Tem E-mail" aplicado
Contador mostra: 6 ❌ (só dos 10 carregados)
```

**DEPOIS (Correto):**
```
Backend: 150 leads (87 com e-mail)
Frontend carregou: 10 leads
Filtro "Tem E-mail" aplicado
RPC consulta backend: 87 leads com e-mail
Contador mostra: 87 ✅ (total real do backend)
```

---

## 🚀 PASSO 5: (Opcional) Otimizações

### 5.1 Adicionar Loading State

```typescript
const [loadingFilteredCounts, setLoadingFilteredCounts] = useState(false);

// No useEffect:
setLoadingFilteredCounts(true);
const { counts, error } = await getFilteredLeadCounts(...);
setLoadingFilteredCounts(false);

// No KanbanFilters:
<KanbanFilters
  theme={theme}
  filters={leadFilters}
  onFiltersChange={setLeadFilters}
  loading={loadingFilteredCounts}  // Mostrar spinner
/>
```

### 5.2 Adicionar Debounce (se múltiplos filtros)

Se adicionar mais filtros no futuro, considere debounce:

```typescript
import { useDebounce } from './hooks/useDebounce';

const debouncedFilters = useDebounce(leadFilters, 300); // 300ms

useEffect(() => {
  // Usar debouncedFilters ao invés de leadFilters
}, [debouncedFilters, currentFunnelId]);
```

### 5.3 Cache com React Query (Avançado)

```typescript
import { useQuery } from '@tanstack/react-query';

const { data: filteredCounts } = useQuery({
  queryKey: ['filtered-counts', currentFunnelId, leadFilters],
  queryFn: () => getFilteredLeadCounts({
    funnelId: currentFunnelId!,
    hasEmail: leadFilters.hasEmail,
    hasWhatsapp: leadFilters.hasWhatsapp,
  }),
  enabled: !!currentFunnelId && (leadFilters.hasEmail || leadFilters.hasWhatsapp),
  staleTime: 30000, // Cache por 30 segundos
});
```

---

## 🐛 TROUBLESHOOTING

### Problema: RPC não encontrada

**Erro:** `function get_filtered_lead_counts(...) does not exist`

**Solução:** 
1. Verifique se o SQL foi executado no projeto correto
2. Verifique se há erros de sintaxe no SQL
3. Tente executar `DROP FUNCTION IF EXISTS get_filtered_lead_counts;` antes de criar

### Problema: Contadores não atualizam

**Sintomas:** Filtros aplicados mas contadores não mudam

**Soluções:**
1. Verifique logs no console (`[APP]` e `[FILTERED-COUNTS]`)
2. Verifique se `backendFilteredCounts` está populado: `console.log(backendFilteredCounts)`
3. Verifique se `currentFunnelId` está definido
4. Verifique permissões da RPC no Supabase

### Problema: Performance lenta

**Sintomas:** Contadores demoram mais de 2 segundos para atualizar

**Soluções:**
1. Adicionar índices (veja comentários no SQL)
2. Verificar quantidade de leads (> 100k pode precisar otimização)
3. Considerar cache com React Query

---

## 📊 MÉTRICAS DE SUCESSO

Após implementação, você deve ver:

✅ **Contadores corretos:** Total real do backend, não só dos leads carregados
✅ **Performance aceitável:** < 500ms para atualizar contadores
✅ **Sem erros no console:** Logs de sucesso do RPC
✅ **UX mantida:** Filtros respondem imediatamente (leads filtrados no frontend)

---

## 📝 NOTAS FINAIS

- A RPC é executada apenas quando filtros estão ativos
- Sem filtros, usa o `total` original do `columnLeadsState` (mais rápido)
- Leads exibidos continuam sendo filtrados no frontend (paginação mantida)
- Apenas os **contadores** vêm do backend (query otimizada)

**Arquivos modificados:**
- `/SOLUCAO_RPC_CONTADORES.sql` (criar no Supabase)
- `/services/filtered-counts-service.ts` (já criado)
- `/App.tsx` (modificar conforme instruções acima)

**Tempo estimado de implementação:** 15-20 minutos

