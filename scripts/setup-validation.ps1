# Script de setup para validação
# Uso: .\scripts\setup-validation.ps1

Write-Host "🚀 Configurando ambiente de validação..." -ForegroundColor Cyan

# 1. Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
npm install

# 2. Instalar browsers do Playwright
Write-Host "🌐 Instalando browsers do Playwright..." -ForegroundColor Yellow
npx playwright install --with-deps chromium

# 3. Criar diretórios necessários
Write-Host "📁 Criando diretórios..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "test-results\visual" | Out-Null
New-Item -ItemType Directory -Force -Path "playwright-report" | Out-Null

Write-Host "✅ Setup concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. npm run dev (em outro terminal)" -ForegroundColor White
Write-Host "  2. npm run test:visual (para validar visualmente)" -ForegroundColor White
Write-Host "  3. npm run test:debug (para debug interativo)" -ForegroundColor White

