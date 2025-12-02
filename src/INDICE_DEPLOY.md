# 📚 Índice de Documentação - Deploy Coolify

## ⚡ **ERRO: "npm: command not found"?** → Leia [FIX_AGORA.md](./FIX_AGORA.md)

---

## 🚀 Início Rápido (Escolha um)

### 0. **URGENTE: Erro "npm: command not found"** 🔥
📄 **[FIX_AGORA.md](./FIX_AGORA.md)** ⭐ **LEIA ISTO PRIMEIRO!**
- Erro resolvido em 2 minutos
- 2 soluções prontas
- Dockerfile vs Nixpacks

### 1. **Super Rápido (5 minutos)** ⚡
📄 **[DEPLOY_AGORA.md](./DEPLOY_AGORA.md)**
- 3 passos simples
- Comandos diretos
- Para quem tem pressa

### 2. **Quick Start (10 minutos)** 🏃
📄 **[QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md)**
- Deploy completo em 10 min
- Inclui configuração de domínio
- Para primeira vez

### 3. **Passo a Passo Detalhado (30 minutos)** 📖
📄 **[CONFIGURAR_COOLIFY.md](./CONFIGURAR_COOLIFY.md)**
- Instruções completas e detalhadas
- Troubleshooting incluído
- Para entender tudo

---

## 🔧 Quando Algo Der Errado

### 1. **Erro "npm: command not found"** 🔥
📄 **[FIX_AGORA.md](./FIX_AGORA.md)** ⭐ **COMECE AQUI!**
- Solução em 2 minutos
- Dockerfile ou Nixpacks
- Ambas as soluções prontas

### 2. **Nixpacks vs Dockerfile (Comparação)** 📊
📄 **[SOLUCAO_NIXPACKS_VS_DOCKERFILE.md](./SOLUCAO_NIXPACKS_VS_DOCKERFILE.md)**
- Comparação detalhada
- Qual escolher e por quê
- Instruções para ambos

### 3. **Erros Comuns (Outros erros)** ❌
📄 **[ERROS_COMUNS.md](./ERROS_COMUNS.md)**
- 15+ erros mais comuns
- Soluções rápidas
- Checklist de verificação

### 4. **Debug Avançado** 🔍
📄 **[DEBUG_DEPLOY.md](./DEBUG_DEPLOY.md)**
- Comandos Docker
- Logs detalhados
- Debug via SSH
- Para problemas complexos

---

## ✅ Planejamento e Verificação

### 1. **Checklist Completo** 📋
📄 **[DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)**
- 100+ itens para verificar
- Antes, durante e depois do deploy
- Garantir que nada foi esquecido

### 2. **Guia Completo Original** 📚
📄 **[DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md)**
- Documentação completa e detalhada
- Todos os aspectos do deploy
- Referência técnica

---

## 📖 Informações Gerais

### 1. **README Principal** 📄
📄 **[README.md](./README.md)**
- Sobre o projeto
- Stack tecnológica
- Estrutura de arquivos

### 2. **Deploy Overview** 🎯
📄 **[README_DEPLOY.md](./README_DEPLOY.md)**
- Visão técnica do deploy
- Otimizações aplicadas
- Performance esperada

---

## 🎯 Fluxograma de Decisão

```
┌─────────────────────────┐
│   Primeiro Deploy?      │
└───────────┬─────────────┘
            │
     ┌──────┴──────┐
     │   SIM       │   NÃO
     │             │
     ▼             ▼
┌─────────┐   ┌─────────┐
│ DEPLOY_ │   │ Deu     │
│ AGORA   │   │ erro?   │
└─────────┘   └────┬────┘
                   │
            ┌──────┴──────┐
            │   SIM       │   NÃO
            │             │
            ▼             ▼
       ┌─────────┐   ┌─────────┐
       │ ERROS_  │   │ CI/CD   │
       │ COMUNS  │   │ Config  │
       └─────────┘   └─────────┘
```

---

## 📂 Arquivos Técnicos (Não Ler - Apenas Referência)

### Configuração do Projeto:
- `package.json` - Dependências
- `vite.config.ts` - Config Vite
- `tsconfig.json` - Config TypeScript
- `.env.example` - Template de env vars

