#!/bin/bash
# Pre-Deploy Check - Pesca Lead CRM
# Verifica se tudo está pronto antes do deploy

set -e

echo "╔════════════════════════════════════════════╗"
echo "║   PRE-DEPLOY CHECK - Pesca Lead CRM        ║"
echo "╚════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
error() {
    echo -e "${RED}❌ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "🔍 Verificando arquivos obrigatórios..."
echo ""

# 1. Verificar nixpacks.json
if [ -f "nixpacks.json" ]; then
    success "nixpacks.json encontrado"
    
    # Verificar provider
    if grep -q '"providers".*\["node"\]' nixpacks.json; then
        success "  → Provider: node ✓"
    else
        error "  → Provider não é 'node'!"
    fi
    
    # Verificar nodejs_20
    if grep -q '"nodejs_20"' nixpacks.json; then
        success "  → Package: nodejs_20 ✓"
    else
        error "  → nodejs_20 não encontrado!"
    fi
    
    # Verificar comandos
    if grep -q '"npm ci --legacy-peer-deps"' nixpacks.json; then
        success "  → Install command: npm ci --legacy-peer-deps ✓"
    else
        warning "  → Install command diferente do esperado"
    fi
    
    if grep -q '"npm run build"' nixpacks.json; then
        success "  → Build command: npm run build ✓"
    else
        error "  → Build command não encontrado!"
    fi
else
    error "nixpacks.json NÃO ENCONTRADO!"
    error "Este arquivo é OBRIGATÓRIO!"
fi

echo ""

# 2. Verificar .nixpacksrc
if [ -f ".nixpacksrc" ]; then
    success ".nixpacksrc encontrado"
    if grep -q '"node"' .nixpacksrc; then
        success "  → Provider: node ✓"
    fi
else
    warning ".nixpacksrc não encontrado (recomendado mas não obrigatório)"
fi

echo ""

# 3. Verificar que nixpacks.toml NÃO existe
if [ -f "nixpacks.toml" ]; then
    error "nixpacks.toml AINDA EXISTE!"
    error "Este arquivo DEVE ser removido!"
    info "Execute: rm nixpacks.toml"
else
    success "nixpacks.toml removido (correto!)"
fi

echo ""

# 4. Verificar package.json
if [ -f "package.json" ]; then
    success "package.json encontrado"
    
    if grep -q '"build"' package.json; then
        success "  → Script 'build' presente ✓"
    else
        error "  → Script 'build' ausente!"
    fi
    
    if grep -q '"vite build"' package.json; then
        success "  → Build usa Vite ✓"
    fi
else
    error "package.json NÃO ENCONTRADO!"
fi

echo ""

# 5. Verificar outros arquivos
if [ -f "start.sh" ]; then
    success "start.sh encontrado"
else
    warning "start.sh não encontrado"
fi

if [ -f ".dockerignore" ]; then
    success ".dockerignore encontrado"
else
    warning ".dockerignore não encontrado (recomendado)"
fi

if [ -f "coolify.yaml" ]; then
    success "coolify.yaml encontrado"
    if grep -q "method: nixpacks" coolify.yaml; then
        success "  → Build method: nixpacks ✓"
    fi
    if grep -q "port: 3000" coolify.yaml; then
        success "  → Port: 3000 ✓"
    fi
else
    warning "coolify.yaml não encontrado"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "🔍 Verificando Git status..."
echo "═══════════════════════════════════════════"
echo ""

# 6. Verificar Git
if command -v git &> /dev/null; then
    if git rev-parse --git-dir > /dev/null 2>&1; then
        success "Repositório Git inicializado"
        
        # Verificar arquivos não commitados
        if [[ -n $(git status -s) ]]; then
            warning "Existem arquivos não commitados:"
            git status -s | while read line; do
                echo "    $line"
            done
            echo ""
            info "Execute: git add . && git commit -m 'fix: Nixpacks config' && git push"
        else
            success "Todos os arquivos commitados ✓"
        fi
        
        # Verificar se nixpacks.json está no último commit
        if git ls-tree -r HEAD --name-only | grep -q "nixpacks.json"; then
            success "nixpacks.json commitado ✓"
        else
            error "nixpacks.json NÃO está commitado!"
            info "Execute: git add nixpacks.json && git commit -m 'fix: add nixpacks.json'"
        fi
    else
        warning "Não é um repositório Git"
    fi
else
    warning "Git não instalado"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "📊 RESULTADO DA VERIFICAÇÃO"
echo "═══════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "Tudo certo! Pronto para deploy! 🎉"
    echo ""
    echo "═══════════════════════════════════════════"
    echo "🚀 PRÓXIMOS PASSOS:"
    echo "═══════════════════════════════════════════"
    echo ""
    echo "1. Commit (se ainda não fez):"
    echo "   git add ."
    echo "   git commit -m 'fix: força Node.js no Nixpacks'"
    echo "   git push"
    echo ""
    echo "2. No Coolify:"
    echo "   → Settings → Build → Clear Build Cache"
    echo "   → Settings → Danger Zone → Remove All Build Containers"
    echo ""
    echo "3. Deploy:"
    echo "   → Force Rebuild & Deploy"
    echo "   → Marcar: 'Ignore Cache'"
    echo ""
    echo "4. Verificar logs:"
    echo "   → Deve aparecer: 'nodejs_20'"
    echo "   → NÃO deve aparecer: 'deno'"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    warning "Verificação concluída com $WARNINGS avisos"
    echo ""
    info "Pode prosseguir com o deploy, mas recomenda-se corrigir os avisos"
    echo ""
    exit 0
else
    error "Verificação FALHOU com $ERRORS erros e $WARNINGS avisos"
    echo ""
    error "CORRIJA OS ERROS antes de fazer deploy!"
    echo ""
    echo "═══════════════════════════════════════════"
    echo "🔧 AÇÕES CORRETIVAS:"
    echo "═══════════════════════════════════════════"
    echo ""
    if [ ! -f "nixpacks.json" ]; then
        echo "• Arquivo nixpacks.json ausente:"
        echo "  Verifique se foi criado e está na raiz do projeto"
        echo ""
    fi
    if [ -f "nixpacks.toml" ]; then
        echo "• Remover nixpacks.toml:"
        echo "  rm nixpacks.toml"
        echo "  git add nixpacks.toml"
        echo "  git commit -m 'chore: remove nixpacks.toml'"
        echo ""
    fi
    echo "Depois de corrigir, execute este script novamente."
    echo ""
    exit 1
fi
