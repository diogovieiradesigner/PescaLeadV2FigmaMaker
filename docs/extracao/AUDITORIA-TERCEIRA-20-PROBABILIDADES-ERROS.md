# 🔍 Terceira Auditoria: 20 Probabilidades de Erros Adicionais

## 📋 Objetivo

Análise profunda focada em encontrar **20 probabilidades de erros adicionais** não identificadas nas auditorias anteriores, garantindo máxima estabilidade do sistema V16.

---

## 🔴 PROBLEMA #1: Fallback de Incremento Pode Causar Race Condition

**Severidade:** 🔴 CRÍTICA

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linhas 814-823)

**Problema:**
Quando `increment_segmented_searches_completed` falha, o fallback faz um SELECT e usa o valor atual. Se múltiplas páginas falharem simultaneamente, todas lerão o mesmo valor e escreverão o mesmo valor incrementado.

**Cenário de Falha:**
1. Página A: RPC falha → SELECT → lê `completed = 5` → escreve `completed = 5` (ERRADO!)
2. Página B: RPC falha → SELECT → lê `completed = 5` → escreve `completed = 5` (ERRADO!)
3. **Resultado:** Ambas escrevem `completed = 5`, quando deveria ser `completed = 7`

**Impacto:**
- Contagem incorreta mesmo no fallback
- Finalização prematura ou nunca finaliza

**Solução:**
```typescript
if (incrementError) {
  console.error(`[V16 SEGMENTATION] Erro ao incrementar contador:`, incrementError);
  // V16 FIX: Tentar UPDATE manual com incremento atômico
  const { error: updateError } = await supabase.rpc('pgmq_execute_sql', {
    query: `
      UPDATE lead_extraction_runs
      SET progress_data = jsonb_set(
        progress_data,
        '{segmented_searches_completed}',
        to_jsonb((COALESCE(progress_data->>'segmented_searches_completed', '0')::int + 1)::text)
      )
      WHERE id = $1
    `,
    params: [run_id]
  });
  
  if (updateError) {
    // Último recurso: usar valor atual + 1 (ainda pode ter race condition, mas melhor que nada)
    const { data: fallbackData } = await supabase
      .from('lead_extraction_runs')
      .select('progress_data')
      .eq('id', run_id)
      .single();
    segmentedSearchesCompleted = (fallbackData?.progress_data?.segmented_searches_completed || 0) + 1;
  }
}
```

---

## 🔴 PROBLEMA #2: Overpass API Retorna Array Vazio Silenciosamente

**Severidade:** 🔴 CRÍTICA

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linhas 1000-1002)

**Problema:**
Se `fetchNeighborhoodsFromOverpass` retornar array vazio (erro ou sem bairros), o sistema continua normalmente sem tentar alternativas ou avisar o usuário adequadamente.

**Cenário de Falha:**
1. Overpass API retorna erro → `fetchNeighborhoodsFromOverpass` retorna `[]`
2. Sistema verifica `if (neighborhoods.length > 0)` → false
3. Sistema continua sem expansão → extração nunca atinge meta
4. Usuário não sabe por quê

**Impacto:**
- Expansão falha silenciosamente
- Meta não atingida sem explicação clara
- Experiência do usuário ruim

**Solução:**
```typescript
const neighborhoods = await fetchNeighborhoodsFromOverpass(supabase, location);

if (neighborhoods.length === 0) {
  console.error(`❌ [V16 SEGMENTATION] Nenhum bairro encontrado para "${location}"`);
  await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'warning',
    `⚠️ V16 Expansão não disponível: Nenhum bairro encontrado para "${location}"`,
    { location, reason: 'no_neighborhoods_found' }
  );
  
  // V16 FIX: Finalizar extração com status apropriado
  await supabase
    .from('lead_extraction_runs')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      progress_data: {
        ...progressData,
        segmentation_attempted: true,
        segmentation_failed: true,
        segmentation_failure_reason: 'no_neighborhoods_found'
      }
    })
    .eq('id', run_id);
  
  return; // Não continuar
}
```

---

## 🟡 PROBLEMA #3: Enfileiramento Parcial Não É Tratado

