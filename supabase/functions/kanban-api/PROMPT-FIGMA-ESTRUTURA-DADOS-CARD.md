# 📋 Prompt para Figma Maker: Estrutura de Dados do Card do Kanban

## 🎯 Objetivo

Criar a apresentação visual do card do Kanban baseado na estrutura de dados retornada pela API `kanban-api`.

---

## 📦 Estrutura de Dados Retornada pela API

### **Endpoint:**
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
          "id": "lead-uuid",
          "workspace_id": "workspace-uuid",
          "funnel_id": "funnel-uuid",
          "column_id": "column-uuid",
          "position": 0,
          
          // DADOS PRINCIPAIS DO CARD
          "clientName": "Nome do Cliente",
          "company": "Nome da Empresa",
          "email": "email@exemplo.com",        // ⚠️ Pode ser vazio ""
          "phone": "11987654321",              // ⚠️ Pode ser vazio ""
          "avatar": "https://...",             // ⚠️ Pode ser vazio ""
          
          // VALORES E PRIORIDADE
          "dealValue": 0,
          "priority": "high" | "medium" | "low",
          "status": "active",
          
          // DATAS
          "contactDate": "2025-12-10T00:00:00Z",  // ⚠️ Pode ser null
          "expectedCloseDate": null,               // ⚠️ Pode ser null
          "dueDate": null,                        // ⚠️ Pode ser null
          
          // METADADOS
          "tags": ["tag1", "tag2"],               // ⚠️ Pode ser []
          "notes": "Notas do lead",               // ⚠️ Pode ser null
          "isImportant": false,
          
          // ATRIBUÍDO A
          "assignee": {
            "id": "user-uuid",
            "name": "Nome do Usuário",
            "avatar": "https://..."
          },                                      // ⚠️ Pode ser undefined
          
          // CONTADORES
          "commentsCount": 0,
          "attachmentsCount": 0,
          "callsCount": 0,
          "emailsCount": 0,                       // ⚠️ Pode ser 0
          
          // TIMESTAMPS
          "created_at": "2025-12-10T00:00:00Z",
          "updated_at": "2025-12-10T00:00:00Z"
        }
      ],
      "total": 1174,
      "hasMore": true,
      "limit": 10,
      "offset": 0
    }
  }
}
```

---

## 🎨 Dados para Exibir no Card (Mínimos Necessários)

### **1. Informações Principais (Sempre Visíveis)**

```
┌─────────────────────────────────┐
│ [Avatar] Nome do Cliente       │
│        Nome da Empresa          │
│                                 │
│ 📧 email@exemplo.com  (se houver)│
│ 📱 (11) 98765-4321   (se houver)│
└─────────────────────────────────┘
```

### **2. Campos Obrigatórios no Card:**

- ✅ **`clientName`** - Nome do cliente (sempre presente, pode ser "Sem nome")
- ✅ **`company`** - Nome da empresa (pode ser vazio "")
- ✅ **`email`** - Email principal (pode ser vazio "", mostrar apenas se existir)
- ✅ **`phone`** - Telefone principal (pode ser vazio "", mostrar apenas se existir)
- ✅ **`avatar`** - Avatar do lead (pode ser vazio "", usar placeholder se não houver)

### **3. Campos Opcionais (Mostrar se Existirem):**

- ⚠️ **`assignee`** - Pessoa atribuída (mostrar avatar/nome se existir)
- ⚠️ **`priority`** - Prioridade (badge colorido: high=vermelho, medium=amarelo, low=cinza)
- ⚠️ **`tags`** - Tags (mostrar como chips se houver)
- ⚠️ **`isImportant`** - Importante (ícone de estrela se `true`)
- ⚠️ **`emailsCount`** - Contador de emails (mostrar badge se > 0)
- ⚠️ **`dealValue`** - Valor do negócio (mostrar se > 0)

---

## 📝 Exemplo Prático de Card

### **Card com Todos os Dados:**
```
┌─────────────────────────────────────┐
│ ⭐ [Avatar] João Silva              │
│    Empresa XYZ Ltda                 │
│                                     │
│ 📧 joao@empresa.com.br              │
│ 📱 (11) 98765-4321                  │
│                                     │
│ [🔴 High] [Tag1] [Tag2]             │
│ 👤 Maria Santos                     │
│ 💰 R$ 5.000,00                      │
└─────────────────────────────────────┘
```

### **Card Mínimo (Sem Email/Telefone):**
```
┌─────────────────────────────────────┐
│ [Avatar] Sem nome                   │
│                                     │
│ [🔴 High]                           │
└─────────────────────────────────────┘
```

---

## ⚠️ Regras de Exibição

1. **Email:** Mostrar apenas se `email !== ""`
2. **Telefone:** Mostrar apenas se `phone !== ""`
3. **Avatar:** Se `avatar === ""`, usar placeholder com iniciais de `clientName`
4. **Nome:** Se `clientName === "Sem nome"`, mostrar "Sem nome" em itálico/cinza
5. **Empresa:** Se `company === ""`, não mostrar linha da empresa
6. **Prioridade:** Badge colorido apenas se `priority !== "medium"`
7. **Tags:** Mostrar apenas se `tags.length > 0`
8. **Assignee:** Mostrar apenas se `assignee !== undefined`
9. **Valor:** Mostrar apenas se `dealValue > 0`

---

## 🔄 Estados do Card

### **Estado Normal:**
- Card com borda padrão
- Todos os dados visíveis (se existirem)

### **Estado Importante (`isImportant: true`):**
- ⭐ Ícone de estrela no canto superior direito
- Borda destacada (amarela/dourada)

### **Estado Arrastando:**
- Opacidade reduzida (50%)
- Sombra aumentada

### **Estado Hover:**
- Sombra sutil
- Cursor pointer

---

## 📊 Resumo para Implementação

**Dados Mínimos para o Card:**
```typescript
{
  clientName: string,      // ✅ SEMPRE presente
  company: string,         // ⚠️ Pode ser ""
  email: string,           // ⚠️ Pode ser "" (não mostrar se vazio)
  phone: string,           // ⚠️ Pode ser "" (não mostrar se vazio)
  avatar: string,          // ⚠️ Pode ser "" (usar placeholder)
  priority: string,        // ✅ SEMPRE presente
  isImportant: boolean,    // ✅ SEMPRE presente
  assignee?: {            // ⚠️ Opcional
    name: string,
    avatar: string
  },
  tags: string[],         // ⚠️ Pode ser []
  dealValue: number,      // ⚠️ Pode ser 0
  emailsCount: number     // ⚠️ Pode ser 0
}
```

---

## ✅ Checklist de Implementação

- [ ] Card mostra `clientName` (sempre)
- [ ] Card mostra `company` (se não vazio)
- [ ] Card mostra `email` (apenas se não vazio)
- [ ] Card mostra `phone` (apenas se não vazio)
- [ ] Card mostra `avatar` ou placeholder
- [ ] Card mostra `priority` como badge colorido
- [ ] Card mostra `isImportant` como estrela
- [ ] Card mostra `assignee` (se existir)
- [ ] Card mostra `tags` (se houver)
- [ ] Card mostra `dealValue` (se > 0)
- [ ] Card mostra `emailsCount` (se > 0)

---

**Nota:** A API retorna apenas os dados necessários para exibição inicial do card. Dados detalhados (custom_fields completos) são carregados quando o usuário abre o modal do lead.

