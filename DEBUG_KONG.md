# 🔍 Debug: Kong + Edge Functions

**Situação:** Frontend corrigido, mas ainda erro 500
**Próximo passo:** Verificar Kong E Edge Functions no servidor

---

## ✅ Confirmado (Frontend está correto)

- ✅ Headers `apikey` + `Authorization` presentes
- ✅ URLs usando `VITE_SUPABASE_URL`
- ✅ Builds passando
- ✅ Login funciona (config carregada)

## ❌ Problemas Identificados

### 1. WebSocket Realtime Falhando
```
WebSocket connection to 'wss://supabase.pescalead.com.br/realtime/v1/websocket' failed
```

**Causa:** Kong também pode estar bloqueando WebSocket

### 2. kanban-api Retorna 500
```
GET /functions/v1/kanban-api/.../leads → 500 Internal Server Error
Erro: "Unexpected end of JSON input"
```

**Causa possível:**
- Edge Function sem variáveis de ambiente
- Edge Function crashando
- Kong retornando HTML de erro

---

## 🔧 Comandos para Debug (Via SSH)

### 1. Verificar se Edge Functions estão rodando

```bash
ssh root@72.60.138.226

# Ver containers
docker ps | grep edge-functions

# Ver logs da Edge Function kanban-api
docker logs 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w --tail 100

# Procurar por erros
docker logs 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w --tail 100 | grep -i error
```

### 2. Verificar variáveis de ambiente

```bash
cd /data/coolify/services/e400cgo4408ockg8oco4sk8w

# Ver env vars do Edge Runtime
docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w env | grep -E "SUPABASE|JWT|ANON"

# Deve ter:
# SUPABASE_URL=https://supabase.pescalead.com.br
# SUPABASE_ANON_KEY=eyJhbGci...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 3. Testar Edge Function direto (Bypass Kong)

```bash
# Testar kanban-api SEM passar pelo Kong
docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w \
  curl -s http://localhost:9999/kanban-api/health

# Esperado: {"status":"ok","service":"kanban-api"}
# Se retornar erro: problema na Edge Function
# Se retornar OK: problema no Kong
```

### 4. Verificar logs do Kong

```bash
# Ver últimos 100 logs
docker logs kong-e400cgo4408ockg8oco4sk8w --tail 100

# Filtrar erros
docker logs kong-e400cgo4408ockg8oco4sk8w --tail 200 | grep -E "error|500|fail"

# Ver configuração atual
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong config db_export
```

---

## 🎯 Possíveis Causas e Soluções

### Causa 1: Edge Functions sem Environment Variables

**Sintoma:** Erro 500 + "Missing SUPABASE_URL"

**Solução:**
```bash
cd /data/coolify/services/e400cgo4408ockg8oco4sk8w

# Verificar se .env tem as variáveis
cat .env | grep -E "SUPABASE_URL|ANON_KEY|SERVICE_ROLE"

# Se faltar, adicionar:
echo "SUPABASE_URL=https://supabase.pescalead.com.br" >> .env
echo "SUPABASE_ANON_KEY=eyJhbGci..." >> .env

# Reiniciar Edge Functions
docker restart 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w
```

### Causa 2: Kong bloqueando requisições

**Sintoma:** Teste direto funciona, mas via Kong retorna 500/401

**Solução:** Aplicar kong-custom.yml (ver INSTRUCOES_KONG_SSH.md)

### Causa 3: Realtime WebSocket bloqueado

**Sintoma:** WebSocket connection failed

**Solução:**
```bash
# Verificar se Realtime está rodando
docker ps | grep realtime

# Ver logs
docker logs <realtime-container-id> --tail 50

# Kong pode estar bloqueando WebSocket
# Adicionar ao kong.yml:
routes:
  - name: realtime-websocket
    paths: [/realtime/v1/websocket]
    plugins:
      - name: cors
        config:
          origins: ["*"]
```

---

## 📊 Diagnóstico Completo

Execute estes comandos **nesta ordem** e me envie os resultados:

```bash
# 1. Status dos containers
docker ps | grep supabase

# 2. Logs Edge Functions (últimas 50 linhas)
docker logs 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w --tail 50

# 3. Teste direto Edge Function
docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w \
  curl -s http://localhost:9999/kanban-api/health

# 4. Environment variables
docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w env | grep SUPABASE

# 5. Logs Kong (erros apenas)
docker logs kong-e400cgo4408ockg8oco4sk8w --tail 100 | grep -E "error|500"
```

**Com esses resultados, posso identificar se é:**
- A) Problema Kong (configuração)
- B) Problema Edge Functions (env vars ou código)
- C) Problema Realtime (websocket)

---

## 🚀 Ação Rápida

**Para resolver AGORA (15 min via SSH):**

1. Conectar: `ssh root@72.60.138.226`
2. Executar diagnóstico acima
3. Se Edge Functions funcionam direto → problema é Kong → aplicar kong-custom.yml
4. Se Edge Functions não funcionam → problema é env vars → adicionar ao .env

**Me envie o output dos 5 comandos acima e eu te digo exatamente o que fazer!**

---

**Última atualização:** 2026-01-05 13:55
