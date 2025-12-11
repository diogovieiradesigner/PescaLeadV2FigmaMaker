# Script para monitorar mudanças e validar automaticamente
# Uso: .\scripts\watch-and-validate.ps1

Write-Host "👀 Monitorando mudanças e validando automaticamente..." -ForegroundColor Cyan

# Instalar chokidar-cli se não estiver instalado
if (-not (Get-Command chokidar -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando chokidar-cli..." -ForegroundColor Yellow
    npm install -g chokidar-cli
}

# Monitorar mudanças em src/ e rodar validação
chokidar "src/**/*.tsx" "src/**/*.ts" -c "npm run validate"

