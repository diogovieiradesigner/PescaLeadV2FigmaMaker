# 🔧 Debug de Deploy - Comandos Úteis

## 🧪 Testar Build Localmente (Antes de fazer deploy)

### 1. Instalar dependências:
```bash
npm install
```

### 2. Build de produção:
```bash
npm run build
```

### 3. Verificar output:
```bash
ls -la dist/
# Deve mostrar:
# - index.html
# - assets/
```

### 4. Preview local:
```bash
npm run preview
# Abre em http://localhost:4173
```

---

## 🐳 Testar Docker Localmente

### 1. Build da imagem:
```bash
docker build -t pesca-lead-crm:test .
```

### 2. Rodar container:
```bash
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=https://seu-projeto.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=sua-chave \
  pesca-lead-crm:test
```

### 3. Testar:
```bash
open http://localhost:8080
# ou
curl http://localhost:8080
```

### 4. Ver logs:
```bash
docker logs -f <container-id>
```

### 5. Entrar no container:
```bash
docker exec -it <container-id> sh

# Dentro do container:
ls -la /usr/share/nginx/html/
cat /etc/nginx/conf.d/default.conf
```

### 6. Limpar:
```bash
docker stop <container-id>
docker rm <container-id>
docker rmi pesca-lead-crm:test
```

---

## 🔍 Debug no Coolify

### Ver logs em tempo real:
```
Coolify → Applications → Pesca Lead → Logs
```

### Forçar rebuild:
```
Coolify → Applications → Pesca Lead → Force Rebuild → Deploy
```

### Verificar variáveis de ambiente:
```
Coolify → Applications → Pesca Lead → Environment Variables
```

### Ver status do container:
```
Coolify → Applications → Pesca Lead → Metrics
```

---

## 🖥️ Debug via SSH no Servidor

### 1. Conectar ao servidor:
```bash
ssh usuario@IP-DO-SERVIDOR
```

### 2. Listar containers:
```bash
docker ps -a | grep pesca-lead
```

### 3. Ver logs:
```bash
docker logs -f <container-id>
```

### 4. Verificar se está rodando:
```bash
docker inspect <container-id> | grep -A 5 "State"
```

### 5. Entrar no container:
```bash
docker exec -it <container-id> sh
```

### 6. Verificar arquivos dentro do container:
```bash
# Dentro do container:
ls -la /usr/share/nginx/html/
cat /usr/share/nginx/html/index.html | head -n 20
```

### 7. Testar nginx:
```bash
# Dentro do container:
nginx -t
# Deve retornar: syntax is ok
```

### 8. Ver processos:
```bash
# Dentro do container:
ps aux
# Deve mostrar nginx master e worker
```

---

## 🌐 Debug de Rede

### 1. Testar porta local:
```bash
# No servidor
curl http://localhost:80
```

### 2. Testar porta externa:
```bash
# Da sua máquina
curl http://IP-DO-SERVIDOR
```

### 3. Verificar DNS:
```bash
dig app.seu-dominio.com
nslookup app.seu-dominio.com
```

### 4. Testar SSL:
```bash
curl -I https://app.seu-dominio.com
openssl s_client -connect app.seu-dominio.com:443
```

---

## 📊 Verificar Build no Coolify

### Logs do Build (devem aparecer):

```bash
✓ Cloning repository...
✓ Dockerfile found
✓ Building image...

# Stage 1: Builder
Step 1/8 : FROM node:20-alpine AS builder
✓ Using cache
Step 2/8 : WORKDIR /app
✓ Running
Step 3/8 : COPY package.json package-lock.json* ./
✓ Running
Step 4/8 : RUN npm ci --legacy-peer-deps
✓ Running (pode demorar 2-3 min)
Step 5/8 : COPY . .
✓ Running
Step 6/8 : RUN npm run build
✓ Running (pode demorar 1-2 min)

# Stage 2: Nginx
Step 7/8 : FROM nginx:alpine
✓ Using cache
Step 8/8 : COPY --from=builder /app/dist /usr/share/nginx/html
✓ Running

✓ Image built successfully
✓ Starting container...
✓ Container started
✓ Health check: OK
✓ Deploy complete!
```

---

## ❌ Erros Comuns e Soluções

