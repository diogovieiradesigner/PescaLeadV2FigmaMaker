# 📊 Comparação: Edge Function Antiga vs Nova Kanban API

**Data:** 10/12/2025

---

## 🔍 Funcionalidades da Edge Function Antiga (`make-server-e4f9d774`)

### **FUNNELS (Kanbans)**

#### ✅ **GET** `/workspaces/:workspaceId/funnels`
- Lista todos os funis do workspace
- **Status na nova API:** ✅ Implementado

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId`
- Busca um funil específico
- **Status na nova API:** ✅ Implementado

#### ✅ **POST** `/workspaces/:workspaceId/funnels`
- Cria um novo funil
- Cria colunas padrão automaticamente
- Inicializa stats
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

#### ✅ **PUT** `/workspaces/:workspaceId/funnels/:funnelId`
- Atualiza funil (nome, descrição, colunas)
- Gerencia posições de colunas
- Previne deleção de colunas com leads
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

#### ✅ **DELETE** `/workspaces/:workspaceId/funnels/:funnelId`
- Soft delete (marca como `is_active = false`)
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

---

### **STATS (Estatísticas)**

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/stats`
- Busca estatísticas do funil
- **Status na nova API:** ✅ Implementado

#### ✅ **POST** `/workspaces/:workspaceId/funnels/:funnelId/recalculate-stats`
- Recalcula estatísticas manualmente
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

---

### **LEADS**

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads`
- Busca leads de uma coluna com paginação
- **Status na nova API:** ✅ Implementado (com filtros)

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/leads`
- Busca todos os leads do funil (list view)
- Ordena por `updated_at` desc
- **Status na nova API:** ✅ Implementado (carrega 10 por coluna inicialmente)

#### ✅ **GET** `/workspaces/:workspaceId/leads/:leadId`
- Busca um lead específico
- **Status na nova API:** ✅ Implementado

#### ✅ **POST** `/workspaces/:workspaceId/funnels/:funnelId/leads`
- Cria um novo lead
- Calcula posição automaticamente
- Atualiza stats
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

#### ✅ **PUT** `/workspaces/:workspaceId/leads/:leadId`
- Atualiza um lead
- Atualiza stats se necessário
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

#### ✅ **POST** `/workspaces/:workspaceId/leads/:leadId/move`
- Move lead entre colunas
- Atualiza posição
- Atualiza stats
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

#### ✅ **POST** `/workspaces/:workspaceId/leads/batch-move`
- Move múltiplos leads de uma vez
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

#### ✅ **DELETE** `/workspaces/:workspaceId/leads/:leadId`
- Soft delete (marca como `status = 'deleted'`)
- Atualiza stats
- **Status na nova API:** ❌ **NÃO IMPLEMENTADO**

#### ✅ **GET** `/workspaces/:workspaceId/funnels/:funnelId/search`
- Busca leads com filtros (query, priority, assignee, tags)
- **Status na nova API:** ✅ Implementado (filtros integrados em getColumnLeads)

---

## 📋 Resumo de Funcionalidades

### ✅ **Implementadas na Nova API:**
1. ✅ GET funis (lista e individual)
2. ✅ GET colunas (lista e individual)
3. ✅ GET leads (coluna, funil, individual)
4. ✅ GET stats
5. ✅ Filtros (hasEmail, hasWhatsapp, searchQuery, priority, assignee, tags)
6. ✅ Paginação
7. ✅ Carregamento lazy (10 leads por coluna inicialmente)

### ❌ **NÃO Implementadas na Nova API:**
1. ❌ **POST** criar funil
2. ❌ **PUT** atualizar funil
3. ❌ **DELETE** deletar funil
4. ❌ **POST** recalculate-stats
5. ❌ **POST** criar lead
6. ❌ **PUT** atualizar lead
7. ❌ **POST** mover lead
8. ❌ **POST** batch-move leads
9. ❌ **DELETE** deletar lead

---

## 🎯 Recomendações

### **Prioridade ALTA (CRUD Básico):**
1. **POST** criar lead
2. **PUT** atualizar lead
3. **POST** mover lead
4. **DELETE** deletar lead

### **Prioridade MÉDIA (Gestão de Funis):**
5. **POST** criar funil
6. **PUT** atualizar funil
7. **DELETE** deletar funil

### **Prioridade BAIXA (Otimizações):**
8. **POST** batch-move leads
9. **POST** recalculate-stats

---

## 📝 Notas

- A nova API foi focada em **leitura otimizada** (GET operations)
- Funcionalidades de **escrita** (POST, PUT, DELETE) não foram implementadas
- A nova API tem **filtros no backend** (melhoria em relação à antiga)
- A nova API tem **carregamento lazy** (melhoria em relação à antiga)

