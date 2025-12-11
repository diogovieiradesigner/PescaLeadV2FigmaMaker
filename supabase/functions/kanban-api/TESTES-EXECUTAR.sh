#!/bin/bash
# =============================================================================
# TESTES COMPLETOS - Kanban API
# =============================================================================

BASE_URL="https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api"
WORKSPACE_ID="81fb73c0-a368-4d73-9384-4af5f2e6a2ed"
FUNNEL_ID="3657418b-d030-48d2-ba1b-87793dcd1d16"
COLUMN_ID="dae0e522-248e-4528-a458-8941c310158b"
LEAD_ID="9a6a2a86-c9cc-4b4b-80bf-b2e58291015f"

# ⚠️ IMPORTANTE: Substituir pelo token real do usuário
TOKEN="SEU_TOKEN_AQUI"

echo "🧪 TESTES KANBAN API"
echo "===================="
echo ""

# =============================================================================
# TESTE 1: Health Check
# =============================================================================
echo "✅ TESTE 1: Health Check"
echo "GET $BASE_URL/health"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo "✅ Status: OK ($http_code)"
  echo "Response: $body"
else
  echo "❌ Status: ERRO ($http_code)"
  echo "Response: $body"
fi
echo ""

# =============================================================================
# TESTE 2: Autenticação (sem token)
# =============================================================================
echo "✅ TESTE 2: Autenticação (sem token)"
echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/workspaces/$WORKSPACE_ID/funnels")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
  echo "✅ Status: 401 Unauthorized (esperado)"
else
  echo "❌ Status: $http_code (deveria ser 401)"
fi
echo ""

# =============================================================================
# TESTE 3: Buscar Funis (com token)
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 3: Buscar Funis"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels"
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

# =============================================================================
# TESTE 4: Buscar Funil Específico
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 4: Buscar Funil Específico"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID"
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

# =============================================================================
# TESTE 5: Buscar Colunas
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 5: Buscar Colunas"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns"
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

# =============================================================================
# TESTE 6: Leads Iniciais (Todas as Colunas)
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 6: Leads Iniciais (Todas as Colunas)"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads"
  start_time=$(date +%s%N)
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads")
  end_time=$(date +%s%N)
  duration=$((($end_time - $start_time) / 1000000))
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "⏱️  Tempo: ${duration}ms"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
    
    # Verificar estrutura
    if echo "$body" | jq -e '.columns' > /dev/null 2>&1; then
      echo "✅ Estrutura: OK (tem 'columns')"
    else
      echo "❌ Estrutura: ERRO (falta 'columns')"
    fi
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

# =============================================================================
# TESTE 7: Leads de uma Coluna (Paginação)
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 7: Leads de uma Coluna (Paginação)"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?limit=10&offset=0"
  start_time=$(date +%s%N)
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?limit=10&offset=0")
  end_time=$(date +%s%N)
  duration=$((($end_time - $start_time) / 1000000))
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "⏱️  Tempo: ${duration}ms"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
    
    # Verificar estrutura
    if echo "$body" | jq -e '.leads' > /dev/null 2>&1; then
      leads_count=$(echo "$body" | jq '.leads | length')
      total=$(echo "$body" | jq '.total')
      has_more=$(echo "$body" | jq '.hasMore')
      echo "✅ Leads retornados: $leads_count"
      echo "✅ Total: $total"
      echo "✅ Has More: $has_more"
    else
      echo "❌ Estrutura: ERRO (falta 'leads')"
    fi
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

# =============================================================================
# TESTE 8: Filtro "Tem WhatsApp"
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 8: Filtro 'Tem WhatsApp'"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?hasWhatsapp=true&limit=10&offset=0"
  start_time=$(date +%s%N)
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?hasWhatsapp=true&limit=10&offset=0")
  end_time=$(date +%s%N)
  duration=$((($end_time - $start_time) / 1000000))
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "⏱️  Tempo: ${duration}ms"
    total=$(echo "$body" | jq '.total')
    leads_count=$(echo "$body" | jq '.leads | length')
    echo "✅ Total com WhatsApp: $total"
    echo "✅ Leads retornados: $leads_count"
    
    # Verificar se todos têm WhatsApp
    all_have_whatsapp=$(echo "$body" | jq '[.leads[] | .whatsapp_valid] | all')
    if [ "$all_have_whatsapp" = "true" ]; then
      echo "✅ Validação: Todos os leads têm WhatsApp"
    else
      echo "⚠️  Validação: Alguns leads podem não ter WhatsApp"
    fi
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

# =============================================================================
# TESTE 9: Filtro "Tem E-mail"
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 9: Filtro 'Tem E-mail'"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?hasEmail=true&limit=10&offset=0"
  start_time=$(date +%s%N)
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/columns/$COLUMN_ID/leads?hasEmail=true&limit=10&offset=0")
  end_time=$(date +%s%N)
  duration=$((($end_time - $start_time) / 1000000))
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "⏱️  Tempo: ${duration}ms"
    total=$(echo "$body" | jq '.total')
    leads_count=$(echo "$body" | jq '.leads | length')
    echo "✅ Total com E-mail: $total"
    echo "✅ Leads retornados: $leads_count"
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

# =============================================================================
# TESTE 10: Buscar Lead Específico
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 10: Buscar Lead Específico"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID"
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/leads/$LEAD_ID")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
  elif [ "$http_code" = "404" ]; then
    echo "⚠️  Status: 404 (Lead não encontrado - pode ser de outro workspace)"
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

# =============================================================================
# TESTE 11: Estatísticas
# =============================================================================
if [ "$TOKEN" != "SEU_TOKEN_AQUI" ]; then
  echo "✅ TESTE 11: Estatísticas"
  echo "GET $BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/stats"
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/workspaces/$WORKSPACE_ID/funnels/$FUNNEL_ID/stats")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    echo "✅ Status: OK ($http_code)"
    echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo "❌ Status: ERRO ($http_code)"
    echo "Response: $body"
  fi
  echo ""
fi

echo "===================="
echo "✅ TESTES CONCLUÍDOS"
echo "===================="

