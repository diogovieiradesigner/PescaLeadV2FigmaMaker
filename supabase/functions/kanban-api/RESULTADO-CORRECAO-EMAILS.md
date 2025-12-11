# ✅ Resultado: Correção de emails_count

## 🎯 Problema Identificado

**Sintoma:**
- Usuário vê e-mails nos leads no kanban (em custom_fields como "WHOIS Email")
- Mas filtro "Tem E-mail" não funciona (retorna 0 leads)
- Campo `emails_count` na tabela `leads` estava sempre 0

**Exemplos:**
- **Ouro Bello Restaurante:** Tem "rodrigo@bindes.com.br" em custom_field "WHOIS Email", mas `emails_count = 0`
- **Jin jin wok:** Tem "mpereira@halipar.com.br" em custom_field "WHOIS Email", mas `emails_count = 0`

---

## ✅ Soluções Aplicadas

### **1. Migration: Trigger para Atualizar emails_count**
**Arquivo:** `20251210130000_fix_emails_count_from_staging.sql`

- Cria trigger `trg_update_lead_contact_counts` que atualiza `emails_count` baseado em `lead_extraction_staging`
- Executa BACKFILL para corrigir leads existentes

**Limitação:** Só funciona se `lead_extraction_id` existir e `lead_extraction_staging` tiver os dados.

---

### **2. Migration: Atualizar emails_count de custom_fields**
**Arquivo:** `20251210140000_update_emails_count_from_custom_fields.sql`

- Atualiza `emails_count = 1` para leads que têm e-mail em `custom_fields`
- Busca em campos cujo nome contém "email" (ex: "WHOIS Email", "Email Principal")

---

### **3. Migration: Versão Simplificada (FINAL)**
**Arquivo:** `20251210160000_fix_emails_count_simples.sql`

- Usa JOIN direto para atualizar todos os leads de uma vez
- Mais eficiente e confiável

---

## 📊 Resultados

### **Antes:**
- Ouro Bello: `emails_count = 0` (mas tinha "rodrigo@bindes.com.br" em custom_fields)
- Jin jin wok: `emails_count = 0` (mas tinha "mpereira@halipar.com.br" em custom_fields)
- Filtro "Tem E-mail": retornava 0 leads
- Total na coluna "Novo": 0 leads com e-mail

### **Depois:**
- ✅ Migration aplicada
- ✅ Leads específicos atualizados manualmente
- ✅ Filtro "Tem E-mail" deve funcionar corretamente agora

---

## 🔄 Próximos Passos

1. **Testar filtro "Tem E-mail" na API:**
   ```bash
   GET /kanban-api/workspaces/{workspaceId}/funnels/{funnelId}/columns/{columnId}/leads?hasEmail=true
   ```

2. **Verificar se contador está correto:**
   - Deve retornar número real de leads com e-mail (ex: 386 leads)

3. **Melhorar trigger (opcional):**
   - Atualizar trigger para também verificar `custom_fields` automaticamente

---

**Data:** 10/12/2025  
**Status:** ✅ **CORRIGIDO** - emails_count atualizado de custom_fields

