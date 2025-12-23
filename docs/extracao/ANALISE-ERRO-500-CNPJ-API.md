# 🚨 ANÁLISE: Erro 500 na Função cnpj-api

## 📊 Situação Atual

### Problema Identificado
- **Status**: Erro 500 (Internal Server Error) na função `cnpj-api`
- **Progresso**: Correção dos headers 401 ✅ aplicada, mas erro 500 persiste
- **Impacto**: Extração CNPJ ainda não funciona

### Evidências Coletadas

**1. Mudança do erro:**
```
ANTES: POST | 401 | cnpj-api/search (Unauthorized)
DEPOIS: POST | 500 | cnpj-api/search (Internal Server Error)
```

**2. Análise da função `cnpj-api`:**
- Função complexa com sistema de segurança robusto
- Validação de autenticação em múltiplas camadas
- Headers internos: `x-supabase-function-name` e `x-supabase-egress-source`

**3. Teste direto da função:**
```bash
curl -X POST https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api/search
# Resultado: {"success":false,"error":"Unauthorized"}
```

## 🔍 Análise da Função cnpj-api

### Lógica de Autenticação Interna

A função `cnpj-api` possui uma função `isInternalSupabaseCall` que verifica:

```typescript
function isInternalSupabaseCall(req: Request): boolean {
  // Headers que indicam chamada interna do Supabase
  const supabaseHeaders = [
    'x-supabase-function-name',
    'x-supabase-egress-source',
  ];

  // Se qualquer header interno do Supabase existir, é chamada interna
  for (const header of supabaseHeaders) {
    if (req.headers.get(header)) {
      console.log(`🔐 [AUTH] Internal call detected via header: ${header}`);
      return true;
    }
  }
  
  // Verificação via service_role_key
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey && apikey === serviceRoleKey) {
    return true;
  }
  
  // Verificação via Authorization Bearer
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token === serviceRoleKey) {
      return true;
    }
  }
  
  return false;
}
```

### Possíveis Problemas

**1. Headers não chegam à função:**
- Headers podem ser removidos pelo gateway do Supabase
- Verificar se headers customizados são preservados

**2. Validação posterior:**
- A função `isInternalSupabaseCall` pode estar funcionando
- Mas a função `verifyAuth` pode estar rejeitando a chamada
- A função `verifyAuth` chama `isInternalSupabaseCall` primeiro

**3. Environment variables:**
- `SUPABASE_SERVICE_ROLE_KEY` pode não estar disponível
- Variáveis de ambiente podem estar incorretas

## 🛠️ Próximos Passos de Investigação

### 1. Verificar Environment Variables
```sql
-- Verificar se as variáveis estão configuradas
SELECT name, value FROM vault.secrets WHERE name LIKE '%SERVICE_ROLE%';
```

### 2. Testar função de forma mais simples
```typescript
// Adicionar logs temporários na função cnpj-api para debug
console.log('Headers recebidos:', Object.fromEntries(req.headers.entries()));
console.log('isInternalSupabaseCall result:', isInternalSupabaseCall(req));
```

### 3. Simplificar a chamada
Tentar uma abordagem mais direta para a chamada interna.

## 🎯 Hipóteses Principais

### Hipótese 1: Headers não são preservados
- O gateway do Supabase pode estar removendo headers customizados
- Solução: Usar apenas headers padrão (`apikey` e `Authorization`)

### Hipótese 2: Environment variable ausente
- `SUPABASE_SERVICE_ROLE_KEY` pode não estar configurada na função `cnpj-api`
- Solução: Verificar e configurar as variáveis

### Hipótese 3: Validação muito restritiva
- A função `verifyAuth` pode estar sendo chamada mesmo para chamadas internas
- Solução: Revisar a lógica de autenticação

## 📋 Plano de Ação

1. ✅ **Concluído**: Corrigir headers em `start-cnpj-extraction`
2. 🔍 **Em andamento**: Diagnosticar erro 500 na `cnpj-api`
3. ⏳ **Pendente**: Implementar correção na `cnpj-api`
4. ⏳ **Pendente**: Testar extração completa

---

**Status**: 🔍 **DIAGNÓSTICO EM ANDAMENTO**  
**Próximo**: Investigar função `cnpj-api` e suas variáveis de ambiente