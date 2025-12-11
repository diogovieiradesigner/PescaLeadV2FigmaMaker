# 📋 CRON JOBS - SISTEMA DE EXTRAÇÃO DE LEADS

## 📁 Estrutura de Arquivos

```
/supabase/crons/
├── README.md                              # ← Este arquivo (documentação)
├── 01-process-enrichment-queue.sql        # ✅ USAR
├── 02-consume-enrichment-queue.sql        # ⚠️ EDGE FUNCTION FALTANDO
├── 03-process-google-maps-queue.sql       # ✅ USAR
├── 04-migrate-completed-leads.sql         # ⚠️ REVISAR
└── _SETUP_INSTRUCTIONS.md                 # ← Próximo arquivo (como configurar)
```

---

## 🔄 FLUXO COMPLETO DO SISTEMA

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. EXTRAÇÃO INICIAL (Manual - via Frontend)                         │
│    POST /make-server-e4f9d774/extractions/start                     │
│    └─> Edge Function: start-extraction                              │
│        └─> Enfileira 100 páginas na PGMQ 'google_maps_queue'        │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. PROCESSAR GOOGLE MAPS (Cron: a cada 15 segundos)                 │
│    CRON: process-google-maps-queue                                   │
│    └─> Edge Function: process-google-maps-queue                     │
│        └─> Para cada mensagem da fila:                              │
│            └─> Edge Function: fetch-google-maps                     │
│                └─> Chama SerpDev API (17 chaves)                    │
│                └─> Salva em lead_extraction_staging                 │
│                └─> status_extraction = 'google_fetched'             │
│                └─> status_enrichment = 'pending'                    │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. ENFILEIRAR ENRIQUECIMENTO (Cron: a cada 1 minuto)                │
│    CRON: process-enrichment-queue                                    │
│    └─> Função SQL: enqueue_enrichment_leads()                       │
│        └─> Busca leads com:                                         │
│            - status_extraction = 'ready' ⚠️                          │
│            - status_enrichment = 'pending'                           │
│            - filter_passed = true                                   │
│        └─> Enfileira na PGMQ 'enrichment_queue'                     │
│        └─> Atualiza status_enrichment = 'enriching'                 │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. CONSUMIR ENRIQUECIMENTO (Cron: a cada 30 segundos)               │
│    CRON: consume-enrichment-queue                                    │
│    └─> Função SQL: consume_enrichment_queue()                       │
│        └─> Lê mensagens da PGMQ 'enrichment_queue'                  │
│        └─> Edge Function: enrich-lead ❌ NÃO EXISTE!                │
│            └─> Deveria chamar: Whois, CNPJ, etc                     │
│            └─> Deveria atualizar status_enrichment = 'completed'    │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. MIGRAR LEADS (Cron: a cada 2 minutos)                            │
│    CRON: migrate-completed-leads                                     │
│    └─> Busca leads com:                                             │
│        - should_migrate = true                                      │
│        - migrated_at IS NULL                                         │
│        - status_extraction = 'google_fetched'                        │
│        - ⚠️ NÃO verifica status_enrichment!                          │
│    └─> INSERT INTO leads (tabela definitiva)                        │
│    └─> UPDATE lead_extraction_staging SET migrated_at = NOW()       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 ANÁLISE DETALHADA DOS 4 CRONS

### ✅ **1. process-enrichment-queue** - FUNCIONANDO

| Aspecto | Valor |
|---------|-------|
| **Status** | ✅ FUNCIONANDO (Dashboard: Succeeded) |
| **Schedule** | `*/1 * * * *` (1 minuto) |
| **Função SQL** | `enqueue_enrichment_leads()` |
| **Arquivo** | `/supabase/crons/01-process-enrichment-queue.sql` |
| **Definição** | `/sql-migrations/03-google-maps-queue.sql` (linha 120) |

**O que faz:**
1. ✅ Busca leads com `status_extraction = 'ready'`
2. ✅ Filtra por `status_enrichment = 'pending'`
3. ✅ Filtra por `filter_passed = true`
4. ✅ Limita a 50 leads por execução
5. ✅ Enfileira na PGMQ `enrichment_queue`
6. ✅ Atualiza `status_enrichment = 'enriching'`

**⚠️ PROBLEMA IDENTIFICADO:**
```sql
-- Função busca status_extraction = 'ready'
WHERE status_extraction = 'ready'  -- ← Linha 135 da função SQL

-- MAS fetch-google-maps salva como 'google_fetched'
status_extraction: 'google_fetched'  -- ← Linha 681 do fetch-google-maps
```

**🔥 CONSEQUÊNCIA:**
- Leads nunca são enfileirados para enriquecimento!
- Status está errado: deveria buscar `'google_fetched'` não `'ready'`

**🔧 CORREÇÃO NECESSÁRIA:**
```sql
-- Mudar linha 135 de:
WHERE status_enrichment = 'pending'
  AND status_extraction = 'ready'  -- ❌ ERRADO
  
-- Para:
WHERE status_enrichment = 'pending'
  AND status_extraction = 'google_fetched'  -- ✅ CORRETO
```

