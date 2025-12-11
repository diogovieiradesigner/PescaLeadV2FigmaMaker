# Script simples para configurar MCP da Cloudflare no Cursor
$configPath = "$env:APPDATA\Cursor\User\settings.json"

if (-not (Test-Path $configPath)) {
    Write-Host "Arquivo de configuracao nao encontrado: $configPath" -ForegroundColor Red
    exit 1
}

# Fazer backup
$backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $configPath $backupPath
Write-Host "Backup criado: $backupPath" -ForegroundColor Green

# Ler config existente
$config = Get-Content $configPath -Raw | ConvertFrom-Json

# Criar estrutura MCP se nao existir
if (-not $config.mcp) {
    $config | Add-Member -MemberType NoteProperty -Name "mcp" -Value @{}
}

if (-not $config.mcp.servers) {
    if ($config.mcp) {
        $config.mcp | Add-Member -MemberType NoteProperty -Name "servers" -Value @{}
    } else {
        $servers = @{}
        $config | Add-Member -MemberType NoteProperty -Name "mcp" -Value @{ servers = $servers }
    }
}

# Configurar Cloudflare MCP
$cloudflareConfig = @{
    command = "npx"
    args = @(
        "-y",
        "@modelcontextprotocol/server-cloudflare"
    )
    env = @{
        CLOUDFLARE_API_TOKEN = ""
        CLOUDFLARE_ACCOUNT_ID = ""
    }
}

$config.mcp.servers | Add-Member -MemberType NoteProperty -Name "cloudflare" -Value $cloudflareConfig -Force

# Salvar
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8

Write-Host "Configuracao do MCP da Cloudflare adicionada!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE: Adicione suas credenciais no arquivo:" -ForegroundColor Yellow
Write-Host "  $configPath" -ForegroundColor White
Write-Host ""
Write-Host "1. Abra o arquivo de configuracao" -ForegroundColor Cyan
Write-Host "2. Adicione seu CLOUDFLARE_API_TOKEN" -ForegroundColor Cyan
Write-Host "3. Adicione seu CLOUDFLARE_ACCOUNT_ID (opcional)" -ForegroundColor Cyan
Write-Host "4. Reinicie o Cursor IDE" -ForegroundColor Cyan

