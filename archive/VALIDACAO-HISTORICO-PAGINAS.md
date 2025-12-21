# 🔍 Validação: Sistema de Histórico de Páginas

## 📋 Objetivo

Verificar se o sistema está usando corretamente o histórico de extrações anteriores para começar na página seguinte.

**Exemplo esperado:**
- Extração 1: Páginas 1-50 processadas
- Extração 2 (mesmo termo/local): Deve começar na página 51

---

## ✅ ANÁLISE DO CÓDIGO

### **1. Função de Histórico Implementada** ✅

**Localização:** `supabase/functions/start-extraction/index.ts` (linhas 44-60)

**Código:**
```typescript
async function getLastProcessedPage(supabase: any, workspaceId: string, searchTerm: string, location: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_last_page_for_search', {
      p_workspace_id: workspaceId,
      p_search_term: searchTerm,
      p_location: location
    });
    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return 0;
    }
    return data || 0;
  } catch (err) {
    console.error('Exceção ao buscar histórico:', err);
    return 0;
  }
}
```

**Status:** ✅ **IMPLEMENTADA**

---

### **2. Uso do Histórico na Inicialização** ✅

**Localização:** `supabase/functions/start-extraction/index.ts` (linhas 134-142)

**Código:**
```typescript
// PASSO 2: Consultar histórico de páginas já processadas
const lastProcessedPage = await getLastProcessedPage(supabase, workspaceId, searchTerm, location);

console.log(`\n📚 HISTÓRICO:`);
console.log(`   Páginas já processadas para "${searchTerm}" + "${location}": ${lastProcessedPage}`);

// PASSO 3: Calcular quantas páginas precisa
const resultsPerPage = 10;
const pagesNeeded = Math.ceil(targetQuantity / resultsPerPage);
const startPage = lastProcessedPage + 1;  // ✅ COMEÇA NA PÁGINA SEGUINTE
```

**Status:** ✅ **IMPLEMENTADO CORRETAMENTE**

---

## 📊 ANÁLISE DO HISTÓRICO REAL

### **Extração Mais Recente (Rio de Janeiro):**

**Run ID:** `10d878b6-9af0-455b-967f-fd1a399a6b14`
- **Start Page:** 26 ✅
- **Last Page Target:** 30
- **Pages Consumed:** 41
- **Status:** completed

**Extração Anterior:**
- **Run ID:** `a2cde68c-9619-4a5f-a641-b106f8dee18b`
- **Start Page:** 16
- **Last Page Target:** 19
- **Pages Consumed:** 10
- **Status:** cancelled

**Extração Mais Antiga:**
- **Run ID:** `e1acfd07-45e4-43d1-8020-23671a6a6738`
- **Start Page:** 1
- **Last Page Target:** 4
- **Pages Consumed:** 15
- **Status:** completed

---

## 🔍 VERIFICAÇÃO NECESSÁRIA

### **Problema Potencial:**

A extração mais recente começou na **página 26**, mas:
- Extração anterior (cancelled) terminou na página 19
- Extração mais antiga terminou na página 4

**Pergunta:** A função `get_last_page_for_search` está considerando:
1. ✅ Páginas iniciais (`last_page_target`)
2. ❓ Páginas de compensação (`last_compensation_page`)
3. ❓ Páginas de compensação por filtros (`last_filter_compensation_page`)
4. ❓ Páginas de expansão segmentada?

---

## ⚠️ PROBLEMA IDENTIFICADO

### **Função SQL Pode Não Considerar Todas as Páginas**

A função `get_last_page_for_search` pode estar considerando apenas:
- `last_page_target` (páginas iniciais)
- Mas **NÃO** considerar:
  - `last_compensation_page` (compensação)
  - `last_filter_compensation_page` (compensação por filtros)
  - Páginas de expansão segmentada

**Impacto:**
- Se extração anterior processou até página 30 inicial + 10 compensação = página 40
- Nova extração pode começar na página 31 (correto)
- Mas se função não considerar compensação, pode começar na página 31 quando deveria começar na página 41

---

## 🎯 PRÓXIMOS PASSOS

1. **Verificar função SQL** `get_last_page_for_search`
2. **Validar se considera todas as páginas** (iniciais + compensação + expansão)
3. **Corrigir se necessário** para considerar todas as páginas processadas

---

## ✅ CONCLUSÃO PARCIAL

**Status:** ⚠️ **PRECISA VALIDAÇÃO**

**O que está funcionando:**
- ✅ Lógica de histórico implementada
- ✅ Sistema chama função SQL corretamente
- ✅ Calcula `startPage = lastProcessedPage + 1` corretamente

**O que precisa verificar:**
- ⚠️ Função SQL `get_last_page_for_search` pode não considerar todas as páginas
- ⚠️ Pode não considerar compensação e expansão

**Ação necessária:** Verificar e corrigir função SQL se necessário.

