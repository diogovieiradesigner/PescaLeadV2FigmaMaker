# Deploy Automático no Cloudflare Pages via GitHub

Este projeto está configurado para deploy automático no Cloudflare Pages sempre que houver um push para a branch `main`.

## 🚀 Configuração Inicial

### 1. Criar Projeto no Cloudflare Pages

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Pages** > **Create a project**
3. Conecte seu repositório GitHub: `diogovieiradesigner/PescaLeadV2FigmaMaker`
4. Configure o build:
   - **Build command**: `npm run build`
   - **Build output directory**: `build`
   - **Root directory**: `/`

### 2. Configurar Secrets no GitHub

Adicione os seguintes secrets no seu repositório GitHub:

1. Vá em **Settings** > **Secrets and variables** > **Actions**
2. Clique em **New repository secret**
3. Adicione os seguintes secrets:

#### CLOUDFLARE_API_TOKEN

Para obter o API Token:
1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **My Profile** > **API Tokens**
3. Clique em **Create Token**
4. Use o template **"Edit Cloudflare Workers"** ou crie um custom token com:
   - **Permissions**:
     - Account - Cloudflare Pages - Edit
   - **Account Resources**:
     - Include - Sua conta
5. Copie o token e adicione como secret `CLOUDFLARE_API_TOKEN`

#### CLOUDFLARE_ACCOUNT_ID

Para obter o Account ID:
1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecione qualquer site/worker
3. O Account ID está visível na barra lateral direita
4. Copie e adicione como secret `CLOUDFLARE_ACCOUNT_ID`

## 📦 Deploy Automático

Após a configuração, o deploy acontece automaticamente:

- **Push para `main`**: Deploy para produção
- **Pull Request**: Deploy de preview (ambiente de teste)

### Workflow do Deploy

1. Você faz commit e push para o GitHub
2. GitHub Actions detecta o push
3. Instala dependências (`npm ci`)
4. Executa o build (`npm run build`)
5. Publica no Cloudflare Pages
6. Cloudflare fornece uma URL de produção

## 🛠️ Scripts NPM

Novos scripts adicionados ao `package.json`:

```bash
# Deploy manual para Cloudflare Pages
npm run deploy:cloudflare

# Preview local usando Wrangler
npm run preview:cloudflare

# Build e deploy em um comando
npm run build:deploy
```

## 🌐 URLs do Projeto

Após o primeiro deploy:

- **Produção**: `https://pesca-lead-v2.pages.dev`
- **Preview (PR)**: `https://[pr-number].pesca-lead-v2.pages.dev`

Você pode configurar um domínio customizado no Cloudflare Dashboard.

## 🔧 Desenvolvimento Local

Para testar localmente com Cloudflare Pages:

```bash
# Instalar Wrangler globalmente (opcional)
npm install -g wrangler

# Executar preview local
npm run preview:cloudflare
# ou
wrangler pages dev build
```

## 📝 Variáveis de Ambiente

Configure as variáveis de ambiente no Cloudflare Dashboard:

1. Vá em **Pages** > **pesca-lead-v2** > **Settings** > **Environment variables**
2. Adicione suas variáveis (ex: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. Separe por ambiente: Production / Preview

## 🔄 Fluxo de Trabalho Recomendado

1. **Desenvolvimento**:
   ```bash
   git checkout -b feature/nova-funcionalidade
   # desenvolva sua feature
   git commit -m "feat: adiciona nova funcionalidade"
   git push origin feature/nova-funcionalidade
   ```

2. **Pull Request**:
   - Crie PR no GitHub
   - GitHub Actions cria deploy de preview automaticamente
   - Revise o preview em `https://[pr-number].pesca-lead-v2.pages.dev`

3. **Merge para Main**:
   - Após aprovação, merge o PR
   - Deploy automático para produção
   - Acesse em `https://pesca-lead-v2.pages.dev`

## 🐛 Troubleshooting

### Build falha no GitHub Actions

- Verifique os logs em **Actions** no GitHub
- Certifique-se que `npm run build` funciona localmente
- Verifique se todas as dependências estão em `package.json`

### Deploy não acontece

- Verifique se os secrets estão configurados corretamente
- Verifique se o nome do projeto no `wrangler.toml` corresponde ao projeto no Cloudflare
- Verifique permissões do API Token

### Erro de permissão

- Recrie o API Token com as permissões corretas
- Certifique-se que o Account ID está correto

## 📚 Recursos

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [GitHub Actions - Cloudflare Pages](https://github.com/cloudflare/pages-action)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

---

**Desenvolvido por**: Diogo Vieira
**Repositório**: https://github.com/diogovieiradesigner/PescaLeadV2FigmaMaker
