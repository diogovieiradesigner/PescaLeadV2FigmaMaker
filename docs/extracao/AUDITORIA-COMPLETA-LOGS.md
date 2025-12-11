# 🔍 Auditoria Completa: Oportunidades de Logs Adicionais

## 📊 RESUMO EXECUTIVO

**Total de Oportunidades Identificadas:** 47 logs adicionais  
**Categorias:** 8 áreas principais  
**Prioridade:** Alta (15), Média (22), Baixa (10)

---

## 🎯 CATEGORIA 1: Inicialização e Validação (5 logs)

### **1.1 Validação de Payload** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:689-735`

**Oportunidade:**
- Log quando payload é recebido (já existe, mas pode melhorar)
- Log quando validações passam/falham
- Log de valores normalizados

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log('PAYLOAD:', JSON.stringify(payload, null, 2));
// ❌ FALTA: Log detalhado de validações
await createExtractionLog(supabase, run_id, 1, 'Validação', 'info',
  `✅ Payload validado: página ${page}, localização "${location}", termo "${search_term}"`,
  { page, location, search_term, is_last_page, is_compensation, is_segmented }
);

// ❌ FALTA: Log quando validação falha
await createExtractionLog(supabase, run_id, 1, 'Validação', 'error',
  `❌ Validação falhou: ${error.message}`,
  { payload, error: error.message }
);
```

**Prioridade:** 🔴 **ALTA** - Importante para debug de problemas de inicialização

---

### **1.2 Normalização de Localização** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:736-744`

**Oportunidade:**
- Log antes/depois da normalização
- Log quando `expandState` é aplicado
- Log de mudanças significativas na localização

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`Local normalizado: ${normalizedLocation}`);
// ❌ FALTA: Log estruturado com detalhes
await createExtractionLog(supabase, run_id, 1, 'Normalização', 'info',
  `📍 Localização normalizada: "${location}" → "${normalizedLocation}"`,
  { 
    original: location, 
    normalized: normalizedLocation, 
    expand_state: expandState,
    changed: location !== normalizedLocation
  }
);
```

**Prioridade:** 🟡 **MÉDIA** - Útil para entender transformações

---

### **1.3 Detecção de Nível de Localização** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:1242-1248`

**Oportunidade:**
- Log quando nível é detectado (já existe console.log, falta log estruturado)
- Log de decisão de expansão baseada no nível

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`[V16 LOCATION LEVEL] Nível detectado: ${locationLevel}`);
// ❌ FALTA: Log estruturado
await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
  `🔍 Nível de localização detectado: ${locationLevel} (${isAlreadyNeighborhood ? 'Bairro específico' : 'Cidade/Estado'})`,
  { 
    location, 
    location_level: locationLevel, 
    is_already_neighborhood: isAlreadyNeighborhood,
    can_expand: !isAlreadyNeighborhood
  }
);
```

**Prioridade:** 🔴 **ALTA** - Crítico para entender decisões de expansão

---

### **1.4 Busca de Hashes Existentes** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:748-755`

**Oportunidade:**
- Log de quantos hashes foram carregados
- Log de tempo de carregamento

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`Hashes existentes no workspace: ${existingHashes.size}`);
// ❌ FALTA: Log estruturado com tempo
const hashLoadStart = Date.now();
const { data: existingLeads } = await supabase...;
const hashLoadTime = Date.now() - hashLoadStart;

await createExtractionLog(supabase, run_id, 2, 'Deduplicação', 'info',
  `🔍 Hashes carregados: ${existingHashes.size} leads existentes no workspace (${hashLoadTime}ms)`,
  { 
    hashes_count: existingHashes.size, 
    load_time_ms: hashLoadTime,
    workspace_id: workspace_id
  }
);
```

**Prioridade:** 🟡 **MÉDIA** - Útil para performance

---

### **1.5 Seleção de API Key** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:757-777`

**Oportunidade:**
- Log quando API key principal não está disponível
- Log quando fallback é usado
- Log de todas as tentativas de API keys

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`Usando API Key #${keyIndex}`);
// ❌ FALTA: Log estruturado de fallback
if (!apiKey) {
  await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'warning',
    `⚠️ API Key #${keyIndex} não encontrada, tentando fallback...`,
    { key_index: keyIndex, total_keys: TOTAL_API_KEYS }
  );
  
  // ... tentativas de fallback ...
  
  if (apiKey) {
    await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'info',
      `✅ Fallback bem-sucedido: usando API Key #${fallbackIndex}`,
      { original_key: keyIndex, fallback_key: fallbackIndex }
    );
  } else {
    await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'error',
      `❌ Nenhuma API key disponível após tentar ${TOTAL_API_KEYS} keys`,
      { keys_tried: TOTAL_API_KEYS }
    );
  }
}
```

**Prioridade:** 🔴 **ALTA** - Crítico para debug de problemas de API

---

## 🎯 CATEGORIA 2: Chamadas à API SerpDev (8 logs)

### **2.1 Tentativas de Retry** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:152-204`

