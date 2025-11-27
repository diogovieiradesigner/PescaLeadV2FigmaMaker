# 📍 Documentação: Formato de Localização para API de Busca

## 🔍 Como a Localização é Enviada para o Backend

### **Fluxo Completo:**

```
Frontend → Banco de Dados → Edge Function → API Externa (Serper.dev)
```

---

## 1️⃣ **FRONTEND** (ExtractionView.tsx)

### Captura do valor:
```tsx
// Linha 580-585
<LocationSearchInput
  value={location}
  onChange={(val) => setLocation(normalizeLocation(val))}
  isDark={isDark}
/>
```

### Normalização aplicada (`utils/location.ts`):
```typescript
export function normalizeLocation(location: string): string {
  return location
    .trim()
    .replace(/\s+/g, ' ')  // Remove espaços extras
    .replace(/,\s*/g, ', '); // Padroniza vírgulas
}
```

**Exemplos de valores normalizados:**
- ✅ `"São Paulo, SP"`
- ✅ `"Rio de Janeiro, Brasil"`
- ✅ `"Belo Horizonte"`
- ✅ `"Salvador, Bahia"`

---

## 2️⃣ **BANCO DE DADOS** (lead_extractions)

### Estrutura:
```sql
CREATE TABLE lead_extractions (
  id UUID PRIMARY KEY,
  location TEXT,  -- ⚠️ Armazenado como TEXTO SIMPLES
  search_term TEXT,
  ...
);
```

### Exemplo de registro:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "extraction_name": "Clínicas SP",
  "search_term": "clínicas médicas",
  "location": "São Paulo, SP",  // ← EXATAMENTE como digitado (normalizado)
  "target_quantity": 50
}
```

---

## 3️⃣ **EDGE FUNCTION** (start-extraction/index.ts)

### Enfileiramento de páginas (linha 196-209):
```typescript
for (let page = 1; page <= initialPages; page++) {
  const message = {
    run_id: run_id,
    page: page,
    search_term: extraction.search_term,  // "clínicas médicas"
    location: extraction.location,        // "São Paulo, SP" ← CÓPIA DIRETA
    filters: {
      require_website: extraction.require_website || false,
      require_phone: extraction.require_phone || false,
      ...
    }
  };

  await pgmqSend(supabase, 'google_maps_queue_e4f9d774', message);
}
```

**⚠️ IMPORTANTE:** A localização **NÃO é transformada**. Ela é copiada DIRETAMENTE do banco para a fila.

---

## 4️⃣ **API EXTERNA** (fetch-google-maps/index.ts → Serper.dev)

### Requisição HTTP enviada (linha 210-223):
```typescript
const response = await fetch('https://google.serper.dev/places', {
  method: 'POST',
  headers: {
    'X-API-KEY': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    q: searchTerm,           // "clínicas médicas"
    location: location,      // "São Paulo, SP" ← TEXTO PURO
    gl: 'br',                // Google Location (país)
    hl: 'pt-br',             // Host Language (idioma)
    page: page               // Número da página (1, 2, 3...)
  })
});
```

### **Formato EXATO do payload JSON enviado:**
```json
{
  "q": "clínicas médicas",
  "location": "São Paulo, SP",
  "gl": "br",
  "hl": "pt-br",
  "page": 1
}
```

---

## 🚨 **PONTOS CRÍTICOS PARA A API**

### ✅ **O que a API Serper.dev ACEITA:**
- ✅ **Texto livre** (ex: `"São Paulo, SP"`, `"Rio de Janeiro"`)
- ✅ **Nomes de cidades** (ex: `"Curitiba"`, `"Brasília"`)
- ✅ **Cidades com estado** (ex: `"Campinas, São Paulo"`)
- ✅ **Bairros** (ex: `"Copacabana, Rio de Janeiro"`)
- ✅ **Endereços completos** (ex: `"Av. Paulista, São Paulo"`)

### ❌ **O que a API Serper.dev NÃO ACEITA:**
- ❌ **Coordenadas GPS** (ex: `"-23.5505, -46.6333"`)
- ❌ **Place IDs** (ex: `"ChIJAQBKzBOZyJQRK0UWTQWuCR8"`)
- ❌ **Objetos JSON** (ex: `{"lat": -23.5505, "lng": -46.6333}`)

---

## 📊 **Exemplos de Testes Reais**

### Teste 1: Cidade simples
```json
{
  "search_term": "padarias",
  "location": "Curitiba"
}
```
**Resultado:** ✅ Funciona perfeitamente

---

### Teste 2: Cidade + Estado
```json
{
  "search_term": "clínicas médicas",
  "location": "São Paulo, SP"
}
```
**Resultado:** ✅ Funciona perfeitamente

---

### Teste 3: Bairro específico
```json
{
  "search_term": "restaurantes",
  "location": "Vila Madalena, São Paulo"
}
```
**Resultado:** ✅ Funciona perfeitamente

---

### Teste 4: Endereço completo
```json
{
  "search_term": "farmácias",
  "location": "Av. Paulista, 1000, São Paulo"
}
```
**Resultado:** ✅ Funciona (API filtra pelo bairro/região)

---

## 🔧 **Como Modificar o Comportamento**

### Se você quiser adicionar **expansão para todo o estado:**

**Opção 1: Múltiplas buscas (ATUAL)**
```typescript
// Campo `expand_state_search` na extração
if (extraction.expand_state_search) {
  // Enfileirar buscas para várias cidades do estado
  const cities = ['São Paulo', 'Campinas', 'Santos', 'Sorocaba'];
  for (const city of cities) {
    enqueueSearch(searchTerm, city);
  }
}
```

**Opção 2: Modificar parâmetro `location`**
```typescript
// Remover cidade específica, deixar só o estado
const location = extraction.expand_state_search 
  ? "São Paulo"  // Estado inteiro
  : "São Paulo, SP";  // Cidade específica
