# Correção: Compartilhamento de Campos entre Tipos de Extração

## Problema Identificado

Os campos de configuração (nome da extração, termo de busca, localização, etc.) estavam sendo compartilhados entre diferentes tipos de extração (CNPJ, Google Maps, Instagram). Isso causava situações onde:

- Ao configurar uma extração CNPJ, os campos afetavam as extrações do Google Maps
- Ao definir uma localização no CNPJ, ela também aparecia nas outras abas
- Os nomes das extrações eram reutilizados entre tipos diferentes

## Solução Implementada

### 1. Individualização de Estado por Tipo de Extração

Modificamos o componente `ExtractionView.tsx` para separar o estado por tipo de extração:

- Criamos um estado específico `googleMapsData` que contém todos os campos relacionados à extração do Google Maps
- Implementamos getters e setters que garantem que apenas os dados da aba ativa sejam acessíveis
- Adicionamos verificação de aba ativa em todas as operações de manipulação de estado

### 2. Separação de Lógica de Salvamento

Atualizamos os métodos de salvamento para garantir que:

- Apenas dados relevantes à aba ativa sejam processados
- As operações de salvamento sejam específicas para cada tipo de extração
- O histórico e configurações não sejam misturados entre tipos diferentes

### 3. Limpeza de Estado ao Trocar Abas

Implementamos um mecanismo para limpar o estado quando o usuário troca de aba:

- Ao mudar de aba, o sistema reseta a seleção de extração ativa
- Os dados específicos de cada aba são mantidos isolados
- Não há mais contaminação de dados entre tipos de extração

## Benefícios

- **Isolamento de Dados**: Cada tipo de extração agora possui seus próprios campos e configurações
- **Experiência Melhorada**: Os usuários não precisam mais se preocupar com campos "vazando" entre diferentes tipos de extração
- **Maior Confiabilidade**: Reduzimos a chance de erros causados por dados incorretos ou desatualizados

## Testes Realizados

Realizamos testes para verificar:

1. Que os campos de uma aba não aparecem em outras abas
2. Que as configurações salvas são específicas para cada tipo de extração
3. Que ao trocar de aba, o estado é limpo corretamente
4. Que os nomes gerados para cada tipo de extração são apropriados

## Próximos Passos

Embora a solução atual resolva o problema, poderíamos considerar as seguintes melhorias futuras:

1. Implementar um mecanismo mais robusto de persistência de estado por tipo de extração
2. Adicionar uma camada de validação adicional para garantir que os dados sejam apropriados para cada tipo de extração
3. Melhorar a documentação do código para tornar mais claro como o estado é gerenciado entre diferentes abas