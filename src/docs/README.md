# 📚 Documentação do Sistema de Extração de Leads

## 📖 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Configuração](#configuração)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Migrations](#migrations)
- [Desenvolvimento](#desenvolvimento)

---

## 🎯 Visão Geral

Sistema de extração de leads com arquitetura 100% Supabase usando Edge Functions e filas PGMQ para processar 100 páginas do SerpDev em paralelo.

### Características Principais

- **Processamento Paralelo**: 100 páginas do Google Maps simultaneamente
- **Filas PGMQ**: Gerenciamento de jobs com `pgmq` extension
- **Edge Functions**: Google Maps API via Supabase Functions
- **Cron Jobs**: Enriquecimento automatizado (Whois, CNPJ, validação)
- **Real-time**: Progresso ao vivo com Supabase Realtime
- **Multi-tenancy**: Workspaces isolados com RLS

---

## 🏗️ Arquitetura

### Stack Tecnológico

**Frontend:**
- React + TypeScript
- Tailwind CSS
- Shadcn/ui
- React Router

**Backend:**
- Supabase Edge Functions
- PostgreSQL + PGMQ
- pg_cron para agendamento

**APIs Integradas:**
- SerpDev (17 chaves de API)
- CNPJ Hardcoded
- Whois API
- OpenRouter (IA)
- Evolution API (WhatsApp)
- UazAPI (WhatsApp)

### Processamento Híbrido

```
┌─────────────────────┐
│  Frontend (React)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Edge Functions     │
│  - Google Maps      │
│  - Chat Service     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  PostgreSQL + PGMQ  │
│  - Filas de Jobs    │
│  - Cron Jobs        │
└─────────────────────┘
```

---

## ⚙️ Configuração

### Variáveis de Ambiente (Vault)

```env
# SerpDev (17 chaves rotativas)
SERPDEV_API_KEY_01 até SERPDEV_API_KEY_17

# WhatsApp Providers
EVOLUTION_API_KEY
EVOLUTION_API_URL
UAZAPI_API_URL
UAZAPI_ADMIN_TOKEN

# APIs de Enriquecimento
WHOIS_URL_API

# IA
OPENROUTER_API_KEY

# Supabase (auto-configurado)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
```

---

## 📁 Estrutura do Projeto

```
/
├── components/           # Componentes React
│   ├── ui/              # Componentes Shadcn
│   ├── auth/            # Autenticação
│   ├── chat/            # Sistema de chat
│   └── settings/        # Configurações
├── hooks/               # Custom hooks
├── services/            # Serviços frontend
├── supabase/
│   ├── functions/       # Edge Functions
│   │   ├── server/      # Servidor principal
│   │   ├── start-extraction/  # Inicia extração
│   │   └── fetch-google-maps/ # Processa Google Maps
│   └── migrations/      # Migrations SQL
├── sql-migrations/      # Migrations adicionais (PGMQ)
├── types/               # TypeScript types
├── utils/               # Utilitários
└── docs/                # Documentação
```

---

## 🗄️ Migrations

### Ordem de Execução

Veja o guia completo em: [EXECUTAR_MIGRATIONS.md](./EXECUTAR_MIGRATIONS.md)

```
1. 001_initial_schema.sql       → 19 tabelas base
2. 002_rls_policies.sql         → Segurança (parte 1)
3. 003_triggers.sql             → Automações
4. 004_performance_indexes.sql  → Performance
5. 005_rls_new_tables.sql       → Segurança (parte 2)
6. 006_add_provider_message_id  → WhatsApp providers
7. 007_extraction_logs_rls      → Logs de extração
8. 008_extraction_tables_rls    → Tabelas de extração
```

### Migrations PGMQ

```
sql-migrations/03-google-maps-queue.sql
```

---

## 🚀 Desenvolvimento

### Instalação

```bash
# Instalar dependências
npm install

# Configurar Supabase
# 1. Criar projeto no Supabase
# 2. Executar migrations em ordem
# 3. Configurar Edge Functions
# 4. Adicionar secrets no Vault
```

### Executar Localmente

```bash
# Frontend
npm run dev

# Edge Functions (requer Supabase CLI)
supabase functions serve
```

### Estrutura de Dados

#### Principais Tabelas

- **users**: Usuários do sistema
- **workspaces**: Workspaces multi-tenant
- **workspace_members**: Membros e permissões
- **funnels**: Funis de vendas
- **funnel_columns**: Colunas dos funis
- **leads**: Leads extraídos
- **extraction_jobs**: Jobs de extração
- **extraction_logs**: Logs detalhados
- **conversations**: Conversas WhatsApp
- **messages**: Mensagens
- **instances**: Instâncias WhatsApp

#### Filas PGMQ

- **google_maps_queue**: Processamento paralelo de páginas
- Cada job contém: página, localização, categoria, API key

---

## 📊 Status de Extração

### status_extraction

- `pending`: Aguardando início
- `extracting`: Extraindo do Google Maps
- `extracted`: Extração completa
- `error`: Erro na extração

### status_enrichment

- `pending`: Aguardando enriquecimento
- `processing`: Enriquecendo dados
- `completed`: Enriquecimento completo
- `error`: Erro no enriquecimento

---

## 🔄 Fluxo de Extração

```
1. Usuário cria job de extração
   ↓
2. Edge Function cria 100 jobs na fila PGMQ
   ↓
3. fetch-google-maps processa em paralelo
   ↓
4. Dados salvos em extraction_results
   ↓
5. Cron job executa enriquecimento
   ↓
6. Leads finais em tabela leads
```

---

## 📝 Documentos Adicionais

- [Guia de Migrations](./EXECUTAR_MIGRATIONS.md)
- [Instruções de Deploy](./DEPLOY.md)
- [Changelog](./CHANGELOG.md)

---

## 🤝 Contribuindo

Este é um projeto privado. Para contribuir:

1. Criar branch feature
2. Testar localmente
3. Submeter PR com descrição detalhada

---

## 📄 Licença

Propriedade privada. Todos os direitos reservados.
