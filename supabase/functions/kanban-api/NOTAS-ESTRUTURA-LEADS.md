# 📝 Notas: Estrutura da Tabela `leads`

## 🔍 Descobertas

Após análise da estrutura real da tabela `leads`, descobri que:

### **Campos que NÃO existem:**
- ❌ `email`
- ❌ `phone`
- ❌ `primary_email`
- ❌ `primary_phone`
- ❌ `emails` (JSONB array)
- ❌ `phones` (JSONB array)

### **Campos que EXISTEM:**
- ✅ `client_name`
- ✅ `company`
- ✅ `emails_count` (integer)
- ✅ `calls_count` (integer)
- ✅ `whatsapp_valid` (boolean)
- ✅ `whatsapp_jid` (text)
- ✅ `whatsapp_name` (text)
- ✅ `lead_extraction_id` (uuid)
- ✅ `lead_extraction_run_id` (uuid)

---

## 🔗 Relação com `lead_extraction_staging`

A tabela `leads` tem:
- `lead_extraction_id` - Relação com `lead_extraction_staging.id`
- `lead_extraction_run_id` - Relação com `lead_extraction_runs.id`

**Conclusão:** Os dados de email/phone estão em `lead_extraction_staging`, não diretamente em `leads`.

---

## ✅ Ajustes Feitos

### **1. Filtros (`filters.service.ts`)**
```typescript
// ❌ ANTES (campos que não existem)
if (filters.hasEmail) {
  filteredQuery = filteredQuery.or('primary_email.not.is.null,emails.neq.[]');
}

// ✅ DEPOIS (usando campos que existem)
if (filters.hasEmail) {
  filteredQuery = filteredQuery.gt('emails_count', 0);
}

if (filters.hasWhatsapp) {
  filteredQuery = filteredQuery.eq('whatsapp_valid', true);
}
```

### **2. Query de Leads (`leads.service.ts`)**
```typescript
// ❌ ANTES (campos que não existem)
.select('...,email,phone,primary_email,primary_phone,emails,phones')

// ✅ DEPOIS (usando campos que existem)
.select('...,emails_count,calls_count,whatsapp_valid,whatsapp_jid,whatsapp_name')
```

### **3. Mapper (`leads.mapper.ts`)**
```typescript
// ❌ ANTES
email: dbLead.email || dbLead.primary_email || '',

// ✅ DEPOIS
email: '', // TODO: Buscar de lead_extraction_staging se necessário
```

---

## 🚀 Próximos Passos (Opcional)

### **Opção 1: JOIN com `lead_extraction_staging`**
Se precisar dos emails/phones reais, fazer JOIN:

```typescript
const baseQuery = supabase
  .from('leads')
  .select(`
    *,
    lead_extraction_staging!inner(
      primary_email,
      primary_phone,
      emails,
      phones
    )
  `)
```

**Vantagem:** Dados completos  
**Desvantagem:** Query mais lenta, mais dados transferidos

### **Opção 2: Usar apenas contadores (Atual)**
Usar `emails_count` e `whatsapp_valid` para filtros.

**Vantagem:** Query rápida, menos dados  
**Desvantagem:** Não tem os emails/phones reais

### **Opção 3: Adicionar campos na tabela `leads`**
Adicionar `primary_email` e `primary_phone` na tabela `leads` via migration.

**Vantagem:** Dados diretos, queries rápidas  
**Desvantagem:** Precisa de migration, duplicação de dados

---

## ✅ Status Atual

- ✅ Filtros ajustados para usar campos que existem
- ✅ Query ajustada para não buscar campos inexistentes
- ✅ Mapper ajustado (com TODO para futura melhoria)
- ⚠️ Email/phone não são retornados (apenas contadores)

**Recomendação:** Implementar Opção 3 (adicionar campos na tabela `leads`) se precisar dos emails/phones reais.

---

**Data:** 10/12/2025  
**Status:** ✅ Ajustado para estrutura real

