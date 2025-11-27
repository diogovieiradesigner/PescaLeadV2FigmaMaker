# ⚡ Quick Start - Switch de RAG

## 🎯 O Que Foi Feito

✅ Sistema de **toggle** para ativar/desativar RAG sem deletar documentos  
✅ 3 arquivos de código frontend  
✅ 4 arquivos de documentação  
✅ Estados visuais completos  
✅ **100% funcional no frontend**

---

## 📦 Arquivos Criados

```
/hooks/useRagEnabled.ts              (90 linhas)
/components/RagEnabledSwitch.tsx     (110 linhas)
/components/RagKnowledgeBase.tsx     (atualizado)
/RAG_ENABLED_SWITCH.md               (documentação completa)
/RAG_TEST_SCRIPT.md                  (scripts de teste)
/RAG_FLOW_DIAGRAM.md                 (diagrama visual)
/RAG_SUMMARY.md                      (resumo executivo)
```

---

## 🚀 Como Usar

### **1. Abrir Configuração do Agente**
```
Menu → Serviço IA → Configuração
```

### **2. Ir até "Base de Conhecimento"**
```
┌────────────────────────────────────────┐
│ 📖 Usar Base de Conhecimento  [====●]  │ ← AQUI
│ O agente consultará os documentos...   │
│ 🟢 Ativo                               │
└────────────────────────────────────────┘
```

### **3. Fazer Upload de Documentos**
```
Arrastar PDF, DOCX, TXT, etc.
```

### **4. Clicar no Switch**
```
ON  = RAG ativo  = consulta documentos
OFF = RAG inativo = ignora documentos
```

---

## ⚠️ O Que Falta (Backend)

### **1. Criar Coluna no Banco** (2 min)

```sql
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true;
```

### **2. Atualizar Edge Function** (15 min)

```typescript
// Buscar agente com rag_enabled
const agent = await supabase
  .from('ai_agents')
  .select('*, rag_enabled')
  .eq('id', agentId)
  .single();

// Verificar antes de fazer RAG
if (agent.rag_enabled) {
  const ragResults = await searchGemini(...);
} else {
  console.log('RAG disabled');
}
```

### **3. Testar** (10 min)

- [ ] Enviar mensagem com RAG ON
- [ ] Enviar mensagem com RAG OFF
- [ ] Comparar respostas

**Total:** ~30 minutos

---

## 🧪 Teste Rápido (3 min)

### Console do Navegador (F12)

```javascript
// Ver estado atual
const { data } = await supabase
  .from('ai_agents')
  .select('id, name, rag_enabled')
  .single();

console.log('RAG enabled:', data.rag_enabled);

// Ativar RAG
await supabase
  .from('ai_agents')
  .update({ rag_enabled: true })
  .eq('id', 'SEU_AGENT_ID');

// Desativar RAG
await supabase
  .from('ai_agents')
  .update({ rag_enabled: false })
  .eq('id', 'SEU_AGENT_ID');
```

---

## 📊 Estados Visuais

| Estado | Descrição |
|--------|-----------|
| 🟢 **Ativo** | Verde, switch ON, RAG funcionando |
| ⚫ **Inativo** | Cinza, switch OFF, RAG desativado |
| ⚠️ **Sem Docs** | Amarelo, switch disabled, sem documentos |
| ⏳ **Salvando** | Spinner, atualizando banco |

---

## 🐛 Problemas Comuns

### ❌ **Column "rag_enabled" does not exist**
```sql
ALTER TABLE ai_agents 
ADD COLUMN rag_enabled BOOLEAN DEFAULT true;
```

### ❌ **Switch não muda**
Verificar:
- Console do navegador (erros?)
- Network tab (requisição enviada?)
- Supabase RLS policies

### ❌ **RAG continua executando**
Backend não está verificando `rag_enabled`

---

## 📚 Documentação Completa

| Arquivo | Conteúdo |
|---------|----------|
| [RAG_ENABLED_SWITCH.md](./RAG_ENABLED_SWITCH.md) | Guia completo |
| [RAG_TEST_SCRIPT.md](./RAG_TEST_SCRIPT.md) | Scripts de teste |
| [RAG_FLOW_DIAGRAM.md](./RAG_FLOW_DIAGRAM.md) | Diagrama visual |
| [RAG_SUMMARY.md](./RAG_SUMMARY.md) | Resumo executivo |

---

## ✅ Checklist

### Frontend (Concluído)
- [x] Hook criado
- [x] Componente criado
- [x] Integrado
- [x] Estados visuais
- [x] Documentado

### Backend (Pendente)
- [ ] Coluna criada
- [ ] Edge Function atualizada
- [ ] Testado

---

## 🎯 TL;DR

✅ **Frontend:** 100% pronto  
⏳ **Backend:** 30 min de trabalho  
📚 **Docs:** Completa (4 arquivos)  
🚀 **Status:** Pronto para integração

---

**Próximo passo:** Criar coluna no banco e atualizar backend! 🚀
