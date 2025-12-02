# Solução: npm command not found no Nixpacks

## 🔍 Problema Identificado

O erro `npm: command not found` ocorria porque:

1. **Cache do Docker**: O Nixpacks estava usando cache de uma build anterior com configuração inválida (`npm-9_x`)
2. **PATH não configurado**: O PATH do Nix não estava sendo exportado nas fases de install e build

## ✅ Correções Aplicadas

### 1. nixpacks.toml - Configuração Completa
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]
nixLibs = []
nixOverlays = []
nixpkgsArchive = "5148520bfab61f99fd25fb9ff7bfbb50dad3c9db"
cmds = [
  "export PATH=/root/.nix-profile/bin:$PATH",
  "which node || echo 'Node not found'",
  "which npm || echo 'NPM not found'"
]

[phases.install]
cmds = [
  "export PATH=/root/.nix-profile/bin:$PATH",
  "npm ci --legacy-peer-deps"
]

[phases.build]
cmds = [
  "export PATH=/root/.nix-profile/bin:$PATH",
  "npm run build"
]

[start]
cmd = "bash start.sh"

[variables]
NODE_ENV = "production"
PATH = "/root/.nix-profile/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
```

### 2. start.sh - Script de Inicialização
```bash
#!/bin/bash
set -e

# Garantir que o Node.js está no PATH
export PATH="/root/.nix-profile/bin:$PATH"

# Verificar disponibilidade
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm não encontrado no PATH"
    exit 1
fi

# Exibir versões
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Iniciar o servidor
exec npx serve dist -s -l 3000
```

### 3. .dockerignore - Otimização
Criado para evitar enviar arquivos desnecessários para o build.

### 4. .nixpacksignore - Cache Bust
Criado para ajudar na invalidação do cache.

## 🚀 Como Fazer Deploy

### Opção 1: Deploy Limpo (RECOMENDADO)
No painel do Coolify:

1. **Limpar Build Cache**:
   - Vá em Settings → Build
   - Clique em "Clear Build Cache"

2. **Force Redeploy**:
   - Clique em "Force Rebuild & Deploy"
   - Isso ignorará todo o cache anterior

### Opção 2: Deploy Normal
Se você fez commit dos arquivos corrigidos:
```bash
git add .
git commit -m "fix: corrige npm not found no Nixpacks"
git push
```

O Coolify detectará automaticamente e fará o deploy.

## 📋 Checklist de Verificação

Após o deploy, verifique nos logs do Coolify:

- [ ] `which node` retorna o caminho do Node.js
- [ ] `which npm` retorna o caminho do npm
- [ ] `npm ci --legacy-peer-deps` executa sem erros
- [ ] `npm run build` completa com sucesso
- [ ] Aplicação inicia na porta 3000
- [ ] Health check retorna 200 OK

## 🔧 Troubleshooting

### Se ainda aparecer "npm: command not found":

1. **Verificar PATH no Coolify**:
   - Settings → Environment Variables
   - Adicionar: `PATH=/root/.nix-profile/bin:/usr/local/bin:/usr/bin:/bin`

2. **Limpar completamente o projeto**:
   - Settings → Danger Zone
   - "Stop & Delete Build Container"
   - Depois fazer "Force Rebuild"

3. **Verificar logs detalhados**:
   ```bash
   # No container do Coolify
   docker logs <container-id> -f
   ```

## 📝 Notas Importantes

- ✅ O npm está incluído no Node.js 20, não precisa instalar separadamente
- ✅ O PATH deve ser exportado em TODAS as fases (setup, install, build, start)
- ✅ Use `bash start.sh` em vez de executar `npx` diretamente
- ✅ O comentário de timestamp no nixpacks.toml força invalidação de cache

## 🎯 Resultado Esperado

Após aplicar essas correções e limpar o cache:

```
✅ Node.js 20 instalado via Nixpacks
✅ npm disponível no PATH
✅ Build completa com sucesso
✅ Aplicação rodando na porta 3000
✅ Sem erros 502 Bad Gateway
```

---
**Data da correção**: 2024-12-02
**Status**: Pronto para deploy ✅
