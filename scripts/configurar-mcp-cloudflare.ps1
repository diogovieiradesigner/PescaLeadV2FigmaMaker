# Script para configurar o MCP da Cloudflare no Cursor IDE
# Execute este script como administrador se necessário

Write-Host "🔧 Configurando MCP da Cloudflare no Cursor..." -ForegroundColor Cyan

# Localizar o arquivo de configuração do Cursor
$cursorConfigPath = "$env:APPDATA\Cursor\User\settings.json"

if (-not (Test-Path $cursorConfigPath)) {
    Write-Host "❌ Arquivo de configuração do Cursor não encontrado em: $cursorConfigPath" -ForegroundColor Red
    Write-Host "💡 Certifique-se de que o Cursor está instalado e já foi aberto pelo menos uma vez." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Arquivo de configuração encontrado: $cursorConfigPath" -ForegroundColor Green

# Ler o arquivo atual
try {
    $config = Get-Content $cursorConfigPath -Raw | ConvertFrom-Json
} catch {
    Write-Host "⚠️  Erro ao ler o arquivo de configuração. Criando novo arquivo..." -ForegroundColor Yellow
    $config = @{}
}

# Solicitar credenciais da Cloudflare
Write-Host "`n📝 Por favor, forneça suas credenciais da Cloudflare:" -ForegroundColor Cyan
$apiToken = Read-Host "API Token da Cloudflare (ou pressione Enter para pular)"
$accountId = Read-Host "Account ID da Cloudflare (ou pressione Enter para pular)"

# Criar estrutura MCP se não existir
if (-not $config.mcp) {
    $config | Add-Member -MemberType NoteProperty -Name "mcp" -Value @{}
}

if (-not $config.mcp.servers) {
    $config.mcp | Add-Member -MemberType NoteProperty -Name "servers" -Value @{}
}

# Configurar servidor Cloudflare
$cloudflareConfig = @{
    command = "npx"
    args = @(
        "-y",
        "@cloudflare/mcp-server"
    )
}

# Adicionar variáveis de ambiente se fornecidas
if ($apiToken -or $accountId) {
    $cloudflareConfig.env = @{}
    
    if ($apiToken) {
        $cloudflareConfig.env.CLOUDFLARE_API_TOKEN = $apiToken
    }
    
    if ($accountId) {
        $cloudflareConfig.env.CLOUDFLARE_ACCOUNT_ID = $accountId
    }
}

# Verificar se já existe configuração do Cloudflare
if ($config.mcp.servers.cloudflare) {
    Write-Host "⚠️  Configuração do Cloudflare MCP já existe. Deseja sobrescrever? (S/N)" -ForegroundColor Yellow
    $overwrite = Read-Host
    
    if ($overwrite -ne "S" -and $overwrite -ne "s") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit 0
    }
}

# Adicionar/atualizar configuração
$config.mcp.servers | Add-Member -MemberType NoteProperty -Name "cloudflare" -Value $cloudflareConfig -Force

# Fazer backup do arquivo original
$backupPath = "$cursorConfigPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $cursorConfigPath $backupPath
Write-Host "✅ Backup criado: $backupPath" -ForegroundColor Green

# Salvar configuração atualizada
try {
    $config | ConvertTo-Json -Depth 10 | Set-Content $cursorConfigPath -Encoding UTF8
    Write-Host "✅ Configuração do MCP da Cloudflare adicionada com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Reinicie o Cursor IDE" -ForegroundColor White
    Write-Host "   2. Verifique se o MCP está conectado (notificação no Cursor)" -ForegroundColor White
    Write-Host "   3. Se necessário, instale o pacote: npm install -g @cloudflare/mcp-server" -ForegroundColor White
} catch {
    Write-Host "❌ Erro ao salvar configuração: $_" -ForegroundColor Red
    Write-Host "💡 Restaurando backup..." -ForegroundColor Yellow
    Copy-Item $backupPath $cursorConfigPath -Force
    exit 1
}

Write-Host "`n✨ Configuração concluída!" -ForegroundColor Green

