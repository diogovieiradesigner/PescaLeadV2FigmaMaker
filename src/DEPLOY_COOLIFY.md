# 🚀 Guia de Deploy - Pesca Lead no Coolify

Este guia mostra como fazer o deploy do **Pesca Lead CRM** no Coolify usando um repositório privado do GitHub.

---

## 📋 Pré-requisitos

### 1. **Servidor Coolify Configurado**
- Coolify instalado e rodando
- Acesso ao painel administrativo
- Docker instalado no servidor

### 2. **Repositório GitHub Privado**
- Código do Pesca Lead no GitHub
- Token de acesso pessoal (PAT) ou GitHub App configurada

### 3. **Supabase Configurado**
- Projeto Supabase criado
- Migrations executadas
- RPC functions criadas
- Edge Functions deployadas

---

## 🔧 PASSO 1: Preparar o Repositório

### 1.1. Criar Repositório Privado no GitHub

```bash
# No seu terminal local
git init
git add .
git commit -m "Initial commit - Pesca Lead CRM"
git branch -M main
git remote add origin https://github.com/seu-usuario/pesca-lead-crm.git
git push -u origin main
```

### 1.2. Criar GitHub Personal Access Token (PAT)

1. Acesse: `https://github.com/settings/tokens`
2. Clique em **"Generate new token (classic)"**
3. Selecione os escopos:
   - ✅ `repo` (acesso total a repositórios privados)
   - ✅ `read:org` (se estiver em uma organização)
4. Copie o token gerado (guarde em local seguro!)

---

## 🚀 PASSO 2: Configurar no Coolify

### 2.1. Criar Novo Resource

1. No painel do Coolify, clique em **"+ New Resource"**
2. Escolha **"Private Repository (with GitHub App)"** ou **"Private Repository (with Deploy Key)"**
   - **Recomendado:** GitHub App (mais seguro e fácil)

### 2.2. Configurar GitHub App (Opção Recomendada)

Se escolher **GitHub App**:

1. Clique em **"Install GitHub App"**
2. Autorize o Coolify no GitHub
3. Selecione o repositório `pesca-lead-crm`
4. Volte ao Coolify e selecione o repositório

### 2.3. Configurar com Deploy Key (Alternativa)

Se escolher **Deploy Key**:

1. No Coolify, copie a **Deploy Key** fornecida
2. No GitHub, vá em:
   ```
   Repositório → Settings → Deploy keys → Add deploy key
   ```
3. Cole a chave pública
4. ✅ Marque **"Allow write access"** (se precisar de CD)
5. Salve

### 2.4. Configurar o Deploy

Preencha os campos:

```yaml
Repository: seu-usuario/pesca-lead-crm
Branch: main
Build Pack: Dockerfile
Port: 80
```

---

## 🔐 PASSO 3: Configurar Variáveis de Ambiente

No Coolify, vá em **Environment Variables** e adicione:

### ⚠️ **VARIÁVEIS OBRIGATÓRIAS**

```bash
# SUPABASE
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica

# BACKEND (Supabase Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
SUPABASE_DB_URL=sua-url-do-banco

# EVOLUTION API
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-evolution

# UAZAPI (Opcional)
UAZAPI_API_URL=https://sua-uazapi.com
UAZAPI_ADMIN_TOKEN=seu-token-admin

# GOOGLE GEMINI
GEMINI_API_KEY=sua-chave-gemini

# RESEND (Email)
RESEND_API_KEY=sua-chave-resend

# SCRAPER
SCRAPER_API_URL=https://sua-scraper-api.com

# NODE
NODE_ENV=production
```

### 📝 **Como Obter as Chaves**

#### Supabase:
1. Acesse: `https://app.supabase.com/project/seu-projeto/settings/api`
2. Copie:
   - **URL** → `VITE_SUPABASE_URL`
   - **anon/public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

#### Evolution API:
1. Acesse seu painel Evolution
2. Vá em Settings → API Keys
3. Gere uma nova chave

#### Google Gemini:
1. Acesse: `https://makersuite.google.com/app/apikey`
2. Crie uma API Key

#### Resend:
1. Acesse: `https://resend.com/api-keys`
2. Crie uma nova API Key

---

## 🏗️ PASSO 4: Deploy

### 4.1. Iniciar o Deploy

1. No Coolify, clique em **"Deploy"**
2. Aguarde o build (pode levar 3-5 minutos)
3. Acompanhe os logs em tempo real

### 4.2. Verificar o Build

O Coolify vai:
1. ✅ Clonar o repositório
2. ✅ Executar `npm ci` (instalar dependências)
3. ✅ Executar `npm run build` (build Vite)
4. ✅ Criar imagem Docker com Nginx
5. ✅ Iniciar o container na porta 80

