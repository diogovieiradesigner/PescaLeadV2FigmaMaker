# 📊 Análise Completa: Sistema de Extração em Massa de Leads

## 📋 Edge Functions Relacionadas à Extração

### ✅ Functions Baixadas (Backup Completo)

**Total de Functions Baixadas:** 36 functions

**Functions de Extração de Leads:** 12 functions principais

---

## 🔧 ARQUITETURA TÉCNICA DETALHADA

### **Sistema de Triggers SQL (Consolidação Automática)**

O sistema usa **15 triggers SQL** na tabela `lead_extraction_staging` que executam automaticamente para consolidar dados de múltiplas fontes:

#### **1. Triggers BEFORE INSERT/UPDATE (Normalização)**

**`trg_normalize_and_consolidate_staging_v2`** (BEFORE INSERT/UPDATE)
- **Função:** `normalize_and_consolidate_staging_v2()`
- **Quando executa:** ANTES de inserir ou atualizar qualquer registro
- **O que faz:**
  - Extrai telefones de: `extracted_data->phones`, `whois_data->phones`, `cnpj_data->phones`
  - Extrai emails de: `extracted_data->emails`, `whois_data->emails`, `cnpj_data->emails`
  - Extrai websites de: `extracted_data->websites`, `whois_data->websites`, `cnpj_data->websites`
  - Chama `consolidate_all_phones()` para mesclar telefones sem duplicatas
  - Chama `consolidate_all_emails()` para mesclar emails sem duplicatas
  - Chama `consolidate_all_websites()` para mesclar websites sem duplicatas
  - Define `primary_phone`, `primary_email`, `primary_website` usando funções de priorização
  - Consolida CNPJ de WHOIS e CNPJ API usando `consolidate_cnpj()`

#### **2. Triggers AFTER UPDATE (Enfileiramento e Migração)**

**`trg_auto_enqueue_scraping`** (AFTER INSERT/UPDATE)
- **Função:** `trg_enqueue_scraping()`
- **Quando executa:** Após inserir/atualizar com website
- **O que faz:** Enfileira website na fila `scraping_queue` para scraping

**`trg_update_run_metrics`** (AFTER INSERT)
- **Função:** `update_run_completion()`
- **Quando executa:** Após inserir novo lead
- **O que faz:** Atualiza métricas do run (found_quantity, created_quantity)

**`trg_update_contact_type`** (BEFORE UPDATE)
- **Função:** `update_contact_type_from_whatsapp()`
- **Quando executa:** Antes de atualizar com dados de WhatsApp
- **O que faz:** Define `contact_type` baseado em `whatsapp_valid`

**`trg_populate_phone_fields`** (AFTER UPDATE)
- **Função:** `trg_populate_phone_fields()`
- **Quando executa:** Após atualizar arrays de telefones
- **O que faz:** Atualiza campos legados (`phone_normalized`) para compatibilidade

**`trg_populate_email_fields`** (AFTER UPDATE)
- **Função:** `trg_populate_email_fields()`
- **Quando executa:** Após atualizar arrays de emails
- **O que faz:** Mantém sincronização de campos legados

**`trg_populate_website_fields`** (AFTER UPDATE)
- **Função:** `trg_populate_website_fields()`
- **Quando executa:** Após atualizar arrays de websites
- **O que faz:** Atualiza campo `domain` para compatibilidade

**`trg_populate_cnpj_fields`** (AFTER UPDATE)
- **Função:** `populate_cnpj_fields_on_migrate()`
- **Quando executa:** Após migrar lead (`migrated_at` preenchido)
- **O que faz:** Popula campos personalizados do CNPJ na tabela `lead_custom_values`

**`trg_populate_whois_fields`** (AFTER UPDATE)
- **Função:** `populate_whois_fields_on_migrate()`
- **Quando executa:** Após migrar lead com dados WHOIS
- **O que faz:** Popula campos personalizados do WHOIS

**`trg_populate_contact_type`** (AFTER UPDATE)
- **Função:** `populate_contact_type_on_migrate()`
- **Quando executa:** Após migrar lead
- **O que faz:** Cria campo personalizado "Tipo de Contato" no Kanban

**`trg_sync_whatsapp_to_lead`** (AFTER UPDATE)
- **Função:** `sync_whatsapp_staging_to_lead()`
- **Quando executa:** Após atualizar dados de WhatsApp
- **O que faz:** Sincroniza `whatsapp_valid`, `whatsapp_jid`, `whatsapp_name` para tabela `leads`

