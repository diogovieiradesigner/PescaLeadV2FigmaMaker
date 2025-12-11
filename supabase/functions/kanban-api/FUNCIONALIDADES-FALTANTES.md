# ❌ Funcionalidades Faltantes na Nova Kanban API

**Data:** 10/12/2025

---

## 📋 Resumo Executivo

A nova `kanban-api` foi criada focada em **performance de leitura** (GET operations), mas **não implementa operações de escrita** (POST, PUT, DELETE).

**Status:**
- ✅ **Leitura:** 100% implementado (com melhorias)
- ❌ **Escrita:** 0% implementado

---

## 🔴 Funcionalidades CRÍTICAS Faltantes

### **1. CRUD de Leads**

#### ❌ **POST** `/workspaces/:workspaceId/funnels/:funnelId/leads`
**O que faz:**
- Cria novo lead no kanban
- Calcula posição automaticamente
- Atualiza stats do funil

**Impacto:** ⚠️ **ALTO** - Usuários não conseguem criar leads manualmente

---

#### ❌ **PUT** `/workspaces/:workspaceId/leads/:leadId`
**O que faz:**
- Atualiza campos do lead (nome, empresa, valor, prioridade, etc.)
- Atualiza stats se necessário

**Impacto:** ⚠️ **ALTO** - Usuários não conseguem editar leads

---

#### ❌ **POST** `/workspaces/:workspaceId/leads/:leadId/move`
**O que faz:**
- Move lead entre colunas (drag & drop)
- Atualiza posição
- Atualiza stats

**Impacto:** ⚠️ **CRÍTICO** - Funcionalidade principal do Kanban não funciona

---

#### ❌ **DELETE** `/workspaces/:workspaceId/leads/:leadId`
**O que faz:**
- Deleta lead permanentemente (hard delete com CASCADE)
- Remove todos os dados relacionados

**Impacto:** ⚠️ **MÉDIO** - Usuários não conseguem deletar leads

---

### **2. CRUD de Funis**

#### ❌ **POST** `/workspaces/:workspaceId/funnels`
**O que faz:**
- Cria novo funil (kanban)
- Cria 5 colunas padrão
- Inicializa stats

**Impacto:** ⚠️ **MÉDIO** - Usuários não conseguem criar novos kanbans

---

#### ❌ **PUT** `/workspaces/:workspaceId/funnels/:funnelId`
**O que faz:**
- Atualiza nome do funil
- Gerencia colunas (criar, atualizar, deletar)
- Previne deleção de colunas com leads

**Impacto:** ⚠️ **MÉDIO** - Usuários não conseguem editar kanbans

---

#### ❌ **DELETE** `/workspaces/:workspaceId/funnels/:funnelId`
**O que faz:**
- Soft delete do funil (marca como inativo)

**Impacto:** ⚠️ **BAIXO** - Usuários não conseguem deletar kanbans

---

### **3. Funcionalidades Auxiliares**

#### ❌ **POST** `/workspaces/:workspaceId/leads/batch-move`
**O que faz:**
- Move múltiplos leads de uma vez

**Impacto:** ⚠️ **BAIXO** - Funcionalidade de conveniência

---

#### ❌ **POST** `/workspaces/:workspaceId/funnels/:funnelId/recalculate-stats`
**O que faz:**
- Recalcula estatísticas manualmente

**Impacto:** ⚠️ **BAIXO** - Funcionalidade de manutenção

---

## 📊 Matriz de Prioridades

| Funcionalidade | Prioridade | Impacto | Esforço |
|----------------|------------|---------|---------|
| **POST** mover lead | 🔴 CRÍTICA | Alto | Médio |
| **PUT** atualizar lead | 🔴 CRÍTICA | Alto | Médio |
| **POST** criar lead | 🟡 ALTA | Alto | Médio |
| **DELETE** deletar lead | 🟡 ALTA | Médio | Médio |
| **POST** criar funil | 🟢 MÉDIA | Médio | Alto |
| **PUT** atualizar funil | 🟢 MÉDIA | Médio | Alto |
| **POST** batch-move | 🔵 BAIXA | Baixo | Baixo |
| **POST** recalculate-stats | 🔵 BAIXA | Baixo | Baixo |

---

## 🚀 Recomendação de Implementação

### **Fase 1: Funcionalidades Críticas (Semana 1)**
1. ✅ POST mover lead
2. ✅ PUT atualizar lead

### **Fase 2: CRUD Básico (Semana 2)**
3. ✅ POST criar lead
4. ✅ DELETE deletar lead

### **Fase 3: Gestão de Funis (Semana 3)**
5. ✅ POST criar funil
6. ✅ PUT atualizar funil
7. ✅ DELETE deletar funil

### **Fase 4: Funcionalidades Avançadas (Opcional)**
8. ✅ POST batch-move
9. ✅ POST recalculate-stats

---

## 📝 Notas Técnicas

### **Diferenças de Implementação:**

1. **Hard Delete vs Soft Delete:**
   - API antiga: Hard delete com CASCADE
   - Nova API: Pode implementar soft delete primeiro (mais seguro)

2. **Stats:**
   - API antiga: Usa tabela `funnel_stats`
   - Nova API: Calcula stats em tempo real (mais preciso, mas pode ser mais lento)

3. **Permissões:**
   - API antiga: Valida `memberRole` (member, admin, owner)
   - Nova API: Precisa implementar validação de permissões

4. **Posições:**
   - API antiga: Calcula posição automaticamente (max + 1)
   - Nova API: Mesma lógica necessária

---

**Status Atual:** A nova API está **funcional para leitura**, mas **não suporta operações de escrita**. É necessário implementar as funcionalidades de escrita para ter paridade completa.

