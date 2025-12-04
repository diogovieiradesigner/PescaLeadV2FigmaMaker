# 🔍 OVERVIEW: Fluxo de GET dos Dados - Agent Logs

## 📊 ESTADO ATUAL
Os dados estão aparecendo **ZERADOS** (stats = 0, logs = [], totalLogs = 0)

---

## 🔄 FLUXO COMPLETO DE DADOS

### 1️⃣ **COMPONENT: `/components/AgentLogsView.tsx`**

#### Estados Iniciais:
```typescript
const [logs, setLogs] = useState<PipelineLog[]>([]);        // Array vazio
const [stats, setStats] = useState<PipelineStats | null>(null);  // Null
const [totalLogs, setTotalLogs] = useState(0);               // Zero
const [loading, setLoading] = useState(true);                // True
```

#### Filtros Padrão (linhas 39-45):
```typescript
{
  limit: 20,
  offset: 0,
  status: 'all',
  date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Últimos 7 dias
  date_to: new Date().toISOString()  // Hoje
}
```

---

### 2️⃣ **FUNÇÃO fetchData() (linhas 48-88)**

#### Passo A: Verificar usuário autenticado
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return;  // ⚠️ SE NÃO TEM USUÁRIO, RETORNA E NÃO BUSCA NADA!
```
**🔴 PONTO CRÍTICO 1:** Se usuário não está autenticado, a função retorna vazio silenciosamente.

---

#### Passo B: Buscar workspace_id do usuário
```typescript
const { data: memberData } = await supabase
  .from('workspace_members')
  .select('workspace_id')
  .eq('user_id', user.id)
  .single();