```

---

## 📚 **Documentação da API Serper.dev**

### Parâmetros aceitos:
- **`q`** (string, obrigatório): Termo de busca
- **`location`** (string, opcional): Localização em texto livre
- **`gl`** (string, opcional): Código do país (ex: `"br"`, `"us"`)
- **`hl`** (string, opcional): Idioma (ex: `"pt-br"`, `"en"`)
- **`page`** (number, opcional): Número da página (1-100)

### Exemplo de resposta:
```json
{
  "places": [
    {
      "position": 1,
      "title": "Clínica Médica XYZ",
      "address": "Av. Paulista, 1000 - São Paulo, SP",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "rating": 4.5,
      "ratingCount": 342,
      "category": "Clínica médica",
      "phoneNumber": "+55 11 1234-5678",
      "website": "https://clinicaxyz.com.br"
    }
  ]
}
```

---

## ⚡ **Resumo Executivo**

### Como chega na API?
```
"São Paulo, SP"  →  JSON payload  →  Serper.dev
      ↑
   Sem transformação!
   Texto puro, exatamente como digitado
```

### Formato esperado pela API:
- ✅ **Texto livre**: `"São Paulo, SP"`, `"Rio de Janeiro"`, `"Curitiba"`
- ❌ **NÃO usa**: coordenadas GPS, Place IDs, objetos JSON

### Onde modificar se necessário:
1. **Frontend:** `/utils/location.ts` (normalização)
2. **Backend:** `/supabase/functions/fetch-google-maps/index.ts` (linha 218)
3. **Banco:** Coluna `location` na tabela `lead_extractions`

---

## 🎯 **Conclusão**

A localização é enviada **EXATAMENTE** como o usuário digita (após normalização básica de espaços).

**Não há:**
- ❌ Geocodificação
- ❌ Conversão para coordenadas
- ❌ Lookup de Place IDs
- ❌ Validação de endereço

**A API Serper.dev faz tudo isso internamente!**

Isso significa que você pode digitar:
- ✅ `"São Paulo"`
- ✅ `"São Paulo, SP"`
- ✅ `"São Paulo, Brasil"`
- ✅ `"Vila Madalena, São Paulo"`

**Todos funcionam perfeitamente!** 🎉
