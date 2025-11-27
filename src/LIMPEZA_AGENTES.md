# 🧹 Limpeza de Agentes Duplicados

## ✅ Problema Resolvido

O sistema agora **PREVINE** a criação de duplicatas:
- ✅ Ao abrir a página, busca o agente existente
- ✅ Se encontrar, usa **UPDATE**
- ✅ Se não encontrar, usa **INSERT**

## 🗑️ Como Limpar os Agentes Duplicados Existentes

### Opção 1: Via Console do Navegador (RECOMENDADO)

1. Abra o DevTools do navegador (F12)
2. Vá para a aba **Console**
3. Cole e execute este código:

```javascript
// Primeiro, listar os agentes
import('./utils/cleanup-duplicate-agents').then(m => m.listAgents())
```

4. Você verá uma tabela com todos os agentes. Exemplo:
```
📊 Total de agentes: 5
┌─────┬──────────────────────────┬─────────────────────────┬─────────────────────────┬──────────┐
│ id  │ name                     │ created_at              │ is_active                │
├─────┼──────────────────────────┼─────────────────────────┼──────────────────────────┼──────────┤
│ ... │ Assistente Pesca Lead    │ 2024-01-15T01:19:00Z    │ true                     │
│ ... │ Atendente Virtual 2      │ 2024-01-15T13:07:00Z    │ true                     │
│ ... │ Atendente Virtual 2      │ 2024-01-15T13:07:00Z    │ true                     │
│ ... │ Atendente Virtual 2      │ 2024-01-15T13:07:00Z    │ true                     │
│ ... │ Atendente Virtual 2      │ 2024-01-15T13:08:00Z    │ true                     │
└─────┴──────────────────────────┴─────────────────────────┴─────────────────────────┴──────────┘
```

5. Confirme que há duplicatas e execute o cleanup:

```javascript
import('./utils/cleanup-duplicate-agents').then(m => m.cleanupDuplicateAgents())
```

6. Você verá um resumo e uma confirmação:
```
🔍 Workspace ID: ...
📊 Total de agentes encontrados: 5

🎯 Mantendo agente: Assistente Pesca Lead (id-original)
🗑️  Removendo 4 duplicados:
   1. Atendente Virtual 2 - id-dup1 - 2024-01-15T13:07:00Z
   2. Atendente Virtual 2 - id-dup2 - 2024-01-15T13:07:00Z
   3. Atendente Virtual 2 - id-dup3 - 2024-01-15T13:07:00Z
   4. Atendente Virtual 2 - id-dup4 - 2024-01-15T13:08:00Z
```

7. Confirme a operação no popup

8. Após a confirmação:
```
✅ Sucesso! 4 agente(s) duplicado(s) removido(s).
✅ Agente mantido: Assistente Pesca Lead (id-original)

🔄 Recarregue a página para ver as mudanças.
```

9. **Recarregue a página** (F5)

---

### Opção 2: Via Supabase Dashboard (MANUAL)

1. Acesse: https://supabase.com/dashboard
2. Vá em: **Table Editor** → **ai_agents**
3. Identifique os agentes duplicados pela coluna `created_at`
4. Delete manualmente os duplicados (MANTENHA O PRIMEIRO)

⚠️ **CUIDADO**: Certifique-se de manter o agente ORIGINAL (mais antigo)

---

## 🔍 Como Verificar se Funcionou

1. Após recarregar a página, abra o Console (F12)
2. Você deve ver:
```
[AIServiceView] ✅ Agente existente encontrado: {
  id: "...",
  name: "Assistente Pesca Lead",
  created_at: "2024-01-15T01:19:00Z"
}
[AgentConfigForm] 📥 Carregando dados do agente: ...
[AgentConfigForm] ✅ Agente carregado: Assistente Pesca Lead
```

3. Ao salvar alterações, deve aparecer:
```
[AgentConfigForm] 🔄 MODO UPDATE - Agente ID: ...
[AgentConfigForm] ✅ Agente atualizado: ...
```

✅ **Nunca mais** deve aparecer `MODO INSERT` (a menos que você delete o agente)

---

## 📝 Notas Técnicas

- **Agente mantido**: Sempre o mais antigo (`created_at ASC`)
- **Relações**: As tabelas `ai_agent_inboxes` e `ai_agent_attendants` são limpas automaticamente via `ON DELETE CASCADE`
- **RAG Documents**: São mantidos apenas do agente original
- **Segurança**: A função pede confirmação antes de deletar

---

## 🎯 Resultado Final

Após a limpeza e correção:
- ✅ 1 único agente por workspace
- ✅ Edições sempre usam UPDATE
- ✅ Sem duplicatas
- ✅ Histórico preservado
