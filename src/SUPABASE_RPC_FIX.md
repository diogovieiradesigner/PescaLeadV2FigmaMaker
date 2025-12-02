# 🔧 Correção da Função RPC `get_extraction_analytics`

## ❌ Problema Identificado

A função RPC `get_extraction_analytics` está retornando o erro:

```
relation "lead_stats" does not exist
```

Isso significa que a função está tentando acessar uma tabela chamada `lead_stats` que não existe no banco de dados.

---

## ✅ Solução

Você precisa atualizar a função RPC no Supabase para **NÃO** referenciar a tabela `lead_stats`.

### **Passo 1: Acessar o SQL Editor no Supabase**

1. Acesse seu projeto no Supabase Dashboard
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Procure pela função `get_extraction_analytics`

### **Passo 2: Verificar a Implementação Atual**

Execute este comando para ver a definição atual da função:

```sql
SELECT pg_get_functiondef('get_extraction_analytics'::regproc);
```

### **Passo 3: Identificar Referências a `lead_stats`**

Procure no código da função por linhas como:

```sql
FROM lead_stats ...
JOIN lead_stats ...
SELECT * FROM lead_stats ...
```

### **Passo 4: Substituir por Tabelas Corretas**

A função deve usar apenas as tabelas existentes:

- ✅ `lead_extraction_runs` - Dados da execução
- ✅ `leads` - Leads extraídos
- ✅ `lead_extraction_staging` - Staging de leads
- ✅ `lead_extractions` - Configurações de extração

---

## 📋 Estrutura Esperada da Função

A função `get_extraction_analytics` deve retornar um JSON com a seguinte estrutura:

```sql
CREATE OR REPLACE FUNCTION get_extraction_analytics(
  p_run_id UUID DEFAULT NULL,
  p_workspace_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_run_id UUID;
BEGIN
  -- 1. Determinar qual run usar
  IF p_run_id IS NOT NULL THEN
    v_run_id := p_run_id;
  ELSIF p_workspace_id IS NOT NULL THEN
    SELECT id INTO v_run_id
    FROM lead_extraction_runs
    WHERE workspace_id = p_workspace_id
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT id INTO v_run_id
    FROM lead_extraction_runs
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Se não encontrou nenhum run
  IF v_run_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Montar o JSON de resposta
  SELECT json_build_object(
    'run', (
      SELECT json_build_object(
        'id', r.id,
        'extraction_id', r.extraction_id,
        'workspace_id', r.workspace_id,
        'search_term', r.search_term,
        'location', r.location,
        'niche', r.niche,
        'status', r.status,
        'target_quantity', r.target_quantity,
        'pages_consumed', r.pages_consumed,
        'found_quantity', r.found_quantity,
        'created_quantity', r.created_quantity,
        'duplicates_skipped', r.duplicates_skipped,
        'filtered_out', r.filtered_out,
        'credits_consumed', r.credits_consumed,
        'started_at', r.started_at,
        'finished_at', r.finished_at,
        'created_at', r.created_at,
        'success_rate', CASE 
          WHEN r.target_quantity > 0 
          THEN ROUND((r.created_quantity::numeric / r.target_quantity::numeric) * 100, 2)
          ELSE 0 
        END,
        'duration_formatted', CASE
          WHEN r.started_at IS NOT NULL AND r.finished_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (r.finished_at - r.started_at))::text || 's'
          WHEN r.started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - r.started_at))::text || 's'
          ELSE NULL
        END
      )
      FROM lead_extraction_runs r
      WHERE r.id = v_run_id
    ),
    
    'contatos', (
      SELECT json_agg(
        json_build_object(
          'name', metric_name,
          'value', metric_value,
          'percentage', metric_percentage
        )
      )
      FROM (
        SELECT 'Telefone' as metric_name, 
               COUNT(*) FILTER (WHERE phone IS NOT NULL) as metric_value,
               ROUND((COUNT(*) FILTER (WHERE phone IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 2) as metric_percentage
        FROM leads 
        WHERE extraction_run_id = v_run_id
        
        UNION ALL
        
        SELECT 'Email' as metric_name,
               COUNT(*) FILTER (WHERE email IS NOT NULL) as metric_value,
               ROUND((COUNT(*) FILTER (WHERE email IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 2) as metric_percentage
        FROM leads 
        WHERE extraction_run_id = v_run_id
        
        UNION ALL
        
        SELECT 'WhatsApp' as metric_name,
               COUNT(*) FILTER (WHERE whatsapp_number IS NOT NULL) as metric_value,
               ROUND((COUNT(*) FILTER (WHERE whatsapp_number IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 2) as metric_percentage
        FROM leads 
        WHERE extraction_run_id = v_run_id
        
        UNION ALL
        
        SELECT 'Website' as metric_name,
               COUNT(*) FILTER (WHERE website IS NOT NULL) as metric_value,
               ROUND((COUNT(*) FILTER (WHERE website IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 2) as metric_percentage
        FROM leads 
        WHERE extraction_run_id = v_run_id
      ) metrics
    ),
    
    'graficos', json_build_object(
      'pizza_contatos', (
        SELECT json_agg(json_build_object('name', name, 'value', value))
        FROM (
          SELECT 'Telefone' as name, COUNT(*) FILTER (WHERE phone IS NOT NULL) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Email' as name, COUNT(*) FILTER (WHERE email IS NOT NULL) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'WhatsApp' as name, COUNT(*) FILTER (WHERE whatsapp_number IS NOT NULL) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Website' as name, COUNT(*) FILTER (WHERE website IS NOT NULL) as value FROM leads WHERE extraction_run_id = v_run_id
        ) t WHERE value > 0
      ),
      'pizza_whatsapp', (
        SELECT json_agg(json_build_object('name', name, 'value', value))
        FROM (
          SELECT 'Válido' as name, COUNT(*) FILTER (WHERE whatsapp_number IS NOT NULL AND whatsapp_valid = true) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Inválido' as name, COUNT(*) FILTER (WHERE whatsapp_number IS NOT NULL AND whatsapp_valid = false) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Não Validado' as name, COUNT(*) FILTER (WHERE whatsapp_number IS NOT NULL AND whatsapp_valid IS NULL) as value FROM leads WHERE extraction_run_id = v_run_id
        ) t WHERE value > 0
      ),
      'pizza_website', (
        SELECT json_agg(json_build_object('name', name, 'value', value))
        FROM (
          SELECT 'Válido' as name, COUNT(*) FILTER (WHERE website IS NOT NULL AND website_status = 'active') as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Inválido' as name, COUNT(*) FILTER (WHERE website IS NOT NULL AND website_status = 'inactive') as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Não Validado' as name, COUNT(*) FILTER (WHERE website IS NOT NULL AND website_status IS NULL) as value FROM leads WHERE extraction_run_id = v_run_id
        ) t WHERE value > 0
      ),
      'pizza_qualidade', (
        SELECT json_agg(json_build_object('name', name, 'value', value))
        FROM (
          SELECT 'Excelente' as name, COUNT(*) FILTER (WHERE rating >= 4.5) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Bom' as name, COUNT(*) FILTER (WHERE rating >= 4.0 AND rating < 4.5) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Regular' as name, COUNT(*) FILTER (WHERE rating >= 3.0 AND rating < 4.0) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Ruim' as name, COUNT(*) FILTER (WHERE rating >= 2.0 AND rating < 3.0) as value FROM leads WHERE extraction_run_id = v_run_id
          UNION ALL
          SELECT 'Péssimo' as name, COUNT(*) FILTER (WHERE rating < 2.0) as value FROM leads WHERE extraction_run_id = v_run_id
        ) t WHERE value > 0
      ),
      'barras_enriquecimento', json_build_array(
        json_build_object('name', 'Scraping', 'value', 0),
        json_build_object('name', 'WHOIS', 'value', 0),
        json_build_object('name', 'CNPJ', 'value', 0)
      ),
      'barras_fontes', json_build_array(
        json_build_object('name', 'Google Maps', 'value', 0),
        json_build_object('name', 'API', 'value', 0),
        json_build_object('name', 'Scraping', 'value', 0)
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
```

