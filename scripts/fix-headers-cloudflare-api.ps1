# Script para criar Worker via API do Cloudflare que corrige headers
# Este script usa a API do Cloudflare diretamente

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiToken,
    
    [Parameter(Mandatory=$true)]
    [string]$AccountId,
    
    [Parameter(Mandatory=$false)]
    [string]$ZoneId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$WorkerName = "fix-headers-pages"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Criando Worker para corrigir headers..." -ForegroundColor Cyan

# Código do Worker
$workerCode = @'
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
'@

# Headers para API
$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

# 1. Criar/Atualizar Worker
Write-Host "📦 Criando/Atualizando Worker: $WorkerName..." -ForegroundColor Yellow

$workerBody = @{
    main = $workerCode
    compatibility_date = "2024-01-01"
} | ConvertTo-Json

try {
    $workerResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/workers/scripts/$WorkerName" `
        -Method Put `
        -Headers $headers `
        -Body $workerBody
    
    Write-Host "✅ Worker criado/atualizado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao criar Worker: $_" -ForegroundColor Red
    exit 1
}

# 2. Se ZoneId foi fornecido, criar rota
if ($ZoneId) {
    Write-Host "🔗 Criando rota para hub.pescalead.com.br/assets/*..." -ForegroundColor Yellow
    
    $routeBody = @{
        pattern = "hub.pescalead.com.br/assets/*"
        script = $WorkerName
    } | ConvertTo-Json
    
    try {
        $routeResponse = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$ZoneId/workers/routes" `
            -Method Post `
            -Headers $headers `
            -Body $routeBody
        
        Write-Host "✅ Rota criada com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Aviso: Não foi possível criar rota automaticamente. Crie manualmente no dashboard:" -ForegroundColor Yellow
        Write-Host "   Route: hub.pescalead.com.br/assets/*" -ForegroundColor White
        Write-Host "   Worker: $WorkerName" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  ZoneId não fornecido. Crie a rota manualmente no dashboard:" -ForegroundColor Yellow
    Write-Host "   Route: hub.pescalead.com.br/assets/*" -ForegroundColor White
    Write-Host "   Worker: $WorkerName" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Concluído! O Worker foi criado e deve corrigir os headers automaticamente." -ForegroundColor Green
Write-Host "⏳ Aguarde 1-2 minutos para as mudanças serem aplicadas." -ForegroundColor Cyan

