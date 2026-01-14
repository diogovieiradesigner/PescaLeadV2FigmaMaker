# Documento Técnico: Implementação de Filtros na Tabela Principal de Extração

## 1. Descrição Geral da Tarefa

Esta tarefa visa implementar um sistema de filtros na tabela principal de extração de leads, permitindo que os usuários visualizem e gerenciem os filtros aplicados em cada extração realizada. O objetivo é melhorar a experiência do usuário ao fornecer uma visualização clara dos parâmetros utilizados nas extrações.

## 2. Contexto do Projeto

O projeto é uma aplicação de extração de leads que possui três tipos de extração:
- **Google Maps**: Extração de estabelecimentos comerciais
- **CNPJ**: Extração de empresas por CNPJ
- **Instagram**: Extração de perfis do Instagram

A aplicação possui uma tabela principal que exibe o histórico das extrações realizadas, mostrando informações como data/hora, nome da extração, filtros aplicados, quantidade de leads extraídos, status e páginas consumidas.

## 3. Problema Atual Identificado

### 3.1 Problema de Sintaxe Crítico
O arquivo `src/components/ExtractionView.tsx` apresenta erros de sintaxe que impedem a compilação:

```typescript
// ERRO: Variáveis duplicadas
const [filtersModalOpen, setFiltersModalOpen] = useState(false); // Linha 70
const [selectedFilters, setSelectedFilters] = useState<ExtractionFilters | null>(null); // Linha 71

// ERRO: Declaração duplicada nas linhas 132-133
const [filtersModalOpen, setFiltersModalOpen] = useState(false); // Linha 132
const [selectedFilters, setSelectedFilters] = useState<ExtractionFilters | null>(null); // Linha 133
```

### 3.2 Variáveis Não Declaradas
Múltiplas variáveis estão sendo utilizadas sem serem declaradas:
- `setSelectedExtractionId`, `selectedExtractionId`
- `funnelId`, `setFunnelId`
- `columns`, `setColumns`
- `columnId`, `setColumnId`
- `loadingFunnels`, `setLoadingFunnels`
- `funnels`, `setFunnels`
- `requireWebsite`, `setRequireWebsite`
- `requirePhone`, `setRequirePhone`
- `requireEmail`, `setRequireEmail`
- `minReviews`, `setMinReviews`
- `minRating`, `setMinRating`
- `expandToState`, `setExpandToState`
- `isActive`, `setIsActive`
- `extractionName`, `setExtractionName`
- `searchTerm`, `setSearchTerm`
- `location`, `setLocation`
- `isLocationValid`, `setIsLocationValid`
- `niche`, `setNiche`
- `dailyQuantity`, `setDailyQuantity`
- `extractionTime`, `setExtractionTime`
- `saving`, `setSaving`
- `executing`, `setExecuting`
- E muitas outras...

### 3.3 Import de Dependência Incorreto
```typescript
import { toast } from 'sonner@2.0.3'; // ERRO: Versão específica no import
```

## 4. Campos de Filtros Disponíveis

Os filtros implementados no sistema incluem:

### 4.1 Parâmetros de Busca
- **Termo de Busca** (`search_term`): O que o usuário está procurando
- **Localização** (`location`): Local onde buscar
- **Nicho** (`niche`): Categoria específica do negócio

### 4.2 Requisitos de Contato
- **Website** (`require_website`): Boolean - se o estabelecimento deve ter website
- **Telefone** (`require_phone`): Boolean - se o estabelecimento deve ter telefone
- **Email** (`require_email`): Boolean - se o estabelecimento deve ter email

### 4.3 Critérios de Qualidade
- **Mínimo de Avaliações** (`min_reviews`): Número mínimo de reviews
- **Avaliação Mínima** (`min_rating`): Nota mínima (0-5 estrelas)
- **Expandir para Estado** (`expand_state_search`): Boolean - expandir busca para todo o estado

### 4.4 Configurações Avançadas
- **Prompt Personalizado** (`prompt`): Instruções específicas para a extração
- **Filtros JSON** (`filters_json`): Configurações adicionais em formato JSON
- **Filtros Aplicados** (`filters_applied`): Filtros que foram efetivamente aplicados

## 5. Tarefa Específica a Ser Implementada

### 5.1 Funcionalidade de Visualização de Filtros
- Exibir resumo dos filtros na coluna "Filtros" da tabela
- Modal detalhado com todos os filtros aplicados
- Botão "Ver todos" para abrir o modal completo

