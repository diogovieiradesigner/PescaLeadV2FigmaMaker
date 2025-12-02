# 🚀 Configuração do Coolify - Passo a Passo

## ⚠️ IMPORTANTE: Use Dockerfile (não Nixpacks)

---

## 📝 Passo 1: Criar Resource no Coolify

1. Abra o painel do Coolify
2. Clique em **"+ New Resource"**
3. Selecione **"Private Repository (with GitHub App)"**

---

## 🔗 Passo 2: Conectar GitHub

### Opção A: GitHub App (Recomendado)
1. Clique em **"Install GitHub App"**
2. Autorize o Coolify no GitHub
3. Selecione o repositório `pesca-lead-crm`
4. Volte ao Coolify e selecione o repositório

### Opção B: Deploy Key
1. Copie a Deploy Key fornecida pelo Coolify
2. No GitHub: `Settings → Deploy keys → Add deploy key`
3. Cole a chave pública
4. ✅ Marque "Allow write access"

---

## ⚙️ Passo 3: Configurar Build

### Na aba **"Configuration"**:

```yaml
Repository: seu-usuario/pesca-lead-crm
Branch: main
Build Pack: Dockerfile  ⚠️ IMPORTANTE: Selecionar "Dockerfile"
Port: 80
Base Directory: /
```

### ⚠️ **ATENÇÃO CRÍTICA:**

**NO CAMPO "Build Pack", VOCÊ DEVE:**
1. Clicar no dropdown
2. Selecionar **"Dockerfile"** (não deixe em "Nixpacks")
3. Salvar

