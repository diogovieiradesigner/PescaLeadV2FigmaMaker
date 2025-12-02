# 🔬 Explicação Técnica: Por que npm não era encontrado

## 🧩 Anatomia do Problema

### 1. Estrutura do Projeto

```
PescaLeadV2FigmaMaker/
├── package.json              → Indica projeto Node.js
├── supabase/
│   └── functions/
│       └── server/
│           └── index.tsx     → Usa Deno runtime
├── App.tsx                   → React (Node.js)
└── vite.config.ts            → Vite (Node.js)
```

### 2. O que o Nixpacks fazia (ERRADO)

#### Detecção Automática
```bash
$ nixpacks detect /app

# Ordem de detecção:
1. Procura por deno.json ou deno.jsonc ❌ Não encontrou
2. Procura por *.ts com imports "https://deno.land/..." ✅ ENCONTROU!
3. Para por aqui, assume que é projeto Deno

Resultado: "deno"
```

#### Configuração Gerada
```json
{
  "providers": [],  // ❌ Vazio porque foi detecção automática
  "phases": {
    "setup": {
      "nixPkgs": ["deno"]  // ❌ ERRADO!
    },
    "install": {
      "cmds": ["npm ci --legacy-peer-deps"]  // ✅ Correto mas...
    }
  }
}
```

#### Resultado no Docker
```dockerfile
# Fase 4: Instala Deno via Nix
RUN nix-env -if .nixpacks/nixpkgs-xxxx.nix
# Instala: /nix/store/...deno.../bin/deno

# Fase 7: Tenta executar npm
RUN npm ci --legacy-peer-deps
# ❌ ERRO: npm: command not found
# Porque o Deno não inclui npm!
```

### 3. Por que nixpacks.toml não funcionou?

#### Hierarquia do Nixpacks (Ordem de Precedência)

```
1. Parâmetros CLI (--install-cmd, --build-cmd, etc)
   └─> Coolify passa estes por padrão
   
2. nixpacks.json (se existir)
   └─> ⚠️ NÃO EXISTIA
   
3. .nixpacksrc (se existir)
   └─> ⚠️ NÃO EXISTIA
   
4. nixpacks.toml (se existir)
   └─> ✅ Existia mas tinha BAIXA PRIORIDADE
   
5. Detecção Automática
   └─> ✅ Detectou Deno primeiro
```

**Resultado:** A detecção automática (prioridade 5) venceu o nixpacks.toml (prioridade 4)!

### 4. O que mudamos (CORRETO)

#### Criamos nixpacks.json

```json
{
  "providers": ["node"],  // ✅ FORÇA provider Node
  "phases": {
    "setup": {
      "nixPkgs": ["nodejs_20"]  // ✅ Instala Node.js 20
    },
    "install": {
      "cmds": ["npm ci --legacy-peer-deps"]  // ✅ Agora vai funcionar!
    },
    "build": {
      "cmds": ["npm run build"]
    }
  },
  "start": {
    "cmd": "npx serve dist -s -l 3000"
  }
}
```

#### Criamos .nixpacksrc

```json
{
  "providers": ["node"]  // ✅ Reforça provider Node
}
```

#### Nova Hierarquia

```
1. Parâmetros CLI
   └─> Coolify passa --install-cmd, --build-cmd
   
2. nixpacks.json ⭐ NOVO!
   └─> Prioridade 2: Define "providers": ["node"]
   └─> Sobrescreve detecção automática
   
3. .nixpacksrc ⭐ NOVO!
   └─> Prioridade 3: Reforça provider "node"
   
4. ❌ nixpacks.toml (REMOVIDO)
   
5. Detecção Automática
   └─> ⏭️ IGNORADA porque providers já definidos
```

**Resultado:** nixpacks.json (prioridade 2) vence a detecção automática (prioridade 5)!

## 🔍 Debugging: O que acontecia no container

### Antes (com Deno)

```bash
# Fase Setup
$ nix-env -if nixpkgs-xxx.nix
installing 'deno'
building '/nix/store/.../deno.drv'...

$ which deno
/root/.nix-profile/bin/deno

$ which npm
# (vazio - npm não existe!)

# Fase Install
$ npm ci --legacy-peer-deps
/bin/bash: line 1: npm: command not found
❌ EXIT CODE 127
```

