# ✅ Checklist: Resolver "npm: command not found"

## 📋 **ANTES DE FAZER O DEPLOY:**

### ☑️ **Passo 1: Escolher Solução**

- [ ] **Solução A: Dockerfile** (RECOMENDADO) ⭐
  - Imagem: 50MB
  - Servidor: Nginx
  - Performance: Máxima
  - Porta: 80

- [ ] **Solução B: Nixpacks** (Alternativa)
  - Imagem: 250MB
  - Servidor: npx serve
  - Performance: Boa
  - Porta: 3000

---

### ☑️ **Passo 2: Verificar Arquivos**

#### **Para Solução A (Dockerfile):**
```bash
# Verificar se os arquivos existem
- [ ] Dockerfile está no root
- [ ] nginx.conf está no root
- [ ] .dockerignore está no root

# Comando para verificar:
ls -la Dockerfile nginx.conf .dockerignore
```

#### **Para Solução B (Nixpacks):**
```bash
# Verificar se o arquivo existe
- [ ] nixpacks.toml está no root

# Comando para verificar:
ls -la nixpacks.toml
```

---

### ☑️ **Passo 3: Commit e Push**

#### **Para Solução A (Dockerfile):**
```bash
- [ ] git add Dockerfile nginx.conf .dockerignore
- [ ] git commit -m "feat: adicionar Dockerfile"
- [ ] git push origin main
- [ ] Verificar no GitHub que os arquivos foram enviados
```

#### **Para Solução B (Nixpacks):**
```bash
- [ ] git add nixpacks.toml
- [ ] git commit -m "feat: configurar Nixpacks"
- [ ] git push origin main
- [ ] Verificar no GitHub que o arquivo foi enviado
```

---

## 📋 **NO COOLIFY:**

### ☑️ **Passo 4: Configurar Build Pack**

```
- [ ] Abrir Coolify
- [ ] Applications → Pesca Lead
- [ ] Aba "Configuration"
```

#### **Para Solução A (Dockerfile):**
```
- [ ] Build Pack: Trocar para "Dockerfile"
- [ ] Port: 80
- [ ] Save
```

#### **Para Solução B (Nixpacks):**
```
- [ ] Build Pack: Deixar em "Nixpacks"
- [ ] Port: 3000  ← IMPORTANTE!
- [ ] Save
```

---

### ☑️ **Passo 5: Variáveis de Ambiente**

```
- [ ] Ir em "Environment Variables"
- [ ] Adicionar todas as variáveis necessárias:
```

#### **Obrigatórias (Frontend):**
```bash
- [ ] VITE_SUPABASE_URL=https://xxxxx.supabase.co
- [ ] VITE_SUPABASE_ANON_KEY=eyJhbG...
```