**`trg_sync_custom_fields`** (AFTER UPDATE)
- **Função:** `trg_sync_staging_to_custom_fields()`
- **Quando executa:** Após atualizar dados enriquecidos
- **O que faz:** Sincroniza campos personalizados entre staging e leads

---

## 🔄 Fluxo Completo de Extração

### **FASE 1: Inicialização** 🚀

#### 1. `start-extraction` (V4)
**Função:** Inicia o processo de extração em massa

**Como funciona:**
- Recebe `run_id` da extração
- Busca configuração da extração (termo de busca, localização, quantidade alvo)
- Consulta histórico de páginas já processadas (evita duplicatas)
- Calcula quantas páginas do Google Maps precisa buscar
- Enfileira cada página na fila `google_maps_queue` com:
  - Número da página específica
  - Termo de busca
  - Localização
  - Workspace ID
  - Filtros (website, telefone, email, rating, reviews)
- Atualiza status do run para `running`
- Cria logs de progresso

**Características:**
- ✅ Usa fila universal `google_maps_queue` para todos os workspaces
- ✅ Respeita histórico (não reprocessa páginas já buscadas)
- ✅ Suporta expansão de busca para todo o estado se necessário
- ✅ Versionamento: V4 (Fila Universal)

---

### **FASE 2: Busca no Google Maps** 📍

#### 2. `process-google-maps-queue` (V28)
**Função:** Processa fila de páginas do Google Maps em paralelo

**Como funciona:**
- Lê até 5 mensagens da fila `google_maps_queue` por vez
- Processa em paralelo usando `Promise.allSettled`
- Para cada mensagem:
  - Chama `fetch-google-maps` com os dados da página
  - Deleta mensagem da fila após sucesso
- Retorna resumo de processamento

**Características:**
- ✅ Processamento paralelo (até 5 páginas simultâneas)
- ✅ Fila universal para todos os workspaces
- ✅ Timeout de 30 segundos por mensagem
- ✅ Versionamento: V28 (Fila Universal)

#### 3. `fetch-google-maps` (V14)
**Função:** Busca dados de uma página específica do Google Maps via SerpAPI

**Como funciona:**
- Recebe dados da página (número, termo, localização)
- Normaliza localização para formato SerpAPI (ex: "São Paulo, State of São Paulo, Brazil")
- Seleciona API key rotativa (15 keys disponíveis, distribui por página)
- Busca resultados do Google Maps via SerpAPI
- Valida resultados (deve ter: cid, title, address, latitude, longitude)
- Cria hash SHA256 para deduplicação: `cid_title_address_lat_lng`
- Pré-filtra duplicatas em memória (hashes existentes)
- Insere leads válidos na tabela `lead_extraction_staging`
- Conta corretamente duplicatas (memória + banco)
- Atualiza métricas do run (found, created, duplicates, filtered)
- **Compensação automática:** Se última página e < 90% do target:
  - Enfileira até 10 páginas extras automaticamente
  - Continua até atingir meta ou esgotar API

**Características:**
- ✅ Rotação de 15 API keys (distribui carga)
- ✅ Deduplicação em 2 níveis (memória + banco)
- ✅ Suporta expansão de busca para estado inteiro
- ✅ Compensação automática se não atingir meta
- ✅ Detecta quando API esgota resultados
- ✅ Versionamento: V14 (Fix contagem duplicatas)

**Dados extraídos:**
- Nome do negócio
- Endereço completo
- Coordenadas (lat/lng)
- Telefone (se disponível)
- Email (se disponível)
- Website (se disponível)
- Rating e número de reviews
- Categoria/Type
- Place ID do Google

---

### **FASE 3: Scraping Web** 🌐

#### 4. `process-scraping-queue` (V6)
**Função:** Processa fila de scraping de websites

**Como funciona:**
- Lê mensagens da fila `scraping_queue`
- Controla concorrência máxima (10 simultâneos)
- Para cada lead com website:
  - Marca como `processing`
  - Chama API de scraping externa (proxy-scraper-api)
  - Extrai: emails, telefones, CNPJs, WhatsApp, redes sociais
  - Salva resultado via função SQL `process_scraping_result`
  - Atualiza arrays de `phones`, `emails`, `websites`
  - Marca como `completed` ou `failed`
- Deleta mensagem da fila após processar

