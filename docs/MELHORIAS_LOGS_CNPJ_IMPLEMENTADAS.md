# Melhorias Implementadas nos Logs de Extração CNPJ

## Problema Identificado
Os logs de processamento CNPJ não estavam sendo exibidos corretamente na interface. Os logs apareciam de forma crua e básica:

```
10:38:42
start
info
Iniciando extração CNPJ

10:38:44
cnpj_api_call
success
CNPJ API retornou 100 empresas

10:38:44
staging_insert
success
100 empresas inseridas em staging

10:38:55
migrate_batch
info
Batch processado: 50 migrados, 0 falhas

10:39:05
migrate_batch
info
Batch processado: 50 migrados, 0 falhas

10:39:05
complete
success
Extração concluída: 100 leads migrados
```

## Soluções Implementadas

### 1. Correção da Lógica de Filtragem

**Problema**: Os logs CNPJ com step_name `MIGRATE_BATCH` e `STAGING_INSERT` não estavam sendo incluídos na aba "Scraping".

**Solução**: 
- Atualizada a lógica de filtragem na aba `scraping` para incluir logs CNPJ específicos
- Adicionados termos de busca: `migrate_batch`, `staging_insert`, `cnpj_api_call`, `complete`
- Inclusão por `source === 'cnpj'` como fallback

**Arquivo**: `src/components/ExtractionProgress.tsx`

```typescript
// ✅ MELHORIA: Incluir logs específicos do CNPJ
const isCNPJLog = event.step_name && (
  event.step_name.toLowerCase().includes('migrate_batch') ||
  event.step_name.toLowerCase().includes('staging_insert') ||
  event.step_name.toLowerCase().includes('cnpj_api_call') ||
  event.step_name.toLowerCase().includes('complete') ||
  event.source === 'cnpj'
);

return isScrapingPhase || isEnrichmentWithScraping || isCNPJLog;
```

### 2. Inclusão dos Logs CNPJ na Aba "Extração"

**Problema**: Logs CNPJ não apareciam na aba "Extração".

**Solução**:
- Adicionados steps CNPJ aos filtros da aba "extração"
- Incluídos: `cnpj_api_call`, `staging_insert`, `migrate_batch`, `complete`, `start`
- Inclusão por source como alternativa

```typescript
// ✅ Adicionar steps CNPJ
const cnpjSteps = ['cnpj_api_call', 'staging_insert', 'migrate_batch', 'complete', 'start'];

// Combinar todos os steps de extração
const allExtractionSteps = [...googleMapsSteps, ...instagramSteps, ...cnpjSteps];

// ✅ Incluir logs CNPJ por source
const isCNPJSource = event.source === 'cnpj';

return isExtracao || isCNPJSource;
```

### 3. Melhoria Visual dos Logs CNPJ

**Problema**: Logs apareciam de forma básica e sem contexto visual.

**Solução**: Criado componente especializado `CNPJLogCard` com:

#### Componente CNPJLogCard (`src/components/CNPJLogCard.tsx`)
- **Ícones específicos** para cada tipo de step:
  - `cnpj_api_call` → Globe (Azul)
  - `staging_insert` → Building2 (Roxo)
  - `migrate_batch` → ArrowRight (Verde)
  - `complete` → CheckCircle2 (Verde)
  - `start` → Clock (Azul)

- **Badges informativos**:
  - Badge do step com label personalizado
  - Badge do nível (info, success, warning, error)
  - Badge "CNPJ" para identificação da origem

- **Cores temáticas**:
  - Indicador lateral colorido baseado no level
  - Cores específicas para cada tipo de step
  - Suporte completo ao tema escuro/claro

#### Implementação no ExtractionProgress
```typescript
{/* ✅ MELHORIA: Usar componente especializado para logs CNPJ */}
{event.source === 'cnpj' ? (
  <CNPJLogCard
    timestamp={event.timestamp}
    step_name={event.step_name}
    level={event.level}
    message={event.message}
    source={event.source}
    isDark={isDark}
  />
) : (
  <p className={cn("text-sm leading-relaxed pl-0.5", textColor)}>
    {event.message}
  </p>
)}
```

### 4. Contadores de Logs Atualizados

**Problema**: Contadores não refletiam os logs CNPJ incluídos.

**Solução**: Atualizada a lógica de contagem para incluir steps CNPJ.

## Resultado Final

### Antes:
```
10:38:42 | start | info | Iniciando extração CNPJ
10:38:44 | cnpj_api_call | success | CNPJ API retornou 100 empresas
```

### Depois:
```
10:38:42 | start | info | Iniciando extração CNPJ
        🔵 Início | CNPJ

10:38:44 | cnpj_api_call | success | CNPJ API retornou 100 empresas  
        🌍 API CNPJ | CNPJ

10:38:44 | staging_insert | success | 100 empresas inseridas em staging
        🏢 Inserção em Staging | CNPJ

10:38:55 | migrate_batch | info | Batch processado: 50 migrados, 0 falhas
        ➡️ Migração em Batch | CNPJ

10:39:05 | complete | success | Extração concluída: 100 leads migrados
        ✅ Conclusão | CNPJ
```

## Benefícios Implementados

1. **Visibilidade**: Logs CNPJ agora aparecem em todas as abas relevantes (Todos, Extração, Scraping)
2. **Identificação Visual**: Ícones e cores específicas facilitam a identificação rápida
3. **Contexto**: Badges e labels fornecem contexto sobre cada etapa
4. **Organização**: Separação clara entre diferentes tipos de logs
5. **Usabilidade**: Interface mais informativa e profissional

## Arquivos Modificados

1. **`src/components/ExtractionProgress.tsx`**
   - Lógica de filtragem atualizada
   - Componente CNPJLogCard importado
   - Implementação do novo layout de logs

2. **`src/components/CNPJLogCard.tsx`** (Novo)
   - Componente especializado para logs CNPJ
   - Ícones, cores e badges temáticas
   - Suporte a tema escuro/claro

## Compatibilidade

- ✅ Mantém compatibilidade com logs existentes (Google Maps, Instagram)
- ✅ Não quebra funcionalidades existentes
- ✅ Suporte completo a tema escuro/claro
- ✅ Responsivo para diferentes tamanhos de tela

## Teste de Validação

Para validar as melhorias:

1. Executar uma extração CNPJ
2. Verificar se os logs aparecem na aba "Scraping"
3. Verificar se os logs aparecem na aba "Extração"
4. Confirmar que a formatação visual está correta
5. Testar em modo escuro e claro

---

**Status**: ✅ Implementado e pronto para uso
**Data**: 2025-12-22
**Impacto**: Melhoria significativa na experiência do usuário para extrações CNPJ