#### **Obrigatórias (Backend):**
```bash
- [ ] SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

#### **Integrações:**
```bash
- [ ] EVOLUTION_API_URL=https://...
- [ ] EVOLUTION_API_KEY=xxx
- [ ] GEMINI_API_KEY=AIzaSy...
```

#### **Ambiente:**
```bash
- [ ] NODE_ENV=production
```

---

### ☑️ **Passo 6: Deploy**

```
- [ ] Clicar em "Deploy"
- [ ] Aguardar 3-5 minutos
- [ ] Acompanhar logs em tempo real
```

---

## 📋 **VERIFICAR SE FUNCIONOU:**

### ☑️ **Passo 7: Ver Logs do Build**

#### **Para Solução A (Dockerfile):**
```bash
Nos logs deve aparecer:
- [ ] "Dockerfile found"
- [ ] "FROM node:20-alpine AS builder"
- [ ] "npm ci --legacy-peer-deps" (sem erros)
- [ ] "npm run build" (sem erros)
- [ ] "FROM nginx:alpine"
- [ ] "Container started"
- [ ] "Deploy complete"
```

#### **Para Solução B (Nixpacks):**
```bash
Nos logs deve aparecer:
- [ ] "nixpacks.toml found"
- [ ] "Installing nodejs_20"
- [ ] "npm ci --legacy-peer-deps" (sem erros)
- [ ] "npm run build" (sem erros)
- [ ] "npx serve dist -s -l 3000"
- [ ] "Deploy complete"
```

---

### ☑️ **Passo 8: Testar o Site**

```
- [ ] Abrir no navegador: http://IP-DO-SERVIDOR
- [ ] Tela de login aparece
- [ ] Console sem erros (F12)
- [ ] Consegue fazer login
- [ ] Dashboard carrega
- [ ] Dados aparecem
```

---

### ☑️ **Passo 9: Verificar SSL (Se configurou domínio)**

```
- [ ] DNS aponta para o servidor (dig app.seu-dominio.com)
- [ ] Domínio configurado no Coolify
- [ ] SSL provisionado (cadeado verde)
- [ ] https:// funciona
```

---

### ☑️ **Passo 10: Testar CI/CD**

```bash
# Fazer uma mudança qualquer
- [ ] echo "# Test" >> README.md
- [ ] git add . && git commit -m "test: CI/CD" && git push
- [ ] Ver no Coolify que detectou o push
- [ ] Redeploy automático iniciou
- [ ] Redeploy completou com sucesso
```

---

## 📋 **SE DER ERRO:**

### ☑️ **Checklist de Debug:**

```
- [ ] Verificar que Build Pack está correto (Dockerfile ou Nixpacks)
- [ ] Verificar que Port está correto (80 ou 3000)
- [ ] Verificar que arquivos foram commitados (git ls-tree)
- [ ] Verificar env vars no Coolify
- [ ] Ver logs completos do build
- [ ] Ver logs do container (docker logs)
- [ ] Ler ERROS_COMUNS.md
- [ ] Se ainda não resolveu, ler DEBUG_DEPLOY.md
```

---

## 📋 **ERROS ESPECÍFICOS:**

### ❌ **"npm: command not found" ainda aparece**

```
- [ ] nixpacks.toml está commitado? (git ls-tree -r HEAD)
- [ ] Dockerfile está no root?
- [ ] Build Pack está correto no Coolify?
- [ ] Fez redeploy após mudar configuração?
```

---

### ❌ **"Cannot connect to port 80/3000"**

```
- [ ] Porta no Coolify corresponde à solução escolhida?
  - Dockerfile → Port 80
  - Nixpacks → Port 3000
- [ ] Container está rodando? (docker ps)
- [ ] Firewall permite a porta?
```

---

### ❌ **Build falha com erro de TypeScript**

```
- [ ] package.json tem script "build"?
- [ ] tsconfig.json está no root?
- [ ] vite.config.ts está no root?
- [ ] Todas as dependências estão no package.json?
```

---

### ❌ **Site carrega mas tudo em branco**

```
- [ ] VITE_SUPABASE_URL está definido?
- [ ] VITE_SUPABASE_ANON_KEY está definido?
- [ ] Ver console do navegador (F12) para erro específico
- [ ] Env vars corretas? (sem espaços, sem aspas extras)
```

---

## 📊 **RESUMO DO CHECKLIST:**

```
1. ✅ Escolher solução (Dockerfile ou Nixpacks)
2. ✅ Verificar arquivos existem
3. ✅ Commit e push
4. ✅ Configurar Build Pack no Coolify
5. ✅ Configurar Port correto
6. ✅ Adicionar env vars
7. ✅ Deploy
8. ✅ Ver logs (sem erro "npm not found")
9. ✅ Testar site
10. ✅ Configurar domínio/SSL (opcional)
```

---

## 🎯 **TEMPO ESTIMADO:**

```
✓ Verificar arquivos: 1 min
✓ Commit e push: 1 min
✓ Configurar Coolify: 2 min
✓ Adicionar env vars: 2 min
✓ Deploy: 5 min
✓ Testar: 2 min

Total: ~13 minutos
```

---

## 🎉 **PRONTO!**

Quando todos os checkboxes estiverem marcados:

```
✅ Deploy completo!
✅ "npm: command not found" resolvido!
✅ Site funcionando!
✅ CI/CD ativo!
```

---

## 📞 **AJUDA ADICIONAL:**

```
Erro "npm not found"? → FIX_AGORA.md
Comparar soluções? → SOLUCAO_NIXPACKS_VS_DOCKERFILE.md
Outros erros? → ERROS_COMUNS.md
Debug avançado? → DEBUG_DEPLOY.md
```

---

**Imprima este checklist e vá marcando cada item! ✅**
