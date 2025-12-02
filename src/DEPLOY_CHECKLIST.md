# ✅ Checklist de Deploy - Pesca Lead CRM

## 📋 Antes de Começar

### Infraestrutura
- [ ] Servidor com Coolify instalado e funcionando
- [ ] Docker instalado no servidor
- [ ] Acesso SSH ao servidor (se necessário)
- [ ] Domínio registrado (ex: pescalead.com.br)
- [ ] Conta no GitHub com repositório privado criado

### Supabase
- [ ] Projeto Supabase criado
- [ ] Database migrations executadas
- [ ] RPC functions criadas e testadas
- [ ] Edge Functions deployadas
- [ ] Storage buckets criados
- [ ] RLS policies configuradas
- [ ] Chaves de API copiadas (URL, anon key, service role key)

### Integrações Externas
- [ ] Evolution API configurada e rodando
- [ ] Chave de API da Evolution obtida
- [ ] Google Gemini API key obtida
- [ ] Resend account criado (opcional para emails)
- [ ] UAZApi configurado (opcional, alternativa Evolution)

---

## 🔧 Preparação do Código

### Arquivos Criados
- [ ] `package.json` - Dependências
- [ ] `vite.config.ts` - Config Vite
- [ ] `tsconfig.json` - Config TypeScript
- [ ] `Dockerfile` - Build Docker
- [ ] `nginx.conf` - Servidor web
- [ ] `.dockerignore` - Ignorar arquivos
- [ ] `.gitignore` - Ignorar no Git
- [ ] `.env.example` - Exemplo de env vars
- [ ] `index.html` - HTML principal
- [ ] `main.tsx` - Entry point

### Scripts de Verificação
- [ ] `scripts/check-deploy.sh` - Verificar pré-deploy
- [ ] `scripts/test-build.sh` - Testar build local

### Documentação
- [ ] `DEPLOY_COOLIFY.md` - Guia completo
- [ ] `README_DEPLOY.md` - Overview técnico
- [ ] `QUICK_START_DEPLOY.md` - Início rápido

---

## 🧪 Testes Locais

### Build Local
```bash
# Instalar dependências
npm install

# Build
npm run build

# Verificar dist/
ls -la dist/
```

### Docker Local (Opcional)
```bash
# Build da imagem
docker build -t pesca-lead-crm:test .

# Rodar container
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=https://xxx.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=xxx \
  pesca-lead-crm:test

# Testar
open http://localhost:8080
```

### Scripts de Verificação
```bash
# Tornar executável
chmod +x scripts/*.sh

# Verificar projeto
./scripts/check-deploy.sh

# Testar build
./scripts/test-build.sh
```

---

## 📦 Repositório GitHub

### Inicializar Git
```bash
git init
git add .
git commit -m "Initial commit - Pesca Lead CRM"
```

### Criar Repositório Privado
1. Ir em: https://github.com/new
2. Nome: `pesca-lead-crm`
3. ✅ Marcar como **Private**
4. Criar repositório

### Fazer Push
```bash
git remote add origin https://github.com/SEU-USUARIO/pesca-lead-crm.git
git branch -M main
git push -u origin main
```

---

## 🚀 Deploy no Coolify

### 1. Criar Resource
- [ ] Abrir Coolify
- [ ] Clicar em "+ New Resource"
- [ ] Escolher "Private Repository (with GitHub App)"

### 2. Conectar GitHub
- [ ] Instalar GitHub App no Coolify
- [ ] Autorizar acesso ao repositório
- [ ] Selecionar `pesca-lead-crm`

### 3. Configurar Build
- [ ] Branch: `main`
- [ ] Build Pack: `Dockerfile`
- [ ] Port: `80`
- [ ] Base Directory: `/` (root)

### 4. Variáveis de Ambiente

#### Frontend (Públicas)
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

#### Backend (Secretas)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_DB_URL`

