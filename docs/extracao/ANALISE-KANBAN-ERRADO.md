# 🔍 Análise: Leads Criados no Kanban Errado

## 🎯 Problema Reportado

**Cliente:** Configurou extração para criar leads no kanban **"Emails Gih"**, mas os leads foram criados no kanban **"teste"**.

**Extrações Afetadas:**
- Restaurantes - 10/12/2025 09:07
- Restaurantes - 10/12/2025 09:03

---

## 🔍 Análise em Andamento

### **1. Verificar Configuração Atual da Extração**

**Query:**
```sql
SELECT 
    le.id,
    le.extraction_name,
    le.funnel_id,
    le.column_id,
    f.name as funnel_name,
    fc.title as column_name
FROM lead_extractions le
LEFT JOIN funnels f ON f.id = le.funnel_id
LEFT JOIN funnel_columns fc ON fc.id = le.column_id
WHERE le.extraction_name = 'Restaurantes';
```

**O que verificar:**
- ✅ Qual `funnel_id` e `column_id` estão configurados AGORA
- ✅ Se corresponde ao kanban "Emails Gih" ou "teste"

---

### **2. Verificar Kanban "Emails Gih"**

**Query:**
```sql
SELECT 
    f.id as funnel_id,
    f.name as funnel_name,
    fc.id as column_id,
    fc.title as column_name
FROM funnels f
LEFT JOIN funnel_columns fc ON fc.funnel_id = f.id
WHERE f.name ILIKE '%emails%gih%' 
   OR f.name ILIKE '%gih%';
```

**O que verificar:**
- ✅ IDs do funil e coluna do kanban "Emails Gih"

---

### **3. Verificar Kanban "teste"**

**Query:**
```sql
SELECT 
    f.id as funnel_id,
    f.name as funnel_name,
    fc.id as column_id,
    fc.title as column_name
FROM funnels f
LEFT JOIN funnel_columns fc ON fc.funnel_id = f.id
WHERE f.name ILIKE '%teste%';
```

**O que verificar:**
- ✅ IDs do funil e coluna do kanban "teste"

---

### **4. Verificar Onde os Leads Foram Criados**

**Query:**
```sql
SELECT 
    ler.run_name,
    COUNT(*) as total_leads,
    jsonb_agg(
        DISTINCT jsonb_build_object(
            'funnel_id', l.funnel_id,
            'funnel_name', f.name,
            'column_id', l.column_id,
            'column_name', fc.title,
            'count', COUNT(*)
        )
    ) as distribuicao
FROM lead_extraction_runs ler
JOIN leads l ON l.lead_extraction_run_id = ler.id
LEFT JOIN funnels f ON f.id = l.funnel_id
LEFT JOIN funnel_columns fc ON fc.id = l.column_id
WHERE ler.run_name IN (
    'Restaurantes - 10/12/2025 09:07',
    'Restaurantes - 10/12/2025 09:03'
)
GROUP BY ler.id, ler.run_name;
```

**O que verificar:**
- ✅ Em qual kanban os leads foram realmente criados
- ✅ Se corresponde à configuração atual ou não

---

### **5. Verificar Timing: Config Mudou Depois?**

**Query:**
```sql
SELECT 
    ler.run_name,
    ler.started_at as run_iniciada,
    MIN(l.created_at) as primeiro_lead_criado,
    le.updated_at as config_atualizada,
    CASE 
        WHEN le.updated_at > MIN(l.created_at) THEN '⚠️ CONFIG MUDOU DEPOIS'
        ELSE '✅ Config não mudou'
    END as status
FROM lead_extraction_runs ler
JOIN lead_extractions le ON le.id = ler.extraction_id
LEFT JOIN leads l ON l.lead_extraction_run_id = ler.id
WHERE ler.run_name IN (
    'Restaurantes - 10/12/2025 09:07',
    'Restaurantes - 10/12/2025 09:03'
)
GROUP BY ler.id, ler.run_name, ler.started_at, le.updated_at;
```

**O que verificar:**
- ✅ Se a configuração foi alterada DEPOIS que os leads foram criados
- ✅ Isso explicaria por que foram para o kanban errado

---

## 🔍 Função de Migração

**Função:** `migrate_leads_with_custom_values()`

**Como funciona:**
1. Busca leads em `lead_extraction_staging` com `should_migrate = true`
2. Para cada lead, busca configuração da extração:
   ```sql
   JOIN lead_extractions e ON e.id = r.extraction_id
   ```
3. Usa `e.funnel_id` e `e.column_id` para criar o lead:
   ```sql
   INSERT INTO leads (
     funnel_id,
     column_id,
     ...
   ) VALUES (
     v_lead.funnel_id,  -- Da configuração da extração
     v_lead.column_id,  -- Da configuração da extração
     ...
   )
   ```

**Conclusão:** A função usa os valores da configuração da extração NO MOMENTO DA MIGRAÇÃO, não no momento da criação do run.

---

## 💡 Possíveis Causas

### **Causa 1: Configuração Mudou Depois** ⚠️ (Mais Provável)

**Cenário:**
1. Cliente configurou extração com kanban "Emails Gih"
2. Executou extração (09:03 e 09:07)
3. Configuração foi alterada para kanban "teste" (por engano ou outro motivo)
4. Quando os leads migraram, usaram a configuração ATUAL ("teste")

**Evidência a buscar:**
- `le.updated_at > MIN(l.created_at)` → Config mudou depois

---

### **Causa 2: Configuração Estava Errada Desde o Início**

**Cenário:**
1. Cliente pensou que configurou "Emails Gih"
2. Mas na verdade estava configurado "teste"
3. Leads foram criados corretamente conforme configuração

**Evidência a buscar:**
- `le.funnel_id` e `le.column_id` correspondem ao kanban "teste"
- `le.updated_at < ler.started_at` → Config não mudou depois

---

### **Causa 3: Bug na Função de Migração**

**Cenário:**
1. Configuração estava correta
2. Função de migração usou valores errados
3. Leads foram criados no kanban errado

**Evidência a buscar:**
- Verificar código da função `migrate_leads_with_custom_values()`
- Verificar se há algum fallback ou lógica alternativa

---

## 📋 Próximos Passos para Diagnóstico

1. ✅ Executar queries acima para coletar dados
2. ✅ Comparar `funnel_id` e `column_id` da config vs leads criados
3. ✅ Verificar timing (config mudou depois?)
4. ✅ Identificar causa raiz
5. ⏳ Propor correção (após análise completa)

---

**Status:** 🔍 **ANÁLISE EM ANDAMENTO - Aguardando dados das queries**

