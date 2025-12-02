# 🔧 2 SOLUÇÕES: Nixpacks vs Dockerfile

## ❌ **O PROBLEMA:**

```bash
npm: command not found
```

**Causa:** Nixpacks detectou Deno em vez de Node.js por causa da pasta `/supabase/functions/`

---

## ✅ **SOLUÇÃO A (RECOMENDADA): Usar Dockerfile**

### **Vantagens:**
- ✅ Build otimizado (multi-stage)
- ✅ Imagem final pequena (~50MB)
- ✅ Nginx com performance tunning
- ✅ Mais controle sobre o build
- ✅ Mais rápido (cache de layers)
- ✅ Padrão da indústria

### **Como usar:**

```bash
# 1. Fazer commit dos arquivos
git add Dockerfile nginx.conf .dockerignore
git commit -m "feat: adicionar Dockerfile para deploy"
git push origin main

# 2. No Coolify → Configuration
Build Pack: Dockerfile  ← TROCAR AQUI
Port: 80
Base Directory: /

# 3. Deploy
Deploy → Aguardar 3-5 min → ✅ Pronto!
```

### **O que vai acontecer:**
```bash
✓ Detecta Dockerfile
✓ Stage 1: npm ci + npm run build
✓ Stage 2: Copia dist/ para Nginx
✓ Container rodando em 80
✓ Health check: OK
✓ Deploy completo! 🎉
```

---

## ✅ **SOLUÇÃO B (ALTERNATIVA): Configurar Nixpacks**

### **Vantagens:**
- ✅ Sem precisar mudar Build Pack
- ✅ Nixpacks detecta automaticamente
- ✅ Mais simples (sem Dockerfile)

### **Desvantagens:**
- ❌ Imagem maior (~200-300MB)
- ❌ Menos controle sobre o build
- ❌ Usa `npx serve` em vez de Nginx
- ❌ Menos performático

### **Como usar:**

```bash
# 1. Fazer commit do nixpacks.toml
git add nixpacks.toml
git commit -m "feat: configurar Nixpacks para Node.js"
git push origin main

# 2. No Coolify → Configuration
Build Pack: Nixpacks  ← Deixar como está
Port: 3000  ← ATENÇÃO: Mudar para 3000!
Base Directory: /

# 3. Deploy
Deploy → Aguardar 3-5 min → ✅ Pronto!
```

### **O que vai acontecer:**
```bash
✓ Detecta nixpacks.toml
✓ Instala Node.js 20 + npm
✓ npm ci --legacy-peer-deps
✓ npm run build
✓ npx serve dist -s -l 3000
✓ Deploy completo! 🎉
```

---

## 🎯 **QUAL ESCOLHER?**

### **Escolha SOLUÇÃO A (Dockerfile) se:**
- ✅ Quer performance máxima
- ✅ Quer imagem pequena
- ✅ Quer Nginx (mais robusto)
- ✅ Quer seguir best practices
- ✅ Quer controle total

### **Escolha SOLUÇÃO B (Nixpacks) se:**
- ✅ Quer simplicidade
- ✅ Não quer mexer no Build Pack
- ✅ Não liga para tamanho da imagem
- ✅ Quer deploy rápido sem pensar

---

## 🏆 **RECOMENDAÇÃO:**

### **Use SOLUÇÃO A (Dockerfile)** ⭐⭐⭐⭐⭐

**Por quê?**
- Nginx é MUITO mais performático que `npx serve`
- Imagem 5x menor (50MB vs 250MB)
- Mais rápido para fazer redeploy
- Padrão usado por empresas profissionais
- Você já tem tudo pronto!

---

## 📋 **Passo a Passo: SOLUÇÃO A (Recomendada)**

### **1. Commit dos arquivos:**
```bash
git add Dockerfile nginx.conf .dockerignore nixpacks.toml
git commit -m "feat: adicionar Dockerfile e nixpacks.toml"
git push origin main
```

### **2. Configurar Coolify:**
```yaml
# Applications → Pesca Lead → Configuration

Repository: seu-usuario/pesca-lead-crm
Branch: main

⚠️ IMPORTANTE:
Build Pack: Dockerfile  ← TROCAR DE NIXPACKS PARA DOCKERFILE

Port: 80  ← Porta do nginx
Base Directory: /
```

### **3. Adicionar variáveis de ambiente:**
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=xxx
GEMINI_API_KEY=AIzaSy...
NODE_ENV=production
```

### **4. Deploy:**
```
Deploy → Aguardar 3-5 min
```

### **5. Verificar:**
```bash
# Abrir no navegador
http://IP-DO-SERVIDOR

