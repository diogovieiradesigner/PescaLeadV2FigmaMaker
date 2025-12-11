# ⏰ Cron Job: Correção Automática de Runs Inconsistentes

## 🎯 Objetivo

Executar automaticamente a função `fix_runs_with_inconsistent_status()` periodicamente para corrigir runs com estado inconsistente entre `status` e `finished_at`.

---

## ✅ Implementação

### **1. Edge Function: `fix-inconsistent-runs`**

**Localização:** `supabase/functions/fix-inconsistent-runs/index.ts`

**O que faz:**
- Chama a função SQL `fix_runs_with_inconsistent_status()`
- Retorna relatório de runs corrigidas
- Loga resultados para monitoramento

**Deploy:**
```bash
supabase functions deploy fix-inconsistent-runs
```

---

### **2. Cron Job SQL: `create_cron_fix_inconsistent_runs.sql`**

**Localização:** `supabase/migrations/create_cron_fix_inconsistent_runs.sql`

**O que faz:**
- Habilita extensão `pg_cron` (se necessário)
- Cria cron job que executa a cada 1 hora
- Executa função SQL diretamente no banco

**Aplicar:**
```bash
supabase migration up
```

---

## 🔧 Configuração

### **Opção 1: Usando pg_cron (Recomendado)**

**Pré-requisitos:**
- Extensão `pg_cron` habilitada no Supabase
- Acesso ao banco de dados

**Aplicar migration:**
```sql
-- A migration já cria o cron job automaticamente
-- Executa a cada hora (00 minutos)
```

**Verificar cron jobs:**
```sql
SELECT 
  jobid,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'fix-inconsistent-runs-hourly';
```

**Desativar cron job:**
```sql
SELECT cron.unschedule('fix-inconsistent-runs-hourly');
```

**Ativar cron job:**
```sql
-- Re-executar a migration ou criar novamente
SELECT cron.schedule(
  'fix-inconsistent-runs-hourly',
  '0 * * * *',  -- A cada hora
  $$SELECT * FROM fix_runs_with_inconsistent_status()$$
);
```

---

### **Opção 2: Usando Edge Function + Cron Externo**

**Se pg_cron não estiver disponível**, você pode usar um cron externo:

**1. Deploy da Edge Function:**
```bash
supabase functions deploy fix-inconsistent-runs
```

**2. Configurar cron externo (ex: GitHub Actions, servidor):**

**GitHub Actions (`.github/workflows/fix-runs.yml`):**
```yaml
name: Fix Inconsistent Runs

on:
  schedule:
    - cron: '0 * * * *'  # A cada hora
  workflow_dispatch:  # Permite execução manual

jobs:
  fix-runs:
    runs-on: ubuntu-latest
    steps:
      - name: Call Fix Function
        run: |
          curl -X POST https://${{ secrets.SUPABASE_URL }}/functions/v1/fix-inconsistent-runs \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json"
```

**Cron do servidor (Linux/Mac):**
```bash
# Adicionar ao crontab (crontab -e)
0 * * * * curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/fix-inconsistent-runs \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

**Cron do Windows (Task Scheduler):**
- Criar tarefa agendada
- Ação: Executar programa
- Programa: `curl.exe`
- Argumentos: `-X POST https://[PROJECT_REF].supabase.co/functions/v1/fix-inconsistent-runs -H "Authorization: Bearer [SERVICE_ROLE_KEY]" -H "Content-Type: application/json"`

---

## 📊 Monitoramento

### **Verificar logs do cron job:**

**Se usando pg_cron:**
```sql
-- Ver logs do cron job
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'fix-inconsistent-runs-hourly'
)
ORDER BY start_time DESC
LIMIT 10;
```

**Se usando Edge Function:**
- Ver logs no Supabase Dashboard > Edge Functions > fix-inconsistent-runs > Logs
- Ou verificar resposta da função (retorna JSON com resultados)

---

### **Testar manualmente:**

**Via SQL:**
```sql
SELECT * FROM fix_runs_with_inconsistent_status();
```

**Via Edge Function:**
```bash
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/fix-inconsistent-runs \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "success": true,
  "timestamp": "2025-12-10T14:00:00.000Z",
  "total_checked": 1,
  "total_fixed": 0,
  "fixed_runs": [],
  "message": "Nenhuma run inconsistente encontrada"
}
```

---

## ⚙️ Configuração de Frequência

**Frequência atual:** A cada 1 hora (`0 * * * *`)

**Outras opções:**

- **A cada 30 minutos:** `*/30 * * * *`
- **A cada 15 minutos:** `*/15 * * * *`
- **A cada 6 horas:** `0 */6 * * *`
- **Diariamente às 2h:** `0 2 * * *`
- **A cada 5 minutos (para testes):** `*/5 * * * *`

**Alterar frequência:**
```sql
-- Remover job existente
SELECT cron.unschedule('fix-inconsistent-runs-hourly');

-- Criar com nova frequência
SELECT cron.schedule(
  'fix-inconsistent-runs-hourly',
  '*/30 * * * *',  -- A cada 30 minutos
  $$SELECT * FROM fix_runs_with_inconsistent_status()$$
);
```

---

## 🔍 Troubleshooting

### **Problema: pg_cron não está disponível**

**Solução:** Usar Edge Function + cron externo (Opção 2)

### **Problema: Cron job não executa**

**Verificar:**
1. Se `pg_cron` está habilitado:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Se o job está ativo:
   ```sql
   SELECT active FROM cron.job WHERE jobname = 'fix-inconsistent-runs-hourly';
   ```

3. Logs de erro:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'fix-inconsistent-runs-hourly')
   ORDER BY start_time DESC LIMIT 5;
   ```

### **Problema: Edge Function retorna erro**

**Verificar:**
1. Se `SUPABASE_SERVICE_ROLE_KEY` está configurado
2. Se a função SQL existe:
   ```sql
   SELECT * FROM information_schema.routines 
   WHERE routine_name = 'fix_runs_with_inconsistent_status';
   ```
3. Logs da Edge Function no Dashboard

---

## 📝 Notas Importantes

1. **Segurança:** Edge Function usa `SERVICE_ROLE_KEY` - não expor em frontend
2. **Performance:** Função é leve e executa rapidamente
3. **Idempotência:** Pode ser executada múltiplas vezes sem problemas
4. **Logs:** Todas as correções são logadas em `extraction_logs`

---

## ✅ Status

- ✅ Edge Function criada
- ✅ Migration SQL criada
- ⏳ **Próximo passo:** Aplicar migration e verificar se pg_cron está disponível

