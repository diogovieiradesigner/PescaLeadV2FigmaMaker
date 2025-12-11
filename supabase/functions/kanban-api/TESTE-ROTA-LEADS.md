# 🧪 Teste Manual da Rota /leads

**Data:** 10/12/2025

---

## 📋 Informações da Requisição

**URL:**
```
https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/47e86ae3-4d5c-4e03-a881-293fa802424d/funnels/16712ae6-78b5-47d4-9504-b66e84315341/leads?mode=kanban&limit=10
```

**Método:** `GET`

**Headers necessários:**
```json
{
  "Authorization": "Bearer <TOKEN_JWT>",
  "Content-Type": "application/json"
}
```

---

## 🧪 Teste no PowerShell

```powershell
# 1. Obter token (substituir pelo token real do usuário logado)
$token = "SEU_TOKEN_JWT_AQUI"

# 2. Definir parâmetros
$workspaceId = "47e86ae3-4d5c-4e03-a881-293fa802424d"
$funnelId = "16712ae6-78b5-47d4-9504-b66e84315341"
$url = "https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/$workspaceId/funnels/$funnelId/leads?mode=kanban&limit=10"

# 3. Headers
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 4. Fazer requisição
try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
```

---

## 🧪 Teste no Console do Navegador

```javascript
// Cole no console do navegador (com usuário logado)
(async () => {
  try {
    // Obter token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      console.error('❌ Nenhum token encontrado. Faça login primeiro.');
      return;
    }
    
    console.log('🔑 Token obtido:', token.substring(0, 20) + '...');
    
    // Fazer requisição
    const workspaceId = '47e86ae3-4d5c-4e03-a881-293fa802424d';
    const funnelId = '16712ae6-78b5-47d4-9504-b66e84315341';
    const url = `https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads?mode=kanban&limit=10`;
    
    console.log('📡 Fazendo requisição para:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status:', response.status, response.statusText);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Erro:', text);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Sucesso!', data);
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
})();
```

---

## 🔍 Verificar Logs

Após fazer a requisição, verifique os logs no Dashboard do Supabase:

**URL:**
https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/functions/kanban-api/logs

**Procure por:**
- `[AUTH] Verificando autenticação para:`
- `[AUTH] ✅ Usuário autenticado:`
- `[LEADS] GET /leads - Iniciando...`
- `[LEADS] workspaceId: ... funnelId: ...`

---

## ✅ Resultados Esperados

### **Sucesso (200 OK):**
```json
{
  "columns": {
    "column-id-1": {
      "leads": [...],
      "total": 150,
      "hasMore": true
    },
    "column-id-2": {
      "leads": [...],
      "total": 87,
      "hasMore": true
    }
  }
}
```

### **Erro 401 (Unauthorized):**
```json
{
  "error": "Unauthorized - Missing token"
}
```
ou
```json
{
  "error": "Unauthorized - Invalid token"
}
```

### **Erro 404 (Not Found):**
```json
{
  "error": "Not Found"
}
```
ou resposta HTML do Supabase

---

## 🔧 Se Ainda Der 404

1. **Verificar se a função está deployada:**
   - Acesse: https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/functions
   - Verifique se `kanban-api` aparece na lista

2. **Verificar logs:**
   - Se não aparecer nenhum log, a requisição não está chegando na função
   - Se aparecer log de auth mas não de leads, o problema está no middleware

3. **Verificar token:**
   - Certifique-se de que o token é válido
   - Teste com um token novo (faça logout e login novamente)

---

**Status:** 🧪 **AGUARDANDO TESTE MANUAL**

