# 🔍 Auditoria: Validações Adicionais e Edge Cases

## 📋 Resumo Executivo

**Data:** 10/12/2025  
**Tipo de Auditoria:** Validações Adicionais e Edge Cases  
**Método:** Análise de dados reais no banco de dados  
**Status:** ✅ **AUDITORIA EM ANDAMENTO**

---

## 🧪 Testes Executados

### **TESTE 1: Leads Reais com Múltiplas Fontes**
**Objetivo:** Validar se leads reais com WHOIS, CNPJ e Scraping estão consolidando corretamente.

**Query:**
```sql
SELECT leads com whois_enriched = true
  AND cnpj_enriched = true
  AND scraping_enriched = true
```

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 2: Dados Malformados**
**Objetivo:** Identificar emails ou phones com formato inválido sendo salvos.

**Validações:**
- Emails que não seguem padrão `^[^@]+@[^@]+\.[^@]+$`
- Phones com menos de 10 ou mais de 11 dígitos

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 3: Dados Formatados mas Não Consolidados**
**Objetivo:** Identificar se há dados formatados que não estão sendo consolidados.

**Validações:**
- Scraping com emails formatados mas sem consolidação
- WHOIS com emails formatados mas sem consolidação
- CNPJ com emails formatados mas sem consolidação

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 4: Primary Fields Não Definidos**
**Objetivo:** Identificar leads com dados consolidados mas sem primary fields.

**Validações:**
- Leads com emails mas sem primary_email
- Leads com phones mas sem primary_phone
- Leads com websites mas sem primary_website

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 5: Duplicatas nos Arrays Consolidados**
**Objetivo:** Identificar se há duplicatas sendo mantidas nos arrays consolidados.

**Validações:**
- Emails duplicados no mesmo lead
- Phones duplicados no mesmo lead
- Websites duplicados no mesmo lead

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 6: Inconsistência de Flags**
**Objetivo:** Identificar leads com dados mas flags `_enriched` incorretas.

**Validações:**
- Scraping data presente mas `scraping_enriched = false`
- WHOIS data presente mas `whois_enriched = false`
- CNPJ data presente mas `cnpj_enriched = false`

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 7: Dados Sem Source**
**Objetivo:** Identificar dados consolidados sem campo `source`.

**Validações:**
- Emails sem source
- Phones sem source
- Websites sem source

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 8: Estatísticas Gerais**
**Objetivo:** Obter visão geral da qualidade dos dados.

**Métricas:**
- Total de leads
- Leads com emails/phones/websites
- Leads com primary fields
- Leads com CNPJ

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 9: Distribuição de Fontes**
**Objetivo:** Entender de onde vêm os dados consolidados.

**Análise:**
- Quantidade de emails por fonte (whois, cnpj, scraping, serpdev)
- Quantidade de phones por fonte
- Quantidade de websites por fonte

**Status:** ⏳ **EXECUTANDO**

---

### **TESTE 10: Formatação Incorreta**
**Objetivo:** Identificar dados de scraping sem formatação correta.

**Validações:**
- Scraping com emails mas sem campo `address`
- Scraping com phones mas sem campo `number`

**Status:** ⏳ **EXECUTANDO**

---

## 📊 Resultados

*Resultados serão preenchidos após execução dos testes...*

---

**Auditoria realizada em:** 10/12/2025  
**Tipo:** Validações Adicionais e Edge Cases  
**Status:** ⏳ **EM ANDAMENTO**

