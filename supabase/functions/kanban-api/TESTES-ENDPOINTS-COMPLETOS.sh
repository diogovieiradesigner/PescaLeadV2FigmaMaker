#!/bin/bash

# =============================================================================
# TESTES COMPLETOS - Kanban API
# =============================================================================
# Script para testar todos os endpoints da nova kanban-api
# =============================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
SUPABASE_URL="${SUPABASE_URL:-https://nlbcwaxkeaddfocigwuk.supabase.co}"
FUNCTION_URL="${FUNCTION_URL:-${SUPABASE_URL}/functions/v1/kanban-api}"

# Variáveis de teste (preencher com valores reais)
WORKSPACE_ID="${WORKSPACE_ID:-}"
USER_TOKEN="${USER_TOKEN:-}"
FUNNEL_ID="${FUNNEL_ID:-}"
COLUMN_ID="${COLUMN_ID:-}"
LEAD_ID="${LEAD_ID:-}"

# Contador de testes
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

print_test() {
    echo -e "${BLUE}[TESTE]${NC} $1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_success() {
    echo -e "${GREEN}[✅ PASSOU]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_error() {
    echo -e "${RED}[❌ FALHOU]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_warning() {
    echo -e "${YELLOW}[⚠️  AVISO]${NC} $1"
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    print_test "$description"
    
    if [ -z "$USER_TOKEN" ]; then
        print_warning "USER_TOKEN não definido. Pulando teste."
        return 1
    fi
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET \
            -H "Authorization: Bearer $USER_TOKEN" \
            -H "Content-Type: application/json" \
            "${FUNCTION_URL}${endpoint}")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Authorization: Bearer $USER_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${FUNCTION_URL}${endpoint}")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT \
            -H "Authorization: Bearer $USER_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${FUNCTION_URL}${endpoint}")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE \
            -H "Authorization: Bearer $USER_TOKEN" \
            -H "Content-Type: application/json" \
            "${FUNCTION_URL}${endpoint}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        print_success "$description (HTTP $http_code)"
        echo "Response: $body" | head -c 200
        echo ""
        return 0
    else
        print_error "$description (Esperado: HTTP $expected_status, Recebido: HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# =============================================================================
# VALIDAÇÃO DE VARIÁVEIS
# =============================================================================

echo "============================================================================="
echo "TESTES COMPLETOS - Kanban API"
echo "============================================================================="
echo ""

if [ -z "$WORKSPACE_ID" ]; then
    print_warning "WORKSPACE_ID não definido. Alguns testes serão pulados."
    echo "Exporte: export WORKSPACE_ID='seu-workspace-id'"
fi

if [ -z "$USER_TOKEN" ]; then
    print_warning "USER_TOKEN não definido. Todos os testes serão pulados."
    echo "Exporte: export USER_TOKEN='seu-token-jwt'"
    exit 1
fi

echo "Configurações:"
echo "  SUPABASE_URL: $SUPABASE_URL"
echo "  FUNCTION_URL: $FUNCTION_URL"
echo "  WORKSPACE_ID: ${WORKSPACE_ID:-NÃO DEFINIDO}"
echo ""

# =============================================================================
# TESTES DE LEITURA (GET)
# =============================================================================

echo "============================================================================="
echo "1. TESTES DE LEITURA (GET)"
echo "============================================================================="
echo ""

# 1.1. GET /workspaces/:workspaceId/funnels
test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels" "" "200" "Listar todos os funis"

# 1.2. GET /workspaces/:workspaceId/funnels/:funnelId
if [ -n "$FUNNEL_ID" ]; then
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}" "" "200" "Buscar funil específico"
    
    # 1.3. GET /workspaces/:workspaceId/funnels/:funnelId/columns
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/columns" "" "200" "Listar colunas do funil"
    
    # 1.4. GET /workspaces/:workspaceId/funnels/:funnelId/leads
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads" "" "200" "Buscar leads iniciais do funil"
    
    # 1.5. GET /workspaces/:workspaceId/funnels/:funnelId/stats
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/stats" "" "200" "Buscar estatísticas do funil"
    
    # 1.6. GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads
    if [ -n "$COLUMN_ID" ]; then
        test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/columns/${COLUMN_ID}/leads" "" "200" "Buscar leads de uma coluna"
        
        # 1.7. GET /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
        if [ -n "$LEAD_ID" ]; then
            test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads/${LEAD_ID}" "" "200" "Buscar lead específico"
        fi
    fi
