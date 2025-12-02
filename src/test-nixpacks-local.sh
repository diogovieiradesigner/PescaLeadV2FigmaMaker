#!/bin/bash
# Script para testar a configuração do Nixpacks localmente

echo "🔍 Testando configuração Nixpacks..."
echo ""

# Verificar se o nixpacks.toml existe
if [ ! -f "nixpacks.toml" ]; then
    echo "❌ Erro: nixpacks.toml não encontrado"
    exit 1
fi

echo "✅ nixpacks.toml encontrado"
echo ""

# Exibir a configuração
echo "📋 Configuração atual:"
cat nixpacks.toml
echo ""

# Verificar se o start.sh existe
if [ ! -f "start.sh" ]; then
    echo "❌ Erro: start.sh não encontrado"
    exit 1
fi

echo "✅ start.sh encontrado"
echo ""

# Verificar se o package.json existe
if [ ! -f "package.json" ]; then
    echo "❌ Erro: package.json não encontrado"
    exit 1
fi

echo "✅ package.json encontrado"
echo ""

# Verificar script de build no package.json
if grep -q '"build"' package.json; then
    echo "✅ Script 'build' encontrado no package.json"
    echo "   $(grep '"build"' package.json | xargs)"
else
    echo "❌ Script 'build' não encontrado no package.json"
    exit 1
fi

echo ""

# Instruções finais
echo "🎯 Tudo pronto! Agora faça:"
echo ""
echo "1. Commit das alterações:"
echo "   git add ."
echo "   git commit -m 'fix: corrige npm not found no Nixpacks'"
echo "   git push"
echo ""
echo "2. No Coolify:"
echo "   - Vá em Settings → Build"
echo "   - Clique em 'Clear Build Cache'"
echo "   - Clique em 'Force Rebuild & Deploy'"
echo ""
echo "✨ A aplicação deve buildar com sucesso!"
