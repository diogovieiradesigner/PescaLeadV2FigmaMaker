# 📚 Índice da Documentação - Deploy Pesca Lead CRM

## 🎯 Para Começar Rápido

Se você quer resolver o problema **AGORA** (5 minutos):
- 👉 **[QUICK_FIX_AGORA.md](./QUICK_FIX_AGORA.md)** ⭐ COMECE AQUI!

## 📖 Documentação Principal

### 🚀 Deploy e Configuração

| Arquivo | Descrição | Quando usar |
|---------|-----------|-------------|
| **[README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md)** | Guia completo de deploy com checklist | Primeiro deploy ou troubleshooting |
| **[QUICK_FIX_AGORA.md](./QUICK_FIX_AGORA.md)** | Solução rápida em 5 minutos | Deploy urgente |
| **[SOLUCAO_DEFINITIVA_DENO_VS_NODE.md](./SOLUCAO_DEFINITIVA_DENO_VS_NODE.md)** | Solução técnica completa | Entender o problema a fundo |
| **[coolify.yaml](./coolify.yaml)** | Configuração do Coolify | Referência de configuração |

### 🔧 Configuração Nixpacks

| Arquivo | Descrição | Importância |
|---------|-----------|-------------|
| **[nixpacks.json](./nixpacks.json)** | Config principal Nixpacks | 🔴 CRÍTICO |
| **[.nixpacksrc](./.nixpacksrc)** | Força provider Node | 🟡 IMPORTANTE |
| **[start.sh](./start.sh)** | Script de inicialização | 🟢 RECOMENDADO |

### 📝 Histórico de Problemas

| Arquivo | Descrição | Contexto |
|---------|-----------|----------|
| **[SOLUCAO_NPM_NOT_FOUND.md](./SOLUCAO_NPM_NOT_FOUND.md)** | Primeira tentativa de solução | Histórico |
| **[CORRECAO_NPM_NOT_FOUND.md](./CORRECAO_NPM_NOT_FOUND.md)** | Correções intermediárias | Histórico |

### 🔬 Documentação Técnica

| Arquivo | Descrição | Público |
|---------|-----------|---------|
| **[EXPLICACAO_TECNICA.md](./EXPLICACAO_TECNICA.md)** | Deep dive técnico | Desenvolvedores |
| **[SOLUCAO_DEFINITIVA_DENO_VS_NODE.md](./SOLUCAO_DEFINITIVA_DENO_VS_NODE.md)** | Análise do problema Deno vs Node | DevOps |

### 🛠️ Scripts Auxiliares

| Arquivo | Descrição | Como usar |
|---------|-----------|-----------|
| **[pre-deploy-check.sh](./pre-deploy-check.sh)** | Verifica se tudo está OK antes do deploy | `bash pre-deploy-check.sh` |
| **[verificar-nixpacks.sh](./verificar-nixpacks.sh)** | Valida configuração Nixpacks | `bash verificar-nixpacks.sh` |
| **[test-nixpacks-local.sh](./test-nixpacks-local.sh)** | Testa configuração localmente | `bash test-nixpacks-local.sh` |

## 🗺️ Fluxo de Leitura Recomendado

### Para Deploy Urgente
```
1. QUICK_FIX_AGORA.md
2. pre-deploy-check.sh (executar)
3. Deploy no Coolify
```

### Para Entender o Problema
```
1. SOLUCAO_DEFINITIVA_DENO_VS_NODE.md
2. EXPLICACAO_TECNICA.md
3. README_DEPLOY_FINAL.md
```

### Para Troubleshooting
```
1. pre-deploy-check.sh (executar)
2. README_DEPLOY_FINAL.md → Seção Troubleshooting
3. EXPLICACAO_TECNICA.md → Debugging
```

## 📋 Checklist Rápido

Antes do deploy, confirme:

- [ ] ✅ `nixpacks.json` existe na raiz
- [ ] ✅ `.nixpacksrc` existe na raiz
- [ ] ❌ `nixpacks.toml` NÃO existe
- [ ] ✅ Arquivos commitados no Git
- [ ] ✅ Cache do Coolify limpo
- [ ] ✅ `pre-deploy-check.sh` executado sem erros

## 🎯 Resolução por Sintoma

### Sintoma: "npm: command not found"
**Solução**: [SOLUCAO_DEFINITIVA_DENO_VS_NODE.md](./SOLUCAO_DEFINITIVA_DENO_VS_NODE.md)

### Sintoma: "Found application type: deno"
**Solução**: [QUICK_FIX_AGORA.md](./QUICK_FIX_AGORA.md) → Limpar cache

### Sintoma: "502 Bad Gateway"
**Solução**: [README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md) → Troubleshooting #4

### Sintoma: Build timeout
**Solução**: [README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md) → Troubleshooting #3

### Sintoma: Cache não limpa
**Solução**: [README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md) → Troubleshooting #2

## 🔗 Links Externos Úteis

- [Nixpacks Documentation](https://nixpacks.com/docs)
- [Coolify Documentation](https://coolify.io/docs)
- [Coolify Nixpacks Guide](https://coolify.io/docs/knowledge-base/build-packs/nixpacks)
- [Node.js on Nix](https://search.nixos.org/packages?query=nodejs)

## 📞 Suporte

Se após ler toda a documentação ainda houver problemas:

1. Execute: `bash pre-deploy-check.sh`
2. Leia: [README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md)
3. Verifique: Logs do Coolify (seção "Debug Logs")
4. Confirme: Cache foi limpo (passo mais esquecido!)

## 🏆 Documentos por Prioridade

### 🔴 Crítico (Leia primeiro)
1. QUICK_FIX_AGORA.md
2. README_DEPLOY_FINAL.md

### 🟡 Importante (Recomendado)
3. SOLUCAO_DEFINITIVA_DENO_VS_NODE.md
4. pre-deploy-check.sh (executar)

### 🟢 Opcional (Para referência)
5. EXPLICACAO_TECNICA.md
6. Outros arquivos de histórico

## 📊 Status dos Documentos

| Documento | Status | Última Atualização |
|-----------|--------|-------------------|
| QUICK_FIX_AGORA.md | ✅ Atualizado | 2024-12-02 |
| README_DEPLOY_FINAL.md | ✅ Atualizado | 2024-12-02 |
| SOLUCAO_DEFINITIVA_DENO_VS_NODE.md | ✅ Atualizado | 2024-12-02 |
| EXPLICACAO_TECNICA.md | ✅ Atualizado | 2024-12-02 |
| nixpacks.json | ✅ Configurado | 2024-12-02 |
| .nixpacksrc | ✅ Configurado | 2024-12-02 |

## 🎓 Glossário

- **Nixpacks**: Sistema de build que detecta automaticamente como construir sua aplicação
- **Provider**: Define qual runtime usar (node, deno, python, etc)
- **Cache**: Camadas Docker reutilizadas entre builds
- **Coolify**: Plataforma de deploy self-hosted (alternativa ao Heroku/Vercel)
- **Build pack**: Sistema que converte código em imagem Docker executável

---

**Última atualização**: 2024-12-02  
**Versão da documentação**: 1.0  
**Status do projeto**: ✅ Pronto para deploy
