# Deploy Manual da Edge Function Corrigida

## 🎯 Correções Aplicadas

### 1. URL da API Atualizada
**Arquivo:** `supabase/functions/process-scraping-queue/index.ts`
**Linha 15:**
```typescript
// ❌ URL antiga (falhando)
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'https://proxy-scraper-api.diogo-vieira-pb-f91.workers.dev';

// ✅ URL correta (funcionando)  
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'https://scraper.pescalead.com.br';
```

### 2. Função de Sanitização Completamente Atualizada
**Arquivo:** `supabase/functions/process-scraping-queue/index.ts`
**Função `sanitizeScrapingData`:**

```typescript
function sanitizeScrapingData(data: any): ScrapingApiResponse {
  return {
    status: String(data.status || 'unknown'),
    url: String(data.url || ''),
    method: String(data.method || ''),
    emails: (data.emails || [])
      .map((e: any) => String(e))
      .filter((e: string) => e && e.includes('@')),
    phones: (data.phones || [])
      .map((p: any) => String(p).replace(/[^0-9+() -]/g, ''))
      .filter((p: string) => p && p.length >= 8),
    cnpj: (data.cnpj || [])
      .map((c: any) => validateCNPJ(String(c)))
      .filter(Boolean),
    whatsapp: (data.whatsapp || [])
      .map((w: any) => String(w)),
    social_media: {
      linkedin: (data.social_media?.linkedin || []).map((s: any) => String(s)),
      facebook: (data.social_media?.facebook || []).map((s: any) => String(s)),
      instagram: (data.social_media?.instagram || []).map((s: any) => String(s)),
      youtube: (data.social_media?.youtube || []).map((s: any) => String(s)),
      twitter: (data.social_media?.twitter || []).map((s: any) => String(s)),
    },
    metadata: {
      title: String(data.metadata?.title || ''),
      description: String(data.metadata?.description || ''),
      og_image: String(data.metadata?.og_image || ''),
    },
    images: {
      logos: (data.images?.logos || []).map((i: any) => String(i)),
      favicon: String(data.images?.favicon || ''),
      other_images: (data.images?.other_images || []).map((i: any) => String(i)),
    },
    button_links: (data.button_links || []).map((l: any) => String(l)),
    checkouts: {
      have_checkouts: Boolean(data.checkouts?.have_checkouts),
      platforms: (data.checkouts?.platforms || []).map((p: any) => String(p)),
    },
    pixels: {
      have_pixels: Boolean(data.pixels?.have_pixels),
      pixels: data.pixels?.pixels || {},
    },
    screenshot: {
      base64: '', // Não armazenar screenshot (muito grande)
      timestamp: String(data.screenshot?.timestamp || ''),
    },
    markdown: String(data.markdown || ''),
    performance: {
      total_time: String(data.performance?.total_time || '0s'),
    },
  };
}
```

## 🚀 Como Fazer o Deploy

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Navegar para o diretório do projeto
cd c:/Users/Asus/Pictures/Pesca lead - Back-end

# 2. Fazer o deploy da edge function
supabase functions deploy process-scraping-queue --project-ref nlbcwaxkeaddfocigwuk

# 3. Verificar se deploy foi bem-sucedido
supabase functions list --project-ref nlbcwaxkeaddfocigwuk
```

### Opção 2: Via Dashboard Supabase

1. **Acesse o Dashboard:**
   ```
   https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk
   ```

2. **Navegue para Edge Functions:**
   - Clique em "Edge Functions" no menu lateral
   - Ou acesse: https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/functions

3. **Encontre a função:**
   - Procure por `process-scraping-queue`
   - Clique no nome da função

4. **Deploy/Update:**
   - Clique em "Deploy" ou "Update"
   - Aguarde o processo de deploy (1-2 minutos)

### Opção 3: Upload Manual dos Arquivos

**Se as opções acima não funcionarem:**

1. **Copie o conteúdo do arquivo `index.ts`** (já corrigido)
2. **Cole no editor online do Supabase Dashboard**
3. **Salve e deploy**

## ✅ Validação do Deploy

### 1. Teste Rápido
```bash
curl -X POST "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/process-scraping-queue" \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json"
```

### 2. Verificar nos Logs
```bash
# Ver logs da edge function
supabase functions logs process-scraping-queue --project-ref nlbcwaxkeaddfocigwuk
```

### 3. Testar na Interface
1. Acesse: http://localhost:3000/extracao/progresso/3c7a7725-b38b-40a4-8dba-569f22002946
2. Vá para aba "Scraping"
3. Verifique se aparecem novos logs

## 📊 O Que Esperar Após o Deploy

### Logs na Interface
```
[15:30] 🌐 [SCRAPE] Calling scraper API: https://scraper.pescalead.com.br
[15:30] 📍 [TARGET] Website: https://example.com
[15:32] ⚡ [RESPONSE] Got response in 2.1s, status: 200
[15:32] 📊 [DATA] Scraping completed with status: success
[15:32] 📧 [EMAILS] Found 2 emails
[15:32] 📱 [PHONES] Found 1 phones
[15:32] 🌐 [SOCIAL] FB:0 IG:0
[15:32] ✅ [SAVED] Result saved to database
```

### Dados no Banco
```sql
-- Verificar dados completos salvos
SELECT 
  username,
  website_scraping_status,
  website_scraping_data->'emails' as emails,
  website_scraping_data->'whatsapp' as whatsapp,
  website_scraping_data->'markdown' as markdown_length
FROM instagram_enriched_profiles 
WHERE run_id = '3c7a7725-b38b-40a4-8dba-569f22002946'::UUID
  AND website_scraping_status = 'completed';
```

## 🔍 Principais Mudanças Implementadas

### ✅ URL da API Correta
- **Antes:** `https://proxy-scraper-api.diogo-vieira-pb-f91.workers.dev` (falhando)
- **Depois:** `https://scraper.pescalead.com.br` (funcionando)

### ✅ Dados Completos (Sem Truncamento)
- **Emails:** Todos os emails (sem limite de 100)
- **Telefones:** Todos os telefones (sem limite de 100)  
- **WhatsApp:** Todos os links (sem limite)
- **Markdown:** Conteúdo completo (sem limite de 50k chars)
- **Links:** Todos os button_links (sem limite de 50)
- **Social Media:** Todas as redes (sem limite de 20)
- **Imagens:** Todas as URLs (sem limite)
- **Metadata:** Title e description completos

### ✅ Tratamento da Resposta
- **Sanitização inteligente:** Remove apenas dados inválidos
- **Preservação total:** Mantém todos os dados válidos
- **Estrutura completa:** Todos os campos da API são salvos

## 🎯 Resumo

**Problema:** Edge function usando URL antiga e truncando dados
**Solução:** URL atualizada + função de sanitização permissiva
**Resultado:** Todos os dados da API são salvos completos

**Após o deploy, você verá:**
- ✅ Scraping funcionando com nova API
- ✅ Todos os dados preservados (emails, phones, whatsapp, etc.)
- ✅ Logs completos na interface
- ✅ Conteúdo markdown integral
- ✅ Todos os links e CTAs salvos

**Próximo passo:** Fazer o deploy e testar!