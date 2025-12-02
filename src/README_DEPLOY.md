# 🚀 Deploy - Pesca Lead CRM

## ⚡ Quick Start

```bash
# 1. Verificar se está tudo pronto
chmod +x scripts/check-deploy.sh
./scripts/check-deploy.sh

# 2. Commitar e subir para GitHub
git add .
git commit -m "chore: preparar para deploy"
git push origin main

# 3. Configurar no Coolify
# Siga o guia: DEPLOY_COOLIFY.md
```

---

## 📁 Estrutura de Deploy

```
pesca-lead-crm/
├── 🐳 Dockerfile              # Build multi-stage
├── 🌐 nginx.conf              # Configuração Nginx
├── 📦 package.json            # Dependências
├── ⚙️  vite.config.ts         # Config Vite
├── 🔐 .env.example            # Exemplo de env vars
├── 🚫 .dockerignore           # Arquivos ignorados
├── 📝 DEPLOY_COOLIFY.md       # Guia completo
└── 🔧 scripts/
    └── check-deploy.sh        # Verificação pré-deploy
```

---

## 🔧 Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **UI:** shadcn/ui + Radix UI
- **State:** React Query (TanStack Query)
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Build:** Docker multi-stage
- **Server:** Nginx Alpine
- **Deploy:** Coolify

---

## 📋 Checklist Pré-Deploy

### Código
- ✅ Todos os arquivos commitados
- ✅ Sem erros de TypeScript
- ✅ Sem warnings críticos
- ✅ Build local funciona (`npm run build`)

### Configuração
- ✅ `package.json` presente
- ✅ `Dockerfile` configurado
- ✅ `nginx.conf` otimizado
- ✅ `.env.example` atualizado

### Supabase
- ✅ Projeto criado
- ✅ Migrations executadas
- ✅ RPC functions deployadas
- ✅ Edge functions deployadas
- ✅ Storage buckets criados
- ✅ RLS policies configuradas

### Integrações
- ✅ Evolution API configurada
- ✅ Gemini API key obtida
- ✅ Resend API configurada (opcional)

---

## 🔐 Variáveis de Ambiente Obrigatórias

Configure no Coolify:

```bash
# Supabase (Frontend - pode ser pública)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Supabase (Backend - SECRETA)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_DB_URL=postgresql://...

# Evolution API
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=xxx

# Google Gemini
GEMINI_API_KEY=AIzaSy...

# Ambiente
NODE_ENV=production
```

---

## 🐳 Build Docker Local (Teste)

```bash
# Build da imagem
docker build -t pesca-lead-crm .

# Rodar localmente
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=https://xxx.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=xxx \
  pesca-lead-crm

# Acessar
open http://localhost:8080
```

---

## 🌐 Configuração DNS

Aponte seu domínio para o servidor Coolify:

```dns
Type: A
Name: app (ou @)
Value: IP-DO-SERVIDOR
TTL: 300
Proxy: Sim (se Cloudflare)
```

---

## 📊 Monitoramento

### Logs em Tempo Real
```bash
# Via Coolify UI
Applications → Logs

# Via SSH no servidor
docker logs -f pesca-lead-crm
```

### Health Check
- URL: `https://seu-dominio.com`
- Intervalo: 30s
- Timeout: 3s
- Retries: 3

### Métricas
- CPU: < 50%
- RAM: < 512MB
- Response Time: < 500ms

---

## 🔄 CI/CD Automático

Após configurar no Coolify, cada `git push` dispara:

1. ✅ Clone do repositório
2. ✅ Build da aplicação
3. ✅ Criação da imagem Docker
4. ✅ Deploy zero-downtime
5. ✅ Health check
6. ✅ Rollback automático se falhar

---

## ⚠️ Troubleshooting

### Problema: Build falha com erro de dependências
```bash
# Solução: Limpar cache e rebuildar
npm ci
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Problema: Erro "Cannot connect to Supabase"
```bash
# Solução: Verificar env vars no Coolify
1. Ir em Environment Variables
2. Verificar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
3. Fazer redeploy
```

### Problema: 404 em rotas do app
```bash
# Solução: Verificar nginx.conf
# Deve ter: try_files $uri $uri/ /index.html;
```

### Problema: Assets não carregam
```bash
# Solução: Verificar base path no vite.config.ts
# Deve ter: base: '/'
```

---

## 🎯 Performance

### Otimizações Aplicadas

✅ **Build:**
- Code splitting automático
- Tree shaking
- Minificação Esbuild
- Source maps desabilitados

✅ **Nginx:**
- Gzip compression
- Cache de assets estáticos (1 ano)
- Brotli (via Cloudflare)

✅ **Docker:**
- Multi-stage build (reduz tamanho)
- Alpine Linux (imagem mínima)
- Layer caching otimizado

### Resultados Esperados
- **Build time:** 2-5 min
- **Image size:** ~50MB
- **First load:** < 2s
- **Lighthouse:** 90+

---

## 🔒 Segurança

### Implementado
✅ HTTPS/SSL via Let's Encrypt
✅ Security headers (X-Frame-Options, etc)
✅ Variáveis de ambiente seguras
✅ RLS no Supabase
✅ CORS configurado

### Recomendações Adicionais
- [ ] Rate limiting (via Cloudflare)
- [ ] WAF rules
- [ ] DDoS protection
- [ ] Backup automático do banco

---

## 📚 Documentação Completa

- **Deploy Coolify:** [DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md)
- **Analytics:** [DASHBOARD_ANALYTICS_STATUS.md](./DASHBOARD_ANALYTICS_STATUS.md)
- **Campanhas:** [docs/CAMPANHAS_TAB.md](./docs/CAMPANHAS_TAB.md)
- **RAG/IA:** [RAG_SUMMARY.md](./RAG_SUMMARY.md)

---

## 🆘 Suporte

### Problemas de Deploy
- 📖 Leia: [DEPLOY_COOLIFY.md](./DEPLOY_COOLIFY.md)
- 💬 Coolify Discord: https://discord.gg/coolify

### Problemas de Código
- 📁 Verifique os logs: `docker logs -f pesca-lead-crm`
- 🔍 Debug via console do navegador (F12)

---

## ✅ Projeto Pronto Para Produção

Este projeto está configurado com:
- ✅ Build otimizado para produção
- ✅ Docker multi-stage
- ✅ Nginx com performance tunning
- ✅ CI/CD via Git push
- ✅ SSL automático
- ✅ Health checks
- ✅ Rollback automático
- ✅ Zero-downtime deployments

**Bom deploy! 🚀**
