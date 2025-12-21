# 🔍 Análise Comparativa: Documentação vs Código Real

## 📋 Resumo Executivo

Este documento compara o arquivo `DOCUMENTACAO-SISTEMA-EXTRACAO-LEADS.md` (criado pelo Claude) com o código real do sistema para identificar **discrepâncias**, **informações desatualizadas** e **gaps** que precisam ser corrigidos.

---

## ⚠️ DISCREPÂNCIAS CRÍTICAS ENCONTRADAS

### 1. ❌ Número de API Keys Serper.dev

**Documentação diz:** 17 chaves  
**Código real:** 15 chaves

**Evidência:**
```typescript
// supabase/functions/fetch-google-maps/index.ts linha 19
const TOTAL_API_KEYS = 15;

// Linha 270
const keyIndex = ((page - 1) % TOTAL_API_KEYS) + 1;
```

**Correção necessária:** Atualizar documentação para refletir **15 chaves**, não 17.

---

### 2. ❌ Algoritmo de Hash de Deduplicação

**Documentação diz:** MD5  
**Código real:** SHA256

**Evidência:**
```typescript
// supabase/functions/fetch-google-maps/index.ts linha 98
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Linha 294-295
const hashInput = `${place.cid}_${place.title}_${place.address}_${place.latitude}_${place.longitude}`;
const hash = await sha256(hashInput);
```

**Input do hash:** `cid_title_address_lat_lng` (não inclui workspace_id no hash, mas há constraint UNIQUE por workspace)

**Correção necessária:** Atualizar documentação para refletir **SHA256** e o formato correto do input.

---

### 3. ❌ Nome do Campo de Hash

**Documentação diz:** `lead_hash`  
**Código real:** `deduplication_hash`

**Evidência SQL:**
```sql
-- Campo real na tabela
deduplication_hash TEXT NOT NULL

-- Constraint real
UNIQUE (workspace_id, deduplication_hash)
```

**Correção necessária:** Atualizar todas as referências de `lead_hash` para `deduplication_hash`.

---

### 4. ❌ Nomes dos Campos de Métricas

**Documentação diz:**
- `total_found`
- `total_valid`
- `total_duplicates`
- `total_filtered`

**Código real:**
- `found_quantity`
- `created_quantity`
- `duplicates_skipped`
- `filtered_out`

**Evidência SQL:**
```sql
-- Campos reais na tabela lead_extraction_runs
found_quantity INTEGER
created_quantity INTEGER
duplicates_skipped INTEGER
filtered_out INTEGER
```

**Correção necessária:** Atualizar todos os nomes de campos para refletir a estrutura real.

---

### 5. ❌ Sistema de Compensação (Descrição Incorreta)

**Documentação diz:** 4 fases de compensação:
1. Coleta Global (target × 1.5)
2. Filtro e Deduplicação
3. Compensação (páginas extras)
4. Busca Expandida por Estado

**Código real:** Sistema mais simples:
- Compensação automática apenas quando < 90% do target após última página
- Máximo 10 páginas extras (`MAX_COMPENSATION_PAGES = 10`)
- `expand_state_search` é aplicado **antes** da busca, não como fase de compensação

**Evidência:**
```typescript
// fetch-google-maps/index.ts linha 396-514
if (is_last_page) {
  const totalCreated = runData.created_quantity || 0;
  const targetQty = target_quantity || runData.target_quantity || 30;
  const percentage = (totalCreated / targetQty) * 100;
  
  if (percentage < 90 && compensationCount < MAX_COMPENSATION_PAGES && !apiExhausted) {
    // Enfileira páginas extras
  }
}
```

**Correção necessária:** Reescrever seção de compensação para refletir o comportamento real.

---

### 6. ❌ Aplicação de Filtros (Informação Faltante)

**Documentação diz:** Filtros são aplicados durante a busca no Google Maps

**Código real:** Filtros de qualificação **NÃO são aplicados** durante a busca. São aplicados apenas na migração.

**Evidência:**
```typescript
// fetch-google-maps/index.ts linha 342-343
filter_passed: true,  // SEMPRE true nesta fase
should_migrate: true  // SEMPRE true nesta fase
```

**Aplicação real:** Função SQL `migrate_leads_with_custom_values()` aplica todos os filtros.

