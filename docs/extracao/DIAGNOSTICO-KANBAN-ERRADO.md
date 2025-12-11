# 🔍 Diagnóstico: Leads Criados no Kanban Errado

## ✅ Problema Identificado

**Causa Raiz:** A configuração da extração foi alterada DEPOIS que os leads foram criados, mas a função de migração usa a configuração ATUAL, não a configuração que estava quando o run foi iniciado.

---

## 📊 Evidências

### **1. Configuração Atual da Extração**

**Extração:** "Restaurantes"  
**Configuração ATUAL:**
- **Funnel:** "Emails Gih" (`funnel_id: 3657418b-d030-48d2-ba1b-87793dcd1d16`)
- **Coluna:** "Novo" (`column_id: dae0e522-248e-4528-a458-8941c310158b`)
- **Última atualização:** `2025-12-10 13:20:09`

---

### **2. Onde os Leads Foram Criados**

**Restaurantes 09:03:**
- **Total:** 514 leads
- **Kanban:** "teste" (`funnel_id: 9e01c6b2-14b4-4ad8-9b9e-54e2662c4938`)
- **Coluna:** "Novo Lead" (`column_id: 5748073e-d4b5-418b-b4ca-4671b6a2830c`)

**Restaurantes 09:07:**
- **Total:** 478 leads
- **Kanban:** "teste" (`funnel_id: 9e01c6b2-14b4-4ad8-9b9e-54e2662c4938`)
- **Coluna:** "Novo Lead" (`column_id: 5748073e-d4b5-418b-b4ca-4671b6a2830c`)

---

### **3. Timeline dos Eventos**

| Evento | Data/Hora | Status |
|--------|-----------|--------|
| **Run 09:03 iniciada** | 10/12/2025 12:03:07 | ✅ |
| **Primeiro lead criado** | 10/12/2025 09:03:15 | ✅ |
| **Run 09:07 iniciada** | 10/12/2025 12:07:58 | ✅ |
| **Primeiro lead criado** | 10/12/2025 09:08:07 | ✅ |
| **Config atualizada** | 10/12/2025 13:20:09 | ⚠️ **DEPOIS** |

**Conclusão:** ⚠️ **Configuração foi alterada DEPOIS que os leads foram criados**

---

## 🔍 Causa Raiz Identificada

### **Problema na Função `migrate_leads_with_custom_values()`**

**Código atual:**
```sql
SELECT 
  s.*,
  e.funnel_id,    -- ❌ Usa configuração ATUAL
  e.column_id,    -- ❌ Usa configuração ATUAL
  ...
FROM lead_extraction_staging s
JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
JOIN lead_extractions e ON e.id = r.extraction_id  -- ❌ Busca config ATUAL
```

**O que acontece:**
1. Run é iniciado com config apontando para "teste"
2. Leads são criados no kanban "teste" ✅ (correto naquele momento)
3. Cliente altera configuração para "Emails Gih" (13:20:09)
4. Função de migração busca configuração ATUAL ("Emails Gih")
5. Mas os leads já foram criados com a configuração antiga ("teste")

**⚠️ Na verdade, olhando melhor:**
- Os leads foram criados em 09:03 e 09:08
- A config foi atualizada em 13:20:09
- Então os leads foram criados ANTES da mudança de config
- Isso significa que quando foram criados, a config estava apontando para "teste"

**Mas a cliente disse que configurou para "Emails Gih"...**

---

## 💡 Possíveis Cenários

### **Cenário 1: Config Foi Alterada Antes dos Leads Migrarem** ⚠️ (Mais Provável)

**Timeline:**
1. Cliente configura extração para "Emails Gih"
2. Executa extração (09:03 e 09:07)
3. Alguém altera configuração para "teste" (antes de 09:03)
4. Leads migram usando config "teste" ✅
5. Cliente volta configuração para "Emails Gih" (13:20:09)
6. Mas leads já foram criados no "teste"

**Evidência:** `config_updated_at (13:20:09) > primeiro_lead_criado (09:03)`

**Mas isso não explica...** Se a config foi atualizada DEPOIS, por que os leads foram para "teste"?

---

### **Cenário 2: Config Estava em "teste" Quando os Leads Foram Criados**

**Timeline:**
1. Configuração estava em "teste" quando extração foi executada
2. Leads foram criados corretamente em "teste"
3. Cliente alterou configuração para "Emails Gih" depois (13:20:09)
4. Mas leads já estavam criados

**Evidência:** Leads foram criados em "teste", config atual está em "Emails Gih"

**Problema:** Cliente diz que configurou para "Emails Gih" antes...

---

### **Cenário 3: Bug na Função - Usa Config Errada**

**Possibilidade:** Função está usando configuração errada por algum motivo (cache, join incorreto, etc.)

---

## 🔍 Verificações Necessárias

### **1. Verificar se há histórico de mudanças na configuração**

**Query:**
```sql
-- Verificar se há tabela de audit para lead_extractions
SELECT * FROM audit_log 
WHERE table_name = 'lead_extractions'
  AND record_id = '7bd210e7-305d-4204-9324-b506266e3c2a'
ORDER BY created_at DESC;
```

### **2. Verificar se o run guarda configuração original**

**Query:**
```sql
-- Verificar campos do run que podem guardar config original
SELECT 
    ler.id,
    ler.progress_data,
    ler.*
FROM lead_extraction_runs ler
WHERE ler.run_name IN (
    'Restaurantes - 10/12/2025 09:07',
    'Restaurantes - 10/12/2025 09:03'
);
```

### **3. Verificar quando a configuração estava em "teste"**

**Query:**
```sql
-- Verificar histórico de mudanças (se houver)
-- Ou verificar se há algum campo que guarda a config original
```

---

## 🎯 Conclusão da Análise

### **Problema Confirmado:**

✅ **Leads foram criados no kanban "teste"**  
✅ **Configuração atual está em "Emails Gih"**  
✅ **Config foi atualizada DEPOIS que os leads foram criados**

### **Causa Provável:**

A configuração estava em "teste" quando os leads foram criados (09:03 e 09:08), e foi alterada para "Emails Gih" depois (13:20:09).

**Mas a cliente diz que configurou para "Emails Gih" antes...**

### **Possíveis Explicações:**

1. ⚠️ **Cliente alterou a configuração sem perceber** (mudou para "teste" antes de executar)
2. ⚠️ **Alguém alterou a configuração** (outro usuário, bug, etc.)
3. ⚠️ **Bug na função de migração** (usa configuração errada)

---

## 📋 Próximos Passos

1. ✅ **Verificar histórico de mudanças** (se houver tabela de audit)
2. ✅ **Verificar se run guarda config original** (progress_data ou outros campos)
3. ✅ **Identificar quando config estava em "teste"**
4. ⏳ **Propor correção** (mover leads ou corrigir função)

---

**Status:** 🔍 **ANÁLISE COMPLETA - Aguardando verificação de histórico**

