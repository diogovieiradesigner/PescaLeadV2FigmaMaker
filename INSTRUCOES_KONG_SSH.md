# 🔧 Instruções: Configurar Kong via SSH

**Pré-requisito:** Acesso SSH ao servidor (Termius)
**Tempo estimado:** 15-30 minutos
**Risco:** BAIXO (tem rollback fácil)

---

## 📋 Checklist Antes de Começar

- [ ] Acesso SSH funcionando (testar: `ssh root@72.60.138.226`)
- [ ] Arquivo `KONG_CONFIG.yml` disponível (copiar conteúdo)
- [ ] Backup automático será feito (script inclui)
- [ ] Horário: Preferencialmente fora de pico (menos usuários)

---

## 🚀 Passo a Passo

### 1. Conectar ao Servidor

```bash
ssh root@72.60.138.226
```

**Confirmar:** Prompt muda para `root@servidor`

---

### 2. Navegar para Diretório do Supabase

```bash
cd /data/coolify/services/e400cgo4408ockg8oco4sk8w
pwd  # Confirmar: /data/coolify/services/e400cgo4408ockg8oco4sk8w
```

---

### 3. Backup Automático

```bash
# Backup com timestamp
BACKUP_DIR="/root/backups/kong-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copiar .env atual
cp .env "$BACKUP_DIR/env.backup"

# Copiar docker-compose
cp docker-compose.yml "$BACKUP_DIR/docker-compose.backup"

# Confirmar backup
ls -lh "$BACKUP_DIR"

echo "✅ Backup salvo em: $BACKUP_DIR"
```

---

### 4. Criar kong-custom.yml

**Opção A: Via nano (recomendado)**
```bash
nano kong-custom.yml
```

Então:
1. Copiar TODO o conteúdo do arquivo `KONG_CONFIG.yml` deste repositório
2. Colar no nano (Ctrl+Shift+V ou botão direito)
3. Salvar: Ctrl+O, Enter
4. Sair: Ctrl+X

**Opção B: Via cat + heredoc**
```bash
cat > kong-custom.yml <<'EOF'
# Colar conteúdo do KONG_CONFIG.yml aqui
EOF
```

**Verificar:**
```bash
# Ver primeiras linhas
head -20 kong-custom.yml

# Confirmar: deve mostrar "_format_version: 2.1"
```

---

### 5. Importar Configuração no Kong

```bash
# Importar (pode levar 5-10 segundos)
docker exec -i kong-e400cgo4408ockg8oco4sk8w \
  kong config db_import /data/coolify/services/e400cgo4408ockg8oco4sk8w/kong-custom.yml

# Resultado esperado:
# "migrated to 2.1"
# "config imported successfully"
```

**Se der erro:**
- Verificar sintaxe YAML (espaços, hífens)
- Ver logs: `docker logs kong-e400cgo4408ockg8oco4sk8w --tail 20`

---

### 6. Reload Kong (Sem Downtime)

```bash
# Reload (< 1 segundo)
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong reload

# Resultado esperado:
# "reload complete"
```

---

### 7. Verificar Logs

```bash
# Ver últimas 50 linhas
docker logs kong-e400cgo4408ockg8oco4sk8w --tail 50

# Procurar por:
# ✅ "proxy upstream: http://supabase-edge-functions:9999"
# ✅ Sem linhas "[error]"
# ✅ "reload complete"
```

**Se tiver erros:**
```bash
# Ver erro completo
docker logs kong-e400cgo4408ockg8oco4sk8w --tail 200 | grep -i error

# Se necessário, reverter (ver seção Rollback)
```

---

### 8. Testar Health Check (No Servidor)

```bash
# Testar direto do servidor
curl -s https://supabase.pescalead.com.br/functions/v1/kanban-api/health \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NTY2NDQsImV4cCI6MjA0OTQzMjY0NH0.olWUrjDiqE2RFnT2kUC9ncToRgcIiHp04Tk7jg3b6I8"

# Resultado esperado:
# {"status":"ok","service":"kanban-api","version":"2.0.0"}
```

