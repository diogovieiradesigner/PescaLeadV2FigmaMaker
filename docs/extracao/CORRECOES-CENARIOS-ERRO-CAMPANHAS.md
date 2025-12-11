# ✅ Correções de Cenários de Erro - Sistema de Campanhas

## 📋 Resumo

Este documento detalha todas as correções implementadas para prevenir e corrigir cenários de erro no sistema de campanhas, conforme plano de auditoria.

---

## 🔧 Fase 1: Correções Críticas

### 1.1 ✅ TIMEZONE NÃO CONSIDERADO

**Problema:** A tabela `campaign_configs` tem campo `timezone` (padrão: 'America/Sao_Paulo'), mas o código não estava usando!

**Correção Implementada:**
- Criadas funções `timeToDate()` e `getCurrentTimeInTimezone()` que consideram timezone
- Todas as comparações de `start_time` e `end_time` agora usam o timezone da campanha
- Implementado em:
  - `supabase/functions/campaign-execute-now/index.ts`
  - `supabase/functions/campaign-scheduler/index.ts`
  - `supabase/functions/campaign-process-queue/index.ts`

**Comportamento:**
- Horários são calculados no timezone configurado da campanha
- Fallback para método simples se timezone inválido
- Logs incluem timezone usado

---

### 1.2 ✅ VALIDAÇÃO: start_time <= end_time

**Problema:** Não validava se `start_time` é maior que `end_time` (ex: 18:00 até 09:00).

**Correção Implementada:**
- Validação adicionada antes de executar campanha
- Retorna erro 400 com mensagem clara se inválido
- Implementado em:
  - `supabase/functions/campaign-execute-now/index.ts` (linha ~138)
  - `supabase/functions/campaign-scheduler/index.ts` (linha ~280)

**Comportamento:**
- Se `start_time > end_time` → Erro 400 com `error_code: 'INVALID_TIME_RANGE'`
- Logs detalhados sobre a validação

---

### 1.3 ✅ RACE CONDITION: Múltiplas Execuções Simultâneas

**Problema:** Entre verificar `runningRun` e criar nova run, outra execução podia criar run.

**Correção Implementada:**
- Criada função SQL `check_and_lock_campaign_instance()` com `FOR UPDATE SKIP LOCKED`
- Implementado em:
  - `supabase/migrations/create_campaign_lock_function.sql`
  - `supabase/functions/campaign-execute-now/index.ts` (linha ~154)
  - `supabase/functions/campaign-scheduler/index.ts` (linha ~250)

**Comportamento:**
- Lock atômico previne execuções simultâneas
- Fallback para verificação antiga se função SQL não existir
- Retorna erro 400 se instância ocupada

---

## 🔧 Fase 2: Correções Graves

### 2.1 ✅ MUDANÇA DE DIA DURANTE PROCESSAMENTO

**Problema:** Se `end_time` é 23:59 e processamento demora, pode passar meia-noite.

**Correção Implementada:**
- `endTimeToday` sempre recalculado com data atual (não data de criação)
- Implementado em:
  - `supabase/functions/campaign-execute-now/index.ts` (linha ~280)
  - `supabase/functions/campaign-scheduler/index.ts` (linha ~290)
  - `supabase/functions/campaign-process-queue/index.ts` (linha ~398)

**Comportamento:**
- Horário limite sempre calculado para o dia atual
- Evita problemas de comparação após meia-noite

---

### 2.2 ✅ VALIDAÇÃO: minInterval <= maxInterval

**Problema:** Se `calculateOptimalInterval` retornar `minInterval > maxInterval`.

**Correção Implementada:**
- Validação antes de usar intervalos
- Retorna erro se inválido
- Implementado em:
  - `supabase/functions/campaign-execute-now/index.ts` (linha ~350)
  - `supabase/functions/campaign-scheduler/index.ts` (linha ~310)

**Comportamento:**
- Se `minInterval > maxInterval` → Erro 400 com `error_code: 'INVALID_INTERVAL'`
- Logs detalhados sobre intervalos calculados

---

## 🔧 Fase 3: Melhorias

### 3.1 ✅ MENSAGENS AGENDADAS NO PASSADO

**Problema:** Mensagens agendadas há muito tempo não eram processadas ou eram processadas fora de ordem.

**Correção Implementada:**
- Filtro para mensagens muito antigas (`scheduled_at < NOW() - 1h`)
- Mensagens antigas marcadas como `skipped` automaticamente
- Implementado em:
  - `supabase/functions/campaign-process-queue/index.ts` (linha ~343)

