# Guia de Trabalho com Edge Functions

## 📁 Estrutura do Projeto

```
supabase/
├── config.toml              # Configuração do Supabase CLI
└── functions/               # Edge Functions
    ├── _shared/             # Código compartilhado entre functions
    └── [nome-da-function]/  # Cada function em sua própria pasta
        └── index.ts          # Arquivo principal da function
```

## 💾 Backup Completo de Todas as Functions

### Método Rápido (Recomendado)

```powershell
# Execute este script para baixar TODAS as functions de uma vez
.\scripts\backup-functions-via-mcp.ps1
```

Este script:
- ✅ Lista todas as 37+ functions do projeto
- ✅ Baixa cada uma automaticamente
- ✅ Organiza tudo na estrutura `supabase/functions/`
- ✅ Mostra progresso e resumo

### Método Alternativo

```powershell
# Via Supabase CLI (tenta descobrir automaticamente)
.\scripts\download-all-functions.ps1
```

### Após o Backup

```powershell
# Faça commit no Git para versionar
git add supabase/functions/
git commit -m "backup: todas as edge functions do projeto"
```

## 🚀 Como Editar e Fazer Deploy

### 1. **Editar Localmente**

Crie ou edite os arquivos das Edge Functions na pasta `supabase/functions/`:

```bash
supabase/functions/
├── ai-process-conversation/
│   └── index.ts
├── start-extraction/
│   └── index.ts
└── ...
```

### 2. **Baixar Function Existente (Opcional)**

Se você quiser baixar uma function existente para editar localmente:

```bash
# Via Supabase CLI (recomendado)
supabase functions download ai-process-conversation

# Ou via MCP (posso fazer isso para você)
```

### 3. **Fazer Deploy**

Depois de editar, faça deploy usando o Supabase CLI:

```bash
# Deploy de uma function específica
supabase functions deploy ai-process-conversation

# Deploy de todas as functions
supabase functions deploy

# Deploy com flags úteis
supabase functions deploy ai-process-conversation --no-verify-jwt
```

### 4. **Verificar Deploy**

```bash
# Listar todas as functions
supabase functions list

# Ver logs de uma function
supabase functions logs ai-process-conversation
```

## 🔧 Comandos Úteis

### Conectar ao Projeto Remoto
```bash
supabase link --project-ref nlbcwaxkeaddfocigwuk
```

### Testar Localmente
```bash
# Iniciar ambiente local
supabase start

# Testar function localmente
supabase functions serve ai-process-conversation
```

### Ver Logs
```bash
# Logs em tempo real
supabase functions logs ai-process-conversation --follow

# Logs com filtro
supabase functions logs ai-process-conversation --level error
```

## 📝 Exemplo de Edge Function

```typescript
// supabase/functions/exemplo/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const { data } = await req.json();
    
    // Seu código aqui
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
```

## ⚠️ Importante

1. **Sempre edite localmente primeiro** - É muito mais fácil e rápido
2. **Use Git** - Versionamento é essencial para Edge Functions
3. **Teste localmente** - Use `supabase functions serve` antes de fazer deploy
4. **Não use MCP para deploy** - O MCP é útil para ler, mas deploy via CLI é muito melhor

## 🔄 Workflow Recomendado

1. ✅ **Baixar function existente** (se necessário):
   ```bash
   # Via CLI
   supabase functions download ai-process-conversation
   
   # Ou via script PowerShell
   .\scripts\download-function.ps1 ai-process-conversation
   ```

2. ✅ **Editar arquivo localmente** (`supabase/functions/[nome]/index.ts`)
   - Use seu editor favorito (VS Code, etc)
   - Tenha autocomplete e syntax highlighting completo
   - Faça commits incrementais no Git

3. ✅ **Testar localmente** (opcional mas recomendado):
   ```bash
   supabase functions serve ai-process-conversation
   ```

4. ✅ **Commit no Git**:
   ```bash
   git add supabase/functions/ai-process-conversation/
   git commit -m "feat: atualiza ai-process-conversation"
   ```

5. ✅ **Deploy via CLI**:
   ```bash
   # Via CLI direto
   supabase functions deploy ai-process-conversation
   
   # Ou via script PowerShell
   .\scripts\deploy-function.ps1 ai-process-conversation
   ```

6. ✅ **Verificar logs** se necessário:
   ```bash
   supabase functions logs ai-process-conversation --follow
   ```

## 🎯 Vantagens deste Workflow

✅ **Edição local** - Use seu editor favorito com todas as ferramentas  
✅ **Versionamento** - Git rastreia todas as mudanças  
✅ **Testes locais** - Teste antes de fazer deploy  
✅ **Deploy rápido** - Um comando e pronto  
✅ **Rollback fácil** - Git permite voltar versões anteriores  
✅ **Colaboração** - Time pode revisar código antes do deploy

## 📚 Documentação

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.land/manual)
- [Supabase CLI](https://supabase.com/docs/reference/cli)