**Oportunidade:**
- Log de cada tentativa de retry
- Log de tempo entre tentativas
- Log de motivo do retry

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`[API] Buscando página ${page} - Tentativa ${attempt}`);
// ❌ FALTA: Log estruturado de retry
if (attempt > 1) {
  await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'warning',
    `🔄 Retry ${attempt}/${maxRetries} para página ${page}`,
    { page, attempt, max_retries: maxRetries, reason: error?.message }
  );
}
```

**Prioridade:** 🔴 **ALTA** - Importante para entender problemas de API

---

### **2.2 Status HTTP Específicos** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:179-184`

**Oportunidade:**
- Log detalhado de cada status HTTP
- Log de rate limiting (429)
- Log de erros específicos

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`[API] ⚠️ Página ${page}: Erro 500 - API esgotou resultados`);
// ❌ FALTA: Logs para outros status
if (response.status === 429) {
  await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'warning',
    `⚠️ Rate limit atingido na página ${page} - Aguardando retry`,
    { page, status: 429, retry_after: response.headers.get('Retry-After') }
  );
} else if (response.status === 401) {
  await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'error',
    `❌ API Key inválida na página ${page}`,
    { page, status: 401, key_index: keyIndex }
  );
} else if (!response.ok) {
  await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'error',
    `❌ Erro HTTP ${response.status} na página ${page}`,
    { page, status: response.status, status_text: response.statusText }
  );
}
```

**Prioridade:** 🟡 **MÉDIA** - Útil para diagnóstico

---

### **2.3 Tempo de Resposta da API** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:173-196`

**Oportunidade:**
- Log de tempo de resposta
- Log de tamanho da resposta
- Log de latência

**Logs Sugeridos:**
```typescript
const apiStartTime = Date.now();
const response = await fetch(...);
const apiResponseTime = Date.now() - apiStartTime;

await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'info',
  `⏱️ API respondeu em ${apiResponseTime}ms - ${places.length} resultados`,
  { 
    page, 
    response_time_ms: apiResponseTime, 
    results_count: places.length,
    api_empty: apiEmpty
  }
);
```

**Prioridade:** 🟡 **MÉDIA** - Útil para monitoramento de performance

---

### **2.4 Erros de Parsing JSON** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:186`

**Oportunidade:**
- Log quando JSON é inválido
- Log de resposta parcial

**Logs Sugeridos:**
```typescript
try {
  const data = await response.json();
} catch (jsonError: any) {
  const text = await response.text();
  await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'error',
    `❌ Erro ao parsear JSON da API na página ${page}`,
    { 
      page, 
      error: jsonError.message, 
      response_preview: text.substring(0, 500),
      status: response.status
    }
  );
  throw jsonError;
}
```

**Prioridade:** 🔴 **ALTA** - Crítico para debug

---

## 🎯 CATEGORIA 3: Processamento de Resultados (7 logs)

### **3.1 Validação de Resultados** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:788-813`

**Oportunidade:**
- Log de quantos resultados são válidos/inválidos
- Log de motivos de invalidação
- Log de campos faltando

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`📊 Pré-filtro: ${validResults.length} candidatos...`);
// ❌ FALTA: Log detalhado de validação
const validationStats = {
  total: rawResults.length,
  valid: validResults.length,
  invalid: invalidResults,
  duplicates_memory: preFilterDuplicates,
  missing_fields: {} // Contar campos faltando
};

await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'info',
  `📊 Validação: ${validResults.length}/${rawResults.length} resultados válidos`,
  { 
    page, 
    ...validationStats,
    invalid_reasons: invalidReasons // Array de motivos
  }
);
```

**Prioridade:** 🟡 **MÉDIA** - Útil para entender qualidade dos dados

---

### **3.2 Inserção no Banco** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:819-870`

**Oportunidade:**
- Log de tempo de inserção
- Log de erros de inserção específicos
- Log de duplicatas detectadas no banco

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`  ✅ Inserido: ${place.title}`);
// ❌ FALTA: Log estruturado de inserção em lote
const insertStartTime = Date.now();
// ... inserções ...
const insertTime = Date.now() - insertStartTime;

