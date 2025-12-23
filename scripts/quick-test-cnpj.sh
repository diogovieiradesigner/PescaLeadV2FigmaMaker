#!/bin/bash

# Script rápido de teste do sistema CNPJ
# Executa apenas os testes essenciais para uma validação rápida

echo "⚡ TESTE RÁPIDO DO SISTEMA CNPJ"
echo "=============================="
echo "⏰ Início: $(date)"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado"
    exit 1
fi

cd "$(dirname "$0")"

# Teste rápido: apenas validação principal
echo "🔍 Executando validação principal..."
if node validate-cnpj-system.js; then
    echo "✅ Validação principal: SUCESSO"
    exit_code=0
else
    echo "❌ Validação principal: FALHA"
    exit_code=1
fi

echo ""
echo "⏰ Fim: $(date)"
echo "=============================="

if [ $exit_code -eq 0 ]; then
    echo "✅ Sistema CNPJ: FUNCIONANDO CORRETAMENTE"
else
    echo "❌ Sistema CNPJ: PROBLEMAS DETECTADOS"
fi

exit $exit_code