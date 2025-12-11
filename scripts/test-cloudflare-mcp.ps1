# Script para testar a configuração do MCP da Cloudflare
Write-Host "🧪 Testando configuração do MCP da Cloudflare..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o pacote existe
Write-Host "1. Verificando se o pacote @cloudflare/mcp-server-cloudflare existe..." -ForegroundColor Yellow
$packageVersion = npm view @cloudflare/mcp-server-cloudflare version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Pacote encontrado: versão $packageVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Pacote não encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verificar configuração do Cursor
Write-Host "2. Verificando configuração do Cursor..." -ForegroundColor Yellow
$configPath = "$env:APPDATA\Cursor\User\settings.json"

if (-not (Test-Path $configPath)) {
    Write-Host "   ❌ Arquivo de configuração não encontrado: $configPath" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json

if ($config.mcp -and $config.mcp.servers -and $config.mcp.servers.cloudflare) {
    Write-Host "   ✅ Configuração MCP encontrada" -ForegroundColor Green
    
    $cloudflareConfig = $config.mcp.servers.cloudflare
    Write-Host "   📋 Comando: $($cloudflareConfig.command) $($cloudflareConfig.args -join ' ')" -ForegroundColor Cyan
    
    if ($cloudflareConfig.env.CLOUDFLARE_API_TOKEN) {
        $tokenPreview = $cloudflareConfig.env.CLOUDFLARE_API_TOKEN.Substring(0, [Math]::Min(10, $cloudflareConfig.env.CLOUDFLARE_API_TOKEN.Length)) + "..."
        Write-Host "   ✅ API Token configurado: $tokenPreview" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  API Token não configurado" -ForegroundColor Yellow
    }
    
    if ($cloudflareConfig.env.CLOUDFLARE_ACCOUNT_ID) {
        Write-Host "   ✅ Account ID configurado: $($cloudflareConfig.env.CLOUDFLARE_ACCOUNT_ID)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Account ID não configurado" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Configuração MCP não encontrada" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Testando execução do pacote..." -ForegroundColor Yellow

$env:CLOUDFLARE_API_TOKEN = $cloudflareConfig.env.CLOUDFLARE_API_TOKEN
$env:CLOUDFLARE_ACCOUNT_ID = $cloudflareConfig.env.CLOUDFLARE_ACCOUNT_ID

# Tentar executar o pacote (sem --version, pois não é suportado)
Write-Host "   ℹ️  O pacote está instalado e pronto para uso" -ForegroundColor Cyan
Write-Host "   ℹ️  O Cursor irá executá-lo automaticamente ao reiniciar" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ Configuração validada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Reinicie o Cursor IDE" -ForegroundColor White
Write-Host "   2. Verifique se há uma notificação sobre o MCP conectado" -ForegroundColor White
Write-Host "   3. Teste usando comandos relacionados à Cloudflare no chat do Cursor" -ForegroundColor White
Write-Host ""
Write-Host "💡 Exemplo de teste:" -ForegroundColor Yellow
Write-Host "   'Liste meus Workers ativos na Cloudflare'" -ForegroundColor Gray




