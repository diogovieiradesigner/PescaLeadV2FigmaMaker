# 🚀 Guia de Deploy: Correções V16

## 📋 Resumo

Este documento lista **TODOS** os deploys necessários após as correções aplicadas.

---

## ✅ DEPLOYS NECESSÁRIOS

### **1. MIGRAÇÃO SQL (OBRIGATÓRIA)**

**Arquivo:** `supabase/migrations/create_increment_segmented_searches_completed.sql`

**O que faz:**
- Cria função SQL `increment_segmented_searches_completed` para incremento atômico
- Resolve race condition na contagem de buscas segmentadas completadas
- **CRÍTICO:** Sem esta migração, o fallback pode ter race condition

**Como aplicar:**
```bash
# Opção 1: Via Supabase CLI
supabase db push

# Opção 2: Via SQL Editor no Dashboard Supabase
# Copiar e colar o conteúdo do arquivo:
# supabase/migrations/create_increment_segmented_searches_completed.sql
```

**Status:** ⚠️ **OBRIGATÓRIA** - Sistema não funcionará corretamente sem esta função

---

### **2. EDGE FUNCTION: fetch-google-maps**

**Arquivo:** `supabase/functions/fetch-google-maps/index.ts`

**Correções aplicadas:**
- ✅ #1: Fallback de incremento (retry + UPDATE direto + incremento local)
- ✅ #2: Overpass retorna vazio (tratamento adequado)
- ✅ #4: Validação de coordenadas (antes de enfileirar)
- ✅ #5: Timeout buscas segmentadas (2 horas)
- ✅ #7: API key fallback (loop através de todas as keys)
- ✅ #10: Fallback não incrementa (incremento local)
- ✅ #11: Mensagens perdidas segmentadas (detecção automática)
- ✅ #12: Validação location (conteúdo válido)
- ✅ #18: Logging de erros (em extraction_logs)
- ✅ #20: Validação target quantity (validação antes de usar)

**Como fazer deploy:**
```bash
# Via Supabase CLI
supabase functions deploy fetch-google-maps

# OU via Dashboard Supabase
# 1. Ir em Edge Functions
# 2. Selecionar "fetch-google-maps"
# 3. Fazer upload do arquivo atualizado
```

**Status:** ⚠️ **OBRIGATÓRIA** - Contém todas as correções principais

---

### **3. EDGE FUNCTION: fetch-overpass-coordinates**

**Arquivo:** `supabase/functions/fetch-overpass-coordinates/index.ts`

**Correções aplicadas:**
- ✅ #8: Overpass JSON inválido (tratamento de erro)
- ✅ #9: Normalização de estado (mapeamento completo)
- ✅ #13: Overpass timeout (retry com backoff exponencial)
- ✅ #16: Validação resposta Overpass (valida estrutura)
- ✅ #17: Estado ambíguo (detecta em qualquer posição)

**Como fazer deploy:**
```bash
# Via Supabase CLI
supabase functions deploy fetch-overpass-coordinates

# OU via Dashboard Supabase
# 1. Ir em Edge Functions
# 2. Selecionar "fetch-overpass-coordinates"
# 3. Fazer upload do arquivo atualizado
```

**Status:** ⚠️ **OBRIGATÓRIA** - Contém melhorias críticas para Overpass API

---

## 📋 CHECKLIST DE DEPLOY

### **ANTES DO DEPLOY:**

- [ ] ✅ Backup do banco de dados (recomendado)
- [ ] ✅ Verificar se ambiente de desenvolvimento está funcionando
- [ ] ✅ Revisar todas as correções aplicadas

### **DEPLOY:**

- [ ] ⚠️ **1. Aplicar Migração SQL** (OBRIGATÓRIA)
  ```bash
  supabase db push
  # OU aplicar manualmente via SQL Editor
  ```

- [ ] ⚠️ **2. Deploy Edge Function: fetch-google-maps** (OBRIGATÓRIA)
  ```bash
  supabase functions deploy fetch-google-maps
  ```

- [ ] ⚠️ **3. Deploy Edge Function: fetch-overpass-coordinates** (OBRIGATÓRIA)
  ```bash
  supabase functions deploy fetch-overpass-coordinates
  ```

### **APÓS O DEPLOY:**

- [ ] ✅ Verificar logs das Edge Functions
- [ ] ✅ Testar uma extração simples
- [ ] ✅ Verificar se função SQL foi criada corretamente
- [ ] ✅ Monitorar métricas de performance

---

## 🔍 VERIFICAÇÕES PÓS-DEPLOY

### **1. Verificar Função SQL Criada:**

```sql
-- Verificar se função existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'increment_segmented_searches_completed';

-- Testar função (substituir UUID por um run_id válido)
SELECT increment_segmented_searches_completed('UUID-DO-RUN-AQUI');
```

### **2. Verificar Edge Functions:**

```bash
# Verificar se funções foram deployadas
supabase functions list

# Verificar logs
supabase functions logs fetch-google-maps
supabase functions logs fetch-overpass-coordinates
```

### **3. Testar Funcionalidade:**

1. Criar uma extração que ative segmentação
2. Verificar se logs aparecem corretamente
3. Verificar se finalização funciona corretamente
4. Verificar se erros são logados em `extraction_logs`

---

## ⚠️ ORDEM DE DEPLOY RECOMENDADA

### **Ordem Correta:**

1. **PRIMEIRO:** Aplicar migração SQL
   - Garante que função `increment_segmented_searches_completed` existe
   - Edge Functions dependem desta função

2. **SEGUNDO:** Deploy `fetch-overpass-coordinates`
   - Função auxiliar usada por `fetch-google-maps`
   - Deve estar disponível antes

3. **TERCEIRO:** Deploy `fetch-google-maps`
   - Função principal que usa todas as outras
   - Deve ser deployada por último

---

## 🎯 RESUMO DOS DEPLOYS

| # | Item | Tipo | Prioridade | Status |
|---|------|------|------------|--------|
| 1 | Migração SQL | SQL | 🔴 Crítica | ⚠️ Pendente |
| 2 | fetch-google-maps | Edge Function | 🔴 Crítica | ⚠️ Pendente |
| 3 | fetch-overpass-coordinates | Edge Function | 🔴 Crítica | ⚠️ Pendente |

**Total:** 3 deploys obrigatórios

---

## ✅ COMANDOS DE DEPLOY COMPLETOS

```bash
# 1. Aplicar migração SQL
supabase db push

# 2. Deploy fetch-overpass-coordinates
supabase functions deploy fetch-overpass-coordinates

# 3. Deploy fetch-google-maps
supabase functions deploy fetch-google-maps

# 4. Verificar logs
supabase functions logs fetch-google-maps --tail
supabase functions logs fetch-overpass-coordinates --tail
```

---

## 🎉 CONCLUSÃO

**Total de Deploys Necessários:** 3

1. ✅ **Migração SQL** (obrigatória)
2. ✅ **fetch-overpass-coordinates** (obrigatória)
3. ✅ **fetch-google-maps** (obrigatória)

**Ordem:** SQL → fetch-overpass-coordinates → fetch-google-maps

**Status:** ⚠️ **TODOS OS DEPLOYS SÃO OBRIGATÓRIOS**

Sistema não funcionará corretamente sem aplicar todos os 3 deploys.