**Características:**
- ✅ Controle de concorrência (máx 10 simultâneos)
- ✅ Timeout de 3 minutos por scraping
- ✅ Retry automático em caso de falha
- ✅ Extrai dados estruturados do website
- ✅ Versionamento: V6 (Todas correções)

**Dados extraídos do scraping:**
- Emails
- Telefones
- CNPJs
- WhatsApp
- Redes sociais (LinkedIn, Facebook, Instagram, etc)
- Metadados (title, description, og_image)
- Logos e favicons
- Botões de checkout
- Pixels de rastreamento

---

### **FASE 4: Enriquecimento** 🔍

#### 5. `enrich-orchestrator` (V1)
**Função:** Orquestra todo o processo de enriquecimento de forma inteligente

**Como funciona:**
- **FASE 1 - WhatsApp:** Enriquece telefones normalizados
- **FASE 2 - WHOIS:** Enriquece domínios .br
- **FASE 3 - Extração CNPJ:** Extrai CNPJ dos dados WHOIS
- **FASE 4 - CNPJ:** Enriquece CNPJs normalizados
- Processa em lotes (batch_size configurável)
- Aguarda delays entre fases (rate limits)

**Características:**
- ✅ Orquestração inteligente de múltiplas fontes
- ✅ Processa por workspace
- ✅ Respeita rate limits das APIs
- ✅ Consolida dados de múltiplas fontes

#### 6. `enrich-whatsapp` (V4)
**Função:** Valida quais telefones têm WhatsApp

**Como funciona:**
- Busca leads com telefones não validados
- Para cada telefone no array `phones`:
  - Valida se tem WhatsApp (chama API de validação)
  - Atualiza campo `whatsapp` no objeto do telefone
  - Determina tipo de contato (WhatsApp Ativo, Sem WhatsApp)
- Atualiza array completo de telefones
- Marca `whatsapp_valid` e `contact_type`

**Características:**
- ✅ Processa arrays de telefones
- ✅ Mantém outros telefones intactos
- ✅ Rate limit: 1 request/segundo
- ✅ Versionamento: V4 (Com arrays)

#### 7. `enrich-whois` (V5)
**Função:** Enriquece dados de domínios .br via WHOIS

**Como funciona:**
- Busca leads com domínios .br não enriquecidos
- Para cada domínio:
  - Consulta API WHOIS (Cloudflare Worker)
  - Extrai dados do registro
  - Salva em `whois_data`
  - Extrai CNPJ do WHOIS (se disponível)
- Marca `whois_enriched = true`

**Características:**
- ✅ Foca apenas em domínios .br
- ✅ Extrai CNPJ automaticamente do WHOIS
- ✅ Rate limit respeitado

#### 8. `enrich-cnpj` (V2)
**Função:** Enriquece dados de empresas via CNPJ

**Como funciona:**
- Busca leads com CNPJ normalizado não enriquecido
- Para cada CNPJ:
  - Tenta OpenCNPJ primeiro
  - Se falhar, tenta BrasilAPI
  - Extrai: razão social, telefone, email, endereço completo
  - Cria arrays de `phones` e `emails` do CNPJ
  - Salva em `cnpj_data`
  - Merge com arrays existentes (trigger SQL)
- Marca `cnpj_enriched = true`

**Características:**
- ✅ Fallback entre APIs (OpenCNPJ → BrasilAPI)
- ✅ Merge inteligente de arrays
- ✅ Rate limit: 3 segundos entre requests
- ✅ Versionamento: V2 (Com merge de arrays)

#### 9. `process-cnpj-queue` (V5)
**Função:** Processa fila de enriquecimento CNPJ

**Características:**
- Processa CNPJs em fila
- Controla rate limits

#### 10. `process-whois-queue` (V8)
**Função:** Processa fila de enriquecimento WHOIS

**Características:**
- Processa domínios em fila
- Controla rate limits

#### 11. `process-whatsapp-queue` (V2)
**Função:** Processa fila de validação WhatsApp

**Características:**
- Processa telefones em fila
- Valida WhatsApp em lote

---

### **FASE 5: Testes e Monitoramento** 🧪

#### 12. `test-extraction-continuity` (V3)
**Função:** Testa se extração continua da página correta

**Como funciona:**
- Chama `start-extraction` com run_id específico
- Verifica se começou da página correta (baseado no histórico)
- Retorna resultado do teste

**Características:**
- ✅ Testa continuidade de extrações
- ✅ Valida histórico de páginas

