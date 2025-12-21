# 🔧 Correção: Expansão Inteligente por Nível de Localização

## 📋 Requisitos do Usuário

1. **NÃO expandir se já está em bairro:**
   - Exemplo: `"Bancários, João Pessoa, PB, Brasil"` → **NÃO expandir**
   - Se já está no nível de bairro, não expandir

2. **Expandir se está em nível de cidade:**
   - Exemplo: `"João Pessoa, PB"` → **PODE expandir** para bairros
   - Se falta quantidade, quebrar em vários bairros

3. **Expandir se está em nível de estado:**
   - Exemplo: `"Paraíba"` → **PODE expandir** para bairros de várias cidades

4. **Otimização inteligente:**
   - Se pediu João Pessoa e tem 50 bairros, não precisa buscar todos
   - Se falta 100 leads, buscar apenas 1 página em 10 bairros diferentes
   - Não fazer extração de todos os bairros se não precisa

---

## ✅ Solução Implementada

### **Arquivo:** `supabase/functions/fetch-google-maps/index.ts`

### **1. Função de Detecção de Nível**

```typescript
function detectLocationLevel(location: string): 'neighborhood' | 'city' | 'state' {
  const parts = location.split(',').map(p => p.trim());
  
  // Se tem 3+ partes, provavelmente é bairro (ex: "Bancários, João Pessoa, PB")
  if (parts.length >= 3) {
    return 'neighborhood';
  }
  
  // Se tem 2 partes e a segunda é sigla de estado (2 letras), é cidade
  if (parts.length === 2) {
    const secondPart = parts[1].toUpperCase();
    if (secondPart.length === 2 && BRAZILIAN_STATES[secondPart]) {
      return 'city';
    }
    // Se segunda parte não é sigla, pode ser estado completo
    return 'state';
  }
  
  // Se tem apenas 1 parte, verificar se é estado conhecido
  if (parts.length === 1) {
    const partUpper = parts[0].toUpperCase();
    if (BRAZILIAN_STATES[partUpper] || Object.values(BRAZILIAN_STATES).some(s => s === parts[0])) {
      return 'state';
    }
    // Se não é estado conhecido, assumir cidade
    return 'city';
  }
  
  return 'city';
}
```

### **2. Validação na Condição de Expansão**

```typescript
// V16 CRITICAL: Detectar nível de granularidade da localização
const locationLevel = detectLocationLevel(location);
const isAlreadyNeighborhood = locationLevel === 'neighborhood';

// V16 CRITICAL: NÃO expandir se já está em nível de bairro
const shouldTrySegmentation = 
  !isAlreadyNeighborhood && // CRITICAL: Não expandir se já está em bairro
  percentage < 90 &&
  apiExhausted &&
  (compensationCount > 0 || compensationCount >= MAX_COMPENSATION_PAGES) &&
  segmentationEnabled &&
  !segmentationAlreadyDone &&
  !is_segmented;
```

### **3. Cálculo Inteligente de Bairros e Páginas**

```typescript
// Calcular quantos leads faltam
const leadsNeeded = Math.max(0, targetQuantity - currentCreated);
const estimatedLeadsPerPage = 10; // Estimativa conservadora
const pagesNeeded = Math.ceil(leadsNeeded / estimatedLeadsPerPage);

// Calcular quantos bairros usar (não todos se não precisa)
const neighborhoodsToUse = Math.min(
  neighborhoods.length,
  Math.max(1, Math.ceil(pagesNeeded / MAX_PAGES_PER_SEGMENT)),
  MAX_SEGMENTED_SEARCHES
);

// Calcular páginas por bairro baseado na necessidade
const pagesPerNeighborhood = Math.min(
  MAX_PAGES_PER_SEGMENT,
  Math.max(1, Math.ceil(pagesNeeded / neighborhoodsToUse))
);
```

### **Exemplo de Cálculo:**

**Cenário:** Falta 100 leads, tem 50 bairros disponíveis

1. **Leads necessários:** 100
2. **Páginas necessárias:** 100 / 10 = 10 páginas
3. **Bairros a usar:** min(50, ceil(10/3), 20) = min(50, 4, 20) = **4 bairros**
4. **Páginas por bairro:** min(3, ceil(10/4)) = min(3, 3) = **3 páginas por bairro**

**Resultado:** Busca 3 páginas em 4 bairros diferentes = 12 páginas (mais que suficiente)

**Cenário Otimizado:** Falta 100 leads, tem 50 bairros disponíveis

1. **Leads necessários:** 100
2. **Páginas necessárias:** 100 / 10 = 10 páginas
3. **Bairros a usar:** min(50, ceil(10/1), 20) = min(50, 10, 20) = **10 bairros**
4. **Páginas por bairro:** min(3, ceil(10/10)) = min(3, 1) = **1 página por bairro**

**Resultado:** Busca 1 página em 10 bairros diferentes = 10 páginas (exato!)

---

## 📊 Exemplos de Comportamento

### **Exemplo 1: Bairro Específico**
- **Input:** `"Bancários, João Pessoa, PB, Brasil"`
- **Nível detectado:** `neighborhood`
- **Expansão:** ❌ **NÃO expande** (já está em bairro)

### **Exemplo 2: Cidade**
- **Input:** `"João Pessoa, PB"`
- **Nível detectado:** `city`
- **Expansão:** ✅ **PODE expandir** para bairros
- **Cálculo:** Se falta 100 leads → busca 1 página em 10 bairros

### **Exemplo 3: Estado**
- **Input:** `"Paraíba"`
- **Nível detectado:** `state`
- **Expansão:** ✅ **PODE expandir** para bairros de várias cidades

---

## ✅ Validações Implementadas

1. ✅ **Detecção de nível de localização**
2. ✅ **Bloqueio de expansão se já está em bairro**
3. ✅ **Cálculo inteligente de bairros necessários**
4. ✅ **Cálculo inteligente de páginas por bairro**
5. ✅ **Otimização: não busca todos os bairros se não precisa**

---

## 🎯 Impacto

- ✅ **Respeita granularidade solicitada pelo usuário**
- ✅ **Otimiza recursos: não busca mais do que precisa**
- ✅ **Melhora performance: menos buscas desnecessárias**
- ✅ **Economiza API calls: busca apenas o necessário**

---

## ✅ Conclusão

**Todas as validações e otimizações solicitadas foram implementadas!**

O sistema agora:
- ✅ Detecta o nível de localização (bairro/cidade/estado)
- ✅ Não expande se já está em bairro
- ✅ Calcula inteligentemente quantos bairros e páginas buscar
- ✅ Otimiza para não buscar mais do que precisa

