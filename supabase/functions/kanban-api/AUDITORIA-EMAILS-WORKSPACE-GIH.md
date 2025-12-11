# 📊 Auditoria: Leads com E-mail no Workspace da Gih

**Data:** 10/12/2025  
**Workspace ID:** `81fb73c0-a368-4d73-9384-4af5f2e6a2ed`

---

## 📈 Métricas Gerais

### **1. Total de Leads no Workspace**
- **Total:** **1.469 leads** ativos

### **2. Leads com emails_count > 0**
- **Total:** **424 leads** (28.9% do total)
- **Fonte:** Campo `emails_count` na tabela `leads`
- **Status:** ✅ Campo está sendo usado

### **3. Leads com E-mail em Custom Fields (Validação Real)**
- **Total:** **488 leads** (33.2% do total)
- **Fonte:** Busca em `lead_custom_values` + `custom_fields` onde nome contém "email"
- **Status:** ✅ Dados reais encontrados

### **4. Leads com E-mail em lead_extraction_staging**
- **Total:** **0 leads**
- **Fonte:** Campo `emails` (JSONB array) ou `primary_email` em `lead_extraction_staging`
- **Status:** ⚠️ Nenhum lead tem `lead_extraction_id` válido ou staging não tem dados

---

## ⚠️ Inconsistências Detectadas

### **5. Leads com E-mail em Custom Fields mas emails_count = 0**
- **Total:** **64 leads** ❌
- **Status:** ❌ **PROBLEMA DETECTADO** - Estes leads têm e-mail mas não estão sendo contados
- **Ação:** ✅ **CORRIGIDO** - Migration aplicada

### **6. Leads com emails_count > 0 mas sem E-mail Real**
- **Total:** **0 leads** ✅
- **Status:** ✅ **OK** - Nenhum lead está marcado incorretamente

---

## 📊 Distribuição

### **7. Distribuição por Funil**
| Funil | Total Leads | Leads com E-mail | % com E-mail |
|-------|-------------|------------------|--------------|
| **Emails Gih** | 1.174 | 386 | 32.88% |
| **teste** | 295 | 38 | 12.88% |

### **8. Distribuição por Coluna (Funil "Emails Gih")**
| Coluna | Total Leads | Leads com E-mail | % com E-mail |
|--------|-------------|------------------|--------------|
| **Novo** | 1.174 | 386 | 32.88% |

---

## 🔍 Detalhes

### **9. Tipos de Custom Fields com E-mail**
| Campo | Tipo | Leads com este Campo |
|-------|------|---------------------|
| **WHOIS Email** | email | 471 leads |
| **Email Principal** | email | 147 leads |
| **Scraping Email 1** | email | 147 leads |
| **Todos os Emails (JSON)** | text | 124 leads |
| **Scraping Email 2** | email | 23 leads |
| **Scraping Emails** | text | 18 leads |
| **Scraping Email 3** | email | 7 leads |
| **Scraping Email 4** | email | 1 lead |

### **10. Exemplos de Leads com E-mail**
1. **Madalena Paulistana** - `fausto.vieira@agenciaisland.com.br` ✅
2. **Natural da Terra** - `redes.grupo@hortifruti.com.br` ✅
3. **Villa Grano** - `fabio.borovina@gmail.com` ✅
4. **Restaurante Sabores de Minas** - `danielscocco@gmail.com` ✅
5. **SS Domingues Casa de Pães** - `ti@epadoca.com` ✅

---

## ✅ Conclusão

### **Status Geral:**
- ✅ **Funcionando:** Sistema está funcionando, mas havia 64 leads com inconsistência
- ✅ **Corrigido:** 64 leads foram atualizados
- ✅ **Validação:** 0 leads com emails_count > 0 mas sem e-mail real

### **Estatísticas Finais:**
- **Total de leads no workspace:** 1.469
- **Leads com e-mail real (custom_fields):** 488 (33.2%)
- **Leads com emails_count > 0 (após correção):** 488 (33.2%) ✅
- **Inconsistências restantes:** 0 ✅

### **Recomendações:**
1. ✅ **Trigger atualizado** - Agora verifica custom_fields quando staging não tem dados
2. ✅ **Migration aplicada** - 64 leads corrigidos
3. ✅ **Sistema validado** - 100% de consistência entre emails_count e dados reais

---

## 📝 Resumo Executivo

### **Antes da Correção:**
- Leads com emails_count > 0: **424**
- Leads com e-mail real: **488**
- **Diferença:** 64 leads não contados ❌

### **Depois da Correção:**
- Leads com emails_count > 0: **488** ✅
- Leads com e-mail real: **488** ✅
- **Diferença:** 0 (100% consistente) ✅

---

**Status Final:** ✅ **SISTEMA FUNCIONANDO CORRETAMENTE**

**Próximos Passos:**
- ✅ Sistema validado e corrigido
- ✅ Trigger funcionando corretamente
- ✅ Filtro "Tem E-mail" na API funcionando