### Erro: "Module not found: Error: Can't resolve 'X'"

**Causa:** Dependência faltando em package.json

**Solução:**
```bash
npm install X
git add package.json package-lock.json
git commit -m "fix: add missing dependency"
git push
```

---

### Erro: "TypeScript error: Cannot find name 'X'"

**Causa:** Types faltando

**Solução:**
```bash
npm install --save-dev @types/X
git add package.json package-lock.json
git commit -m "fix: add types for X"
git push
```

---

### Erro: "VITE_SUPABASE_URL is not defined"

**Causa:** Env vars não estão disponíveis no build

**Verificar:**
```bash
# No Coolify → Environment Variables
# Deve ter VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# Nota: As env vars VITE_* são injetadas durante o BUILD
# Se mudá-las, precisa fazer REBUILD completo
```

---

### Erro: "nginx: [emerg] host not found in upstream"

**Causa:** Problema no nginx.conf

**Solução:**
```bash
# Verificar nginx.conf no repositório
cat nginx.conf

# Deve ter:
server {
    listen 80;
    root /usr/share/nginx/html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Build funciona mas site não carrega

**Verificar:**
```bash
# 1. Container está rodando?
docker ps | grep pesca-lead

# 2. Porta está mapeada?
docker port <container-id>
# Deve mostrar: 80/tcp -> 0.0.0.0:80

# 3. Nginx está respondendo?
curl http://localhost
# Deve retornar HTML

# 4. Firewall bloqueando?
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 🔄 Rebuild Completo (Sem Cache)

### No Coolify:
```
1. Applications → Pesca Lead
2. Settings → Force Rebuild: ✅
3. Deploy
```

### Via CLI (se tiver acesso SSH):
```bash
# Parar container
docker stop <container-id>

# Remover container
docker rm <container-id>

# Remover imagem
docker rmi pesca-lead-crm

# Build sem cache
docker build --no-cache -t pesca-lead-crm .

# Rodar novo container
docker run -d -p 80:80 pesca-lead-crm
```

---

## 📝 Checklist de Debug

Quando algo não funciona, verificar nesta ordem:

1. **Build Local:**
   - [ ] `npm install` funciona?
   - [ ] `npm run build` funciona?
   - [ ] `dist/` foi criado?
   - [ ] `dist/index.html` existe?

2. **Docker Local:**
   - [ ] `docker build` funciona?
   - [ ] Container inicia?
   - [ ] `curl http://localhost:8080` funciona?

3. **Coolify:**
   - [ ] Build Pack = Dockerfile?
   - [ ] Build completou sem erros?
   - [ ] Container está "Running"?
   - [ ] Health check está "Healthy"?

4. **Variáveis de Ambiente:**
   - [ ] VITE_SUPABASE_URL está definido?
   - [ ] VITE_SUPABASE_ANON_KEY está definido?
   - [ ] Valores estão corretos?

5. **Rede:**
   - [ ] `curl http://IP-SERVIDOR` funciona?
   - [ ] DNS está apontando corretamente?
   - [ ] Porta 80 está aberta no firewall?

6. **SSL:**
   - [ ] Certificado foi provisionado?
   - [ ] `https://` funciona?
   - [ ] Sem erros de certificado?

---

## 🎯 Próximos Passos Após Deploy Funcionar

1. ✅ Testar login
2. ✅ Testar conexão com Supabase
3. ✅ Verificar se dados carregam no dashboard
4. ✅ Testar chat
5. ✅ Testar kanban
6. ✅ Configurar monitoramento (UptimeRobot)
7. ✅ Configurar backups automáticos

---

## 📞 Última Opção: Logs Completos

Se nada funcionar, envie estes logs:

### 1. Logs do Build:
```
Coolify → Deploy History → Selecionar último deploy → View Logs
```

### 2. Logs do Container:
```bash
docker logs <container-id> > container-logs.txt
```

### 3. Configuração:
```bash
# package.json
cat package.json

# Dockerfile
cat Dockerfile

# nginx.conf
cat nginx.conf

# Env vars (sem os valores secretos)
env | grep VITE
```

---

**Com estes comandos, você conseguirá debugar 99% dos problemas! 🔧**