---

## 📊 Estrutura de Dados

### Tabela Principal: `lead_extraction_staging`

**Campos importantes:**
- `extraction_run_id` - ID da execução
- `workspace_id` - Workspace do lead
- `client_name` - Nome do cliente
- `deduplication_hash` - Hash único para evitar duplicatas
- `status_extraction` - Status na extração (pending, google_fetched, scraped, ready)
- `status_enrichment` - Status no enriquecimento (pending, enriching, completed)
- `raw_google_data` - Dados brutos do Google Maps
- `raw_scraper_data` - Dados brutos do scraping
- `enrichment_data` - Dados consolidados de enriquecimento
- `phones` - Array de telefones: `[{number, source, type, verified, whatsapp}]`
- `emails` - Array de emails: `[{address, source, type, verified}]`
- `websites` - Array de websites: `[{url, type, source}]`
- `cnpj_normalized` - CNPJ normalizado (14 dígitos)
- `cnpj_data` - Dados completos do CNPJ
- `whois_data` - Dados do WHOIS
- `whatsapp_valid` - Se tem WhatsApp
- `contact_type` - Tipo de contato (whatsapp, phone, unknown)
- `filter_passed` - Se passou nos filtros
- `should_migrate` - Se deve migrar para tabela `leads`

### Tabela de Controle: `lead_extraction_runs`

**Campos importantes:**
- `id` - ID único do run
- `extraction_id` - ID da configuração de extração
- `workspace_id` - Workspace
- `status` - Status (pending, running, completed, failed)
- `target_quantity` - Quantidade alvo de leads
- `found_quantity` - Quantos o SerpAPI retornou
- `created_quantity` - Quantos foram realmente criados
- `duplicates_skipped` - Quantos duplicados foram pulados
- `filtered_out` - Quantos não passaram nos filtros
- `pages_consumed` - Quantas páginas foram consumidas
- `progress_data` - JSON com progresso detalhado
- `current_step` - Step atual do processo
- `completed_steps` - Steps completados
- `total_steps` - Total de steps (9)

### Tabela de Logs: `extraction_logs`

**Campos importantes:**
- `run_id` - ID do run
- `step_number` - Número do step (1-9)
- `step_name` - Nome do step
- `level` - Nível (info, success, warning, error)
- `message` - Mensagem do log
- `details` - JSON com detalhes

---

## 🔄 Fluxo Completo (Passo a Passo)

```
1. USER cria extração → lead_extractions
2. USER inicia extração → cria lead_extraction_runs
3. USER chama start-extraction → enfileira páginas no google_maps_queue
4. CRON chama process-google-maps-queue → processa fila
5. Para cada página → chama fetch-google-maps
6. fetch-google-maps → busca SerpAPI → salva em lead_extraction_staging
7. TRIGGER SQL → enfileira websites no scraping_queue
8. CRON chama process-scraping-queue → faz scraping → atualiza arrays
9. TRIGGER SQL → enfileira telefones no whatsapp_validation_queue
10. CRON chama process-whatsapp-queue → valida WhatsApp
11. TRIGGER SQL → enfileira domínios .br no whois_queue
12. CRON chama process-whois-queue → enriquece WHOIS → extrai CNPJ
13. TRIGGER SQL → enfileira CNPJs no cnpj_queue
14. CRON chama process-cnpj-queue → enriquece CNPJ
15. TRIGGER SQL → consolida todos os dados → atualiza primary_phone, primary_email, primary_website
16. TRIGGER SQL → aplica filtros → marca filter_passed
17. TRIGGER SQL → migra leads prontos para tabela leads
```

---

## 🎯 Características Principais

### ✅ Deduplicação Inteligente
- Hash SHA256 baseado em: `cid_title_address_lat_lng`
- Pré-filtro em memória (hashes existentes)
- Verificação no banco (constraint unique)
- Contagem precisa de duplicatas

### ✅ Compensação Automática
- Se < 90% do target após última página
- Enfileira até 10 páginas extras automaticamente
- Continua até atingir meta ou esgotar API

### ✅ Enriquecimento Multi-Fonte
- Google Maps (dados básicos)
- Scraping Web (emails, telefones, CNPJs)
- WhatsApp Validation (validação de contato)
- WHOIS (dados de domínio)
- CNPJ APIs (dados empresariais)

