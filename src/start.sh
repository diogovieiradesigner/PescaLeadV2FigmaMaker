#!/bin/bash
set -e

# Garantir que o Node.js está no PATH
export PATH="/root/.nix-profile/bin:$PATH"

# Verificar se npm está disponível
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm não encontrado no PATH"
    echo "PATH atual: $PATH"
    exit 1
fi

# Verificar se node está disponível
if ! command -v node &> /dev/null; then
    echo "ERROR: node não encontrado no PATH"
    echo "PATH atual: $PATH"
    exit 1
fi

# Exibir versões
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Iniciar o servidor
exec npx serve dist -s -l 3000
