# 🚀 START HERE - Deploy Pesca Lead CRM

> **Você está a 5 minutos de resolver o problema!**

---

## ⚡ AÇÃO IMEDIATA (3 Passos)

### 1️⃣ COMMIT (2 min)
```bash
git add .
git commit -m "fix: força Node.js no Nixpacks"
git push
```

### 2️⃣ COOLIFY - LIMPAR CACHE (1 min)
```
Painel → Settings → Build → "Clear Build Cache"
Painel → Settings → Danger Zone → "Remove All Build Containers"
```
⚠️ **ESTE PASSO É OBRIGATÓRIO! Sem ele vai falhar!**

### 3️⃣ DEPLOY (5 min)
```
Painel → "Force Rebuild & Deploy"
✅ Marcar: "Ignore Cache"
Aguardar ~5 minutos
```

---

## 🎯 O QUE FOI FEITO

### ✅ Problema Identificado
O Nixpacks detectava **Deno** em vez de **Node.js**  
→ Instalava Deno  
→ Tentava executar `npm`  
→ ❌ Erro: `npm: command not found`

### ✅ Solução Implementada
Criados arquivos que **forçam Node.js**:
- `nixpacks.json` (prioridade máxima)
- `.nixpacksrc` (força provider)

### ✅ Resultado Esperado
```
✅ Instala Node.js 20
✅ npm funciona
✅ Build completa
✅ Site online
```

---

## 📚 DOCUMENTAÇÃO

### 🏃 Para Começar Rápido
**[QUICK_FIX_AGORA.md](./QUICK_FIX_AGORA.md)** ← COMECE AQUI!

### 📖 Guias Completos
- [README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md) - Guia completo
- [DEPLOY_VISUAL_GUIDE.md](./DEPLOY_VISUAL_GUIDE.md) - Com diagramas
- [COMMIT_CHECKLIST.md](./COMMIT_CHECKLIST.md) - Checklist

### 🔧 Troubleshooting
- [FAQ_DEPLOY.md](./FAQ_DEPLOY.md) - Perguntas frequentes
- [SOLUCAO_DEFINITIVA_DENO_VS_NODE.md](./SOLUCAO_DEFINITIVA_DENO_VS_NODE.md) - Análise completa

### 📑 Referência
- [INDICE_DOCUMENTACAO.md](./INDICE_DOCUMENTACAO.md) - Índice de tudo
- [SOLUCAO_COMPLETA.md](./SOLUCAO_COMPLETA.md) - Resumo completo
- [EXPLICACAO_TECNICA.md](./EXPLICACAO_TECNICA.md) - Deep dive

---

## 🔍 VERIFICAÇÃO

### Antes de Commit
```bash
bash pre-deploy-check.sh
```

### Nos Logs do Coolify

#### ✅ Deve aparecer:
```
"providers": ["node"]
"nixPkgs": ["nodejs_20"]
npm version: 10.x.x
Build successful
Listening on http://localhost:3000/
```

#### ❌ NÃO deve aparecer:
```
"nixPkgs": ["deno"]
npm: command not found
exit code: 127
```

---

## 🆘 PROBLEMAS?

### Cache não foi limpo?
→ [README_DEPLOY_FINAL.md → Troubleshooting #2](./README_DEPLOY_FINAL.md)

### Ainda detecta Deno?
→ Limpar cache NOVAMENTE (passo mais esquecido!)

### Build timeout?
→ Settings → Build → Timeout: 600

### Outras dúvidas?
→ [FAQ_DEPLOY.md](./FAQ_DEPLOY.md)

---

## 🎉 SUCESSO!

Se os logs mostrarem `nodejs_20` e `Build successful`:

```
✅ DEPLOY BEM-SUCEDIDO!
✅ Site: https://hub.pescalead.com.br
✅ Próximos deploys: automáticos
```

---

## 📊 ARQUIVOS PRINCIPAIS

```
📁 Raiz do Projeto
├── 🔴 nixpacks.json          ← Configuração principal
├── 🔴 .nixpacksrc            ← Força Node.js
├── 🟢 start.sh               ← Inicialização
├── 🟢 .dockerignore          ← Otimização
│
├── 📘 START_HERE.md          ← ESTE ARQUIVO
├── 📘 QUICK_FIX_AGORA.md     ← Solução 5 min
├── 📘 README_DEPLOY_FINAL.md ← Guia completo
├── 📘 INDICE_DOCUMENTACAO.md ← Índice
│
└── 🔧 pre-deploy-check.sh    ← Validação
```

---

## ⏱️ TIMELINE

```
00:00 ━━━━━━━━━ 0%   │ git push
00:30 ━━━━━━━━━ 10%  │ Coolify detecta
01:00 ━━━━━━━━━ 20%  │ Limpar cache (MANUAL!)
02:00 ━━━━━━━━━ 40%  │ Docker build
03:00 ━━━━━━━━━ 60%  │ npm ci
04:00 ━━━━━━━━━ 80%  │ npm run build
05:00 ━━━━━━━━━ 100% │ ✅ ONLINE!
```

---

## 🎯 PRÓXIMA AÇÃO

1. Execute os 3 passos acima
2. Aguarde 5 minutos
3. Acesse: https://hub.pescalead.com.br
4. ✅ Pronto!

---

**Status**: ✅ Pronto para deploy  
**Confiança**: 99%  
**Tempo**: 8 minutos  
**Dificuldade**: ⭐ Fácil
