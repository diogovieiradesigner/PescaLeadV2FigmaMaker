#!/bin/bash

# ==========================================
# Script de Teste de Build Local
# Pesca Lead CRM
# ==========================================

set -e

echo "🧪 Testando build da aplicação..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==========================================
# 1. Verificar Node.js
# ==========================================
echo -e "${BLUE}1/5${NC} Verificando Node.js..."

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗${NC} Node.js não encontrado. Instale Node.js 20+"
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"
echo ""

# ==========================================
# 2. Instalar dependências
# ==========================================
echo -e "${BLUE}2/5${NC} Instalando dependências..."

if [ ! -d "node_modules" ]; then
  npm install
else
  echo -e "${YELLOW}⚠${NC} node_modules já existe, pulando instalação"
fi
echo ""

# ==========================================
# 3. Build da aplicação
# ==========================================
echo -e "${BLUE}3/5${NC} Fazendo build da aplicação..."

# Criar .env.local temporário para o build
if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}⚠${NC} Criando .env.local temporário para teste..."
  cat > .env.local << EOF
VITE_SUPABASE_URL=https://example.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test
EOF
fi

# Fazer o build
if npm run build; then
  echo -e "${GREEN}✓${NC} Build concluído com sucesso!"
else
  echo -e "${RED}✗${NC} Build falhou!"
  exit 1
fi
echo ""

# ==========================================
# 4. Verificar output
# ==========================================
echo -e "${BLUE}4/5${NC} Verificando output do build..."

if [ -d "dist" ]; then
  echo -e "${GREEN}✓${NC} Diretório dist/ criado"
  
  # Verificar index.html
  if [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✓${NC} index.html presente"
  else
    echo -e "${RED}✗${NC} index.html não encontrado!"
    exit 1
  fi
  
  # Verificar assets
  if [ -d "dist/assets" ]; then
    echo -e "${GREEN}✓${NC} Assets compilados"
    
    # Contar arquivos JS e CSS
    JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
    CSS_COUNT=$(find dist/assets -name "*.css" | wc -l)
    
    echo -e "${GREEN}✓${NC} $JS_COUNT arquivos JavaScript"
    echo -e "${GREEN}✓${NC} $CSS_COUNT arquivos CSS"
  else
    echo -e "${YELLOW}⚠${NC} Diretório assets não encontrado"
  fi
  
  # Tamanho do build
  if command -v du &> /dev/null; then
    BUILD_SIZE=$(du -sh dist | cut -f1)
    echo -e "${GREEN}✓${NC} Tamanho do build: $BUILD_SIZE"
  fi
else
  echo -e "${RED}✗${NC} Diretório dist/ não foi criado!"
  exit 1
fi
echo ""

# ==========================================
# 5. Build Docker (opcional)
# ==========================================
echo -e "${BLUE}5/5${NC} Testando build Docker..."

if command -v docker &> /dev/null; then
  echo -e "${YELLOW}?${NC} Deseja testar o build Docker? (y/n)"
  read -r response
  
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🐳 Construindo imagem Docker..."
    
    if docker build -t pesca-lead-crm:test .; then
      echo -e "${GREEN}✓${NC} Imagem Docker criada com sucesso!"
      
      # Verificar tamanho da imagem
      IMAGE_SIZE=$(docker images pesca-lead-crm:test --format "{{.Size}}")
      echo -e "${GREEN}✓${NC} Tamanho da imagem: $IMAGE_SIZE"
      
      echo ""
      echo -e "${BLUE}Para rodar a imagem localmente:${NC}"
      echo "docker run -p 8080:80 pesca-lead-crm:test"
      echo "Depois acesse: http://localhost:8080"
    else
      echo -e "${RED}✗${NC} Build Docker falhou!"
      exit 1
    fi
  else
    echo -e "${YELLOW}⊘${NC} Build Docker pulado"
  fi
else
  echo -e "${YELLOW}⚠${NC} Docker não encontrado, pulando teste de container"
fi
echo ""

# ==========================================
# RESUMO
# ==========================================
echo "=========================================="
echo -e "${GREEN}✅ BUILD TEST COMPLETO!${NC}"
echo "=========================================="
echo ""
echo "Seu projeto está pronto para deploy! 🚀"
echo ""
echo "Próximos passos:"
echo "1. Revisar as variáveis de ambiente em .env.example"
echo "2. Fazer commit das mudanças"
echo "3. Fazer push para o repositório"
echo "4. Configurar no Coolify seguindo DEPLOY_COOLIFY.md"
echo ""

# Limpar .env.local temporário
if [ -f ".env.local" ] && grep -q "example.supabase.co" .env.local; then
  rm .env.local
  echo -e "${YELLOW}🧹 Arquivo .env.local temporário removido${NC}"
fi

exit 0
