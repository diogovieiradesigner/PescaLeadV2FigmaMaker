# Instruções: Usar MCP do Cloudflare para Corrigir Headers

## 🎯 Objetivo

Criar um Worker via MCP do Cloudflare que corrige os headers MIME type para arquivos CSS e JS no domínio customizado.

## 📋 Passo a Passo

### 1. Verificar Workers Existentes

Use a ferramenta MCP `worker_list` para ver se já existe algum worker:

```
worker_list
```

### 2. Criar/Atualizar Worker

Use a ferramenta `worker_put` para criar ou atualizar o worker:

**Nome do Worker**: `fix-headers-pages`

**Código do Worker** (use o conteúdo de `fix-headers-worker.js`):

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Interceptar requisições para assets
    if (url.pathname.startsWith('/assets/')) {
      // Fazer a requisição original
      const response = await fetch(request);
      
      // Criar novos headers
      const newHeaders = new Headers(response.headers);
      
      // Corrigir Content-Type baseado na extensão
      if (url.pathname.endsWith('.css')) {
        newHeaders.set('Content-Type', 'text/css');
      } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs')) {
        newHeaders.set('Content-Type', 'text/javascript');
        newHeaders.set('X-Content-Type-Options', 'nosniff');
      }
      
      // Retornar resposta com headers corrigidos
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
    
    // Para outras requisições, apenas passar adiante
    return fetch(request);
  },
};
```

**Parâmetros para `worker_put`**:
- `name`: `fix-headers-pages`
- `code`: (código acima)
- `compatibility_date`: `2024-01-01`

### 3. Fazer Deploy do Worker

Use `worker_deploy` para fazer deploy:

**Parâmetros**:
- `name`: `fix-headers-pages`

### 4. Criar Rota para o Domínio Customizado

Use `route_create` para criar uma rota:

**Parâmetros**:
- `pattern`: `hub.pescalead.com.br/assets/*`
- `script`: `fix-headers-pages`
- `zone`: `pescalead.com.br` (ou zone_id se necessário)

## 🔄 Alternativa: Usar Script PowerShell

Se preferir usar a API diretamente, execute:

```powershell
.\scripts\fix-headers-cloudflare-api.ps1 `
    -ApiToken "seu-api-token" `
    -AccountId "seu-account-id" `
    -ZoneId "seu-zone-id" `
    -WorkerName "fix-headers-pages"
```

## ✅ Verificação

Após criar o Worker e a rota:

1. Aguarde 1-2 minutos
2. Teste acessando: `https://hub.pescalead.com.br/assets/index-C7bKrOXl.css`
3. Verifique os headers com:
   ```bash
   curl -I https://hub.pescalead.com.br/assets/index-C7bKrOXl.css
   ```
4. Deve retornar: `Content-Type: text/css`

## 📝 Notas

- O Worker intercepta apenas requisições para `/assets/*`
- CSS recebe `Content-Type: text/css`
- JS recebe `Content-Type: text/javascript`
- Outras requisições passam direto sem modificação

