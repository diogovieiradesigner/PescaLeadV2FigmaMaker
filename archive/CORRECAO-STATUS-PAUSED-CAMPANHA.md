# 🔧 Correção: Status 'paused' Não Permitido no CHECK CONSTRAINT

## 🎯 Problema Identificado

Ao tentar pausar uma campanha, ocorria erro:

```
new row for relation "campaign_runs" violates check constraint "campaign_runs_status_check"
```

**Causa:** O CHECK CONSTRAINT da tabela `campaign_runs` só permitia:
- `'running'`
- `'completed'`
- `'failed'`
- `'cancelled'`

Mas **não incluía** `'paused'`, que é necessário para a funcionalidade de pausar campanhas.

---

## ✅ Correção Aplicada

### **Migração SQL Criada e Aplicada:**

```sql
-- Remover constraint antigo
ALTER TABLE campaign_runs
DROP CONSTRAINT IF EXISTS campaign_runs_status_check;

-- Criar novo constraint com 'paused' incluído
ALTER TABLE campaign_runs
ADD CONSTRAINT campaign_runs_status_check
CHECK (status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'paused'::text]));
```

### **Status Válidos Agora:**

✅ `'running'` - Campanha em execução  
✅ `'completed'` - Campanha concluída  
✅ `'failed'` - Campanha falhou  
✅ `'cancelled'` - Campanha cancelada  
✅ `'paused'` - Campanha pausada (NOVO)

---

## 🎯 Teste Novamente

Agora você pode:
- ✅ **Pausar** campanhas sem erro
- ✅ **Cancelar** campanhas (já funcionava)
- ✅ **Retomar** campanhas pausadas

---

**Status:** ✅ **Migração Aplicada - Pronto para Testar!**

