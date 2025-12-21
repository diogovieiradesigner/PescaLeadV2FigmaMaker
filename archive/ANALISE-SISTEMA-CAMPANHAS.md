# 📊 Análise Completa: Sistema de Campanhas

## 📋 Visão Geral

O sistema de campanhas é uma funcionalidade automatizada que envia mensagens personalizadas via IA para leads do CRM, movendo-os entre colunas do funil (Kanban).

---

## 🏗️ Arquitetura do Sistema

### **1. Tabelas Principais**

#### **`campaign_configs`** (Configuração da Campanha)
- **1:1 com workspace** (1 campanha por workspace)
- Campos principais:
  - `is_active`: Se a campanha está ativa
  - `frequency`: `daily` ou `weekdays`
  - `start_time` / `end_time`: Janela de horário (ex: 09:00 - 18:00)
  - `daily_limit`: Quantidade máxima de leads por dia (1-500)
  - `min_interval_seconds`: Intervalo mínimo entre mensagens (anti-spam)
  - `inbox_id`: Caixa de entrada (WhatsApp/Email) para envio
  - `source_funnel_id` / `source_column_id`: De onde buscar leads
  - `target_column_id`: Para onde mover após envio
  - `ai_instructions`: Prompt do sistema para gerar mensagens
  - `split_messages`: Se deve fracionar mensagens longas
  - `max_split_parts`: Máximo de partes ao fracionar (1-5)

#### **`campaign_runs`** (Execuções da Campanha)
- Uma execução por dia (ou manual via `campaign-execute-now`)
- Campos principais:
  - `status`: `running`, `completed`, `failed`, `cancelled`, `paused`
  - `run_date`: Data da execução
  - `leads_total`: Total de leads agendados
  - `leads_processed`: Processados até agora
  - `leads_success`: Enviados com sucesso
  - `leads_failed`: Falhas
  - `leads_skipped`: Ignorados

#### **`campaign_messages`** (Mensagens Individuais)
- Uma mensagem por lead
- Campos principais:
  - `status`: `pending`, `queued`, `generating`, `sending`, `sent`, `failed`, `skipped`, `replied`
  - `scheduled_at`: Quando deve ser enviada
  - `sent_at`: Quando foi enviada
  - `generated_message`: Mensagem gerada pela IA
  - `ai_model`: Modelo usado
  - `ai_tokens_used`: Tokens consumidos
  - `conversation_id`: Conversa criada/encontrada
  - `replied_at`: Se o lead respondeu

#### **`campaign_logs`** (Logs Detalhados)
- Logs em tempo real de cada etapa
- Campos:
  - `step_name`: `INICIALIZAÇÃO`, `BUSCA_LEADS`, `AGENDAMENTO`, `GERAÇÃO_IA`, `ENVIO_WHATSAPP`, `MOVE_LEAD`, `FINALIZAÇÃO`, `ERRO`
  - `level`: `info`, `success`, `warning`, `error`, `debug`
  - `message`: Mensagem descritiva
  - `details`: JSONB com dados adicionais

#### **`campaign_whatsapp_reports`** (Relatórios Diários)
- Métricas consolidadas por dia
- Campos: `total_sent`, `total_delivered`, `total_read`, `total_replied`, taxas, etc.

#### **`campaign_audit_log`** (Auditoria)
- Histórico de mudanças na configuração

---

## 🔄 Fluxo Completo do Sistema

### **FASE 1: Agendamento (Scheduler)**

**Edge Function:** `campaign-scheduler`

**Trigger:** CRON (executado periodicamente, ex: a cada 5 minutos)

**Processo:**

1. **Buscar campanhas ativas** (`is_active = true`)

2. **Verificar se deve rodar** via `should_campaign_run(config_id)`:
   - ✅ Campanha ativa
   - ✅ Instância conectada
   - ✅ Não há outra campanha RUNNING na mesma instância
   - ✅ Funil e colunas existem
   - ✅ Dentro da janela de horário (`start_time` ≤ agora ≤ `end_time`)
   - ✅ Dia válido (se `frequency = 'weekdays'`, não roda fim de semana)
   - ✅ Há leads elegíveis disponíveis

3. **Criar `campaign_run`** com status `running`

4. **Buscar leads elegíveis** via `get_campaign_eligible_leads()`:
   - **WhatsApp:** Leads com `whatsapp_valid = TRUE` na coluna origem
   - **Email:** Leads com email válido na coluna origem
   - **Filtros:**
     - `status = 'active'`
     - `column_id = source_column_id`
     - Não recebeu mensagem de campanha hoje (verifica `campaign_messages` + `run_date = CURRENT_DATE`)

5. **Calcular horários de envio:**
   - Intervalo aleatório entre `min_interval_seconds` e `max_interval_seconds`
   - **Respeita `end_time`:** Se não couber todos no dia, para no limite
   - Distribui mensagens ao longo do período disponível