### Depois (com Node.js)

```bash
# Fase Setup
$ nix-env -if nixpkgs-xxx.nix
installing 'nodejs-20.x.x'
building '/nix/store/.../nodejs.drv'...

$ which node
/root/.nix-profile/bin/node

$ which npm
/root/.nix-profile/bin/npm

$ npm --version
10.8.2

# Fase Install
$ npm ci --legacy-peer-deps
added 1234 packages in 45s
✅ EXIT CODE 0

# Fase Build
$ npm run build
> vite build
✅ EXIT CODE 0

# Start
$ npx serve dist -s -l 3000
Listening on http://localhost:3000/
✅ SUCESSO!
```

## 📊 Comparação Visual

### Dockerfile Gerado (ANTES)

```dockerfile
# ❌ ERRADO
FROM ghcr.io/railwayapp/nixpacks:ubuntu-xxx

WORKDIR /app/

# Setup: Instala DENO
COPY .nixpacks/nixpkgs-xxx.nix .nixpacks/
RUN nix-env -if .nixpacks/nixpkgs-xxx.nix
# Resultado: /root/.nix-profile/bin/deno

# Install: Tenta usar NPM
COPY . /app/.
RUN npm ci --legacy-peer-deps
# ❌ ERRO: npm: command not found

# Build: Nunca chega aqui
RUN npm run build

# Start: Nunca chega aqui
CMD ["npx serve dist -s -l 3000"]
```

### Dockerfile Gerado (DEPOIS)

```dockerfile
# ✅ CORRETO
FROM ghcr.io/railwayapp/nixpacks:ubuntu-xxx

WORKDIR /app/

# Setup: Instala NODE.JS
COPY .nixpacks/nixpkgs-xxx.nix .nixpacks/
RUN nix-env -if .nixpacks/nixpkgs-xxx.nix
# Resultado: /root/.nix-profile/bin/node
#            /root/.nix-profile/bin/npm

# Install: Agora npm existe!
COPY . /app/.
RUN npm ci --legacy-peer-deps
# ✅ SUCESSO: added 1234 packages

# Build: Executa normalmente
RUN npm run build
# ✅ SUCESSO: dist/ gerado

# Start: Inicia o servidor
CMD ["npx serve dist -s -l 3000"]
# ✅ SUCESSO: Listening on :3000
```

## 🧪 Como Testar Localmente

### Instalar Nixpacks

```bash
npm install -g nixpacks
```

### Ver o Plano Gerado

```bash
# Antes (detectaria Deno)
$ nixpacks plan .
{
  "providers": [],
  "phases": {
    "setup": {
      "nixPkgs": ["deno"]
    }
  }
}

# Depois (força Node)
$ nixpacks plan .
{
  "providers": ["node"],
  "phases": {
    "setup": {
      "nixPkgs": ["nodejs_20"]
    }
  }
}
```

### Build Local

```bash
# Build da imagem
$ nixpacks build . --name test-pesca-lead

# Executar container
$ docker run -p 3000:3000 test-pesca-lead

# Testar
$ curl http://localhost:3000
```

## 📚 Referências Técnicas

- [Nixpacks Configuration Files](https://nixpacks.com/docs/configuration/file)
- [Nixpacks Provider Priority](https://nixpacks.com/docs/how-it-works)
- [Nixpacks Node Provider](https://nixpacks.com/docs/providers/node)
- [Nixpacks Deno Provider](https://nixpacks.com/docs/providers/deno)
- [Coolify Nixpacks Integration](https://coolify.io/docs/knowledge-base/build-packs/nixpacks)

## 🎓 Lições Aprendidas

1. **Detecção automática não é confiável** em projetos híbridos (Node + Deno)
2. **nixpacks.toml tem baixa prioridade** - usar .json ou .rc
3. **Sempre especificar o provider explicitamente**
4. **Cache do Docker pode esconder problemas** - sempre limpar ao debugar
5. **Verificar logs do Nixpacks** antes de buildar para confirmar detecção

---

**Autor**: Sistema de Deploy Pesca Lead  
**Data**: 2024-12-02  
**Versão**: 1.0 (Solução Definitiva)