### 5.2 Componente FiltersModal
Já foi criado o componente `src/components/FiltersModal.tsx` que:
- Exibe todos os filtros de forma organizada
- Suporta tema claro/escuro
- Formata diferentes tipos de dados (boolean, number, string, JSON)
- Interface responsiva e acessível

## 6. Especificações de UI

### 6.1 Visualização na Tabela
```typescript
// Exemplo de como os filtros aparecem na tabela
<td className="px-6 py-4">
  <div className="flex flex-wrap gap-1">
    {item.niche && (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
        {item.niche}
      </span>
    )}
    {item.require_website && (
      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
        🌐 Website
      </span>
    )}
    {/* Mais badges de filtros */}
    <button className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200">
      Ver todos
    </button>
  </div>
</td>
```

### 6.2 Modal de Detalhes
- **Cabeçalho**: Título "Detalhes dos Filtros" com botão de fechar
- **Seções Organizadas**:
  - 🔍 Parâmetros de Busca
  - 📞 Requisitos de Contato
  - ⭐ Critérios de Qualidade
  - ✏️ Prompt Personalizado
  - 🔧 Filtros Adicionais
- **Rodapé**: Botão "Fechar"

## 7. Componentes a Serem Modificados

### 7.1 Arquivos Principais
- **`src/components/ExtractionView.tsx`** - Componente principal (REQUER CORREÇÃO)
- **`src/components/FiltersModal.tsx`** - Modal de filtros (✅ CONCLUÍDO)

### 7.2 Estados Necessários
```typescript
// Estados para controle do modal de filtros
const [filtersModalOpen, setFiltersModalOpen] = useState(false);
const [selectedFilters, setSelectedFilters] = useState<ExtractionFilters | null>(null);

// Estados para dados do formulário Google Maps
const [extractionName, setExtractionName] = useState('');
const [searchTerm, setSearchTerm] = useState('');
const [location, setLocation] = useState('');
const [isLocationValid, setIsLocationValid] = useState(false);
// ... outros estados
```

## 8. Instruções Importantes

### 8.1 Correção Imediata Necessária
1. **Remover declarações duplicadas** de `filtersModalOpen` e `selectedFilters`
2. **Declarar todas as variáveis** que estão sendo utilizadas
3. **Corrigir o import** do toast para `import { toast } from 'sonner'`
4. **Validar a estrutura** do componente

### 8.2 Estrutura de Estados
O componente precisa de uma estrutura de estados bem organizada:

```typescript
// Estados para controle do modal de filtros (UMA ÚNICA DECLARAÇÃO)
const [filtersModalOpen, setFiltersModalOpen] = useState(false);
const [selectedFilters, setSelectedFilters] = useState<ExtractionFilters | null>(null);

// Estados para dados do formulário Google Maps
const [googleMapsData, setGoogleMapsData] = useState({
  extractionName: '',
  searchTerm: '',
  location: '',
  isLocationValid: false,
  niche: '',
  isActive: false,
  dailyQuantity: 50,
  extractionTime: '14:30'
});

// Estados para filtros específicos
const [requireWebsite, setRequireWebsite] = useState(false);
const [requirePhone, setRequirePhone] = useState(false);
const [requireEmail, setRequireEmail] = useState(false);
const [minReviews, setMinReviews] = useState(0);
const [minRating, setMinRating] = useState(0);
const [expandToState, setExpandToState] = useState(false);

// Estados para funnels e colunas
const [funnels, setFunnels] = useState<Funnel[]>([]);
const [columns, setColumns] = useState<FunnelColumn[]>([]);
const [funnelId, setFunnelId] = useState('');
const [columnId, setColumnId] = useState('');
const [loadingFunnels, setLoadingFunnels] = useState(false);

// Estados para controle de UI
const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
const [saving, setSaving] = useState(false);
const [executing, setExecuting] = useState<string | null>(null);
```

### 8.3 Função de Abrir Modal
```typescript
const openFiltersModal = (filters: ExtractionFilters) => {
  setSelectedFilters(filters);
  setFiltersModalOpen(true);
};
```

## 9. Resultado Esperado

### 9.1 Funcionalidade Completa
- ✅ Modal de filtros criado e funcional
- ❌ Integração na tabela principal (BLOQUEADO por erro de sintaxe)
- ❌ Visualização de badges de filtros na tabela
- ❌ Botão "Ver todos" funcionando

### 9.2 Experiência do Usuário
1. **Tabela Informativa**: Usuário vê resumo dos filtros principais em badges coloridos
2. **Detalhes Completos**: Modal fornece visão completa de todos os parâmetros
3. **Interface Intuitiva**: Cores e ícones ajudam na identificação rápida
4. **Responsividade**: Funciona bem em diferentes tamanhos de tela