---

## 🚀 Como Aplicar a Correção

### **Opção 1: Dropar e Recriar (RECOMENDADO)**

```sql
-- 1. Dropar a função atual
DROP FUNCTION IF EXISTS get_extraction_analytics(UUID, UUID);

-- 2. Criar a nova função (cole o código acima)
-- Cole todo o bloco CREATE OR REPLACE FUNCTION...
```

### **Opção 2: Apenas Substituir**

Se preferir, copie todo o código da função acima e execute no SQL Editor.

---

## ✅ Testar a Função

Após criar/atualizar a função, teste com:

```sql
-- Teste 1: Por run_id específico
SELECT get_extraction_analytics(p_run_id := 'seu-run-id-aqui'::uuid);

-- Teste 2: Por workspace_id (pega o mais recente)
SELECT get_extraction_analytics(p_workspace_id := 'seu-workspace-id'::uuid);

-- Teste 3: Sem parâmetros (pega o mais recente global)
SELECT get_extraction_analytics();
```

---

## 📊 Estrutura de Retorno Esperada

```json
{
  "run": {
    "id": "uuid",
    "status": "completed",
    "search_term": "restaurantes",
    "location": "São Paulo",
    "target_quantity": 100,
    "created_quantity": 85,
    "success_rate": 85.00,
    "duration_formatted": "120s"
  },
  "contatos": [
    { "name": "Telefone", "value": 75, "percentage": 88.24 },
    { "name": "Email", "value": 60, "percentage": 70.59 },
    { "name": "WhatsApp", "value": 50, "percentage": 58.82 },
    { "name": "Website", "value": 80, "percentage": 94.12 }
  ],
  "graficos": {
    "pizza_contatos": [
      { "name": "Telefone", "value": 75 },
      { "name": "Email", "value": 60 }
    ],
    "pizza_whatsapp": [
      { "name": "Válido", "value": 45 },
      { "name": "Inválido", "value": 5 }
    ],
    "barras_enriquecimento": [
      { "name": "Scraping", "value": 50 },
      { "name": "WHOIS", "value": 30 }
    ]
  }
}
```

---

## ⚠️ Notas Importantes

1. **Certifique-se** de que as tabelas `leads` e `lead_extraction_runs` existem
2. **Ajuste os campos** conforme sua estrutura real de banco (phone, email, whatsapp_number, etc.)
3. **Não use** a tabela `lead_stats` - ela não existe
4. Se os campos tiverem nomes diferentes, ajuste na função (ex: `telefone` ao invés de `phone`)

---

## 🆘 Ainda com Problemas?

Se o erro persistir:

1. Verifique se as tabelas existem:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

2. Verifique a estrutura da tabela `leads`:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'leads';
   ```

3. Compartilhe o output dos comandos acima para ajustarmos a função.