const workspaceId = memberData?.workspace_id;  // ⚠️ PODE SER UNDEFINED!
```
**🔴 PONTOS CRÍTICOS 2-4:**
- Tabela `workspace_members` pode não existir
- Usuário pode não ter registro nessa tabela
- `workspaceId` pode ser `undefined` e continua a execução

---

#### Passo C: Fazer 3 chamadas RPC em paralelo
```typescript
const [logsData, statsData, countData] = await Promise.all([
  getPipelineLogs({ ...filters, workspace_id: workspaceId }),     // workspace_id pode ser undefined
  getPipelineStats({ 
    workspace_id: workspaceId,  // workspace_id pode ser undefined
    date_from: filters.date_from!, 
    date_to: filters.date_to! 
  }),
  countPipelineLogs({ ...filters, workspace_id: workspaceId })    // workspace_id pode ser undefined
]);
```
**🔴 PONTO CRÍTICO 5:** Se `workspaceId` é undefined, as RPCs recebem `p_workspace_id: undefined`

---

#### Passo D: Atualizar estados
```typescript
setLogs(logsData || []);       // Se logsData for null/undefined → []
setStats(statsData);            // Se statsData for null/undefined → null
setTotalLogs(countData || 0);  // Se countData for null/undefined → 0
```

---

### 3️⃣ **SERVICE: `/services/pipeline-logs-service.ts`**

#### getPipelineLogs (linhas 4-18):
```typescript
await supabase.rpc('get_pipeline_logs', {
  p_workspace_id: filters.workspace_id,      // ⚠️ Pode ser undefined
  p_agent_id: filters.agent_id,              // ⚠️ Sempre undefined (não passado)
  p_conversation_id: filters.conversation_id, // ⚠️ Sempre undefined (não passado)
  p_status: filters.status === 'all' ? null : filters.status,
  p_date_from: filters.date_from,
  p_date_to: filters.date_to,
  p_limit: filters.limit || 50,
  p_offset: filters.offset || 0
});
```
**🔴 PONTO CRÍTICO 6:** RPC `get_pipeline_logs` pode não existir no Supabase

---

#### getPipelineStats (linhas 33-48):
```typescript
await supabase.rpc('get_pipeline_stats', {
  p_workspace_id: filters.workspace_id,  // ⚠️ Pode ser undefined
  p_agent_id: filters.agent_id,          // ⚠️ Sempre undefined
  p_date_from: filters.date_from,
  p_date_to: filters.date_to
});
```
**🔴 PONTO CRÍTICO 7:** RPC `get_pipeline_stats` pode não existir no Supabase

---

#### countPipelineLogs (linhas 20-31):
```typescript
await supabase.rpc('count_pipeline_logs', {
  p_workspace_id: filters.workspace_id,  // ⚠️ Pode ser undefined
  p_agent_id: filters.agent_id,          // ⚠️ Sempre undefined
  p_status: filters.status === 'all' ? null : filters.status,
  p_date_from: filters.date_from,
  p_date_to: filters.date_to
});
```
**🔴 PONTO CRÍTICO 8:** RPC `count_pipeline_logs` pode não existir no Supabase

---

## 🚨 POSSÍVEIS CAUSAS DOS DADOS ZERADOS

### Causa 1: ❌ Usuário não autenticado
- `supabase.auth.getUser()` retorna `user = null`
- fetchData() retorna antes de buscar dados
- **Como verificar:** Abrir DevTools → Console → Ver se tem usuário logado

### Causa 2: ❌ Workspace não encontrado
- Tabela `workspace_members` não existe
- Usuário não tem registro na tabela
- `workspace_id` fica `undefined`
- **Como verificar:** Console do navegador deve mostrar erro da query

### Causa 3: ❌ RPCs não existem no banco de dados
- Funções `get_pipeline_logs`, `get_pipeline_stats`, `count_pipeline_logs` não foram criadas
- **Como verificar:** Supabase Dashboard → Database → Functions

### Causa 4: ❌ Tabela agent_pipeline_logs vazia
- Não tem dados no período dos últimos 7 dias
- **Como verificar:** Supabase Dashboard → Table Editor → agent_pipeline_logs

### Causa 5: ❌ Erro silencioso não tratado
- Catch está apenas fazendo `console.error` sem detalhes
- **Como verificar:** Abrir DevTools → Console → Procurar erros

### Causa 6: ❌ Permissões RLS (Row Level Security)
- Políticas de segurança bloqueando acesso aos dados
- **Como verificar:** Supabase Dashboard → Authentication → Policies

### Causa 7: ❌ Estrutura de retorno das RPCs diferente
- RPCs retornam formato diferente do esperado
- TypeScript aceita mas dados ficam undefined
- **Como verificar:** Console → Ver estrutura de `logsData`, `statsData`, `countData`

---

## 🔧 CHECKLIST DE DIAGNÓSTICO

### 1. Verificar Console do Navegador
```
F12 → Console → Procurar:
- "Error fetching pipeline logs"
- Erros de RPC
- Erros de autenticação
```

### 2. Verificar Autenticação
```typescript
// Adicionar log temporário em fetchData():
console.log('🔐 USER:', user);
console.log('🏢 WORKSPACE_ID:', workspaceId);
```

### 3. Verificar Respostas das RPCs
```typescript
// Adicionar logs temporários:
console.log('📊 LOGS DATA:', logsData);
console.log('📈 STATS DATA:', statsData);
console.log('🔢 COUNT DATA:', countData);
```

### 4. Verificar Supabase Dashboard
- [ ] RPCs existem? (Database → Functions)
- [ ] Tabela `workspace_members` existe?
- [ ] Tabela `agent_pipeline_logs` tem dados?
- [ ] RLS está configurado corretamente?

### 5. Testar RPC direto no SQL Editor
```sql
-- Testar get_pipeline_logs
SELECT * FROM get_pipeline_logs(
  p_workspace_id := 'seu-workspace-id',
  p_agent_id := NULL,
  p_conversation_id := NULL,
  p_status := NULL,
  p_date_from := NOW() - INTERVAL '7 days',
  p_date_to := NOW(),
  p_limit := 20,
  p_offset := 0
);

-- Testar get_pipeline_stats
SELECT * FROM get_pipeline_stats(
  p_workspace_id := 'seu-workspace-id',
  p_agent_id := NULL,
  p_date_from := NOW() - INTERVAL '7 days',
  p_date_to := NOW()
);

-- Testar count_pipeline_logs
SELECT * FROM count_pipeline_logs(
  p_workspace_id := 'seu-workspace-id',
  p_agent_id := NULL,
  p_status := NULL,
  p_date_from := NOW() - INTERVAL '7 days',
  p_date_to := NOW()
);
```

---

## 🎯 PRÓXIMOS PASSOS SUGERIDOS

1. **Adicionar logs de debug** em `fetchData()` para ver valores de:
   - `user`
   - `workspaceId`
   - `logsData`, `statsData`, `countData`

2. **Verificar se RPCs existem** no Supabase Dashboard

3. **Verificar se tabelas existem** e têm dados

4. **Melhorar tratamento de erros** para mostrar mensagens específicas

5. **Adicionar fallback** se workspace_id for undefined

---

## 📝 OBSERVAÇÕES IMPORTANTES

- ⚠️ O useEffect (linha 92) só executa quando filtros mudam: `status`, `limit`, `offset`, `date_from`
- ⚠️ Se `date_to` mudar, NÃO refaz a busca (não está nas dependências)
- ⚠️ Não há validação se as RPCs retornaram erro antes de atualizar estados
- ⚠️ Toast de erro só mostra "Erro ao carregar logs" sem detalhes
