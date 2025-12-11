# =============================================================================
# TESTES COMPLETOS - Kanban API (PowerShell)
# =============================================================================
# Script para testar todos os endpoints da nova kanban-api
# =============================================================================

# Configurações
$SUPABASE_URL = if ($env:SUPABASE_URL) { $env:SUPABASE_URL } else { "https://nlbcwaxkeaddfocigwuk.supabase.co" }
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/kanban-api"

# Variáveis de teste (preencher com valores reais)
$WORKSPACE_ID = if ($env:WORKSPACE_ID) { $env:WORKSPACE_ID } else { "" }
$USER_TOKEN = if ($env:USER_TOKEN) { $env:USER_TOKEN } else { "" }
$FUNNEL_ID = if ($env:FUNNEL_ID) { $env:FUNNEL_ID } else { "" }
$COLUMN_ID = if ($env:COLUMN_ID) { $env:COLUMN_ID } else { "" }
$LEAD_ID = if ($env:LEAD_ID) { $env:LEAD_ID } else { "" }

# Contador de testes
$script:TESTS_PASSED = 0
$script:TESTS_FAILED = 0
$script:TOTAL_TESTS = 0

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

function Print-Test {
    param([string]$message)
    Write-Host "[TESTE] $message" -ForegroundColor Blue
    $script:TOTAL_TESTS++
}

function Print-Success {
    param([string]$message)
    Write-Host "[✅ PASSOU] $message" -ForegroundColor Green
    $script:TESTS_PASSED++
}

function Print-Error {
    param([string]$message)
    Write-Host "[❌ FALHOU] $message" -ForegroundColor Red
    $script:TESTS_FAILED++
}

function Print-Warning {
    param([string]$message)
    Write-Host "[⚠️  AVISO] $message" -ForegroundColor Yellow
}

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Data = $null,
        [int]$ExpectedStatus,
        [string]$Description
    )
    
    Print-Test $Description
    
    if ([string]::IsNullOrEmpty($USER_TOKEN)) {
        Print-Warning "USER_TOKEN não definido. Pulando teste."
        return $false
    }
    
    $headers = @{
        "Authorization" = "Bearer $USER_TOKEN"
        "Content-Type" = "application/json"
    }
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "$FUNCTION_URL$Endpoint" -Method Get -Headers $headers -ErrorAction Stop
            $statusCode = 200
        }
        elseif ($Method -eq "POST") {
            $response = Invoke-RestMethod -Uri "$FUNCTION_URL$Endpoint" -Method Post -Headers $headers -Body $Data -ErrorAction Stop
            $statusCode = 200
        }
        elseif ($Method -eq "PUT") {
            $response = Invoke-RestMethod -Uri "$FUNCTION_URL$Endpoint" -Method Put -Headers $headers -Body $Data -ErrorAction Stop
            $statusCode = 200
        }
        elseif ($Method -eq "DELETE") {
            $response = Invoke-RestMethod -Uri "$FUNCTION_URL$Endpoint" -Method Delete -Headers $headers -ErrorAction Stop
            $statusCode = 200
        }
        
        if ($statusCode -eq $ExpectedStatus) {
            Print-Success "$Description (HTTP $statusCode)"
            $responseJson = $response | ConvertTo-Json -Depth 5
            Write-Host "Response: $($responseJson.Substring(0, [Math]::Min(200, $responseJson.Length)))"
            return $true
        }
        else {
            Print-Error "$Description (Esperado: HTTP $ExpectedStatus, Recebido: HTTP $statusCode)"
            return $false
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Print-Success "$Description (HTTP $statusCode - Erro esperado)"
            return $true
        }
        else {
            Print-Error "$Description (Esperado: HTTP $ExpectedStatus, Recebido: HTTP $statusCode)"
            Write-Host "Error: $($_.Exception.Message)"
            return $false
        }
    }
}

# =============================================================================
# VALIDAÇÃO DE VARIÁVEIS
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "TESTES COMPLETOS - Kanban API" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($WORKSPACE_ID)) {
    Print-Warning "WORKSPACE_ID não definido. Alguns testes serão pulados."
    Write-Host "Defina: `$env:WORKSPACE_ID='seu-workspace-id'"
}