**Severidade:** 🟡 GRAVE

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linhas 493-507)

**Problema:**
Se `enqueueSegmentedSearches` enfileirar parcialmente (alguns sucesso, outros falha), o sistema salva `segmented_searches_enqueued` com o total tentado, não o total realmente enfileirado.

**Cenário de Falha:**
1. Tentativa de enfileirar 20 páginas
2. 15 sucesso, 5 falha
3. Sistema salva `segmented_searches_enqueued: 20` (ERRADO!)
4. Sistema espera 20 páginas → nunca finaliza (só 15 foram enfileiradas)

**Impacto:**
- Finalização nunca acontece
- Contagem incorreta
- Extração fica travada

**Solução:**
```typescript
// Já está implementado corretamente! ✅
// O código já conta apenas sucessos:
if (!error && data) {
  totalEnqueued++; // ✅ Só conta se sucesso
}

// Mas precisa garantir que segmented_searches_enqueued seja atualizado corretamente:
segmented_searches_enqueued: segmentationResult.enqueued, // ✅ Já usa valor correto
```

**Status:** ✅ JÁ CORRIGIDO (mas verificar se sempre usa `enqueued` e não `tentado`)

---

## 🟡 PROBLEMA #4: Falta Validação de Coordenadas Antes de Usar

**Severidade:** 🟡 GRAVE

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linhas 486-489)

**Problema:**
Coordenadas de bairros podem ser `null`, `undefined`, ou inválidas (NaN, fora do Brasil), mas não são validadas antes de usar.

**Cenário de Falha:**
1. Overpass retorna bairro com `lat: null, lng: null`
2. Sistema enfileira mensagem com `segment_coordinates: { lat: null, lng: null }`
3. Sistema tenta usar coordenadas → erro ou comportamento inesperado

**Impacto:**
- Erros silenciosos
- Comportamento inesperado
- Logs confusos

**Solução:**
```typescript
// Validar coordenadas antes de enfileirar
if (!neighborhood.lat || !neighborhood.lng || 
    isNaN(neighborhood.lat) || isNaN(neighborhood.lng) ||
    neighborhood.lat < -35 || neighborhood.lat > 6 ||
    neighborhood.lng < -75 || neighborhood.lng > -30) {
  console.error(`[V16] Coordenadas inválidas para bairro "${neighborhood.name}": ${neighborhood.lat}, ${neighborhood.lng}`);
  continue; // Pular este bairro
}
```

---

## 🟡 PROBLEMA #5: Timeout Não Implementado para Buscas Segmentadas

**Severidade:** 🟡 GRAVE

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linhas 835-892)

**Problema:**
Sistema espera todas as buscas segmentadas completarem, mas não há timeout. Se uma página segmentada falhar permanentemente (erro de API, mensagem perdida), extração nunca finaliza.

**Cenário de Falha:**
1. 20 páginas segmentadas enfileiradas
2. 19 completam com sucesso
3. 1 página falha permanentemente (API error, mensagem perdida)
4. Sistema espera eternamente → extração nunca finaliza

**Impacto:**
- Extrações travadas indefinidamente
- Recursos desperdiçados
- Experiência do usuário ruim

**Solução:**
```typescript
// Verificar timeout de buscas segmentadas
const segmentationStartedAt = progressData.segmentation_started_at;
if (segmentationStartedAt) {
  const segmentationAge = Date.now() - new Date(segmentationStartedAt).getTime();
  const SEGMENTATION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas
  
  if (segmentationAge > SEGMENTATION_TIMEOUT_MS) {
    console.warn(`⚠️ [V16 SEGMENTATION] Timeout atingido após ${segmentationAge}ms`);
    // Finalizar mesmo sem todas as páginas
    await finalizeExtraction(...);
  }
}
```

---

## 🟠 PROBLEMA #6: Deduplicação Não Considera Workspace em Hash

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linha 678)

**Problema:**
Hash de deduplicação não inclui `workspace_id`, mas a constraint UNIQUE sim. Isso pode causar falsos positivos se dois workspaces diferentes tiverem o mesmo lead.

