#!/bin/bash
# ============================================================================
# VERIFICAR ENVIRONMENT VARIABLES - Edge Functions Container
# ============================================================================
# Execute via SSH no servidor
# Data: 2026-01-05
# ============================================================================

echo "════════════════════════════════════════════════════════════════════════"
echo "🔍 VERIFICANDO EDGE FUNCTIONS - ENVIRONMENT VARIABLES"
echo "════════════════════════════════════════════════════════════════════════"
echo ""

# ----------------------------------------------------------------------------
# 1. VERIFICAR VARIÁVEIS CRÍTICAS DO SUPABASE
# ----------------------------------------------------------------------------

echo "─────────────────────────────────────────────────────────────────────────"
echo "📋 1. Variáveis Críticas do Supabase"
echo "─────────────────────────────────────────────────────────────────────────"

docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w env | grep -E "^SUPABASE" | sort

echo ""
echo "✅ Esperado:"
echo "   SUPABASE_URL=https://supabase.pescalead.com.br"
echo "   SUPABASE_ANON_KEY=eyJhbGci..."
echo "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci..."
echo ""

# ----------------------------------------------------------------------------
# 2. VERIFICAR JWT SECRET
# ----------------------------------------------------------------------------

echo "─────────────────────────────────────────────────────────────────────────"
echo "📋 2. JWT Secret"
echo "─────────────────────────────────────────────────────────────────────────"

docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w env | grep JWT_SECRET

echo ""
echo "✅ Esperado:"
echo "   JWT_SECRET=3xf3ra98ruVlI0XZlWUWdBReNNljS3gs"
echo ""

# ----------------------------------------------------------------------------
# 3. VERIFICAR TODAS AS ENV VARS
# ----------------------------------------------------------------------------

echo "─────────────────────────────────────────────────────────────────────────"
echo "📋 3. TODAS as Environment Variables (primeiras 30)"
echo "─────────────────────────────────────────────────────────────────────────"

docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w env | head -30

# ----------------------------------------------------------------------------
# 4. TESTAR EDGE FUNCTION DIRETO (BYPASS KONG)
# ----------------------------------------------------------------------------

echo ""
echo "─────────────────────────────────────────────────────────────────────────"
echo "📋 4. Teste Direto - kanban-api/health (bypass Kong)"
echo "─────────────────────────────────────────────────────────────────────────"

RESULT=$(docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w \
  curl -s http://localhost:9999/kanban-api/health)

echo "$RESULT"
echo ""

if echo "$RESULT" | grep -q '"status":"ok"'; then
  echo "✅ Edge Function FUNCIONANDO - Problema é no Kong"
  echo "   Solução: Aplicar kong-custom.yml"
else
  echo "❌ Edge Function COM ERRO - Problema é nas env vars ou código"
  echo "   Solução: Adicionar variáveis faltantes"
fi

# ----------------------------------------------------------------------------
# 5. VERIFICAR LOGS DA EDGE FUNCTION
# ----------------------------------------------------------------------------

echo ""
echo "─────────────────────────────────────────────────────────────────────────"
echo "📋 5. Logs da Edge Function (últimas 20 linhas)"
echo "─────────────────────────────────────────────────────────────────────────"

docker logs 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w --tail 20

# ----------------------------------------------------------------------------
# 6. COMPARAR COM .env DO SERVIÇO
# ----------------------------------------------------------------------------

echo ""
echo "─────────────────────────────────────────────────────────────────────────"
echo "📋 6. Variáveis no .env do serviço Coolify"
echo "─────────────────────────────────────────────────────────────────────────"

cd /data/coolify/services/e400cgo4408ockg8oco4sk8w
cat .env | grep -E "^SUPABASE|^JWT_SECRET|^ANON_KEY|^SERVICE_ROLE" | head -10

echo ""
echo "════════════════════════════════════════════════════════════════════════"
echo "✅ DIAGNÓSTICO COMPLETO"
echo "════════════════════════════════════════════════════════════════════════"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo ""
echo "   Se teste direto FUNCIONOU (status: ok):"
echo "   → Problema é Kong bloqueando"
echo "   → Aplicar: kong-custom.yml"
echo "   → Arquivo: KONG_CONFIG.yml"
echo ""
echo "   Se teste direto FALHOU (erro 500):"
echo "   → Problema é variáveis de ambiente faltando"
echo "   → Adicionar ao .env:"
echo "     SUPABASE_URL=https://supabase.pescalead.com.br"
echo "     SUPABASE_ANON_KEY=eyJhbGci..."
echo "     SUPABASE_SERVICE_ROLE_KEY=eyJhbGci..."
echo "   → Reiniciar: docker restart 41abcf296a3e..."
echo ""