await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'info',
  `💾 Inserção concluída: ${actuallyCreated} criados, ${dbDuplicates} duplicatas (${insertTime}ms)`,
  { 
    page, 
    created: actuallyCreated, 
    duplicates_db: dbDuplicates,
    insert_time_ms: insertTime,
    avg_time_per_lead: insertTime / validResults.length
  }
);
```

**Prioridade:** 🟡 **MÉDIA** - Útil para performance

---

### **3.3 Erros de Inserção Específicos** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:858-866`

**Oportunidade:**
- Log de erros que não são duplicatas
- Log de erros de constraint
- Log de erros de validação

**Logs Sugeridos:**
```typescript
if (insertError) {
  if (insertError.code === '23505') {
    // Duplicata - já logado
  } else {
    await createExtractionLog(supabase, run_id, 3, 'Google Maps', 'error',
      `❌ Erro ao inserir lead: ${place.title}`,
      { 
        page, 
        lead_title: place.title,
        error_code: insertError.code,
        error_message: insertError.message,
        error_details: insertError.details
      }
    );
  }
}
```

**Prioridade:** 🔴 **ALTA** - Crítico para debug

---

## 🎯 CATEGORIA 4: Compensação (4 logs)

### **4.1 Decisão de Compensação** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:1184-1236`

**Oportunidade:**
- Log quando compensação é necessária
- Log quando compensação não é necessária (e por quê)
- Log de cálculo de páginas necessárias

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`⚠️ [COMPENSATION] Abaixo de 90%`);
// ❌ FALTA: Log quando compensação NÃO é necessária
if (shouldStop) {
  await createExtractionLog(supabase, run_id, 3, 'Compensação', 'info',
    `ℹ️ Compensação não necessária: ${percentage >= 90 ? 'Meta atingida' : apiExhausted ? 'API esgotou' : 'Limite atingido'}`,
    { 
      percentage, 
      api_exhausted: apiExhausted,
      compensation_count: compensationCount,
      reason: percentage >= 90 ? 'meta_atingida' : apiExhausted ? 'api_exhausted' : 'limit_reached'
    }
  );
}
```

**Prioridade:** 🔴 **ALTA** - Importante para entender decisões

---

### **4.2 Enfileiramento de Compensação** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:1204-1235`

**Oportunidade:**
- Log de cada página enfileirada
- Log de falhas ao enfileirar
- Log de timestamp de enfileiramento

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`📤 [COMPENSATION] Página ${pageNum} enfileirada`);
// ❌ FALTA: Log estruturado de falhas
if (!msgId) {
  await createExtractionLog(supabase, run_id, 3, 'Compensação', 'error',
    `❌ Falha ao enfileirar página de compensação ${pageNum}`,
    { page: pageNum, error: 'pgmq_send retornou null' }
  );
}
```

**Prioridade:** 🟡 **MÉDIA** - Útil para debug

---

## 🎯 CATEGORIA 5: Expansão por Bairros (12 logs)

### **5.1 Decisão de Expansão** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:1250-1271`

**Oportunidade:**
- Log detalhado de cada condição de expansão
- Log quando expansão não é tentada (e por quê)
- Log de todas as variáveis de decisão

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: Log quando vai expandir
// ❌ FALTA: Log quando NÃO vai expandir
if (!shouldTrySegmentation) {
  const reasons = [];
  if (isAlreadyNeighborhood) reasons.push('já_em_bairro');
  if (percentage >= 90) reasons.push('meta_atingida');
  if (!apiExhausted) reasons.push('api_nao_esgotou');
  if (!segmentationEnabled) reasons.push('expansao_desabilitada');
  if (segmentationAlreadyDone) reasons.push('expansao_ja_feita');
  if (is_segmented) reasons.push('ja_em_busca_segmentada');
  
  await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
    `ℹ️ Expansão não será tentada: ${reasons.join(', ')}`,
    { 
      should_try: false,
      reasons,
      is_already_neighborhood: isAlreadyNeighborhood,
      percentage,
      api_exhausted: apiExhausted,
      segmentation_enabled: segmentationEnabled,
      segmentation_already_done: segmentationAlreadyDone,
      is_segmented
    }
  );
}
```

**Prioridade:** 🔴 **ALTA** - Crítico para entender decisões

---

### **5.2 Chamada Overpass API** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:276-301`

