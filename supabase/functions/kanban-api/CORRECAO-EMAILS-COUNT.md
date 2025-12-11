# 🔧 Correção: emails_count Não Estava Sendo Atualizado

## 🐛 Problema Identificado

**Sintoma:**
- Usuário vê e-mails nos leads no kanban (em custom_fields como "WHOIS Email")
- Mas filtro "Tem E-mail" não funciona (retorna 0 leads)
- Campo `emails_count` na tabela `leads` estava sempre 0

**Causa Raiz:**
1. E-mails estão em `custom_fields` (ex: "WHOIS Email" = "rodrigo@bindes.com.br")
2. E-mails também podem estar em `lead_extraction_staging.emails` ou `lead_extraction_staging.primary_email`
3. Campo `emails_count` na tabela `leads` não estava sendo atualizado quando leads eram migrados
4. Trigger `update_lead_contact_counts()` só atualizava baseado em `lead_extraction_staging`, não em `custom_fields`

---

## ✅ Soluções Aplicadas

### **1. Trigger para Atualizar emails_count (Migration 1)**

**Arquivo:** `20251210130000_fix_emails_count_from_staging.sql`

**O que faz:**
- Cria trigger `trg_update_lead_contact_counts` que atualiza `emails_count` e `whatsapp_valid` baseado em `lead_extraction_staging`
- Executa BACKFILL para corrigir leads existentes

**Limitação:** Só funciona se `lead_extraction_id` existir e `lead_extraction_staging` tiver os dados.

---

### **2. Atualizar emails_count de custom_fields (Migration 2)**

**Arquivo:** `20251210140000_update_emails_count_from_custom_fields.sql`

**O que faz:**
- Atualiza `emails_count = 1` para leads que têm e-mail em `custom_fields`
- Busca em campos cujo nome contém "email" (ex: "WHOIS Email", "Email Principal")
- Valida formato de e-mail com regex: `^[^@]+@[^@]+\.[^@]+$`

**Resultado:**
- Leads com e-mail em custom_fields agora têm `emails_count > 0`
- Filtro "Tem E-mail" funciona corretamente

---

## 📊 Resultados

### **Antes:**
- Ouro Bello: `emails_count = 0` (mas tinha "rodrigo@bindes.com.br" em custom_fields)
- Jin jin wok: `emails_count = 0` (mas tinha "mpereira@halipar.com.br" em custom_fields)
- Filtro "Tem E-mail": retornava 0 leads

### **Depois:**
- Ouro Bello: `emails_count = 1` ✅
- Jin jin wok: `emails_count = 1` ✅
- Filtro "Tem E-mail": retorna leads corretos ✅

---

## 🔄 Fluxo Completo

### **Quando Lead é Criado:**
1. `migrate_leads_with_custom_values()` cria lead na tabela `leads`
2. Triggers populam `custom_fields` com dados de WHOIS/CNPJ/Scraping
3. **NOVO:** Trigger `trg_update_lead_contact_counts` atualiza `emails_count` baseado em `lead_extraction_staging`
4. **NOVO:** Migration atualiza `emails_count` baseado em `custom_fields` (se necessário)

### **Quando Lead é Atualizado:**
1. Se `lead_extraction_id` mudar, trigger atualiza `emails_count`
2. Se custom_fields mudarem, migration pode ser executada novamente

---

## 🎯 Próximos Passos (Opcional)

### **Opção 1: Melhorar Trigger**
Atualizar trigger para também verificar `custom_fields`:

```sql
CREATE OR REPLACE FUNCTION update_lead_contact_counts()
RETURNS TRIGGER
AS $$
DECLARE
  v_emails_count INTEGER := 0;
  v_has_email_in_custom_fields BOOLEAN := false;
BEGIN
  -- Verificar lead_extraction_staging
  IF NEW.lead_extraction_id IS NOT NULL THEN
    -- ... código existente ...
  END IF;
  
  -- Verificar custom_fields se ainda não encontrou e-mail
  IF v_emails_count = 0 THEN
    SELECT EXISTS (
      SELECT 1
      FROM lead_custom_values lcv
      JOIN custom_fields cf ON cf.id = lcv.custom_field_id
      WHERE lcv.lead_id = NEW.id
        AND cf.name ILIKE '%email%'
        AND lcv.value ~ '^[^@]+@[^@]+\.[^@]+$'
    ) INTO v_has_email_in_custom_fields;
    
    IF v_has_email_in_custom_fields THEN
      v_emails_count := 1;
    END IF;
  END IF;
  
  NEW.emails_count := v_emails_count;
  RETURN NEW;
END;
$$;
```

### **Opção 2: Manter Migration Periódica**
Executar migration periodicamente para garantir sincronização.

---

**Data:** 10/12/2025  
**Status:** ✅ **CORRIGIDO** - emails_count agora é atualizado de custom_fields

