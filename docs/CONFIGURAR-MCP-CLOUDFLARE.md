# Configuração do MCP da Cloudflare no Cursor

Este guia explica como configurar o Model Context Protocol (MCP) da Cloudflare no Cursor IDE.

## Pré-requisitos

1. Conta na Cloudflare
2. API Token da Cloudflare (opcional, dependendo do uso)
3. Cursor IDE instalado

## Opção 1: Configuração via settings.json do Cursor

### Passo 1: Localizar o arquivo de configuração

O arquivo de configuração do Cursor está localizado em:
- **Windows**: `%APPDATA%\Cursor\User\settings.json`
- **macOS**: `~/Library/Application Support/Cursor/User/settings.json`
- **Linux**: `~/.config/Cursor/User/settings.json`

### Passo 2: Adicionar configuração MCP

Abra o arquivo `settings.json` e adicione a seguinte configuração:

```json
{
  "mcp": {
    "servers": {
      "cloudflare": {
        "command": "npx",
        "args": [
          "-y",
          "@cloudflare/mcp-server"
        ],
        "env": {
          "CLOUDFLARE_API_TOKEN": "seu-token-aqui"
        }
      }
    }
  }
}
```

**Nota**: Se o MCP da Cloudflare não estiver disponível como pacote npm, você precisará usar uma configuração diferente (veja Opção 2).

## Opção 2: Configuração Manual (se o pacote npm não existir)

Se o MCP da Cloudflare não estiver disponível como pacote npm, você pode configurá-lo manualmente:

### Passo 1: Instalar dependências

```bash
npm install -g @cloudflare/mcp-server
# ou
npm install @cloudflare/mcp-server --save-dev
```

### Passo 2: Configurar no settings.json

```json
{
  "mcp": {
    "servers": {
      "cloudflare": {
        "command": "node",
        "args": [
          "node_modules/@cloudflare/mcp-server/dist/index.js"
        ],
        "env": {
          "CLOUDFLARE_API_TOKEN": "seu-token-aqui",
          "CLOUDFLARE_ACCOUNT_ID": "seu-account-id-aqui"
        }
      }
    }
  }
}
```

## Opção 3: Usar servidor MCP remoto na Cloudflare Workers

Se você já tem um servidor MCP implantado na Cloudflare Workers:

```json
{
  "mcp": {
    "servers": {
      "cloudflare": {
        "url": "https://seu-worker.workers.dev",
        "headers": {
          "Authorization": "Bearer seu-token-aqui"
        }
      }
    }
  }
}
```

## Obter credenciais da Cloudflare

### API Token

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **My Profile** > **API Tokens**
3. Clique em **Create Token**
4. Selecione as permissões necessárias
5. Copie o token gerado

### Account ID

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecione seu domínio
3. O Account ID está visível no painel lateral direito

## Verificar configuração

Após adicionar a configuração:

1. Reinicie o Cursor IDE
2. Verifique se o MCP está conectado (geralmente aparece uma notificação)
3. Teste usando comandos MCP no Cursor

## Recursos úteis

- [Documentação MCP da Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/)
- [Workshop Learn MCP](https://developers.cloudflare.com/labs/mcp/)
- [SDK de Agentes da Cloudflare](https://developers.cloudflare.com/agents/)

## Troubleshooting

### MCP não conecta

1. Verifique se o token está correto
2. Verifique se o comando/path está correto
3. Verifique os logs do Cursor (View > Output > MCP)

### Erro de permissão

1. Verifique se o token tem as permissões necessárias
2. Verifique se o Account ID está correto

### Comando não encontrado

1. Verifique se o pacote está instalado globalmente ou localmente
2. Ajuste o path no `settings.json` conforme necessário

