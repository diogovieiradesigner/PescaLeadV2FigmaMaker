# GUIA RÁPIDO - TESTES CNPJ

**Referência rápida para desenvolvedores e equipe de suporte**

## 🚀 COMO EXECUTAR OS TESTES

### Testes Completos
```bash
# Instalar dependências e executar
./run-cnpj-tests.sh

# Ou manualmente
npm install node-fetch@2
node test-cnpj-filters.js
```

### Testes Rápidos
```bash
# Validação rápida do ambiente
node quick-test-cnpj.js

# Validação de ambiente
node validate-environment.js
```

## 📋 COMANDOS ESSENCIAIS

### Variáveis de Ambiente
```bash
export API_BASE_URL=http://localhost:54321/functions/v1/cnpj-api
export SUPABASE_URL=http://localhost:54321
export SUPABASE_ANON_KEY=seu_token_aqui
```

### Arquivo .env
```bash
echo 'API_BASE_URL=http://localhost:54321/functions/v1/cnpj-api' > .env
echo 'SUPABASE_URL=http://localhost:54321' >> .env
echo 'SUPABASE_ANON_KEY=seu_token_aqui' >> .env
```

## 🔍 ENDPOINTS ESSENCIAIS

### Públicos (sem autenticação)
```bash
# Health check
curl "https://api.pescalead.com.br/health"

# Consulta CNPJ
curl "https://api.pescalead.com.br/?cnpj=00000000000191"

# Filtros disponíveis
curl "https://api.pescalead.com.br/filters"
```

### Autenticados (requer JWT)
```bash
# Busca com filtros
curl -X POST "https://api.pescalead.com.br/search" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "uf": ["SP"],
      "situacao": ["02"]
    },
    "limit": 100
  }'
```

## 🐛 SOLUÇÃO DE PROBLEMAS

### Erro 401 - Não Autorizado
```javascript
// Verificar se o usuário está logado
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redirecionar para login
  window.location.href = '/login';
}
```

### Erro 400 - Parâmetros Inválidos
```javascript
// Validar filtros antes de enviar
function validarFiltros(filters) {
  const erros = [];
  if (filters.uf && !Array.isArray(filters.uf)) {
    erros.push('UF deve ser array');
  }
  return erros;
}
```

### Resultados Vazios
```javascript
// Verificar contagem antes da busca
async function verificarContagem(filters) {
  const response = await fetch('/stats', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ filters })
  });
  const result = await response.json();
  console.log(`Total: ${result.preview.total_matches}`);
}
```

## 📊 MELHORES COMBINAÇÕES DE FILTROS

### Restaurantes (CNAE 5611201)
```javascript
{
  "filters": {
    "uf": ["SP"],
    "municipio": ["7107"],
    "cnae": ["5611201"],
    "com_email": true,
    "com_telefone": true
  }
}
```

### Comércio Varejista (CNAE 4711301)
```javascript
{
  "filters": {
    "uf": ["DF"],
    "cnae": ["4711301", "4711302"],
    "porte": ["03", "05"],
    "capital_social_min": 100000
  }
}
```

### Empresas de TI (CNAE 6201501)
```javascript
{
  "filters": {
    "cnae_divisao": ["62"],
    "idade_max_dias": 730,
    "mei": true
  }
}
```

## ⚡ DICAS DE PERFORMANCE

### Consultas Rápidas
- Sempre inclua `uf` e `situacao` nos filtros
- Use `limit` adequado (100-1000)
- Prefira filtros exatos a LIKE

### Evitar Problemas
- Não use apenas `situacao: ["02"]` (muito amplo)
- Evite limites > 10.000
- Não use offset > 100.000

## 📞 SUPORTE

### Comandos de Debug
```bash
# Ver logs da edge function
supabase logs tail --name cnpj-api

# Ver status do banco
supabase status

# Testar conexão
curl "https://api.pescalead.com.br/health"
```

### Arquivos de Log
- `RELATORIO_TESTES_CNPJ_COMPLETO.md` - Relatório completo
- `RESUMO_EXECUTIVO_TESTES_CNPJ.md` - Resumo executivo
- `DOCUMENTACAO_API_CNPJ.md` - Documentação da API

### Contatos
- **Slack:** #cnpj-api-support
- **Email:** suporte@pescalead.com.br
- **GitHub:** [Issues](https://github.com/pescalead/cnpj-api/issues)

---

**Versão:** 1.0  
**Última atualização:** 22/12/2025