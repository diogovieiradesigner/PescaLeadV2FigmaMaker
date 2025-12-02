#!/bin/bash

# ==========================================
# Script de Verificação Pré-Deploy
# Pesca Lead CRM
# ==========================================

echo "🔍 Verificando preparação para deploy..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
ERRORS=0
WARNINGS=0

# ==========================================
# 1. Verificar arquivos essenciais
# ==========================================
echo "📁 Verificando arquivos essenciais..."

FILES=(
  "package.json"
  "vite.config.ts"
  "tsconfig.json"
  "Dockerfile"
  "nginx.conf"
  ".dockerignore"
  ".gitignore"
  ".env.example"
  "index.html"
  "main.tsx"
  "App.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file encontrado"
  else
    echo -e "${RED}✗${NC} $file NÃO encontrado"
    ((ERRORS++))
  fi
done

echo ""

# ==========================================
# 2. Verificar estrutura de diretórios
# ==========================================
echo "📂 Verificando estrutura de diretórios..."

DIRS=(
  "components"
  "hooks"
  "services"
  "types"
  "utils"
  "styles"
  "contexts"
)

for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✓${NC} $dir/ encontrado"
  else
    echo -e "${RED}✗${NC} $dir/ NÃO encontrado"
    ((ERRORS++))
  fi
done

echo ""

# ==========================================
# 3. Verificar variáveis de ambiente
# ==========================================
echo "🔐 Verificando arquivo .env.example..."

if [ -f ".env.example" ]; then
  REQUIRED_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "EVOLUTION_API_URL"
    "GEMINI_API_KEY"
  )
  
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "$var" .env.example; then
      echo -e "${GREEN}✓${NC} $var definido"
    else
      echo -e "${YELLOW}⚠${NC} $var não encontrado em .env.example"
      ((WARNINGS++))
    fi
  done
else
  echo -e "${RED}✗${NC} .env.example não encontrado"
  ((ERRORS++))
fi

echo ""

# ==========================================
# 4. Verificar Dockerfile
# ==========================================
echo "🐳 Verificando Dockerfile..."

if [ -f "Dockerfile" ]; then
  if grep -q "node:20-alpine" Dockerfile; then
    echo -e "${GREEN}✓${NC} Base image Node 20 Alpine"
  else
    echo -e "${YELLOW}⚠${NC} Base image não é Node 20 Alpine"
    ((WARNINGS++))
  fi
  
  if grep -q "nginx:alpine" Dockerfile; then
    echo -e "${GREEN}✓${NC} Nginx Alpine para produção"
  else
    echo -e "${RED}✗${NC} Nginx não configurado"
    ((ERRORS++))
  fi
  
  if grep -q "EXPOSE 80" Dockerfile; then
    echo -e "${GREEN}✓${NC} Porta 80 exposta"
  else
    echo -e "${YELLOW}⚠${NC} Porta não exposta no Dockerfile"
    ((WARNINGS++))
  fi
else
  echo -e "${RED}✗${NC} Dockerfile não encontrado"
  ((ERRORS++))
fi

echo ""

# ==========================================
# 5. Verificar nginx.conf
# ==========================================
echo "🌐 Verificando nginx.conf..."

if [ -f "nginx.conf" ]; then
  if grep -q "try_files.*index.html" nginx.conf; then
    echo -e "${GREEN}✓${NC} SPA fallback configurado"
  else
    echo -e "${RED}✗${NC} SPA fallback NÃO configurado"
    ((ERRORS++))
  fi
  
  if grep -q "gzip on" nginx.conf; then
    echo -e "${GREEN}✓${NC} Compressão Gzip ativada"
  else
    echo -e "${YELLOW}⚠${NC} Gzip não configurado"
    ((WARNINGS++))
  fi
else
  echo -e "${RED}✗${NC} nginx.conf não encontrado"
  ((ERRORS++))
fi

echo ""

# ==========================================
# 6. Verificar Git
# ==========================================
echo "🔧 Verificando Git..."

if [ -d ".git" ]; then
  echo -e "${GREEN}✓${NC} Repositório Git inicializado"
  
  if git remote -v | grep -q "origin"; then
    REMOTE=$(git remote get-url origin)
    echo -e "${GREEN}✓${NC} Remote configurado: $REMOTE"
  else
    echo -e "${YELLOW}⚠${NC} Remote 'origin' não configurado"
    ((WARNINGS++))
  fi
  
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠${NC} Existem alterações não commitadas"
    ((WARNINGS++))
  else
    echo -e "${GREEN}✓${NC} Working directory limpo"
  fi
else
  echo -e "${RED}✗${NC} Repositório Git não inicializado"
  ((ERRORS++))
fi

echo ""

# ==========================================
# 7. Verificar tamanho dos arquivos
# ==========================================
echo "📊 Verificando tamanho do projeto..."

if command -v du &> /dev/null; then
  SIZE=$(du -sh . 2>/dev/null | cut -f1)
  echo -e "${GREEN}✓${NC} Tamanho total: $SIZE"
  
  if [ -d "node_modules" ]; then
    NODE_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo -e "${YELLOW}⚠${NC} node_modules: $NODE_SIZE (será ignorado no deploy)"
  fi
fi

echo ""

# ==========================================
# RESUMO
# ==========================================
echo "=========================================="
echo "📋 RESUMO DA VERIFICAÇÃO"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ TUDO OK! Projeto pronto para deploy${NC}"
  echo ""
  echo "Próximos passos:"
  echo "1. git add ."
  echo "2. git commit -m 'chore: preparar para deploy'"
  echo "3. git push origin main"
  echo "4. Configurar no Coolify"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS avisos encontrados${NC}"
  echo "O projeto pode ser deployado, mas revise os avisos acima."
  exit 0
else
  echo -e "${RED}❌ $ERRORS erros encontrados${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS avisos encontrados${NC}"
  fi
  echo ""
  echo "Corrija os erros antes de fazer o deploy!"
  exit 1
fi
