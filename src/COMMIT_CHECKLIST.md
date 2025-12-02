# ✅ Checklist de Commit - Pesca Lead CRM

## 📋 PRÉ-COMMIT

Execute este checklist ANTES de fazer commit:

### 1. Verificação de Arquivos

```bash
# Execute o script de verificação
bash pre-deploy-check.sh
```

Se o script passar sem erros, continue. Caso contrário, corrija os problemas apontados.

### 2. Arquivos Obrigatórios

Verifique se estes arquivos existem:

- [ ] ✅ `nixpacks.json` existe na raiz
- [ ] ✅ `.nixpacksrc` existe na raiz
- [ ] ✅ `start.sh` existe na raiz
- [ ] ✅ `.dockerignore` existe na raiz
- [ ] ✅ `package.json` tem script "build"
- [ ] ❌ `nixpacks.toml` NÃO existe (deve ser removido)

### 3. Conteúdo dos Arquivos

#### nixpacks.json
```bash
# Deve conter:
grep -q '"providers".*\["node"\]' nixpacks.json && echo "✅ Provider OK" || echo "❌ Provider errado"
grep -q '"nodejs_20"' nixpacks.json && echo "✅ Package OK" || echo "❌ Package errado"
```

#### .nixpacksrc
```bash
# Deve conter:
grep -q '"node"' .nixpacksrc && echo "✅ Provider OK" || echo "❌ Provider errado"
```

### 4. Git Status

```bash
# Ver arquivos modificados
git status

# Deve incluir:
# - nixpacks.json
# - .nixpacksrc
# - start.sh
# - .dockerignore
# - README.md (se modificado)
```

---

## 📝 COMMIT

### Mensagem Recomendada

Escolha UMA das mensagens abaixo:

#### Opção 1: Simples
```bash
git add .
git commit -m "fix: força Node.js no Nixpacks - resolve npm not found"
git push origin main
```

#### Opção 2: Detalhada
```bash
git add .
git commit -m "fix: resolve npm not found configurando Nixpacks

- Adiciona nixpacks.json com provider node
- Adiciona .nixpacksrc para forçar Node.js
- Remove nixpacks.toml que causava conflito
- Adiciona start.sh com validações
- Atualiza documentação de deploy

Closes: npm command not found (exit code 127)
Refs: SOLUCAO_DEFINITIVA_DENO_VS_NODE.md"
git push origin main
```

#### Opção 3: Convencional Commits
```bash
git add .
git commit -m "fix(deploy): força Node.js no Nixpacks

BREAKING CHANGE: Nixpacks agora usa Node.js 20 em vez de detecção automática

- feat: adiciona nixpacks.json e .nixpacksrc
- chore: remove nixpacks.toml obsoleto  
- docs: adiciona guias de deploy completos
- test: adiciona scripts de pré-deploy check"
git push origin main
```

---

## 🔍 PÓS-COMMIT

### 1. Verificar Push

```bash
# Ver último commit
git log -1 --stat

# Deve mostrar os arquivos modificados
```

### 2. Verificar no GitHub/GitLab

Acesse o repositório e confirme:

- [ ] ✅ Commit aparece no histórico
- [ ] ✅ `nixpacks.json` está visível na raiz
- [ ] ✅ `.nixpacksrc` está visível na raiz
- [ ] ✅ `nixpacks.toml` NÃO aparece (foi deletado)

### 3. Webhook do Coolify

O Coolify deve detectar automaticamente o push:

- [ ] ✅ Webhook disparado
- [ ] ✅ Build iniciado automaticamente (OU aguardando)

---

## 🚀 DEPLOY NO COOLIFY

### PASSO CRÍTICO: Limpar Cache (OBRIGATÓRIO!)

⚠️ **SEM ESTE PASSO, O DEPLOY VAI FALHAR!**

1. Acesse o painel do Coolify
2. Vá para sua aplicação
3. **Settings** → **Build** → **"Clear Build Cache"**
4. **Settings** → **Danger Zone** → **"Remove All Build Containers"**
5. Voltar para a tela principal

