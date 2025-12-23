# Diagnóstico v3: Environment Variables e Database

## 🚨 Status Atual
- **Problema**: Função start-cnpj-extraction retorna erro 500
- **Schema**: ✅ Todas as tabelas existem com campos corretos
- **Versão 3**: 🔄 Testando environment variables e conexões

## 🔍 Verificações Realizadas

### ✅ Schema das Tabelas (PASSOU)
```sql
-- lead_extractions: 28 campos ✅
-- lead_extraction_runs: 45 campos ✅  
-- extraction_logs: 10 campos ✅
```

### 🔄 Versão 3: Environment Variables (EM TESTE)

**O que a versão 3 testa:**
1. **Environment Variables Disponíveis**
   - Lista todas as env vars disponíveis
   - Verifica SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

2. **Conexão com Service Role**
   - Testa cliente Supabase com service role key
   - Testa SELECT simples
   - Testa INSERT e cleanup automático

3. **Fallback para Anon Key**
   - Se service role falhar, tenta com anon key
   - Pode revelar problema de RLS policies

4. **Error Details**
   - Retorna detalhes específicos do erro
   - Código do erro, hint, details do PostgreSQL

## 🎯 Cenários de Resultado

### ✅ Sucesso com Service Role
**Interpretação**: Environment variables e banco funcionando
**Próximo**: Testar com dados reais do frontend

### ⚠️ Sucesso apenas com Anon Key  
**Interpretação**: RLS policies bloqueando service role
**Solução**: Ajustar RLS policies ou usar anon key

### ❌ Falha com Ambos
**Interpretação**: Problema mais fundamental
**Possíveis Causas**:
- Environment variables incorretas
- Problemas de conectividade
- RLS policies muito restritivas
- Problemas de rede/firewall

## 📊 Expected Output da Versão 3

### Sucesso:
```json
{
  "success": true,
  "version": 3,
  "message": "V3 PASSOU: Tudo funcionando com service role",
  "data": {
    "extractionCreated": "uuid",
    "environmentVars": {
      "hasUrl": true,
      "hasKey": true,
      "hasAnon": true
    }
  }
}
```

### Falha com Service Role, Sucesso com Anon Key:
```json
{
  "success": true,
  "version": 3,
  "solution": "Use anon key instead of service role",
  "message": "V3 PASSOU: Problema é com service role, anon key funciona"
}
```

### Falha Total:
```json
{
  "error": "Database connection failed",
  "details": "specific error message",
  "code": "error code",
  "hint": "postgres hint"
}
```

## 🔧 Comandos de Verificação Pós-Teste

```sql
-- Verificar se teste foi executado
SELECT * FROM extraction_logs 
WHERE message LIKE 'V3:%' 
ORDER BY created_at DESC LIMIT 1;

-- Verificar se extraction de teste foi criada e deletada
SELECT * FROM lead_extractions 
WHERE extraction_name = 'Teste V3 Debug' 
ORDER BY created_at DESC LIMIT 1;
```

## ⏭️ Próximos Passos Baseados no Resultado

### Se V3 Funcionar:
1. **Deploy V4**: Testar com dados reais do frontend
2. **Gradualmente**: Adicionar funcionalidades uma por vez
3. **Identificar**: Qual operação específica está falhando

### Se V3 Falhar:
1. **Investigar**: Logs detalhados da edge function
2. **Verificar**: RLS policies das tabelas
3. **Testar**: Operações manuais no banco
4. **Ajustar**: Environment variables se necessário

---

**Status**: ⏳ **AGUARDANDO TESTE DA VERSÃO 3**