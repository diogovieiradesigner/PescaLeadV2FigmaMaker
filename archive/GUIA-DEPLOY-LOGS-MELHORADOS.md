# 🚀 Guia de Deploy: Logs Melhorados

## 📋 FUNCTIONS MODIFICADAS

As seguintes Edge Functions foram modificadas e precisam de deploy:

1. ✅ **fetch-google-maps** - Logs de compensação, expansão, mensagens perdidas e finalização
2. ✅ **fetch-overpass-coordinates** - Logs de parsing e query
3. ✅ **start-extraction** - Log de histórico estruturado

---

## 🎯 MÉTODO 1: Deploy Individual (Recomendado)

### **Passo 1: Deploy fetch-overpass-coordinates**

```powershell
supabase functions deploy fetch-overpass-coordinates
```

**Ou usando o script:**
```powershell
.\scripts\deploy-function.ps1 fetch-overpass-coordinates
```

---

### **Passo 2: Deploy start-extraction**

```powershell
supabase functions deploy start-extraction
```

**Ou usando o script:**
```powershell
.\scripts\deploy-function.ps1 start-extraction
```

---

### **Passo 3: Deploy fetch-google-maps**

```powershell
supabase functions deploy fetch-google-maps
```

**Ou usando o script:**
```powershell
.\scripts\deploy-function.ps1 fetch-google-maps
```

---

## 🎯 MÉTODO 2: Deploy em Lote (PowerShell)

Execute no PowerShell:

```powershell
# Deploy de todas as 3 functions modificadas
$functions = @("fetch-overpass-coordinates", "start-extraction", "fetch-google-maps")

foreach ($func in $functions) {
    Write-Host "🚀 Fazendo deploy de: $func" -ForegroundColor Cyan
    supabase functions deploy $func
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao fazer deploy de $func" -ForegroundColor Red
    }
    Write-Host ""
}
```

---

## 🔍 VERIFICAÇÃO PÓS-DEPLOY

### **1. Verificar se as functions foram deployadas:**

```powershell
supabase functions list
```

Você deve ver as 3 functions na lista.

---

### **2. Verificar logs (opcional):**

```powershell
# Logs de fetch-google-maps
supabase functions logs fetch-google-maps --tail

# Logs de fetch-overpass-coordinates
supabase functions logs fetch-overpass-coordinates --tail

# Logs de start-extraction
supabase functions logs start-extraction --tail
```

---

## ⚠️ IMPORTANTE

### **Antes de fazer deploy:**

1. ✅ **Verifique se está conectado ao projeto:**
   ```powershell
   supabase link --project-ref nlbcwaxkeaddfocigwuk
   ```

2. ✅ **Verifique se o Supabase CLI está instalado:**
   ```powershell
   supabase --version
   ```
   
   Se não estiver instalado:
   ```powershell
   npm install -g supabase
   ```

---

## 📊 ORDEM RECOMENDADA

A ordem de deploy **não é crítica** para essas mudanças (são apenas logs), mas recomendo:

1. **fetch-overpass-coordinates** (função auxiliar)
2. **start-extraction** (função de inicialização)
3. **fetch-google-maps** (função principal)

---

## ✅ COMANDOS COMPLETOS (COPIE E COLE)

```powershell
# 1. Conectar ao projeto (se ainda não conectou)
supabase link --project-ref nlbcwaxkeaddfocigwuk

# 2. Deploy fetch-overpass-coordinates
supabase functions deploy fetch-overpass-coordinates

# 3. Deploy start-extraction
supabase functions deploy start-extraction

# 4. Deploy fetch-google-maps
supabase functions deploy fetch-google-maps

# 5. Verificar (opcional)
supabase functions list
```

---

## 🎯 TESTE APÓS DEPLOY

Após o deploy, teste criando uma nova extração e verifique:

1. ✅ Logs aparecem na tabela `extraction_logs`
2. ✅ Logs de compensação quando não é necessária
3. ✅ Logs de expansão quando não expande
4. ✅ Logs de Overpass API com tempo e erros
5. ✅ Logs de processamento de bairros com filtros
6. ✅ Logs de estratégia de expansão com ajustes
7. ✅ Logs de verificação de mensagens perdidas
8. ✅ Logs de decisão de finalização
9. ✅ Logs de métricas finais consolidadas

---

## 🐛 SE DER ERRO

### **Erro: "not linked to a project"**
```powershell
supabase link --project-ref nlbcwaxkeaddfocigwuk
```

### **Erro: "function not found"**
Verifique se a function existe localmente:
```powershell
Test-Path supabase\functions\fetch-google-maps
```

### **Erro: "authentication failed"**
Faça login no Supabase CLI:
```powershell
supabase login
```

---

## 📝 PRÓXIMOS PASSOS

Após o deploy bem-sucedido:

1. ✅ Criar uma nova extração para testar
2. ✅ Verificar os logs na tabela `extraction_logs`
3. ✅ Validar que todos os logs aparecem corretamente
4. ✅ Fazer commit no Git das mudanças

---

## 🎉 SUCESSO!

Se todos os deploys foram bem-sucedidos, você verá mensagens como:

```
✅ Deploying function fetch-overpass-coordinates...
✅ Deployed function fetch-overpass-coordinates
✅ Deploying function start-extraction...
✅ Deployed function start-extraction
✅ Deploying function fetch-google-maps...
✅ Deployed function fetch-google-maps
```