### ✅ Consolidação Inteligente
- Arrays de telefones, emails, websites
- Priorização de fontes (CNPJ > WHOIS > Scraping > Google Maps)
- Campos primários (`primary_phone`, `primary_email`, `primary_website`)
- Merge automático via triggers SQL

### ✅ Controle de Qualidade
- Filtros configuráveis (website, telefone, email, rating, reviews)
- Validação de dados obrigatórios
- Logs detalhados de cada step
- Métricas precisas (found, created, duplicates, filtered)

### ✅ Escalabilidade
- Filas PGMQ para processamento assíncrono
- Processamento paralelo (até 5 páginas simultâneas)
- Rotação de API keys (15 keys disponíveis)
- Controle de concorrência (scraping: 10 simultâneos)

---

## 📈 Métricas e Monitoramento

### Métricas por Run:
- `found_quantity` - Quantos o SerpAPI retornou
- `created_quantity` - Quantos foram criados (sem duplicatas)
- `duplicates_skipped` - Quantos duplicados
- `filtered_out` - Quantos não passaram nos filtros
- `pages_consumed` - Quantas páginas foram usadas
- `credits_consumed` - Créditos SerpAPI consumidos
- `execution_time_ms` - Tempo total de execução

### Logs Detalhados:
- Step 1: Inicialização
- Step 2: Enfileiramento
- Step 3: Google Maps (por página)
- Step 4: Scraping
- Step 5: WhatsApp Validation
- Step 6: WHOIS Enrichment
- Step 7: CNPJ Extraction
- Step 8: CNPJ Enrichment
- Step 9: Finalização

---

## 🔧 Configurações Importantes

### Filtros de Extração:
- `require_website` - Só leads com website
- `require_phone` - Só leads com telefone
- `require_email` - Só leads com email
- `min_rating` - Rating mínimo
- `min_reviews` - Mínimo de reviews
- `expand_state_search` - Expande busca para todo estado

### Rate Limits:
- SerpAPI: Rotação de 15 keys
- Scraping: Máx 10 simultâneos
- WhatsApp: 1 request/segundo
- WHOIS: Delay de 2 segundos
- CNPJ: Delay de 3 segundos

---

## 🔬 DETALHES TÉCNICOS AVANÇADOS

### **Funções SQL de Consolidação**

#### **1. `consolidate_all_phones()`**
**Parâmetros:** `phones_serpdev JSONB, phones_whois JSONB, phones_cnpj JSONB, phone_legacy TEXT`

**Processo:**
1. Itera sobre cada fonte de telefones (SerpDev, WHOIS, CNPJ)
2. Normaliza cada número usando `normalize_phone()` (remove caracteres, valida formato BR)
3. Formata usando `format_phone_br()` (adiciona parênteses e hífen)
4. Detecta tipo usando `detect_phone_type()` (mobile/landline)
5. Remove duplicatas usando array `seen_numbers`
6. Prioriza fontes: CNPJ (verified=true) > WHOIS > SerpDev
7. Retorna JSONB array com objetos: `{number, formatted, with_country, source, type, verified, whatsapp}`

**Tratamento de Erros:**
- Cada telefone é processado em bloco `BEGIN...EXCEPTION`
- Erros são logados via `log_error()` mas não interrompem o processo
- Retorna array vazio em caso de erro catastrófico

#### **2. `consolidate_all_emails()`**
**Parâmetros:** `emails_serpdev JSONB, emails_whois JSONB, emails_cnpj JSONB`

**Processo:**
1. Valida formato com validação regex: `^[^@]+@[^@]+\.[^@]+$`
2. Normaliza para lowercase e trim
3. Remove duplicatas usando array `seen_emails`
4. Detecta tipo por prefixo: `contato*` → contact, `vendas*` → sales, `suporte*` → support
5. Prioriza: CNPJ (verified=true) > WHOIS > SerpDev
6. Retorna JSONB array: `{address, source, type, verified}`

#### **3. `consolidate_all_websites()`**
**Parâmetros:** `websites_serpdev JSONB, websites_whois JSONB, websites_cnpj JSONB, domain_legacy TEXT`

**Processo:**
1. Extrai domínio usando `extract_domain()` (remove protocolo, path, query)
2. Remove duplicatas por domínio usando array `seen_domains`
3. Detecta tipo: se URL contém `instagram|facebook|linkedin|twitter` → social, senão → main
4. Retorna JSONB array: `{url, domain, source, type}`

#### **4. Funções de Priorização**

