# ✅ Checklist de Validação Pós-Deploy

**Data:** 2025-01-XX  
**Sistema:** Campanhas - Otimizações de Performance  
**Status:** Aguardando Validação

---

## 📋 Checklist de Validação

### 1. Migrações SQL ✅

- [ ] **Índices de Performance**
  - [ ] `idx_campaign_messages_atomic_selection` existe
  - [ ] `idx_campaign_runs_id_status` existe
  - [ ] `idx_leads_id_for_context` existe
  - **Comando de verificação:**
    ```sql
    SELECT indexname FROM pg_indexes 
    WHERE indexname LIKE 'idx_campaign%' OR indexname = 'idx_leads_id_for_context';
    ```

- [ ] **Função SQL**
  - [ ] `mark_old_campaign_messages_as_skipped` existe
  - **Comando de verificação:**
    ```sql
    SELECT proname FROM pg_proc 
    WHERE proname = 'mark_old_campaign_messages_as_skipped';
    ```

---

### 2. Edge Function ✅

- [ ] **Deploy realizado**
  - [ ] Edge Function `campaign-process-queue` deployada
  - [ ] Sem erros de sintaxe no deploy
  - **Comando de verificação:**
    ```bash
    supabase functions list | grep campaign-process-queue
    ```

- [ ] **Logs sem erros**
  - [ ] Últimos logs não mostram erros críticos
  - **Comando de verificação:**
    ```bash
    supabase functions logs campaign-process-queue --limit 50
    ```

---

### 3. Funcionalidades ✅

- [ ] **Processamento Paralelo**
  - [ ] Logs mostram "Processing X messages in Y chunks (5 concurrent)"
  - [ ] Múltiplas mensagens com status 'generating' simultaneamente
  - **Como verificar:**
    - Executar campanha com 10+ mensagens
    - Observar logs para mensagem de chunking
    - Verificar no banco: múltiplas mensagens 'generating' ao mesmo tempo

- [ ] **Busca de Contextos em Batch**
  - [ ] Logs mostram "Loaded X/Y lead contexts in batch"
  - [ ] Tempo de processamento reduzido
  - **Como verificar:**
    - Executar campanha com 10+ mensagens
    - Observar logs para mensagem de batch loading
    - Verificar tempo de processamento (deve ser menor)

- [ ] **Rate Limit Handling**
  - [ ] Retry com backoff exponencial funcionando
  - [ ] Mensagens não são perdidas em caso de rate limit
  - **Como verificar:**
    - Simular rate limit (se possível)
    - Observar logs para retry com backoff
    - Verificar que mensagens são reenfileiradas

- [ ] **Retry Automático**
  - [ ] Mensagens falhadas são reenfileiradas
  - [ ] Backoff exponencial: 5min, 15min, 30min
  - [ ] Máximo de 3 tentativas
  - **Como verificar:**
    - Criar mensagem que falha intencionalmente
    - Observar logs para retry
    - Verificar `retry_count` e `scheduled_at` no banco

---

### 4. Performance ✅

- [ ] **Tempo de Processamento**
  - [ ] Tempo médio reduzido em 50-70%
  - [ ] Tempo máximo reduzido
  - **Query de verificação:**
    ```sql
    SELECT 
      AVG(EXTRACT(EPOCH FROM (sent_at - scheduled_at))) AS avg_seconds,
      MAX(EXTRACT(EPOCH FROM (sent_at - scheduled_at))) AS max_seconds
    FROM campaign_messages
    WHERE status = 'sent'
      AND sent_at > NOW() - INTERVAL '1 hour';
    ```

- [ ] **Throughput**
  - [ ] Aumento de 3-5x na throughput
  - [ ] Mais mensagens processadas por minuto
  - **Query de verificação:**
    ```sql
    SELECT 
      DATE_TRUNC('minute', sent_at) AS minute,
      COUNT(*) AS messages_per_minute
    FROM campaign_messages
    WHERE status = 'sent'
      AND sent_at > NOW() - INTERVAL '1 hour'
    GROUP BY minute
    ORDER BY minute DESC;
    ```

- [ ] **Busca de Contextos**
  - [ ] Tempo de busca reduzido em 80-90%
  - [ ] Menos queries individuais ao banco
  - **Como verificar:**
    - Observar logs para tempo de batch loading
    - Comparar com baseline anterior (se disponível)

---

### 5. Estabilidade ✅

- [ ] **Taxa de Erro**
  - [ ] Taxa de erro não aumentou
  - [ ] Mensagens não estão sendo perdidas
  - **Query de verificação:**
    ```sql
    SELECT 
      status,
      COUNT(*) AS count,
      ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
    FROM campaign_messages
    WHERE created_at > NOW() - INTERVAL '1 hour'
    GROUP BY status;
    ```

- [ ] **Sem Regressões**
  - [ ] Todas as funcionalidades existentes funcionando
  - [ ] Validações mantidas
  - [ ] Operações atômicas funcionando
  - **Como verificar:**
    - Executar campanha completa
    - Verificar que leads são movidos corretamente
    - Verificar que métricas são atualizadas

---

## 🔍 Script de Validação Automática

Execute o script SQL de validação:

```bash
# Via Supabase CLI
supabase db execute -f docs/extracao/VALIDACAO-POS-DEPLOY.sql

# Ou via SQL Editor no Dashboard
# Copiar e colar conteúdo de docs/extracao/VALIDACAO-POS-DEPLOY.sql
```

---

## 📊 Métricas de Sucesso

### ✅ Deploy Bem-Sucedido Se:

1. **Índices criados:** 3 índices presentes
2. **Função SQL criada:** `mark_old_campaign_messages_as_skipped` existe
3. **Edge Function deployada:** Sem erros no deploy
4. **Processamento paralelo:** Logs mostram chunking
5. **Busca em batch:** Logs mostram batch loading
6. **Performance melhorada:** Redução de 50%+ no tempo de processamento
7. **Throughput aumentado:** Aumento de 3x+ na throughput
8. **Taxa de erro:** Mantida ou reduzida

---

## 🚨 Problemas Comuns

### Problema: Índices não criados
**Solução:** Aplicar migração `create_campaign_performance_indexes.sql` novamente

### Problema: Função SQL não existe
**Solução:** Aplicar migração `create_mark_old_messages_function.sql` novamente

### Problema: Processamento ainda sequencial
**Solução:** 
- Verificar se deploy foi bem-sucedido
- Verificar logs para erros
- Verificar se `CONCURRENCY_LIMIT = 5` está definido

### Problema: Contextos não carregados em batch
**Solução:**
- Verificar se `get_lead_full_context` RPC existe
- Verificar permissões do `service_role`
- Verificar logs para erros

---

## 📝 Próximos Passos Após Validação

1. **Monitorar por 24-48 horas**
   - Observar métricas de performance
   - Verificar logs periodicamente
   - Coletar feedback de usuários

2. **Ajustar se necessário**
   - Ajustar `CONCURRENCY_LIMIT` se necessário
   - Otimizar queries SQL se identificado gargalo
   - Adicionar mais índices se necessário

3. **Documentar resultados**
   - Registrar métricas de performance
   - Comparar com baseline anterior
   - Documentar melhorias observadas

---

**Status:** ⏳ Aguardando Validação