---

### ⚠️ **2. consume-enrichment-queue** - EDGE FUNCTION FALTANDO

| Aspecto | Valor |
|---------|-------|
| **Status** | ⚠️ FUNCIONANDO mas Edge Function não existe |
| **Schedule Dashboard** | `*/20 * * * *` (20 minutos) |
| **Schedule SQL** | `30 seconds` |
| **Função SQL** | `consume_enrichment_queue()` |
| **Arquivo** | `/supabase/crons/02-consume-enrichment-queue.sql` |
| **Definição** | `/sql-migrations/03-google-maps-queue.sql` (linha 186) |

**O que faz:**
1. ✅ Lê até 20 mensagens da PGMQ `enrichment_queue`
2. ✅ Tenta chamar Edge Function via HTTP POST
3. ❌ Edge Function `enrich-lead` NÃO EXISTE!

**🔥 PROBLEMA CRÍTICO:**
```sql
-- Linha 202 da função SQL:
SELECT status, content INTO http_result
FROM http((
  'POST',
  'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/enrich-lead',  -- ❌ NÃO EXISTE!
  ...
```

**Estrutura atual das Edge Functions:**
```
/supabase/functions/
├── server/                      # ✅ Existe
├── start-extraction/            # ✅ Existe
├── fetch-google-maps/           # ✅ Existe
├── process-google-maps-queue/   # ✅ Existe
└── enrich-lead/                 # ❌ NÃO EXISTE!
```

**🔧 DECISÃO NECESSÁRIA:**

**Opção A: Criar Edge Function `enrich-lead`**
```typescript
// /supabase/functions/enrich-lead/index.ts
// Deveria chamar:
// - WHOIS_URL_API (já tem no Vault)
// - APIs de CNPJ (hardcoded no código)
// - Validações diversas
```

**Opção B: Desativar enriquecimento temporariamente**
```sql
-- Desagendar o cron até implementar a Edge Function
SELECT cron.unschedule('consume-enrichment-queue');
```

**Opção C: Integrar com make-server**
```typescript
// Criar rota no make-server:
app.post('/make-server-e4f9d774/enrich-lead', async (c) => {
  // Chamar APIs de enriquecimento
  // Atualizar lead_extraction_staging
});
```

---

### ✅ **3. process-google-maps-queue** - USAR (mas estava falhando)

| Aspecto | Valor |
|---------|-------|
| **Status** | 🔴 FAILED → ✅ Deveria funcionar |
| **Schedule Dashboard** | `*/10 * * * *` (10 minutos) |
| **Schedule SQL** | `15 seconds` |
| **Edge Function** | `process-google-maps-queue` |
| **Arquivo** | `/supabase/crons/03-process-google-maps-queue.sql` |

**O que faz:**
1. ✅ Chama Edge Function via HTTP POST
2. ✅ Edge Function EXISTE e está 100% funcional
3. ✅ Processa fila PGMQ `google_maps_queue`
4. ✅ Chama `fetch-google-maps` para cada lead
5. ✅ Usa 17 chaves do SerpDev com compensação inteligente

**🔥 POR QUE ESTAVA FALHANDO:**

**Motivo 1: service_role_key não configurado**
```sql
-- Linha 8 do cron:
'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                                                ↑
                                    ❌ Precisa configurar este setting!
```

**Motivo 2: Schedule muito lento**
```sql
-- Dashboard: */10 * * * * (10 minutos)
-- ❌ MUITO LENTO! 100 páginas levaria 1000 minutos (16+ horas)

-- Migração SQL: '15 seconds'
-- ✅ CORRETO! 100 páginas em ~25 minutos
```

**🔧 CORREÇÃO NECESSÁRIA:**

1. **Configurar service_role_key no database:**
```sql
-- Via SQL Editor no Dashboard:
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGci...';
```

2. **Atualizar schedule para 15 segundos:**
```sql
-- Desagendar o antigo:
SELECT cron.unschedule('process-google-maps-queue');

-- Criar novo:
SELECT cron.schedule(
  'process-google-maps-queue',
  '15 seconds',  -- ✅ Correto!
  'SELECT net.http_post(...);'
);
```

---

### ⚠️ **4. migrate-completed-leads** - REVISAR LÓGICA

| Aspecto | Valor |
|---------|-------|
| **Status** | 🔴 FAILED |
| **Schedule** | `*/2 * * * *` (2 minutos) |
| **Tipo** | Query SQL complexa (CTE) |
| **Arquivo** | `/supabase/crons/04-migrate-completed-leads.sql` |
| **Observação** | ⚠️ NÃO está no arquivo de migração SQL! |

**O que faz:**
1. ✅ Busca leads prontos para migrar
2. ✅ Filtra por `should_migrate = true`
3. ✅ Filtra por `status_extraction = 'google_fetched'`
4. ⚠️ **NÃO verifica `status_enrichment`!**
5. ✅ Limita a 100 leads por execução
6. ✅ INSERT INTO `leads` (tabela definitiva)
7. ✅ UPDATE `lead_extraction_staging` com `migrated_at`