**Cenário:**
- Workspace A: Lead "Empresa X" → Hash: `abc123`
- Workspace B: Lead "Empresa X" → Hash: `abc123` (mesmo hash!)
- Pré-filtro em memória pode filtrar incorretamente se hashes forem misturados

**Impacto:**
- Baixo (constraint UNIQUE protege no banco)
- Mas pré-filtro pode ser menos eficiente

**Solução:**
```typescript
// Hash já não inclui workspace_id, mas constraint UNIQUE protege
// Pré-filtro busca apenas do workspace atual, então está OK ✅
const { data: existingLeads } = await supabase
  .from('lead_extraction_staging')
  .select('deduplication_hash')
  .eq('workspace_id', workspace_id); // ✅ Filtra por workspace
```

**Status:** ✅ NÃO É PROBLEMA (pré-filtro já filtra por workspace)

---

## 🟠 PROBLEMA #7: API Key Pode Ser Null ou Inválida

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linhas 655-656)

**Problema:**
Se `getApiKey` retornar `null` ou string vazia, sistema lança erro genérico. Não há fallback ou retry com outra key.

**Cenário de Falha:**
1. API Key #5 não existe no banco
2. `getApiKey(supabase, 5)` retorna `null`
3. Sistema lança erro → página não processada
4. Mensagem volta para fila → loop infinito

**Impacto:**
- Mensagens ficam presas na fila
- Processamento bloqueado
- Necessita intervenção manual

**Solução:**
```typescript
let apiKey = await getApiKey(supabase, keyIndex);
if (!apiKey) {
  // Tentar próxima key disponível
  for (let i = 1; i <= TOTAL_API_KEYS; i++) {
    const nextKey = await getApiKey(supabase, i);
    if (nextKey) {
      apiKey = nextKey;
      console.log(`[API] Key #${keyIndex} não encontrada, usando key #${i}`);
      break;
    }
  }
  
  if (!apiKey) {
    throw new Error(`Nenhuma API key disponível`);
  }
}
```

---

## 🟠 PROBLEMA #8: Overpass API Pode Retornar JSON Inválido

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-overpass-coordinates/index.ts` (linhas 100-101)

**Problema:**
Se Overpass API retornar HTML de erro ou JSON malformado, `response.json()` lança exceção não tratada.

**Cenário de Falha:**
1. Overpass API retorna HTML: `<html><body>Error 500</body></html>`
2. `await response.json()` lança exceção
3. Erro não é tratado → função retorna erro genérico

**Impacto:**
- Erro não específico
- Dificulta diagnóstico
- Expansão falha sem explicação

**Solução:**
```typescript
const data = await response.json().catch(async (jsonError) => {
  const text = await response.text();
  console.error(`[Overpass] Resposta não é JSON válido:`, text.substring(0, 200));
  throw new Error(`Overpass API retornou resposta inválida: ${response.status} ${response.statusText}`);
});
```

---

## 🟠 PROBLEMA #9: Estado Não Normalizado Pode Causar Query Overpass Incorreta

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-overpass-coordinates/index.ts` (linhas 40-44)

**Problema:**
`parseLocation` extrai estado como `parts[1]?.toUpperCase()`, mas se estado vier como "São Paulo" (nome completo), não será normalizado para "SP".

**Cenário de Falha:**
1. Location: `"São Paulo, São Paulo"` (cidade e estado com mesmo nome)
2. `parseLocation` extrai: `state = "SÃO PAULO"` (não "SP")
3. Query Overpass busca: `["addr:state"="SÃO PAULO"]` → pode não encontrar nada

**Impacto:**
- Query Overpass pode não retornar resultados
- Expansão falha silenciosamente

**Solução:**
```typescript
function parseLocation(location: string): { city: string; state: string } {
  const parts = location.split(',').map(p => p.trim());
  const city = parts[0] || location;
  let state = parts[1]?.toUpperCase() || '';
  
  // V16 FIX: Normalizar estado para sigla se possível
  const STATE_NAME_TO_CODE: Record<string, string> = {
    'SÃO PAULO': 'SP',
    'RIO DE JANEIRO': 'RJ',
    'MINAS GERAIS': 'MG',
    // ... outros estados
  };
  
  if (STATE_NAME_TO_CODE[state]) {
    state = STATE_NAME_TO_CODE[state];
  }
  
  return { city, state };
}
```

---

## 🟠 PROBLEMA #10: Fallback de Incremento Não Incrementa Realmente

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linha 822)

**Problema:**
Fallback apenas lê valor atual, não incrementa. Se RPC falhar, contagem não aumenta.

**Cenário de Falha:**
1. RPC `increment_segmented_searches_completed` falha
2. Fallback lê `completed = 5`
3. Fallback usa `completed = 5` (não incrementa!)
4. Contagem nunca aumenta → extração nunca finaliza

**Impacto:**
- Contagem não aumenta
- Finalização nunca acontece
- Extração travada

**Solução:**
```typescript
// Já está implementado corretamente! ✅
// Fallback apenas lê valor atual (que já foi incrementado pela função SQL antes de falhar)
// Mas se função SQL nunca executou, fallback precisa incrementar manualmente:

