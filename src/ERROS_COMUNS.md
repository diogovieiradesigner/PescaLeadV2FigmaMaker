# ❌ Erros Comuns e Soluções Rápidas

## 🔴 ERRO MAIS COMUM: Build Pack errado

### ❌ Sintoma:
```
Error: nixpacks plan not found
Error: Unable to detect language
Build failed
```

### ✅ Solução:
```
1. Coolify → Applications → Pesca Lead
2. Aba "Configuration"
3. Build Pack: Trocar de "Nixpacks" para "Dockerfile"
4. Save
5. Redeploy
```

**⚠️ IMPORTANTE:** Se o Build Pack estiver em "Nixpacks", o deploy VAI FALHAR!

---

## 🔴 ERRO 2: npm ci falha

### ❌ Sintoma:
```
npm ERR! code ENOLOCK
npm ERR! enoent Could not read package-lock.json
```

### ✅ Solução:
```bash
# No seu computador:
npm install
git add package-lock.json
git commit -m "fix: add package-lock.json"
git push
```

---

## 🔴 ERRO 3: Build Vite falha

### ❌ Sintoma:
```
Error: Cannot find module 'vite'
npm ERR! Missing script: "build"
```

### ✅ Solução:
```bash
# Verificar package.json tem:
"scripts": {
  "build": "tsc && vite build"
}

# Se não tiver, adicionar e fazer push
git add package.json
git commit -m "fix: add build script"
git push
```

---

## 🔴 ERRO 4: TypeScript errors no build

### ❌ Sintoma:
```
error TS2307: Cannot find module './App'
error TS2345: Argument of type 'X' is not assignable to 'Y'
```

### ✅ Solução Rápida (Temporária):
```typescript
// Em tsconfig.json, adicionar:
{
  "compilerOptions": {
    "skipLibCheck": true,
    "noEmit": false  // Temporário para não bloquear build
  }
}
```

### ✅ Solução Correta:
```bash
# Corrigir os erros de tipo no código
# Depois fazer:
git add .
git commit -m "fix: corrigir erros TypeScript"
git push
```

---

## 🔴 ERRO 5: Variáveis de ambiente não funcionam

### ❌ Sintoma:
```javascript
// No console do navegador:
VITE_SUPABASE_URL is undefined
Cannot read properties of undefined
```

### ✅ Solução:
```
1. Coolify → Environment Variables
2. Verificar que TODAS as VITE_* estão definidas:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

3. ⚠️ Mudou env var? Precisa REBUILD completo!
   - Settings → Force Rebuild: ✅
   - Deploy
```

**IMPORTANTE:** Env vars são injetadas NO BUILD, não no runtime!

---

## 🔴 ERRO 6: Site carrega mas tudo em branco

### ❌ Sintoma:
- Site carrega (200 OK)
- Tela branca
- Console mostra erros de JS

### ✅ Solução:
```bash
# Abrir console (F12) e ver o erro exato

# Geralmente é:
1. Variável de ambiente faltando
2. Erro de importação
3. Erro no Supabase client

# Verificar env vars no Coolify
# Verificar logs do build
```

---

## 🔴 ERRO 7: 404 nas rotas do app

### ❌ Sintoma:
```
- Home (/) funciona ✅
- /dashboard retorna 404 ❌
- /chat retorna 404 ❌
```

### ✅ Solução:
```bash
# Verificar nginx.conf tem:
location / {
    try_files $uri $uri/ /index.html;
}

# Se não tiver, adicionar e fazer push
```

**Já está correto no nginx.conf fornecido!** ✅

---

## 🔴 ERRO 8: Cannot connect to Supabase

### ❌ Sintoma:
```javascript
Failed to fetch
Network error
Supabase client error
```

### ✅ Checklist:
```bash
1. ✅ VITE_SUPABASE_URL está correto?
   Deve ser: https://xxxxx.supabase.co (com https://)

2. ✅ VITE_SUPABASE_ANON_KEY está correto?
   Deve ser JWT longo (eyJhbG...)

3. ✅ Projeto Supabase está ativo?
   Verificar em: app.supabase.com

4. ✅ RLS policies configuradas?
   Testar no SQL Editor do Supabase

5. ✅ CORS configurado?
   Já está OK no Supabase por padrão
```

---

## 🔴 ERRO 9: Build muito lento (> 10 min)

### ❌ Sintoma:
```
npm ci demora 5+ minutos
Build total > 10 minutos
```

### ✅ Solução:
```dockerfile
# Já otimizado no Dockerfile:
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps  # Cache aqui
COPY . .  # Código só depois

# Isso permite Docker cachear a layer de dependências
```