#### Integrações
- [ ] `EVOLUTION_API_URL`
- [ ] `EVOLUTION_API_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `RESEND_API_KEY` (opcional)
- [ ] `UAZAPI_API_URL` (opcional)
- [ ] `UAZAPI_ADMIN_TOKEN` (opcional)

#### Ambiente
- [ ] `NODE_ENV=production`

### 5. Deploy Inicial
- [ ] Clicar em "Deploy"
- [ ] Aguardar build (3-5 min)
- [ ] Verificar logs
- [ ] Confirmar que não há erros

---

## 🌐 Configuração de Domínio

### DNS
- [ ] Adicionar registro A:
  ```
  Type: A
  Name: app (ou @)
  Value: IP-DO-SERVIDOR-COOLIFY
  TTL: 300
  ```
- [ ] Aguardar propagação (5-30 min)
- [ ] Verificar: `dig app.seudominio.com`

### Coolify
- [ ] Ir em "Domains"
- [ ] Adicionar domínio: `app.seudominio.com`
- [ ] Aguardar provisionamento SSL (1-2 min)
- [ ] Verificar: https://app.seudominio.com

---

## ✅ Verificação Pós-Deploy

### Frontend
- [ ] Site carrega sem erros
- [ ] SSL ativo (cadeado verde)
- [ ] Login funciona
- [ ] Signup funciona
- [ ] Dashboard carrega
- [ ] Dados do Supabase aparecem
- [ ] Chat funciona
- [ ] Kanban funciona
- [ ] Analytics funcionam

### Performance
- [ ] Lighthouse Score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Sem erros no console (F12)

### Backend
- [ ] Webhooks recebendo dados
- [ ] Edge Functions respondendo
- [ ] RPC functions funcionando
- [ ] Logs sem erros críticos

### Integrações
- [ ] Evolution API conectada
- [ ] Mensagens chegando do WhatsApp
- [ ] Agentes IA respondendo
- [ ] Follow-ups automáticos funcionando

---

## 🔄 CI/CD

### Configuração Automática
- [ ] Webhook GitHub criado pelo Coolify
- [ ] Testar: fazer commit e push
- [ ] Verificar redeploy automático
- [ ] Confirmar zero-downtime

### Teste de Deploy
```bash
# Fazer mudança
echo "# Test" >> README.md

# Commit
git add .
git commit -m "test: CI/CD"

# Push
git push origin main

# Verificar no Coolify
# → Deve iniciar deploy automático
```

---

## 🔐 Segurança

### SSL/TLS
- [ ] HTTPS funcionando
- [ ] Certificado válido
- [ ] Renovação automática configurada

### Headers de Segurança
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] X-XSS-Protection
- [ ] Referrer-Policy

### Secrets
- [ ] Nenhum secret no código
- [ ] `.env` no .gitignore
- [ ] Variáveis no Coolify apenas

---

## 📊 Monitoramento

### Logs
- [ ] Configurar retenção de logs
- [ ] Acessar: Coolify → Logs
- [ ] Configurar alertas (opcional)

### Uptime
- [ ] Adicionar no UptimeRobot
- [ ] Configurar alertas
- [ ] Verificar a cada 5 min

### Backups
- [ ] Backup do Supabase configurado
- [ ] Backup do código no GitHub
- [ ] Snapshot do servidor (opcional)

---

## 🎯 Otimizações Pós-Deploy

### Cloudflare (Recomendado)
- [ ] Adicionar site no Cloudflare
- [ ] Configurar DNS
- [ ] Ativar Proxy (nuvem laranja)
- [ ] Configurar:
  - [ ] Auto minify (JS, CSS, HTML)
  - [ ] Brotli compression
  - [ ] Rocket Loader
  - [ ] Browser cache TTL: 4h
  - [ ] Always Online: ✅

### Performance
- [ ] Configurar CDN
- [ ] Otimizar imagens
- [ ] Lazy loading
- [ ] Code splitting

### SEO (Opcional)
- [ ] Meta tags
- [ ] Sitemap.xml
- [ ] robots.txt
- [ ] Google Analytics

---

## 🆘 Troubleshooting

### Build Falha
```bash
# Verificar localmente
npm install
npm run build

# Ver logs no Coolify
Applications → Logs
```

### Não Conecta no Supabase
```bash
# Verificar env vars
1. Coolify → Environment Variables
2. Confirmar VITE_SUPABASE_URL
3. Confirmar VITE_SUPABASE_ANON_KEY
4. Redeploy
```

### 404 em Rotas
```bash
# Verificar nginx.conf
# Deve ter: try_files $uri $uri/ /index.html;
```

### SSL Não Provisiona
```bash
# Verificar DNS
dig app.seudominio.com

# Aguardar propagação
# Tentar reprovisionar SSL no Coolify
```

---

## 🎉 Deploy Completo!

### Links Úteis
- 🌐 **Aplicação:** https://app.seudominio.com
- 🛠️ **Coolify:** https://coolify.seudominio.com
- 🗄️ **Supabase:** https://app.supabase.com/project/seu-projeto
- 📊 **Analytics:** https://app.seudominio.com/dashboard

### Próximos Passos
1. Adicionar usuários ao sistema
2. Configurar funis de vendas
3. Conectar WhatsApp via Evolution
4. Treinar agentes IA
5. Monitorar métricas

---

## 📞 Suporte

### Documentação
- [DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md)
- [README_DEPLOY.md](./README_DEPLOY.md)
- [QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md)

### Comunidades
- Coolify: https://discord.gg/coolify
- Supabase: https://discord.supabase.com

---

**✅ Checklist completo!**

Marque todos os itens antes de considerar o deploy em produção finalizado.

**Bom deploy! 🚀**