**`get_primary_phone(phones JSONB)`**
- Prioridade: WhatsApp + Verified > Verified + CNPJ > CNPJ > WHOIS > SerpDev > Mobile > Landline
- Retorna número do telefone principal como TEXT

**`get_primary_email(emails JSONB)`**
- Prioridade: Verified + CNPJ > CNPJ > Sales/Contact > WHOIS > SerpDev
- Retorna endereço do email principal como TEXT

**`get_primary_website(websites JSONB)`**
- Prioridade: Main + SerpDev > Main > Social
- Retorna URL do website principal como TEXT

### **Função SQL de Processamento de Scraping**

#### **`process_scraping_result(p_staging_id UUID, p_scraping_data JSONB, p_status TEXT)`**

**Processo:**
1. Se `p_status = 'error'`: marca como `failed` e retorna false
2. Normaliza dados usando `normalize_scraping_data()`:
   - Converte telefones para formato padrão
   - Adiciona flag `whatsapp: true` para números do WhatsApp
   - Normaliza emails (lowercase, trim)
   - Converte redes sociais para array de websites com `type: 'social'`
   - Extrai primeiro CNPJ se houver múltiplos
3. Faz merge com arrays existentes:
   - `phones`: UNION ALL + DISTINCT (remove duplicatas)
   - `emails`: UNION ALL + DISTINCT
   - `websites`: UNION ALL + DISTINCT
4. Atualiza `scraping_data` com metadados:
   - `checkouts`: `{have_checkouts, platforms}`
   - `pixels`: `{have_pixels, pixels}`
   - `performance`: métricas de performance
5. Marca `scraping_enriched = true`, `scraping_status = 'completed'`
6. **Trigger `normalize_and_consolidate_staging_v2`** executa automaticamente após UPDATE
7. Retorna `true` se sucesso, `false` se erro

### **Função SQL de Migração**

#### **`migrate_leads_with_custom_values()`**

**Processo:**
1. Busca leads com `should_migrate = true` e `migrated_at IS NULL` (LIMIT 200)
2. Para cada lead:
   - Busca configuração da extração (filtros)
   - **Aplica filtros:**
     - `require_email`: verifica se tem email em `emails` array OU `primary_email`
     - `require_phone`: verifica se tem telefone em `phones` array OU `primary_phone`
     - `require_website`: verifica se tem website em `websites` array OU `primary_website`
     - `min_rating`: compara com `extracted_data->rating`
     - `min_reviews`: compara com `extracted_data->reviews`
   - Se passa nos filtros:
     - Insere na tabela `leads` com `funnel_id` e `column_id` da extração
     - Popula campos personalizados (`custom_fields`) se existirem
     - Marca `migrated_at = NOW()`, `migrated_lead_id = new_lead_id`
   - Se não passa:
     - Marca `should_migrate = false`, `filter_passed = false`, `filter_reason = 'sem_email,sem_telefone,...'`
3. Atualiza métricas do run:
   - `filtered_out += v_filtered_count`
   - `created_quantity = COUNT(*) FROM leads WHERE lead_extraction_run_id = run_id`
4. Retorna número de leads migrados

**Triggers após migração:**
- `trg_populate_cnpj_fields`: popula campos CNPJ
- `trg_populate_whois_fields`: popula campos WHOIS
- `trg_populate_contact_type`: cria campo "Tipo de Contato"

### **Sistema de Filas PGMQ**

#### **Filas Utilizadas:**

1. **`google_maps_queue`** (Universal)
   - Mensagem: `{run_id, page, search_term, location, workspace_id, target_quantity, filters, is_last_page, is_compensation}`
   - Consumidor: `process-google-maps-queue`
   - Batch size: 5 mensagens por vez
   - VT (Visibility Timeout): 30 segundos

2. **`scraping_queue`**
   - Mensagem: `{staging_id, website_url}`
   - Consumidor: `process-scraping-queue`
   - Batch size: até 10 simultâneos (controle de concorrência)
   - VT: 180 segundos (3 minutos)

3. **`whatsapp_validation_queue`**
   - Mensagem: `{staging_id, phone_normalized}`
   - Consumidor: `process-whatsapp-queue`
   - Batch size: 30 por vez
   - VT: 60 segundos

4. **`whois_queue`**
   - Mensagem: `{staging_id, domain}`
   - Consumidor: `process-whois-queue`
   - Batch size: 10 por vez
   - VT: 120 segundos

