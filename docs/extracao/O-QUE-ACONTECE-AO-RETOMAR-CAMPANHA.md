# 🔄 O Que Acontece Quando Você Retoma uma Campanha Pausada?

## 📋 Resumo Executivo

Quando você retoma uma campanha pausada, o sistema:
1. ✅ Verifica se a campanha está realmente pausada
2. ✅ Verifica se a instância (WhatsApp/Email) está conectada
3. ✅ Muda o status de `paused` → `running`
4. ✅ Reativa apenas as mensagens que foram **pausadas** (não as canceladas)
5. ✅ Reagenda essas mensagens com novos horários (começando AGORA)
6. ✅ Cria um log na timeline da campanha

---

## 🔍 Passo a Passo Detalhado

### **1. Validações Iniciais**

#### ✅ **Verifica se a Run Existe**
```sql
SELECT cr.*, cc.inbox_id, cc.min_interval_seconds
FROM campaign_runs cr
JOIN campaign_configs cc ON cc.id = cr.config_id
WHERE cr.id = p_run_id;
```

**Se não encontrar:**
```json
{
  "error": "Run não encontrada"
}
```

#### ✅ **Verifica se Está Pausada**
```sql
IF v_run.status != 'paused' THEN
    RETURN jsonb_build_object(
        'error', 'Campanha não está pausada',
        'current_status', v_run.status
    );
END IF;
```

**Se não estiver pausada:**
```json
{
  "error": "Campanha não está pausada",
  "current_status": "running"  // ou "completed", "failed", "cancelled"
}
```

#### ✅ **Verifica se Instância Está Conectada**
```sql
SELECT check_campaign_instance_status(v_run.inbox_id) INTO v_instance_status;

IF NOT (v_instance_status->>'connected')::boolean THEN
    RETURN jsonb_build_object(
        'error', 'Instância desconectada',
        'instance_status', v_instance_status->>'status',
        'instance_name', v_instance_status->>'instance_name'
    );
END IF;
```

**Se instância desconectada:**
```json
{
  "error": "Instância desconectada",
  "instance_status": "disconnected",
  "instance_name": "WhatsApp Business"
}
```

---

### **2. Retomada da Campanha**

#### ✅ **Atualiza Status da Run**
```sql
UPDATE campaign_runs
SET 
    status = 'running',           -- ✅ Muda de 'paused' para 'running'
    error_message = NULL          -- ✅ Limpa mensagem de erro
WHERE id = p_run_id;
```

**Antes:**
- `status = 'paused'`
- `error_message = 'Pausado manualmente pelo usuário'`

**Depois:**
- `status = 'running'`
- `error_message = NULL`

---

### **3. Reativação das Mensagens**

#### ✅ **Seleciona Mensagens para Retomar**

A função busca apenas mensagens que foram **pausadas** (não canceladas):

```sql
SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
FROM campaign_messages
WHERE run_id = p_run_id
  AND status = 'skipped'                    -- ✅ Só mensagens skipped
  AND error_message LIKE '%ausad%'          -- ✅ Só as que foram pausadas
```

**Critérios:**
- ✅ `status = 'skipped'` (mensagens que foram puladas)
- ✅ `error_message LIKE '%ausad%'` (contém "pausad" ou "Pausad")
- ❌ Mensagens com `error_message = 'Campanha cancelada'` **NÃO são retomadas**

---

### **4. Reagendamento com Novos Horários**

#### ✅ **Calcula Novos Horários**

```sql
v_new_schedule_time := NOW();  -- ✅ Começa AGORA
v_interval_seconds := COALESCE(v_run.min_interval_seconds, 120);  -- ✅ Usa intervalo configurado (padrão: 120s)
```

**Fórmula de Reagendamento:**
```sql
scheduled_at = NOW() + (
    (índice_da_mensagem - 1) * min_interval_seconds + 
    FLOOR(RANDOM() * min_interval_seconds)  -- ✅ Aleatório para evitar padrões
) * INTERVAL '1 second'
```

**Exemplo Prático:**

Se você tem 5 mensagens pausadas e `min_interval_seconds = 120`:

| Mensagem | Índice | Horário Base | Aleatório | Horário Final |
|----------|--------|--------------|-----------|---------------|
| 1ª | 1 | `NOW()` | + 0s | `NOW()` |
| 2ª | 2 | `NOW() + 120s` | + 45s | `NOW() + 165s` |
| 3ª | 3 | `NOW() + 240s` | + 78s | `NOW() + 318s` |
| 4ª | 4 | `NOW() + 360s` | + 12s | `NOW() + 372s` |
| 5ª | 5 | `NOW() + 480s` | + 99s | `NOW() + 579s` |

**Características:**
- ✅ Primeira mensagem: enviada **imediatamente** (`NOW()`)
- ✅ Próximas mensagens: escalonadas com intervalo aleatório
- ✅ Intervalo aleatório evita padrões detectáveis
- ✅ Respeita `min_interval_seconds` da configuração

---

### **5. Atualização das Mensagens**

```sql
UPDATE campaign_messages cm
SET 
    status = 'pending',           -- ✅ Muda de 'skipped' para 'pending'
    error_message = NULL,          -- ✅ Limpa mensagem de erro
    scheduled_at = [novo_horário]  -- ✅ Novo horário calculado
FROM messages_to_resume mtr
WHERE cm.id = mtr.id;
```

**Antes:**
- `status = 'skipped'`
- `error_message = 'Pausado manualmente pelo usuário'`
- `scheduled_at = [horário_original]`

**Depois:**
- `status = 'pending'` ✅
- `error_message = NULL` ✅
- `scheduled_at = [novo_horário_calculado]` ✅

---

### **6. Log na Timeline**