**Se retornar 401 ainda:**
- Kong não aplicou configuração corretamente
- Verificar se kong-custom.yml está no path correto
- Tentar reiniciar Kong: `docker restart kong-e400cgo4408ockg8oco4sk8w`

---

### 9. Testar do Windows (Local)

```bash
# Voltar ao Windows PowerShell/CMD
exit  # Sair do SSH

# Executar script de teste
cd "c:\Users\Asus\Pictures\PESCA LEAD\pescalead_usuario"
node test-edge-function.mjs
```

**Resultado esperado:**
```
✅ Health check passou! Edge Function está respondendo.
Status: 200 OK
Resposta JSON: {
  "status": "ok",
  "service": "kanban-api",
  "version": "2.0.0"
}
```

---

## 🔄 Rollback (Se Necessário)

### Se algo der errado, reverter:

```bash
# SSH no servidor
ssh root@72.60.138.226
cd /data/coolify/services/e400cgo4408ockg8oco4sk8w

# Encontrar último backup
ls -lt /root/backups/ | head -5

# Restaurar .env
BACKUP_DIR="/root/backups/kong-YYYYMMDD_HHMMSS"  # Usar timestamp correto
cp "$BACKUP_DIR/env.backup" .env

# Reiniciar Kong
docker restart kong-e400cgo4408ockg8oco4sk8w

# Verificar
docker logs kong-e400cgo4408ockg8oco4sk8w --tail 50
```

**Tempo de rollback:** < 2 minutos

---

## 📝 Troubleshooting

### Problema: Kong não inicia após importação

**Solução:**
```bash
# Ver logs completos
docker logs kong-e400cgo4408ockg8oco4sk8w

# Se syntax error no YAML:
nano kong-custom.yml  # Corrigir
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong config db_import kong-custom.yml
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong reload
```

### Problema: Health check ainda retorna 401

**Diagnóstico:**
```bash
# 1. Verificar se configuração foi aplicada
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong config db_export

# 2. Ver rotas registradas
docker exec -i kong-e400cgo4408ockg8oco4sk8w \
  curl -s http://localhost:8001/routes | jq '.data[] | {name, paths}'

# 3. Testar Edge Function direto (bypass Kong)
docker exec -i 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w \
  curl -s http://localhost:9999/kanban-api/health
```

### Problema: Rate limiting muito restritivo

**Ajustar limites:**
```bash
nano kong-custom.yml
# Aumentar valores de minute, hour, day
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong config db_import kong-custom.yml
docker exec -i kong-e400cgo4408ockg8oco4sk8w kong reload
```

---

## ✅ Validação Final

Após aplicar configuração, executar:

```bash
# No Windows
cd "c:\Users\Asus\Pictures\PESCA LEAD\pescalead_usuario"
node test-edge-function.mjs

# Deve retornar:
# ✅ Health check: 200 OK
# ✅ make-server: 200 OK
```

Então testar a aplicação:
```bash
npm run dev
# 1. Fazer login
# 2. Abrir Kanban
# 3. Verificar que leads carregam
# 4. Console sem erros 401/500
```

**Se tudo OK:**
- ✅ FASE 2 Completa
- ✅ Migração 100% funcional
- ✅ Pronto para produção

---

## 📞 Comandos Úteis

```bash
# Ver status de todos containers
docker ps | grep supabase

# Restart Kong (se necessário)
docker restart kong-e400cgo4408ockg8oco4sk8w

# Ver uso de recursos
docker stats kong-e400cgo4408ockg8oco4sk8w --no-stream

# Monitorar logs em tempo real
docker logs kong-e400cgo4408ockg8oco4sk8w -f

# Testar rate limiting
for i in {1..35}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://supabase.pescalead.com.br/functions/v1/widget-chat \
    -H "apikey: <ANON_KEY>"
done
# Primeiras 30 → 200, depois → 429
```

---

**Próximo:** Após configurar Kong, atualizar `MIGRACAO_STATUS.md` para 100% ✅