### Deploy

1. Clique em **"Force Rebuild & Deploy"**
2. ✅ Marque: **"Ignore Cache"**
3. Clique em **"Deploy"**
4. Aguarde ~5 minutos

### Monitorar Logs

Clique em "Show Debug Logs" e procure por:

#### ✅ Sinais de Sucesso:
```json
{
  "providers": ["node"],
  "nixPkgs": ["nodejs_20"]
}
```

```
✅ Found application type: node
✅ npm version: 10.x.x
✅ added 1234 packages
✅ Build successful
✅ Listening on http://localhost:3000/
```

#### ❌ Sinais de Problema:
```json
{
  "NIXPACKS_METADATA": "deno",
  "nixPkgs": ["deno"]
}
```

```
❌ Found application type: deno
❌ npm: command not found
❌ exit code: 127
```

**Se aparecer Deno:** O cache não foi limpo corretamente! Volte e limpe novamente.

---

## ✅ VERIFICAÇÃO FINAL

### 1. Site Online

```bash
# Testar URL
curl -I https://hub.pescalead.com.br

# Deve retornar:
# HTTP/2 200 OK
```

### 2. Health Check

No painel do Coolify:
- [ ] ✅ Status: Running
- [ ] ✅ Health: Healthy
- [ ] ✅ Uptime: > 0%

### 3. Funcionalidade

Acesse `https://hub.pescalead.com.br` e verifique:
- [ ] ✅ Página carrega sem erro
- [ ] ✅ Login funciona
- [ ] ✅ Dashboard aparece
- [ ] ✅ Não há erros no console do navegador

---

## 🎉 SUCESSO!

Se todos os checks acima passaram:

```
┌────────────────────────────────────────┐
│                                        │
│    ✅ DEPLOY BEM-SUCEDIDO! ✅          │
│                                        │
│  🚀 Site: hub.pescalead.com.br         │
│  ✅ Status: Online                     │
│  ✅ Build: Node.js 20                  │
│  ✅ Deploy: Automático                 │
│                                        │
└────────────────────────────────────────┘
```

### Próximos Deploys

Agora que está configurado, os próximos deploys serão automáticos:

```bash
# Qualquer push para main vai deployar automaticamente
git add .
git commit -m "feat: nova funcionalidade"
git push

# Coolify detecta e faz deploy automaticamente!
```

⚠️ **Lembre-se:** Se fizer mudanças no `nixpacks.json`, limpe o cache novamente!

---

## 🆘 SE ALGO DEU ERRADO

### Problema: Build ainda falha com "npm not found"

**Solução:**
1. Confirme que limpou o cache
2. Execute: `bash pre-deploy-check.sh`
3. Veja: [README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md) → Troubleshooting

### Problema: Commit sem os arquivos

**Solução:**
```bash
# Verificar status
git status

# Adicionar arquivos faltantes
git add nixpacks.json .nixpacksrc start.sh

# Fazer novo commit
git commit --amend --no-edit
git push --force-with-lease
```

### Problema: Deno ainda aparece nos logs

**Solução:**
1. Limpar cache NOVAMENTE
2. Stop da aplicação
3. Settings → Danger Zone → "Delete All Build Images"
4. Force Rebuild com "Ignore Cache"

---

## 📚 DOCUMENTAÇÃO

- 📖 [QUICK_FIX_AGORA.md](./QUICK_FIX_AGORA.md) - Solução rápida
- 📖 [README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md) - Guia completo
- 📖 [INDICE_DOCUMENTACAO.md](./INDICE_DOCUMENTACAO.md) - Índice de tudo
- 🔧 [pre-deploy-check.sh](./pre-deploy-check.sh) - Script de verificação

---

**Status**: ✅ Pronto para commit  
**Próxima ação**: Executar os passos acima  
**Tempo estimado**: 10 minutos (commit + deploy)  
**Confiança**: 99%
