# Supabase Self-Hosted - PESCA LEAD

## 🎯 Objetivo

Migração do Supabase Cloud para Supabase Self-Hosted rodando no Coolify/Hostinger VPS.

**Branch:** `migration/supabase-selfhosted`

## ⚠️ IMPORTANTE

- O Supabase Cloud **permanece 100% funcional** durante toda a migração
- Esta é uma instalação paralela para testes
- **NÃO** troque produção até validar completamente

## 📋 Pré-requisitos

1. VPS Hostinger com recursos adequados:
   - CPU: 4-8 vCPUs
   - RAM: 16-32GB
   - Storage: 200-500GB SSD

2. Coolify instalado e funcionando em https://ctl.pescalead.com.br

3. Docker e Docker Compose instalados no VPS

4. DNS configurado para `supabase.pescalead.com.br` (apontando para o VPS)

## 🚀 Setup Inicial

### 1. Configurar Variáveis de Ambiente

```bash
# Copiar o arquivo de exemplo
cp .env.example .env

# Editar o arquivo .env e preencher os valores
nano .env
```

**Valores críticos que precisam ser IGUAIS ao Supabase Cloud:**
- `JWT_SECRET` - Obter do Dashboard Supabase > Settings > API
- `ANON_KEY` - Obter do Dashboard Supabase > Settings > API
- `SERVICE_ROLE_KEY` - Obter do Dashboard Supabase > Settings > API

**Gerar novos valores para:**
- `POSTGRES_PASSWORD` - Use: `openssl rand -base64 32`
- `REALTIME_SECRET_KEY_BASE` - Use: `openssl rand -base64 64`

### 2. Atualizar Kong Configuration

```bash
# Editar volumes/kong.yml
nano volumes/kong.yml

# Substituir <REPLACE_WITH_SERVICE_ROLE_KEY> pelo seu SERVICE_ROLE_KEY
```

### 3. Iniciar os Serviços (Local)

```bash
# Subir todos os containers
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 4. Acessar o Studio

Abra no navegador: http://localhost:3000

## 📊 Containers e Serviços

| Container | Porta | Descrição |
|-----------|-------|-----------|
| supabase-db | 5432 | PostgreSQL 15 |
| supabase-studio | 3000 | Dashboard Supabase |
| supabase-kong | 8000, 8443 | API Gateway |
| supabase-auth | - | GoTrue (Auth) |
| supabase-rest | - | PostgREST (API) |
| supabase-realtime | - | Realtime Server |
| supabase-storage | - | Storage API |
| supabase-functions | - | Edge Functions Runtime |
| supabase-meta | - | Database Metadata |
| supabase-imgproxy | - | Image Transformation |
| supabase-vector | - | Observability |

## 🔄 Próximos Passos

### 1. Backup do Supabase Cloud

Siga as instruções em: `../docs/BACKUP_GUIDE.md`

### 2. Restaurar Database

```bash
# Conectar ao container
docker-compose exec db psql -U postgres -d postgres

# Ou restaurar de dump
docker-compose exec -T db pg_restore -U postgres -d postgres < backup.dump
```

### 3. Deploy Edge Functions

```bash
# Copiar funções para o volume
cp -r ../pescalead_usuario/supabase/functions/* volumes/functions/

# Restart container
docker-compose restart functions
```

### 4. Testar Conectividade

```bash
# Teste auth
curl -X POST http://localhost:8000/auth/v1/signup \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# Teste database
curl "http://localhost:8000/rest/v1/users?select=id,email&limit=5" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

## 🛠️ Comandos Úteis

### Gerenciamento de Containers

```bash
# Parar todos
docker-compose down

# Reiniciar todos
docker-compose restart

# Ver logs de um serviço específico
docker-compose logs -f db
docker-compose logs -f functions

# Verificar recursos
docker stats
```

### Backup Manual

```bash
# Database
docker-compose exec db pg_dump -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Storage
rsync -av volumes/storage/ backup_storage_$(date +%Y%m%d)/
```

### Restore Database

```bash
# From SQL file
docker-compose exec -T db psql -U postgres -d postgres < backup.sql

# From dump file
docker-compose exec -T db pg_restore -U postgres -d postgres < backup.dump
```

## 🚨 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs <service-name>

# Verificar variáveis de ambiente
docker-compose config
```

### Database connection failed

```bash
# Verificar se o database está pronto
docker-compose exec db pg_isready -U postgres

# Conectar manualmente
docker-compose exec db psql -U postgres -d postgres
```

### Edge functions não respondem

```bash
# Verificar se as funções estão no volume
ls -la volumes/functions/

# Ver logs
docker-compose logs -f functions
```

## 📚 Documentação

- [Plano de Migração Completo](../docs/MIGRATION_PLAN.md)
- [Guia de Backup](../docs/BACKUP_GUIDE.md)
- [Supabase Self-Hosting Docs](https://supabase.com/docs/guides/self-hosting)

## ⚡ Performance

### Recursos Recomendados por Número de Usuários

| Usuários | vCPUs | RAM | Storage |
|----------|-------|-----|---------|
| < 100 | 4 | 16GB | 200GB |
| 100-500 | 8 | 32GB | 500GB |
| 500+ | 16 | 64GB | 1TB |

### Monitoring

```bash
# Ver uso de recursos
docker stats

# Ver espaço em disco
df -h

# Ver conexões no database
docker-compose exec db psql -U postgres -d postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🔐 Segurança

### Secrets Management

**NUNCA** commitar o arquivo `.env` no git!

Ele já está no `.gitignore`, mas sempre verifique:

```bash
git status | grep .env
# Não deve aparecer nada
```

### Firewall

Certifique-se que apenas as portas necessárias estão abertas:
- 8000 (Kong HTTP)
- 8443 (Kong HTTPS)
- 3000 (Studio - apenas em dev/staging)
- 5432 (PostgreSQL - apenas se necessário para ferramentas externas)

## 📞 Suporte

Em caso de problemas durante a migração:
1. Verificar logs: `docker-compose logs -f`
2. Consultar o plano de migração
3. Fazer rollback se necessário (instruções no plano)

---

**Status:** 🚧 Em desenvolvimento na branch `migration/supabase-selfhosted`

**Última atualização:** 2026-01-03