6. **Inserir `campaign_messages`** com:
   - `status = 'pending'`
   - `scheduled_at`: Horário calculado
   - `lead_id`, `phone_number`, `phone_normalized`

---

### **FASE 2: Processamento (Queue Processor)**

**Edge Function:** `campaign-process-queue`

**Trigger:** CRON ou chamada manual (ex: a cada 1 minuto)

**Processo:**

1. **Buscar mensagens prontas:**
   - `status = 'pending'`
   - `scheduled_at <= NOW()`
   - `campaign_runs.status = 'running'`
   - Ordenado por `scheduled_at ASC`
   - Limite: `batch_size` (padrão: 5)

2. **Para cada mensagem:**

   a. **Verificar instância conectada:**
      - Se desconectada → Pausa campanha e marca mensagens como `skipped`

   b. **Buscar modelo de IA:**
      - Obtém do `ai_agents` do workspace
      - **OBRIGATÓRIO:** Se não tiver, erro fatal

   c. **Gerar mensagem via IA:**
      - Busca contexto completo do lead via `get_lead_full_context(lead_id)`
      - Formata contexto para IA (dados básicos, custom fields, etc.)
      - Chama OpenRouter com:
        - Modelo do `ai_agents`
        - System prompt = `ai_instructions` da campanha
        - User prompt = contexto formatado do lead
      - Atualiza `campaign_messages`:
        - `status = 'generating'` → `'sending'`
        - `generated_message`, `ai_model`, `ai_tokens_used`

   d. **Fracionamento (se habilitado):**
      - Se `split_messages = true`:
        - Chama IA novamente para dividir mensagem
        - Usa **MESMO modelo** do `ai_agents`
        - Máximo de partes = `max_split_parts` (1-5)
        - Delay entre partes = configurado em `ai_message_splitter_config`

   e. **Buscar/criar conversa:**
      - Busca por `lead_id` ou `phone_normalized`
      - Se não existe, cria nova conversa
      - Vincula `conversation_id` à mensagem

   f. **Enviar mensagem(s):**
      - Chama `internal-send-ai-message` Edge Function
      - Envia cada parte com delay entre elas
      - Atualiza `status = 'sent'`, `sent_at`, `provider_message_id`

   g. **Mover lead:**
      - Atualiza `leads.column_id = target_column_id`
      - Atualiza `leads.last_activity_at`

   h. **Incrementar métricas:**
      - `increment_campaign_run_metrics(run_id, success=1)`

3. **Verificar finalização:**
   - Se `leads_processed >= leads_total`:
     - Atualiza `campaign_runs.status = 'completed'`
     - `completed_at = NOW()`

---

### **FASE 3: Execução Manual**

**Edge Function:** `campaign-execute-now`

**Trigger:** Chamada HTTP manual (frontend)

**Diferenças do Scheduler:**
- ✅ Começa **AGORA** (não aguarda horário)
- ✅ Permite múltiplas runs por dia
- ✅ Bloqueia apenas se já tiver run `RUNNING` na mesma instância
- ✅ Não verifica `start_time` / `end_time` (executa imediatamente)

---

### **FASE 4: Detecção de Respostas**

**Trigger:** `detect_campaign_response()` (trigger em `messages`)

**Processo:**
- Quando uma mensagem é recebida (`message_type = 'received'`)
- Busca última mensagem de campanha enviada nas últimas 24h
- Marca `campaign_messages.status = 'replied'`
- Atualiza `campaign_whatsapp_reports.total_replied`

---

### **FASE 5: Relatórios**

**Edge Function:** `campaign-generate-report`

**Trigger:** CRON (ex: 23:59 diariamente)

**Processo:**
- Consolida métricas de todas as runs do dia
- Calcula taxas (envio, resposta, conversão)
- Estima custos (tokens × preço)
- Upsert em `campaign_whatsapp_reports`

---

## 🔧 Funções SQL Principais

### **`should_campaign_run(config_id)`**
Verifica se a campanha deve rodar:
- ✅ Ativa
- ✅ Instância conectada
- ✅ Sem outra campanha RUNNING na mesma instância
- ✅ Dentro da janela de horário
- ✅ Dia válido (weekdays)
- ✅ Leads disponíveis

### **`get_campaign_eligible_leads(workspace_id, source_column_id, inbox_id, limit)`**
Busca leads elegíveis:
- Filtra por provider (WhatsApp/Email)
- Verifica se já recebeu mensagem hoje
- Retorna até `limit` leads

### **`check_campaign_instance_status(inbox_id)`**
Verifica status da instância:
- Retorna `connected`, `status`, `instance_name`

### **`log_campaign_step(run_id, step_name, level, message, details, lead_id, message_id)`**
Cria log estruturado na timeline

### **`increment_campaign_run_metrics(run_id, success, failed, skipped)`**
Incrementa contadores atomicamente

