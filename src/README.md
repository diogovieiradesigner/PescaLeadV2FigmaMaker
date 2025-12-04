# 🐟 Pesca Lead - CRM com Agentes de IA

> Sistema completo de CRM com automação via WhatsApp e Agentes de IA

[![License](https://img.shields.io/badge/License-Proprietary-red)]()
[![Status](https://img.shields.io/badge/Status-Production%20Ready-green)]()
[![React](https://img.shields.io/badge/React-18.x-blue)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)]()
[![Supabase](https://img.shields.io/badge/Supabase-Powered-green)]()
[![Tailwind](https://img.shields.io/badge/Tailwind-v3-38bdf8)]()

---

## 🚀 Executando no Figma Make

Este projeto está configurado para rodar no **Figma Make**.

### ⚠️ IMPORTANTE - CSS Fix Aplicado

O projeto teve correções aplicadas para resolver problemas de CSS:
- ✅ Tailwind CSS v3 (downgrade de v4 experimental)
- ✅ `tailwind.config.js` criado
- ✅ `postcss.config.js` criado
- ✅ `globals.css` corrigido para sintaxe v3

📖 **Detalhes completos:** [CSS_FIX_COMPLETO.md](/CSS_FIX_COMPLETO.md)

### 🔄 Após abrir o projeto pela primeira vez:

O Figma Make vai automaticamente instalar as dependências. Se o CSS não aparecer:

```bash
# No terminal do Figma Make:
npm install
npm run dev
```

Depois, **recarregue a página** do preview (Cmd/Ctrl + Shift + R).

### ⚙️ Variáveis de Ambiente Necessárias

O projeto já está conectado ao Supabase. As seguintes secrets já estão configuradas:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `EVOLUTION_API_KEY` / `EVOLUTION_API_URL`
- ✅ `GEMINI_API_KEY`
- ✅ `RESEND_API_KEY`

---

## 🎯 Sobre o Projeto

**Pesca Lead** é um CRM moderno com agentes de IA integrados que automatizam o atendimento via WhatsApp, gerenciam leads através de um Kanban intuitivo e fornecem analytics detalhados sobre todo o funil de vendas.

### 🌟 Principais Funcionalidades

#### 🤖 **Agentes de IA**
- Atendimento automático 24/7 via WhatsApp
- Follow-ups automáticos personalizados
- Integração com Google Gemini e OpenRouter
- RAG (Retrieval Augmented Generation) para contexto personalizado
- Taxa de sucesso de ~80% sem intervenção humana

#### 📊 **Dashboard Analytics**
- **Visão Geral:** Métricas gerais, funil de conversão, leads por canal
- **Leads:** Captura, origem, mapa de localização, top conversões
- **Conversas:** Volume, taxa de resposta, ranking de atendentes
- **Campanhas:** Performance, taxa de resposta, heatmap horário
- **I.A & Automação:** Economia de tempo, taxa de sucesso, categorias de follow-up

#### 🎯 **Kanban de Vendas**
- Drag & drop de leads entre colunas
- Múltiplos funis personalizáveis
- Campos customizados
- Realtime updates via Supabase
- Filtros avançados

#### 💬 **Chat Integrado**
- Interface tipo WhatsApp
- Suporte a áudio, imagem e documentos
- Filtros por status, canal e tags
- Conversas em tempo real
- Assumir conversa da IA

#### 📈 **Analytics Avançado**
- 6 RPCs otimizadas para cada aba
- Charts interativos com Recharts
- Heatmaps de engagement
- Comparação com períodos anteriores
- Export de relatórios

---

## 🛠️ Stack Tecnológica

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite 5
- **Styling:** Tailwind CSS v3
- **UI:** shadcn/ui + Radix UI
- **State:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Maps:** React Leaflet
- **Icons:** Lucide React

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Edge Functions:** Deno + Hono
- **Realtime:** Supabase Realtime
- **Crons:** pg_cron

### Integrações
- **WhatsApp:** Evolution API / UAZApi
- **IA:** Google Gemini, OpenRouter
- **Email:** Resend
- **Enriquecimento:** APIs de Scraping
- **Maps:** Google Maps API

### Infraestrutura
- **Deploy:** Coolify
- **Container:** Docker multi-stage
- **Web Server:** Nginx Alpine
- **CI/CD:** GitHub Webhooks
- **SSL:** Let's Encrypt (automático)

---

## 📦 Estrutura do Projeto

```
pesca-lead-crm/
├── 📱 components/          # Componentes React
│   ├── auth/              # Login, Signup
│   ├── chat/              # Interface de chat
│   ├── dashboard/         # Analytics tabs
│   ├── settings/          # Configurações
│   └── ui/                # shadcn components
├── 🎣 hooks/              # Custom hooks
│   ├── useKanbanData.ts
│   ├── useChatData.ts
│   ├── useIATab.ts
│   └── ...
├── 🔧 services/           # API services
│   ├── auth-service.ts
│   ├── leads-service.ts
│   ├── chat-service.ts
│   └── ...
├── 📊 types/              # TypeScript types
├── 🎨 styles/             # CSS global
├── 🗄️ supabase/          # Supabase config
│   ├── functions/         # Edge Functions
│   ├── migrations/        # SQL migrations
│   └── crons/             # Scheduled jobs
├── 🐳 Dockerfile          # Build Docker
├── 🌐 nginx.conf          # Web server config
├── 📝 package.json        # Dependencies
└── 📚 docs/               # Documentação
```

---

## 🔐 Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
# Supabase (obrigatório)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Backend (não expor no frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_DB_URL=postgresql://...

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=xxx

# Google Gemini (IA)
GEMINI_API_KEY=AIzaSy...

# Resend (Email - opcional)
RESEND_API_KEY=re_...
```

---

## 🧪 Desenvolvimento Local

### Instalar Dependências
```bash
npm install
```

### Rodar em Desenvolvimento
```bash
npm run dev
# Abre em http://localhost:3000
```

### Build para Produção
```bash
npm run build
# Output em ./dist
```

### Testar Build Localmente
```bash
./scripts/test-build.sh
```

### Build Docker
```bash
docker build -t pesca-lead-crm .
docker run -p 8080:80 pesca-lead-crm
```

---

## 📊 Funcionalidades por Aba

### 📈 Visão Geral
- 4 cards de métricas principais
- Gráfico de conversão do funil
- Distribuição de leads por canal
- Top 5 leads mais engajados
- Evolução de captura de leads

### 🎯 Leads
- Cards de estatísticas detalhadas
- Mapa de localização dos leads
- Ranking de top fontes de conversão
- Gráfico de evolução de capturas

### 💬 Conversas
- Resumo de conversas ativas
- Comparação tempo de resposta IA vs Humano
- Ranking de atendentes
- Distribuição de mensagens

### 📣 Campanhas
- 4 cards: Enviadas, Mensagens, Taxa Resp., Melhor Horário
- Ranking Top 10 campanhas
- Heatmap 7x8 de performance por dia/horário
- Integração completa com RPC `get_campaigns_tab_complete`

### 🤖 I.A & Automação
- Cards: Msgs IA, Follow-ups, Taxa Sucesso, Tempo Economizado
- Gráfico Pizza: IA vs Humano
- Taxa de sucesso detalhada (100% IA vs Com Assunção)
- Top 5 categorias de follow-ups
- Cálculo de economia de tempo e dinheiro

---

## 🔄 CI/CD Automático

Deploy automático via Git push:

```bash
# Fazer alterações
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# Coolify detecta e faz redeploy automático! 🎉
```

---

## 📈 Performance

### Métricas Esperadas
- **Build time:** 2-5 min
- **Image size:** ~50MB (Alpine)
- **First load:** < 2s
- **Lighthouse:** 90+
- **Core Web Vitals:** ✅ Todos verdes

### Otimizações Aplicadas
✅ Code splitting automático  
✅ Tree shaking  
✅ Minificação Esbuild  
✅ Gzip/Brotli compression  
✅ Cache de assets (1 ano)  
✅ Docker multi-stage build  
✅ Lazy loading de componentes  

---

## 🔒 Segurança

### Implementado
✅ HTTPS/SSL obrigatório  
✅ Security headers (X-Frame-Options, etc)  
✅ RLS no Supabase  
✅ JWT tokens seguros  
✅ Variáveis de ambiente protegidas  
✅ CORS configurado  
✅ Rate limiting (via Cloudflare)  

---

## 📞 Suporte e Documentação

### Documentação Técnica
- [Dashboard Analytics](./DASHBOARD_ANALYTICS_STATUS.md)
- [Campanhas Tab](./docs/CAMPANHAS_TAB.md)
- [RAG/IA](./RAG_SUMMARY.md)
- [Chat](./README_CHAT_IMPLEMENTADO.md)

### Comunidades
- Coolify: https://discord.gg/coolify
- Supabase: https://discord.supabase.com

---

## 🎯 Roadmap

### ✅ Completo
- [x] Sistema de autenticação
- [x] Kanban com drag & drop
- [x] Chat integrado
- [x] Dashboard Analytics (5 abas)
- [x] Agentes de IA
- [x] Follow-ups automáticos
- [x] RAG Knowledge Base
- [x] Deploy via Coolify

### 🚧 Em Desenvolvimento
- [ ] Campanha de mensagens em massa
- [ ] Integração com Meta Business API
- [ ] Editor visual de fluxos de IA
- [ ] Relatórios exportáveis (PDF/Excel)

### 💡 Planejado
- [ ] App mobile (React Native)
- [ ] API pública
- [ ] Marketplace de templates
- [ ] Webhooks customizados

---

## 📄 Licença

Copyright © 2025 Pesca Lead. Todos os direitos reservados.

Este é um software proprietário. Uso, cópia, modificação ou distribuição não autorizados são estritamente proibidos.

---

## 🙏 Créditos

Desenvolvido com ❤️ usando:
- [React](https://react.dev/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Coolify](https://coolify.io/)

---

## 📧 Contato

Para questões comerciais ou suporte técnico, entre em contato através dos canais oficiais.

---

**Feito com 🐟 pela equipe Pesca Lead**