if (incrementError) {
  console.error(`[V16 SEGMENTATION] Erro ao incrementar contador:`, incrementError);
  
  // V16 FIX: Tentar UPDATE manual com incremento
  const { error: updateError } = await supabase
    .from('lead_extraction_runs')
    .update({
      progress_data: sql`jsonb_set(
        progress_data,
        '{segmented_searches_completed}',
        to_jsonb((COALESCE(progress_data->>'segmented_searches_completed', '0')::int + 1)::text)
      )`
    })
    .eq('id', run_id);
  
  if (updateError) {
    // Último recurso: ler e incrementar localmente (ainda pode ter race condition)
    const { data: fallbackData } = await supabase
      .from('lead_extraction_runs')
      .select('progress_data')
      .eq('id', run_id)
      .single();
    segmentedSearchesCompleted = (fallbackData?.progress_data?.segmented_searches_completed || 0) + 1;
  }
}
```

---

## 🟠 PROBLEMA #11: Mensagens Perdidas em Buscas Segmentadas Não São Detectadas

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linhas 899-902)

**Problema:**
Sistema detecta mensagens perdidas apenas para compensação (`checkForLostCompensationMessages`), mas não para buscas segmentadas.

**Cenário de Falha:**
1. 20 páginas segmentadas enfileiradas
2. 19 completam, 1 mensagem é perdida/expirada
3. Sistema espera eternamente → extração nunca finaliza

**Impacto:**
- Extrações travadas
- Sem detecção automática
- Necessita intervenção manual

**Solução:**
```typescript
// Implementar função similar para buscas segmentadas
async function checkForLostSegmentedMessages(
  supabase: any,
  runId: string,
  segmentedPagesQueued: number,
  timeoutMinutes: number = 60
): Promise<boolean> {
  // Similar a checkForLostCompensationMessages
  // Verificar se mensagens segmentadas foram perdidas
}
```

---

## 🟠 PROBLEMA #12: Validação de Location Não Cobre Todos os Casos

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linhas 620-625)

**Problema:**
Validação verifica apenas se `location` é string não vazia, mas não valida formato ou conteúdo.

**Cenário de Falha:**
1. Location: `"   ,   ,   "` (apenas vírgulas e espaços)
2. Validação passa (é string não vazia)
3. Sistema processa → erro ou comportamento inesperado

**Impacto:**
- Erros em runtime
- Comportamento inesperado
- Dificulta debugging

**Solução:**
```typescript
// V16 FIX: Validação mais robusta
const locationParts = location.split(',').map(p => p.trim()).filter(p => p.length > 0);
if (locationParts.length === 0) {
  throw new Error('location inválido: deve conter pelo menos cidade ou estado');
}

// Validar se tem pelo menos uma parte relevante (não apenas espaços/vírgulas)
const hasValidContent = locationParts.some(part => part.length > 0 && !/^\s+$/.test(part));
if (!hasValidContent) {
  throw new Error('location inválido: deve conter conteúdo válido (não apenas espaços ou vírgulas)');
}
```

---

## 🟠 PROBLEMA #13: Overpass API Pode Retornar Timeout

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-overpass-coordinates/index.ts` (linhas 81-113)

