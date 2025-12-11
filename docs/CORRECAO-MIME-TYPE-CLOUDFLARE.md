# Correção: Erro de MIME Type no Cloudflare Pages

## Problema Identificado

Erro ao carregar módulos JavaScript:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "application/octet-stream". Strict MIME type checking is enforced for module scripts per HTML spec.
```

## Tentativas de Correção

### 1. Atualização do arquivo `_headers`

**Arquivo**: `public/_headers`

**Formato inicial**:
```
/assets/*.js
  Content-Type: text/javascript; charset=utf-8
```

**Formato corrigido**:
```
/assets/*.js
  Content-Type: application/javascript
  X-Content-Type-Options: nosniff
```

### 2. Ajustes no `vite.config.ts`

Adicionadas configurações de build para garantir nomes de arquivos consistentes:

```typescript
build: {
  target: 'esnext',
  outDir: 'build',
  modulePreload: {
    polyfill: true,
  },
  rollupOptions: {
    output: {
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: (assetInfo) => {
        if (assetInfo.name?.endsWith('.js')) {
          return 'assets/[name]-[hash][extname]';
        }
        return 'assets/[name]-[hash][extname]';
      },
    },
  },
}
```

## Verificações Necessárias

### 1. Verificar se o arquivo `_headers` está sendo copiado

O arquivo `_headers` deve estar na raiz do diretório `build/` após o build:

```bash
ls build/_headers
```

### 2. Verificar formato do arquivo `_headers`

O formato correto para Cloudflare Pages é:

```
/path/*
  Header-Name: Header-Value
```

**Importante**: 
- Não usar `charset=utf-8` no Content-Type
- Cada header em uma linha separada
- Espaçamento correto (2 espaços de indentação)

### 3. Verificar configuração do Cloudflare Pages

No dashboard do Cloudflare Pages:

1. Vá em **Settings** > **Headers**
2. Verifique se há headers configurados manualmente que possam estar sobrescrevendo o arquivo `_headers`
3. Se necessário, configure os headers manualmente:
   - Path: `/assets/*.js`
   - Header: `Content-Type`
   - Value: `application/javascript`

## Solução Alternativa: Configurar Headers via Dashboard

Se o arquivo `_headers` não estiver funcionando:

1. Acesse o Cloudflare Dashboard
2. Vá em **Workers & Pages** > **pescaleadv2figmamaker**
3. Vá em **Settings** > **Headers**
4. Clique em **Add header**
5. Configure:
   - **Path**: `/assets/*.js`
   - **Header name**: `Content-Type`
   - **Value**: `application/javascript`
6. Adicione também:
   - **Path**: `/assets/*.js`
   - **Header name**: `X-Content-Type-Options`
   - **Value**: `nosniff`

## Verificação Pós-Deploy

Após o deploy, verifique os headers HTTP:

```bash
curl -I https://hub.pescalead.com.br/assets/index-*.js
```

Deve retornar:
```
Content-Type: application/javascript
X-Content-Type-Options: nosniff
```

## Status

- ✅ Arquivo `_headers` atualizado
- ✅ Formato ajustado (removido charset)
- ✅ Commit enviado para GitHub
- ⏳ Aguardando deploy do Cloudflare Pages

## Próximos Passos

1. Aguardar deploy automático do Cloudflare Pages
2. Verificar se o erro foi resolvido
3. Se persistir, configurar headers manualmente via dashboard
4. Verificar logs do Cloudflare para possíveis erros adicionais