```sql
PERFORM log_campaign_step(
    p_run_id,
    'RETOMADA',                    -- ✅ Step name
    'success',                     -- ✅ Level
    '▶️ Campanha retomada! ' || v_messages_resumed || ' mensagens reagendadas',
    jsonb_build_object('messages_resumed', v_messages_resumed)
);
```

**Log Criado:**
```json
{
  "step_name": "RETOMADA",
  "level": "success",
  "message": "▶️ Campanha retomada! 15 mensagens reagendadas",
  "details": {
    "messages_resumed": 15
  }
}
```

---

### **7. Retorno da Função**

```json
{
  "success": true,
  "run_id": "967e664d-525d-4ad1-9bb3-bdca235f121a",
  "messages_resumed": 15
}
```

---

## 🎯 Mensagens Afetadas vs Não Afetadas

### ✅ **Mensagens QUE SÃO Retomadas:**

| Status | Error Message | Será Retomada? |
|--------|--------------|----------------|
| `skipped` | `'Pausado manualmente pelo usuário'` | ✅ **SIM** |
| `skipped` | `'Pausado por instância desconectada'` | ✅ **SIM** |
| `skipped` | `'Campanha pausada'` | ✅ **SIM** |

**Critério:** `error_message LIKE '%ausad%'` (contém "pausad")

---

### ❌ **Mensagens QUE NÃO SÃO Retomadas:**

| Status | Error Message | Será Retomada? |
|--------|--------------|----------------|
| `skipped` | `'Campanha cancelada'` | ❌ **NÃO** |
| `sent` | `NULL` | ❌ **NÃO** |
| `failed` | `'Erro ao enviar'` | ❌ **NÃO** |
| `replied` | `NULL` | ❌ **NÃO** |
| `generating` | `NULL` | ❌ **NÃO** |
| `sending` | `NULL` | ❌ **NÃO** |

**Motivo:** Apenas mensagens que foram **pausadas** são retomadas. Mensagens **canceladas** ou já **processadas** não são afetadas.

---

## ⚠️ Observações Importantes

### **1. Mensagens em Processamento**

Se uma mensagem estava sendo processada quando você pausou:
- ✅ `generating` → foi marcada como `skipped` → será retomada
- ✅ `sending` → foi marcada como `skipped` → será retomada

**Mas:** Se a mensagem já foi enviada (`sent`), ela **não será retomada**.

---

### **2. Horários Reagendados**

- ✅ Novos horários começam **AGORA** (`NOW()`)
- ✅ Não mantém os horários originais
- ✅ Intervalos aleatórios evitam padrões detectáveis
- ✅ Respeita `min_interval_seconds` da configuração

---

### **3. Instância Deve Estar Conectada**

- ❌ Se instância desconectada → erro e **não retoma**
- ✅ Se instância conectada → retoma normalmente

**Motivo:** Não faz sentido retomar se não há como enviar mensagens.

---

### **4. Status da Run**

- ✅ `paused` → `running` (retomada)
- ❌ `completed` → erro (já finalizada)
- ❌ `failed` → erro (já falhou)
- ❌ `cancelled` → erro (cancelada permanentemente)

---

## 🔄 Fluxo Completo Visual

```
┌─────────────────────────────────────────────────────────────┐
│ 1. VALIDAÇÕES                                                │
│    ✅ Run existe?                                            │
│    ✅ Status = 'paused'?                                     │
│    ✅ Instância conectada?                                  │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. RETOMAR RUN                                              │
│    campaign_runs.status → 'running'                         │
│    campaign_runs.error_message → NULL                       │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BUSCAR MENSAGENS PAUSADAS                                │
│    WHERE status = 'skipped'                                 │
│      AND error_message LIKE '%ausad%'                      │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. REAGENDAR MENSAGENS                                      │
│    Mensagem 1: NOW()                                        │
│    Mensagem 2: NOW() + (1 * intervalo + aleatório)         │
│    Mensagem 3: NOW() + (2 * intervalo + aleatório)         │
│    ...                                                       │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ATUALIZAR MENSAGENS                                      │
│    status → 'pending'                                       │
│    error_message → NULL                                     │
│    scheduled_at → [novo_horário]                           │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CRIAR LOG                                                │
│    'RETOMADA' | 'success' | 'X mensagens reagendadas'      │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. RETORNAR SUCESSO                                         │
│    { success: true, messages_resumed: X }                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Exemplo Real

**Situação:**
- Campanha com 20 mensagens agendadas
- Você pausou quando 5 mensagens já foram enviadas
- 15 mensagens ficaram como `skipped` com `error_message = 'Pausado manualmente'`

**Ao Retomar:**
1. ✅ Run muda para `running`
2. ✅ 15 mensagens `skipped` são encontradas
3. ✅ Todas são reagendadas começando AGORA
4. ✅ Primeira mensagem: enviada imediatamente
5. ✅ Próximas: escalonadas com intervalo aleatório
6. ✅ Log criado: "▶️ Campanha retomada! 15 mensagens reagendadas"

**Resultado:**
- ✅ 5 mensagens já enviadas → **não são afetadas**
- ✅ 15 mensagens pausadas → **retomadas e reagendadas**

---

## 🎯 Resumo Final

Quando você retoma uma campanha pausada:

1. ✅ **Valida** se pode retomar (status, instância)
2. ✅ **Muda** status de `paused` → `running`
3. ✅ **Encontra** apenas mensagens que foram pausadas
4. ✅ **Reagenda** essas mensagens começando AGORA
5. ✅ **Cria** log na timeline
6. ✅ **Retorna** sucesso com quantidade de mensagens retomadas

**Mensagens canceladas ou já processadas NÃO são afetadas!**

---

**Status:** ✅ **Documentação Completa - Pronto para Uso!**