### **`get_campaign_analytics(run_id, workspace_id)`**
Retorna analytics completo:
- Informações do run
- Métricas das mensagens
- Timeline de logs
- Gráficos e taxas

---

## 📊 Estados e Transições

### **`campaign_runs.status`:**
```
pending → running → completed
                ↓
            failed
                ↓
            cancelled
                ↓
            paused → running (resume)
```

### **`campaign_messages.status`:**
```
pending → queued → generating → sending → sent → replied
                                              ↓
                                          failed
                                              ↓
                                          skipped
```

---

## 🎯 Características Importantes

### **1. Anti-Spam / Anti-Block**
- ✅ Intervalos **aleatórios** entre mensagens
- ✅ Respeita `end_time` (não envia após horário limite)
- ✅ Limite diário por lead (não envia 2x no mesmo dia)

### **2. Integração com IA**
- ✅ Usa **MESMO modelo** do `ai_agents` do workspace
- ✅ Prompt customizável via `ai_instructions`
- ✅ Fracionamento inteligente de mensagens longas
- ✅ Contexto completo do lead (custom fields, etc.)

### **3. Multi-Provider**
- ✅ Suporta WhatsApp (requer `whatsapp_valid = TRUE`)
- ✅ Suporta Email (validação de formato)
- ✅ Instagram (placeholder, não implementado)

### **4. Resiliência**
- ✅ Pausa automática se instância desconectar
- ✅ Retry de mensagens falhadas
- ✅ Logs detalhados para debug
- ✅ Métricas em tempo real

### **5. Auditoria**
- ✅ Logs estruturados (`campaign_logs`)
- ✅ Histórico de mudanças (`campaign_audit_log`)
- ✅ Relatórios diários (`campaign_whatsapp_reports`)

---

## 🔍 Pontos de Atenção

### **1. Limitação de Instância**
- ⚠️ **Apenas 1 campanha RUNNING por instância** (inbox)
- ⚠️ Se já tiver uma rodando, nova campanha é bloqueada
- ⚠️ Isso evita conflitos, mas pode ser restritivo

### **2. Leads Elegíveis**
- ⚠️ **WhatsApp:** Requer `whatsapp_valid = TRUE` (validação prévia)
- ⚠️ **Email:** Apenas validação de formato (não verifica se existe)
- ⚠️ Não envia para leads que já receberam mensagem hoje

### **3. Agendamento**
- ⚠️ Se não couber todos os leads no `end_time`, os excedentes são **ignorados**
- ⚠️ Não distribui para o próximo dia automaticamente
- ⚠️ Intervalo mínimo de 120 segundos (2 minutos)

### **4. Modelo de IA**
- ⚠️ **OBRIGATÓRIO** ter `ai_agents` configurado no workspace
- ⚠️ Se não tiver, geração de mensagem falha

### **5. Fracionamento**
- ⚠️ Usa **2 chamadas de IA** (geração + split)
- ⚠️ Consome mais tokens
- ⚠️ Delay entre partes pode ser longo

---

## 📈 Métricas e Analytics

### **Disponíveis via `get_campaign_analytics()`:**
- Total de leads processados
- Taxa de sucesso/falha
- Taxa de resposta
- Tokens consumidos
- Custo estimado
- Timeline completa de logs
- Gráficos (pizza, barras)

### **Relatórios Diários:**
- `campaign_whatsapp_reports` consolida por dia
- Taxas de entrega, leitura, resposta
- Comparação com períodos anteriores

---

## 🚀 Melhorias Potenciais

1. **Distribuição Multi-Dia:** Se não couber no dia, distribuir para próximos dias
2. **Priorização de Leads:** Ordenar por critérios (valor, prioridade, etc.)
3. **A/B Testing:** Testar diferentes prompts e medir performance
4. **Blacklist:** Evitar enviar para leads que optaram out
5. **Templates:** Salvar mensagens geradas como templates reutilizáveis
6. **Agendamento Avançado:** Horários específicos por dia da semana
7. **Retry Inteligente:** Retry apenas para erros recuperáveis
8. **Rate Limiting Dinâmico:** Ajustar intervalo baseado em taxa de resposta

---

## 📝 Resumo do Fluxo

```
1. CRON → campaign-scheduler
   ↓
2. Verifica should_campaign_run()
   ↓
3. Cria campaign_run (status: running)
   ↓
4. Busca leads elegíveis
   ↓
5. Calcula horários (respeitando end_time)
   ↓
6. Insere campaign_messages (status: pending)
   ↓
7. CRON → campaign-process-queue
   ↓
8. Para cada mensagem pronta:
   - Gera mensagem via IA
   - Fraciona (se habilitado)
   - Envia via WhatsApp/Email
   - Move lead para coluna destino
   ↓
9. Quando todas processadas:
   - campaign_run.status = completed
   ↓
10. Trigger detecta resposta → marca como replied
   ↓
11. CRON → campaign-generate-report (consolida métricas)
```

---

**Última atualização:** Janeiro 2025

