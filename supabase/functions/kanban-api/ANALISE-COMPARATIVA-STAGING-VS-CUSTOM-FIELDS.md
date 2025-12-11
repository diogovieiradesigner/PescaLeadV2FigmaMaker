# 🔍 Análise Comparativa: Staging vs Tabelas Principais

**Data:** 10/12/2025

---

## 📊 **Objetivo**

Verificar se todos os dados do `lead_extraction_staging` estão sendo migrados corretamente para as tabelas principais (`leads`, `custom_fields`, `lead_custom_values`).

---

## 🔍 **Queries de Análise**

### **1. Leads com Mais Dados no Staging**

Identifica leads que têm mais dados disponíveis no staging para análise detalhada.

### **2. Comparação Staging vs Custom Fields (Top 5)**

Compara os 5 leads com mais dados no staging e verifica se os dados foram migrados para `custom_fields`.

### **3. Todos os Custom Fields de um Lead**

Lista todos os `custom_fields` de leads migrados para verificar quais dados estão disponíveis.

### **4. Estatísticas Gerais**

Estatísticas agregadas mostrando:
- Quantos leads têm dados no staging
- Quantos têm dados em custom_fields
- Quantos têm dados faltando

### **5. Dados de Enriquecimento**

Verifica se dados de CNPJ, WHOIS e Scraping foram migrados para custom_fields.

---

## 📋 **Resultados**

Execute as queries acima para obter os resultados detalhados.

---

## ✅ **Próximos Passos**

1. Executar as queries e analisar os resultados
2. Identificar padrões de dados faltando
3. Verificar se os triggers estão executando corretamente
4. Corrigir triggers ou criar funções de sincronização se necessário

