# 🎯 SOLUÇÃO DEFINITIVA: Deno vs Node.js no Nixpacks

## 🔴 PROBLEMA CRÍTICO IDENTIFICADO

O Nixpacks estava detectando o projeto como **Deno** em vez de **Node.js**:

```json
{
  "NIXPACKS_METADATA": "deno",
  "setup": {
    "nixPkgs": ["deno"]  // ❌ ERRADO! Deveria ser nodejs_20
  }
}
```

### Por que isso acontecia?

1. **Arquivos Deno no projeto**: A pasta `/supabase/functions/` contém arquivos `.ts` com imports Deno
2. **Detecção automática do Nixpacks**: Detectou Deno ANTES de detectar Node.js
3. **nixpacks.toml ignorado**: O arquivo `.toml` tem baixa prioridade na hierarquia do Nixpacks

### Hierarquia de Configuração do Nixpacks:
```
1. nixpacks.json       ⭐ PRIORIDADE MÁXIMA
2. .nixpacksrc         ⭐ FORÇA O PROVIDER
3. Parâmetros CLI      
4. nixpacks.toml       ❌ Baixa prioridade
5. Detecção automática ❌ Estava escolhendo Deno
```

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. Criado `nixpacks.json` (Prioridade Máxima)

```json
{
  "providers": ["node"],
  "phases": {
    "setup": {
      "nixPkgs": ["nodejs_20"],
      "nixLibs": [],
      "nixOverlays": [],
      "nixpkgsArchive": "5148520bfab61f99fd25fb9ff7bfbb50dad3c9db"
    },
    "install": {
      "cmds": [
        "npm ci --legacy-peer-deps"
      ]
    },
    "build": {
      "cmds": [
        "npm run build"
      ]
    }
  },
  "start": {
    "cmd": "npx serve dist -s -l 3000"
  }
}
```

### 2. Criado `.nixpacksrc` (Força Provider)

```json
{
  "providers": ["node"]
}
```

### 3. Removido `nixpacks.toml`

O arquivo `.toml` foi removido pois causava conflito e tinha baixa prioridade.

## 🚀 COMO FAZER O DEPLOY

### Opção 1: Deploy Limpo (OBRIGATÓRIO DESTA VEZ)

**No painel do Coolify:**

1. **Stop da aplicação**:
   - Clique em "Stop"
   - Aguarde parar completamente

2. **Limpar Build Cache**:
   - Settings → Build
   - "Clear Build Cache"

3. **Limpar Docker Layers**:
   - Settings → Danger Zone  
   - "Remove All Build Containers"

4. **Force Rebuild**:
   - "Force Rebuild & Deploy"
   - Marque: "Ignore Cache"

### Opção 2: Via Git (após limpar cache)

```bash
git add .
git commit -m "fix: força Node.js em vez de Deno no Nixpacks"
git push
```

## 📊 RESULTADO ESPERADO NOS LOGS

### ❌ ANTES (Errado):
```
"NIXPACKS_METADATA": "deno",
"setup": {
  "nixPkgs": ["deno"]
}
Found application type: deno.
```

### ✅ DEPOIS (Correto):
```
"providers": ["node"],
"setup": {
  "nixPkgs": ["nodejs_20"]
}
Found application type: node.
npm version: 10.x.x
node version: 20.x.x
```

## 🔍 VERIFICAÇÃO PÓS-DEPLOY

Nos logs do Coolify, procure por:

```
✅ "providers": ["node"]
✅ "nixPkgs": ["nodejs_20"]
✅ npm version: 10.x.x
✅ npm ci --legacy-peer-deps (sucesso)
✅ npm run build (sucesso)
✅ Listening on http://localhost:3000/
```

## 🛠️ TROUBLESHOOTING

### Se ainda detectar Deno:

1. **Verificar se os arquivos foram commitados**:
   ```bash
   git status
   # Deve mostrar nixpacks.json e .nixpacksrc
   ```

2. **Forçar cache limpo via CLI** (se tiver acesso SSH ao Coolify):
   ```bash
   docker system prune -af --volumes
   ```

3. **Verificar no repositório Git**:
   - Os arquivos `nixpacks.json` e `.nixpacksrc` devem estar na raiz
   - O arquivo `nixpacks.toml` NÃO deve existir

4. **Última alternativa - Build local**:
   ```bash
   # Testar localmente
   npx nixpacks build . --name test-build
   
   # Ver o plano gerado
   npx nixpacks plan .
   ```

### Se npm ainda não for encontrado:

Adicione ao `nixpacks.json` na fase setup:

```json
"setup": {
  "nixPkgs": ["nodejs_20"],
  "aptPkgs": ["curl", "wget"],
  "cmds": [
    "which node",
    "which npm"
  ]
}
```

## 📝 ARQUIVOS MODIFICADOS

```
✅ Criado:  nixpacks.json
✅ Criado:  .nixpacksrc
❌ Removido: nixpacks.toml
✅ Mantido:  start.sh
✅ Mantido:  .dockerignore
✅ Mantido:  .nixpacksignore
```

## 🎯 POR QUE ISSO VAI FUNCIONAR

1. **`nixpacks.json` tem prioridade sobre tudo** - anula a detecção automática
2. **`.nixpacksrc` força o provider "node"** - garante que mesmo se detectar Deno, usará Node
3. **Remoção do `.toml`** - elimina conflitos de configuração
4. **Cache limpo** - força regeneração completa do Dockerfile

## 🔗 REFERÊNCIAS

- [Nixpacks Configuration Priority](https://nixpacks.com/docs/configuration/file)
- [Nixpacks Node Provider](https://nixpacks.com/docs/providers/node)
- [Nixpacks Deno Provider](https://nixpacks.com/docs/providers/deno)

---

**Data**: 2024-12-02  
**Status**: ✅ SOLUÇÃO DEFINITIVA  
**Prioridade**: 🔴 CRÍTICA

## ⚠️ AÇÃO IMEDIATA NECESSÁRIA

1. ✅ Commit dos novos arquivos
2. 🔄 Limpar cache no Coolify (OBRIGATÓRIO)
3. 🚀 Force rebuild com "Ignore Cache"
4. 👀 Verificar logs: deve aparecer "nodejs_20" e não "deno"

**SEM LIMPAR O CACHE, NÃO VAI FUNCIONAR!**
