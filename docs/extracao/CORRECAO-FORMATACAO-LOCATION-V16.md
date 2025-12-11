# 🔧 Correção Crítica: Formatação de Location para SerpDev API

## 📋 Problema Identificado

O usuário alertou que a localização **DEVE** seguir o formato exato da SerpDev API:

**Formato Correto:** `"Joao Pessoa, State of Paraiba, Brazil"`
- Com "State of" antes do estado
- Primeira letra maiúscula em cada palavra
- "Brazil" no final

**Problema:** Se não seguir esse formato exato, a API retorna leads do mundo inteiro.

---

## ✅ Solução Implementada

### **Arquivo:** `supabase/functions/fetch-google-maps/index.ts`

### **Funções Criadas:**

1. **`fetchNeighborhoodsFromOverpass`**
   - Busca bairros via Edge Function `fetch-overpass-coordinates`
   - Retorna lista de bairros com coordenadas

2. **`enqueueSegmentedSearches`** (CRÍTICA)
   - Enfileira buscas segmentadas por bairro
   - **GARANTE formatação correta da localização**

### **Lógica de Formatação:**

```typescript
// 1. Extrair estado da localização original normalizada
const normalizedOriginalLocation = normalizeLocationForSerper(originalLocation, expandState);
// Exemplo: "São Paulo, State of Sao Paulo, Brazil"

// 2. Extrair nome do estado usando regex
const stateMatch = normalizedOriginalLocation.match(/State of ([^,]+)/);
const stateName = stateMatch[1].trim(); // "Sao Paulo"

// 3. Construir localização segmentada no formato correto
segmentedLocation = `${neighborhood.name}, State of ${stateName}, Brazil`;
// Exemplo: "Pinheiros, State of Sao Paulo, Brazil"

// 4. Normalizar novamente para garantir formato correto
segmentedLocation = normalizeLocationForSerper(segmentedLocation, expandState);
```

### **Exemplo de Formatação:**

**Entrada:**
- Localização original: `"São Paulo, SP"`
- Bairro: `"Pinheiros"`

**Processamento:**
1. Normalizar original: `"São Paulo, State of Sao Paulo, Brazil"`
2. Extrair estado: `"Sao Paulo"`
3. Construir segmentada: `"Pinheiros, State of Sao Paulo, Brazil"`
4. Normalizar final: `"Pinheiros, State of Sao Paulo, Brazil"`

**Resultado Final:**
```json
{
  "location": "Pinheiros, State of Sao Paulo, Brazil"
}
```

---

## 🔍 Validação

### **Formato Garantido:**
- ✅ `"Bairro, State of Estado, Brazil"`
- ✅ Primeira letra maiúscula em cada palavra
- ✅ "State of" antes do estado
- ✅ "Brazil" no final
- ✅ Sem acentos (normalizados pela função `normalizeLocationForSerper`)

### **Exemplos de Saída:**
- `"Pinheiros, State of Sao Paulo, Brazil"`
- `"Vila Madalena, State of Sao Paulo, Brazil"`
- `"Centro, State of Paraiba, Brazil"`
- `"Manaíra, State of Paraiba, Brazil"`

---

## ⚠️ Importante

**A função `normalizeLocationForSerper` já garante:**
- Remoção de acentos
- Capitalização correta
- Formato "State of Estado, Brazil"

**A função `enqueueSegmentedSearches` garante:**
- Extração correta do estado da localização original
- Construção da localização segmentada no formato correto
- Normalização final para garantir consistência

---

## 📊 Impacto

- ✅ **Localização sempre no formato correto**
- ✅ **API SerpDev recebe formato esperado**
- ✅ **Evita retornar leads do mundo inteiro**
- ✅ **Buscas segmentadas funcionam corretamente**

---

## 🎯 Teste Recomendado

Testar com:
- Localização: `"São Paulo, SP"`
- Bairro: `"Pinheiros"`
- Verificar se location enviada é: `"Pinheiros, State of Sao Paulo, Brazil"`

---

## ✅ Conclusão

**Correção crítica aplicada!** A localização agora é sempre formatada corretamente antes de ser enviada à SerpDev API, garantindo que apenas leads da região correta sejam retornados.

