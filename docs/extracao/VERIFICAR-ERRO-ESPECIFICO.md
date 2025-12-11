# 🔍 Verificar Erro Específico - Passo a Passo

Se a query retornou "✅ Tudo OK", o problema pode estar em:

---

## 📋 PASSO 1: Ver Erro no Console do Navegador

1. **Abra o Console** (F12 → Console)
2. **Clique em "Executar Agora"**
3. **Procure por erro vermelho**

**Envie a mensagem de erro completa aqui!**

---

## 📋 PASSO 2: Verificar se Função SQL Existe

Execute esta query:

```sql
-- Verificar se a função get_campaign_eligible_leads existe
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname = 'get_campaign_eligible_leads';
```

**Se não retornar nada:** A função não existe! Precisamos criá-la.

**Se retornar:** A função existe, vamos para o próximo passo.

---

## 📋 PASSO 3: Verificar Leads Disponíveis

Execute esta query (substitua os valores):

```sql
-- Pegar config_id da campanha
SELECT id, workspace_id, source_column_id, inbox_id 
FROM campaign_configs 
WHERE inbox_id = (SELECT inbox_id FROM campaign_configs LIMIT 1)
LIMIT 1;

-- Depois execute com os valores retornados:
SELECT 
  COUNT(*) AS total_leads,
  COUNT(CASE WHEN primary_phone IS NOT NULL AND whatsapp_valid = TRUE THEN 1 END) AS leads_com_whatsapp_valido,
  COUNT(CASE WHEN primary_email IS NOT NULL AND primary_email LIKE '%@%' THEN 1 END) AS leads_com_email_valido
FROM leads
WHERE workspace_id = 'SEU_WORKSPACE_ID'
  AND column_id = 'SEU_SOURCE_COLUMN_ID'
  AND deleted_at IS NULL;
```

**Se retornar 0 leads:** Não há leads disponíveis na coluna de origem!

---

## 📋 PASSO 4: Verificar Logs da Edge Function

No Supabase Dashboard:

1. Vá em **Edge Functions** → **campaign-execute-now**
2. Clique em **Logs**
3. Procure por erros recentes (últimos 5 minutos)
4. **Envie o erro completo aqui!**

---

## 📋 PASSO 5: Testar Função RPC Diretamente

Execute esta query (substitua os valores pelos da sua campanha):

```sql
-- Testar a função get_campaign_eligible_leads diretamente
SELECT * FROM get_campaign_eligible_leads(
  p_workspace_id := 'SEU_WORKSPACE_ID',
  p_source_column_id := 'SEU_SOURCE_COLUMN_ID',
  p_inbox_id := 'SEU_INBOX_ID',
  p_limit := 10
);
```

**Se der erro:** Envie a mensagem de erro completa!

**Se retornar vazio:** Não há leads elegíveis (normal, mas não deveria dar erro 400)

---

## 🎯 O que Preciso Saber:

1. **Mensagem de erro completa do console** (F12)
2. **Resultado da query do PASSO 2** (função existe?)
3. **Resultado da query do PASSO 3** (quantos leads disponíveis?)
4. **Erro dos logs da Edge Function** (PASSO 4)
5. **Resultado da query do PASSO 5** (função RPC funciona?)

Com essas informações, identifico exatamente o problema! 🔍

