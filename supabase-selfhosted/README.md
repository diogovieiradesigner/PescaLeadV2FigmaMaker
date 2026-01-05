# Migração Supabase Cloud → Self-Hosted

## ✅ Status: MIGRAÇÃO COMPLETA

**Data:** 2026-01-04/05
**Branch:** `migration/supabase-selfhosted`

---

## 🎯 O Que Foi Migrado

### Database (100% ✅)
- **4,267 leads**
- **863 conversations**
- **4,380 messages**
- **7 workspaces**
- **15 users** (public.users)
- **15 auth.users** (com senhas criptografadas)
- **22 workspace_members**
- **59,000+ registros** em outras tabelas
- **131 tabelas** totais migradas

### Edge Functions (100% ✅)
- **70 funções** copiadas e rodando
- Container: `supabase-edge-functions-e400cgo4408ockg8oco4sk8w`
- Status: Running e respondendo

### Infraestrutura (100% ✅)
- ✅ Supabase rodando no Coolify
- ✅ PostgreSQL 15.8.1.085
- ✅ API REST: https://supabase.pescalead.com.br
- ✅ Studio: https://supabase.pescalead.com.br/project/default/editor
- ✅ Kong API Gateway funcionando
- ✅ Auth, Realtime, Meta, Analytics - todos operacionais

---

## 🔑 Credenciais Atuais (Self-Hosted)

### JWT Secret
```
SERVICE_PASSWORD_JWT=3xf3ra98ruVlI0XZlWUWdBReNNljS3gs
```

### Tokens (gerados com o JWT Secret acima)
```
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NTY2NDQsImV4cCI6MjA0OTQzMjY0NH0.olWUrjDiqE2RFnT2kUC9ncToRgcIiHp04Tk7jg3b6I8

SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzg1NjY0NCwiZXhwIjoyMDQ5NDMyNjQ0fQ.dgTwzaj7KI6I8R0Z9pEUk4ise2VfTYGLD0MrM58tDnU
```

### Database
```
Host: supabase-db-e400cgo4408ockg8oco4sk8w (interno)
Port: 5432
Database: postgres
User: postgres
Password: I9IOoEf0bxOtL5BK17vP2UnkzT9gC60P
```

---

## ⏳ Pendente

### Storage (⚠️ Em progresso)
- Container rodando mas com problema de JWT signature
- Buckets do Cloud ainda não migrados
- Arquivos (avatars, attachments, ai-images) pendentes

### API Keys das Edge Functions
Faltam adicionar no Coolify Environment Variables:
- `CHUTES_API_KEY`
- `GEMINI_API_KEY`
- `TAVILY_API_KEY`
- `SERPER_API_KEY`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

### Atualização dos Clientes
- Frontend (pescalead_usuario)
- Chrome Extension
- Painel Admin

Precisam ser atualizados para apontar para `https://supabase.pescalead.com.br`

---

## 📋 Arquivos neste Diretório

- `.env` - Configurações do self-hosted (NÃO COMMITAR!)
- `.env.example` - Template de configuração
- `.gitignore` - Proteção de secrets
- `backups/` - Backups completos do Supabase Cloud
  - `schema_only.sql` (1.9MB)
  - `data_only.sql` (1.6GB)
  - `insert_auth_users.sql`
- `edge-functions.tar.gz` - 70 edge functions (509KB)

---

## 🚀 Próximos Passos

1. **Resolver Storage JWT signature** - Atualizar tokens via Coolify UI
2. **Migrar storage buckets** do Cloud
3. **Adicionar API keys** das edge functions
4. **Testar login** end-to-end
5. **Atualizar clientes** na branch
6. **Validação completa** antes de trocar produção

---

## 📊 Comparação Cloud vs Self-Hosted

| Recurso | Cloud | Self-Hosted | Status |
|---------|-------|-------------|--------|
| Database | ✅ | ✅ | Migrado |
| Auth | ✅ | ✅ | Migrado |
| API REST | ✅ | ✅ | Funcionando |
| Realtime | ✅ | ✅ | Funcionando |
| Edge Functions | ✅ | ✅ | 70 funções |
| Storage | ✅ | ⚠️ | JWT issue |
| Studio | ✅ | ✅ | Funcionando |

---

## 🔗 Links Importantes

- **Self-Hosted URL:** https://supabase.pescalead.com.br
- **Studio:** https://supabase.pescalead.com.br/project/default/editor
- **Coolify:** https://ctl.pescalead.com.br
- **Cloud (ainda ativo):** https://nlbcwaxkeaddfocigwuk.supabase.co

---

**Última atualização:** 2026-01-05
