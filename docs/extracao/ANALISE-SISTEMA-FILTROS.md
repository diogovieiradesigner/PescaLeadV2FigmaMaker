# 🔍 Análise Detalhada: Sistema de Filtros de Extração de Leads

## 📋 Visão Geral

O sistema de filtros funciona em **múltiplas camadas** durante o processo de extração, desde a busca inicial até a migração final para o Kanban. Os filtros são aplicados em **3 momentos diferentes** do pipeline.

---

## 🎯 Os 6 Tipos de Filtros

### **Filtros de Qualificação (5 tipos)**

Estes filtros determinam se um lead **passa** ou **não passa** na qualificação e serão migrados para o Kanban:

1. **`require_website`** (Boolean)
   - **Frontend:** "Apenas com Website"
   - **Tipo:** Filtro de presença obrigatória
   - **Validação:** Verifica se lead tem website em qualquer fonte

2. **`require_phone`** (Boolean)
   - **Frontend:** "Apenas com Telefone"
   - **Tipo:** Filtro de presença obrigatória
   - **Validação:** Verifica se lead tem telefone em qualquer fonte

3. **`require_email`** (Boolean)
   - **Frontend:** "Apenas com E-mail"
   - **Tipo:** Filtro de presença obrigatória
   - **Validação:** Verifica se lead tem email em qualquer fonte

4. **`min_rating`** (Numeric)
   - **Frontend:** "Mínimo de estrelas" (ex: 3.0)
   - **Tipo:** Filtro numérico mínimo
   - **Validação:** Compara com `extracted_data->rating` do Google Maps

5. **`min_reviews`** (Integer)
   - **Frontend:** "Mínimo de Avaliações" (ex: 6)
   - **Tipo:** Filtro numérico mínimo
   - **Validação:** Compara com `extracted_data->reviews` do Google Maps

### **Filtro de Busca (1 tipo)**

6. **`expand_state_search`** (Boolean)
   - **Frontend:** "Expandir busca para todo o estado"
   - **Tipo:** Filtro de escopo geográfico
   - **Efeito:** Altera a localização da busca (cidade → estado inteiro)

---

## 🔄 Fluxo de Aplicação dos Filtros

### **FASE 1: Configuração Inicial** 📝

**Onde:** Tabela `lead_extractions`

**Quando:** Usuário cria configuração de extração no frontend

**Campos salvos:**
```sql
require_website BOOLEAN DEFAULT false
require_phone BOOLEAN DEFAULT false
require_email BOOLEAN DEFAULT false
min_rating NUMERIC DEFAULT 0.0
min_reviews INTEGER DEFAULT 0
expand_state_search BOOLEAN DEFAULT false
```

**Código:** `start-extraction/index.ts` (linhas 102-106, 183-190)

```typescript
const extraction = runData.lead_extractions;
const filters = {
  require_website: extraction.require_website || false,
  require_phone: extraction.require_phone || false,
  require_email: extraction.require_email || false,
  min_rating: extraction.min_rating || 0,
  min_reviews: extraction.min_reviews || 0,
  expand_state_search: extraction.expand_state_search || false
};
```

**Ação:** Filtros são incluídos no payload de cada mensagem da fila `google_maps_queue`

---

### **FASE 2: Busca no Google Maps** 🔍

**Onde:** Edge Function `fetch-google-maps`

**Quando:** Durante a busca de cada página do Google Maps

**Filtros aplicados:**

#### **2.1. `expand_state_search`** (Aplicado ANTES da busca)

**Código:** `fetch-google-maps/index.ts` (linhas 250-251)

```typescript
const expandState = filters?.expand_state_search || false;
const normalizedLocation = normalizeLocationForSerper(location, expandState);
```

**Como funciona:**
- Se `expandState = true`: Normaliza localização para formato `"State of {Estado}, Brazil"`
- Se `expandState = false`: Mantém formato `"{Cidade}, State of {Estado}, Brazil"`
- **Efeito:** Expande busca de cidade específica para todo o estado

**Exemplo:**
- Original: `"São Paulo, SP"`
- Com expand: `"State of Sao Paulo, Brazil"` (busca em todo estado)
- Sem expand: `"Sao Paulo, State of Sao Paulo, Brazil"` (busca só na cidade)

**Impacto:** 
- ✅ Aumenta quantidade de resultados disponíveis
- ✅ Consome mais páginas da API
- ✅ Pode gerar leads menos relevantes geograficamente

#### **2.2. Filtros de Qualificação (NÃO aplicados nesta fase)**

**Importante:** Os filtros de qualificação (`require_website`, `require_phone`, `require_email`, `min_rating`, `min_reviews`) **NÃO são aplicados** durante a busca no Google Maps.

