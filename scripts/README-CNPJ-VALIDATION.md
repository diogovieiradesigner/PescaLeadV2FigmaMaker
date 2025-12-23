# Script de Validação Prática do Sistema CNPJ

Este documento descreve o script de validação prática criado para testar o sistema CNPJ no ambiente real.

## Visão Geral

O script foi criado para validar o funcionamento do sistema CNPJ em ambiente de produção/teste, identificando problemas específicos que não foram detectados nos testes teóricos.

## Arquivos Criados

### 1. `validate-cnpj-system.js` - Script Principal de Validação
- **Objetivo**: Testar chamadas reais à API CNPJ e validar o fluxo completo de extração
- **Testes incluídos**:
  - Disponibilidade da API CNPJ
  - Endpoint `/filters` - Verifica filtros disponíveis
  - Endpoint `/stats` - Testa estatísticas de busca
  - Endpoint `/cnaes` - Testa busca de CNAEs
  - Combinações de filtros problemáticas
  - Chamada ao `start-cnpj-extraction` edge function
  - Fluxo completo de extração (simulado)

### 2. `validate-cnpj-integrated.js` - Testes Integrados
- **Objetivo**: Testes mais específicos e detalhados para identificar problemas específicos
- **Testes incluídos**:
  - Teste de performance (requisições concorrentes)
  - Teste de carga (requisições contínuas)
  - Teste de integração (fluxo completo com dados reais)
  - Teste de resiliência (falhas e recuperação)

## Como Executar

### Pré-requisitos
- Node.js instalado
- Acesso à internet para chamadas às Edge Functions da Supabase

### Execução do Script Principal
```bash
cd scripts
node validate-cnpj-system.js
```

### Execução dos Testes Integrados
```bash
cd scripts
node validate-cnpj-integrated.js
```

### Execução de Ambos os Scripts
```bash
cd scripts
node validate-cnpj-system.js && node validate-cnpj-integrated.js
```

## Configurações

As configurações estão definidas no início de cada script:

```javascript
const CONFIG = {
  // Supabase
  projectId: 'nlbcwaxkeaddfocigwuk',
  publicAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  
  // URLs das Edge Functions
  supabaseUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co',
  cnpjApiUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api',
  startExtractionUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/start-cnpj-extraction',
  
  // Configurações de teste
  testWorkspaceId: 'ws-test-validation',
  testFunnelId: 'fn-test-funnel',
  testColumnId: 'cl-test-column',
  
  // Timeout das requisições
  timeout: 30000
};
```

## Tipos de Testes

### Testes de API
1. **Disponibilidade**: Verifica se a API está respondendo
2. **Filtros**: Testa se os filtros estão disponíveis e retornam estrutura correta
3. **Estatísticas**: Testa cálculo de estatísticas com diferentes combinações de filtros
4. **CNAEs**: Testa busca e retorno de CNAEs

### Testes de Filtros Problemáticos
- Filtros muito restritivos (poucos resultados)
- Filtros com valores inválidos
- Filtros sem nenhum filtro aplicado
- Filtros com CNAE inexistente

### Testes de Extração
- Chamada ao `start-cnpj-extraction` edge function
- Validação do fluxo completo de extração
- Testes de integração com dados reais

### Testes de Performance
- Requisições concorrentes
- Carga contínua
- Tempo de resposta
- Taxa de sucesso sob carga

### Testes de Resiliência
- Timeout de requisições
- Erros de rede
- Erros HTTP 500
- Recuperação de falhas

## Relatórios Gerados

### Relatório Principal (`validate-cnpj-system.js`)
- **Formato**: JSON
- **Conteúdo**:
  - Resumo de testes executados
  - Detalhes de erros
  - Recomendações de correção
  - Taxa de sucesso geral

### Relatório Integrado (`validate-cnpj-integrated.js`)
- **Formato**: JSON
- **Conteúdo**:
  - Métricas de performance
  - Resultados de carga
  - Detalhes de integração
  - Testes de resiliência
  - Recomendações específicas

## Interpretação dos Resultados

### Códigos de Status
- ✅ **PASSOU**: Teste executado com sucesso
- ❌ **FALHOU**: Teste falhou com erro
- ⚠️ **ATENÇÃO**: Teste com alerta ou comportamento inesperado

### Tipos de Erros Comuns
1. **Timeout**: Edge Function demorando muito para responder
2. **404**: URL da Edge Function incorreta
3. **401/403**: Problemas de autenticação ou permissões
4. **500**: Erro interno do servidor
5. **Network Error**: Problemas de conexão

### Métricas de Performance
- **Tempo médio de resposta**: Deve ser < 5 segundos
- **Taxa de sucesso**: Deve ser > 95%
- **Tempo máximo**: Não deve ultrapassar 30 segundos

## Recomendações de Correção

### Problemas de Timeout
```bash
# Verificar logs da Edge Function
# Aumentar timeout se necessário
# Otimizar consultas ao banco de dados
```

### Problemas de Autenticação
```bash
# Verificar SUPABASE_ANON_KEY
# Verificar permissões da Edge Function
# Testar com token de usuário autenticado
```

### Problemas de URL
```bash
# Verificar URLs das Edge Functions
# Confirmar nomes das funções no Supabase
# Testar endpoints manualmente
```

### Problemas de Filtros
```bash
# Verificar estrutura dos filtros
# Testar combinações diferentes
# Validar tipos de dados
```

## Uso em Produção

### Monitoramento Contínuo
```bash
# Executar validação diariamente
# Monitorar métricas de performance
# Alertar em caso de falhas
```

### Integração com CI/CD
```bash
# Adicionar ao pipeline de deploy
# Bloquear deploy em caso de falhas críticas
# Gerar relatórios automatizados
```

## Logs e Debug

### Logs Gerados
- **Console**: Saída detalhada dos testes
- **Arquivos JSON**: Relatórios completos
- **Erros específicos**: Detalhes de falhas

### Debug de Problemas
1. Verificar logs da Edge Function no Supabase
2. Testar endpoints manualmente com curl
3. Validar parâmetros de entrada
4. Checar conexão com banco de dados

## Contribuição

Para contribuir com melhorias no script:

1. Adicionar novos testes específicos
2. Melhorar mensagens de erro
3. Adicionar novas métricas de performance
4. Implementar testes para novos endpoints

## Contato

Para dúvidas ou suporte:
- Verifique os logs gerados
- Consulte a documentação da Supabase
- Teste endpoints manualmente
- Verifique a conectividade de rede