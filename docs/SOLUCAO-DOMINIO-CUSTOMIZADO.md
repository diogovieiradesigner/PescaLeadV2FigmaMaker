# Solução: Problema de MIME Type no Domínio Customizado

## 🔍 Problema Identificado

- ✅ **Domínio padrão funciona**: `https://pescaleadv2figmamaker.pages.dev/`
- ❌ **Domínio customizado quebrado**: `https://hub.pescalead.com.br/`

**Erro**:
```
Refused to apply style from 'https://hub.pescalead.com.br/assets/index-C7bKrOXl.css' 
because its MIME type ('text/javascript') is not a supported stylesheet MIME type
```

## 🎯 Causa Provável

O domínio customizado pode ter:
1. **Cache do Cloudflare** servindo versões antigas
2. **Configurações diferentes** de headers
3. **Page Rules ou Transform Rules** interferindo
4. **DNS/CDN** com cache persistente

## ✅ Soluções

### Solução 1: Limpar Cache do Cloudflare (RECOMENDADO - MAIS RÁPIDO)

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecione o domínio `pescalead.com.br`
3. Vá em **Caching** > **Configuration**
4. Clique em **Purge Everything** (Limpar tudo)
5. Aguarde alguns minutos para o cache ser limpo

**Alternativa via API**:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### Solução 2: Configurar Headers Manualmente no Cloudflare Dashboard

Como o domínio customizado pode ter configurações diferentes, configure os headers manualmente:

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **Workers & Pages** > **pescaleadv2figmamaker**
3. Vá em **Settings** > **Headers**
4. Clique em **Add header** e configure:

   **Header 1 - CSS**:
   - **Path**: `/assets/*.css`
   - **Header name**: `Content-Type`
   - **Value**: `text/css`

   **Header 2 - JavaScript**:
   - **Path**: `/assets/*.js`
   - **Header name**: `Content-Type`
   - **Value**: `text/javascript`

   **Header 3 - JavaScript (MJS)**:
   - **Path**: `/assets/*.mjs`
   - **Header name**: `Content-Type`
   - **Value**: `text/javascript`

### Solução 3: Verificar Page Rules

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecione o domínio `pescalead.com.br`
3. Vá em **Rules** > **Page Rules**
4. Verifique se há regras que possam estar interferindo com headers
5. Se necessário, desabilite temporariamente para testar

### Solução 4: Verificar Transform Rules

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecione o domínio `pescalead.com.br`
3. Vá em **Rules** > **Transform Rules** > **Modify Response Header**
4. Verifique se há regras que modificam headers de resposta
5. Se houver regras que alteram `Content-Type`, ajuste ou remova

### Solução 5: Aguardar Propagação do Deploy

Após o deploy, pode levar alguns minutos para o domínio customizado atualizar:

1. Aguarde **5-10 minutos** após o deploy
2. Teste novamente o domínio customizado
3. Se ainda não funcionar, limpe o cache (Solução 1)

## 🔧 Verificação Manual

Após aplicar as soluções, verifique os headers:

```bash
# Testar CSS no domínio customizado
curl -I https://hub.pescalead.com.br/assets/index-C7bKrOXl.css
# Deve retornar: Content-Type: text/css

# Testar JS no domínio customizado
curl -I https://hub.pescalead.com.br/assets/index-Q2U-pMjc.js
# Deve retornar: Content-Type: text/javascript
```

## 📋 Checklist de Resolução

- [ ] Limpar cache do Cloudflare (Solução 1)
- [ ] Configurar headers manualmente no dashboard (Solução 2)
- [ ] Verificar Page Rules (Solução 3)
- [ ] Verificar Transform Rules (Solução 4)
- [ ] Aguardar propagação do deploy (Solução 5)
- [ ] Testar com `curl -I` para verificar headers
- [ ] Verificar se o erro foi resolvido no navegador

## 🚀 Próximos Passos Imediatos

1. ✅ **Deploy realizado** - Commit `b46dc5d` enviado para `main`
2. ⏳ **Limpar cache do Cloudflare** (Solução 1 - mais rápido)
3. ⏳ **Configurar headers manualmente** (Solução 2 - mais confiável)
4. ⏳ **Aguardar alguns minutos** e testar novamente

## 💡 Por que o domínio padrão funciona?

O domínio padrão do Cloudflare Pages (`.pages.dev`) usa as configurações do projeto diretamente, enquanto domínios customizados podem ter:
- Cache adicional do CDN
- Configurações de DNS diferentes
- Regras de transformação aplicadas
- Cache do navegador mais persistente

## 📝 Nota sobre Deploy Automático

Se não encontrar a opção para desabilitar deploy automático:
- A opção pode estar em **Settings** > **Builds & deployments** > **Branch control**
- Ou pode estar em **Settings** > **Builds & deployments** > **Automatic deployments**
- Se não aparecer, pode ser que o projeto esteja configurado apenas para produção
- Nesse caso, o GitHub Actions será o único fazendo deploy, o que é ideal

