# ⚡ Quick Start - Deploy em 10 Minutos

## 🎯 Objetivo
Deploy do Pesca Lead CRM no Coolify via repositório privado do GitHub.

---

## ✅ Pré-requisitos (5 min)

```bash
☑️ Conta no GitHub
☑️ Servidor com Coolify instalado
☑️ Projeto Supabase configurado
☑️ Evolution API rodando
☑️ API Key do Google Gemini
```

---

## 🚀 Passos Rápidos (5 min)

### 1️⃣ Preparar Repositório (1 min)

```bash
# Criar repositório privado no GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/pesca-lead-crm.git
git push -u origin main
```

### 2️⃣ Configurar Coolify (2 min)

1. Abrir Coolify → **"+ New Resource"**
2. Escolher **"Private Repository (with GitHub App)"**
3. Conectar GitHub e selecionar o repo `pesca-lead-crm`
4. Configurar:
   ```
   Branch: main
   Build Pack: Dockerfile
   Port: 80
   ```

### 3️⃣ Adicionar Variáveis de Ambiente (2 min)

No Coolify, clicar em **"Environment Variables"** e adicionar:

```bash
# COPIAR do Supabase → Settings → API
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# COPIAR do Supabase → Settings → API (⚠️ SECRETO)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# COPIAR da Evolution API
EVOLUTION_API_URL=https://sua-api.com
EVOLUTION_API_KEY=xxx

# COPIAR do Google AI Studio
GEMINI_API_KEY=AIzaSy...

# Ambiente
NODE_ENV=production
```

### 4️⃣ Deploy! (< 5 min)

```bash
1. Clicar em "Deploy"
2. Aguardar o build (3-5 min)
3. ✅ Pronto!
```

---

## 🌐 Configurar Domínio (Opcional)

### No seu provedor de DNS:
```
Type: A
Name: app
Value: IP-DO-SERVIDOR-COOLIFY
```

### No Coolify:
```
1. Ir em "Domains"
2. Adicionar: app.seudominio.com
3. SSL será configurado automaticamente!
```

---

## ✅ Verificar se Funcionou

Abrir no navegador:
```
https://seu-dominio.com
```

Deve ver:
- ✅ Tela de login
- ✅ SSL ativo (cadeado verde)
- ✅ Sem erros no console (F12)

---

## 🔄 Atualizar (1 min)

```bash
# Fazer mudanças no código
git add .
git commit -m "feat: nova feature"
git push

# Coolify detecta e faz redeploy automático! 🎉
```

---

## ⚠️ Problemas?

### ❌ Build falha
```bash
# Testar localmente antes
npm install
npm run build
```

### ❌ Não conecta no Supabase
```bash
# Verificar env vars no Coolify
# VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

### ❌ 404 nas rotas
```bash
# Verificar se nginx.conf existe e tem:
# try_files $uri $uri/ /index.html;
```

---

## 📚 Documentação Completa

Para instruções detalhadas, veja:
- 📖 **[DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md)** - Guia completo
- 📖 **[README_DEPLOY.md](./README_DEPLOY.md)** - Visão geral técnica

---

## 🎉 Pronto!

Seu Pesca Lead CRM está no ar em **~10 minutos**! 🚀

**Acesse:** `https://seu-dominio.com`

---

**Dúvidas?** Leia a documentação completa em [DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md)