# Deve ver:
✅ Tela de login do Pesca Lead
✅ Console sem erros
✅ SSL ativo (se configurou domínio)
```

---

## 📋 **Passo a Passo: SOLUÇÃO B (Alternativa)**

### **1. Commit do arquivo:**
```bash
git add nixpacks.toml
git commit -m "feat: configurar Nixpacks"
git push origin main
```

### **2. Configurar Coolify:**
```yaml
# Applications → Pesca Lead → Configuration

Repository: seu-usuario/pesca-lead-crm
Branch: main

Build Pack: Nixpacks  ← DEIXAR COMO ESTÁ

⚠️ IMPORTANTE:
Port: 3000  ← Porta do npx serve (não 80!)

Base Directory: /
```

### **3. Adicionar variáveis de ambiente:**
```bash
# Mesmas variáveis da Solução A
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
...
```

### **4. Deploy:**
```
Deploy → Aguardar 3-5 min
```

---

## ⚠️ **ATENÇÃO: Portas Diferentes!**

| Solução | Build Pack | Porta | Servidor |
|---------|-----------|-------|----------|
| **A (Recomendada)** | Dockerfile | **80** | Nginx |
| **B (Alternativa)** | Nixpacks | **3000** | npx serve |

**IMPORTANTE:** Se mudar de uma solução para outra, MUDAR A PORTA no Coolify!

---

## 🔄 **Mudar de Nixpacks para Dockerfile (Migração)**

Se você já fez deploy com Nixpacks e quer migrar:

```bash
# 1. Fazer commit do Dockerfile
git add Dockerfile nginx.conf .dockerignore
git commit -m "feat: migrar para Dockerfile"
git push

# 2. No Coolify
Applications → Pesca Lead → Configuration
Build Pack: Dockerfile
Port: 80  ← Mudar de 3000 para 80
Save

# 3. Redeploy
Force Rebuild: ✅
Deploy

# 4. Aguardar novo build
# 5. ✅ Migração completa!
```

---

## 🐛 **Troubleshooting**

### **Erro: "npm: command not found" (mesmo com nixpacks.toml)**

**Causa:** nixpacks.toml não foi commitado ou não está no root

**Solução:**
```bash
# Verificar se está no repositório
git ls-tree -r HEAD --name-only | grep nixpacks.toml

# Se não aparecer:
git add nixpacks.toml
git commit -m "fix: adicionar nixpacks.toml"
git push
```

---

### **Erro: "Cannot connect to port 80" (com Dockerfile)**

**Causa:** nginx.conf não foi copiado ou está errado

**Solução:**
```bash
# Verificar se nginx.conf existe
ls -la nginx.conf

# Redeploy
git push  # Se fez mudanças
```

---

### **Erro: "Cannot connect to port 3000" (com Nixpacks)**

**Causa:** Porta configurada errada no Coolify

**Solução:**
```
Coolify → Configuration
Port: 3000  ← Verificar
Save
Redeploy
```

---

## 📊 **Comparação Técnica**

| Aspecto | Dockerfile | Nixpacks |
|---------|-----------|----------|
| **Imagem final** | 50MB | 250MB |
| **Build time** | 3-4 min | 4-5 min |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Controle** | Total | Limitado |
| **Cache** | Sim (layers) | Sim |
| **Health check** | Sim | Não |
| **Gzip** | Sim | Não |
| **SSL ready** | Sim | Sim |
| **Complexidade** | Média | Baixa |
| **Manutenção** | Baixa | Baixa |

---

## 🎉 **Resultado Final (Ambas Soluções)**

```
✅ Pesca Lead CRM no ar
✅ Build funcionando
✅ npm instalado corretamente
✅ CI/CD automático
✅ Zero downtime deploys
```

### **Solução A (Dockerfile):**
- Tamanho: ~50MB
- Performance: Máxima
- Servidor: Nginx

### **Solução B (Nixpacks):**
- Tamanho: ~250MB
- Performance: Boa
- Servidor: npx serve

---

## 🚀 **AGORA SIM!**

Escolha sua solução e faça o deploy:

### **Recomendo: SOLUÇÃO A (Dockerfile)** ⭐
```bash
git push
Coolify → Build Pack = Dockerfile
Deploy
✅ Pronto em 5 min!
```

### **Alternativa: SOLUÇÃO B (Nixpacks)**
```bash
git push
Coolify → Build Pack = Nixpacks, Port = 3000
Deploy
✅ Pronto em 5 min!
```

---

**Ambas funcionam! Mas Dockerfile é melhor! 🚀🐟**
