# 🎯 Guia Passo a Passo: Pausar, Cancelar e Retomar Campanhas

**Para:** Figma Maker (Frontend)  
**Objetivo:** Implementar controles de campanha sem erros

---

## 📋 ETAPA 1: Criar Funções Base

### **1.1. Criar arquivo `campaign-actions.ts`**

Crie um arquivo novo com estas 3 funções:

```typescript
import { supabase } from '@/lib/supabase'; // Ajuste o caminho do seu supabase

// ==================== PAUSAR CAMPANHA ====================
export async function pauseCampaign(runId: string, reason?: string) {
  const { data, error } = await supabase.rpc('pause_campaign_run', {
    p_run_id: runId,
    p_reason: reason || 'Pausado manualmente'
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

// ==================== CANCELAR CAMPANHA ====================
export async function cancelCampaign(runId: string) {
  const { data, error } = await supabase.rpc('cancel_campaign_run', {
    p_run_id: runId
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

// ==================== RETOMAR CAMPANHA ====================
export async function resumeCampaign(runId: string) {
  const { data, error } = await supabase.rpc('resume_campaign_run', {
    p_run_id: runId
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
```

**✅ Checklist:**
- [ ] Arquivo criado
- [ ] 3 funções copiadas exatamente como acima
- [ ] Caminho do `supabase` ajustado

---

## 📋 ETAPA 2: Criar Hook React

### **2.1. Criar arquivo `use-campaign-actions.ts`**

```typescript
import { useState } from 'react';
import { pauseCampaign, cancelCampaign, resumeCampaign } from './campaign-actions';

export function useCampaignActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePause = async (runId: string, reason?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await pauseCampaign(runId, reason);
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (runId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await cancelCampaign(runId);
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (runId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await resumeCampaign(runId);
      return { success: true, data: result };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    handlePause,
    handleCancel,
    handleResume
  };
}
```

**✅ Checklist:**
- [ ] Hook criado
- [ ] Import do `campaign-actions` correto
- [ ] 3 funções implementadas

---

## 📋 ETAPA 3: Criar Componente de Botões

### **3.1. Criar arquivo `CampaignActions.tsx`**

```typescript
'use client';

import { useCampaignActions } from './use-campaign-actions';

interface CampaignActionsProps {
  runId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  onSuccess?: () => void; // Callback quando ação for bem-sucedida
}

export function CampaignActions({ runId, status, onSuccess }: CampaignActionsProps) {
  const { loading, error, handlePause, handleCancel, handleResume } = useCampaignActions();

  // ==================== PAUSAR ====================
  const onPause = async () => {
    if (!confirm('Deseja pausar esta campanha? As mensagens pendentes serão canceladas.')) {
      return;
    }

    const result = await handlePause(runId, 'Pausado manualmente pelo usuário');
    
    if (result.success) {
      alert(`✅ Campanha pausada! ${result.data.messages_skipped} mensagens canceladas.`);
      onSuccess?.();
    } else {
      alert(`❌ Erro: ${result.error}`);
    }
  };

  // ==================== CANCELAR ====================
  const onCancel = async () => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação é permanente! Deseja cancelar esta campanha?')) {
      return;
    }

    const result = await handleCancel(runId);
    
    if (result.success) {
      alert(`✅ Campanha cancelada! ${result.data.messages_cancelled} mensagens canceladas.`);
      onSuccess?.();
    } else {
      alert(`❌ Erro: ${result.error}`);
    }
  };

  // ==================== RETOMAR ====================
  const onResume = async () => {
    const result = await handleResume(runId);
    
    if (result.success) {
      alert(`✅ Campanha retomada! ${result.data.messages_resumed} mensagens reagendadas.`);
      onSuccess?.();
    } else {
      alert(`❌ Erro: ${result.error}`);
    }
  };

  // ==================== RENDER ====================
  return (
    <div>
      {/* Mensagem de erro */}
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          ❌ {error}
        </div>
      )}

      {/* Botões baseados no status */}
      {status === 'running' && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={onPause} 
            disabled={loading}
            style={{ padding: '8px 16px' }}
          >
            {loading ? 'Pausando...' : '⏸️ Pausar'}
          </button>
          <button 
            onClick={onCancel} 
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white' }}
          >
            {loading ? 'Cancelando...' : '🚫 Cancelar'}
          </button>
        </div>
      )}

      {status === 'paused' && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={onResume} 
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white' }}
          >
            {loading ? 'Retomando...' : '▶️ Retomar'}
          </button>
          <button 
            onClick={onCancel} 
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white' }}
          >
            {loading ? 'Cancelando...' : '🚫 Cancelar'}
          </button>
        </div>
      )}

      {(status === 'completed' || status === 'failed' || status === 'cancelled') && (
        <p style={{ color: '#6c757d' }}>
          Campanha {status === 'completed' ? 'finalizada' : status === 'failed' ? 'falhou' : 'cancelada'}
        </p>
      )}
    </div>
  );
}
```

