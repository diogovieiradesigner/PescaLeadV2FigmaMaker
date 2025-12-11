# 📋 RPCs para Visualizar Fila de Campanhas

## 🎯 Objetivo

Funções RPC para visualizar leads que estão **em fila** (agendados/pendentes) nas campanhas, permitindo acompanhar o que ainda será enviado antes mesmo de ser processado.

---

## 🔍 Funções Disponíveis

### 1. `get_campaign_schedule` - Lista Detalhada

**O que faz:** Retorna lista completa de mensagens agendadas/pendentes com todos os detalhes.

**Parâmetros:**
- `p_workspace_id` (UUID, obrigatório)
- `p_run_id` (UUID, opcional) - Filtrar por execução específica
- `p_status` (TEXT, opcional):
  - `NULL` ou `'all'` = Todas as mensagens
  - `'pending'` = Apenas pendentes (pending, scheduled, queued)
  - `'sent'` = Apenas enviadas
  - `'failed'` = Apenas falhadas
  - Qualquer outro status específico

**Campos Retornados:**
- `message_id` - ID da mensagem
- `run_id` - ID da execução
- `lead_id` - ID do lead
- `lead_name` - Nome do lead
- `phone_number` - Telefone
- `status` - Status atual (pending, queued, generating, sending, sent, failed, etc.)
- `scheduled_at` - Quando será/enviada
- `sent_at` - Quando foi enviada (se já foi)
- `time_until_send` - Tempo até envio (apenas para pendentes)
- `position_in_queue` - Posição na fila (1, 2, 3...)
- `generated_message` - Mensagem gerada pela IA (se já foi gerada)
- `ai_model` - Modelo de IA usado
- `error_message` - Mensagem de erro (se falhou)

**Exemplo de Uso:**
```sql
-- Ver todas as mensagens pendentes
SELECT * FROM get_campaign_schedule(
  'workspace-id'::UUID,
  NULL,        -- Todas as runs
  'pending'    -- Apenas pendentes
);
```

---

### 2. `get_campaign_schedule_summary` - Resumo com Estatísticas

**O que faz:** Retorna resumo consolidado com estatísticas e informações sobre próximas mensagens.

**Parâmetros:**
- `p_workspace_id` (UUID, obrigatório)
- `p_run_id` (UUID, opcional) - Filtrar por execução específica

**Campos Retornados:**
- `run_id` - ID da execução
- `run_status` - Status da run (running, completed, paused, etc.)
- `run_started_at` - Quando a run começou
- `total_messages` - Total de mensagens
- `pending_count` - Quantas estão pendentes
- `sent_count` - Quantas foram enviadas
- `failed_count` - Quantas falharam
- `next_scheduled_at` - Próxima mensagem a ser enviada
- `next_lead_name` - Nome do próximo lead
- `next_phone` - Telefone do próximo lead
- `time_until_next` - Tempo até próxima mensagem
- `last_sent_at` - Última mensagem enviada
- `last_lead_name` - Nome do último lead enviado

**Exemplo de Uso:**
```sql
-- Ver resumo de todas as runs
SELECT * FROM get_campaign_schedule_summary(
  'workspace-id'::UUID,
  NULL  -- Todas as runs
);
```

---

## 📊 Casos de Uso

### Dashboard de Campanha
- Use `get_campaign_schedule_summary` para mostrar estatísticas gerais
- Use `get_campaign_schedule` com `p_status='pending'` para listar próximas mensagens

### Lista de Mensagens Pendentes
- Chame `get_campaign_schedule` com `p_status='pending'` para ver todas que ainda serão enviadas
- Ordene por `scheduled_at` para ver ordem cronológica

### Monitoramento em Tempo Real
- Atualize a chamada das RPCs periodicamente (ex: a cada 30 segundos)
- Ou use Supabase Realtime na tabela `campaign_messages` para atualização automática

---

## 📝 Notas Importantes

1. **`time_until_send`** só está preenchido para mensagens com status `pending`, `scheduled` ou `queued`
2. **`position_in_queue`** é calculado por run (cada run tem numeração própria: 1, 2, 3...)
3. **`generated_message`** só aparece depois que a IA gerou (status `generating` ou superior)
4. **`time_until_send`** pode ser negativo se a mensagem já deveria ter sido enviada mas ainda está pendente

---

## 🎯 Resumo

- **`get_campaign_schedule`**: Lista todas as mensagens com detalhes completos
- **`get_campaign_schedule_summary`**: Mostra resumo e estatísticas rápidas
- Combine ambas: resumo no topo + lista detalhada abaixo
- Atualize periodicamente ou use Supabase Realtime para tempo real

---

**Última atualização:** Janeiro 2025

