# 🧪 Como Executar os Testes - Kanban API

**Data:** 10/12/2025

---

## 📋 Pré-requisitos

1. **Token JWT do usuário** - Obtenha fazendo login no frontend
2. **Workspace ID** - ID do workspace que você tem acesso
3. **Funnel ID** (opcional) - ID de um funil existente
4. **Column ID** (opcional) - ID de uma coluna existente
5. **Lead ID** (opcional) - ID de um lead existente

---

## 🔑 Como Obter o Token JWT

### **Opção 1: Via DevTools do Navegador**

1. Abra o frontend da aplicação
2. Faça login
3. Abra o DevTools (F12)
4. Vá para **Application** > **Local Storage**
5. Procure por `sb-<project-id>-auth-token`
6. Copie o valor do token

### **Opção 2: Via Supabase Client (JavaScript)**

```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
console.log('Token:', token);
```

---

## 🪟 Windows (PowerShell)

### **1. Configurar Variáveis de Ambiente**

```powershell
# Definir variáveis de ambiente
$env:SUPABASE_URL = "https://nlbcwaxkeaddfocigwuk.supabase.co"
$env:USER_TOKEN = "seu-jwt-token-aqui"
$env:WORKSPACE_ID = "seu-workspace-id"
$env:FUNNEL_ID = "seu-funnel-id"  # Opcional
$env:COLUMN_ID = "seu-column-id"  # Opcional
$env:LEAD_ID = "seu-lead-id"      # Opcional
```

### **2. Executar Script**

```powershell
# Executar script PowerShell
.\supabase\functions\kanban-api\TESTES-ENDPOINTS-COMPLETOS.ps1
```

---

## 🐧 Linux/Mac (Bash)

### **1. Configurar Variáveis de Ambiente**

```bash
# Definir variáveis de ambiente
export SUPABASE_URL="https://nlbcwaxkeaddfocigwuk.supabase.co"
export USER_TOKEN="seu-jwt-token-aqui"
export WORKSPACE_ID="seu-workspace-id"
export FUNNEL_ID="seu-funnel-id"  # Opcional
export COLUMN_ID="seu-column-id"  # Opcional
export LEAD_ID="seu-lead-id"      # Opcional
```

### **2. Executar Script**

```bash
# Dar permissão de execução (apenas primeira vez)
chmod +x supabase/functions/kanban-api/TESTES-ENDPOINTS-COMPLETOS.sh

# Executar script
./supabase/functions/kanban-api/TESTES-ENDPOINTS-COMPLETOS.sh
```

---

## 📝 Testes Manuais com cURL

Se preferir testar manualmente, veja exemplos em `TESTES-ENDPOINTS-COMPLETOS.md`.

### **Exemplo: Listar Funis**

```bash
curl -X GET \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$WORKSPACE_ID/funnels"
```

---

## ✅ Checklist de Testes

O script testa automaticamente:

### **1. Leitura (GET)**
- [x] Listar funis
- [x] Buscar funil específico
- [x] Listar colunas
- [x] Buscar leads iniciais
- [x] Buscar leads de coluna
- [x] Buscar lead específico
- [x] Buscar estatísticas

### **2. Criação (POST)**
- [x] Criar funil
- [x] Criar lead

### **3. Atualização (PUT)**
- [x] Atualizar funil
- [x] Atualizar lead

### **4. Movimentação (POST MOVE)**
- [x] Mover lead (drag & drop)
- [x] Batch move leads

### **5. Estatísticas (POST RECALCULATE)**
- [x] Recalcular stats

### **6. Filtros**
- [x] Filtro hasEmail
- [x] Filtro hasWhatsapp
- [x] Filtro searchQuery
- [x] Filtro priority
- [x] Paginação

### **7. Validação (Erros Esperados)**
- [x] Criar lead sem campos obrigatórios (400)
- [x] Buscar funil inexistente (404)
- [x] Buscar lead inexistente (404)

---

## 📊 Interpretando os Resultados

### **✅ Teste Passou**
```
[✅ PASSOU] Descrição do teste (HTTP 200)
```

### **❌ Teste Falhou**
```
[❌ FALHOU] Descrição do teste (Esperado: HTTP 200, Recebido: HTTP 500)
```

### **⚠️ Aviso**
```
[⚠️  AVISO] Mensagem de aviso
```

---

## 🔍 Troubleshooting

### **Erro 401: Unauthorized**
- Verifique se o `USER_TOKEN` está correto
- Verifique se o token não expirou
- Faça login novamente e obtenha um novo token

### **Erro 403: Forbidden**
- Verifique se o `WORKSPACE_ID` está correto
- Verifique se você tem acesso ao workspace
- Verifique se você é membro do workspace

### **Erro 404: Not Found**
- Verifique se os IDs (FUNNEL_ID, COLUMN_ID, LEAD_ID) estão corretos
- Verifique se os recursos existem no workspace

### **Erro 500: Internal Server Error**
- Verifique os logs da Edge Function no Supabase Dashboard
- Verifique se a Edge Function foi deployada corretamente

---

## 📝 Notas

- **Testes Destrutivos:** Os testes de DELETE são destrutivos. Use com cuidado!
- **Dados de Teste:** O script cria dados de teste automaticamente quando necessário
- **Performance:** O script mede o tempo de resposta para alguns testes
- **Validação:** O script valida a estrutura das respostas quando possível

---

## 🚀 Próximos Passos

Após executar os testes:

1. **Verificar Resultados** - Todos os testes devem passar
2. **Corrigir Erros** - Se algum teste falhar, verifique os logs
3. **Deploy** - Se todos os testes passarem, faça deploy da Edge Function
4. **Migração Frontend** - Atualize o frontend para usar a nova API

