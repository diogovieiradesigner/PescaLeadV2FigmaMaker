# 📋 Como Capturar Logs Detalhados do Erro

## 🎯 Método 1: Console do Navegador (Mais Fácil)

### **Passo a Passo:**

1. **Abra o Console do Navegador:**
   - Pressione `F12` (ou `Ctrl + Shift + I` no Windows/Linux)
   - Ou clique com botão direito → "Inspecionar" → Aba "Console"

2. **Limpe o Console:**
   - Clique no ícone de "limpar" (🚫) ou pressione `Ctrl + L`
   - Isso garante que você veja apenas os erros novos

3. **Clique em "Executar Agora"** na campanha

4. **Capture o Erro:**
   - Procure por mensagens em **vermelho**
   - Clique com botão direito na mensagem de erro
   - Selecione "Copy" ou "Copiar"
   - Cole aqui no chat

### **O que procurar:**

```
❌ Erro: ...
OU
Error: ...
OU
Failed to ...
```

**Exemplo de erro que preciso ver:**
```
Error: Instância "Diogo Vieira Oficial" está desconectada (offline)
```

---

## 🎯 Método 2: Network Tab (Mais Detalhado)

### **Passo a Passo:**

1. **Abra o DevTools:**
   - Pressione `F12`
   - Vá para a aba **"Network"** (Rede)

2. **Limpe a lista:**
   - Clique no ícone de "limpar" (🚫)

3. **Filtre por "campaign":**
   - Digite `campaign` no filtro

4. **Clique em "Executar Agora"**

5. **Encontre a requisição:**
   - Procure por `campaign-execute-now` na lista
   - Clique nela

6. **Veja os detalhes:**
   - Aba **"Headers"**: Veja a URL e headers
   - Aba **"Payload"**: Veja o que foi enviado (`config_id`)
   - Aba **"Response"**: Veja a resposta de erro (aqui está o erro!)

7. **Copie a resposta:**
   - Na aba **"Response"**, copie todo o conteúdo JSON
   - Cole aqui no chat

**Exemplo do que preciso ver:**
```json
{
  "error": "Instância está desconectada",
  "error_code": "INSTANCE_DISCONNECTED"
}
```

---

## 🎯 Método 3: Logs do Supabase Dashboard

### **Passo a Passo:**

1. **Acesse o Supabase Dashboard:**
   - Vá para https://supabase.com/dashboard
   - Selecione seu projeto

2. **Vá para Edge Functions:**
   - Menu lateral → **Edge Functions**
   - Clique em **`campaign-execute-now`**

3. **Veja os Logs:**
   - Clique na aba **"Logs"**
   - Procure por entradas recentes (últimos 5 minutos)
   - Clique em uma entrada com erro (status diferente de 200)

4. **Copie o Erro:**
   - Veja a mensagem de erro completa
   - Copie e cole aqui no chat

---

## 🎯 Método 4: Testar Diretamente via SQL

Se preferir, posso criar uma query SQL para testar diretamente:

```sql
-- Testar a função RPC diretamente
-- (Preciso dos valores: workspace_id, source_column_id, inbox_id)

SELECT * FROM get_campaign_eligible_leads(
  p_workspace_id := 'SEU_WORKSPACE_ID',
  p_source_column_id := 'SEU_SOURCE_COLUMN_ID',
  p_inbox_id := 'SEU_INBOX_ID',
  p_limit := 10
);
```

**Se der erro aqui, o problema é na função SQL!**

---

## 📸 O que Enviar:

**Opção 1:** Mensagem de erro completa do Console (Método 1)

**Opção 2:** JSON da resposta da requisição (Método 2)

**Opção 3:** Log da Edge Function (Método 3)

**Opção 4:** Resultado da query SQL (Método 4)

---

## ⚡ Método Mais Rápido:

1. **F12** → **Console**
2. **Clique em "Executar Agora"**
3. **Copie a mensagem vermelha**
4. **Cole aqui!**

Pronto! Com isso identifico o problema exato! 🔍