**Motivo:** 
- A API SerpAPI retorna dados brutos do Google Maps
- Nem todos os dados podem estar completos na primeira busca
- O enriquecimento (scraping, WHOIS, CNPJ) pode adicionar dados faltantes

**Código:** `fetch-google-maps/index.ts` (linhas 342-343)

```typescript
filter_passed: true,  // ✅ SEMPRE true nesta fase
should_migrate: true  // ✅ SEMPRE true nesta fase
```

**Todos os leads são inseridos em `lead_extraction_staging` com:**
- `status_extraction = 'google_fetched'`
- `filter_passed = true` (provisório)
- `should_migrate = true` (provisório)

---

### **FASE 3: Enriquecimento** 🔄

**Onde:** Durante scraping, WHOIS, CNPJ, WhatsApp

**Quando:** Após inserção inicial, durante enriquecimento

**Filtros aplicados:** **NENHUM**

**Motivo:**
- O enriquecimento adiciona dados que podem fazer um lead passar nos filtros
- Exemplo: Lead sem telefone no Google Maps pode ganhar telefone via scraping ou CNPJ
- Exemplo: Lead sem email no Google Maps pode ganhar email via WHOIS ou CNPJ

**Ação:** 
- Triggers SQL consolidam dados de múltiplas fontes
- Arrays `phones`, `emails`, `websites` são atualizados
- Campos `primary_phone`, `primary_email`, `primary_website` são recalculados

---

### **FASE 4: Migração (Aplicação Final dos Filtros)** ✅

**Onde:** Função SQL `migrate_leads_with_custom_values()`

**Quando:** Quando lead está pronto para migrar (`should_migrate = true`)

**Filtros aplicados:** **TODOS os 5 filtros de qualificação**

#### **4.1. Verificação de Presença (3 filtros)**

**Código SQL:**

```sql
-- Verificar se tem EMAIL
v_has_email := (
  v_lead.emails IS NOT NULL 
  AND v_lead.emails != '[]'::jsonb 
  AND jsonb_array_length(v_lead.emails) > 0
) OR (
  v_lead.primary_email IS NOT NULL 
  AND v_lead.primary_email != ''
);

-- Verificar se tem TELEFONE
v_has_phone := (
  v_lead.phones IS NOT NULL 
  AND v_lead.phones != '[]'::jsonb 
  AND jsonb_array_length(v_lead.phones) > 0
) OR (
  v_lead.primary_phone IS NOT NULL 
  AND v_lead.primary_phone != ''
);

-- Verificar se tem WEBSITE
v_has_website := (
  v_lead.websites IS NOT NULL 
  AND v_lead.websites != '[]'::jsonb 
  AND jsonb_array_length(v_lead.websites) > 0
) OR (
  v_lead.primary_website IS NOT NULL 
  AND v_lead.primary_website != ''
);
```

**Lógica:**
- Verifica **arrays consolidados** (`phones`, `emails`, `websites`)
- **OU** verifica campos primários (`primary_phone`, `primary_email`, `primary_website`)
- Considera dados de **qualquer fonte** (Google Maps, Scraping, WHOIS, CNPJ)

**Aplicação dos filtros:**

```sql
-- FILTRO 1: require_email
IF v_lead.require_email = TRUE AND v_has_email = FALSE THEN
  v_passes_filters := FALSE;
  v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_email';
END IF;

-- FILTRO 2: require_phone
IF v_lead.require_phone = TRUE AND v_has_phone = FALSE THEN
  v_passes_filters := FALSE;
  v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_telefone';
END IF;

-- FILTRO 3: require_website
IF v_lead.require_website = TRUE AND v_has_website = FALSE THEN
  v_passes_filters := FALSE;
  v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'sem_website';
END IF;
```

#### **4.2. Verificação Numérica (2 filtros)**

**Código SQL:**

```sql
-- Extrair valores do extracted_data
v_rating := COALESCE((v_lead.extracted_data->>'rating')::numeric, 0);
v_reviews := COALESCE((v_lead.extracted_data->>'reviews')::integer, 0);

-- FILTRO 4: min_rating
IF COALESCE(v_lead.min_rating, 0) > 0 AND v_rating < v_lead.min_rating THEN
  v_passes_filters := FALSE;
  v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'rating_baixo';
END IF;

-- FILTRO 5: min_reviews
IF COALESCE(v_lead.min_reviews, 0) > 0 AND v_reviews < v_lead.min_reviews THEN
  v_passes_filters := FALSE;
  v_filter_reason := COALESCE(v_filter_reason || ', ', '') || 'reviews_baixo';
END IF;
```

