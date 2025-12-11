# 🚨 Erro ao Clicar "Executar Agora" - Guia Rápido

## ✅ O que NÃO está errado:
- ❌ **Toggle "Inativo"** - Não impede execução manual (isso é normal!)
- ✅ Horários (09:00 - 10:00) estão corretos
- ✅ Quantidade (10 leads) está correta

---

## 🔍 Verificar no Console do Navegador:

1. **Abra o Console** (F12 → Console)
2. **Clique em "Executar Agora" novamente**
3. **Procure por erro vermelho** que começa com:
   ```
   ❌ Erro: ...
   ```

### **Erros Mais Comuns:**

#### **1. Instância Desconectada** ⚠️ MAIS PROVÁVEL
```
Erro: Instância "Diogo Vieira Oficial" está desconectada (offline)
```
**Solução:** 
- Vá para a seção de **Inboxes/WhatsApp**
- Verifique se a instância "Diogo Vieira Oficial" está **conectada**
- Se não estiver, conecte antes de executar

---

#### **2. Coluna Não Encontrada**
```
Erro: Coluna de origem não encontrada
OU
Erro: Coluna de destino não encontrada
```
**Solução:**
- Verifique se as colunas "Novo Lead 3" e "Ganho 3" ainda existem no funil "Teste 1"
- Se foram deletadas, selecione outras colunas

---

#### **3. Inbox Não Vinculado**
```
Erro: Inbox não encontrado ou não está vinculado a uma instância
```
**Solução:**
- Verifique se o inbox "Diogo Vieira Oficial" está vinculado a uma instância WhatsApp
- Vá em Configurações → Inboxes e verifique

---

#### **4. Campanha Já em Execução**
```
Erro: Já existe uma campanha em execução nesta instância
```
**Solução:**
- Pause ou aguarde a conclusão da campanha atual
- Vá em "Campanhas" → Veja se há alguma campanha "Em Execução"

---

## 🛠️ Query SQL Rápida para Diagnosticar:

Execute no Supabase SQL Editor:

```sql
-- Substitua 'SEU_CONFIG_ID' pelo ID da campanha
-- (pegar do URL ou console do navegador quando clicar em "Executar Agora")

SELECT 
  'Config encontrada' AS status,
  cc.id,
  cc.inbox_id,
  cc.source_column_id,
  cc.target_column_id,
  -- Verificar inbox e instância
  CASE WHEN ii.id IS NULL THEN '❌ Inbox não encontrado' 
       WHEN i.status != 'connected' THEN '❌ Instância desconectada: ' || i.status
       ELSE '✅ Instância conectada' END AS instance_status,
  -- Verificar colunas
  CASE WHEN fc_source.id IS NULL THEN '❌ Coluna origem não encontrada'
       ELSE '✅ Coluna origem OK' END AS source_status,
  CASE WHEN fc_target.id IS NULL THEN '❌ Coluna destino não encontrada'
       ELSE '✅ Coluna destino OK' END AS target_status,
  -- Verificar campanha running
  CASE WHEN cr_running.id IS NOT NULL THEN '⚠️ Já existe campanha running: ' || cr_running.id
       ELSE '✅ Nenhuma campanha running' END AS running_status
FROM campaign_configs cc
LEFT JOIN inbox_instances ii ON ii.inbox_id = cc.inbox_id
LEFT JOIN instances i ON i.id = ii.instance_id
LEFT JOIN funnel_columns fc_source ON fc_source.id = cc.source_column_id
LEFT JOIN funnel_columns fc_target ON fc_target.id = cc.target_column_id
LEFT JOIN campaign_runs cr_running ON cr_running.config_id = cc.id AND cr_running.status = 'running'
WHERE cc.id = 'SEU_CONFIG_ID';
```

---

## 📋 Checklist Rápido:

Antes de executar, verifique:

- [ ] **Instância WhatsApp está conectada?**
  - Vá em Inboxes → "Diogo Vieira Oficial" → Status deve ser "Conectado"
  
- [ ] **Colunas existem?**
  - Vá em Funis → "Teste 1" → Verifique se "Novo Lead 3" e "Ganho 3" existem
  
- [ ] **Não há outra campanha rodando?**
  - Vá em Campanhas → Veja se há alguma com status "Em Execução"

---

## 🎯 Próximo Passo:

**Envie:**
1. A mensagem de erro completa do console (F12)
2. Ou o resultado da query SQL acima

Com isso, identifico exatamente o problema! 🔍

