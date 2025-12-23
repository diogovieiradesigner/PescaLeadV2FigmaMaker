# Diagnóstico em Progressão: Erro 500 start-cnpj-extraction

## 🚨 Situação Atual
- **Problema**: Função start-cnpj-extraction retorna erro 500
- **Tentativas**: 10 tentativas falharam
- **Approach**: Método de eliminação com versões progressivas

## 🔍 Metodologia de Diagnóstico

### Versão 1: Ultra-Simples (✅ Deployada - Versão 19)
**Objetivo**: Eliminar problemas de compilação/estrutura básica

**Funcionalidades**:
- ✅ Apenas parsing de JSON
- ✅ Validação mínima (workspace_id)
- ✅ Resposta de sucesso imediata
- ❌ SEM operações de banco
- ❌ SEM imports complexos

**Status**: Deployada, aguardando teste

### Versão 2: Adicionando Banco (✅ Deployada - Versão 20)
**Objetivo**: Testar operações de banco de dados

**Funcionalidades Adicionadas**:
- ✅ Environment variables check
- ✅ Supabase client creation
- ✅ Database connection test
- ✅ Extraction creation
- ✅ Run creation  
- ✅ Log insertion

**Status**: Deployada agora, aguardando teste

### Versão 3: Adicionando CNPJ API (⏳ Próxima)
**Objetivo**: Testar chamada para CNPJ API

**Funcionalidades Planejadas**:
- ✅ Tudo da versão 2
- ➕ Chamada para cnpj-api/search
- ➕ Headers de autenticação interna
- ➕ Tratamento de resposta da API

### Versão 4: Adicionando Staging (⏳ Futura)
**Objetivo**: Testar inserção em staging

### Versão 5: Adicionando Fila (⏳ Futura)
**Objetivo**: Testar enfileiramento para migração

## 📊 Cenários de Resultado

### ✅ Versão 2 Funciona
**Interpretação**: Problema estava nas operações complexas da versão original
**Próximo Passo**: Gradualmente adicionar funcionalidades (v3, v4, v5)

### ❌ Versão 2 Falha
**Interpretação**: Problema está nas operações de banco de dados
**Possíveis Causas**:
1. **Environment Variables**: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY
2. **Database Schema**: Tabelas não existem ou campos ausentes
3. **RLS Policies**: Permissões bloqueando operações
4. **Connection Issues**: Problemas de conectividade

**Ações Imediatas**:
1. Verificar logs detalhados da função
2. Verificar schema das tabelas
3. Verificar RLS policies
4. Testar operações manuais no banco

## 🎯 Critérios de Sucesso

### Versão 2 deve retornar:
```json
{
  "success": true,
  "version": 2,
  "run_id": "uuid",
  "extraction_id": "uuid", 
  "message": "V2 PASSOU: Banco de dados funcionando"
}
```

### Se retornar erro 500:
- Problema está nas operações de banco
- Investigar logs e schema

## 📝 Logs para Verificar

Após teste da versão 2, verificar:
1. **Console logs**: `[V2] Função iniciada` até `[V2] === SUCESSO COMPLETO ===`
2. **Database records**: extraction_logs com step_name 'start'
3. **Run status**: lead_extraction_runs com status 'running'

## 🔧 Comandos de Verificação

```sql
-- Verificar se extraction foi criada
SELECT * FROM lead_extractions 
WHERE extraction_name = 'Teste V2' 
ORDER BY created_at DESC LIMIT 1;

-- Verificar se run foi criado
SELECT * FROM lead_extraction_runs 
WHERE search_term = 'Teste v2' 
ORDER BY started_at DESC LIMIT 1;

-- Verificar logs
SELECT * FROM extraction_logs 
WHERE message LIKE 'V2:%' 
ORDER BY created_at DESC;
```

## ⏭️ Próximos Passos

1. **TESTAR VERSÃO 2 AGORA**
2. **Reportar resultado**: Sucesso ou erro 500
3. **Se sucesso**: Deploy versão 3 (CNPJ API)
4. **Se falha**: Investigar banco de dados

---

**Status**: ⏳ **AGUARDANDO TESTE DA VERSÃO 2**