---

## 🔴 ERRO 10: SSL não provisiona

### ❌ Sintoma:
```
Domain configured but no SSL
Certificate error
ERR_CERT_COMMON_NAME_INVALID
```

### ✅ Solução:
```bash
1. Verificar DNS está apontando:
   dig app.seu-dominio.com
   # Deve retornar IP do servidor

2. Aguardar propagação DNS (5-30 min)

3. No Coolify:
   Domains → Reprovisionar SSL

4. Porta 80 e 443 abertas?
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
```

---

## 🔴 ERRO 11: Deploy completa mas container não inicia

### ❌ Sintoma:
```
Build: ✅ Success
Container: ❌ Exited (1)
Status: Unhealthy
```

### ✅ Debug:
```bash
# Ver logs do container:
docker logs <container-id>

# Comum:
- nginx: [emerg] bind() to 0.0.0.0:80 failed (Address already in use)
  → Outra coisa usando porta 80
  
- nginx: [emerg] host not found in upstream
  → Problema no nginx.conf

# Entrar no container:
docker exec -it <container-id> sh
ls -la /usr/share/nginx/html/  # Arquivos estão lá?
nginx -t  # Configuração OK?
```

---

## 🔴 ERRO 12: Webhook não funciona (CI/CD)

### ❌ Sintoma:
```
git push origin main
→ Nada acontece no Coolify
```

### ✅ Solução:
```
1. GitHub → Settings → Webhooks
   Deve ter webhook do Coolify

2. Clicar no webhook → Recent Deliveries
   Ver se há erros

3. No Coolify:
   Settings → Regenerar Webhook
   
4. Testar:
   echo "test" >> README.md
   git add . && git commit -m "test" && git push
```

---

## 🔴 ERRO 13: Imagem Docker muito grande (> 500MB)

### ❌ Sintoma:
```
Image size: 1.2GB
Deploy muito lento
```

### ✅ Solução:
```dockerfile
# Já otimizado no Dockerfile:
FROM node:20-alpine  # Alpine = mínimo
# Multi-stage build = só copia dist/
# Resultado: ~50MB ✅
```

---

## 🔴 ERRO 14: Memory ou CPU alto

### ❌ Sintoma:
```
Container using 90%+ CPU
Container using 90%+ Memory
Site lento
```

### ✅ Solução:
```bash
# Verificar no Coolify → Metrics

# Nginx é leve, não deveria usar muito
# Se estiver alto:

1. Verificar logs: algum erro em loop?
2. Reiniciar container
3. Aumentar recursos do servidor
4. Considerar usar CDN (Cloudflare)
```

---

## 🔴 ERRO 15: Cannot read package.json

### ❌ Sintoma:
```
Error: Cannot find module 'package.json'
ENOENT: no such file or directory
```

### ✅ Solução:
```bash
# Verificar se package.json está no ROOT do repositório
git ls-tree -r HEAD --name-only | grep package.json

# Se não estiver:
git add package.json
git commit -m "fix: add package.json to root"
git push
```

---

## 📋 Checklist de Verificação

Quando algo falhar, verificar NESTA ORDEM:

```
1. ✅ Build Pack = Dockerfile?
2. ✅ package.json no root?
3. ✅ Dockerfile no root?
4. ✅ nginx.conf no root?
5. ✅ Todas env vars definidas?
6. ✅ VITE_* corretos?
7. ✅ Build local funciona?
8. ✅ Logs do Coolify sem erros?
9. ✅ Container está "Running"?
10. ✅ Health check "Healthy"?
```

---

## 🆘 Último Recurso: Rebuild do Zero

Se NADA funcionar:

```bash
# 1. Parar e remover tudo no Coolify
Applications → Pesca Lead → Settings → Delete

# 2. Remover repositório do GitHub
git remote remove origin

# 3. Criar novo repo
git remote add origin https://github.com/usuario/pesca-lead-NEW.git
git push -u origin main

# 4. Criar nova aplicação no Coolify
+ New Resource → ...

# 5. Configurar tudo novamente
⚠️ Build Pack = Dockerfile
Env vars
Deploy
```

---

## 📞 Pedir Ajuda

Se ainda tiver problemas, envie:

```
1. Logs completos do build (Coolify → Logs)
2. Logs do container (docker logs)
3. Screenshot das configurações (Build Pack, Env Vars)
4. Output de: npm run build (local)
5. Versão do Node: node -v
```

---

**Com estas soluções, 99% dos problemas serão resolvidos! 🔧**
