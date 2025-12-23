# Guia de Teste - Nomes Personalizados para Extrações CNPJ

## Objetivo
Este guia descreve como testar a nova funcionalidade de geração de nomes personalizados para extrações CNPJ.

## Alterações Implementadas

### Função de Geração de Nomes
Foi implementada a função `generateExtractionName` que constrói nomes descritivos com base nos filtros aplicados, incluindo:
- Localização (UF e município)
- CNAE (primeiros dois códigos, com "..." se houver mais)
- Termo de busca (se aplicado)
- Data e hora da extração

### Exemplos de Nomes Gerados

| Cenário | Nome Gerado |
|--------|-------------|
| UF + CNAE único | `PB, CNAE: 5611201, 22/12/2025 16:54` |
| UF + Município + CNAE | `PB, Campina Grande, CNAE: 5611201, 22/12/2025 16:54` |
| UF + CNAE múltiplos | `PB, CNAE: 5611201, 5612103..., 22/12/2025 16:54` |
| UF + Termo de busca | `PB, Termo: restaurante, 22/12/2025 16/54` |
| Todos os filtros | `PB, Campina Grande, CNAE: 5611201, Termo: restaurante, 22/12/2025 16:54` |

## Como Testar

### Passo 1: Acesse o Sistema
1. Faça login no sistema PescaLead
2. Navegue até a seção de "Extração de CNPJ"

### Passo 2: Configure os Filtros
1. Configure diferentes filtros de busca:
   - UF: PB
   - Município: Campina Grande
   - CNAE: 5611201
   - Termo de busca: restaurante

### Passo 3: Inicie a Extração
1. Clique no botão para iniciar a extração
2. Observe o nome da extração criado no histórico

### Passo 4: Verifique o Nome Gerado
1. Vá para o histórico de extrações
2. Verifique se o nome segue o padrão: `PB, Campina Grande, CNAE: 5611201, Termo: restaurante, 22/12/2025 16:54`
3. Teste com diferentes combinações de filtros para verificar os nomes gerados

### Passo 5: Teste com Nome Personalizado
1. Se você definir um nome personalizado no frontend, verifique se esse nome é preservado
2. Exemplo: "Minha Extração Personalizada" deve aparecer exatamente como definido

## Possíveis Problemas e Soluções

| Problema | Possível Causa | Solução |
|----------|----------------|---------|
| Nome não está sendo gerado corretamente | Cache do navegador | Limpe o cache e tente novamente |
| Nome ainda aparece como "CNPJ: Brasil" | Deploy não foi aplicado | Verifique se o deploy foi concluído com sucesso |
| Nome não inclui todos os filtros | Lógica de geração precisa de ajustes | Verifique o código da função e faça os ajustes necessários |

## Resultados Esperados
Após seguir este guia, você deve ver nomes mais informativos e descritivos para as extrações CNPJ, facilitando a identificação das extrações anteriores no histórico.