# ⚡ DEPLOY AGORA - 2 MINUTOS

## ✅ **STATUS: Tudo Corrigido!**

```
✓ Dockerfile correto (arquivo, não pasta)
✓ nginx.conf presente
✓ .dockerignore presente
✓ nixpacks.toml presente
```

---

## 🚀 **3 PASSOS:**

### **1. Commit (30 segundos):**

```bash
git add .
git commit -m "fix: corrigir Dockerfile para deploy"
git push origin main
```

### **2. Aguardar (1 minuto):**

```
⏱️ Aguardar GitHub processar o push...
```

### **3. Deploy no Coolify (30 segundos):**

```
1. Abrir Coolify
2. Applications → Pesca Lead
3. Deploy (ou Force Rebuild + Deploy)
4. Aguardar 5 minutos
```

---

## ✅ **CONFIGURAÇÃO DO COOLIFY:**

Verifique se está assim:

```
Repository: diogovieiradesigner/PescaLeadV2FigmaMaker
Branch: main
Build Pack: Dockerfile  ← IMPORTANTE!
Port: 80                ← IMPORTANTE!
Base Directory: /
```

---

## 📊 **O QUE VAI ACONTECER:**

```bash
✓ Git push → GitHub
✓ Coolify detecta push
✓ Clone do repositório
✓ Encontra Dockerfile (arquivo)
✓ Stage 1: npm ci + npm run build
✓ Stage 2: Copia para Nginx
✓ Container iniciado na porta 80
✓ Deploy completo!
✓ Site no ar em http://IP-DO-SERVIDOR
```

---

## 🎉 **RESULTADO:**

```
✅ Pesca Lead CRM funcionando
✅ Imagem: ~50MB
✅ Servidor: Nginx
✅ Performance: Máxima
✅ SSL: Automático (com domínio)
✅ CI/CD: Ativo
```

---

## ⚠️ **SE DER ERRO:**

### **Erro: "Dockerfile not found"**
```bash
# Verificar se commitou:
git log --oneline -1
git ls-tree -r HEAD | grep Dockerfile

# Se não aparecer:
git add Dockerfile
git commit -m "fix: adicionar Dockerfile"
git push
```

### **Erro: "Cannot connect to port 80"**
```
Coolify → Configuration
Port: 80 (não 3000!)
Save → Deploy
```

### **Erro: "npm: command not found"**
```
Coolify → Configuration
Build Pack: Dockerfile (não Nixpacks!)
Save → Deploy
```

---

## 📚 **MAIS INFO:**

- **Erro Dockerfile era pasta:** `FIX_DOCKERFILE_PASTA.md`
- **Erro npm not found:** `FIX_AGORA.md`
- **Comparação completa:** `SOLUCAO_NIXPACKS_VS_DOCKERFILE.md`
- **Todos os erros:** `ERROS_COMUNS.md`
- **Índice completo:** `INDICE_DEPLOY.md`

---

## 🎯 **COMANDOS COMPLETOS:**

```bash
# 1. Commit e push
git add .
git commit -m "fix: corrigir Dockerfile para deploy"
git push origin main

# 2. Aguardar 1 minuto
sleep 60

# 3. Fazer deploy no Coolify
# (via interface web)
```

---

## ✅ **CHECKLIST:**

```
- [ ] Executado: git add .
- [ ] Executado: git commit -m "..."
- [ ] Executado: git push
- [ ] Aguardado 1 minuto
- [ ] Coolify → Build Pack = Dockerfile
- [ ] Coolify → Port = 80
- [ ] Clicado em Deploy
- [ ] Aguardando logs...
- [ ] ✅ Deploy completo!
```

---

**FAÇA AGORA! Tudo está pronto! 🚀🐟**

```bash
git add .
git commit -m "fix: Dockerfile corrigido"
git push

# Depois: Coolify → Deploy → ✅ Pronto em 5 min!
```
