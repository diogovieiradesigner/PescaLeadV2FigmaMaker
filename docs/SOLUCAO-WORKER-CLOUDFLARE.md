# Solução: Criar Cloudflare Worker para Corrigir Headers

## 🎯 Problema

O arquivo `_headers` não está sendo aplicado no domínio customizado `hub.pescalead.com.br`, causando CSS ser servido com MIME type `text/javascript`.

## ✅ Solução: Cloudflare Worker

Criar um Worker que intercepta requisições e corrige os headers automaticamente.

### Passo 1: Criar o Worker no Dashboard

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages**
3. Clique em **Create** > **Worker**
4. Dê um nome: `fix-headers-pages`
5. Cole o código abaixo:

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

6. Clique em **Save and deploy**

### Passo 2: Configurar Route no Worker

1. No Worker criado, vá em **Settings** > **Triggers**
2. Clique em **Add route**
3. Configure:
   - **Route**: `hub.pescalead.com.br/assets/*`
   - **Zone**: `pescalead.com.br`
4. Clique em **Add route**

### Passo 3: Verificar Funcionamento

Aguarde 1-2 minutos e teste:
- O CSS deve ser servido com `Content-Type: text/css`
- O JavaScript deve ser servido com `Content-Type: text/javascript`

## 🔧 Alternativa: Usar Transform Rules (Mais Simples)

Se não conseguir criar Worker, tente Transform Rules:

1. Cloudflare Dashboard > Selecione `pescalead.com.br`
2. Vá em **Rules** > **Transform Rules** > **Modify Response Header**
3. Clique em **Create rule**
4. Configure:
   - **Rule name**: `Fix CSS Content-Type`
   - **When incoming requests match**: `hostname equals hub.pescalead.com.br AND URI path starts with /assets/ and ends with .css`
   - **Then**: Set static `Content-Type` header to `text/css`
5. Salve e teste

## 📝 Nota

Esta solução funciona independentemente do arquivo `_headers` e aplica os headers corretos diretamente no nível do Cloudflare CDN.

