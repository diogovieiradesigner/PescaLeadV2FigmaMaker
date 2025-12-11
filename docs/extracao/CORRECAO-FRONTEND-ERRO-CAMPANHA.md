# 🔧 Correção: Frontend Não Captura Erro da Edge Function

## 🎯 Problema Identificado

O frontend está recebendo erro genérico:
```
FunctionsHttpError: Edge Function returned a non-2xx status code
```

Mas **não está conseguindo ler a mensagem de erro específica** da Edge Function.

---

## ✅ Solução: Melhorar Tratamento de Erro no Frontend

### **Código Atual (Problema):**

```typescript
const { data, error } = await supabase.functions.invoke('campaign-execute-now', {
  body: { config_id }
});

if (error) {
  console.error('Erro:', error.message); // ❌ Só mostra mensagem genérica
}
```

### **Código Corrigido:**

```typescript
try {
  const { data, error } = await supabase.functions.invoke('campaign-execute-now', {
    body: { config_id }
  });

  if (error) {
    // ✅ Tentar ler mensagem de erro específica
    let errorMessage = error.message;
    let errorCode = null;
    
    // Se error tem contexto, tentar extrair mensagem específica
    if (error.context) {
      try {
        // Tentar ler response body se disponível
        const response = error.context.response;
        if (response) {
          const errorData = await response.json().catch(() => null);
          if (errorData?.error) {
            errorMessage = errorData.error;
            errorCode = errorData.error_code;
          }
        }
      } catch (e) {
        console.warn('Não foi possível ler erro específico:', e);
      }
    }
    
    console.error('❌ Erro:', errorMessage);
    if (errorCode) {
      console.error('Código:', errorCode);
    }
    
    // Mostrar erro para usuário
    alert(`Erro: ${errorMessage}`);
  } else {
    console.log('✅ Sucesso:', data);
  }
} catch (err: any) {
  console.error('❌ Erro na requisição:', err);
  alert(`Erro: ${err.message || 'Erro ao executar campanha'}`);
}
```

---

## 🎯 Alternativa Mais Simples (Recomendada)

Se o Supabase Client não permite ler o body de erro facilmente, use `fetch` diretamente:

```typescript
async function executeCampaignNow(configId: string) {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/campaign-execute-now`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({ config_id: configId })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // ✅ Agora conseguimos ler a mensagem de erro específica!
      const errorMessage = data.error || 'Erro desconhecido';
      const errorCode = data.error_code || null;
      
      console.error('❌ Erro:', errorMessage);
      if (errorCode) {
        console.error('Código:', errorCode);
      }
      
      throw new Error(errorMessage);
    }

    return data;
  } catch (error: any) {
    console.error('❌ Erro na requisição:', error);
    throw error;
  }
}
```

---

## 🔍 Verificar Erro Específico Agora

Para descobrir qual é o erro específico **agora mesmo**, execute no Console do Navegador:

```javascript
// Cole isso no Console (F12) e execute:
fetch('https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/campaign-execute-now', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SEU_ANON_KEY_AQUI',
    'apikey': 'SEU_ANON_KEY_AQUI'
  },
  body: JSON.stringify({ config_id: 'c02cf802-1602-44fa-80fb-0f5e87a39a24' })
})
.then(r => r.json())
.then(data => console.log('Resposta:', data))
.catch(err => console.error('Erro:', err));
```

**Substitua `SEU_ANON_KEY_AQUI`** pela sua chave anon do Supabase.

Isso vai mostrar o erro específico que a Edge Function está retornando!

---

## 📋 Possíveis Erros Específicos

Baseado na configuração que vi, os erros mais prováveis são:

### **1. Horário Limite Já Passou**
```json
{
  "error": "Horário limite (10:00:00) já passou. Não é possível executar.",
  "error_code": "END_TIME_PASSED"
}
```
**Solução:** Ajuste o `end_time` para um horário futuro.

### **2. Não Cabe Todos os Leads no Tempo**
Com `min_interval_seconds: 360` (6 min) e apenas 1 hora disponível (09:00-10:00), pode não caber todos os 10 leads.

**Solução:** Aumente o `end_time` ou reduza o `daily_limit`.

### **3. Nenhum Lead Elegível**
```json
{
  "success": true,
  "message": "Nenhum lead elegível encontrado"
}
```
**Solução:** Verifique se há leads na coluna de origem com WhatsApp válido.

---

## 🎯 Próximo Passo

**Execute o código JavaScript acima no Console** para ver o erro específico, ou **implemente o tratamento de erro melhorado** no frontend!