### Deploy:
- `Dockerfile` - Build Docker (multi-stage)
- `nginx.conf` - Servidor web
- `.dockerignore` - Arquivos ignorados
- `.gitignore` - Arquivos Git
- `coolify.yaml` - Config Coolify (opcional)

### HTML/JS:
- `index.html` - HTML principal
- `main.tsx` - Entry point React
- `App.tsx` - Componente root

---

## 🎓 Como Usar Este Índice

### **Cenário 1: Primeira vez fazendo deploy**
```
1. Ler: DEPLOY_AGORA.md (5 min)
2. Seguir os 3 passos
3. Se der erro: ERROS_COMUNS.md
```

### **Cenário 2: Deploy deu erro**
```
1. Abrir: ERROS_COMUNS.md
2. Procurar o erro específico
3. Seguir a solução
4. Se não resolver: DEBUG_DEPLOY.md
```

### **Cenário 3: Quer entender tudo**
```
1. Ler: CONFIGURAR_COOLIFY.md (30 min)
2. Ler: DEPLOY_CHECKLIST.md
3. Seguir passo a passo
```

### **Cenário 4: Deploy funcionou, agora manutenção**
```
1. CI/CD já está automático
2. git push → redeploy automático
3. Se algo quebrar: ERROS_COMUNS.md
```

---

## 🔥 Top 3 Documentos Mais Importantes

### 🥇 **1. DEPLOY_AGORA.md**
Para fazer o deploy rápido

### 🥈 **2. ERROS_COMUNS.md**
Para resolver 99% dos problemas

### 🥉 **3. CONFIGURAR_COOLIFY.md**
Para entender o processo completo

---

## ⚠️ Aviso Importante

**ANTES DE FAZER DEPLOY:**
```
✅ Build Pack = Dockerfile (NÃO Nixpacks)
✅ Todas env vars configuradas
✅ Supabase funcionando
```

**SE DER ERRO:**
```
1° → ERROS_COMUNS.md
2° → DEBUG_DEPLOY.md
3° → Pedir ajuda com logs
```

---

## 📊 Resumo dos Documentos

| Arquivo | Tamanho | Tempo Leitura | Quando Usar |
|---------|---------|---------------|-------------|
| DEPLOY_AGORA.md | Pequeno | 5 min | Deploy rápido |
| QUICK_START_DEPLOY.md | Médio | 10 min | Primeira vez |
| CONFIGURAR_COOLIFY.md | Grande | 30 min | Detalhes completos |
| ERROS_COMUNS.md | Médio | 15 min | Quando der erro |
| DEBUG_DEPLOY.md | Grande | - | Referência |
| DEPLOY_CHECKLIST.md | Grande | - | Verificação |

---

## 🎯 Caminho Recomendado

```bash
# Para 90% dos usuários:
1. DEPLOY_AGORA.md          (fazer deploy)
2. ERROS_COMUNS.md          (se der erro)
3. Pronto! ✅

# Para 10% que querem detalhes:
1. CONFIGURAR_COOLIFY.md    (ler tudo)
2. DEPLOY_CHECKLIST.md      (verificar)
3. DEPLOY_AGORA.md          (fazer deploy)
4. Pronto! ✅
```

---

## 💡 Dicas Finais

### ✅ Faça (Do's):
- Leia DEPLOY_AGORA.md antes de começar
- Configure Build Pack = Dockerfile
- Adicione TODAS as env vars
- Teste localmente antes (opcional)

### ❌ Não Faça (Don'ts):
- Não use Nixpacks
- Não esqueça env vars
- Não faça deploy sem ler DEPLOY_AGORA.md
- Não ignore erros de build

---

## 🆘 Precisa de Ajuda?

```
1. Verificou ERROS_COMUNS.md? ← Comece aqui
2. Testou DEBUG_DEPLOY.md?
3. Leu CONFIGURAR_COOLIFY.md?
4. Ainda precisa? → Envie logs completos
```

---

## 🎉 Resultado Final

Seguindo qualquer um dos guias acima, você terá:

```
✅ Pesca Lead CRM no ar
✅ SSL configurado
✅ CI/CD automático
✅ Zero-downtime deploys
✅ Performance otimizada
✅ Monitoramento ativo

Tempo: 5-30 minutos (depende do guia escolhido)
```

---

**Escolha seu guia e comece o deploy agora! 🚀🐟**
