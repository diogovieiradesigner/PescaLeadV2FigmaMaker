# Solução: Conflito entre GitHub Actions e Cloudflare Pages Auto-Deploy

## 🔍 Problema Identificado

Há **dois sistemas de deploy** rodando simultaneamente:

1. **GitHub Actions** (`.github/workflows/deploy.yml`)
   - Faz build e deploy via `cloudflare/pages-action@v1`
   - Usa `wrangler.toml` para configuração
   - **Funciona corretamente** ✅

2. **Cloudflare Pages Auto-Deploy**
   - Detecta push para `main` e faz deploy automaticamente
   - Pode estar ignorando `_headers` ou aplicando headers padrão incorretos
   - **Está quebrando a página** ❌

## 🐛 Erro Específico

```
Refused to apply style from 'https://hub.pescalead.com.br/assets/index-C7bKrOXl.css' 
because its MIME type ('text/javascript') is not a supported stylesheet MIME type
```

**Causa**: O arquivo `build/_headers` tinha uma regra genérica `/assets/*` que aplicava `text/javascript` para **todos** os arquivos, incluindo CSS.

## ✅ Solução Aplicada

### 1. Corrigido `public/_headers`

Removida a regra genérica e adicionadas regras específicas:

```diff
- /assets/*
-   Content-Type: text/javascript
-   X-Content-Type-Options: nosniff

+ /assets/*.js
+   Content-Type: text/javascript
+   X-Content-Type-Options: nosniff
+
+ /assets/*.mjs
+   Content-Type: text/javascript
+   X-Content-Type-Options: nosniff

  /assets/*.css
    Content-Type: text/css
```

### 2. Atualizado `build/_headers`

O arquivo `build/_headers` foi atualizado manualmente para garantir que está correto antes do próximo deploy.

### 3. Adicionada Verificação no GitHub Actions

Adicionado step para verificar se o `_headers` está correto após o build:

```yaml
- name: Verify _headers file
  run: |
    echo "Verifying _headers file..."
    cat build/_headers || echo "ERROR: _headers file not found!"
    echo ""
    echo "Checking for CSS rule..."
    grep -q "/assets/\*\.css" build/_headers && echo "✅ CSS rule found" || echo "❌ CSS rule missing"
```

## 🎯 Recomendações

### Opção 1: Desabilitar Auto-Deploy do Cloudflare Pages (RECOMENDADO)

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages** > **pescaleadv2figmamaker**
3. Vá em **Settings** > **Builds & deployments**
4. Desabilite **"Automatic deployments"** ou configure para não fazer deploy automático
5. Mantenha apenas o GitHub Actions fazendo deploy

**Vantagens**:
- ✅ Controle total sobre quando fazer deploy
- ✅ Evita conflitos entre os dois sistemas
- ✅ GitHub Actions tem melhor integração com CI/CD
- ✅ Pode adicionar testes antes do deploy

### Opção 2: Manter Ambos, mas Garantir Configuração Correta

Se quiser manter ambos os sistemas:

1. **Garantir que `_headers` está correto** ✅ (já feito)
2. **Garantir que `wrangler.toml` está correto** ✅ (já feito)
3. **Configurar headers manualmente no Cloudflare Dashboard**:
   - Vá em **Settings** > **Headers**
   - Adicione manualmente:
     - Path: `/assets/*.css`
     - Header: `Content-Type`
     - Value: `text/css`

## 📋 Checklist de Verificação

Após o próximo deploy, verifique:

- [ ] `build/_headers` tem regras específicas (não genérica `/assets/*`)
- [ ] GitHub Actions está fazendo deploy corretamente
- [ ] Cloudflare Pages Auto-Deploy está desabilitado OU configurado corretamente
- [ ] Headers estão sendo aplicados corretamente (teste com `curl -I`)

## 🔧 Teste Manual

Para verificar se os headers estão corretos após o deploy:

```bash
# Testar CSS
curl -I https://hub.pescalead.com.br/assets/index-C7bKrOXl.css
# Deve retornar: Content-Type: text/css

# Testar JS
curl -I https://hub.pescalead.com.br/assets/index-Q2U-pMjc.js
# Deve retornar: Content-Type: text/javascript
```

## 📝 Notas Importantes

1. **O arquivo `build/_headers` é gerado automaticamente pelo Vite** quando copia arquivos de `public/` para `build/`
2. **O `wrangler.toml` é usado pelo GitHub Actions** para configurar headers via Cloudflare Pages API
3. **O Cloudflare Pages Auto-Deploy pode ignorar `_headers`** se houver configuração manual no dashboard
4. **A ordem de precedência dos headers**:
   - Headers configurados no dashboard (maior precedência)
   - Headers do `wrangler.toml` (via API)
   - Headers do `_headers` (menor precedência)

## 🚀 Próximos Passos

1. ✅ Corrigir `public/_headers` (feito)
2. ✅ Atualizar `build/_headers` (feito)
3. ✅ Adicionar verificação no GitHub Actions (feito)
4. ⏳ **Fazer commit e push para trigger do deploy**
5. ⏳ **Desabilitar Auto-Deploy do Cloudflare Pages** (recomendado)
6. ⏳ **Verificar se o erro foi resolvido após o deploy**