---

## 🔍 Detalhes das Funcionalidades Faltantes

### **1. CRUD de Funis**

#### **POST** `/workspaces/:workspaceId/funnels`
**Funcionalidade:**
- Cria novo funil
- Cria 5 colunas padrão: "Novo Lead", "Contato Inicial", "Proposta", "Negociação", "Fechado"
- Inicializa `funnel_stats` com valores zerados
- Calcula posição automaticamente (max + 1)

**Implementação necessária:**
- Service: `createFunnel()` em `funnels.service.ts`
- Route: POST em `routes/funnels.ts`

---

#### **PUT** `/workspaces/:workspaceId/funnels/:funnelId`
**Funcionalidade:**
- Atualiza nome e descrição do funil
- Gerencia colunas (criar, atualizar, deletar)
- Previne deleção de colunas com leads
- Gerencia posições de colunas (resolve conflitos)

**Implementação necessária:**
- Service: `updateFunnel()` em `funnels.service.ts`
- Route: PUT em `routes/funnels.ts`

---

#### **DELETE** `/workspaces/:workspaceId/funnels/:funnelId`
**Funcionalidade:**
- Soft delete (marca `is_active = false`)
- Não deleta leads associados

**Implementação necessária:**
- Service: `deleteFunnel()` em `funnels.service.ts`
- Route: DELETE em `routes/funnels.ts`

---

### **2. CRUD de Leads**

#### **POST** `/workspaces/:workspaceId/funnels/:funnelId/leads`
**Funcionalidade:**
- Cria novo lead
- Calcula posição automaticamente (max + 1 na coluna)
- Atualiza stats do funil
- Valida permissões (member+)

**Implementação necessária:**
- Service: `createLead()` em `leads.service.ts`
- Route: POST em `routes/leads.ts`

---

#### **PUT** `/workspaces/:workspaceId/leads/:leadId`
**Funcionalidade:**
- Atualiza campos do lead
- Atualiza stats se `dealValue` ou `priority` mudarem
- Valida permissões (member+)

**Implementação necessária:**
- Service: `updateLead()` em `leads.service.ts`
- Route: PUT em `routes/leads.ts`

---

#### **POST** `/workspaces/:workspaceId/leads/:leadId/move`
**Funcionalidade:**
- Move lead entre colunas (drag & drop)
- Atualiza posição
- Atualiza stats (move entre colunas)
- Atualiza `last_activity_at`

**Implementação necessária:**
- Service: `moveLead()` em `leads.service.ts`
- Route: POST em `routes/leads.ts`

---

#### **POST** `/workspaces/:workspaceId/leads/batch-move`
**Funcionalidade:**
- Move múltiplos leads de uma vez
- Retorna array com resultados (sucesso/erro por lead)

**Implementação necessária:**
- Service: `batchMoveLeads()` em `leads.service.ts`
- Route: POST em `routes/leads.ts`

---

#### **DELETE** `/workspaces/:workspaceId/leads/:leadId`
**Funcionalidade:**
- Hard delete (deleta permanentemente com CASCADE)
- Deleta: custom_values, activities, attachments, campaign_logs, campaign_messages
- Desvincula conversas (seta `lead_id = null`)
- Atualiza stats

**Implementação necessária:**
- Service: `deleteLead()` ou `hardDeleteLead()` em `leads.service.ts`
- Route: DELETE em `routes/leads.ts`

---

### **3. Estatísticas**

#### **POST** `/workspaces/:workspaceId/funnels/:funnelId/recalculate-stats`
**Funcionalidade:**
- Recalcula estatísticas manualmente
- Útil para corrigir inconsistências
- Atualiza `funnel_stats` com valores reais

**Implementação necessária:**
- Service: `recalculateStats()` em `stats.service.ts`
- Route: POST em `routes/stats.ts`

---

## 🎯 Plano de Implementação

### **Fase 1: CRUD Básico de Leads (Prioridade ALTA)**
1. ✅ POST criar lead
2. ✅ PUT atualizar lead
3. ✅ POST mover lead
4. ✅ DELETE deletar lead

### **Fase 2: CRUD de Funis (Prioridade MÉDIA)**
5. ✅ POST criar funil
6. ✅ PUT atualizar funil
7. ✅ DELETE deletar funil

### **Fase 3: Funcionalidades Avançadas (Prioridade BAIXA)**
8. ✅ POST batch-move leads
9. ✅ POST recalculate-stats

---

**Conclusão:** A nova API está focada em **performance de leitura**, mas falta implementar **operações de escrita** (CRUD completo). Recomendamos implementar as funcionalidades de escrita para ter paridade completa com a API antiga.