### 4.3. Verificar Logs

```bash
# No servidor Coolify (SSH)
docker logs -f <container-id>
```

---

## 🌐 PASSO 5: Configurar Domínio

### 5.1. Adicionar Domínio

1. No Coolify, vá em **"Domains"**
2. Adicione seu domínio:
   ```
   app.pescalead.com.br
   ```

### 5.2. Configurar DNS

No seu provedor de DNS (Cloudflare, Route53, etc):

```
Tipo: A
Nome: app.pescalead
Valor: IP-DO-SERVIDOR-COOLIFY
TTL: 300
Proxy: ✅ (se usar Cloudflare)
```

### 5.3. Configurar SSL

O Coolify configura automaticamente SSL via Let's Encrypt:

1. ✅ Certifique-se que o DNS está apontando corretamente
2. ✅ Aguarde 1-2 minutos
3. ✅ O SSL será provisionado automaticamente

---

## 🔄 PASSO 6: CI/CD Automático

### 6.1. Webhook GitHub (Deploy Automático)

O Coolify cria automaticamente um webhook. Teste:

```bash
# Faça uma mudança no código
git add .
git commit -m "test: CI/CD"
git push origin main

# O Coolify vai detectar e fazer redeploy automaticamente! 🎉
```

### 6.2. Configurar Branch Strategy

No Coolify:

```yaml
Production Branch: main
Preview Branches: develop, staging
```

---

## 🔍 PASSO 7: Monitoramento e Troubleshooting

### 7.1. Health Check

O Coolify monitora automaticamente:
- ✅ HTTP 200 na porta 80
- ✅ Container rodando
- ✅ Uso de CPU/RAM

### 7.2. Logs em Tempo Real

```bash
# Via Coolify UI
Applications → Pesca Lead → Logs

# Via SSH
docker logs -f pesca-lead-crm
```

### 7.3. Erros Comuns

#### ❌ Erro: "Build failed - npm install"
**Solução:** Verifique se o `package.json` está commitado

#### ❌ Erro: "Cannot connect to Supabase"
**Solução:** Verifique as variáveis de ambiente

#### ❌ Erro: "404 on routes"
**Solução:** Verifique se o `nginx.conf` tem o fallback para SPA

#### ❌ Erro: "Port 80 already in use"
**Solução:** Altere a porta no Coolify para 8080

---

## 📊 PASSO 8: Otimizações Pós-Deploy

### 8.1. Configurar Cache

No Cloudflare (se usar):
```yaml
Caching Level: Standard
Browser Cache TTL: 4 hours
Always Online: ✅
```

### 8.2. Configurar CDN

```yaml
Auto Minify: 
  - ✅ JavaScript
  - ✅ CSS
  - ✅ HTML

Brotli: ✅
```

### 8.3. Monitoramento

Adicione monitoramento externo:
- **UptimeRobot**: `https://uptimerobot.com`
- **Ping Status**: Verificar a cada 5 min

---

## 🎯 Checklist Final

Antes de considerar o deploy completo, verifique:

### Frontend
- ✅ Site carrega em `https://seu-dominio.com`
- ✅ SSL ativo (cadeado verde)
- ✅ Login funciona
- ✅ Dashboard carrega dados
- ✅ Chat funciona
- ✅ Kanban funciona

### Backend (Supabase)
- ✅ Edge Functions deployadas
- ✅ RPC Functions testadas
- ✅ Webhooks configurados
- ✅ Crons rodando

### Integrações
- ✅ Evolution API conectada
- ✅ WhatsApp recebendo mensagens
- ✅ Agentes IA respondendo
- ✅ Follow-ups automáticos

---

## 🆘 Suporte

### Problemas com Coolify:
- Docs: `https://coolify.io/docs`
- Discord: `https://discord.gg/coolify`

### Problemas com Supabase:
- Docs: `https://supabase.com/docs`
- Discord: `https://discord.supabase.com`

---

## 🎉 Deploy Concluído!

Seu **Pesca Lead CRM** está no ar! 🚀

Acesse: `https://seu-dominio.com`

---

## 📝 Comandos Úteis

```bash
# Ver logs do container
docker logs -f pesca-lead-crm

# Reiniciar aplicação
docker restart pesca-lead-crm

# Ver uso de recursos
docker stats pesca-lead-crm

# Entrar no container
docker exec -it pesca-lead-crm sh

# Rebuild sem cache
docker build --no-cache -t pesca-lead-crm .

# Ver variáveis de ambiente
docker inspect pesca-lead-crm | grep -A 20 Env
```

---

## 🔄 Rollback

Se algo der errado:

1. No Coolify → Deployments
2. Selecione o deploy anterior
3. Clique em **"Redeploy"**

---

**Feito com ❤️ pela equipe Pesca Lead**
