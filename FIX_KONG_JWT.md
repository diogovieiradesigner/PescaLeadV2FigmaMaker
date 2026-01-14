# 🔧 Solução: Kong Rejeitando Chamadas às Edge Functions

**Data:** 2026-01-05
**Problema:** Kong está retornando `401 Unauthorized` para todas as chamadas às Edge Functions, mesmo com `apikey` header correto

---

## 🔍 Diagnóstico

O Kong do Supabase Self-Hosted está configurado para validar JWT em **TODAS** as requisições às Edge Functions, incluindo endpoints públicos como `/health`. Isso impede que o frontend faça chamadas às funções.

### Evidências:
- ✅ Frontend inclui header `apikey: <ANON_KEY>`
- ✅ Frontend inclui header `Authorization: Bearer <access_token>`
- ❌ Kong retorna `401 Unauthorized` antes mesmo de chegar nas Edge Functions
- ❌ Até `/health` (endpoint público) é bloqueado

---

## ✅ Solução 1: Desabilitar JWT Validation no Kong (RECOMENDADO)

### Passo 1: Conectar ao servidor via Termius/SSH

```bash
ssh usuario@ip-do-servidor
```

### Passo 2: Verificar configuração do Kong

```bash
# Ver env vars do Kong
docker exec -i kong-e400cgo4408ockg8oco4sk8w env | grep -E "JWT|ANON|AUTH"

# Ver configuração completa
cat /data/coolify/services/e400cgo4408ockg8oco4sk8w/.env | grep -E "KONG|JWT|ANON"
```

### Passo 3: Localizar plugin de JWT

O Supabase usa um plugin de JWT no Kong que valida tokens. Existem duas formas de resolver:

#### Opção A: Desabilitar JWT globalmente (mais fácil)

```bash
# Editar docker-compose do Supabase
cd /data/coolify/services/e400cgo4408ockg8oco4sk8w

# Backup do .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Adicionar variável para desabilitar JWT
echo "KONG_PLUGINS=bundled,cors" >> .env

# Reiniciar Kong
docker restart kong-e400cgo4408ockg8oco4sk8w

# Verificar logs
docker logs kong-e400cgo4408ockg8oco4sk8w --tail 50
```

#### Opção B: Configurar whitelist de rotas públicas

Se você quer manter JWT ativo mas permitir algumas rotas públicas:

```bash
# Editar configuração do Kong
cd /data/coolify/services/e400cgo4408ockg8oco4sk8w

# Criar arquivo de configuração customizado
cat > kong-custom.yml <<'EOF'
_format_version: "2.1"

services:
  - name: edge-functions
    url: http://supabase-edge-functions:9999
    routes:
      - name: health-route
        paths:
          - ~/functions/v1/.*/health$
        strip_path: false
        plugins:
          - name: request-transformer
            config:
              remove:
                headers:
                  - Authorization
      - name: functions-route
        paths:
          - /functions/v1
        strip_path: false
EOF

# Aplicar configuração
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong config db_import /path/to/kong-custom.yml

# Reload Kong
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong reload
```

---

## ✅ Solução 2: Criar Endpoint Proxy no Backend

Se você não tem acesso SSH ao servidor ou prefere não mexer no Kong, crie um proxy no seu backend:

### Criar Edge Function proxy (no Supabase)

```typescript
// supabase/functions/proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req: Request) => {
  const url = new URL(req.url)
  const targetPath = url.searchParams.get('path')

  if (!targetPath) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Forward para outra Edge Function
  const targetUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1${targetPath}`

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: req.headers,
    body: req.body
  })

  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  })
})
```

Depois, no frontend, ao invés de chamar diretamente `/functions/v1/kanban-api/...`, chame:
```typescript
const response = await supabase.functions.invoke('proxy', {
  body: { path: '/kanban-api/workspaces/123/funnels' }
})
```

---

## ✅ Solução 3: Usar Supabase Client (TEMPORÁRIA)

Enquanto o Kong não é corrigido, use o método oficial do Supabase:

```typescript
// Ao invés de fetch direto
const response = await fetch(`${url}/functions/v1/kanban-api/...`, { ... })

// Use supabase.functions.invoke
const { data, error } = await supabase.functions.invoke('kanban-api', {
  body: {
    action: 'getLeads',
    workspaceId,
    funnelId,
    filters
  }
})
```

**Vantagem:** `supabase.functions.invoke` automaticamente injeta os headers corretos
**Desvantagem:** Precisa refatorar as Edge Functions para aceitar body ao invés de path params

---

## 📝 Verificação Após Correção

Depois de aplicar qualquer solução acima, teste novamente:

```bash
cd "c:\Users\Asus\Pictures\PESCA LEAD\pescalead_usuario"
node test-edge-function.mjs
```

**Resultado esperado:**
```
✅ Health check passou! Edge Function está respondendo.
Status: 200 OK
Resposta JSON: {
  "status": "ok",
  "service": "kanban-api",
  "version": "2.0.0"
}
```

---

## 🎯 Recomendação Final

Para resolver **AGORA** sem acesso ao servidor:
1. Use **Solução 3** (supabase.functions.invoke) temporariamente
2. Agende acesso SSH para aplicar **Solução 1 - Opção A** (mais definitiva)

Para resolver **HOJE** com acesso ao servidor:
1. Aplicar **Solução 1 - Opção A** (desabilitar JWT globalmente)
2. Se precisar manter segurança JWT, aplicar **Solução 1 - Opção B** (whitelist)

---

**Última atualização:** 2026-01-05 13:16 (horário de Brasília)
