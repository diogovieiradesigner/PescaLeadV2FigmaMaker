# Plano de Testes para Diagnóstico do Problema CNPJ

## Objetivo
Identificar a causa raiz do problema de extração CNPJ que está retornando 0 empresas.

## Hipóteses a Testar

### 1. Filtros de situação cadastral conflitantes
**Teste**: Verificar se os filtros de situação estão sendo corrigidos automaticamente
**Logs necessários**:
- Log dos filtros recebidos no start-cnpj-extraction
- Log dos filtros corrigidos antes da chamada à API
- Log da resposta da API CNPJ com detalhes dos filtros aplicados

**Código a modificar**:
```typescript
// Em start-cnpj-extraction/index.ts, linha 384-405
console.log('[start-cnpj-extraction] Filtros originais:', JSON.stringify(filters.situacao));
console.log('[start-cnpj-extraction] Filtros corrigidos:', JSON.stringify(situacaoCorrigida));
```

### 2. Parsing de localização inadequado
**Teste**: Verificar se a localização "Joao Pessoa, Paraiba, Brazil" está sendo parseada corretamente
**Logs necessários**:
- Log da localização original recebida
- Log da UF extraída
- Log do município extraído
- Log da query SQL gerada

**Código a modificar**:
```typescript
// Em search.ts, linha 410
console.log('📍 [LOCALIZACAO] Localização original:', filters.localizacao);
console.log('📍 [LOCALIZACAO] UF extraída:', parsedUf);
console.log('📍 [LOCALIZACAO] Município extraído:', parsedMunicipio);
```

### 3. Filtros de porte e capital social incompatíveis
**Teste**: Verificar combinações de porte + capital social
**Logs necessários**:
- Log dos portes selecionados
- Log das faixas de capital social
- Log de validações de compatibilidade

**Código a modificar**:
```typescript
// Em search.ts, linha 262-287
console.log('💰 [VALIDACAO] Portes selecionados:', filters.porte);
console.log('💰 [VALIDACAO] Capital min/max:', filters.capital_social_min, filters.capital_social_max);
console.log('💰 [VALIDACAO] Incompatibilidades detectadas:', incompatibilities);
```

### 4. Filtros de CNAE muito específicos
**Teste**: Verificar se o código CNAE 5611201 existe na base
**Logs necessários**:
- Log do código CNAE buscado
- Log da contagem de empresas com esse CNAE
- Log da query SQL de contagem

**Código a modificar**:
```typescript
// Em search.ts, linha 466-470
console.log('🏭 [CNAE] Código CNAE buscado:', filters.cnae);
console.log('🏭 [CNAE] Query SQL gerada:', sql);
```

### 5. Filtros de regime tributário conflitantes
**Teste**: Verificar combinações MEI + Simples
**Logs necessários**:
- Log dos filtros de regime tributário
- Log de validações de compatibilidade

**Código a modificar**:
```typescript
// Em search.ts, linha 342-347
console.log('🏛️ [REGIME] Filtros de regime:', { simples: filters.simples, mei: filters.mei });
console.log('🏛️ [REGIME] Validação MEI+Simples:', filters.mei === true && filters.simples === false);
```

## Testes Específicos a Realizar

### Teste 1: Filtros mínimos
```json
{
  "filters": {
    "uf": ["PB"],
    "situacao": ["02"]
  },
  "limit": 10
}
```
**Objetivo**: Verificar se a base retorna resultados com filtros mínimos

### Teste 2: Localização completa
```json
{
  "filters": {
    "localizacao": "Joao Pessoa, Paraiba, Brazil",
    "situacao": ["02"]
  },
  "limit": 10
}
```
**Objetivo**: Testar o parsing de localização

### Teste 3: CNAE específico
```json
{
  "filters": {
    "uf": ["PB"],
    "cnae": ["5611201"],
    "situacao": ["02"]
  },
  "limit": 10
}
```
**Objetivo**: Testar se o CNAE existe na base

### Teste 4: Combinação de filtros problemáticos
```json
{
  "filters": {
    "uf": ["PB"],
    "porte": ["03"],
    "capital_social_min": 5000000,
    "situacao": ["02"]
  },
  "limit": 10
}
```
**Objetivo**: Testar incompatibilidade porte + capital social

### Teste 5: Regime tributário conflitante
```json
{
  "filters": {
    "uf": ["PB"],
    "mei": true,
    "simples": false,
    "situacao": ["02"]
  },
  "limit": 10
}
```
**Objetivo**: Testar combinação logicamente impossível

## Comandos para Teste

### Testar API CNPJ diretamente
```bash
curl -X POST "https://your-domain.supabase.co/functions/v1/cnpj-api/search" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "uf": ["PB"],
      "situacao": ["02"]
    },
    "limit": 10
  }'
```

### Testar stats (contagem)
```bash
curl -X GET "https://your-domain.supabase.co/functions/v1/cnpj-api/stats?uf=PB&situacao=02" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Análise de Logs

### Buscar logs de extração
```sql
SELECT * FROM extraction_logs 
WHERE step_name = 'cnpj_api_call' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Buscar logs de validação avançada
```sql
SELECT * FROM extraction_logs 
WHERE message LIKE '%VALIDACAO%' 
ORDER BY created_at DESC;
```

### Verificar filtros aplicados
```sql
SELECT details->>'filters_applied' as filters 
FROM extraction_logs 
WHERE step_name = 'cnpj_api_call' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Possíveis Soluções

### 1. Melhorar validação de filtros
- Adicionar validação mais robusta antes da chamada à API
- Retornar mensagens de erro mais específicas ao usuário

### 2. Melhorar parsing de localização
- Implementar lógica mais robusta para parsing de localização textual
- Adicionar fallbacks para casos onde UF não é encontrada

### 3. Validar combinações impossíveis
- Bloquear combinações logicamente impossíveis antes da chamada à API
- Sugerir correções ao usuário

### 4. Adicionar fallbacks inteligentes
- Se CNAE específico não retornar resultados, tentar buscar por divisão (2 primeiros dígitos)
- Se localização não for parseada, tentar buscar apenas por UF

## Prioridade de Testes

1. **Alta**: Testar filtros mínimos (Teste 1) - identifica se o problema é na base ou nos filtros
2. **Alta**: Testar parsing de localização (Teste 2) - problema relatado especificamente
3. **Média**: Testar CNAE específico (Teste 3) - código muito específico pode não existir
4. **Média**: Testar combinações impossíveis (Testes 4 e 5) - podem estar bloqueando a busca