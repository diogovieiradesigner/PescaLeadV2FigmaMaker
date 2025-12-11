# 📁 Estrutura de Arquivos - Kanban API

## 🎯 Organização Modular

A edge function está organizada em **micro-serviços** por responsabilidade, facilitando desenvolvimento com IA e manutenção.

---

## 📂 Estrutura Completa

```
kanban-api/
│
├── index.ts                          # 🚀 ENTRADA PRINCIPAL
│   └── Roteador Hono, middleware global, health check
│
├── types.ts                          # 📝 TIPOS
│   └── Interfaces TypeScript (Lead, Funnel, Column, etc.)
│
├── deno.json                         # ⚙️ CONFIGURAÇÃO
│   └── Imports e configurações do Deno
│
├── README.md                         # 📖 DOCUMENTAÇÃO PRINCIPAL
│
├── GUIA-MIGRACAO-FRONTEND.md         # 🔄 GUIA DE MIGRAÇÃO
│
├── INDICES-RECOMENDADOS.sql          # 🗄️ ÍNDICES DO BANCO
│
│
├── database/                         # 🗄️ BANCO DE DADOS
│   └── client.ts                     # Cliente Supabase singleton
│
├── middleware/                       # 🛡️ MIDDLEWARE
│   ├── auth.ts                       # Autenticação (Bearer token)
│   └── workspace.ts                  # Validação de acesso ao workspace
│
├── services/                         # 🔧 SERVIÇOS (LÓGICA DE NEGÓCIO)
│   ├── funnels.service.ts            # Operações de funis
│   ├── columns.service.ts            # Operações de colunas
│   ├── leads.service.ts              # Operações de leads (OTIMIZADO)
│   ├── leads.mapper.ts               # Mapeamento DB → API
│   ├── filters.service.ts            # Lógica de filtros
│   └── stats.service.ts              # Estatísticas do funil
│
└── routes/                           # 🛣️ ROTAS (ENDPOINTS)
    ├── funnels.ts                    # GET /funnels, GET /funnels/:id
    ├── columns.ts                    # GET /columns, GET /columns/:id
    ├── leads.ts                      # GET /leads, GET /columns/:id/leads
    └── stats.ts                      # GET /stats
```

---

## 📋 Responsabilidades por Arquivo

### **1. index.ts** (Entrada Principal)
- ✅ Roteador Hono
- ✅ Middleware global (CORS)
- ✅ Health check
- ✅ Error handler
- ✅ Montagem de rotas

**Linhas:** ~50  
**Complexidade:** Baixa  
**Responsabilidade:** Orquestração

---

### **2. types.ts** (Tipos)
- ✅ Interfaces TypeScript
- ✅ Tipos de request/response
- ✅ Tipos de filtros

**Linhas:** ~100  
**Complexidade:** Baixa  
**Responsabilidade:** Definições de tipos

---

### **3. database/client.ts** (Cliente)
- ✅ Singleton do Supabase
- ✅ Configuração de conexão
- ✅ Reutilização de conexão

**Linhas:** ~30  
**Complexidade:** Baixa  
**Responsabilidade:** Conexão com banco

---

### **4. middleware/auth.ts** (Autenticação)
- ✅ Validação de token Bearer
- ✅ Verificação de usuário
- ✅ Armazenamento no contexto

**Linhas:** ~40  
**Complexidade:** Média  
**Responsabilidade:** Segurança

---

### **5. middleware/workspace.ts** (Workspace)
- ✅ Validação de acesso ao workspace
- ✅ Verificação de membro ativo
- ✅ Armazenamento no contexto

**Linhas:** ~50  
**Complexidade:** Média  
**Responsabilidade:** Autorização

---

### **6. services/funnels.service.ts** (Funis)
- ✅ `getFunnels()` - Lista funis
- ✅ `getFunnel()` - Busca funil específico

**Linhas:** ~100  
**Complexidade:** Baixa  
**Responsabilidade:** CRUD de funis

---

### **7. services/columns.service.ts** (Colunas)
- ✅ `getColumns()` - Lista colunas
- ✅ `getColumn()` - Busca coluna específica

**Linhas:** ~80  
**Complexidade:** Baixa  
**Responsabilidade:** CRUD de colunas

---