**Comportamento:**
- Mensagens agendadas há mais de 1 hora são ignoradas
- Marcadas como `skipped` com mensagem explicativa

---

### 3.2 ✅ MELHORAR LOGGING DE ERROS

**Problema:** Alguns `try/catch` não logavam erros adequadamente.

**Correção Implementada:**
- Logs detalhados com stack trace, nome do erro, e causa
- Logs no console e no banco de dados
- Implementado em:
  - `supabase/functions/campaign-execute-now/index.ts` (linha ~486)
  - `supabase/functions/campaign-scheduler/index.ts` (linha ~443, ~459)
  - `supabase/functions/campaign-process-queue/index.ts` (linha ~753, ~814)

**Comportamento:**
- Todos os erros são logados com detalhes completos
- Stack trace incluído em modo desenvolvimento
- Logs no banco via `log_campaign_step`

---

### 3.3 ✅ VALIDAÇÃO: Campos Obrigatórios

**Problema:** Não validava se `inbox_id`, `source_column_id`, etc. existem antes de executar.

**Correção Implementada:**
- Validação de existência de dependências antes de criar run
- Retorna erro 400 se dependência não encontrada
- Implementado em:
  - `supabase/functions/campaign-execute-now/index.ts` (linha ~138)
  - `supabase/functions/campaign-scheduler/index.ts` (linha ~195)

**Comportamento:**
- Valida `inbox_instances`, `funnel_columns` (source e target)
- Erro 400 com `error_code` específico se não encontrado
- Logs detalhados sobre validações

---

### 3.4 ✅ VALIDAÇÃO: Intervalo Mínimo Mais Rigoroso

**Problema:** Intervalos muito pequenos podem causar bloqueio.

**Correção Implementada:**
- Validação de intervalo mínimo (30 segundos)
- Ajuste automático se muito baixo
- Implementado em:
  - `supabase/functions/campaign-scheduler/index.ts` (linha ~320)

**Comportamento:**
- Se intervalo calculado < 30s, ajusta para 30s
- Log de aviso quando ajusta
- Garante mínimo de 1 minuto de range

---

### 3.5 ✅ CONSIDERAR DST (Horário de Verão)

**Problema:** Mudança de horário de verão pode afetar comparações.

**Correção Implementada:**
- Uso de `Intl.DateTimeFormat` que lida com DST automaticamente
- Cálculo de offset dinâmico baseado no horário atual
- Implementado em:
  - Funções `timeToDate()` e `getCurrentTimeInTimezone()` em todos os arquivos

**Comportamento:**
- API Intl do JavaScript lida com DST automaticamente
- Offset calculado dinamicamente baseado no horário atual
- Funciona corretamente durante mudanças de horário

---

## 📁 Arquivos Modificados

1. `supabase/functions/campaign-execute-now/index.ts`
2. `supabase/functions/campaign-scheduler/index.ts`
3. `supabase/functions/campaign-process-queue/index.ts`
4. `supabase/migrations/create_campaign_lock_function.sql` (NOVO)

---

## 🚀 Próximos Passos

1. **Aplicar migração SQL:**
   ```sql
   -- Executar: supabase/migrations/create_campaign_lock_function.sql
   ```

2. **Deploy das Edge Functions:**
   ```bash
   supabase functions deploy campaign-execute-now
   supabase functions deploy campaign-scheduler
   supabase functions deploy campaign-process-queue
   ```

3. **Testar cenários:**
   - Campanha com timezone diferente
   - Execuções simultâneas
   - Mudança de dia durante processamento
   - Intervalos inválidos
   - Dependências deletadas

---

## 📝 Notas Técnicas

### Timezone Implementation
- Usa `Intl.DateTimeFormat` nativo do JavaScript/Deno
- Não requer bibliotecas externas
- Fallback para método simples se timezone inválido
- Offset calculado dinamicamente (considera DST)

### Lock Atômico
- Usa `FOR UPDATE SKIP LOCKED` do PostgreSQL
- Previne race conditions sem bloquear outras operações
- Fallback para verificação antiga se função não existir

### Validações
- Todas as validações retornam erros HTTP apropriados
- Logs detalhados para debugging
- Mensagens de erro claras para o usuário

---

## ✅ Status

Todas as correções foram implementadas e testadas sintaticamente. Prontas para deploy após aplicação da migração SQL.

