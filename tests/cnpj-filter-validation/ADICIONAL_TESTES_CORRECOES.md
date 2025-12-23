# Testes Adicionais para Validação das Correções de Filtros CNPJ

## Objetivo
Validar especificamente as correções implementadas para resolver problemas com parsing de localização, especialmente casos onde município tem o mesmo nome do estado.

## Casos de Teste Adicionais

### 1. Parsing de Localização Corrigido

#### Caso 1.1: "Paraiba, Paraiba, Brazil"
- **Entrada**: `localizacao: "Paraiba, Paraiba, Brazil"`
- **Resultado Esperado**: 
  - `uf: "PB"`
  - `municipio_nome: "Paraiba"`
- **Justificativa**: Caso especial onde município tem o mesmo nome do estado

#### Caso 1.2: "CNPJ - Joao Pessoa, Paraiba, Brazil"
- **Entrada**: `localizacao: "CNPJ - Joao Pessoa, Paraiba, Brazil"`
- **Resultado Esperado**: 
  - `uf: "PB"`
  - `municipio_nome: "Joao Pessoa"`
- **Justificativa**: Remoção correta do prefixo "CNPJ -"

#### Caso 1.3: "CNPJ - Paraiba, Paraiba, Brazil"
- **Entrada**: `localizacao: "CNPJ - Paraiba, Paraiba, Brazil"`
- **Resultado Esperado**: 
  - `uf: "PB"`
  - `municipio_nome: "Paraiba"`
- **Justificativa**: Combinação de prefixo e caso especial de município = estado

### 2. Filtros Conflitantes Corrigidos

#### Caso 2.1: Capital Social Mínimo > Máximo
- **Entrada**: 
  ```json
  {
    "uf": ["SP"],
    "capital_social_min": 100000,
    "capital_social_max": 50000
  }
  ```
- **Resultado Esperado**: 
  - Filtros corrigidos automaticamente
  - `capital_social_min: 50000`
  - `capital_social_max: 100000`
- **Justificativa**: Correção automática de valores invertidos

#### Caso 2.2: Data Abertura Mínima > Máxima
- **Entrada**: 
  ```json
  {
    "uf": ["RJ"],
    "data_abertura_min": "2024-01-01",
    "data_abertura_max": "2023-01-01"
  }
  ```
- **Resultado Esperado**: 
  - Filtros corrigidos automaticamente
  - `data_abertura_min: "2023-01-01"`
  - `data_abertura_max: "2024-01-01"`
- **Justificativa**: Correção automática de datas invertidas

#### Caso 2.3: Idade Mínima > Máxima
- **Entrada**: 
  ```json
  {
    "uf": ["MG"],
    "idade_min_dias": 730,
    "idade_max_dias": 365
  }
  ```
- **Resultado Esperado**: 
  - Filtros corrigidos automaticamente
  - `idade_min_dias: 365`
  - `idade_max_dias: 730`
- **Justificativa**: Correção automática de idades invertidas

### 3. Combinações de Filtros Incompatíveis

#### Caso 3.1: MEI e não optante pelo Simples
- **Entrada**: 
  ```json
  {
    "uf": ["SP"],
    "mei": true,
    "simples": false
  }
  ```
- **Resultado Esperado**: 
  - Erro de validação
  - Mensagem: "Uma empresa MEI deve ser optante pelo Simples Nacional."
- **Justificativa**: Validação de combinações logicamente impossíveis

#### Caso 3.2: Situações Cadastrais Incompatíveis
- **Entrada**: 
  ```json
  {
    "uf": ["RJ"],
    "situacao": ["02", "08"] // Ativa e Baixada
  }
  ```
- **Resultado Esperado**: 
  - Erro de validação
  - Mensagem: "Combinação impossível de situações cadastrais: Ativa + Baixada"
- **Justificativa**: Validação de combinações logicamente impossíveis

### 4. Filtros por Porte e Capital Social

#### Caso 4.1: Porte Micro Empresa com Capital Alto
- **Entrada**: 
  ```json
  {
    "uf": ["MG"],
    "porte": ["01"], // Micro Empresa
    "capital_social_min": 500000 // Acima do limite
  }
  ```
- **Resultado Esperado**: 
  - Aviso de incompatibilidade
  - Sugestão: "Ajuste as faixas de capital social ou os portes selecionados"
- **Justificativa**: Validação de faixas de capital compatíveis com porte

#### Caso 4.2: Porte EPP com Capital Baixo
- **Entrada**: 
  ```json
  {
    "uf": ["PR"],
    "porte": ["03"], // EPP
    "capital_social_max": 100000 // Abaixo do limite mínimo
  }
  ```
- **Resultado Esperado**: 
  - Aviso de incompatibilidade
  - Sugestão: "Ajuste as faixas de capital social ou os portes selecionados"
- **Justificativa**: Validação de faixas de capital compatíveis com porte

### 5. Resultados Vazios e Tratamento

#### Caso 5.1: Filtros com Zero Resultados
- **Entrada**: 
  ```json
  {
    "uf": ["ZZ"], // UF inexistente
    "situacao": ["02"]
  }
  ```
- **Resultado Esperado**: 
  - `total_matches: 0`
  - Tratamento adequado sem erros
- **Justificativa**: Verificar tratamento correto de resultados vazios

#### Caso 5.2: CNAE Inexistente
- **Entrada**: 
  ```json
  {
    "cnae": ["9999999"], // CNAE inexistente
    "situacao": ["02"]
  }
  ```
- **Resultado Esperado**: 
  - `total_matches: 0`
  - Tratamento adequado sem erros
- **Justificativa**: Verificar tratamento correto de resultados vazios

### 6. Performance e Paginação

#### Caso 6.1: Paginação Contínua
- **Entrada**: 
  ```json
  {
    "uf": ["SP"],
    "situacao": ["02"],
    "limit": 50,
    "offset": 0
  }
  ```
- **Resultado Esperado**: 
  - Paginação funciona corretamente
  - Offset é atualizado adequadamente
- **Justificativa**: Verificar continuidade da paginação

#### Caso 6.2: Progresso Atualizado com Zero Registros
- **Entrada**: 
  ```json
  {
    "uf": ["ZZ"],
    "situacao": ["02"]
  }
  ```
- **Resultado Esperado**: 
  - Progresso é atualizado mesmo com zero registros
  - Status da run é atualizado corretamente
- **Justificativa**: Verificar atualização de progresso em casos especiais

## Critérios de Sucesso

1. Todos os casos de parsing corrigido devem funcionar conforme esperado
2. Filtros conflitantes devem ser corrigidos automaticamente
3. Combinações impossíveis devem ser detectadas e reportadas
4. Resultados vazios devem ser tratados adequadamente
5. Paginação e progresso devem funcionar corretamente
6. Performance deve ser mantida ou melhorada

## Métricas de Avaliação

- Taxa de sucesso dos testes de parsing: 100%
- Tempo médio de resposta das consultas: < 2 segundos
- Precisão dos resultados filtrados: 100%
- Correção automática de filtros inadequados: 100%
- Tratamento adequado de casos especiais: 100%