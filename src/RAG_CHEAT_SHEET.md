# 📄 RAG Switch - Cheat Sheet

## 🎯 Comandos Rápidos

### Verificar Estado
```typescript
// Hook no componente
const { ragEnabled } = useRagEnabled(agentId);

// Console do navegador
const { data } = await supabase
  .from('ai_agents')
  .select('rag_enabled')
  .eq('id', agentId)
  .single();
```

### Ativar/Desativar
```typescript
// Via hook
await setRagEnabled(true);   // Ativar
await setRagEnabled(false);  // Desativar

// Via console
await supabase
  .from('ai_agents')
  .update({ rag_enabled: true })
  .eq('id', agentId);
```

---

## 📦 Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| `/hooks/useRagEnabled.ts` | Gerencia estado |
| `/components/RagEnabledSwitch.tsx` | UI do switch |
| `/components/RagKnowledgeBase.tsx` | Container |

---

## 🎨 Estados do Switch

```
🟢 ON  + Verde    = RAG ativo
⚫ OFF + Cinza    = RAG inativo
⚠️ Disabled       = Sem documentos
⏳ Spinner        = Salvando
📦 Skeleton       = Carregando
```

---

## 🔧 Backend (TODO)

### 1. SQL
```sql
ALTER TABLE ai_agents 
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true;
```

### 2. Edge Function
```typescript
const agent = await supabase
  .from('ai_agents')
  .select('*, rag_enabled')
  .eq('id', agentId)
  .single();

if (agent.rag_enabled) {
  // Fazer RAG
} else {
  // Pular RAG
}
```

---

## 🧪 Testes

### Teste 1: Verificar Switch
```
1. Abrir configuração do agente
2. Ver switch na seção "Base de Conhecimento"
3. Verificar estado inicial
```

### Teste 2: Toggle
```
1. Clicar no switch
2. Ver toast de confirmação
3. Verificar mudança de cor
4. Recarregar página
5. Estado deve persistir
```

### Teste 3: Backend
```
1. Ativar RAG
2. Enviar mensagem teste
3. Verificar resposta (com docs)
4. Desativar RAG
5. Enviar mesma mensagem
6. Verificar resposta (sem docs)
```

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| Column not found | Criar coluna no SQL |
| Switch não muda | Verificar RLS policies |
| RAG ignora toggle | Atualizar backend |

---

## 📊 Logs

### Frontend
```
[useRagEnabled] Loading state for agent: xxx
[useRagEnabled] Current state: true
[useRagEnabled] Updating state to: false
[useRagEnabled] State updated successfully
```

### Backend
```
[ai-process] Agent: Assistente, RAG enabled: true
[ai-process] RAG: Found 3 chunks
```

---

## 📚 Docs Completas

| Doc | Link |
|-----|------|
| Quick Start | [RAG_QUICK_START.md](./RAG_QUICK_START.md) |
| Resumo | [RAG_SUMMARY.md](./RAG_SUMMARY.md) |
| Guia Switch | [RAG_ENABLED_SWITCH.md](./RAG_ENABLED_SWITCH.md) |
| Fluxo | [RAG_FLOW_DIAGRAM.md](./RAG_FLOW_DIAGRAM.md) |
| Testes | [RAG_TEST_SCRIPT.md](./RAG_TEST_SCRIPT.md) |
| Índice | [RAG_INDEX.md](./RAG_INDEX.md) |

---

## ✅ Checklist

### Frontend ✅
- [x] Hook
- [x] Componente
- [x] Integrado
- [x] Docs

### Backend ⏳
- [ ] Coluna
- [ ] Edge Function
- [ ] Testado

---

**Tempo backend:** ~30min | **Status:** ✅ Pronto
