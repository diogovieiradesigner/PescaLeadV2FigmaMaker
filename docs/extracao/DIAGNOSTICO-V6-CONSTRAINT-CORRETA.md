# 🔧 V6 - Constraint Correta

**Deploy**: ✅ Concluído  
**Hora**: 2025-12-22 01:07:21  
**Status**: 🔍 **TESTANDO**

## 🎯 Constraint Identificada

**Problema na V5:**
- Erro: `23514 - new row for relation "lead_extractions" violates check constraint "lead_extractions_extraction_type_check"`
- Causa: Valor `'cnpj'` não é aceito pela constraint no campo `extraction_type`

**Constraint Real Encontrada:**
```
CHECK ((extraction_type = ANY (ARRAY['manual'::text, 'automatic'::text])))
```

**Valores Permitidos para `extraction_type`:**
- ✅ `'manual'`
- ✅ `'automatic'`
- ❌ `'cnpj'` (NÃO é aceito)

## 🔧 Correção Aplicada V6

**Mudança:**
- ✅ `extraction_type: 'cnpj'` → `extraction_type: 'manual'`

**Lógica:**
- `extraction_type`: Define se é manual ou automático (constraint)
- `source`: Define a fonte de dados (pode ser 'cnpj', 'google_maps', etc.)

## 🧪 Teste em Andamento

**Testar agora no frontend a extração CNPJ.**

**Se V6 funcionar:**
- ✅ Schema correto validado
- ✅ Constraint respeitada
- ✅ Pronto para implementar lógica real de extração CNPJ

**Se ainda falhar:**
- Investigar outras constraints
- Verificar RLS policies
- Validar dados do frontend

## 📊 Progresso das Versões

| Versão | Objetivo | Status |
|--------|----------|---------|
| V1 | Parsing/Validação básica | ✅ OK |
| V2 | Conexão banco de dados | ✅ OK |
| V3 | Environment variables | ✅ Diagnóstico completo |
| V4 | UUIDs válidos | ✅ Funciona, schema errado |
| V5 | Schema correto | ✅ Schema OK, constraint errada |
| V6 | **Constraint correta** | 🔍 **TESTANDO** |

## 🎯 Próximo Passo

Com constraint correta, poderemos implementar a lógica real de extração CNPJ usando:
- `extraction_type: 'manual'` (constraint OK)
- `source: 'cnpj'` (fonte de dados)

---

**RESULTADO**: Aguardando teste do usuário na extração CNPJ.