# Configuração do MCP da Cloudflare

## Instruções Rápidas

### Opção 1: Script Automatizado (Recomendado)

Execute o script PowerShell:

```powershell
.\scripts\configurar-mcp-cloudflare.ps1
```

O script irá:
- Localizar o arquivo de configuração do Cursor
- Solicitar suas credenciais da Cloudflare
- Adicionar a configuração MCP automaticamente
- Criar um backup do arquivo original

### Opção 2: Configuração Manual

1. Abra o arquivo de configuração do Cursor:
   - **Windows**: `%APPDATA%\Cursor\User\settings.json`
   - **macOS**: `~/Library/Application Support/Cursor/User/settings.json`
   - **Linux**: `~/.config/Cursor/User/settings.json`

2. Adicione a seguinte configuração:

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
          "CLOUDFLARE_API_TOKEN": "seu-token-aqui",
          "CLOUDFLARE_ACCOUNT_ID": "seu-account-id-aqui"
        }
      }
    }
  }
}
```

## Obter Credenciais

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

## Verificar Instalação

Após configurar:

1. Reinicie o Cursor IDE
2. Verifique se o MCP está conectado (geralmente aparece uma notificação)
3. Teste usando comandos MCP no Cursor

## Troubleshooting

### MCP não conecta

- Verifique se o token está correto
- Verifique se o comando/path está correto
- Verifique os logs do Cursor (View > Output > MCP)

### Comando não encontrado

```bash
npm install -g @cloudflare/mcp-server
```

Ou ajuste o path no `settings.json` para apontar para o pacote local.

## Recursos

- [Documentação MCP da Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/)
- [Workshop Learn MCP](https://developers.cloudflare.com/labs/mcp/)