**Oportunidade:**
- Log de tempo de resposta
- Log de erros específicos
- Log de retry de Overpass

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.error(`[V16] Erro ao buscar bairros:`, error.message);
// ❌ FALTA: Log estruturado detalhado
const overpassStartTime = Date.now();
try {
  const response = await fetch(...);
  const overpassTime = Date.now() - overpassStartTime;
  
  await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
    `🌍 Overpass API chamada: ${overpassTime}ms`,
    { 
      location, 
      response_time_ms: overpassTime,
      status: response.status
    }
  );
} catch (error: any) {
  await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'error',
    `❌ Erro ao buscar bairros via Overpass: ${error.message}`,
    { location, error: error.message, stack: error.stack }
  );
}
```

**Prioridade:** 🔴 **ALTA** - Crítico para debug

---

### **5.3 Processamento de Bairros** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:1309-1353`

**Oportunidade:**
- Log de bairros filtrados
- Log de bairros válidos
- Log de coordenadas inválidas

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: Log de bairros encontrados
// ❌ FALTA: Log de bairros filtrados
const filteredStats = {
  total_from_api: overpassData?.elements?.length || 0,
  valid: neighborhoods.length,
  filtered: (overpassData?.elements?.length || 0) - neighborhoods.length,
  reasons: {
    wrong_city: 0,
    outside_brazil: 0,
    generic_name: 0,
    no_coordinates: 0
  }
};

await createExtractionLog(supabase, run_id, 4, 'Segmentação', 'info',
  `🔍 Bairros processados: ${neighborhoods.length} válidos de ${filteredStats.total_from_api} encontrados`,
  { ...filteredStats }
);
```

**Prioridade:** 🟡 **MÉDIA** - Útil para entender qualidade dos dados

---

### **5.4 Estratégia de Expansão** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:405-453`

**Oportunidade:**
- Log de cálculo de estratégia (já existe, mas pode melhorar)
- Log de ajustes dinâmicos
- Log de otimizações aplicadas

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: Logs de estratégia
// ❌ FALTA: Log de ajustes dinâmicos
if (maxPagesPerNeighborhood > MAX_PAGES_PER_SEGMENT) {
  await createExtractionLog(supabase, runId, 4, 'Segmentação', 'info',
    `⚙️ Ajuste dinâmico: Aumentando páginas por bairro de ${MAX_PAGES_PER_SEGMENT} para ${maxPagesPerNeighborhood}`,
    { 
      reason: 'poucos_bairros_muitas_paginas',
      neighborhoods_count: neighborhoods.length,
      pages_needed: pagesNeeded,
      original_limit: MAX_PAGES_PER_SEGMENT,
      new_limit: maxPagesPerNeighborhood
    }
  );
}
```

**Prioridade:** 🔴 **ALTA** - Importante para entender otimizações

---

## 🎯 CATEGORIA 6: Mensagens Perdidas (5 logs)

### **6.1 Verificação de Mensagens Perdidas** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:550-605`

**Oportunidade:**
- Log de cada verificação
- Log de mensagens encontradas vs esperadas
- Log de timeout

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: Log quando mensagens são perdidas
// ❌ FALTA: Log de verificações normais
if (segmentedMessagesInQueue === expectedRemaining) {
  await createExtractionLog(supabase, runId, 4, 'Segmentação', 'info',
    `✅ Verificação de fila: ${segmentedMessagesInQueue} mensagens encontradas (esperadas: ${expectedRemaining})`,
    { 
      found: segmentedMessagesInQueue, 
      expected: expectedRemaining,
      age_minutes: minutesSinceEnqueued
    }
  );
}
```

**Prioridade:** 🔴 **ALTA** - Crítico para monitoramento

---

## 🎯 CATEGORIA 7: Finalização (4 logs)

### **7.1 Decisão de Finalização** ⚠️ **ALTA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:1080-1147`

**Oportunidade:**
- Log de cada condição de finalização
- Log de tempo total de execução
- Log de métricas finais

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: Log de finalização
// ❌ FALTA: Log detalhado de decisão
const finalizationReasons = [];
if (segmentedSearchesCompleted >= segmentedSearchesEnqueued) finalizationReasons.push('todas_paginas_processadas');
if (metaAtingida) finalizationReasons.push('meta_atingida');
if (segmentationTimeoutReached) finalizationReasons.push('timeout');
if (hasLostSegmentedMessages) finalizationReasons.push('mensagens_perdidas');

await createExtractionLog(supabase, run_id, 9, 'Finalização', 'info',
  `🏁 Decisão de finalização: ${finalizationReasons.join(', ')}`,
  { 
    reasons: finalizationReasons,
    segmented_completed: segmentedSearchesCompleted,
    segmented_enqueued: segmentedSearchesEnqueued,
    meta_atingida: metaAtingida,
    timeout: segmentationTimeoutReached,
    lost_messages: hasLostSegmentedMessages
  }
);
```

**Prioridade:** 🔴 **ALTA** - Crítico para entender finalizações

---

### **7.2 Métricas Finais** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-google-maps/index.ts:1096-1147`