**Correção necessária:** Adicionar seção explicando que filtros são aplicados apenas na migração (após enriquecimento completo).

---

### 7. ❌ Estrutura de Arrays Consolidados (Informação Faltante)

**Documentação diz:** Campos normalizados simples (`phone_normalized`, `domain`, `cnpj_normalized`)

**Código real:** Sistema usa **arrays JSONB consolidados**:
- `phones` JSONB - Array de telefones de todas as fontes
- `emails` JSONB - Array de emails de todas as fontes
- `websites` JSONB - Array de websites de todas as fontes
- `primary_phone` TEXT - Telefone principal (escolhido por prioridade)
- `primary_email` TEXT - Email principal
- `primary_website` TEXT - Website principal

**Evidência SQL:**
```sql
phones JSONB
emails JSONB
websites JSONB
primary_phone TEXT
primary_email TEXT
primary_website TEXT
```

**Correção necessária:** Adicionar seção detalhada sobre sistema de arrays consolidados e triggers SQL.

---

### 8. ❌ Endpoint da API Serper.dev

**Documentação diz:** `https://google.serper.dev/maps`

**Código real:** `https://google.serper.dev/places`

**Evidência:**
```typescript
// fetch-google-maps/index.ts linha 132
const response = await fetch('https://google.serper.dev/places', {
  method: 'POST',
  headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ q: searchTerm, location, gl: 'br', hl: 'pt-br', page })
});
```

**Correção necessária:** Atualizar endpoint para `/places`.

---

### 9. ❌ Estrutura da Mensagem PGMQ

**Documentação mostra:**
```json
{
  "run_id": "...",
  "extraction_id": "...",
  "page_number": 1,
  "search_params": {...},
  "api_key_index": 1,
  "retry_count": 0
}
```

**Código real:**
```typescript
// start-extraction/index.ts linha 174-191
const message = {
  run_id: run_id,
  page: pageNumber,  // Não é "page_number"
  search_term: searchTerm,
  location: location,
  workspace_id: workspaceId,
  target_quantity: targetQuantity,
  pages_in_batch: pagesNeeded,
  is_last_page: i === pagesNeeded - 1,
  filters: {
    require_website: extraction.require_website || false,
    require_phone: extraction.require_phone || false,
    require_email: extraction.require_email || false,
    min_rating: extraction.min_rating || 0,
    min_reviews: extraction.min_reviews || 0,
    expand_state_search: extraction.expand_state_search || false
  }
};
```

**Diferenças:**
- Não tem `extraction_id` separado
- Não tem `search_params` (tem `search_term` e `location` separados)
- Não tem `api_key_index` (calculado dinamicamente)
- Não tem `retry_count`
- Tem `workspace_id`, `target_quantity`, `pages_in_batch`, `is_last_page`, `filters`

**Correção necessária:** Atualizar estrutura da mensagem para refletir o formato real.

---

### 10. ⚠️ Sistema de Triggers SQL (Informação Faltante)

**Documentação:** Menciona apenas triggers simples de normalização

**Código real:** Sistema complexo com **15 triggers SQL**:
- `trg_normalize_and_consolidate_staging_v2` (BEFORE INSERT/UPDATE)
- `trg_auto_enqueue_scraping` (AFTER INSERT/UPDATE)
- `trg_update_run_metrics` (AFTER INSERT)
- `trg_update_contact_type` (BEFORE UPDATE)
- `trg_populate_phone_fields` (AFTER UPDATE)
- `trg_populate_email_fields` (AFTER UPDATE)
- `trg_populate_website_fields` (AFTER UPDATE)
- `trg_populate_cnpj_fields` (AFTER UPDATE)
- `trg_populate_whois_fields` (AFTER UPDATE)
- `trg_populate_contact_type` (AFTER UPDATE)
- `trg_sync_whatsapp_to_lead` (AFTER UPDATE)
- `trg_sync_custom_fields` (AFTER UPDATE)
- E mais...

**Correção necessária:** Adicionar seção completa sobre sistema de triggers SQL e consolidação automática.

---

### 11. ⚠️ Funções SQL de Consolidação (Informação Faltante)

**Documentação:** Não menciona funções SQL de consolidação

