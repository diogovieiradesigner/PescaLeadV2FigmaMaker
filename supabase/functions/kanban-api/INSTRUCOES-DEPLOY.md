# 🚀 Instruções de Deploy - Kanban API

## 📋 Pré-requisitos

- ✅ Supabase CLI instalado
- ✅ Projeto configurado
- ✅ Variáveis de ambiente configuradas

---

## 🔧 Deploy

### **1. Deploy da Edge Function**

```bash
# Navegar para o diretório do projeto
cd "C:\Users\Asus\Pictures\Pesca lead - Back-end"

# Deploy da função
supabase functions deploy kanban-api
```

### **2. Verificar Deploy**

```bash
# Listar funções deployadas
supabase functions list

# Ver logs
supabase functions logs kanban-api
```

### **3. Testar Health Check**

```bash
curl https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "service": "kanban-api",
  "version": "2.0.0",
  "timestamp": "2025-12-10T..."
}
```

---

## ✅ Validação Pós-Deploy

### **1. Testar Autenticação**

```bash
# Sem token (deve retornar 401)
curl https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/WORKSPACE_ID/funnels

# Com token (deve retornar 200)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/WORKSPACE_ID/funnels
```

### **2. Testar Carregamento Inicial**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/WORKSPACE_ID/funnels/FUNNEL_ID/leads"
```

**Resposta esperada:**
```json
{
  "columns": {
    "column-id-1": {
      "leads": [...],
      "total": 150,
      "hasMore": true,
      "limit": 10,
      "offset": 0
    },
    "column-id-2": {
      "leads": [...],
      "total": 87,
      "hasMore": true,
      "limit": 10,
      "offset": 0
    }
  }
}
```

### **3. Testar Filtros**

```bash
# Filtro "Tem E-mail"
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/WORKSPACE_ID/funnels/FUNNEL_ID/columns/COLUMN_ID/leads?hasEmail=true&limit=10&offset=0"
```

**Resposta esperada:**
```json
{
  "leads": [...],  // Apenas leads com e-mail
  "total": 87,     // Total real no backend
  "hasMore": true,
  "limit": 10,
  "offset": 0
}
```

---

## 🗄️ Aplicar Índices (Opcional mas Recomendado)

```bash
# Conectar ao banco
supabase db connect

# Executar script de índices
\i supabase/functions/kanban-api/INDICES-RECOMENDADOS.sql
```

**Ou via Supabase Dashboard:**
1. Ir em SQL Editor
2. Colar conteúdo de `INDICES-RECOMENDADOS.sql`
3. Executar

---

## 📊 Monitoramento

### **Ver Logs em Tempo Real**

```bash
supabase functions logs kanban-api --follow
```

### **Verificar Performance**

- Verificar tempos de resposta nos logs
- Verificar uso de memória
- Verificar erros

---

## 🔄 Rollback (Se Necessário)

```bash
# Desabilitar função (manter código)
supabase functions delete kanban-api

# Ou manter ambas funcionando em paralelo
# Frontend pode escolher qual usar
```

---

**Status:** ✅ Pronto para deploy

