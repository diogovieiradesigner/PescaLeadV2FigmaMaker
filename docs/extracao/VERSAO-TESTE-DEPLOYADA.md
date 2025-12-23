# 🧪 VERSÃO DE TESTE DEPLOYADA

## ✅ Deploy Realizado com Sucesso

**Status**: 🎉 **FUNÇÃO DE TESTE ATIVA**  
**Versão**: 16 (atualizada)  
**Data/Hora**: 2025-12-21 22:56

### 📋 O que foi feito

1. ✅ **Backup criado** da função original
2. ✅ **Versão de teste criada** com logging detalhado
3. ✅ **Deploy realizado** via MCP Supabase
4. ✅ **Função ativa** na versão 16

### 🔍 Como a versão de teste funciona

A nova versão da função `start-cnpj-extraction` vai:

1. **Logar cada etapa** do processo em detalhes
2. **Testar environment variables** (SUPABASE_URL, SERVICE_ROLE_KEY)
3. **Testar conexão com banco** de dados
4. **Validar parsing do body** da requisição
5. **Testar criação de registros** (extraction, run, logs)
6. **Simular chamada para CNPJ-API** (sem realmente chamar)
7. **Retornar diagnóstico completo** do que funcionou e o que falhou

### 🧪 Como testar

**Opção 1: Via Frontend**
1. Ir para a interface de extração CNPJ
2. Tentar criar uma nova extração
3. Observar a resposta (agora com logs detalhados)

**Opção 2: Via Terminal (se tiver dados de teste)**
```bash
curl -X POST https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/start-cnpj-extraction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "workspace_id": "SEU_WORKSPACE_ID",
    "extraction_name": "Teste Diagnóstico",
    "filters": {
      "uf": ["SP"],
      "com_email": true
    },
    "target_quantity": 10,
    "funnel_id": "SEU_FUNNEL_ID",
    "column_id": "SUA_COLUNA_ID"
  }'
```

### 📊 O que esperar

A resposta agora vai conter:

```json
{
  "success": true,
  "test_version": true,
  "run_id": "uuid",
  "extraction_id": "uuid",
  "message": "TESTE PASSOU: Função funcionando até o ponto de chamar CNPJ API",
  "data": {
    "extraction_id": "uuid",
    "run_id": "uuid",
    "workspace_id": "ok",
    "extraction_name": "ok",
    "target_quantity": 10,
    "filters_count": 2,
    "response_time_ms": 1500,
    "next_step": "Call CNPJ API with simulated data"
  }
}
```

OU se houver erro:

```json
{
  "error": "Database connection failed",
  "details": "具体错误信息"
}
```

### 🎯 Próximos passos

1. **Testar agora** a extração CNPJ
2. **Analisar resposta** e logs
3. **Identificar problema** específico
4. **Implementar correção** direcionada

### 🔄 Após identificar o problema

Uma vez identificado onde está o erro, vou:
1. **Corrigir** o problema específico
2. **Restaurar** funcionalidade completa
3. **Deploy** da versão corrigida
4. **Testar** extração completa

---

**Status**: ⏳ **AGUARDANDO TESTE DO USUÁRIO**  
**Objetivo**: Identificar exatamente onde está o erro 500  
**Ação necessária**: Tentar criar extração CNPJ via frontend