![Build Pack](https://i.imgur.com/example.png)

---

## 🔐 Passo 4: Variáveis de Ambiente

Na aba **"Environment Variables"**, adicione:

### ✅ OBRIGATÓRIAS (Frontend - Públicas)

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ✅ OBRIGATÓRIAS (Backend - Secretas - NÃO EXPOR)

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### ✅ OBRIGATÓRIAS (Integrações)

```bash
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-api-evolution

GEMINI_API_KEY=AIzaSy...
```

### 🔧 OPCIONAIS

```bash
# Resend (Email)
RESEND_API_KEY=re_...

# UAZApi (WhatsApp Alternativo)
UAZAPI_API_URL=https://sua-uazapi.com
UAZAPI_ADMIN_TOKEN=seu-token

# Scraper
SCRAPER_API_URL=https://sua-scraper-api.com

# Ambiente
NODE_ENV=production
```

---

## 🎯 Passo 5: Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (3-5 minutos)
3. Acompanhe os logs em tempo real

### ✅ O que o Coolify vai fazer:

```bash
1. Clone do repositório
2. Detecta o Dockerfile
3. docker build -t pesca-lead-crm .
   ↓
   Stage 1: npm ci + npm run build
   Stage 2: Copia dist/ para nginx
4. docker run -p 80:80 pesca-lead-crm
5. Health check (curl http://localhost/)
6. ✅ Deploy completo!
```

---

## 🌐 Passo 6: Configurar Domínio (Opcional)

### No Coolify:

1. Vá em **"Domains"**
2. Clique em **"Add Domain"**
3. Digite: `app.pescalead.com.br`
4. Salvar

### No seu DNS Provider (Cloudflare, Route53, etc):

```dns
Type: A
Name: app
Value: IP-DO-SERVIDOR-COOLIFY
TTL: 300
Proxy: ✅ (se Cloudflare)
```

### SSL (Automático):

O Coolify vai:
1. Detectar o domínio
2. Provisionar certificado Let's Encrypt
3. Configurar HTTPS automaticamente
4. ✅ Site disponível em https://app.pescalead.com.br

---

## ✅ Verificar se Funcionou

### 1. Abra o site:
```
https://seu-dominio.com
ou
http://IP-DO-SERVIDOR
```

### 2. Deve ver:
- ✅ Tela de login do Pesca Lead
- ✅ SSL ativo (cadeado verde)
- ✅ Console sem erros (F12)

### 3. Verificar Logs:
```bash
# No Coolify
Applications → Pesca Lead → Logs

# Deve ver:
✓ npm ci completed
✓ npm run build completed
✓ nginx: [emerg] listening on 0.0.0.0:80
```

---

## 🔄 CI/CD Automático (Webhook)

Após o primeiro deploy, o Coolify cria um webhook no GitHub.

### Testar:

```bash
# Fazer uma mudança qualquer
echo "# Test" >> README.md

# Commit e push
git add .
git commit -m "test: CI/CD automático"
git push origin main

# No Coolify:
# → Detecta o push
# → Inicia novo deploy automaticamente
# → Substitui container antigo
# → Zero downtime!
```

---

## ⚠️ Troubleshooting (Erros Comuns)

### ❌ Erro: "Build failed: npm ci"

**Causa:** package.json não encontrado ou corrompido

**Solução:**
```bash
# Verificar se package.json está no root
git ls-tree -r HEAD --name-only | grep package.json

# Se não estiver, adicionar:
git add package.json
git commit -m "fix: add package.json"
git push
```

---

### ❌ Erro: "Cannot find module 'vite'"

**Causa:** DevDependencies não instaladas

**Solução:** Já resolvido no Dockerfile com:
```dockerfile
RUN npm ci --legacy-peer-deps
# Instala TODAS as dependências (incluindo devDependencies)
```

---

### ❌ Erro: "ENOENT: no such file or directory, open 'dist/index.html'"

**Causa:** Build não gerou o dist/

**Solução:**
```bash
# Testar build localmente
npm install
npm run build
ls -la dist/

# Se funcionar localmente mas falhar no Coolify:
# → Verificar se vite.config.ts está commitado
git add vite.config.ts
git push
```

---

### ❌ Erro: "nginx: [emerg] cannot load certificate"

**Causa:** SSL não provisionado ainda

**Solução:**
1. Aguarde 1-2 minutos
2. No Coolify: Domains → Reprovisionar SSL
3. Verificar DNS: `dig app.seudominio.com`

---

### ❌ Erro: "Cannot connect to Supabase"

**Causa:** Variáveis de ambiente incorretas

**Solução:**
```bash
1. Coolify → Environment Variables
2. Verificar:
   VITE_SUPABASE_URL (deve começar com https://)
   VITE_SUPABASE_ANON_KEY (deve ser JWT longo)
3. Redeploy
```

---

### ❌ Site carrega mas 404 nas rotas

**Causa:** nginx.conf não tem SPA fallback

**Solução:** Já está correto no nginx.conf:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Se ainda assim tiver problema:
```bash
# Verificar se nginx.conf está no root
git ls-tree -r HEAD --name-only | grep nginx.conf

# Redeploy
```

---

### ❌ Build muito lento (> 10 min)

**Causa:** Cache não está funcionando

**Solução:**
```bash
# No Dockerfile, já otimizado com:
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps
COPY . .

# Isso permite que o Docker cache a layer de npm ci
```

---

## 📊 Monitoramento

### Logs em Tempo Real:
```
Coolify → Applications → Pesca Lead → Logs
```

### Métricas:
```
Coolify → Applications → Pesca Lead → Metrics
- CPU Usage
- Memory Usage
- Network I/O
```

### Health Check:
```
Status: Healthy ✅
Last Check: 30s ago
Endpoint: http://localhost/
```

---

## 🎉 Deploy Completo!

Seu **Pesca Lead CRM** está rodando em:

- 🌐 **URL:** https://seu-dominio.com
- 🔐 **SSL:** ✅ Ativo
- 🔄 **CI/CD:** ✅ Automático
- 📊 **Monitoramento:** ✅ Ativo
- ⚡ **Performance:** ✅ Otimizado

---

## 📋 Checklist Final:

- [ ] Build Pack = **Dockerfile** (não Nixpacks)
- [ ] Todas as env vars adicionadas
- [ ] Deploy completou sem erros
- [ ] Site abre no navegador
- [ ] SSL ativo (cadeado verde)
- [ ] Login funciona
- [ ] Dados do Supabase aparecem
- [ ] CI/CD testado (git push → redeploy)

---

## 🆘 Precisa de Ajuda?

### Logs detalhados:
```bash
# SSH no servidor Coolify
ssh usuario@servidor

# Ver container
docker ps | grep pesca-lead

# Ver logs
docker logs -f pesca-lead-crm
```

### Rebuild forçado:
```bash
# No Coolify
1. Applications → Pesca Lead
2. Force Rebuild: ✅
3. Deploy
```

---

**Pronto! Seu CRM está no ar! 🚀🐟**
