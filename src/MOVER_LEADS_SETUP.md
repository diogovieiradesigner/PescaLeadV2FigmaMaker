# 📋 Setup: Funcionalidade de Mover Leads

## ✅ Status da Implementação

A funcionalidade de **"Mover Leads"** está **100% implementada** no frontend e backend!

### Componentes Criados:

1. ✅ **Modal de Movimentação** (`/components/MoveLeadsModal.tsx`)
2. ✅ **Integração no ExtractionProgress** (botão + estado)
3. ✅ **Endpoint do Servidor** (`POST /queue-lead-migration`)

---

## 🔧 Configuração Necessária no Banco de Dados

Para que a funcionalidade funcione completamente, você precisa garantir que a função SQL `get_extraction_analytics` retorne os seguintes campos no objeto `run`:

### **Campos Obrigatórios no Retorno da RPC:**

```sql
-- A RPC get_extraction_analytics deve retornar:
{
  "run": {
    "id": "uuid",
    "run_name": "string",
    "search_term": "string",
    "location": "string",
    "created_quantity": number,
    "status": "string",
    
    -- ⚠️ CAMPOS NECESSÁRIOS PARA MOVER LEADS:
    "funnel_id": "uuid",           -- ID do kanban atual
    "funnel_name": "string",       -- Nome do kanban atual
    "column_id": "uuid",           -- ID da coluna atual
    "column_name": "string"        -- Nome da coluna atual
  }
}
```

### **Como Verificar se sua RPC está correta:**

1. Abra o **SQL Editor** no Supabase Dashboard
2. Execute o comando:

```sql
SELECT * FROM get_extraction_analytics('seu-run-id-aqui');
```

3. Verifique se o retorno inclui os campos `funnel_id`, `funnel_name`, `column_id` e `column_name`

---

## 🔍 Exemplo de Query SQL Correta

Sua função `get_extraction_analytics` deve incluir algo como:

```sql
CREATE OR REPLACE FUNCTION get_extraction_analytics(run_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'run', json_build_object(
      'id', r.id,
      'run_name', r.run_name,
      'search_term', r.search_term,
      'location', r.location,
      'created_quantity', r.created_quantity,
      'status', r.status,
      'funnel_id', r.funnel_id,              -- ✅ ADICIONAR
      'funnel_name', f.name,                  -- ✅ ADICIONAR (JOIN)
      'column_id', r.column_id,               -- ✅ ADICIONAR
      'column_name', c.name                   -- ✅ ADICIONAR (JOIN)
    )
    -- ... outros campos
  )
  INTO result
  FROM lead_extraction_runs r
  LEFT JOIN funnels f ON f.id = r.funnel_id      -- ✅ JOIN necessário
  LEFT JOIN columns c ON c.id = r.column_id      -- ✅ JOIN necessário
  WHERE r.id = run_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 Como Usar a Funcionalidade

### **1. Acessar Detalhes da Extração**
- Na tela de Extrações, clique em uma extração **concluída**
- O botão **"Mover Leads"** aparecerá no header (ao lado do status)

### **2. Abrir Modal de Movimentação**
- Clique em **"Mover Leads"**
- Modal abre mostrando:
  - Informações da execução atual
  - Kanban e coluna atuais
  - Dropdowns para selecionar novo destino

### **3. Selecionar Destino**
- **Kanban**: Selecione o kanban de destino (pode ser o mesmo ou outro)
- **Coluna**: Selecione a coluna de destino
- O dropdown de colunas atualiza automaticamente quando você muda o kanban

### **4. Confirmar Movimentação**
- Clique em **"Confirmar Movimentação"**
- Sistema move **todos os leads** da execução para a nova coluna
- Feedback de sucesso com contagem de leads movidos
- Modal fecha automaticamente após 2 segundos

---

## 🔐 Segurança e Validações

### **Backend (Servidor):**

✅ **Validações Implementadas:**

1. Autenticação do usuário (token JWT)
2. Verificação de acesso ao workspace
3. Validação de existência da run
4. Validação de existência da coluna/kanban
5. Verificação se coluna pertence ao kanban selecionado
6. Bloqueio de movimentação para mesma coluna

### **Frontend (Modal):**

✅ **Validações Implementadas:**

1. Botão desabilitado se mesma coluna selecionada
2. Aviso visual se tentar mover para mesma coluna
3. Loading state durante processamento
4. Mensagens de erro claras
5. Feedback de sucesso

---

## 📊 Fluxo de Dados

```
┌─────────────────┐
│  ExtractionView │ (Lista de extrações)
└────────┬────────┘
         │ Clica em extração
         ▼
