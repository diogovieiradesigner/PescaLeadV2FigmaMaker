# Testes de Validação de Filtros CNPJ

Este documento descreve o script de testes abrangente para validar as correções implementadas nos filtros CNPJ.

## 📋 Visão Geral

O script `test-cnpj-filters.js` foi criado para validar todas as correções implementadas no sistema de filtros CNPJ, incluindo:

- **Filtros básicos** (situação, UF, CNAE)
- **Filtros de contato** (email, telefone)
- **Filtros de regime tributário** (MEI, Simples Nacional)
- **Filtros de capital social**
- **Correções automáticas** de filtros conflitantes
- **Parsing de localização**
- **Validação de endpoints**
- **Formatação de dados**

## 🚀 Como Executar

### Pré-requisitos

- Node.js instalado
- Acesso à API CNPJ (local ou remota)
- Token de autenticação Supabase (para endpoints que exigem JWT)

### Instalação

```bash
# Instalar dependências
npm install node-fetch@2

# Ou usar o script de instalação
chmod +x run-cnpj-tests.sh
./run-cnpj-tests.sh
```

### Configuração de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# URL da API CNPJ
API_BASE_URL=http://localhost:54321/functions/v1/cnpj-api

# URL do Supabase
SUPABASE_URL=http://localhost:54321

# Token de autenticação (opcional para endpoints públicos)
SUPABASE_ANON_KEY=seu_token_aqui
```

### Execução

```bash
# Executar todos os testes
node test-cnpj-filters.js

# Ou usar o script de execução
./run-cnpj-tests.sh
```

## 🧪 Testes Implementados

### 1. Filtros Básicos
- **Objetivo**: Validar filtros de situação cadastral, UF e CNAE
- **Cenário**: Empresas ativas em SP no comércio varejista
- **Validação**: Verifica se retorna resultados válidos

### 2. Filtros de Contato
- **Objetivo**: Validar filtros por email e telefone
- **Cenário**: Empresas com email e telefone
- **Validação**: Verifica se filtra corretamente

### 3. Filtros de Regime Tributário
- **Objetivo**: Validar filtros MEI e Simples Nacional
- **Cenário**: Empresas MEI optantes pelo Simples
- **Validação**: Verifica compatibilidade dos filtros

### 4. Filtros de Capital Social
- **Objetivo**: Validar filtros por faixa de capital
- **Cenário**: Empresas com capital entre R$100k e R$1M
- **Validação**: Verifica se aplica corretamente os limites

### 5. Correções Automáticas
- **Objetivo**: Validar correções de filtros conflitantes
- **Cenário**: Combinações impossíveis (ex: Ativa + Baixada)
- **Validação**: Verifica se o sistema detecta e corrige

### 6. Parsing de Localização
- **Objetivo**: Validar parsing de localização textual
- **Cenário**: "João Pessoa, Paraíba, Brasil"
- **Validação**: Verifica se extrai UF e município corretamente

### 7. Endpoints Públicos
- **Objetivo**: Validar endpoints que não exigem autenticação
- **Cenário**: Filtros, CNAEs, Health Check, Estatísticas
- **Validação**: Verifica disponibilidade e formato dos dados

### 8. Consultas CNPJ
- **Objetivo**: Validar endpoints de consulta individual
- **Cenário**: Consultas completo, básico, sócios, simples
- **Validação**: Verifica retorno de dados corretos

### 9. Validação de Dados
- **Objetivo**: Validar formatação e validade dos dados
- **Cenário**: Formato de CNPJ, capital social, telefone, email
- **Validação**: Verifica consistência dos dados

## 📊 Interpretação dos Resultados

### Resultados Esperados

- **✅ PASS**: Teste aprovado - o sistema está funcionando corretamente
- **❌ FAIL**: Teste falhou - há um problema que precisa ser corrigido
- **⚠️ ERROR**: Erro de execução - problema na execução do teste

### Métricas de Sucesso

- **Taxa de sucesso > 90%**: Sistema está em bom estado
- **Taxa de sucesso 70-90%**: Sistema tem problemas menores
- **Taxa de sucesso < 70%**: Sistema tem problemas críticos

## 🔧 Solução de Problemas

### Erros Comuns

1. **Conexão com API falhou**
   - Verifique se a API está rodando
   - Confira a URL no `.env`
   - Verifique a conexão de rede

2. **Autenticação falhou**
   - Verifique o token JWT
   - Confira as permissões do usuário
   - Teste endpoints públicos primeiro

3. **Banco de dados indisponível**
   - Verifique conexão com PostgreSQL
   - Confira credenciais de acesso
   - Verifique se as tabelas existem

### Logs de Depuração

O script gera logs detalhados para cada teste:
- Mensagens de status
- Dados de entrada e saída
- Erros específicos
- Sugestões de correção

## 📝 Relatório de Testes

O script gera um relatório completo com:

- **Resumo executivo**: Total de testes, aprovados, falhados
- **Detalhes por teste**: Status, mensagens, dados relevantes
- **Análise de falhas**: Tipos de falhas e causas prováveis
- **Recomendações**: Ações corretivas e preventivas

## 🔄 Integração com CI/CD

Para integrar com pipelines de CI/CD:

```yaml
# Exemplo para GitHub Actions
- name: Run CNPJ Tests
  run: |
    npm install node-fetch@2
    node test-cnpj-filters.js
  env:
    API_BASE_URL: ${{ secrets.API_BASE_URL }}
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## 📚 Documentação Adicional

- [Documentação da API CNPJ](./DOCUMENTACAO_API_CNPJ.md)
- [Análise de Problemas CNPJ](./AUDITORIA_CNPJ_API_2025-12-17.md)
- [Correções Implementadas](./MELHORIAS_LOGS_CNPJ_IMPLEMENTADAS.md)

## 🤝 Contribuição

Para contribuir com novos testes:

1. Adicione a função de teste no formato `async function testNomeDoTeste()`
2. Use `runTest()` para executar o teste
3. Retorne objeto com `success`, `message` e `details`
4. Atualize este README com a descrição do novo teste

## 📞 Suporte

Para dúvidas ou problemas:

- Verifique o arquivo de logs
- Consulte a documentação da API
- Abra issue no repositório
- Contate a equipe de desenvolvimento