**Lógica:**
- Compara valores do Google Maps (`extracted_data->rating`, `extracted_data->reviews`)
- Se filtro = 0, **não aplica** (ignora)
- Se filtro > 0, aplica comparação `>=`

**Valores padrão:**
- `min_rating` default: `0.0` (não filtra se não configurado)
- `min_reviews` default: `0` (não filtra se não configurado)

#### **4.3. Decisão Final**

**Se PASSA nos filtros:**

```sql
-- Migrar para tabela leads
INSERT INTO leads (...)
VALUES (...);

-- Atualizar staging
UPDATE lead_extraction_staging
SET 
  migrated_at = NOW(),
  migrated_lead_id = v_new_lead_id,
  filter_passed = TRUE,
  filter_reason = NULL
WHERE id = v_lead.id;
```

**Se NÃO PASSA nos filtros:**

```sql
-- Marcar como filtrado
UPDATE lead_extraction_staging
SET 
  should_migrate = FALSE,
  filter_passed = FALSE,
  filter_reason = v_filter_reason  -- Ex: 'sem_email,sem_telefone'
WHERE id = v_lead.id;
```

**Campo `filter_reason`:**
- Contém lista de motivos separados por vírgula
- Valores possíveis: `'sem_email'`, `'sem_telefone'`, `'sem_website'`, `'rating_baixo'`, `'reviews_baixo'`
- Exemplo: `'sem_email,rating_baixo'` (falhou em 2 filtros)

---

## 📊 Resumo da Aplicação dos Filtros

| Filtro | Fase 1 (Config) | Fase 2 (Google Maps) | Fase 3 (Enriquecimento) | Fase 4 (Migração) |
|--------|----------------|---------------------|------------------------|-------------------|
| `expand_state_search` | ✅ Salvo | ✅ **Aplicado** (altera busca) | ❌ Não aplicável | ❌ Não aplicável |
| `require_website` | ✅ Salvo | ❌ Não aplicado | ❌ Não aplicado | ✅ **Aplicado** |
| `require_phone` | ✅ Salvo | ❌ Não aplicado | ❌ Não aplicado | ✅ **Aplicado** |
| `require_email` | ✅ Salvo | ❌ Não aplicado | ❌ Não aplicado | ✅ **Aplicado** |
| `min_rating` | ✅ Salvo | ❌ Não aplicado | ❌ Não aplicado | ✅ **Aplicado** |
| `min_reviews` | ✅ Salvo | ❌ Não aplicado | ❌ Não aplicado | ✅ **Aplicado** |

---

## 🎯 Pontos Importantes

### **1. Filtros são aplicados APENAS na migração**

**Por quê?**
- Dados podem ser enriquecidos após a busca inicial
- Scraping pode encontrar telefones/emails não disponíveis no Google Maps
- WHOIS pode fornecer dados adicionais
- CNPJ pode completar informações faltantes

**Exemplo prático:**
```
Lead buscado no Google Maps:
- ✅ Tem website
- ❌ Não tem telefone
- ❌ Não tem email
- ✅ Rating: 4.5
- ✅ Reviews: 10

Filtros configurados:
- require_phone: true
- require_email: true

Durante enriquecimento:
- Scraping encontra telefone no website ✅
- WHOIS encontra email no domínio ✅

Na migração:
- ✅ Passa nos filtros (tem telefone E email após enriquecimento)
- ✅ Migrado para Kanban
```

### **2. `expand_state_search` é diferente**

**Características:**
- ✅ Aplicado **ANTES** da busca (altera escopo geográfico)
- ✅ Não é um filtro de qualificação
- ✅ Não impede migração de leads
- ✅ Apenas expande área de busca

**Uso:**
- Quando não há resultados suficientes na cidade
- Quando quer buscar em todo o estado
- Aumenta quantidade de leads disponíveis

### **3. Validação de arrays vs campos primários**

**Estratégia dupla:**
```sql
-- Verifica arrays consolidados
v_lead.emails IS NOT NULL 
AND jsonb_array_length(v_lead.emails) > 0

-- OU verifica campo primário
OR v_lead.primary_email IS NOT NULL
```

**Motivo:**
- Arrays podem estar vazios mas campo primário preenchido (edge case)
- Garante máxima compatibilidade
- Considera dados de todas as fontes

### **4. Filtros numéricos com valor 0 são ignorados**

**Lógica:**
```sql
IF COALESCE(v_lead.min_rating, 0) > 0 AND v_rating < v_lead.min_rating THEN
  -- Só aplica se min_rating > 0
END IF;
```