5. **`cnpj_queue`**
   - Mensagem: `{lead_id, cnpj}`
   - Consumidor: `process-cnpj-queue`
   - Batch size: 10 por vez
   - VT: 120 segundos

### **Sistema de Deduplicação**

#### **Hash SHA256**
- **Input:** `cid_title_address_lat_lng`
- **Exemplo:** `"1234567890_Empresa ABC_Rua XYZ, 123_-23.5505_-46.6333"`
- **Output:** Hash hexadecimal de 64 caracteres
- **Constraint:** `UNIQUE (workspace_id, deduplication_hash)`

#### **Pré-filtro em Memória**
- `fetch-google-maps` busca todos os hashes existentes do workspace antes de inserir
- Cria `Set` em memória para verificação O(1)
- Evita 90%+ das duplicatas antes de tentar INSERT

#### **Verificação no Banco**
- Se pré-filtro falhar, constraint UNIQUE captura duplicata
- Código de erro PostgreSQL: `23505` (unique_violation)
- Conta como `dbDuplicates` separadamente de `preFilterDuplicates`

### **Sistema de Compensação Automática**

#### **Lógica de Compensação:**
1. Executa apenas na **última página** (`is_last_page = true`)
2. Aguarda 2 segundos para garantir que métricas foram atualizadas
3. Calcula porcentagem: `(totalCreated / targetQuantity) * 100`
4. **Condições para compensar:**
   - `percentage < 90` (menos de 90% do target)
   - `compensationCount < MAX_COMPENSATION_PAGES` (máx 10 páginas)
   - `!apiExhausted` (API ainda tem resultados)
5. Se compensar:
   - Calcula `leadsNeeded = targetQuantity - totalCreated`
   - Calcula `pagesNeeded = Math.ceil(leadsNeeded / 10)`
   - Limita a `MAX_COMPENSATION_PAGES - compensationCount`
   - Enfileira páginas extras na fila `google_maps_queue_e4f9d774`
   - Marca `is_compensation = true` nas mensagens
6. Atualiza `progress_data.compensation_count` e `progress_data.compensation_pages_queued`

### **Rotação de API Keys**

#### **Sistema de 15 API Keys:**
- Função SQL: `get_serpdev_api_key(key_index INTEGER)`
- Seleção: `keyIndex = ((page - 1) % 15) + 1`
- Distribui carga uniformemente entre as 15 keys
- Evita rate limits e esgotamento prematuro

### **Normalização de Localização**

#### **`normalizeLocationForSerper(location, expandState)`**

**Processo:**
1. Remove acentos usando `normalize('NFD').replace(/[\u0300-\u036f]/g, '')`
2. Divide por vírgulas: `["Cidade", "Estado", "País"]`
3. Capitaliza palavras (exceto preposições: de, do, da, dos, das)
4. Mapeia estados brasileiros:
   - Abreviações: `"SP"` → `"State of Sao Paulo"`
   - Nomes completos: `"São Paulo"` → `"State of Sao Paulo"`
5. Se `expandState = true`: retorna apenas `"State of {Estado}, Brazil"`
6. Formato final: `"Cidade, State of Estado, Brazil"`

**Exemplos:**
- `"São Paulo, SP"` → `"Sao Paulo, State of Sao Paulo, Brazil"`
- `"São Paulo, SP"` (expandState=true) → `"State of Sao Paulo, Brazil"`
- `"Rio de Janeiro, RJ"` → `"Rio de Janeiro, State of Rio de Janeiro, Brazil"`

## 🎓 Conclusão

O sistema de extração é **extremamente robusto** e bem arquitetado:

✅ **Modular** - Cada função tem responsabilidade única  
✅ **Escalável** - Filas PGMQ e processamento paralelo  
✅ **Confiável** - Deduplicação em 2 níveis, retry, compensação automática  
✅ **Rastreável** - Logs detalhados de cada step em `extraction_logs`  
✅ **Inteligente** - Enriquecimento multi-fonte e consolidação automática via triggers  
✅ **Resiliente** - Tratamento de erros em cada nível (Edge Functions + SQL)  
✅ **Performático** - Pré-filtro em memória, batch processing, controle de concorrência  

**Total de Functions de Extração:** 12 functions principais  
**Total de Functions no Projeto:** 36 functions  
**Total de Triggers SQL:** 15 triggers  
**Total de Funções SQL de Consolidação:** 20+ funções