**✅ Checklist:**
- [ ] Componente criado
- [ ] Props corretas (`runId`, `status`, `onSuccess`)
- [ ] 3 funções de ação implementadas
- [ ] Renderização condicional por status

---

## 📋 ETAPA 4: Usar no Seu Componente

### **4.1. Importar e usar**

No seu componente que mostra a campanha:

```typescript
import { CampaignActions } from './CampaignActions';

// Dentro do seu componente:
function CampaignDetails({ campaign }) {
  const [campaignData, setCampaignData] = useState(campaign);

  const handleActionSuccess = () => {
    // Recarregar dados da campanha após ação bem-sucedida
    fetchCampaignData(campaign.id).then(setCampaignData);
  };

  return (
    <div>
      {/* Seus outros componentes aqui */}
      
      <CampaignActions 
        runId={campaignData.run_id}
        status={campaignData.status}
        onSuccess={handleActionSuccess}
      />
    </div>
  );
}
```

**✅ Checklist:**
- [ ] Componente importado
- [ ] Props passadas corretamente
- [ ] Callback `onSuccess` implementado (para recarregar dados)

---

## 📋 ETAPA 5: Validações (Opcional, mas Recomendado)

### **5.1. Adicionar validações antes de executar**

Se quiser validar antes de chamar a função, adicione no componente:

```typescript
// No CampaignActions.tsx, antes de chamar as funções:

const onPause = async () => {
  // ✅ VALIDAÇÃO: Só pode pausar se está running
  if (status !== 'running') {
    alert('Apenas campanhas em execução podem ser pausadas');
    return;
  }

  if (!confirm('Deseja pausar esta campanha?')) {
    return;
  }

  // ... resto do código
};

const onCancel = async () => {
  // ✅ VALIDAÇÃO: Só pode cancelar se está running ou paused
  if (!['running', 'paused'].includes(status)) {
    alert('Apenas campanhas em execução ou pausadas podem ser canceladas');
    return;
  }

  if (!confirm('⚠️ ATENÇÃO: Esta ação é permanente!')) {
    return;
  }

  // ... resto do código
};

const onResume = async () => {
  // ✅ VALIDAÇÃO: Só pode retomar se está paused
  if (status !== 'paused') {
    alert('Apenas campanhas pausadas podem ser retomadas');
    return;
  }

  // ... resto do código
};
```

**✅ Checklist:**
- [ ] Validações adicionadas (opcional)
- [ ] Mensagens de erro claras

---

## 📋 ETAPA 6: Testar

### **6.1. Checklist de Testes**

Teste cada cenário:

**Teste 1: Pausar Campanha Running**
- [ ] Clicar em "Pausar" em campanha `running`
- [ ] Confirmar diálogo
- [ ] Ver mensagem de sucesso
- [ ] Status muda para `paused`
- [ ] Botões mudam (aparece "Retomar")

**Teste 2: Cancelar Campanha Running**
- [ ] Clicar em "Cancelar" em campanha `running`
- [ ] Confirmar diálogo
- [ ] Ver mensagem de sucesso
- [ ] Status muda para `cancelled`
- [ ] Botões desaparecem

**Teste 3: Retomar Campanha Paused**
- [ ] Clicar em "Retomar" em campanha `paused`
- [ ] Ver mensagem de sucesso
- [ ] Status muda para `running`
- [ ] Botões mudam (aparece "Pausar" e "Cancelar")

**Teste 4: Erros**
- [ ] Tentar pausar campanha `completed` → Deve mostrar erro
- [ ] Tentar retomar campanha `running` → Deve mostrar erro
- [ ] Tentar cancelar campanha `cancelled` → Deve mostrar erro

---

## 🚨 Erros Comuns e Soluções

### **Erro 1: "Run não encontrada"**
**Causa:** `runId` está errado ou run foi deletada  
**Solução:** Verificar se `runId` está correto no componente

### **Erro 2: "Campanha não está em execução"**
**Causa:** Tentando pausar campanha que não está `running`  
**Solução:** Validar status antes de mostrar botão (já está na validação opcional)