if ([string]::IsNullOrEmpty($USER_TOKEN)) {
    Print-Warning "USER_TOKEN não definido. Todos os testes serão pulados."
    Write-Host "Defina: `$env:USER_TOKEN='seu-token-jwt'"
    exit 1
}

Write-Host "Configurações:"
Write-Host "  SUPABASE_URL: $SUPABASE_URL"
Write-Host "  FUNCTION_URL: $FUNCTION_URL"
Write-Host "  WORKSPACE_ID: $(if ([string]::IsNullOrEmpty($WORKSPACE_ID)) { 'NÃO DEFINIDO' } else { $WORKSPACE_ID })"
Write-Host ""

# =============================================================================
# TESTES DE LEITURA (GET)
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "1. TESTES DE LEITURA (GET)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1.1. GET /workspaces/:workspaceId/funnels
Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels" -ExpectedStatus 200 -Description "Listar todos os funis"

# 1.2. GET /workspaces/:workspaceId/funnels/:funnelId
if (-not [string]::IsNullOrEmpty($FUNNEL_ID)) {
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID" -ExpectedStatus 200 -Description "Buscar funil específico"
    
    # 1.3. GET /workspaces/:workspaceId/funnels/:funnelId/columns
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns" -ExpectedStatus 200 -Description "Listar colunas do funil"
    
    # 1.4. GET /workspaces/:workspaceId/funnels/:funnelId/leads
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads" -ExpectedStatus 200 -Description "Buscar leads iniciais do funil"
    
    # 1.5. GET /workspaces/:workspaceId/funnels/:funnelId/stats
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/stats" -ExpectedStatus 200 -Description "Buscar estatísticas do funil"
    
    # 1.6. GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads
    if (-not [string]::IsNullOrEmpty($COLUMN_ID)) {
        Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads" -ExpectedStatus 200 -Description "Buscar leads de uma coluna"
        
        # 1.7. GET /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
        if (-not [string]::IsNullOrEmpty($LEAD_ID)) {
            Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID" -ExpectedStatus 200 -Description "Buscar lead específico"
        }
    }
}
else {
    Print-Warning "FUNNEL_ID não definido. Pulando testes que requerem funil."
}

Write-Host ""

