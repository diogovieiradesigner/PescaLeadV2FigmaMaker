# 🔍 Como Ver o Erro Específico no Console

## ⚡ Solução Rápida (Cole no Console do Navegador)

Abra o Console do Navegador (F12) e cole este código:

```javascript
// Substitua 'SEU_ANON_KEY' pela sua chave anon do Supabase
// Você pode encontrar no arquivo .env ou nas configurações do projeto

const SUPABASE_URL = 'https://nlbcwaxkeaddfocigwuk.supabase.co';
const SUPABASE_ANON_KEY = 'SEU_ANON_KEY_AQUI'; // ⚠️ SUBSTITUA AQUI
const CONFIG_ID = 'c02cf802-1602-44fa-80fb-0f5e87a39a24';

fetch(`${SUPABASE_URL}/functions/v1/campaign-execute-now`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY
  },
  body: JSON.stringify({ config_id: CONFIG_ID })
})
.then(async (response) => {
  const data = await response.json();
  console.log('📊 Status:', response.status);
  console.log('📦 Resposta completa:', data);
  
  if (!response.ok) {
    console.error('❌ Erro:', data.error || 'Erro desconhecido');
    console.error('🔑 Código do erro:', data.error_code || 'N/A');
    console.error('📝 Detalhes:', data);
  } else {
    console.log('✅ Sucesso!', data);
  }
})
.catch(err => {
  console.error('❌ Erro na requisição:', err);
});
```

## 📋 O Que Isso Vai Mostrar

Isso vai mostrar no console:
- ✅ **Status HTTP** (400, 500, etc.)
- ✅ **Mensagem de erro específica** da Edge Function
- ✅ **Código do erro** (ex: `END_TIME_PASSED`, `INSTANCE_DISCONNECTED`)
- ✅ **Detalhes completos** da resposta

## 🎯 Próximo Passo

Depois de executar o código acima, **copie a mensagem de erro completa** que aparecer no console e me envie para eu poder corrigir o problema específico!

