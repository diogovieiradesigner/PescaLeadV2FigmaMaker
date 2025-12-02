# ❓ FAQ - Perguntas Frequentes sobre Deploy

## 📚 Índice

1. [Sobre o Problema](#sobre-o-problema)
2. [Sobre a Solução](#sobre-a-solução)
3. [Sobre o Deploy](#sobre-o-deploy)
4. [Troubleshooting](#troubleshooting)
5. [Manutenção](#manutenção)

---

## Sobre o Problema

### P: Por que o npm não estava sendo encontrado?

**R:** O Nixpacks (sistema de build do Coolify) estava detectando o projeto como **Deno** em vez de **Node.js**, porque há arquivos TypeScript do Supabase Functions que usam runtime Deno. Como resultado, o container tinha Deno instalado, mas não o npm.

### P: Por que o nixpacks.toml não funcionou?

**R:** O arquivo `nixpacks.toml` tem **baixa prioridade** na hierarquia de configuração do Nixpacks. A detecção automática (que detectou Deno) teve prioridade sobre ele. Para forçar Node.js, precisamos usar `nixpacks.json` ou `.nixpacksrc`, que têm prioridade máxima.

### P: O que é Nixpacks?

**R:** Nixpacks é um sistema de build que converte seu código em uma imagem Docker executável. Ele detecta automaticamente a linguagem/framework do projeto e gera um Dockerfile apropriado. É similar ao Heroku Buildpacks mas usa Nix para gerenciamento de pacotes.

### P: Por que havia arquivos Deno no projeto?

**R:** O Supabase Edge Functions usa Deno como runtime. Os arquivos em `/supabase/functions/` são Edge Functions que rodam no Deno, mas a aplicação frontend é Node.js/React.

---

## Sobre a Solução

### P: O que fazem os arquivos criados?

**R:**
- **`nixpacks.json`**: Configuração principal com prioridade máxima. Define que o provider é "node" e usa nodejs_20.
- **`.nixpacksrc`**: Arquivo secundário que reforça o provider "node". Previne detecção automática.
- **`start.sh`**: Script de inicialização que valida se node/npm estão disponíveis antes de iniciar o servidor.
- **`.dockerignore`**: Otimiza o build ignorando arquivos desnecessários.
- **`.nixpacksignore`**: Ajuda na invalidação de cache do Nixpacks.

### P: Por que remover o nixpacks.toml?

**R:** Ele causava conflito e tinha baixa prioridade. Com `nixpacks.json` presente, o `.toml` se torna redundante e pode causar comportamentos inesperados.

### P: Posso usar Node.js 18 em vez de 20?

**R:** Sim! Edite `nixpacks.json` e mude `"nodejs_20"` para `"nodejs_18"` ou `"nodejs_22"`. Depois commit e deploy com cache limpo.

### P: Preciso de todos os arquivos?

**R:** 
- **Obrigatórios**: `nixpacks.json`, `.nixpacksrc`
- **Recomendados**: `start.sh`, `.dockerignore`
- **Opcionais**: `.nixpacksignore`, scripts de verificação

---

## Sobre o Deploy

### P: Por que DEVO limpar o cache?

**R:** O Docker reutiliza camadas (layers) de builds anteriores para acelerar. Se não limpar o cache, ele vai reutilizar a camada antiga que tinha Deno instalado, ignorando sua nova configuração. **SEM LIMPAR CACHE = ERRO CONTINUA!**

### P: Quanto tempo leva o deploy?

**R:** 
- **Primeira build (cache limpo)**: ~5 minutos
- **Builds subsequentes (com cache)**: ~2-3 minutos
- **Se algo der errado**: até 10 minutos (tentativas + rollback)

### P: O deploy é automático?

**R:** Sim! Após a configuração inicial, todo `git push` para a branch principal dispara um deploy automático no Coolify.

### P: Posso fazer deploy sem limpar o cache?

**R:** NÃO na primeira vez após essa correção! O cache tem a configuração antiga (Deno). Depois do primeiro deploy bem-sucedido, você pode usar cache normalmente.

### P: Como sei se o deploy deu certo?

**R:** Veja os logs do Coolify. Procure por:
- `"providers": ["node"]`
- `"nixPkgs": ["nodejs_20"]`
- `npm version: 10.x.x`
- `Listening on http://localhost:3000/`

### P: O que fazer se o deploy falhar?

**R:** 
1. Verifique os logs do Coolify (clique em "Show Debug Logs")
2. Procure pela mensagem de erro
3. Consulte [README_DEPLOY_FINAL.md → Troubleshooting](./README_DEPLOY_FINAL.md)
4. Se ainda houver dúvidas, execute `bash pre-deploy-check.sh`

---

## Troubleshooting

### P: Erro "npm: command not found" ainda aparece

**R:** 
1. Confirme que limpou o cache do Coolify
2. Execute: `bash pre-deploy-check.sh`
3. Verifique se `nixpacks.json` está commitado no Git
4. No Coolify, vá em Settings → Danger Zone → "Delete All Build Images"
5. Tente deploy novamente com "Ignore Cache" marcado

### P: Logs ainda mostram "deno" como provider

**R:** O cache não foi limpo corretamente. Siga estes passos:
1. Stop da aplicação no Coolify
2. Settings → Build → "Clear Build Cache"
3. Settings → Danger Zone → "Remove All Build Containers"
4. Settings → Danger Zone → "Delete All Build Images"
5. Force Rebuild com "Ignore Cache" marcado

### P: Site retorna 502 Bad Gateway após deploy

**R:** Possíveis causas:
- **Porta errada**: Verifique se o Coolify está esperando porta 3000
- **Health check falhando**: Veja os logs do container
- **Dist não gerado**: Build pode ter falhado parcialmente

Solução:
```bash
# Ver logs do container
docker logs <container-id> | grep -i error

# Verificar se está rodando na porta certa
docker logs <container-id> | grep "Listening"
```

### P: Build timeout (tempo esgotado)

**R:** Aumente o timeout:
1. Coolify → Settings → Build
2. Build Timeout: `600` (10 minutos)
3. Save e tente novamente

### P: Erro "Repository not found" ou "Permission denied"

**R:** Problema de autenticação com Git:
1. Verifique as credenciais no Coolify
2. Settings → Source → Re-authenticate
3. Teste a conexão

### P: Container inicia mas site não carrega

**R:** Verifique:
1. Se o `dist/` foi gerado: `docker exec <container-id> ls -la /app/dist`
2. Se o servidor está rodando: `docker exec <container-id> ps aux | grep serve`
3. Se a porta está correta: `docker port <container-id>`

---

## Manutenção

### P: Preciso limpar o cache toda vez?

**R:** NÃO! Apenas:
- Primeira vez após aplicar essa correção ✅
- Quando mudar `nixpacks.json` ou `.nixpacksrc` ✅
- Quando houver problemas estranhos de build ✅
- Deploys normais de código → NÃO precisa ❌

### P: Como atualizar a versão do Node.js?

**R:**
1. Edite `nixpacks.json`
2. Mude `"nodejs_20"` para a versão desejada (ex: `"nodejs_22"`)
3. Commit e push
4. **Limpe o cache** no Coolify (obrigatório neste caso!)
5. Force rebuild

### P: Como adicionar pacotes ao sistema (apt packages)?

**R:** Edite `nixpacks.json`:
```json
{
  "phases": {
    "setup": {
      "nixPkgs": ["nodejs_20"],
      "aptPkgs": ["curl", "wget", "git", "seu-pacote"]
    }
  }
}
```

### P: Como mudar a porta da aplicação?

**R:**
1. Edite `nixpacks.json`: mude `3000` para a porta desejada
2. Edite `coolify.yaml`: mude `port: 3000` para a nova porta
3. Edite `start.sh`: mude `-l 3000` para a nova porta
4. Commit, push e deploy

### P: Como adicionar variáveis de ambiente?

**R:** No painel do Coolify:
1. Settings → Environment Variables
2. Clique em "Add Variable"
3. Nome: `SUA_VARIAVEL`
4. Valor: `seu-valor`
5. Save
6. Redeploy (não precisa limpar cache)

### P: Como fazer rollback se der problema?

**R:** Coolify mantém versões anteriores:
1. Vá para a aba "Deployments"
2. Encontre o deploy anterior que funcionava
3. Clique em "..." → "Rollback"
4. Confirme

### P: Preciso atualizar a documentação?

**R:** A documentação está completa e atualizada. Se fizer mudanças significativas no deploy, atualize:
- `README.md` (Quick Start)
- `README_DEPLOY_FINAL.md` (se mudar processo)
- `COMMIT_CHECKLIST.md` (se mudar arquivos)

---

## Perguntas Avançadas

### P: Posso usar Yarn ou pnpm em vez de npm?

**R:** Sim! Edite `nixpacks.json`:
```json
{
  "phases": {
    "install": {
      "cmds": ["yarn install --frozen-lockfile"]
    },
    "build": {
      "cmds": ["yarn build"]
    }
  },
  "start": {
    "cmd": "yarn serve"
  }
}
```

### P: Como debugar o build localmente?

**R:**
```bash
# Instalar Nixpacks
npm install -g nixpacks

# Ver o plano gerado
nixpacks plan .

# Build local
nixpacks build . --name test-build

# Executar
docker run -p 3000:3000 test-build
```

### P: Posso usar outro builder em vez de Nixpacks?

**R:** Sim! No Coolify você pode mudar para:
- **Dockerfile**: Crie um `Dockerfile` na raiz
- **Docker Compose**: Use `docker-compose.yml`
- **Buildpacks**: Heroku buildpacks

Mas a solução atual com Nixpacks já está funcionando e é recomendada.

### P: Como otimizar o tempo de build?

**R:**
1. Use cache (após a primeira build bem-sucedida)
2. Otimize `.dockerignore` para não enviar arquivos grandes
3. Use `npm ci` em vez de `npm install` (já configurado)
4. Considere pré-compilar assets pesados

### P: Como configurar CI/CD completo?

**R:** O Coolify já oferece CD (Continuous Deployment) automático. Para adicionar CI (Continuous Integration):
1. Configure GitHub Actions
2. Execute testes antes do push
3. Use `pre-deploy-check.sh` no CI
4. Apenas faça merge para main se passar

---

## 📞 Ainda tem dúvidas?

### Recursos Adicionais
- 📖 [README_DEPLOY_FINAL.md](./README_DEPLOY_FINAL.md) - Guia completo
- 📖 [EXPLICACAO_TECNICA.md](./EXPLICACAO_TECNICA.md) - Deep dive técnico
- 📖 [INDICE_DOCUMENTACAO.md](./INDICE_DOCUMENTACAO.md) - Índice de toda documentação
- 🔧 [pre-deploy-check.sh](./pre-deploy-check.sh) - Script de verificação

### Links Úteis
- [Nixpacks Documentation](https://nixpacks.com/docs)
- [Coolify Documentation](https://coolify.io/docs)
- [Node.js on Nix](https://search.nixos.org/packages?query=nodejs)

---

**Última atualização**: 2024-12-02  
**Versão**: 1.0  
**Status**: ✅ Atualizado
