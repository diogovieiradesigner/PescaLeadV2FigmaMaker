# 🚨 Erro Detectado: Função RPC Não Configurada

## ❌ Problema

A aplicação está exibindo o erro:

```
Error fetching extraction analytics: {
  "code": "42P01",
  "details": null,
  "hint": null,
  "message": "relation \"lead_stats\" does not exist"
}
```

---

## 🔍 Causa

A função RPC `get_extraction_analytics` no Supabase está **tentando acessar uma tabela chamada `lead_stats` que não existe** no banco de dados.

Isso acontece porque:

1. ✅ A função foi criada no Supabase
2. ❌ **MAS** ela está referenciando tabelas que não existem
3. ❌ Ou está usando um schema desatualizado

---

## ✅ Solução Rápida

### **Passo 1: Abra a Documentação Completa**

Consulte o arquivo: **`/SUPABASE_RPC_FIX.md`**

Esse arquivo contém:
- ✅ SQL completo da função corrigida
- ✅ Instruções passo a passo
- ✅ Comandos de teste
- ✅ Estrutura de dados esperada

### **Passo 2: Execute o SQL no Supabase**

1. Acesse seu projeto no **Supabase Dashboard**
2. Vá em **SQL Editor** (menu lateral)
3. Cole o SQL fornecido em `/SUPABASE_RPC_FIX.md`
4. Execute o comando

### **Passo 3: Teste a Função**

```sql
-- Teste com um run_id existente
SELECT get_extraction_analytics(
  p_run_id := 'seu-run-id-aqui'::uuid
);
```

### **Passo 4: Recarregue a Aplicação**

Após corrigir, recarregue a página do **Extraction Progress**.

---

## 🎯 O Que a Função Deve Fazer

A função `get_extraction_analytics` deve:

1. **Receber parâmetros:**
   - `p_run_id` (opcional) - ID de uma execução específica
   - `p_workspace_id` (opcional) - ID do workspace

2. **Retornar JSON com:**
   ```json
   {
     "run": { ... },           // Dados da execução
     "contatos": [ ... ],       // Métricas de contato
     "enriquecimento": { ... }, // Métricas de enriquecimento
     "qualidade": { ... },      // Score de qualidade
     "fontes": [ ... ],         // Fontes de dados
     "graficos": {              // Dados para gráficos
       "pizza_contatos": [...],
       "pizza_whatsapp": [...],
       "pizza_website": [...],
       "pizza_qualidade": [...],
       "barras_enriquecimento": [...],
       "barras_fontes": [...]
     },
     "timeline": [ ... ]        // Eventos da timeline
   }
   ```

3. **Usar APENAS estas tabelas:**
   - ✅ `lead_extraction_runs`
   - ✅ `leads`
   - ✅ `lead_extraction_staging`
   - ✅ `lead_extractions`
   - ❌ **NÃO** `lead_stats` (não existe)

---

## 🛠️ Debugging

### **Verificar se a Função Existe**

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_extraction_analytics';
```

### **Ver Definição Atual da Função**

```sql
SELECT pg_get_functiondef('get_extraction_analytics'::regproc);
```

### **Listar Tabelas Disponíveis**

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### **Ver Estrutura da Tabela Leads**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads'
ORDER BY ordinal_position;
```

---

## 📊 Frontend - Como os Dados São Usados

### **Chamada da Função**

No arquivo `/services/extraction-service.ts`:

```typescript
export async function getExtractionAnalytics(params?: { 
  runId?: string;
  workspaceId?: string;
}): Promise<any> {
  const rpcParams: any = {};
  
  if (params?.runId) {
    rpcParams.p_run_id = params.runId;
  } else if (params?.workspaceId) {
    rpcParams.p_workspace_id = params.workspaceId;
  }

  const { data, error } = await supabase
    .rpc('get_extraction_analytics', rpcParams);

  if (error) throw error;
  return data;
}
```

### **Uso no Componente**

No `/components/ExtractionProgress.tsx`:

```typescript
const fetchData = async () => {
  const data = await getExtractionAnalytics({ runId });
  setAnalytics(data);
};
```

### **Estrutura Esperada**

```typescript
analytics = {
  run: {
    id, status, search_term, location,
    target_quantity, created_quantity,
    success_rate, duration_formatted, ...
  },
  contatos: [
    { name: 'Telefone', value: 75, percentage: 88.24 },
    { name: 'Email', value: 60, percentage: 70.59 },
    ...
  ],
  graficos: {
    pizza_contatos: [...],
    pizza_whatsapp: [...],
    barras_enriquecimento: [...],
    ...
  }
}
```

---

## ⚠️ Importante

### **NÃO Faça:**
- ❌ Criar a tabela `lead_stats` - ela não é necessária
- ❌ Modificar o frontend para "mockar" os dados
- ❌ Ignorar o erro - a função precisa ser corrigida

### **FAÇA:**
- ✅ Corrija a função RPC no Supabase
- ✅ Use apenas tabelas existentes
- ✅ Teste a função antes de usar no frontend
- ✅ Verifique os logs do console para debugging

---

## 📝 Checklist de Correção

- [ ] Li o arquivo `/SUPABASE_RPC_FIX.md`
- [ ] Acessei o Supabase Dashboard
- [ ] Abri o SQL Editor
- [ ] Executei o comando DROP FUNCTION (se necessário)
- [ ] Executei o CREATE FUNCTION com o SQL correto
- [ ] Testei a função com `SELECT get_extraction_analytics(...)`
- [ ] A função retornou JSON válido
- [ ] Recarreguei a aplicação
- [ ] O erro desapareceu

---

## 🆘 Precisa de Ajuda?

Se após seguir todos os passos o erro persistir:

1. **Verifique o Console do Navegador** (F12)
   - Procure por erros detalhados
   - Copie a stack trace completa

2. **Verifique os Logs do Supabase**
   - Vá em **Database** > **Logs**
   - Procure por erros relacionados à função

3. **Compartilhe:**
   - Output de `SELECT pg_get_functiondef('get_extraction_analytics'::regproc);`
   - Lista de tabelas disponíveis
   - Estrutura da tabela `leads`
   - Erro completo do console

---

## 📚 Arquivos Relacionados

- **`/SUPABASE_RPC_FIX.md`** - Documentação completa da correção
- **`/services/extraction-service.ts`** - Serviço que chama a função RPC
- **`/components/ExtractionProgress.tsx`** - Componente que usa os dados
- **Este arquivo** - Overview do problema e solução

---

**Criado em:** 27/11/2024  
**Status:** 🔴 Aguardando Correção no Supabase
