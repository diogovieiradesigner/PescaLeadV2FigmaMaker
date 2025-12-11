# 🎯 Guia Figma Maker: Pausar, Cancelar e Retomar Campanhas

**Data:** 2025-01-XX  
**Público:** Desenvolvedores Frontend (Figma Maker)  
**Contexto:** Implementação de controles de campanha no frontend

> ⚡ **QUER IMPLEMENTAR RÁPIDO?**  
> Use o guia passo a passo: [`GUIA-FIGMA-ETAPAS-PAUSAR-CANCELAR-RETOMAR.md`](./GUIA-FIGMA-ETAPAS-PAUSAR-CANCELAR-RETOMAR.md)  
> Ele tem código pronto para copiar/colar, dividido em 6 etapas simples.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funções SQL Disponíveis](#funções-sql-disponíveis)
3. [Regras de Negócio](#regras-de-negócio)
4. [Estados e Transições](#estados-e-transições)
5. [Implementação Frontend](#implementação-frontend)
6. [Tratamento de Erros](#tratamento-de-erros)
7. [Exemplos Completos](#exemplos-completos)

---

## 🎯 Visão Geral

O sistema de campanhas permite **pausar**, **cancelar** e **retomar** campanhas em execução. Essas ações são controladas por funções SQL que garantem consistência e segurança.

### **Ações Disponíveis:**

1. **Pausar Campanha** (`pause_campaign_run`)
   - Pausa temporariamente uma campanha em execução
   - Mensagens pendentes são marcadas como `skipped`
   - Pode ser retomada depois

2. **Cancelar Campanha** (`cancel_campaign_run`)
   - Cancela permanentemente uma campanha
   - Mensagens pendentes são canceladas
   - **NÃO pode ser retomada**

3. **Retomar Campanha** (`resume_campaign_run`)
   - Retoma uma campanha pausada
   - Reagenda mensagens `skipped` com novos horários
   - Verifica se instância está conectada

---

## 🔧 Funções SQL Disponíveis

### **1. Pausar Campanha**

**Função:** `pause_campaign_run`

**Assinatura:**
```sql
pause_campaign_run(
  p_run_id UUID,
  p_reason TEXT DEFAULT 'Pausado manualmente'
) RETURNS JSONB
```

**Parâmetros:**
- `p_run_id` (UUID, obrigatório): ID da `campaign_runs` a ser pausada
- `p_reason` (TEXT, opcional): Motivo da pausa (padrão: 'Pausado manualmente')

**Retorno:**
```json
{
  "success": true,
  "run_id": "uuid-da-run",
  "messages_skipped": 15,
  "reason": "Pausado manualmente"
}
```

**Erros Possíveis:**
```json
{
  "error": "Run não encontrada"
}
```
```json
{
  "error": "Campanha não está em execução",
  "current_status": "completed"
}
```

---

### **2. Cancelar Campanha**

**Função:** `cancel_campaign_run`

**Assinatura:**
```sql
cancel_campaign_run(
  p_run_id UUID
) RETURNS JSONB
```

**Parâmetros:**
- `p_run_id` (UUID, obrigatório): ID da `campaign_runs` a ser cancelada

**Retorno:**
```json
{
  "success": true,
  "run_id": "uuid-da-run",
  "messages_cancelled": 20
}
```

**Erros Possíveis:**
```json
{
  "error": "Run não encontrada"
}
```
```json
{
  "error": "Campanha não pode ser cancelada",
  "current_status": "completed"
}
```

---

### **3. Retomar Campanha**

**Função:** `resume_campaign_run`

**Assinatura:**
```sql
resume_campaign_run(
  p_run_id UUID
) RETURNS JSONB
```

**Parâmetros:**
- `p_run_id` (UUID, obrigatório): ID da `campaign_runs` a ser retomada

**Retorno:**
```json
{
  "success": true,
  "run_id": "uuid-da-run",
  "messages_resumed": 15
}
```

**Erros Possíveis:**
```json
{
  "error": "Run não encontrada"
}
```
```json
{
  "error": "Campanha não está pausada",
  "current_status": "running"
}
```
```json
{
  "error": "Instância desconectada",
  "instance_status": "disconnected",
  "instance_name": "WhatsApp Business"
}
```

---

## 📊 Regras de Negócio

### **1. Pausar Campanha**

**Condições:**
- ✅ Run deve existir
- ✅ Run deve estar com `status = 'running'`
- ❌ Não pode pausar se já está `completed`, `failed`, `cancelled` ou `paused`

**O que acontece:**
1. `campaign_runs.status` → `'paused'`
2. `campaign_runs.error_message` → `p_reason`
3. Mensagens com `status IN ('pending', 'queued')` → `'skipped'`
4. Mensagens `'skipped'` recebem `error_message = p_reason`
5. Log criado na timeline: `'PAUSA'` com nível `'warning'`

**Mensagens Afetadas:**
- ✅ `pending` → `skipped`
- ✅ `queued` → `skipped`
- ❌ `generating` → **NÃO afetadas** (já em processamento)
- ❌ `sending` → **NÃO afetadas** (já sendo enviadas)
- ❌ `sent` → **NÃO afetadas** (já enviadas)
- ❌ `failed` → **NÃO afetadas** (já falharam)
- ❌ `replied` → **NÃO afetadas** (já responderam)

**Observações:**
- Mensagens já em processamento (`generating`, `sending`) **não são pausadas**
- Essas mensagens serão processadas até o fim ou falharem
- Apenas mensagens ainda não iniciadas são marcadas como `skipped`

---

### **2. Cancelar Campanha**

**Condições:**
- ✅ Run deve existir
- ✅ Run deve estar com `status IN ('running', 'paused')`
- ❌ Não pode cancelar se já está `completed` ou `failed`

**O que acontece:**
1. `campaign_runs.status` → `'cancelled'`
2. `campaign_runs.completed_at` → `NOW()`
3. `campaign_runs.error_message` → `'Cancelado pelo usuário'`
4. Mensagens com `status IN ('pending', 'queued', 'generating')` → `'skipped'`
5. Mensagens `'skipped'` recebem `error_message = 'Campanha cancelada'`
6. Log criado na timeline: `'CANCELAMENTO'` com nível `'warning'`

**Mensagens Afetadas:**
- ✅ `pending` → `skipped`
- ✅ `queued` → `skipped`
- ✅ `generating` → `skipped` (mesmo que já esteja gerando IA)
- ❌ `sending` → **NÃO afetadas** (já sendo enviadas)
- ❌ `sent` → **NÃO afetadas** (já enviadas)
- ❌ `failed` → **NÃO afetadas** (já falharam)
- ❌ `replied` → **NÃO afetadas** (já responderam)

**Observações:**
- **Cancelamento é permanente** - não pode ser retomado
- Mensagens em `generating` são canceladas (evita gasto de tokens)
- Mensagens já sendo enviadas (`sending`) continuam até completar ou falhar

---

### **3. Retomar Campanha**

**Condições:**
- ✅ Run deve existir
- ✅ Run deve estar com `status = 'paused'`
- ✅ Instância (WhatsApp/Email) deve estar **conectada**
- ❌ Não pode retomar se está `running`, `completed`, `failed` ou `cancelled`

**O que acontece:**
1. Verifica se instância está conectada (via `check_campaign_instance_status`)
2. Se desconectada → retorna erro
3. `campaign_runs.status` → `'running'`
4. `campaign_runs.error_message` → `NULL`
5. Mensagens `'skipped'` com `error_message LIKE '%ausad%'` → `'pending'`
6. Reagenda mensagens com novos `scheduled_at`:
   - Primeira mensagem: `NOW()`
   - Próximas: `NOW() + (índice * min_interval_seconds + random)`
   - Intervalo aleatório para evitar padrões
7. Log criado na timeline: `'RETOMADA'` com nível `'success'`

**Mensagens Afetadas:**
- ✅ `skipped` (com `error_message LIKE '%ausad%'`) → `pending`
- ❌ `skipped` (com `error_message = 'Campanha cancelada'`) → **NÃO afetadas**
- ❌ `sent`, `failed`, `replied` → **NÃO afetadas**

**Observações:**
- Apenas mensagens que foram **pausadas** são retomadas
- Mensagens **canceladas** não são retomadas
- Novos horários são calculados com intervalos aleatórios
- Verifica conectividade da instância antes de retomar

---

## 🔄 Estados e Transições

### **Estados de `campaign_runs.status`:**

```
pending → running → completed
                ↓
            failed
                ↓
            cancelled (permanente)
                ↓
            paused → running (resume)
```

**Transições Válidas:**

| Ação | Status Atual | Status Novo | Pode Reverter? |
|------|--------------|-------------|----------------|
| Pausar | `running` | `paused` | ✅ Sim (via Retomar) |
| Cancelar | `running` ou `paused` | `cancelled` | ❌ Não |
| Retomar | `paused` | `running` | ✅ Sim (via Pausar) |

**Estados Finais (não podem ser alterados):**
- `completed` - Campanha finalizou com sucesso
- `failed` - Campanha falhou
- `cancelled` - Campanha foi cancelada

---

### **Estados de `campaign_messages.status`:**

```
pending → queued → generating → sending → sent → replied
                                              ↓
                                          failed
                                              ↓
                                          skipped
```

**Impacto das Ações:**

| Ação | Mensagens Afetadas | Novo Status |
|------|-------------------|-------------|
| Pausar | `pending`, `queued` | `skipped` |
| Cancelar | `pending`, `queued`, `generating` | `skipped` |
| Retomar | `skipped` (pausadas) | `pending` |

---

## 💻 Implementação Frontend

### **1. Setup do Supabase Client**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

### **2. Função: Pausar Campanha**

```typescript
interface PauseCampaignResult {
  success: boolean;
  run_id: string;
  messages_skipped: number;
  reason: string;
  error?: string;
  current_status?: string;
}

async function pauseCampaign(
  runId: string,
  reason: string = 'Pausado manualmente'
): Promise<PauseCampaignResult> {
  try {
    const { data, error } = await supabase.rpc('pause_campaign_run', {
      p_run_id: runId,
      p_reason: reason
    });

    if (error) {
      throw error;
    }

    // Verificar se retornou erro
    if (data?.error) {
      return {
        success: false,
        run_id: runId,
        messages_skipped: 0,
        reason: '',
        error: data.error,
        current_status: data.current_status
      };
    }

    return data as PauseCampaignResult;
  } catch (error: any) {
    return {
      success: false,
      run_id: runId,
      messages_skipped: 0,
      reason: '',
      error: error.message || 'Erro ao pausar campanha'
    };
  }
}
```

**Uso:**
```typescript
const result = await pauseCampaign(runId, 'Pausado para ajustes');

if (result.success) {
  console.log(`✅ Campanha pausada! ${result.messages_skipped} mensagens canceladas`);
} else {
  console.error(`❌ Erro: ${result.error}`);
  if (result.current_status) {
    console.log(`Status atual: ${result.current_status}`);
  }
}
```

---

### **3. Função: Cancelar Campanha**

```typescript
interface CancelCampaignResult {
  success: boolean;
  run_id: string;
  messages_cancelled: number;
  error?: string;
  current_status?: string;
}

async function cancelCampaign(
  runId: string
): Promise<CancelCampaignResult> {
  try {
    const { data, error } = await supabase.rpc('cancel_campaign_run', {
      p_run_id: runId
    });

    if (error) {
      throw error;
    }

    // Verificar se retornou erro
    if (data?.error) {
      return {
        success: false,
        run_id: runId,
        messages_cancelled: 0,
        error: data.error,
        current_status: data.current_status
      };
    }

    return data as CancelCampaignResult;
  } catch (error: any) {
    return {
      success: false,
      run_id: runId,
      messages_cancelled: 0,
      error: error.message || 'Erro ao cancelar campanha'
    };
  }
}
```

**Uso:**
```typescript
const result = await cancelCampaign(runId);

if (result.success) {
  console.log(`✅ Campanha cancelada! ${result.messages_cancelled} mensagens canceladas`);
} else {
  console.error(`❌ Erro: ${result.error}`);
  if (result.current_status) {
    console.log(`Status atual: ${result.current_status}`);
  }
}
```

---

### **4. Função: Retomar Campanha**

```typescript
interface ResumeCampaignResult {
  success: boolean;
  run_id: string;
  messages_resumed: number;
  error?: string;
  current_status?: string;
  instance_status?: string;
  instance_name?: string;
}

async function resumeCampaign(
  runId: string
): Promise<ResumeCampaignResult> {
  try {
    const { data, error } = await supabase.rpc('resume_campaign_run', {
      p_run_id: runId
    });

    if (error) {
      throw error;
    }

    // Verificar se retornou erro
    if (data?.error) {
      return {
        success: false,
        run_id: runId,
        messages_resumed: 0,
        error: data.error,
        current_status: data.current_status,
        instance_status: data.instance_status,
        instance_name: data.instance_name
      };
    }

    return data as ResumeCampaignResult;
  } catch (error: any) {
    return {
      success: false,
      run_id: runId,
      messages_resumed: 0,
      error: error.message || 'Erro ao retomar campanha'
    };
  }
}
```

**Uso:**
```typescript
const result = await resumeCampaign(runId);

if (result.success) {
  console.log(`✅ Campanha retomada! ${result.messages_resumed} mensagens reagendadas`);
} else {
  console.error(`❌ Erro: ${result.error}`);
  if (result.instance_status) {
    console.log(`Instância desconectada: ${result.instance_name}`);
  }
}
```

---

## ⚠️ Tratamento de Erros

### **Erros Comuns e Como Tratar:**

#### **1. "Run não encontrada"**
```typescript
if (result.error === 'Run não encontrada') {
  // Run foi deletada ou ID inválido
  showError('Campanha não encontrada. Pode ter sido deletada.');
}
```

#### **2. "Campanha não está em execução" (Pausar)**
```typescript
if (result.error === 'Campanha não está em execução') {
  // Campanha já está pausada, cancelada ou finalizada
  showWarning(`Campanha já está ${result.current_status}. Não é possível pausar.`);
}
```

#### **3. "Campanha não pode ser cancelada" (Cancelar)**
```typescript
if (result.error === 'Campanha não pode ser cancelada') {
  // Campanha já está finalizada ou cancelada
  showWarning(`Campanha já está ${result.current_status}. Não é possível cancelar.`);
}
```

#### **4. "Campanha não está pausada" (Retomar)**
```typescript
if (result.error === 'Campanha não está pausada') {
  // Campanha não está pausada
  showWarning(`Campanha está ${result.current_status}. Apenas campanhas pausadas podem ser retomadas.`);
}
```

#### **5. "Instância desconectada" (Retomar)**
```typescript
if (result.error === 'Instância desconectada') {
  // Instância WhatsApp/Email está desconectada
  showError(`Instância ${result.instance_name} está desconectada. Conecte antes de retomar.`);
}
```

---

## 🎨 Exemplo Completo: Componente React

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CampaignControlsProps {
  runId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  onStatusChange: () => void;
}

export function CampaignControls({ runId, status, onStatusChange }: CampaignControlsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePause = async () => {
    if (!confirm('Deseja pausar esta campanha? As mensagens pendentes serão canceladas.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('pause_campaign_run', {
        p_run_id: runId,
        p_reason: 'Pausado manualmente pelo usuário'
      });

      if (rpcError) throw rpcError;
      if (data?.error) throw new Error(data.error);

      alert(`✅ Campanha pausada! ${data.messages_skipped} mensagens canceladas.`);
      onStatusChange();
    } catch (err: any) {
      setError(err.message || 'Erro ao pausar campanha');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação é permanente! Deseja cancelar esta campanha?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('cancel_campaign_run', {
        p_run_id: runId
      });

      if (rpcError) throw rpcError;
      if (data?.error) throw new Error(data.error);

      alert(`✅ Campanha cancelada! ${data.messages_cancelled} mensagens canceladas.`);
      onStatusChange();
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar campanha');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('resume_campaign_run', {
        p_run_id: runId
      });

      if (rpcError) throw rpcError;
      if (data?.error) throw new Error(data.error);

      alert(`✅ Campanha retomada! ${data.messages_resumed} mensagens reagendadas.`);
      onStatusChange();
    } catch (err: any) {
      setError(err.message || 'Erro ao retomar campanha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campaign-controls">
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="buttons">
        {status === 'running' && (
          <>
            <button 
              onClick={handlePause} 
              disabled={loading}
              className="btn-pause"
            >
              {loading ? 'Pausando...' : '⏸️ Pausar'}
            </button>
            <button 
              onClick={handleCancel} 
              disabled={loading}
              className="btn-cancel"
            >
              {loading ? 'Cancelando...' : '🚫 Cancelar'}
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button 
              onClick={handleResume} 
              disabled={loading}
              className="btn-resume"
            >
              {loading ? 'Retomando...' : '▶️ Retomar'}
            </button>
            <button 
              onClick={handleCancel} 
              disabled={loading}
              className="btn-cancel"
            >
              {loading ? 'Cancelando...' : '🚫 Cancelar'}
            </button>
          </>
        )}

        {(status === 'completed' || status === 'failed' || status === 'cancelled') && (
          <p className="text-muted">
            Campanha {status === 'completed' ? 'finalizada' : status === 'failed' ? 'falhou' : 'cancelada'}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 📝 Checklist de Implementação

### **Antes de Implementar:**

- [ ] Verificar se `runId` existe e é válido
- [ ] Verificar status atual da campanha
- [ ] Mostrar confirmação para ações destrutivas (cancelar)
- [ ] Validar conectividade da instância (para retomar)

### **Durante a Implementação:**

- [ ] Tratar todos os erros possíveis
- [ ] Mostrar feedback visual (loading, sucesso, erro)
- [ ] Atualizar UI após ação bem-sucedida
- [ ] Logar ações para auditoria

### **Após a Implementação:**

- [ ] Testar todos os cenários (pausar, cancelar, retomar)
- [ ] Validar transições de status
- [ ] Verificar mensagens afetadas
- [ ] Testar tratamento de erros

---

## 🔍 Validações Recomendadas

### **Antes de Pausar:**
```typescript
if (status !== 'running') {
  showError('Apenas campanhas em execução podem ser pausadas');
  return;
}
```

### **Antes de Cancelar:**
```typescript
if (!['running', 'paused'].includes(status)) {
  showError('Apenas campanhas em execução ou pausadas podem ser canceladas');
  return;
}
```

### **Antes de Retomar:**
```typescript
if (status !== 'paused') {
  showError('Apenas campanhas pausadas podem ser retomadas');
  return;
}

// Verificar conectividade da instância (opcional, mas recomendado)
const { data: instanceStatus } = await supabase.rpc('check_campaign_instance_status', {
  p_inbox_id: inboxId
});

if (!instanceStatus?.connected) {
  showError(`Instância ${instanceStatus?.instance_name} está desconectada. Conecte antes de retomar.`);
  return;
}
```

---

## 📚 Referências

- **Documentação do Sistema:** `ANALISE-SISTEMA-CAMPANHAS.md`
- **Estados e Transições:** Ver seção "Estados e Transições" neste documento
- **Logs de Campanha:** Função `log_campaign_step` cria logs na timeline
- **Métricas:** Função `increment_campaign_run_metrics` atualiza contadores

---

**Status:** ✅ **Pronto para Implementação**

Todas as funções SQL estão disponíveis e testadas. O frontend pode implementar os controles seguindo este guia.

