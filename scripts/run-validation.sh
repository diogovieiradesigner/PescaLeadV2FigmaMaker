#!/bin/bash

# Script de execução dos testes de validação CNPJ
# Este script facilita a execução dos testes de validação prática

echo "🚀 INICIANDO VALIDAÇÃO PRÁTICA DO SISTEMA CNPJ"
echo "================================================"

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js antes de executar este script."
    exit 1
fi

# Verificar se o diretório scripts existe
if [ ! -d "$(dirname "$0")" ]; then
    echo "❌ Diretório scripts não encontrado."
    exit 1
fi

# Mudar para o diretório scripts
cd "$(dirname "$0")"

echo "📁 Diretório: $(pwd)"
echo "⏰ Início: $(date)"
echo ""

# Função para executar teste com tratamento de erro
run_test() {
    local test_name="$1"
    local test_file="$2"
    
    echo "🔍 Executando: $test_name"
    echo "   Arquivo: $test_file"
    
    if [ -f "$test_file" ]; then
        node "$test_file"
        local exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            echo "   ✅ $test_name: SUCESSO"
        else
            echo "   ❌ $test_name: FALHA (código: $exit_code)"
        fi
        
        echo ""
        return $exit_code
    else
        echo "   ⚠️  Arquivo não encontrado: $test_file"
        echo ""
        return 1
    fi
}

# Executar testes
total_tests=0
failed_tests=0

echo "📊 EXECUTANDO TESTES INDIVIDUAIS"
echo "--------------------------------"

# Teste 1: Validação Principal
total_tests=$((total_tests + 1))
if ! run_test "Validação Principal" "validate-cnpj-system.js"; then
    failed_tests=$((failed_tests + 1))
fi

# Teste 2: Testes Integrados
total_tests=$((total_tests + 1))
if ! run_test "Testes Integrados" "validate-cnpj-integrated.js"; then
    failed_tests=$((failed_tests + 1))
fi

# Teste 3: Ambiente Real
total_tests=$((total_tests + 1))
if ! run_test "Ambiente Real" "test-cnpj-real-environment.js"; then
    failed_tests=$((failed_tests + 1))
fi

# Resumo
echo "📈 RESUMO DA VALIDAÇÃO"
echo "======================"
echo "   Total de testes: $total_tests"
echo "   Testes falhados: $failed_tests"
echo "   Testes bem-sucedidos: $((total_tests - failed_tests))"

if [ $failed_tests -eq 0 ]; then
    echo "   ✅ Status: TODOS OS TESTES PASSARAM"
    exit_code=0
else
    echo "   ❌ Status: ALGUNS TESTES FALHARAM"
    exit_code=1
fi

echo ""
echo "📁 Relatórios gerados:"
for file in *.json; do
    if [ -f "$file" ]; then
        echo "   - $file"
    fi
done

echo ""
echo "⏰ Fim: $(date)"
echo "================================================"
echo "🎯 RECOMENDAÇÕES FINAIS"
echo "======================"

if [ $failed_tests -eq 0 ]; then
    echo "✅ Sistema CNPJ validado com sucesso!"
    echo "📝 Nenhum problema crítico identificado."
    echo "🔄 Recomenda-se executar esta validação periodicamente."
else
    echo "⚠️  Problemas identificados durante a validação:"
    echo "🔍 Revise os relatórios JSON gerados para detalhes."
    echo "🔧 Corrija os problemas antes de usar o sistema em produção."
    echo "📞 Caso necessário, consulte a equipe de desenvolvimento."
fi

echo ""
echo "📚 DOCUMENTAÇÃO"
echo "==============="
echo "📖 Consulte README-CNPJ-VALIDATION.md para detalhes sobre os testes."
echo "💡 Para executar testes individuais, use:"
echo "   node validate-cnpj-system.js"
echo "   node validate-cnpj-integrated.js"
echo "   node test-cnpj-real-environment.js"

exit $exit_code