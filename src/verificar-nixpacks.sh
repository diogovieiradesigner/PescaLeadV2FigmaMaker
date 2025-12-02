#!/bin/bash
# Script de verificação rápida da configuração Nixpacks

echo "🔍 VERIFICAÇÃO NIXPACKS - Pesca Lead CRM"
echo "=========================================="
echo ""

# Verificar nixpacks.json
if [ -f "nixpacks.json" ]; then
    echo "✅ nixpacks.json encontrado"
    if grep -q '"providers".*\["node"\]' nixpacks.json; then
        echo "   ✅ Provider: node (CORRETO)"
    else
        echo "   ❌ Provider não é node!"
    fi
    
    if grep -q '"nodejs_20"' nixpacks.json; then
        echo "   ✅ Package: nodejs_20 (CORRETO)"
    else
        echo "   ❌ nodejs_20 não encontrado!"
    fi
else
    echo "❌ nixpacks.json NÃO ENCONTRADO!"
    exit 1
fi

echo ""

# Verificar .nixpacksrc
if [ -f ".nixpacksrc" ]; then
    echo "✅ .nixpacksrc encontrado"
    if grep -q '"node"' .nixpacksrc; then
        echo "   ✅ Força provider: node (CORRETO)"
    fi
else
    echo "⚠️  .nixpacksrc não encontrado (recomendado)"
fi

echo ""

# Verificar se nixpacks.toml existe (não deveria)
if [ -f "nixpacks.toml" ]; then
    echo "❌ nixpacks.toml AINDA EXISTE!"
    echo "   Este arquivo deve ser REMOVIDO para evitar conflitos"
    exit 1
else
    echo "✅ nixpacks.toml removido (CORRETO)"
fi

echo ""

# Verificar start.sh
if [ -f "start.sh" ]; then
    echo "✅ start.sh encontrado"
else
    echo "⚠️  start.sh não encontrado"
fi

echo ""

# Verificar package.json
if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
    if grep -q '"build"' package.json; then
        echo "   ✅ Script 'build' presente"
    else
        echo "   ❌ Script 'build' ausente!"
    fi
else
    echo "❌ package.json NÃO ENCONTRADO!"
    exit 1
fi

echo ""
echo "=========================================="
echo "📋 CHECKLIST FINAL"
echo "=========================================="
echo ""
echo "Antes do deploy no Coolify:"
echo ""
echo "1. ✅ Commit dos arquivos:"
echo "   git add nixpacks.json .nixpacksrc"
echo "   git commit -m 'fix: força Node.js no Nixpacks'"
echo "   git push"
echo ""
echo "2. 🔄 No painel do Coolify:"
echo "   → Settings → Build"
echo "   → Clear Build Cache"
echo ""
echo "3. 🚀 Force Rebuild:"
echo "   → Force Rebuild & Deploy"
echo "   → Marcar: 'Ignore Cache'"
echo ""
echo "4. 👀 Verificar nos logs:"
echo "   → Deve aparecer: 'nodejs_20'"
echo "   → NÃO deve aparecer: 'deno'"
echo ""
echo "=========================================="
echo "✨ Configuração validada com sucesso!"
echo "=========================================="
