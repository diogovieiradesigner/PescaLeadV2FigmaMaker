# 🗑️ Guia: Como Deletar uma Run de Extração

## 📋 Visão Geral

A função `delete_extraction_run()` deleta uma run de extração e **todos os dados relacionados** de forma segura e completa.

> **✅ CORRIGIDO:** A função foi corrigida para usar a coluna correta `message` (não `msg`) da tabela PGMQ.

## 🎯 O que é deletado?

Quando você deleta uma run, a função remove automaticamente:

1. ✅ **Mensagens da fila** (`pgmq.q_google_maps_queue`) relacionadas à run
2. ✅ **Logs do watchdog** (`watchdog_logs`) relacionados
3. ✅ **Leads em staging** (`lead_extraction_staging`) - via CASCADE
4. ✅ **Logs de extração** (`extraction_logs`) - via CASCADE
5. ✅ **Histórico de bairros** (`neighborhood_search_history`) relacionados
6. ✅ **A run** (`lead_extraction_runs`) em si

⚠️ **IMPORTANTE:** Os **leads no Kanban** (`leads`) **NÃO são deletados** por padrão. Eles apenas têm a referência `lead_extraction_run_id` removida (SET NULL). Se você quiser deletar os leads também, descomente a linha na função.

---

## 🚀 Como Usar

### **Opção 1: Via SQL Editor (Supabase)**

1. Abra o **SQL Editor** no Supabase
2. Execute o seguinte comando:

```sql
SELECT delete_extraction_run('uuid-da-run-aqui');
```

**Exemplo:**
```sql
SELECT delete_extraction_run('c8bea127-e011-4258-a91f-3c76d1b70c6a');
```

3. O resultado será um JSON com detalhes do que foi deletado:

```json
{
  "success": true,
  "run_id": "c8bea127-e011-4258-a91f-3c76d1b70c6a",
  "run_info": {
    "workspace_id": "...",
    "search_term": "Lojas Material de Construção",
    "location": "Rio de Janeiro, Rio de Janeiro, Brazil",
    "status": "completed"
  },
  "deleted_counts": {
    "messages_from_queue": 5,
    "watchdog_logs": 2,
    "staging_leads": 330,
    "extraction_logs": 150,
    "leads": 26,
    "neighborhood_history": 3,
    "run": 1
  },
  "message": "Run deletada com sucesso. 5 mensagens, 2 logs watchdog, 330 leads staging, 150 logs extração, 26 leads kanban, 3 histórico bairros"
}
```

---

### **Opção 2: Via API (Supabase Client)**

Se você estiver usando o Supabase Client no frontend ou backend:

```typescript
// JavaScript/TypeScript
const { data, error } = await supabase.rpc('delete_extraction_run', {
  p_run_id: 'uuid-da-run-aqui'
});

if (error) {
  console.error('Erro ao deletar run:', error);
} else {
  console.log('Run deletada:', data);
  // data.success === true
  // data.deleted_counts mostra quantos registros foram deletados
}
```

**Exemplo completo:**
```typescript
async function deleteRun(runId: string) {
  const { data, error } = await supabase.rpc('delete_extraction_run', {
    p_run_id: runId
  });

  if (error) {
    alert(`Erro: ${error.message}`);
    return;
  }

  if (data.success) {
    alert(`✅ Run deletada! ${data.message}`);
    console.log('Detalhes:', data.deleted_counts);
  } else {
    alert(`❌ Erro: ${data.error}`);
  }
}
```

---

### **Opção 3: Via cURL (HTTP Request)**

Se você quiser chamar diretamente via HTTP:

```bash
curl -X POST 'https://seu-projeto.supabase.co/rest/v1/rpc/delete_extraction_run' \
  -H "apikey: SEU_ANON_KEY" \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_run_id": "uuid-da-run-aqui"}'
```

---

## 🔒 Segurança

- ✅ A função valida se a run existe antes de deletar
- ✅ Retorna erro claro se a run não for encontrada
- ✅ Usa `SECURITY DEFINER` para garantir permissões adequadas
- ✅ Permissões concedidas para `authenticated` e `service_role`

---

## ⚠️ Avisos Importantes

1. **Ação Irreversível:** A deleção é permanente e não pode ser desfeita
2. **Leads no Kanban:** Por padrão, os leads no Kanban **NÃO são deletados**. Apenas a referência é removida
3. **Validação:** A função valida se a run existe antes de tentar deletar
4. **Mensagens na Fila:** Mensagens pendentes na fila também são deletadas

---

## 📊 Retorno da Função

A função retorna um JSON com:

- `success`: `true` se deletou com sucesso, `false` se houve erro
- `run_id`: ID da run que foi deletada
- `run_info`: Informações da run (workspace, termo de busca, localização, status)
- `deleted_counts`: Contador de quantos registros foram deletados de cada tabela
- `message`: Mensagem descritiva do resultado
- `error`: Mensagem de erro (se `success === false`)

---

## 🐛 Tratamento de Erros

Se houver erro, a função retorna:

```json
{
  "success": false,
  "error": "Mensagem de erro aqui",
  "error_code": "Código SQL do erro",
  "run_id": "uuid-da-run"
}
```

**Erros comuns:**
- `Run não encontrada`: A run com o ID fornecido não existe
- Erros de permissão: Verifique se o usuário tem permissão para deletar

---

## 💡 Dicas

1. **Teste primeiro:** Execute em uma run de teste antes de usar em produção
2. **Backup:** Se necessário, faça backup dos dados antes de deletar
3. **Verificação:** Use o retorno `deleted_counts` para confirmar o que foi deletado
4. **Leads no Kanban:** Se quiser deletar os leads também, edite a função e descomente a seção de deleção de leads

---

## 📝 Exemplo de Uso no Frontend (React/Next.js)

```tsx
import { supabase } from '@/lib/supabase';

async function handleDeleteRun(runId: string) {
  if (!confirm('Tem certeza que deseja deletar esta extração? Esta ação é irreversível.')) {
    return;
  }

  try {
    const { data, error } = await supabase.rpc('delete_extraction_run', {
      p_run_id: runId
    });

    if (error) throw error;

    if (data.success) {
      alert(`✅ ${data.message}`);
      // Atualizar lista de extrações
      refreshExtractions();
    } else {
      alert(`❌ Erro: ${data.error}`);
    }
  } catch (error) {
    console.error('Erro ao deletar run:', error);
    alert('Erro ao deletar extração. Tente novamente.');
  }
}
```

---

## ✅ Checklist Antes de Deletar

- [ ] Confirmar que realmente deseja deletar a run
- [ ] Verificar se não há leads importantes no Kanban relacionados
- [ ] Fazer backup se necessário
- [ ] Testar em ambiente de desenvolvimento primeiro (se possível)

---

**Última atualização:** Janeiro 2025

