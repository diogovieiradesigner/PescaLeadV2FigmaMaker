# 🚀 Instruções de Deploy - Otimizações de Performance

**Data:** 2025-01-XX  
**Sistema:** Campanhas - Edge Function `campaign-process-queue`  
**Versão:** V7 → V8 (Otimizada)

---

## 📋 Pré-requisitos

- ✅ Supabase CLI instalado e configurado
- ✅ Acesso ao projeto Supabase
- ✅ Permissões para aplicar migrações SQL
- ✅ Permissões para fazer deploy de Edge Functions

---

## 🔧 Passo 1: Aplicar Migrações SQL

### 1.1 Índices de Performance

```bash
# Aplicar migração de índices
supabase db push supabase/migrations/create_campaign_performance_indexes.sql
```

**Ou via SQL Editor no Supabase Dashboard:**
1. Abrir SQL Editor
2. Copiar conteúdo de `supabase/migrations/create_campaign_performance_indexes.sql`
3. Executar

**Verificar índices criados:**
```sql
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename IN ('campaign_messages', 'campaign_runs', 'leads')
  AND indexname LIKE 'idx_%';
```

### 1.2 Função de Mensagens Antigas

```bash
# Aplicar migração de função
supabase db push supabase/migrations/create_mark_old_messages_function.sql
```

**Ou via SQL Editor:**
1. Abrir SQL Editor
2. Copiar conteúdo de `supabase/migrations/create_mark_old_messages_function.sql`
3. Executar

**Verificar função criada:**
```sql
SELECT 
  proname, 
  prosrc 
FROM pg_proc 
WHERE proname = 'mark_old_campaign_messages_as_skipped';
```

---

## 🚀 Passo 2: Deploy da Edge Function

### 2.1 Deploy via CLI

```bash
# Navegar para o diretório do projeto
cd "C:\Users\Asus\Pictures\Pesca lead - Back-end"

# Deploy da Edge Function
supabase functions deploy campaign-process-queue
```

### 2.2 Verificar Deploy

```bash
# Listar Edge Functions
supabase functions list

# Verificar logs (últimas 100 linhas)
supabase functions logs campaign-process-queue --limit 100
```

---

## ✅ Passo 3: Validação Pós-Deploy

### 3.1 Testar Processamento Paralelo

1. **Criar campanha de teste** com pelo menos 10-20 mensagens
2. **Executar campanha** manualmente ou aguardar scheduler
3. **Observar logs** para verificar:
   - `[Processor] Processing X messages in Y chunks (5 concurrent)`
   - `[Processor] Loaded X/Y lead contexts in batch`
   - Processamento paralelo funcionando

### 3.2 Testar Busca de Contextos em Batch

**Verificar nos logs:**
```
[Processor] Loaded 20/20 lead contexts in batch
```

**Se aparecer:**
- ✅ Batch funcionando: Todos os contextos carregados de uma vez
- ❌ Fallback ativo: Alguns contextos buscados individualmente (normal se lead não encontrado)

### 3.3 Testar Rate Limit

**Simular rate limit do OpenRouter:**
1. Criar campanha com muitas mensagens
2. Observar logs para retry com backoff exponencial
3. Verificar que mensagens não são perdidas

### 3.4 Testar Retry Automático

**Verificar nos logs:**
- Mensagens falhadas são reenfileiradas
- Backoff exponencial: 5min, 15min, 30min
- Máximo de 3 tentativas

---

## 📊 Passo 4: Monitoramento

### 4.1 Métricas a Observar

**Antes do Deploy (Baseline):**
- Tempo médio de processamento por mensagem
- Throughput (mensagens/minuto)
- Taxa de erro
- Tempo de busca de contextos

**Após o Deploy:**
- ✅ **Redução esperada:** 70-80% no tempo total
- ✅ **Aumento esperado:** 3-5x na throughput
- ✅ **Redução esperada:** 80-90% no tempo de busca de contextos

### 4.2 Queries de Monitoramento

**Tempo médio de processamento:**
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (sent_at - scheduled_at))) AS avg_processing_seconds,
  COUNT(*) AS total_messages
FROM campaign_messages
WHERE status = 'sent'
  AND sent_at > NOW() - INTERVAL '1 hour';
```

**Throughput (mensagens/minuto):**
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

**Taxa de erro:**
```sql
SELECT 
  status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM campaign_messages
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

---

## 🔍 Passo 5: Troubleshooting

### 5.1 Problema: Processamento ainda sequencial

**Sintomas:**
- Logs não mostram "Processing X messages in Y chunks"
- Mensagens processadas uma por vez

**Solução:**
1. Verificar se deploy foi bem-sucedido
2. Verificar logs para erros de sintaxe
3. Verificar se `CONCURRENCY_LIMIT = 5` está definido

### 5.2 Problema: Contextos não carregados em batch

**Sintomas:**
- Logs mostram "Loaded 0/X lead contexts in batch"
- Muitas buscas individuais

**Solução:**
1. Verificar se `get_lead_full_context` RPC existe
2. Verificar permissões do `service_role`
3. Verificar logs para erros na busca de contextos

### 5.3 Problema: Erro de sintaxe no deploy

**Sintomas:**
- Deploy falha com erro de parsing

**Solução:**
1. Verificar sintaxe TypeScript
2. Verificar imports corretos
3. Verificar se `parse-split-response.ts` existe

---

## 📝 Checklist Final

- [ ] Migrações SQL aplicadas
- [ ] Edge Function deployada
- [ ] Logs verificados (sem erros)
- [ ] Processamento paralelo funcionando
- [ ] Busca de contextos em batch funcionando
- [ ] Métricas coletadas (baseline)
- [ ] Monitoramento configurado

---

## 🔗 Referências

- **Documentação de Otimizações:** `docs/extracao/OTIMIZACOES-PERFORMANCE-CAMPANHAS.md`
- **Resumo de Correções:** `docs/extracao/RESUMO-CORRECOES-TERCEIRA-AUDITORIA.md`
- **Auditoria Original:** `docs/extracao/AUDITORIA-TERCEIRA-VISAO-CAMPANHAS.md`

---

**Status:** ✅ Pronto para Deploy

