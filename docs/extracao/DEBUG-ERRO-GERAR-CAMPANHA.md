# 🔍 Debug: Erro ao Gerar Campanha

**Erro:** `Edge Function returned a non-2xx status code`

---

## 🎯 Possíveis Causas

A função `campaign-execute-now` retorna erro 400 em várias validações. Verifique qual erro específico está sendo retornado:

### **1. `config_id` não fornecido**
```json
{
  "error": "config_id é obrigatório"
}
```
**Solução:** Verifique se está enviando `config_id` no body da requisição.

---

### **2. Campanha não encontrada**
```json
{
  "error": "Campanha não encontrada"
}
```
**Solução:** Verifique se o `config_id` existe na tabela `campaign_configs`.

---

### **3. Horário inválido (`start_time > end_time`)**
```json
{
  "error": "Configuração inválida: horário de início (...) não pode ser maior que horário de fim (...)",
  "error_code": "INVALID_TIME_RANGE"
}
```
**Solução:** Corrija os horários na configuração da campanha. `start_time` deve ser menor ou igual a `end_time`.

---

### **4. Inbox não encontrado**
```json
{
  "error": "Inbox não encontrado ou não está vinculado a uma instância",
  "error_code": "INBOX_NOT_FOUND"
}
```
**Solução:** 
- Verifique se o `inbox_id` existe na tabela `inbox_instances`
- Verifique se há uma instância vinculada ao inbox

---

### **5. Coluna de origem não encontrada**
```json
{
  "error": "Coluna de origem não encontrada",
  "error_code": "SOURCE_COLUMN_NOT_FOUND"
}
```
**Solução:** Verifique se o `source_column_id` existe na tabela `funnel_columns`.

---

### **6. Coluna de destino não encontrada**
```json
{
  "error": "Coluna de destino não encontrada",
  "error_code": "TARGET_COLUMN_NOT_FOUND"
}
```
**Solução:** Verifique se o `target_column_id` existe na tabela `funnel_columns`.

---

### **7. Instância desconectada**
```json
{
  "error": "Instância \"...\" está desconectada (...)",
  "error_code": "INSTANCE_DISCONNECTED"
}
```
**Solução:** 
- Conecte a instância WhatsApp/Email antes de executar a campanha
- Verifique o status da instância no dashboard

---

### **8. Instância ocupada**
```json
{
  "error": "Já existe uma campanha em execução nesta instância. Aguarde a conclusão ou pause a campanha atual.",
  "error_code": "INSTANCE_BUSY",
  "running_run_id": "..."
}
```
**Solução:** 
- Pause ou aguarde a conclusão da campanha atual
- Use o `running_run_id` para identificar qual campanha está rodando

---

## 🔍 Como Ver o Erro Específico

### **No Frontend (Console do Navegador):**

```typescript
try {
  const response = await fetch('/functions/v1/campaign-execute-now', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({ config_id: '...' })
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Erro:', data);
    // data.error contém a mensagem de erro
    // data.error_code contém o código do erro
  }
} catch (error) {
  console.error('❌ Erro na requisição:', error);
}
```

### **No Supabase Dashboard:**

1. Vá para **Edge Functions** → **campaign-execute-now**
2. Clique em **Logs**
3. Procure por erros recentes
4. Veja a mensagem de erro completa

---

## 📋 Checklist de Validação

Antes de executar uma campanha, verifique:

- [ ] `config_id` existe e é válido
- [ ] `start_time <= end_time` (se configurado)
- [ ] `inbox_id` existe e tem instância vinculada
- [ ] `source_column_id` existe na tabela `funnel_columns`
- [ ] `target_column_id` existe na tabela `funnel_columns`
- [ ] Instância está conectada (status = 'connected')
- [ ] Não há outra campanha `running` na mesma instância

---

## 🛠️ Query SQL para Validar Configuração

Execute esta query para verificar se a configuração está correta:

```sql
SELECT 
  cc.id,
  cc.inbox_id,
  cc.source_column_id,
  cc.target_column_id,
  cc.start_time,
  cc.end_time,
  -- Verificar inbox
  CASE WHEN ii.id IS NOT NULL THEN '✅ Inbox existe' ELSE '❌ Inbox não encontrado' END AS inbox_status,
  -- Verificar instância conectada
  CASE WHEN i.status = 'connected' THEN '✅ Instância conectada' ELSE '❌ Instância desconectada' END AS instance_status,
  -- Verificar coluna origem
  CASE WHEN fc_source.id IS NOT NULL THEN '✅ Coluna origem existe' ELSE '❌ Coluna origem não encontrada' END AS source_column_status,
  -- Verificar coluna destino
  CASE WHEN fc_target.id IS NOT NULL THEN '✅ Coluna destino existe' ELSE '❌ Coluna destino não encontrada' END AS target_column_status,
  -- Verificar horários
  CASE 
    WHEN cc.start_time IS NULL OR cc.end_time IS NULL THEN '⚠️ Horários não configurados'
    WHEN cc.start_time > cc.end_time THEN '❌ start_time > end_time'
    ELSE '✅ Horários válidos'
  END AS time_range_status,
  -- Verificar campanha running
  CASE WHEN cr_running.id IS NOT NULL THEN '⚠️ Já existe campanha running' ELSE '✅ Nenhuma campanha running' END AS running_status
FROM campaign_configs cc
LEFT JOIN inbox_instances ii ON ii.inbox_id = cc.inbox_id
LEFT JOIN instances i ON i.id = ii.instance_id
LEFT JOIN funnel_columns fc_source ON fc_source.id = cc.source_column_id
LEFT JOIN funnel_columns fc_target ON fc_target.id = cc.target_column_id
LEFT JOIN campaign_runs cr_running ON cr_running.config_id = cc.id AND cr_running.status = 'running'
WHERE cc.id = 'SEU_CONFIG_ID_AQUI';
```

Substitua `'SEU_CONFIG_ID_AQUI'` pelo ID da sua configuração.

---

## 🚨 Erro 500 (Internal Server Error)

Se o erro for 500, pode ser:

1. **Erro ao criar run:** Verifique logs da Edge Function
2. **Erro ao buscar leads:** Verifique se a função `get_campaign_eligible_leads` existe
3. **Erro ao inserir mensagens:** Verifique estrutura da tabela `campaign_messages`

---

## 📞 Próximos Passos

1. **Identifique o erro específico** usando o console do navegador ou logs do Supabase
2. **Consulte a seção correspondente** acima para a solução
3. **Execute a query SQL de validação** para verificar a configuração
4. **Corrija o problema** identificado
5. **Tente executar novamente**

---

**Se o erro persistir, compartilhe:**
- Mensagem de erro completa (do console/logs)
- `config_id` da campanha
- Resultado da query SQL de validação