### **Erro 3: "Instância desconectada" (ao retomar)**
**Causa:** Instância WhatsApp/Email está desconectada  
**Solução:** Mostrar mensagem clara: "Conecte a instância antes de retomar"

### **Erro 4: Função RPC não encontrada**
**Causa:** Função SQL não existe no banco  
**Solução:** Verificar se as funções `pause_campaign_run`, `cancel_campaign_run`, `resume_campaign_run` existem no Supabase

---

## 📝 Resumo das Etapas

1. ✅ **ETAPA 1:** Criar `campaign-actions.ts` com 3 funções
2. ✅ **ETAPA 2:** Criar `use-campaign-actions.ts` hook
3. ✅ **ETAPA 3:** Criar `CampaignActions.tsx` componente
4. ✅ **ETAPA 4:** Importar e usar no seu componente
5. ✅ **ETAPA 5:** Adicionar validações (opcional)
6. ✅ **ETAPA 6:** Testar todos os cenários

---

## 🎯 Código Final Completo (Para Copiar)

Se quiser tudo em um arquivo só:

```typescript
// campaign-actions-complete.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // Ajuste o caminho

// ==================== FUNÇÕES RPC ====================
async function pauseCampaign(runId: string, reason?: string) {
  const { data, error } = await supabase.rpc('pause_campaign_run', {
    p_run_id: runId,
    p_reason: reason || 'Pausado manualmente'
  });
  if (error || data?.error) throw new Error(error?.message || data?.error);
  return data;
}

async function cancelCampaign(runId: string) {
  const { data, error } = await supabase.rpc('cancel_campaign_run', {
    p_run_id: runId
  });
  if (error || data?.error) throw new Error(error?.message || data?.error);
  return data;
}

async function resumeCampaign(runId: string) {
  const { data, error } = await supabase.rpc('resume_campaign_run', {
    p_run_id: runId
  });
  if (error || data?.error) throw new Error(error?.message || data?.error);
  return data;
}

// ==================== COMPONENTE ====================
export function CampaignActions({ runId, status, onSuccess }: {
  runId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPause = async () => {
    if (status !== 'running') {
      alert('Apenas campanhas em execução podem ser pausadas');
      return;
    }
    if (!confirm('Deseja pausar esta campanha?')) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await pauseCampaign(runId);
      alert(`✅ Campanha pausada! ${result.messages_skipped} mensagens canceladas.`);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onCancel = async () => {
    if (!['running', 'paused'].includes(status)) {
      alert('Apenas campanhas em execução ou pausadas podem ser canceladas');
      return;
    }
    if (!confirm('⚠️ ATENÇÃO: Esta ação é permanente!')) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await cancelCampaign(runId);
      alert(`✅ Campanha cancelada! ${result.messages_cancelled} mensagens canceladas.`);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onResume = async () => {
    if (status !== 'paused') {
      alert('Apenas campanhas pausadas podem ser retomadas');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await resumeCampaign(runId);
      alert(`✅ Campanha retomada! ${result.messages_resumed} mensagens reagendadas.`);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div style={{ color: 'red' }}>❌ {error}</div>}
      
      {status === 'running' && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onPause} disabled={loading}>
            {loading ? 'Pausando...' : '⏸️ Pausar'}
          </button>
          <button onClick={onCancel} disabled={loading} style={{ backgroundColor: '#dc3545', color: 'white' }}>
            {loading ? 'Cancelando...' : '🚫 Cancelar'}
          </button>
        </div>
      )}

      {status === 'paused' && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onResume} disabled={loading} style={{ backgroundColor: '#28a745', color: 'white' }}>
            {loading ? 'Retomando...' : '▶️ Retomar'}
          </button>
          <button onClick={onCancel} disabled={loading} style={{ backgroundColor: '#dc3545', color: 'white' }}>
            {loading ? 'Cancelando...' : '🚫 Cancelar'}
          </button>
        </div>
      )}

      {['completed', 'failed', 'cancelled'].includes(status) && (
        <p>Campanha {status === 'completed' ? 'finalizada' : status === 'failed' ? 'falhou' : 'cancelada'}</p>
      )}
    </div>
  );
}
```

**Uso:**
```typescript
<CampaignActions 
  runId="uuid-da-campanha" 
  status="running" 
  onSuccess={() => console.log('Ação concluída!')} 
/>
```

---

**✅ Pronto! Siga as etapas na ordem e você terá tudo funcionando.**