**Comportamento:**
- `min_rating = 0` → Não filtra (aceita qualquer rating)
- `min_rating = 3.0` → Filtra (só aceita rating >= 3.0)
- `min_reviews = 0` → Não filtra (aceita qualquer quantidade)
- `min_reviews = 6` → Filtra (só aceita reviews >= 6)

### **5. Campo `filter_reason` para debugging**

**Conteúdo:**
- Lista de motivos de falha separados por vírgula
- Permite identificar quais filtros falharam
- Útil para análise e otimização

**Exemplos:**
- `'sem_email'` → Falhou apenas no filtro de email
- `'sem_telefone,sem_website'` → Falhou em 2 filtros
- `'rating_baixo,reviews_baixo'` → Falhou em filtros numéricos

---

## 🔧 Estrutura Técnica

### **Tabela `lead_extractions` (Configuração)**

```sql
CREATE TABLE lead_extractions (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  extraction_name TEXT,
  search_term TEXT,
  location TEXT,
  target_quantity INTEGER,
  
  -- FILTROS DE QUALIFICAÇÃO
  require_website BOOLEAN DEFAULT false,
  require_phone BOOLEAN DEFAULT false,
  require_email BOOLEAN DEFAULT false,
  min_rating NUMERIC DEFAULT 0.0,
  min_reviews INTEGER DEFAULT 0,
  
  -- FILTRO DE BUSCA
  expand_state_search BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### **Tabela `lead_extraction_staging` (Status de Filtros)**

```sql
CREATE TABLE lead_extraction_staging (
  id UUID PRIMARY KEY,
  extraction_run_id UUID,
  workspace_id UUID,
  
  -- DADOS CONSOLIDADOS
  phones JSONB,           -- Array de telefones
  emails JSONB,           -- Array de emails
  websites JSONB,         -- Array de websites
  primary_phone TEXT,     -- Telefone principal
  primary_email TEXT,     -- Email principal
  primary_website TEXT,  -- Website principal
  extracted_data JSONB,   -- Dados do Google Maps (rating, reviews)
  
  -- STATUS DE FILTROS
  filter_passed BOOLEAN,      -- Se passou nos filtros
  filter_reason TEXT,         -- Motivo de falha (se houver)
  should_migrate BOOLEAN,     -- Se deve migrar
  migrated_at TIMESTAMPTZ,    -- Quando migrou (se migrou)
  migrated_lead_id UUID,      -- ID do lead no Kanban (se migrou)
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### **Função SQL `migrate_leads_with_custom_values()`**

**Parâmetros:** Nenhum (processa em lote)

**Processo:**
1. Busca leads com `should_migrate = true` e `migrated_at IS NULL` (LIMIT 200)
2. Para cada lead, busca configuração da extração
3. Aplica todos os 5 filtros de qualificação
4. Se passa: migra para `leads` e marca `filter_passed = true`
5. Se falha: marca `filter_passed = false` e `filter_reason = 'motivos'`
6. Atualiza métricas do run (`filtered_out`, `created_quantity`)

**Retorno:** Número de leads migrados

---

## 📈 Métricas e Monitoramento

### **Campos em `lead_extraction_runs`**

```sql
found_quantity INTEGER,      -- Quantos o SerpAPI retornou
created_quantity INTEGER,    -- Quantos foram migrados (passaram filtros)
filtered_out INTEGER,        -- Quantos foram filtrados (não passaram)
duplicates_skipped INTEGER, -- Quantos eram duplicatas
```

### **Cálculo de Taxa de Aprovação**

```
Taxa de Aprovação = (created_quantity / found_quantity) * 100
Taxa de Filtragem = (filtered_out / found_quantity) * 100
```

**Exemplo:**
- `found_quantity = 100` (SerpAPI retornou 100 leads)
- `created_quantity = 75` (75 passaram nos filtros e migraram)
- `filtered_out = 25` (25 não passaram nos filtros)
- Taxa de Aprovação: 75%
- Taxa de Filtragem: 25%

---

## 🎓 Conclusão

O sistema de filtros é **inteligente e em camadas**:

✅ **Filtro de busca** (`expand_state_search`) aplicado **antes** da busca  
✅ **Filtros de qualificação** aplicados **apenas na migração** (após enriquecimento completo)  
✅ **Validação dupla** (arrays + campos primários) garante máxima precisão  
✅ **Filtros numéricos** ignorados se valor = 0  
✅ **Campo `filter_reason`** permite debugging detalhado  
✅ **Métricas precisas** de filtragem e aprovação  

**Total de Filtros:** 6 tipos (5 qualificação + 1 busca)

