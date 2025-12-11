# Script PowerShell para validar mudanças no frontend
# Uso: .\scripts\validate-changes.ps1

Write-Host "🔍 Validando mudanças no frontend..." -ForegroundColor Cyan

# 1. Verificar se o servidor está rodando
$serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $serverRunning) {
    Write-Host "⚠️ Servidor não está rodando. Iniciando..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
    Start-Sleep -Seconds 10
}

# 2. Rodar testes visuais
Write-Host "📸 Capturando screenshots..." -ForegroundColor Cyan
npm run test:visual

# 3. Rodar testes do Kanban
Write-Host "🎯 Testando Kanban..." -ForegroundColor Cyan
npm run test:kanban

# 4. Abrir relatório
Write-Host "📊 Abrindo relatório..." -ForegroundColor Cyan
npm run test:report

Write-Host "✅ Validação concluída!" -ForegroundColor Green