else
    print_warning "FUNNEL_ID não definido. Pulando testes que requerem funil."
fi

echo ""

# =============================================================================
# TESTES DE CRIAÇÃO (POST)
# =============================================================================

echo "============================================================================="
echo "2. TESTES DE CRIAÇÃO (POST)"
echo "============================================================================="
echo ""

# 2.1. POST /workspaces/:workspaceId/funnels
FUNNEL_DATA='{"name":"Teste Kanban '$(date +%s)'","description":"Kanban criado para testes"}'
test_endpoint "POST" "/workspaces/${WORKSPACE_ID}/funnels" "$FUNNEL_DATA" "200" "Criar novo funil"

# Extrair FUNNEL_ID da resposta se não foi definido
if [ -z "$FUNNEL_ID" ]; then
    print_warning "FUNNEL_ID não foi extraído automaticamente. Defina manualmente para continuar os testes."
fi

# 2.2. POST /workspaces/:workspaceId/funnels/:funnelId/leads
if [ -n "$FUNNEL_ID" ] && [ -n "$COLUMN_ID" ]; then
    LEAD_DATA='{"clientName":"Lead de Teste","column_id":"'$COLUMN_ID'","company":"Empresa Teste","dealValue":1000,"priority":"medium"}'
    test_endpoint "POST" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads" "$LEAD_DATA" "200" "Criar novo lead"
else
    print_warning "FUNNEL_ID ou COLUMN_ID não definido. Pulando teste de criar lead."
fi

echo ""

# =============================================================================
# TESTES DE ATUALIZAÇÃO (PUT)
# =============================================================================

echo "============================================================================="
echo "3. TESTES DE ATUALIZAÇÃO (PUT)"
echo "============================================================================="
echo ""

# 3.1. PUT /workspaces/:workspaceId/funnels/:funnelId
if [ -n "$FUNNEL_ID" ]; then
    UPDATE_FUNNEL_DATA='{"name":"Kanban Atualizado '$(date +%s)'"}'
    test_endpoint "PUT" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}" "$UPDATE_FUNNEL_DATA" "200" "Atualizar funil"
    
    # 3.2. PUT /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
    if [ -n "$LEAD_ID" ]; then
        UPDATE_LEAD_DATA='{"clientName":"Lead Atualizado","dealValue":2000,"priority":"high"}'
        test_endpoint "PUT" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads/${LEAD_ID}" "$UPDATE_LEAD_DATA" "200" "Atualizar lead"
    else
        print_warning "LEAD_ID não definido. Pulando teste de atualizar lead."
    fi
else
    print_warning "FUNNEL_ID não definido. Pulando testes de atualização."
fi

echo ""

# =============================================================================
# TESTES DE MOVIMENTAÇÃO (POST MOVE)
# =============================================================================

echo "============================================================================="
echo "4. TESTES DE MOVIMENTAÇÃO (POST MOVE)"
echo "============================================================================="
echo ""

# 4.1. POST /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move
if [ -n "$FUNNEL_ID" ] && [ -n "$LEAD_ID" ] && [ -n "$COLUMN_ID" ]; then
    MOVE_DATA='{"toColumnId":"'$COLUMN_ID'","toPosition":0}'
    test_endpoint "POST" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads/${LEAD_ID}/move" "$MOVE_DATA" "200" "Mover lead entre colunas"
else
    print_warning "FUNNEL_ID, LEAD_ID ou COLUMN_ID não definido. Pulando teste de mover lead."
fi

# 4.2. POST /workspaces/:workspaceId/funnels/:funnelId/leads/batch-move
if [ -n "$FUNNEL_ID" ] && [ -n "$LEAD_ID" ] && [ -n "$COLUMN_ID" ]; then
    BATCH_MOVE_DATA='{"moves":[{"leadId":"'$LEAD_ID'","toColumnId":"'$COLUMN_ID'","toPosition":1}]}'
    test_endpoint "POST" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads/batch-move" "$BATCH_MOVE_DATA" "200" "Mover múltiplos leads"
else
    print_warning "FUNNEL_ID, LEAD_ID ou COLUMN_ID não definido. Pulando teste de batch-move."
fi

echo ""

# =============================================================================
# TESTES DE ESTATÍSTICAS (POST RECALCULATE)
# =============================================================================

echo "============================================================================="
echo "5. TESTES DE ESTATÍSTICAS (POST RECALCULATE)"
echo "============================================================================="
echo ""

