# Plano de Testes - Validação de Correções de Filtros CNPJ

## 1. Objetivo

Validar as correções implementadas no sistema de filtros CNPJ para garantir que:
- Filtros inadequados sejam corrigidos automaticamente
- Resultados vazios sejam tratados adequadamente
- A formatação dos dados esteja correta
- O progresso seja atualizado mesmo quando não há registros
- Os índices otimizados estejam melhorando o desempenho

## 2. Escopo dos Testes

### 2.1. Combinações de Filtros a Serem Testadas

#### Filtros Básicos
- Situação ativa (02)
- UF específica (ex: SP, RJ)
- CNAE específico (ex: 56.11-2-01 - Restaurantes e similares)

#### Filtros com Dados de Contato
- Com email (`com_email: true`)
- Com telefone (`com_telefone: true`)
- Com ambos email e telefone

#### Filtros por Porte e Regime Tributário
- MEI (`mei: true`)
- Simples Nacional (`simples: true`)
- Porte específico (01 - Micro Empresa, 03 - EPP, 05 - Demais)

#### Filtros por Capital Social
- Capital social mínimo (`capital_social_min`)
- Capital social máximo (`capital_social_max`)
- Faixa de capital social (mínimo e máximo)

#### Filtros Conflitantes
- Filtros que devem ser corrigidos automaticamente
- Combinações que resultam em zero registros
- Filtros com valores inválidos

### 2.2. Casos de Teste Específicos

#### Caso 1: Filtros Básicos Funcionando
- **Entrada**: UF = SP, Situação = Ativa, CNAE = 56.11-2-01
- **Expectativa**: Retorna empresas de SP, ativas, do ramo de restaurantes

#### Caso 2: Filtros com Dados de Contato
- **Entrada**: UF = RJ, Com email = true
- **Expectativa**: Retorna empresas do RJ com email preenchido

#### Caso 3: Filtros por Regime Tributário
- **Entrada**: MEI = true, UF = MG
- **Expectativa**: Retorna empresas MEI de Minas Gerais

#### Caso 4: Filtros por Capital Social
- **Entrada**: Capital social entre 10.000 e 100.000, UF = PR
- **Expectativa**: Retorna empresas do Paraná com capital nessa faixa

#### Caso 5: Filtros Conflitantes Corrigidos
- **Entrada**: UF = SP, MEI = true, Capital social > 100.000 (incompatível)
- **Expectativa**: Sistema corrige automaticamente ou avisa sobre incompatibilidade

#### Caso 6: Resultados Vazios
- **Entrada**: UF = ZZ (inexistente), CNAE = 99.99-9-99 (inexistente)
- **Expectativa**: Sistema trata adequadamente e retorna mensagem clara

#### Caso 7: Paginação e Continuidade
- **Entrada**: Mesmos filtros aplicados em sequência
- **Expectativa**: Sistema continua de onde parou, sem duplicatas

#### Caso 8: Parsing Corrigido de Localização
- **Entrada**: Localização = "Paraiba, Paraiba, Brazil"
- **Expectativa**: Sistema identifica corretamente UF=PB e Município=Paraiba

#### Caso 9: Correção Automática de Filtros Conflitantes
- **Entrada**: Capital social mínimo > máximo
- **Expectativa**: Sistema corrige automaticamente os valores

#### Caso 10: Validação de Combinações Impossíveis
- **Entrada**: MEI=true e Simples=false
- **Expectativa**: Sistema detecta erro e mostra mensagem apropriada

## 3. Critérios de Sucesso

- Todos os filtros básicos funcionam corretamente
- Filtros com dados de contato retornam resultados precisos
- Filtros por porte e regime tributário funcionam conforme esperado
- Filtros de capital social aplicam os valores corretamente
- Filtros conflitantes são corrigidos automaticamente
- Resultados vazios são tratados com mensagens apropriadas
- Paginação e continuidade funcionam sem duplicatas
- Performance foi melhorada com os índices otimizados
- Parsing de localização corrigido para casos especiais
- Correção automática de filtros conflitantes
- Validação de combinações logicamente impossíveis

## 4. Ambiente de Teste

- Banco de dados com dados de teste representativos
- Sistema com as correções implementadas
- Acesso às funções RPC atualizadas
- Acesso às tabelas de staging e progresso

## 5. Métricas de Avaliação

- Tempo de resposta das consultas
- Precisão dos resultados filtrados
- Tratamento adequado de casos especiais
- Performance comparada antes e depois das otimizações
- Correção automática de filtros inadequados
- Detecção de combinações logicamente impossíveis
- Tratamento adequado de casos especiais de parsing

## 6. Documentação dos Resultados

- Relatório com resultados de cada caso de teste
- Identificação de problemas encontrados e corrigidos
- Melhorias de performance observadas
- Problemas remanescentes que precisam ser abordados