**Código real:** Sistema possui **20+ funções SQL**:
- `consolidate_all_phones()`
- `consolidate_all_emails()`
- `consolidate_all_websites()`
- `get_primary_phone()`
- `get_primary_email()`
- `get_primary_website()`
- `normalize_and_consolidate_staging_v2()`
- `process_scraping_result()`
- `migrate_leads_with_custom_values()`
- E mais...

**Correção necessária:** Adicionar seção detalhada sobre funções SQL de consolidação.

---

### 12. ⚠️ Sistema de Filas PGMQ (Informação Incompleta)

**Documentação:** Menciona apenas filas básicas

**Código real:** Sistema usa **5 filas PGMQ** com configurações específicas:
- `google_maps_queue` (universal, batch 5, VT 30s)
- `scraping_queue` (batch 10, VT 180s)
- `whatsapp_validation_queue` (batch 30, VT 60s)
- `whois_queue` (batch 10, VT 120s)
- `cnpj_queue` (batch 10, VT 120s)

**Correção necessária:** Adicionar detalhes sobre batch sizes, visibility timeouts e formato de mensagens.

---

## ✅ INFORMAÇÕES CORRETAS NO DOCUMENTO

1. ✅ Arquitetura em 4 fases está correta
2. ✅ Estrutura geral do fluxo está correta
3. ✅ APIs externas (OpenCNPJ, BrasilAPI, WHOIS, Uazapi) estão corretas
4. ✅ Estrutura de dados do CNPJ está correta
5. ✅ Estrutura de dados do WHOIS está correta
6. ✅ Estrutura de dados do Scraping está correta
7. ✅ Gaps identificados no Scraping estão corretos
8. ✅ Custom Fields por fonte estão corretos
9. ✅ Queries de monitoramento estão úteis
10. ✅ Troubleshooting está útil

---

## 📝 CORREÇÕES NECESSÁRIAS NO DOCUMENTO

### Prioridade ALTA (Discrepâncias Críticas)

1. **Seção 3.2:** Alterar "17 chaves" para "15 chaves"
2. **Seção 3.4:** Alterar "MD5" para "SHA256" e atualizar formato do hash
3. **Seção 4.1:** Alterar `lead_hash` para `deduplication_hash`
4. **Seção 3.1 e 12.1:** Atualizar nomes de campos de métricas:
   - `total_found` → `found_quantity`
   - `total_valid` → `created_quantity`
   - `total_duplicates` → `duplicates_skipped`
   - `total_filtered` → `filtered_out`
5. **Seção 3.3:** Reescrever sistema de compensação para refletir comportamento real
6. **Seção 11.1:** Alterar endpoint de `/maps` para `/places`

### Prioridade MÉDIA (Informações Faltantes Importantes)

7. **Nova Seção:** Adicionar "Sistema de Triggers SQL e Consolidação Automática"
8. **Nova Seção:** Adicionar "Sistema de Arrays Consolidados (phones, emails, websites)"
9. **Nova Seção:** Adicionar "Aplicação de Filtros (Apenas na Migração)"
10. **Seção 3.6:** Atualizar estrutura da mensagem PGMQ para formato real
11. **Nova Seção:** Adicionar "Funções SQL de Consolidação"
12. **Seção 9.1:** Adicionar detalhes sobre batch sizes e visibility timeouts das filas

### Prioridade BAIXA (Melhorias)

13. Adicionar exemplos práticos de uso
14. Adicionar diagramas de fluxo mais detalhados
15. Adicionar seção sobre rate limits de cada API
16. Adicionar seção sobre tratamento de erros

---

## 🎯 RECOMENDAÇÃO

**Criar documento consolidado** que:
1. Mantém informações corretas do documento atual
2. Corrige todas as discrepâncias identificadas
3. Adiciona informações faltantes sobre triggers SQL e consolidação
4. Integra com análises já feitas (`ANALISE-EXTRACAO-LEADS.md` e `ANALISE-SISTEMA-FILTROS.md`)

**Próximo passo:** Criar `DOCUMENTACAO-SISTEMA-EXTRACAO-LEADS-V2.md` com todas as correções e informações consolidadas.

---

## 📊 Estatísticas da Análise

- **Discrepâncias críticas encontradas:** 6
- **Informações faltantes importantes:** 6
- **Informações corretas:** 10
- **Taxa de precisão do documento:** ~60%

**Conclusão:** O documento tem uma boa base estrutural, mas precisa de correções significativas para refletir o código real do sistema.