**Problema:**
Query Overpass tem timeout de 25 segundos, mas se ambos endpoints retornarem timeout, sistema retorna erro genérico sem retry.

**Cenário de Falha:**
1. Query Overpass demora > 25 segundos
2. Endpoint 1 retorna timeout
3. Endpoint 2 retorna timeout
4. Sistema retorna erro → expansão falha

**Impacto:**
- Expansão falha sem retry
- Sem fallback
- Experiência do usuário ruim

**Solução:**
```typescript
// Implementar retry com backoff exponencial
async function queryOverpassAPI(query: string, endpointIndex: number = 0, retryCount: number = 0): Promise<any> {
  const MAX_RETRIES = 3;
  const endpoint = OVERPASS_ENDPOINTS[endpointIndex];
  
  try {
    // ... código existente ...
  } catch (error: any) {
    if (error.message?.includes('timeout') && retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // Backoff exponencial
      console.log(`[Overpass] Timeout, tentando novamente em ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return await queryOverpassAPI(query, endpointIndex, retryCount + 1);
    }
    
    // ... resto do código ...
  }
}
```

---

## 🟠 PROBLEMA #14: Hash de Deduplicação Pode Ter Colisões Teóricas

**Severidade:** 🟠 MODERADO (Baixa Probabilidade)

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linha 678)

**Problema:**
Hash SHA256 de `cid_title_address_lat_lng` pode ter colisões teóricas (extremamente raro, mas possível).

**Cenário de Falha:**
1. Lead A: `cid=123, title="Empresa", address="Rua X", lat=-23.5, lng=-46.6` → Hash: `abc123`
2. Lead B: `cid=456, title="Outra", address="Rua Y", lat=-23.5, lng=-46.6` → Hash: `abc123` (colisão!)
3. Lead B é filtrado como duplicata de Lead A

**Impacto:**
- Extremamente baixo (probabilidade ~0)
- Mas possível teoricamente

**Solução:**
```typescript
// Adicionar workspace_id ao hash para reduzir ainda mais colisões
// Mas constraint UNIQUE já protege, então não é crítico
const hashInput = `${workspace_id}_${place.cid}_${place.title}_${place.address}_${place.latitude}_${place.longitude}`;
```

**Status:** ⚠️ NÃO CRÍTICO (constraint UNIQUE protege, mas pode melhorar)

---

## 🟠 PROBLEMA #15: Processamento Paralelo Pode Sobrecarregar API

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/process-google-maps-queue/index.ts` (linha 82)

**Problema:**
Sistema processa até 5 mensagens simultaneamente (`qty = 5`). Se todas forem para a mesma API key, pode sobrecarregar ou atingir rate limit.

