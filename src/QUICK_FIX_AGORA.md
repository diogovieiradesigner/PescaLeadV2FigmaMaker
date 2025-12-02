# ⚡ QUICK FIX - EXECUTE AGORA!

## 🔴 O PROBLEMA

O Nixpacks estava instalando **Deno** em vez de **Node.js**, por isso `npm: command not found`.

## ✅ A SOLUÇÃO (JÁ APLICADA)

Criados 2 arquivos que FORÇAM o uso de Node.js:
- ✅ `nixpacks.json` (prioridade máxima)
- ✅ `.nixpacksrc` (força provider node)
- ❌ `nixpacks.toml` (removido - causava conflito)

## 🚀 PASSOS PARA DEPLOY (5 MINUTOS)

### 1️⃣ COMMIT (Execute no terminal)

```bash
git add .
git commit -m "fix: força Node.js no Nixpacks (resolve npm not found)"
git push
```

### 2️⃣ COOLIFY - LIMPAR CACHE (OBRIGATÓRIO!)

**Painel do Coolify → Sua Aplicação:**

1. Clique em **"Stop"**
2. Settings → Build → **"Clear Build Cache"**
3. Settings → Danger Zone → **"Remove All Build Containers"**

### 3️⃣ COOLIFY - DEPLOY

1. Clique em **"Force Rebuild & Deploy"**
2. ✅ Marque: **"Ignore Cache"**
3. Clique em **"Deploy"**

### 4️⃣ VERIFICAR LOGS

**O que você DEVE ver nos logs:**

```
✅ "providers": ["node"]
✅ "nixPkgs": ["nodejs_20"]
✅ npm version: 10.x.x
✅ npm ci --legacy-peer-deps ... done
✅ npm run build ... done
✅ Listening on http://localhost:3000/
```

**O que você NÃO DEVE ver:**

```
❌ "NIXPACKS_METADATA": "deno"
❌ "nixPkgs": ["deno"]
❌ Found application type: deno
❌ npm: command not found
```

## ⏱️ TIMELINE ESPERADO

```
00:00 - Commit e push
00:30 - Coolify detecta mudanças
01:00 - Limpar cache manualmente
01:30 - Iniciar Force Rebuild
02:00 - Download imagem Nixpacks
03:00 - Instalar nodejs_20 via Nix
04:00 - npm ci --legacy-peer-deps
04:30 - npm run build
05:00 - ✅ DEPLOY CONCLUÍDO!
```

## 🆘 SE AINDA DER ERRO

### Erro: Ainda detecta Deno

**Solução:**
```bash
# Verificar se arquivos foram commitados
git log -1 --name-only

# Deve aparecer:
# nixpacks.json
# .nixpacksrc
```

Se não aparecerem, rode novamente:
```bash
git add nixpacks.json .nixpacksrc
git commit -m "fix: adiciona configuração Nixpacks"
git push
```

### Erro: Cache não foi limpo

**No Coolify:**
- Settings → Danger Zone
- **"Stop & Delete Everything"**
- Depois: **"Force Rebuild & Deploy"**

### Erro: Build timeout

**Aumente o timeout:**
- Settings → Build
- Build Timeout: `600` (10 minutos)

## 📞 SUPORTE

Se após seguir TODOS os passos ainda houver erro:

1. **Tire screenshot completo dos logs**
2. **Verifique se limpou o cache**
3. **Confirme que os arquivos estão no Git**

## 🎯 RESULTADO FINAL

Após o deploy com sucesso:

```
✅ Aplicação rodando na porta 3000
✅ Node.js 20 instalado
✅ npm funcionando
✅ Build concluído
✅ Sem erro 502
✅ Site acessível em: https://hub.pescalead.com.br
```

---

**⚠️ CRÍTICO: NÃO pule a etapa de LIMPAR CACHE! É obrigatória!**

**Data**: 2024-12-02  
**Tempo estimado**: 5 minutos  
**Dificuldade**: ⭐ Fácil (apenas seguir os passos)
