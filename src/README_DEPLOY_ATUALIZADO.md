# 🚀 Deploy Pesca Lead CRM - Coolify

## ⚠️ ERRO "npm: command not found"? → [FIX_AGORA.md](./FIX_AGORA.md)

---

## 📦 **Arquivos Criados para Deploy:**

### **Arquivos de Build:**
- ✅ `Dockerfile` - Build otimizado com Nginx (RECOMENDADO)
- ✅ `nixpacks.toml` - Configuração Nixpacks (alternativa)
- ✅ `nginx.conf` - Servidor web otimizado
- ✅ `.dockerignore` - Otimização de build

### **Documentação:**
- ⚡ `FIX_AGORA.md` - Resolver erro "npm not found" (2 min)
- 📊 `SOLUCAO_NIXPACKS_VS_DOCKERFILE.md` - Comparação detalhada
- 🚀 `DEPLOY_AGORA.md` - Deploy rápido (5 min)
- ❌ `ERROS_COMUNS.md` - 15+ erros e soluções
- 🔧 `DEBUG_DEPLOY.md` - Debug avançado
- 📚 `INDICE_DEPLOY.md` - Índice completo

---

## 🎯 **Como Fazer o Deploy:**

### **Opção 1: Dockerfile (RECOMENDADA)** ⭐

```bash
# 1. Commit
git add Dockerfile nginx.conf .dockerignore
git commit -m "feat: adicionar Dockerfile"
git push

# 2. Configurar Coolify
# Build Pack: Dockerfile
# Port: 80

# 3. Deploy
# ✅ Pronto em 5 min!
```

### **Opção 2: Nixpacks (Alternativa)**

```bash
# 1. Commit
git add nixpacks.toml
git commit -m "feat: configurar Nixpacks"
git push

# 2. Configurar Coolify
# Build Pack: Nixpacks
# Port: 3000

# 3. Deploy
# ✅ Pronto em 5 min!
```

---

## 📚 **Qual Documentação Ler?**

```
┌─────────────────────────────────────┐
│ Erro "npm: command not found"?     │
│ → FIX_AGORA.md                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Quer comparar Dockerfile vs         │
│ Nixpacks?                           │
│ → SOLUCAO_NIXPACKS_VS_DOCKERFILE.md │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Pronto para fazer deploy?           │
│ → DEPLOY_AGORA.md                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Deu erro?                            │
│ → ERROS_COMUNS.md                   │
└─────────────────────────────────────┘
```

---

## ⚙️ **Variáveis de Ambiente Necessárias:**

```bash
# Frontend (Públicas)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Backend (Secretas)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Integrações
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=xxx
GEMINI_API_KEY=AIzaSy...

# Ambiente
NODE_ENV=production
```

---

## 🏆 **Comparação: Dockerfile vs Nixpacks**

| Aspecto | Dockerfile | Nixpacks |
|---------|-----------|----------|
| **Imagem** | 50MB | 250MB |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Servidor** | Nginx | npx serve |
| **Porta** | 80 | 3000 |
| **Recomendado** | ✅ SIM | ❌ Alternativa |

---

## 🎉 **Resultado Final:**

Após o deploy, você terá:

```
✅ Pesca Lead CRM no ar
✅ SSL automático (Let's Encrypt)
✅ CI/CD automático (git push → redeploy)
✅ Zero-downtime deployments
✅ Health checks ativos
✅ Performance otimizada
```

---

## 📞 **Precisa de Ajuda?**

### **Por ordem de prioridade:**

1. **Erro "npm not found"?** → `FIX_AGORA.md`
2. **Dúvida Dockerfile vs Nixpacks?** → `SOLUCAO_NIXPACKS_VS_DOCKERFILE.md`
3. **Primeiro deploy?** → `DEPLOY_AGORA.md`
4. **Erro no deploy?** → `ERROS_COMUNS.md`
5. **Quer entender tudo?** → `CONFIGURAR_COOLIFY.md`
6. **Debug avançado?** → `DEBUG_DEPLOY.md`
7. **Ver tudo?** → `INDICE_DEPLOY.md`

---

## ⚡ **TL;DR (Resumão):**

```bash
# 1. Push
git add .
git commit -m "feat: configurar deploy"
git push

# 2. Coolify
Build Pack: Dockerfile  ← RECOMENDADO
Port: 80
Env vars: Adicionar todas

# 3. Deploy
Deploy → 5 min → ✅ Pronto!
```

---

## 🔥 **Links Rápidos:**

- 🆘 **[ERRO "npm not found"](./FIX_AGORA.md)** ← Comece aqui se tiver erro!
- 📊 **[Dockerfile vs Nixpacks](./SOLUCAO_NIXPACKS_VS_DOCKERFILE.md)**
- ⚡ **[Deploy Rápido](./DEPLOY_AGORA.md)**
- ❌ **[Erros Comuns](./ERROS_COMUNS.md)**
- 📚 **[Índice Completo](./INDICE_DEPLOY.md)**

---

**Escolha Dockerfile e faça deploy agora! 🚀🐟**

**Tempo estimado: 5 minutos**
