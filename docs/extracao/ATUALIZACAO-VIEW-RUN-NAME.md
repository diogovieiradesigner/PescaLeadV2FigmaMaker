# ✅ Atualização: View `lead_extraction_recent_runs` com `run_name`

## 🎯 Problema Identificado

O Figma maker atualizou o frontend para usar `run_name`, mas a view `lead_extraction_recent_runs` não retornava esse campo, causando problemas no frontend.

---

## ✅ Solução Aplicada

### **View Atualizada**

A view `lead_extraction_recent_runs` foi recriada para incluir `run_name`:

```sql
CREATE OR REPLACE VIEW lead_extraction_recent_runs AS
SELECT 
    r.id,
    r.extraction_id,
    e.extraction_name,
    r.run_name,  -- ✅ NOVO: Campo adicionado
    r.workspace_id,
    r.search_term,
    r.location,
    r.status,
    r.target_quantity,
    r.pages_consumed,
    r.found_quantity,
    r.created_quantity,
    r.duplicates_skipped,
    r.filtered_out,
    r.credits_consumed,
    r.started_at,
    r.finished_at,
    r.execution_time_ms,
    r.error_message,
    r.ai_decisions,
    r.created_at
FROM lead_extraction_runs r
LEFT JOIN lead_extractions e ON e.id = r.extraction_id
ORDER BY r.created_at DESC
LIMIT 30;
```

---

## 📊 Campos Retornados pela View

A view agora retorna:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID da run |
| `extraction_id` | UUID | ID da extração |
| `extraction_name` | TEXT | Nome da configuração de extração |
| **`run_name`** | **TEXT** | **✅ NOVO: Nome único da run** |
| `workspace_id` | UUID | ID do workspace |
| `search_term` | TEXT | Termo de busca |
| `location` | TEXT | Localização |
| `status` | TEXT | Status da run |
| `target_quantity` | INTEGER | Meta de leads |
| `pages_consumed` | INTEGER | Páginas consumidas |
| `found_quantity` | INTEGER | Leads encontrados |
| `created_quantity` | INTEGER | Leads criados |
| `duplicates_skipped` | INTEGER | Duplicados ignorados |
| `filtered_out` | INTEGER | Filtrados |
| `credits_consumed` | INTEGER | Créditos consumidos |
| `started_at` | TIMESTAMP | Quando começou |
| `finished_at` | TIMESTAMP | Quando terminou |
| `execution_time_ms` | INTEGER | Tempo de execução |
| `error_message` | TEXT | Mensagem de erro |
| `ai_decisions` | JSONB | Decisões da IA |
| `created_at` | TIMESTAMP | Data de criação |

---

## 🎯 Uso no Frontend

Agora o frontend pode usar `run_name` diretamente da view:

```typescript
// Buscar runs usando a view
const { data: runs } = await supabase
  .from('lead_extraction_recent_runs')
  .select('*')
  .order('created_at', { ascending: false });

// Exibir no componente
runs.map(run => (
  <div key={run.id}>
    <h3>{run.run_name || run.extraction_name}</h3>
    {/* ... */}
  </div>
));
```

---

## ✅ Status

- ✅ View atualizada com `run_name`
- ✅ Migração aplicada no banco
- ✅ Frontend já atualizado pelo Figma maker
- ✅ Sistema completo funcionando

---

**Status:** ✅ **View Atualizada - Pronto para Usar!**