### **8. services/leads.service.ts** (Leads - OTIMIZADO)
- ✅ `getColumnLeads()` - Busca leads com paginação e filtros
- ✅ `getLead()` - Busca lead específico
- ✅ `getFunnelLeadsInitial()` - Carrega leads iniciais de todas as colunas

**Linhas:** ~150  
**Complexidade:** Alta  
**Responsabilidade:** CRUD de leads + Performance

**Otimizações:**
- Queries paralelas (COUNT + SELECT)
- Seleção de campos específicos
- Filtros aplicados no SQL
- Carregamento paralelo de múltiplas colunas

---

### **9. services/leads.mapper.ts** (Mapper)
- ✅ `mapLeadFromDB()` - Converte DB → API format

**Linhas:** ~40  
**Complexidade:** Baixa  
**Responsabilidade:** Transformação de dados

---

### **10. services/filters.service.ts** (Filtros)
- ✅ `applyFilters()` - Aplica filtros na query
- ✅ `validateFilters()` - Valida filtros antes de aplicar

**Linhas:** ~80  
**Complexidade:** Média  
**Responsabilidade:** Lógica de filtros

---

### **11. services/stats.service.ts** (Estatísticas)
- ✅ `getFunnelStats()` - Calcula estatísticas do funil

**Linhas:** ~100  
**Complexidade:** Média  
**Responsabilidade:** Agregações e cálculos

---

### **12. routes/funnels.ts** (Rotas de Funis)
- ✅ GET `/funnels` - Lista funis
- ✅ GET `/funnels/:id` - Busca funil

**Linhas:** ~50  
**Complexidade:** Baixa  
**Responsabilidade:** Endpoints de funis

---

### **13. routes/columns.ts** (Rotas de Colunas)
- ✅ GET `/columns` - Lista colunas
- ✅ GET `/columns/:id` - Busca coluna

**Linhas:** ~50  
**Complexidade:** Baixa  
**Responsabilidade:** Endpoints de colunas

---

### **14. routes/leads.ts** (Rotas de Leads)
- ✅ GET `/leads` - Leads iniciais de todas as colunas
- ✅ GET `/columns/:id/leads` - Leads de uma coluna (paginação + filtros)
- ✅ GET `/leads/:id` - Busca lead específico

**Linhas:** ~120  
**Complexidade:** Média  
**Responsabilidade:** Endpoints de leads

---

### **15. routes/stats.ts** (Rotas de Estatísticas)
- ✅ GET `/stats` - Estatísticas do funil

**Linhas:** ~30  
**Complexidade:** Baixa  
**Responsabilidade:** Endpoints de estatísticas

---

## 🎯 Vantagens da Estrutura Modular

### **1. Desenvolvimento com IA:**
- ✅ Arquivos pequenos (< 200 linhas)
- ✅ Responsabilidades claras
- ✅ Fácil de entender e modificar
- ✅ Testes isolados por serviço

### **2. Manutenção:**
- ✅ Mudanças isoladas (não afetam outros módulos)
- ✅ Fácil localizar bugs
- ✅ Fácil adicionar features
- ✅ Código reutilizável

### **3. Performance:**
- ✅ Imports otimizados
- ✅ Lazy loading quando necessário
- ✅ Queries paralelas
- ✅ Cache de conexão

### **4. Escalabilidade:**
- ✅ Fácil adicionar novos serviços
- ✅ Fácil adicionar novas rotas
- ✅ Fácil adicionar novos filtros
- ✅ Fácil adicionar novos endpoints

---

## 📊 Estatísticas

- **Total de arquivos:** 15
- **Total de linhas:** ~1.000
- **Média de linhas por arquivo:** ~67
- **Arquivo maior:** `leads.service.ts` (~150 linhas)
- **Arquivo menor:** `client.ts` (~30 linhas)

---

## 🔄 Fluxo de Dados

```
Request
  ↓
index.ts (roteador)
  ↓
middleware/auth.ts (autenticação)
  ↓
middleware/workspace.ts (autorização)
  ↓
routes/*.ts (endpoint específico)
  ↓
services/*.service.ts (lógica de negócio)
  ↓
database/client.ts (query no banco)
  ↓
services/*.mapper.ts (transformação)
  ↓
Response
```

---

**Estrutura criada em:** 10/12/2025  
**Status:** ✅ Pronta para desenvolvimento