**🤔 DECISÃO DE NEGÓCIO NECESSÁRIA:**

**Pergunta 1: Migrar SEM enriquecimento?**
```sql
-- Código atual:
WHERE s.should_migrate = true
  AND s.migrated_at IS NULL
  AND s.status_extraction = 'google_fetched'
  -- ⚠️ NÃO verifica status_enrichment = 'completed'
```

**Opção A: Permitir migração SEM enriquecimento (atual)**
```
Vantagens:
✅ Leads aparecem mais rápido no CRM
✅ Usuário pode começar a trabalhar antes
✅ Enriquecimento é opcional

Desvantagens:
❌ Dados incompletos na tabela leads
❌ Enriquecimento posterior é mais difícil
```

**Opção B: Exigir enriquecimento ANTES de migrar**
```sql
-- Adicionar condição:
WHERE s.should_migrate = true
  AND s.migrated_at IS NULL
  AND s.status_extraction = 'google_fetched'
  AND s.status_enrichment = 'completed'  -- ← Adicionar esta linha
```

**Pergunta 2: Por que está falhando?**

**Possíveis motivos:**
1. ❌ Chave estrangeira `funnel_id` não existe na tabela `funnels`
2. ❌ Chave estrangeira `column_id` não existe na tabela `columns`
3. ❌ Constraint UNIQUE em `leads` está bloqueando duplicatas
4. ❌ JOIN com `lead_extraction_runs` ou `lead_extractions` falhando

**🔧 DEBUG NECESSÁRIO:**
```sql
-- Testar query manualmente no SQL Editor:
WITH ready_to_migrate AS (
    SELECT 
      s.*,
      e.funnel_id,
      e.column_id
    FROM lead_extraction_staging s
    JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
    JOIN lead_extractions e ON e.id = r.extraction_id
    WHERE s.should_migrate = true
      AND s.migrated_at IS NULL
      AND s.status_extraction = 'google_fetched'
    LIMIT 100
)
SELECT COUNT(*) FROM ready_to_migrate;
-- Se COUNT > 0 e cron falha, o problema está no INSERT
```

---

## 🎯 **RECOMENDAÇÕES FINAIS**

### 🔧 **MVP SIMPLIFICADO (APENAS 2 CRONS):**

Baseado na sua decisão, o sistema MVP precisa de **apenas 2 crons**:

1. ✅ **`process-google-maps-queue`** (15 segundos)
   - Processa fila do Google Maps
   - **NÃO DELETAR!** É essencial para o MVP

2. ✅ **`migrate-completed-leads`** (2 minutos)
   - Migra leads para o Kanban
   - Permite migração SEM enriquecimento (cliente vê leads mais rápido)

3. ⏸️ **`process-enrichment-queue`** (DESATIVAR)
   - Enfileira para enriquecimento
   - Implementar DEPOIS do MVP

4. ⏸️ **`consume-enrichment-queue`** (DESATIVAR)
   - Consome fila de enriquecimento
   - Precisa de Edge Function `enrich-lead` (criar depois)

### 🔧 **AÇÕES IMEDIATAS:**

1. **✅ MANTER e CORRIGIR:**
   - `process-google-maps-queue` (configurar service_role_key)
   - `migrate-completed-leads` (já permite migração antes de enriquecimento)

2. **⏸️ DESATIVAR POR ENQUANTO:**
   - `process-enrichment-queue`
   - `consume-enrichment-queue`

3. **📝 PARA DEPOIS DO MVP:**
   - Criar Edge Function `enrich-lead`
   - Reativar crons de enriquecimento

---

## 📝 PRÓXIMOS PASSOS

1. **Criar arquivo `_SETUP_INSTRUCTIONS.md`** com passo a passo de configuração
2. **Debugar `migrate-completed-leads`** para identificar erro exato
3. **Decidir arquitetura de enriquecimento:**
   - Criar Edge Function `enrich-lead`?
   - Integrar com `make-server`?
   - Desativar enriquecimento?
4. **Corrigir funções SQL** com os bugs identificados
5. **Sincronizar schedules** entre Dashboard e migração SQL

---

## 📋 RESUMO EXECUTIVO

| Cron | Status | Prioridade | Ação |
|------|--------|------------|------|
| `process-enrichment-queue` | ✅ Rodando | 🟡 Média | Corrigir status 'ready' → 'google_fetched' |
| `consume-enrichment-queue` | ⚠️ Edge Function faltando | 🔴 Alta | Criar Edge Function ou integrar |
| `process-google-maps-queue` | 🔴 Falhando | 🔴 Alta | Configurar service_role_key + schedule |
| `migrate-completed-leads` | 🔴 Falhando | 🔴 Alta | Debugar query + definir regra de negócio |

---

**Data de criação:** 2025-11-24  
**Última atualização:** 2025-11-24  
**Responsável:** Sistema de Documentação Automática