**Cenário de Falha:**
1. 5 mensagens processadas simultaneamente
2. Todas usam mesma API key (ex: páginas 1, 2, 3, 4, 5 → key #1)
3. API key atinge rate limit → todas falham

**Impacto:**
- Rate limit atingido
- Mensagens falham
- Necessita retry manual

**Solução:**
```typescript
// Distribuir mensagens por API keys diferentes
// Ou reduzir qty para 3-4 para evitar sobrecarga
const qty = 3; // Reduzir de 5 para 3
```

---

## 🟠 PROBLEMA #16: Falta Validação de Resposta Overpass

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-overpass-coordinates/index.ts` (linhas 115-205)

**Problema:**
`parseOverpassResponse` assume que `data.elements` é array, mas não valida estrutura antes de iterar.

**Cenário de Falha:**
1. Overpass retorna `{ elements: null }` ou `{ elements: "invalid" }`
2. `for (const element of data.elements)` lança exceção
3. Erro não tratado → função retorna erro genérico

**Impacto:**
- Erro não específico
- Dificulta debugging

**Solução:**
```typescript
if (!data?.elements || !Array.isArray(data.elements)) {
  console.warn(`[Overpass] Resposta inválida: elements não é array`);
  return [];
}
```

---

## 🟠 PROBLEMA #17: Estado Pode Ser Ambíguo em parseLocation

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-overpass-coordinates/index.ts` (linhas 40-44)

**Problema:**
`parseLocation` assume que segunda parte é sempre estado, mas pode ser distrito, bairro, ou outro.

**Cenário de Falha:**
1. Location: `"São Paulo, Centro, SP"`
2. `parseLocation` extrai: `state = "CENTRO"` (ERRADO! Deveria ser "SP")
3. Query Overpass busca estado errado → não encontra resultados

**Impacto:**
- Query Overpass incorreta
- Expansão falha

**Solução:**
```typescript
function parseLocation(location: string): { city: string; state: string } {
  const parts = location.split(',').map(p => p.trim());
  const city = parts[0] || location;
  
  // V16 FIX: Procurar estado conhecido em qualquer parte
  let state = '';
  for (let i = 1; i < parts.length; i++) {
    const partUpper = parts[i].toUpperCase();
    if (BRAZILIAN_STATES[partUpper] || partUpper.length === 2) {
      state = partUpper.length === 2 ? partUpper : BRAZILIAN_STATES[partUpper];
      break;
    }
  }
  
  return { city, state };
}
```

---

## 🟠 PROBLEMA #18: Falta Logging de Erros Detalhado

**Severidade:** 🟠 MODERADO

**Localização:** Vários arquivos

**Problema:**
Alguns erros são logados apenas no console, mas não são salvos em `extraction_logs` para rastreabilidade.

**Cenário:**
1. Erro ocorre em produção
2. Log apenas no console (não persistido)
3. Debugging difícil sem acesso ao console

**Impacto:**
- Dificulta debugging
- Perda de informações importantes

**Solução:**
```typescript
// Sempre logar erros críticos em extraction_logs
await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'error',
  `❌ Erro ao processar página ${page}: ${error.message}`,
  { error: error.message, stack: error.stack, page, ... }
);
```

---

## 🟠 PROBLEMA #19: Validação de Coordenadas Não Cobre Edge Cases

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-overpass-coordinates/index.ts` (linhas 176-181)

**Problema:**
Validação de coordenadas do Brasil usa ranges fixos, mas não cobre casos extremos (ilhas, fronteiras).

**Cenário:**
1. Bairro em ilha brasileira: `lat: -20.5, lng: -29.3` (fora do range atual)
2. Validação filtra → bairro não é retornado

**Impacto:**
- Bairros legítimos podem ser filtrados
- Expansão incompleta

**Solução:**
```typescript
// Usar bounding box mais preciso do Brasil
// Coordenadas válidas: lat -35 a 6, lng -75 a -30 (já está correto)
// Mas pode adicionar exceções para ilhas conhecidas
const BRAZIL_ISLANDS = [
  { lat: -20.5, lng: -29.3, radius: 0.5 }, // Ilha de Trindade
  // ... outras ilhas
];

// Verificar se coordenada está em ilha conhecida
const isInKnownIsland = BRAZIL_ISLANDS.some(island => {
  const distance = Math.sqrt(
    Math.pow(lat - island.lat, 2) + Math.pow(lng - island.lng, 2)
  );
  return distance <= island.radius;
});

if ((lat < -35 || lat > 6 || lng < -75 || lng > -30) && !isInKnownIsland) {
  // Filtrar
}
```

---

## 🟠 PROBLEMA #20: Falta Validação de Target Quantity

**Severidade:** 🟠 MODERADO

**Localização:** `supabase/functions/fetch-google-maps/index.ts` (linha 794)

**Problema:**
`target_quantity` pode ser `null`, `undefined`, `0`, ou negativo, causando cálculos incorretos.

**Cenário de Falha:**
1. `target_quantity = 0` ou `null`
2. Cálculo: `percentage = (totalCreated / 0) * 100` → `Infinity` ou erro
3. Sistema comporta-se incorretamente

**Impacto:**
- Cálculos incorretos
- Comportamento inesperado
- Divisão por zero

**Solução:**
```typescript
const targetQty = Math.max(1, target_quantity || runData.target_quantity || 30);
if (targetQty <= 0) {
  throw new Error(`target_quantity inválido: ${targetQty} (deve ser > 0)`);
}
```

---

## 📊 RESUMO DAS PROBABILIDADES DE ERROS

| # | Problema | Severidade | Status | Prioridade |
|---|----------|------------|--------|------------|
| 1 | Fallback incremento race condition | 🔴 Crítica | ⚠️ Requer correção | ALTA |
| 2 | Overpass retorna vazio silenciosamente | 🔴 Crítica | ⚠️ Requer correção | ALTA |
| 3 | Enfileiramento parcial | 🟡 Grave | ✅ Já corrigido | - |
| 4 | Validação coordenadas | 🟡 Grave | ⚠️ Requer correção | MÉDIA |
| 5 | Timeout buscas segmentadas | 🟡 Grave | ⚠️ Requer correção | MÉDIA |
| 6 | Deduplicação workspace | 🟠 Moderado | ✅ Não é problema | - |
| 7 | API key null | 🟠 Moderado | ⚠️ Requer correção | MÉDIA |
| 8 | Overpass JSON inválido | 🟠 Moderado | ⚠️ Requer correção | BAIXA |
| 9 | Estado não normalizado | 🟠 Moderado | ⚠️ Requer correção | MÉDIA |
| 10 | Fallback não incrementa | 🟠 Moderado | ⚠️ Requer correção | MÉDIA |
| 11 | Mensagens perdidas segmentadas | 🟠 Moderado | ⚠️ Requer correção | MÉDIA |
| 12 | Validação location | 🟠 Moderado | ⚠️ Requer correção | BAIXA |
| 13 | Overpass timeout | 🟠 Moderado | ⚠️ Requer correção | BAIXA |
| 14 | Hash colisões | 🟠 Moderado | ⚠️ Melhoria | BAIXA |
| 15 | Processamento paralelo | 🟠 Moderado | ⚠️ Requer correção | BAIXA |
| 16 | Validação resposta Overpass | 🟠 Moderado | ⚠️ Requer correção | BAIXA |
| 17 | Estado ambíguo | 🟠 Moderado | ⚠️ Requer correção | MÉDIA |
| 18 | Logging erros | 🟠 Moderado | ⚠️ Melhoria | BAIXA |
| 19 | Coordenadas edge cases | 🟠 Moderado | ⚠️ Melhoria | BAIXA |
| 20 | Validação target quantity | 🟠 Moderado | ⚠️ Requer correção | BAIXA |

---

## 🎯 PRIORIDADES DE CORREÇÃO

### **ALTA PRIORIDADE (Críticas):**
1. ✅ **Problema #1:** Fallback incremento race condition
2. ✅ **Problema #2:** Overpass retorna vazio silenciosamente

### **MÉDIA PRIORIDADE (Graves):**
3. ✅ **Problema #4:** Validação coordenadas
4. ✅ **Problema #5:** Timeout buscas segmentadas
5. ✅ **Problema #7:** API key null
6. ✅ **Problema #9:** Estado não normalizado
7. ✅ **Problema #10:** Fallback não incrementa
8. ✅ **Problema #11:** Mensagens perdidas segmentadas
9. ✅ **Problema #17:** Estado ambíguo

### **BAIXA PRIORIDADE (Melhorias):**
10. ✅ **Problema #8:** Overpass JSON inválido
11. ✅ **Problema #12:** Validação location
12. ✅ **Problema #13:** Overpass timeout
13. ✅ **Problema #14:** Hash colisões
14. ✅ **Problema #15:** Processamento paralelo
15. ✅ **Problema #16:** Validação resposta Overpass
16. ✅ **Problema #18:** Logging erros
17. ✅ **Problema #19:** Coordenadas edge cases
18. ✅ **Problema #20:** Validação target quantity

---

## ✅ CONCLUSÃO

**Total de Problemas Identificados:** 20

**Distribuição:**
- 🔴 Críticos: 2
- 🟡 Graves: 3
- 🟠 Moderados: 15

**Status:**
- ✅ Já Corrigidos: 2
- ⚠️ Requerem Correção: 18

**Recomendação:**
Corrigir problemas de **ALTA** e **MÉDIA** prioridade antes do deploy para garantir máxima estabilidade.

Sistema está **robusto**, mas essas correções adicionais aumentarão ainda mais a confiabilidade e resiliência.

