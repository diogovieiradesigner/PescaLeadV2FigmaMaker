# Correção: URL da API de Scraping Atualizada

## 🎯 Problema Identificado

A edge function `process-scraping-queue` estava usando a **URL antiga** da API de scraping:

**❌ URL Antiga (falhando):**
```typescript
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'https://proxy-scraper-api.diogo-vieira-pb-f91.workers.dev';
```

**✅ URL Correta (funcionando):**
```typescript
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'https://scraper.pescalead.com.br';
```

## 🔧 Correção Aplicada

**Arquivo modificado:** `supabase/functions/process-scraping-queue/index.ts`

**Linha 15 alterada de:**
```typescript
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'https://proxy-scraper-api.diogo-vieira-pb-f91.workers.dev';
```

**Para:**
```typescript
const SCRAPER_API_URL = Deno.env.get('SCRAPER_API_URL') || 'https://scraper.pescalead.com.br';
```

## 🚀 Como Fazer o Deploy

### Opção 1: Via Supabase CLI (Recomendado)
```bash
cd c:/Users/Asus/Pictures/Pesca lead - Back-end
supabase functions deploy process-scraping-queue --project-ref nlbcwaxkeaddfocigwuk
```

### Opção 2: Via Dashboard Supabase
1. Acesse: https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk
2. Vá para **Edge Functions**
3. Encontre `process-scraping-queue`
4. Clique em **Deploy** ou **Update**

## ✅ Validação da Correção

### 1. Verificar URL da API
**A edge function agora faz request para:**
```
POST https://scraper.pescalead.com.br
Content-Type: application/json
Accept: application/json

{
  "url": "https://example.com",
  "extract_images": false,
  "take_screenshot": false,
  "timeout": 20000
}
```

### 2. Resposta Esperada
**A API deve retornar:**
```json
{
  "status": "success",
  "url": "https://example.com",
  "method": "dynamic",
  "emails": ["email@example.com"],
  "phones": ["+55 11 99999-9999"],
  "whatsapp": ["https://wa.me/5511999999999"],
  "social_media": {
    "linkedin": [],
    "facebook": [],
    "instagram": [],
    "youtube": [],
    "twitter": []
  },
  "metadata": {
    "title": "Example Site",
    "description": "Site description",
    "og_image": ""
  },
  "markdown": "Site content...",
  "performance": {
    "total_time": "2.5s"
  }
}
```

### 3. Logs na Interface
**Após o deploy, na aba "Scraping" você verá:**
```
[15:30] 🌐 [SCRAPE] Calling scraper API: https://scraper.pescalead.com.br
[15:30] 📍 [TARGET] Website: https://example.com
[15:32] ⚡ [RESPONSE] Got response in 2.1s, status: 200
[15:32] 📊 [DATA] Scraping completed with status: success
[15:32] 📧 [EMAILS] Found 1 emails
[15:32] 📱 [PHONES] Found 1 phones
[15:32] ✅ [SAVED] Result saved to database
```

## 🎯 Próximos Passos

1. **Faça o deploy** da edge function corrigida
2. **Monitore a extração atual** (7 perfis resetados)
3. **Verifique os logs** na aba "Scraping"
4. **Execute nova extração** para validar o funcionamento

## 📊 Diferenças da API

### URL Anterior vs Atual

| Aspecto | URL Anterior | URL Atual |
|---------|-------------|-----------|
| **Host** | proxy-scraper-api.diogo-vieira-pb-f91.workers.dev | scraper.pescalead.com.br |
| **Status** | ❌ Falhando com erro 524/521 | ✅ Funcionando |
| **Documentação** | Indisponível | https://scraper.pescalead.com.br/docs |
| **Resposta** | Erro de proxy | Dados completos de scraping |

### Formato da Requisição (Igual para ambas)
```json
{
  "url": "string",
  "extract_images": false,
  "take_screenshot": false, 
  "timeout": 20000
}
```

### Formato da Resposta (Igual para ambas)
```json
{
  "status": "success",
  "url": "string",
  "method": "dynamic",
  "emails": ["string"],
  "phones": ["string"],
  "whatsapp": ["string"],
  "social_media": {...},
  "metadata": {...},
  "markdown": "string",
  "performance": {...}
}
```

## ✅ Resumo

**A correção está simples:** apenas mudamos a URL base da API de scraping para a nova URL que você confirmou estar funcionando.

**Após o deploy:**
- ✅ Edge function usará a API correta
- ✅ Requests serão enviados para `https://scraper.pescalead.com.br`
- ✅ Logs aparecerão na aba "Scraping"
- ✅ Dados serão extraídos e salvos corretamente

**O sistema de tratamento de resposta já está correto** - ele espera exatamente o formato que você mostrou no exemplo.