# Configuração do Widget Proxy

Este documento explica como configurar o proxy do widget para ocultar a URL do Supabase.

## Problema

O código de embed do widget expunha a URL do Supabase diretamente:
```html
<script src="https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/widget-chat?slug=xxx"></script>
```

## Solução

Criamos um Cloudflare Worker que atua como proxy, substituindo a URL para:
```html
<script src="https://widget.pescalead.com.br/api/chat?slug=xxx"></script>
```

## Arquitetura

```
[Cliente] → [widget.pescalead.com.br] → [Cloudflare Worker] → [Supabase Edge Function]
```

## Passos para Configuração

### 1. Configurar DNS no Cloudflare

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecione o domínio `pescalead.com.br`
3. Vá em **DNS** > **Records**
4. Adicione um registro CNAME:
   - **Tipo**: CNAME
   - **Nome**: widget
   - **Alvo**: Para Workers, use o ID do worker (será configurado automaticamente)
   - **Proxy**: Habilitado (nuvem laranja)

### 2. Fazer Deploy do Worker

No terminal, navegue até o diretório do worker:

```bash
cd cloudflare-workers/widget-proxy
```

Instale as dependências (se necessário):
```bash
npm install wrangler -g
```

Configure o secret do Supabase Anon Key:
```bash
wrangler secret put SUPABASE_ANON_KEY
# Cole a chave quando solicitado:
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Faça o deploy do worker:
```bash
wrangler deploy
```

### 3. Configurar a Rota do Worker

Após o deploy, configure a rota no Cloudflare Dashboard:

1. Vá em **Workers & Pages** > **widget-proxy**
2. Clique em **Settings** > **Triggers**
3. Em **Routes**, adicione:
   - **Route**: `widget.pescalead.com.br/*`
   - **Zone**: `pescalead.com.br`

### 4. Verificar a Configuração

Teste a URL do widget:

```bash
# Testar o script do widget
curl -I "https://widget.pescalead.com.br/api/chat?slug=teste-slug"

# Deve retornar:
# Content-Type: text/javascript; charset=utf-8
```

## Variáveis de Ambiente (Opcional)

Se quiser usar uma URL diferente para desenvolvimento, configure:

```env
VITE_WIDGET_URL=https://widget.pescalead.com.br
```

## Estrutura do Proxy

O worker está localizado em:
```
cloudflare-workers/
└── widget-proxy/
    ├── index.ts       # Código do worker
    └── wrangler.toml  # Configuração do Wrangler
```

### Endpoints Suportados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/chat?slug=xxx` | Retorna o script do widget |
| POST | `/api/chat` | Processa mensagens do chat |
| OPTIONS | `/api/chat` | CORS preflight |

## Vantagens da Solução

1. **Segurança**: A URL do Supabase não é exposta ao cliente
2. **Branding**: URL personalizada com domínio próprio
3. **Flexibilidade**: Pode adicionar caching, rate limiting, etc.
4. **Monitoramento**: Logs centralizados no Cloudflare

## Troubleshooting

### Worker não responde
- Verifique se a rota está configurada corretamente
- Verifique os logs em **Workers & Pages** > **widget-proxy** > **Logs**

### CORS errors
- O worker já inclui headers CORS
- Verifique se o domínio está na lista de origens permitidas

### 500 Internal Server Error
- Verifique se o SUPABASE_ANON_KEY está configurado como secret
- Verifique os logs do worker para mais detalhes

## Alternativa: Usar a MCP do Cloudflare

Você também pode configurar o worker usando a MCP do Cloudflare diretamente no Claude Code:

```
# Criar o worker
mcp__cloudflare__worker_put com nome "widget-proxy" e o script

# Criar a rota
mcp__cloudflare__route_create para "widget.pescalead.com.br/*"
```