# 5.1. POST /workspaces/:workspaceId/funnels/:funnelId/stats/recalculate
if [ -n "$FUNNEL_ID" ]; then
    test_endpoint "POST" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/stats/recalculate" "{}" "200" "Recalcular estatísticas do funil"
else
    print_warning "FUNNEL_ID não definido. Pulando teste de recalcular stats."
fi

echo ""

# =============================================================================
# TESTES DE DELEÇÃO (DELETE)
# =============================================================================

echo "============================================================================="
echo "6. TESTES DE DELEÇÃO (DELETE)"
echo "============================================================================="
echo ""

# 6.1. DELETE /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
if [ -n "$FUNNEL_ID" ] && [ -n "$LEAD_ID" ]; then
    print_warning "Teste de deletar lead será executado. O lead será deletado permanentemente!"
    read -p "Continuar? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        test_endpoint "DELETE" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads/${LEAD_ID}" "" "200" "Deletar lead (hard delete)"
    else
        print_warning "Teste de deletar lead cancelado pelo usuário."
    fi
else
    print_warning "FUNNEL_ID ou LEAD_ID não definido. Pulando teste de deletar lead."
fi

# 6.2. DELETE /workspaces/:workspaceId/funnels/:funnelId
if [ -n "$FUNNEL_ID" ]; then
    print_warning "Teste de deletar funil será executado. O funil será marcado como inativo!"
    read -p "Continuar? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        test_endpoint "DELETE" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}" "" "200" "Deletar funil (soft delete)"
    else
        print_warning "Teste de deletar funil cancelado pelo usuário."
    fi
else
    print_warning "FUNNEL_ID não definido. Pulando teste de deletar funil."
fi

echo ""

# =============================================================================
# TESTES DE FILTROS
# =============================================================================

echo "============================================================================="
echo "7. TESTES DE FILTROS"
echo "============================================================================="
echo ""

if [ -n "$FUNNEL_ID" ] && [ -n "$COLUMN_ID" ]; then
    # 7.1. Filtro hasEmail
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/columns/${COLUMN_ID}/leads?hasEmail=true" "" "200" "Filtrar leads com e-mail"
    
    # 7.2. Filtro hasWhatsapp
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/columns/${COLUMN_ID}/leads?hasWhatsapp=true" "" "200" "Filtrar leads com WhatsApp"
    
    # 7.3. Filtro searchQuery
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/columns/${COLUMN_ID}/leads?searchQuery=teste" "" "200" "Buscar leads por texto"
    
    # 7.4. Filtro priority
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/columns/${COLUMN_ID}/leads?priority=high" "" "200" "Filtrar leads por prioridade"
    
    # 7.5. Paginação
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/columns/${COLUMN_ID}/leads?limit=5&offset=0" "" "200" "Paginar leads (limit=5, offset=0)"
else
    print_warning "FUNNEL_ID ou COLUMN_ID não definido. Pulando testes de filtros."
fi

echo ""

# =============================================================================
# TESTES DE ERRO (VALIDAÇÃO)
# =============================================================================

echo "============================================================================="
echo "8. TESTES DE VALIDAÇÃO (ERROS ESPERADOS)"
echo "============================================================================="
echo ""

# 8.1. POST criar lead sem campos obrigatórios
if [ -n "$FUNNEL_ID" ]; then
    INVALID_LEAD_DATA='{"company":"Empresa Teste"}'
    test_endpoint "POST" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads" "$INVALID_LEAD_DATA" "400" "Criar lead sem campos obrigatórios (deve falhar)"
fi

# 8.2. GET funil inexistente
test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/00000000-0000-0000-0000-000000000000" "" "404" "Buscar funil inexistente (deve retornar 404)"

# 8.3. GET lead inexistente
if [ -n "$FUNNEL_ID" ]; then
    test_endpoint "GET" "/workspaces/${WORKSPACE_ID}/funnels/${FUNNEL_ID}/leads/00000000-0000-0000-0000-000000000000" "" "404" "Buscar lead inexistente (deve retornar 404)"
fi

echo ""

# =============================================================================
# RESUMO FINAL
# =============================================================================

echo "============================================================================="
echo "RESUMO DOS TESTES"
echo "============================================================================="
echo ""
echo "Total de testes: $TOTAL_TESTS"
echo -e "${GREEN}Testes passados: $TESTS_PASSED${NC}"
echo -e "${RED}Testes falhados: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ TODOS OS TESTES PASSARAM!${NC}"
    exit 0
else
    echo -e "${RED}❌ ALGUNS TESTES FALHARAM${NC}"
    exit 1
fi