# =============================================================================
# TESTES DE CRIAÇÃO (POST)
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "2. TESTES DE CRIAÇÃO (POST)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# 2.1. POST /workspaces/:workspaceId/funnels
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$funnelData = @{
    name = "Teste Kanban $timestamp"
    description = "Kanban criado para testes"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Endpoint "/workspaces/$WORKSPACE_ID/funnels" -Data $funnelData -ExpectedStatus 200 -Description "Criar novo funil"

# 2.2. POST /workspaces/:workspaceId/funnels/:funnelId/leads
if (-not [string]::IsNullOrEmpty($FUNNEL_ID) -and -not [string]::IsNullOrEmpty($COLUMN_ID)) {
    $leadData = @{
        clientName = "Lead de Teste"
        column_id = $COLUMN_ID
        company = "Empresa Teste"
        dealValue = 1000
        priority = "medium"
    } | ConvertTo-Json
    
    Test-Endpoint -Method "POST" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads" -Data $leadData -ExpectedStatus 200 -Description "Criar novo lead"
}
else {
    Print-Warning "FUNNEL_ID ou COLUMN_ID não definido. Pulando teste de criar lead."
}

Write-Host ""

# =============================================================================
# TESTES DE ATUALIZAÇÃO (PUT)
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "3. TESTES DE ATUALIZAÇÃO (PUT)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# 3.1. PUT /workspaces/:workspaceId/funnels/:funnelId
if (-not [string]::IsNullOrEmpty($FUNNEL_ID)) {
    $timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    $updateFunnelData = @{
        name = "Kanban Atualizado $timestamp"
    } | ConvertTo-Json
    
    Test-Endpoint -Method "PUT" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID" -Data $updateFunnelData -ExpectedStatus 200 -Description "Atualizar funil"
    
    # 3.2. PUT /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
    if (-not [string]::IsNullOrEmpty($LEAD_ID)) {
        $updateLeadData = @{
            clientName = "Lead Atualizado"
            dealValue = 2000
            priority = "high"
        } | ConvertTo-Json
        
        Test-Endpoint -Method "PUT" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID" -Data $updateLeadData -ExpectedStatus 200 -Description "Atualizar lead"
    }
    else {
        Print-Warning "LEAD_ID não definido. Pulando teste de atualizar lead."
    }
}
else {
    Print-Warning "FUNNEL_ID não definido. Pulando testes de atualização."
}

Write-Host ""

# =============================================================================
# TESTES DE MOVIMENTAÇÃO (POST MOVE)
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "4. TESTES DE MOVIMENTAÇÃO (POST MOVE)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# 4.1. POST /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move
if (-not [string]::IsNullOrEmpty($FUNNEL_ID) -and -not [string]::IsNullOrEmpty($LEAD_ID) -and -not [string]::IsNullOrEmpty($COLUMN_ID)) {
    $moveData = @{
        toColumnId = $COLUMN_ID
        toPosition = 0
    } | ConvertTo-Json
    
    Test-Endpoint -Method "POST" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID/move" -Data $moveData -ExpectedStatus 200 -Description "Mover lead entre colunas"
}
else {
    Print-Warning "FUNNEL_ID, LEAD_ID ou COLUMN_ID não definido. Pulando teste de mover lead."
}

# 4.2. POST /workspaces/:workspaceId/funnels/:funnelId/leads/batch-move
if (-not [string]::IsNullOrEmpty($FUNNEL_ID) -and -not [string]::IsNullOrEmpty($LEAD_ID) -and -not [string]::IsNullOrEmpty($COLUMN_ID)) {
    $batchMoveData = @{
        moves = @(
            @{
                leadId = $LEAD_ID
                toColumnId = $COLUMN_ID
                toPosition = 1
            }
        )
    } | ConvertTo-Json -Depth 3
    
    Test-Endpoint -Method "POST" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/batch-move" -Data $batchMoveData -ExpectedStatus 200 -Description "Mover múltiplos leads"
}
else {
    Print-Warning "FUNNEL_ID, LEAD_ID ou COLUMN_ID não definido. Pulando teste de batch-move."
}

Write-Host ""

# =============================================================================
# TESTES DE ESTATÍSTICAS (POST RECALCULATE)
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "5. TESTES DE ESTATÍSTICAS (POST RECALCULATE)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# 5.1. POST /workspaces/:workspaceId/funnels/:funnelId/stats/recalculate
if (-not [string]::IsNullOrEmpty($FUNNEL_ID)) {
    Test-Endpoint -Method "POST" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/stats/recalculate" -Data "{}" -ExpectedStatus 200 -Description "Recalcular estatísticas do funil"
}
else {
    Print-Warning "FUNNEL_ID não definido. Pulando teste de recalcular stats."
}

Write-Host ""

# =============================================================================
# TESTES DE FILTROS
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "6. TESTES DE FILTROS" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not [string]::IsNullOrEmpty($FUNNEL_ID) -and -not [string]::IsNullOrEmpty($COLUMN_ID)) {
    # 6.1. Filtro hasEmail
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?hasEmail=true" -ExpectedStatus 200 -Description "Filtrar leads com e-mail"
    
    # 6.2. Filtro hasWhatsapp
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?hasWhatsapp=true" -ExpectedStatus 200 -Description "Filtrar leads com WhatsApp"
    
    # 6.3. Filtro searchQuery
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?searchQuery=teste" -ExpectedStatus 200 -Description "Buscar leads por texto"
    
    # 6.4. Filtro priority
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?priority=high" -ExpectedStatus 200 -Description "Filtrar leads por prioridade"
    
    # 6.5. Paginação
    Test-Endpoint -Method "GET" -Endpoint "/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?limit=5&offset=0" -ExpectedStatus 200 -Description "Paginar leads (limit=5, offset=0)"
}
else {
    Print-Warning "FUNNEL_ID ou COLUMN_ID não definido. Pulando testes de filtros."
}

Write-Host ""

# =============================================================================
# RESUMO FINAL
# =============================================================================

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total de testes: $script:TOTAL_TESTS"
Write-Host "Testes passados: $script:TESTS_PASSED" -ForegroundColor Green
Write-Host "Testes falhados: $script:TESTS_FAILED" -ForegroundColor Red
Write-Host ""

if ($script:TESTS_FAILED -eq 0) {
    Write-Host "✅ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "❌ ALGUNS TESTES FALHARAM" -ForegroundColor Red
    exit 1
}

