# 📋 Prompt Conciso: Estrutura de Dados do Card Kanban

## 🎯 Objetivo

Criar a apresentação visual do card do Kanban usando apenas os dados retornados pela API `kanban-api`.

---

## 📦 Estrutura de Dados do Card

### **Endpoint da API:**
```
GET /kanban-api/workspaces/{workspaceId}/funnels/{funnelId}/leads?limit=10
```

### **Resposta JSON:**
```json
{
  "columns": {
    "column-id-1": {
      "leads": [
        {
          "id": "uuid",
          "clientName": "Nome do Cliente",      // ✅ SEMPRE presente
          "company": "Nome da Empresa",         // ⚠️ Pode ser ""
          "email": "email@exemplo.com",        // ⚠️ Pode ser "" (não mostrar se vazio)
          "phone": "11987654321",               // ⚠️ Pode ser "" (não mostrar se vazio)
          "avatar": "https://...",              // ⚠️ Pode ser "" (usar placeholder)
          "priority": "high" | "medium" | "low", // ✅ SEMPRE presente
          "isImportant": false,                 // ✅ SEMPRE presente
          "assignee": {                         // ⚠️ Opcional (undefined se não atribuído)
            "name": "Nome do Usuário",
            "avatar": "https://..."
          },
          "tags": ["tag1", "tag2"],             // ⚠️ Pode ser []
          "dealValue": 0,                       // ⚠️ Pode ser 0 (não mostrar se 0)
          "emailsCount": 0                      // ⚠️ Pode ser 0 (não mostrar se 0)
        }
      ],
      "total": 1174,
      "hasMore": true
    }
  }
}
```

---

## 🎨 Layout Mínimo do Card

```
┌─────────────────────────────────┐
│ [Avatar] Nome do Cliente        │  ← clientName (sempre)
│        Nome da Empresa           │  ← company (se não vazio)
│                                 │
│ 📧 email@exemplo.com            │  ← email (apenas se não vazio)
│ 📱 (11) 98765-4321              │  ← phone (apenas se não vazio)
│                                 │
│ [🔴 High] [Tag1] [Tag2]         │  ← priority + tags (se houver)
│ 👤 Maria Santos                 │  ← assignee (se existir)
│ 💰 R$ 5.000,00                  │  ← dealValue (se > 0)
└─────────────────────────────────┘
```

---

## ✅ Regras de Exibição

| Campo | Condição | Ação |
|-------|----------|------|
| `clientName` | Sempre presente | ✅ Sempre mostrar |
| `company` | Pode ser `""` | ⚠️ Mostrar apenas se não vazio |
| `email` | Pode ser `""` | ⚠️ Mostrar apenas se não vazio |
| `phone` | Pode ser `""` | ⚠️ Mostrar apenas se não vazio |
| `avatar` | Pode ser `""` | ⚠️ Usar placeholder com iniciais se vazio |
| `priority` | Sempre presente | ✅ Badge colorido (high=🔴, medium=🟡, low=⚪) |
| `isImportant` | Sempre presente | ✅ Ícone ⭐ se `true` |
| `assignee` | Pode ser `undefined` | ⚠️ Mostrar apenas se existir |
| `tags` | Pode ser `[]` | ⚠️ Mostrar chips apenas se `length > 0` |
| `dealValue` | Pode ser `0` | ⚠️ Mostrar apenas se `> 0` |
| `emailsCount` | Pode ser `0` | ⚠️ Badge apenas se `> 0` |

---

## 📝 Exemplo Prático

### **Card Completo:**
```json
{
  "clientName": "João Silva",
  "company": "Empresa XYZ Ltda",
  "email": "joao@empresa.com.br",
  "phone": "11987654321",
  "avatar": "https://...",
  "priority": "high",
  "isImportant": true,
  "assignee": { "name": "Maria Santos", "avatar": "..." },
  "tags": ["Tag1", "Tag2"],
  "dealValue": 5000,
  "emailsCount": 3
}
```

**Exibição:**
```
┌─────────────────────────────────────┐
│ ⭐ [Avatar] João Silva               │
│    Empresa XYZ Ltda                 │
│                                     │
│ 📧 joao@empresa.com.br              │
│ 📱 (11) 98765-4321                  │
│                                     │
│ [🔴 High] [Tag1] [Tag2]             │
│ 👤 Maria Santos                     │
│ 💰 R$ 5.000,00                      │
│ 📧 3                                │
└─────────────────────────────────────┘
```

### **Card Mínimo (Sem Email/Telefone):**
```json
{
  "clientName": "Sem nome",
  "company": "",
  "email": "",
  "phone": "",
  "avatar": "",
  "priority": "medium",
  "isImportant": false
}
```

**Exibição:**
```
┌─────────────────────────────────────┐
│ [SN] Sem nome                       │  ← Placeholder "SN" se avatar vazio
│                                     │
│ [🟡 Medium]                         │
└─────────────────────────────────────┘
```

---

## 🎯 Checklist de Implementação

- [ ] Card mostra `clientName` (sempre)
- [ ] Card mostra `company` (apenas se não vazio)
- [ ] Card mostra `email` (apenas se não vazio)
- [ ] Card mostra `phone` (apenas se não vazio)
- [ ] Card mostra `avatar` ou placeholder com iniciais
- [ ] Card mostra `priority` como badge colorido
- [ ] Card mostra ⭐ se `isImportant === true`
- [ ] Card mostra `assignee` (apenas se existir)
- [ ] Card mostra `tags` (apenas se `length > 0`)
- [ ] Card mostra `dealValue` (apenas se `> 0`)
- [ ] Card mostra `emailsCount` (apenas se `> 0`)

---

## ⚠️ Observações Importantes

1. **Email e Telefone:** A API retorna apenas 1 email e 1 telefone (os principais). Se não houver, os campos vêm como `""` (string vazia).

2. **Avatar:** Se `avatar === ""`, criar placeholder com as iniciais de `clientName` (ex: "João Silva" → "JS").

3. **Nome:** Se `clientName === "Sem nome"`, mostrar em itálico ou cor cinza para indicar que é placeholder.

4. **Prioridade:** Badge colorido:
   - `high` = 🔴 Vermelho
   - `medium` = 🟡 Amarelo (ou não mostrar se for padrão)
   - `low` = ⚪ Cinza

5. **Dados Detalhados:** Os dados completos (todos os emails, telefones, custom_fields) são carregados apenas quando o usuário abre o modal do lead.

---

**Nota:** Este prompt foca apenas na apresentação inicial do card. Dados detalhados são carregados sob demanda quando o usuário interage com o lead.

