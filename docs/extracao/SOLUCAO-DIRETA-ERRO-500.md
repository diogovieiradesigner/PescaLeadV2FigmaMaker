# 🔧 SOLUÇÃO DIRETA: Erro 500 na Extração CNPJ

## 🎯 Problema Identificado

### Análise dos Logs
- **0 logs** de extração nas últimas horas na função `start-cnpj-extraction`
- **Função não chega nem ao ponto** de chamar `cnpj-api`
- **Erro 500** provavelmente na própria `start-cnpj-extraction`, não na `cnpj-api`

### Fluxo Real Atual
```
1. start-cnpj-extraction (chamada do frontend)
2. ❌ FALHA INTERNA (erro 500)
3. ❌ NUNCA chega ao ponto de chamar cnpj-api
```

## 🔍 Diagnóstico

### Problemas Prováveis na Função `start-cnpj-extraction`

**1. Environment Variables Ausentes**
- `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` não configuradas
- Função falha ao inicializar o cliente Supabase

**2. Erro de Sintaxe ou Import**
- Problema nas importações
- Erro de TypeScript não capturado

**3. Validação de Parâmetros**
- Falha na validação do body da requisição
- Parâmetros obrigatórios ausentes

**4. Conexão com Banco**
- Falha ao criar/cliente Supabase
- Problema de permissões RLS

## 🛠️ Solução Proposta

### Passo 1: Simplificar Função Temporariamente

Vou criar uma versão simplificada da função `start-cnpj-extraction` para diagnóstico:

```typescript
// Versão simplificada para teste
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 [TESTE] Função iniciada');
    
    // Testar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 [TESTE] SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.log('🔧 [TESTE] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'MISSING');
    
    // Testar parsing do body
    let body;
    try {
      body = await req.json();
      console.log('📝 [TESTE] Body parsed:', JSON.stringify(body));
    } catch (e) {
      console.error('❌ [TESTE] Body parse error:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Testar campos obrigatórios
    const { workspace_id, extraction_name, filters, target_quantity } = body;
    
    if (!workspace_id || !filters || !target_quantity) {
      console.log('❌ [TESTE] Campos obrigatórios ausentes');
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios ausentes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ [TESTE] Validações passaram');
    
    // Resposta de sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Função testada com sucesso',
        data: {
          workspace_id,
          extraction_name,
          target_quantity,
          filters_count: Object.keys(filters).length
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('💥 [TESTE] Error geral:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

### Passo 2: Deploy da Versão Simplificada

Fazer deploy desta versão simplificada para:
1. **Identificar** onde exatamente a função falha
2. **Verificar** se as variáveis de ambiente estão corretas
3. **Testar** a validação de parâmetros
4. **Confirmar** se o parsing do body funciona

### Passo 3: Implementar Correção Gradual

Após identificar o problema:
1. **Corrigir** o problema específico
2. **Adicionar** logging mais detalhado
3. **Restaurar** funcionalidade completa gradualmente
4. **Testar** cada etapa

## 📋 Plano de Execução

### Imediato (Próximos 15 minutos)
1. 🔄 **Criar versão simplificada** da função `start-cnpj-extraction`
2. 🚀 **Deploy** da versão simplificada
3. 🧪 **Testar** via frontend ou curl

### Diagnóstico (Próximos 30 minutos)
1. 📊 **Analisar logs** da versão simplificada
2. 🎯 **Identificar** problema específico
3. 🔧 **Implementar** correção

### Implementação (Próximos 60 minutos)
1. ✅ **Corrigir** problema identificado
2. 🔄 **Restaurar** funcionalidade completa
3. ✅ **Deploy** da versão corrigida
4. 🧪 **Testar** extração completa

---

**Status**: 🔄 **PREPARANDO SOLUÇÃO DIRETA**  
**Objetivo**: Identificar e corrigir erro 500 na função `start-cnpj-extraction`  
**Tempo estimado**: 1-2 horas para solução completa