# ✅ Resumo: Aumento MAX_CONCURRENT Scraping para 60

## 🎯 Alterações Realizadas

### **1. MAX_CONCURRENT: 30 → 60** ✅

**Arquivo:** `supabase/functions/process-scraping-queue/index.ts`

**Mudança:**
```typescript
// Antes
const MAX_CONCURRENT = 30;

// Depois
const MAX_CONCURRENT = 60;
```

---

### **2. Cron Job: batch_size 30 → 60** ✅

**Cron Job:** `process-scraping-queue-v2`

**Mudança:**
- **batch_size:** 30 → **60** ✅
- **Frequência:** 1 minuto (mantido)

**Comando atualizado:**
```sql
body := '{"batch_size": 60}'::jsonb
```

---

## 📊 Impacto Esperado

| Métrica | Antes (30) | Depois (60) | Melhoria |
|---------|------------|-------------|----------|
| **Leads simultâneos** | 30 | 60 | 2x |
| **Taxa (leads/min)** | ~30 | ~60 | 2x |
| **Tempo para 2.088 msgs** | ~70min | ~35min | 2x mais rápido |

---

## ⚠️ Monitoramento Necessário

### **O que observar:**

1. ✅ **Taxa de processamento** (~60 leads/minuto)
2. ✅ **Taxa de erros** (< 5%)
3. ✅ **Timeouts** (mínimos)
4. ✅ **Rate limits da API** (erros 429)
5. ✅ **Tamanho da fila** (deve diminuir)

### **Sinais de problema:**

- ❌ Taxa de erro > 10%
- ❌ Muitos timeouts
- ❌ Erros 429 (Too Many Requests)
- ❌ Fila não diminuindo

### **Se houver problemas:**

Reduzir para 50 ou 40 e monitorar novamente.

---

## 🚀 Próximos Passos

1. ✅ **Deploy da Edge Function** com MAX_CONCURRENT = 60
2. ⏳ **Monitorar** por 1-2 horas
3. ⏳ **Verificar** logs e métricas
4. ⏳ **Ajustar** se necessário

---

**Status:** ✅ **Configurado para 60 leads simultâneos**

**Documentação de Monitoramento:** `docs/extracao/MONITORAMENTO-SCRAPING-60.md`