┌─────────────────────┐
│ ExtractionProgress  │ (Detalhes da extração)
│                     │
│ [Botão: Mover Leads]│ ◄── Aparece se status = 'completed'
└────────┬────────────┘
         │ Clica em "Mover Leads"
         ▼
┌─────────────────────┐
│  MoveLeadsModal     │ (Modal de movimentação)
│                     │
│ 1. Carrega kanbans  │ ◄── GET funnels + columns (Supabase)
│ 2. Seleciona destino│
│ 3. Confirma         │ ──► POST /queue-lead-migration
└─────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Backend                    │
│  /queue-lead-migration      │
│                             │
│  1. Valida auth             │
│  2. Valida workspace        │
│  3. Valida run              │
│  4. Valida coluna           │
│  5. UPDATE leads            │ ◄── Atualiza todos os leads
│  6. UPDATE run              │ ◄── Atualiza info da run
└─────────────────────────────┘
```

---

## 🧪 Testes

### **Testar Cenários:**

1. ✅ **Mover leads para outra coluna do mesmo kanban**
   - Deve funcionar normalmente

2. ✅ **Mover leads para coluna de outro kanban**
   - Deve funcionar normalmente

3. ✅ **Tentar mover para mesma coluna**
   - Botão deve estar desabilitado
   - Aviso visual amarelo

4. ✅ **Executar com grande volume de leads (>1000)**
   - Aviso sobre tempo de processamento
   - Processamento deve ser rápido (UPDATE em batch)

5. ✅ **Executar sem permissão (outro workspace)**
   - Erro 403: Acesso negado

---

## 🐛 Troubleshooting

### **Problema: Botão "Mover Leads" não aparece**

**Possíveis causas:**

1. Status da extração não é "completed"
2. Quantidade de leads criados = 0
3. Campos `funnel_id` ou `column_id` não estão sendo retornados pela RPC

**Solução:**
- Verifique no console do navegador se `analytics.run.funnel_id` e `analytics.run.column_id` existem
- Execute a RPC manualmente no SQL Editor e verifique o retorno

---

### **Problema: Modal abre mas dropdowns estão vazios**

**Possíveis causas:**

1. Não há kanbans no workspace
2. Erro ao carregar kanbans (permissões RLS?)

**Solução:**
- Abra o console do navegador e procure por erros
- Verifique se há kanbans criados no workspace
- Verifique permissões RLS nas tabelas `funnels` e `columns`

---

### **Problema: Erro ao confirmar movimentação**

**Possíveis causas:**

1. Erro de permissões no backend
2. Run não encontrada
3. Coluna/Kanban inválidos

**Solução:**
- Verifique logs do servidor no Supabase Edge Functions
- Verifique se a run existe e pertence ao workspace correto
- Verifique se a coluna existe e pertence ao kanban selecionado

---

## 📝 Notas Importantes

1. **Performance**: A movimentação é feita em um único UPDATE, então é rápida mesmo para milhares de leads

2. **Atomicidade**: A operação é atômica - ou move todos os leads ou não move nenhum

3. **Histórico**: A run é atualizada para refletir a nova localização dos leads

4. **Realtime**: Após movimentação, a tela de detalhes é atualizada automaticamente

---

## 🚀 Próximos Passos (Futuro)

- [ ] Adicionar histórico de movimentações
- [ ] Permitir selecionar múltiplas runs para mover em batch
- [ ] Adicionar preview de quantos leads há em cada coluna
- [ ] Adicionar opção de desfazer movimentação
- [ ] Adicionar filtros (mover apenas leads com determinados critérios)

---

## 💡 Dicas de UX

1. **Visual claro**: O modal mostra claramente de onde e para onde os leads estão sendo movidos

2. **Validação preventiva**: Impossível mover para a mesma coluna (botão desabilitado)

3. **Feedback imediato**: Sucesso mostrado em 2 segundos e modal fecha automaticamente

4. **Responsivo**: Funciona perfeitamente em mobile e desktop

---

Se tiver dúvidas ou problemas, verifique:
1. Console do navegador (F12)
2. Logs do Edge Function no Supabase
3. Retorno da RPC `get_extraction_analytics`
