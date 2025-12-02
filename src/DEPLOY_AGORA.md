# 🚀 DEPLOY AGORA - 3 Passos Simples

## ⚠️ IMPORTANTE: Configure o Coolify para usar DOCKERFILE (não Nixpacks)

---

## ✅ Passo 1: Verificar Arquivos (30 seg)

Os arquivos essenciais já estão criados:

```bash
✓ Dockerfile          # Build otimizado
✓ nginx.conf          # Servidor web
✓ package.json        # Dependências
✓ vite.config.ts      # Config Vite
✓ tsconfig.json       # Config TypeScript
✓ .dockerignore       # Ignorar arquivos
✓ index.html          # HTML principal
✓ main.tsx            # Entry point
```

**Verificar localmente (opcional):**
```bash
npm install
npm run build
# Se funcionar, está pronto! ✅
```

---

## 🔧 Passo 2: Configurar no Coolify (5 min)

### 1. Criar Resource:
```
Coolify → + New Resource → Private Repository (GitHub App)
```

### 2. Conectar GitHub:
```
- Autorizar Coolify no GitHub
- Selecionar repo: pesca-lead-crm
```

### 3. ⚠️ **CONFIGURAÇÃO CRÍTICA:**

Na aba **"Configuration"**:

```yaml
Repository: seu-usuario/pesca-lead-crm
Branch: main

⚠️⚠️⚠️ IMPORTANTE ⚠️⚠️⚠️
Build Pack: Dockerfile  ← TROCAR DE NIXPACKS PARA DOCKERFILE
⚠️⚠️⚠️ IMPORTANTE ⚠️⚠️⚠️

Port: 80
Base Directory: /
```

**ATENÇÃO:** Se deixar em "Nixpacks", o deploy vai FALHAR!

### 4. Adicionar Variáveis de Ambiente:

Na aba **"Environment Variables"**:

```bash
# COPIAR do Supabase → Settings → API
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Backend (SECRETO)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Evolution API
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=xxx

# Google Gemini
GEMINI_API_KEY=AIzaSy...

# Ambiente
NODE_ENV=production
```

---

## 🚀 Passo 3: Deploy! (3-5 min)

```
1. Clicar em "Deploy"
2. Aguardar build (3-5 min)
3. Ver logs em tempo real
4. ✅ Pronto!
```

### O que vai acontecer:

```bash
✓ Clone do repositório
✓ Detecta Dockerfile
✓ Stage 1: npm ci + npm run build (2-3 min)
✓ Stage 2: Copia dist/ para nginx (30 seg)
✓ Container inicia na porta 80
✓ Health check: OK
✓ Deploy completo! 🎉
```

---

## ✅ Verificar se Funcionou

### Abrir no navegador:
```
http://IP-DO-SERVIDOR
ou
https://seu-dominio.com (se configurou)
```

### Deve ver:
- ✅ Tela de login do Pesca Lead
- ✅ Console sem erros (F12)
- ✅ Conecta no Supabase

---

## 🌐 Configurar Domínio (Opcional - 2 min)

### 1. No seu DNS Provider:
```dns
Type: A
Name: app
Value: IP-DO-SERVIDOR-COOLIFY
TTL: 300
```

### 2. No Coolify:
```
Domains → Add Domain → app.seu-dominio.com
```

### 3. SSL Automático:
```
✓ Let's Encrypt provisiona SSL
✓ HTTPS ativo automaticamente
✓ https://app.seu-dominio.com 🎉
```

---

## 🔄 CI/CD Automático (Já Configurado!)

Após o primeiro deploy, cada `git push` faz redeploy automático:

```bash
# Fazer alterações
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# Coolify detecta → Redeploy automático! 🎉
```

---

## ❌ Se Algo Der Errado

### Erro no Build?
```
1. Ver logs: Coolify → Logs
2. Verificar se Build Pack = Dockerfile
3. Testar localmente: npm install && npm run build
```

### Site não carrega?
```
1. Verificar env vars (VITE_SUPABASE_URL, etc)
2. Ver logs do container
3. Testar: curl http://IP-SERVIDOR
```

### 404 nas rotas?
```
Já está corrigido no nginx.conf:
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 📚 Documentação Completa

Se precisar de mais detalhes:

- 📖 **[CONFIGURAR_COOLIFY.md](./CONFIGURAR_COOLIFY.md)** - Passo a passo detalhado
- 🔧 **[DEBUG_DEPLOY.md](./DEBUG_DEPLOY.md)** - Comandos de debug
- ✅ **[DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)** - Checklist completo

---

## 🎯 Resumo Ultra-Rápido

```bash
1. Coolify → New Resource → Private Repository
2. Conectar GitHub
3. ⚠️ Build Pack = DOCKERFILE (não Nixpacks)
4. Adicionar env vars (VITE_SUPABASE_URL, etc)
5. Deploy
6. ✅ Pronto em 5 minutos!
```

---

## 🎉 Deploy Completo!

Seu **Pesca Lead CRM** está no ar! 🚀🐟

**URL:** https://seu-dominio.com  
**Status:** ✅ Online  
**SSL:** ✅ Ativo  
**CI/CD:** ✅ Automático

---

**Dúvidas? Veja [CONFIGURAR_COOLIFY.md](./CONFIGURAR_COOLIFY.md) ou [DEBUG_DEPLOY.md](./DEBUG_DEPLOY.md)**