## 10. Status Atual da Implementação

### 10.1 ✅ Concluído
- [x] Componente `FiltersModal.tsx` criado
- [x] Interface do modal implementada
- [x] Suporte a tema claro/escuro
- [x] Formatação de diferentes tipos de dados
- [x] Estrutura de dados `ExtractionFilters` definida

### 10.2 ❌ Pendente/Bloqueado
- [ ] Correção do erro de sintaxe no `ExtractionView.tsx`
- [ ] Declaração de todas as variáveis necessárias
- [ ] Integração do modal na tabela principal
- [ ] Implementação dos badges de filtros
- [ ] Testes de funcionalidade
- [ ] Validação em diferentes cenários

### 10.3 🚫 Problemas Críticos
- **Compilação Falha**: Erros de TypeScript impedem build
- **Variáveis Duplicadas**: Redeclaração causa erro
- **Variáveis Não Declaradas**: Múltiplas referências sem declaração
- **Import Incorreto**: Dependência com versão específica

## 11. Arquivos Envolvidos

### 11.1 Arquivos Principais
```
src/
├── components/
│   ├── ExtractionView.tsx          # ❌ REQUER CORREÇÃO
│   ├── FiltersModal.tsx            # ✅ CONCLUÍDO
│   └── ui/                         # Componentes de UI
├── hooks/
│   └── useExtractionData.ts        # Hook para dados de extração
├── contexts/
│   └── AuthContext.tsx             # Contexto de autenticação
├── utils/
│   └── supabase/
│       └── client.ts               # Cliente Supabase
└── types/                          # Definições de tipos
```

### 11.2 Dependências
```json
{
  "sonner": "^2.0.3",              # Para notificações toast
  "lucide-react": "^latest",        # Para ícones
  "react": "^18.x",                # Framework principal
  "typescript": "^5.x",            # Suporte a tipos
  "tailwindcss": "^3.x"            # Estilização
}
```

## 12. Possíveis Desafios ou Considerações Técnicas

### 12.1 Desafios de Integração
1. **Estado Complexo**: Múltiplos estados para diferentes tipos de extração
2. **Sincronização**: Manter estados sincronizados entre componentes
3. **Performance**: Evitar re-renders desnecessários
4. **Validação**: Validar dados antes de enviar para o modal

### 12.2 Considerações de UX
1. **Performance**: Modal deve abrir rapidamente
2. **Acessibilidade**: Suporte a teclado e screen readers
3. **Responsividade**: Funcionar bem em mobile
4. **Feedback Visual**: Estados de loading e sucesso

### 12.3 Considerações de Dados
1. **Tamanho do JSON**: Filtros complexos podem ser grandes
2. **Formatação**: Diferentes tipos de dados precisam formatação adequada
3. **Validação**: Verificar integridade dos dados antes de exibir
4. **Fallbacks**: Tratar casos onde dados estão incompletos

### 12.4 Considerações de Manutenibilidade
1. **Separação de Concerns**: Manter lógica de filtros separada
2. **Reutilização**: Componente modal pode ser usado em outros lugares
3. **Testes**: Implementar testes unitários para o modal
4. **Documentação**: Manter documentação atualizada

## 13. Próximos Passos

### 13.1 Correção Imediata (Prioridade Alta)
1. Corrigir erro de sintaxe no `ExtractionView.tsx`
2. Declarar todas as variáveis necessárias
3. Validar compilação TypeScript
4. Testar funcionalidade básica

### 13.2 Implementação (Prioridade Média)
1. Integrar modal na tabela principal
2. Implementar badges de filtros
3. Adicionar tratamento de erros
4. Otimizar performance

### 13.3 Melhorias (Prioridade Baixa)
1. Adicionar animações
2. Implementar filtros avançados
3. Adicionar exportação de filtros
4. Melhorar acessibilidade

## 14. Conclusão

A implementação dos filtros na tabela de extração está parcialmente concluída, com o componente `FiltersModal` já desenvolvido e funcional. However, a integração está bloqueada por erros de sintaxe no componente principal que precisam ser corrigidos urgentemente.

O trabalho foi interrompido devido a problemas técnicos, mas a estrutura base está sólida e a continuação do desenvolvimento é viável após as correções necessárias.

---

**Data de Criação**: 23/12/2025  
**Versão**: 1.0  
**Status**: Em Desenvolvimento - Bloqueado por Erros de Sintaxe