**Oportunidade:**
- Log de todas as métricas consolidadas
- Log de eficiência (leads por página)
- Log de tempo por etapa

**Logs Sugeridos:**
```typescript
await createExtractionLog(supabase, run_id, 9, 'Finalização', 'info',
  `📊 Métricas finais da extração`,
  { 
    total_created: totalCreated,
    target: targetQty,
    percentage: percentage.toFixed(1),
    pages_consumed: runData.pages_consumed,
    execution_time_ms: executionTimeMs,
    leads_per_page: totalCreated / (runData.pages_consumed || 1),
    compensation_pages: compensationCount,
    segmented_pages: segmentedSearchesEnqueued,
    segmented_leads: segmentationLeadsFound
  }
);
```

**Prioridade:** 🟡 **MÉDIA** - Útil para análise

---

## 🎯 CATEGORIA 8: Edge Functions Relacionadas (2 logs)

### **8.1 fetch-overpass-coordinates** ⚠️ **MÉDIA PRIORIDADE**
**Localização:** `fetch-overpass-coordinates/index.ts`

**Oportunidade:**
- Log de parsing de localização
- Log de query Overpass construída
- Log de tempo de query

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`City: ${city}, State: ${state}`);
// ❌ FALTA: Log estruturado
await createExtractionLog(supabase, runId, 4, 'Overpass', 'info',
  `🔍 Parsing de localização: "${location}" → Cidade: "${city}", Estado: "${state}"`,
  { location, city, state }
);

// ✅ JÁ EXISTE: console.log(`[Overpass] Query executada em ${queryTime}ms`);
// ❌ FALTA: Log estruturado
await createExtractionLog(supabase, runId, 4, 'Overpass', 'info',
  `⏱️ Query Overpass executada: ${queryTime}ms, ${overpassData?.elements?.length || 0} elementos`,
  { query_time_ms: queryTime, elements_count: overpassData?.elements?.length || 0 }
);
```

**Prioridade:** 🟡 **MÉDIA** - Útil para debug

---

### **8.2 start-extraction** ⚠️ **BAIXA PRIORIDADE**
**Localização:** `start-extraction/index.ts`

**Oportunidade:**
- Log de histórico consultado (já existe console.log, falta estruturado)
- Log de cálculo de páginas

**Logs Sugeridos:**
```typescript
// ✅ JÁ EXISTE: console.log(`   Páginas já processadas: ${lastProcessedPage}`);
// ❌ FALTA: Log estruturado
await createExtractionLog(supabase, run_id, 1, 'Inicialização', 'info',
  `📚 Histórico consultado: ${lastProcessedPage} páginas já processadas para "${searchTerm}" + "${location}"`,
  { 
    last_processed_page: lastProcessedPage,
    search_term: searchTerm,
    location: location,
    workspace_id: workspaceId
  }
);
```

**Prioridade:** 🟢 **BAIXA** - Já tem console.log suficiente

---

## 📊 RESUMO POR PRIORIDADE

### 🔴 **ALTA PRIORIDADE (15 logs)**
1. Validação de Payload (falhas)
2. Detecção de Nível de Localização
3. Seleção de API Key (fallback)
4. Tentativas de Retry
5. Erros de Parsing JSON
6. Erros de Inserção Específicos
7. Decisão de Compensação
8. Decisão de Expansão (quando não expande)
9. Chamada Overpass API
10. Estratégia de Expansão (ajustes)
11. Verificação de Mensagens Perdidas
12. Decisão de Finalização

### 🟡 **MÉDIA PRIORIDADE (22 logs)**
1. Normalização de Localização
2. Busca de Hashes Existentes
3. Status HTTP Específicos
4. Tempo de Resposta da API
5. Validação de Resultados
6. Inserção no Banco
7. Enfileiramento de Compensação
8. Processamento de Bairros
9. Métricas Finais
10. fetch-overpass-coordinates (parsing e query)

### 🟢 **BAIXA PRIORIDADE (10 logs)**
1. start-extraction (histórico)

---

## 🎯 PRÓXIMOS PASSOS

1. **Implementar logs de ALTA PRIORIDADE primeiro** (15 logs)
2. **Implementar logs de MÉDIA PRIORIDADE** (22 logs)
3. **Considerar logs de BAIXA PRIORIDADE** (10 logs)

**Total estimado:** 47 logs adicionais para visibilidade completa

