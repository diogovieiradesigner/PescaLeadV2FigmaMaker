#!/bin/bash

# ====================================
# Supabase Self-Hosted Setup Script
# PESCA LEAD - Migration Branch
# ====================================

set -e

echo "🚀 Supabase Self-Hosted Setup"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting setup. Using existing .env file."
        exit 0
    fi
fi

echo -e "${GREEN}✓${NC} Creating .env file from template..."
cp .env.example .env

# Generate secrets
echo ""
echo "🔐 Generating secure secrets..."
echo ""

# Generate PostgreSQL password
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo -e "${GREEN}✓${NC} Generated PostgreSQL password"

# Generate Realtime secret
REALTIME_SECRET=$(openssl rand -base64 64 | tr -d "\n")
echo -e "${GREEN}✓${NC} Generated Realtime secret key base"

# Update .env file
sed -i "s/POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" .env
sed -i "s/REALTIME_SECRET_KEY_BASE=your-realtime-secret-key-base/REALTIME_SECRET_KEY_BASE=${REALTIME_SECRET}/" .env

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: You need to manually set the following values in .env:${NC}"
echo ""
echo "1. JWT_SECRET - Get from Supabase Dashboard > Settings > API > JWT Secret"
echo "2. SERVICE_ROLE_KEY - Get from Supabase Dashboard > Settings > API > service_role key"
echo "3. API Keys for external services (AI, data extraction, etc.)"
echo ""
echo "Also update volumes/kong.yml with your SERVICE_ROLE_KEY"
echo ""

read -p "Press Enter to open .env file for editing..."

# Try to open .env in editor
if command -v code &> /dev/null; then
    code .env
elif command -v nano &> /dev/null; then
    nano .env
elif command -v vi &> /dev/null; then
    vi .env
else
    echo "Please manually edit the .env file"
fi

echo ""
echo -e "${GREEN}✓${NC} Setup complete!"
echo ""
echo "Next steps:"
echo "1. Fill in the remaining values in .env file"
echo "2. Update volumes/kong.yml with SERVICE_ROLE_KEY"
echo "3. Run: docker-compose up -d"
echo ""
