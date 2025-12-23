#!/usr/bin/env bash

# Script de Instalação e Execução dos Testes CNPJ

echo "🚀 Instalando dependências para os testes CNPJ..."

# Verificar se o node-fetch está instalado
if ! node -e "require('node-fetch')" 2>/dev/null; then
    echo "📦 Instalando node-fetch..."
    npm install node-fetch@2
fi

echo "✅ Dependências instaladas!"

echo ""
echo "📋 Configurações atuais:"
echo "   API_BASE_URL: ${API_BASE_URL:-http://localhost:54321/functions/v1/cnpj-api}"
echo "   SUPABASE_URL: ${SUPABASE_URL:-http://localhost:54321}"
echo "   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:-[configurado]}"
echo ""

echo "🔧 Para configurar variáveis de ambiente, crie um arquivo .env:"
echo "   echo 'API_BASE_URL=http://localhost:54321/functions/v1/cnpj-api' > .env"
echo "   echo 'SUPABASE_URL=http://localhost:54321' >> .env"
echo "   echo 'SUPABASE_ANON_KEY=seu_token_aqui' >> .env"
echo ""

echo "🏃 Executando testes..."
node test-cnpj-filters.js