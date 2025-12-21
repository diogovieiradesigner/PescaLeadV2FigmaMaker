# 🔧 Correção: Nome Individual para Cada Run de Extração

## 🎯 Problema Identificado

**Situação:**
- Todas as runs da mesma extração apareciam com o mesmo nome no frontend
- O frontend estava usando `extraction_name` da configuração para todas as runs
- Não havia como distinguir visualmente diferentes execuções da mesma extração

**Exemplo do Problema:**
```
Histórico de Extrações:
- "Lojas Material de Construção Itaguaí Rio de Janeiro" (09/12/2025 22:07)
- "Lojas Material de Construção Itaguaí Rio de Janeiro" (09/12/2025 13:11)
- "Lojas Material de Construção Itaguaí Rio de Janeiro" (09/12/2025 09:34)
```

Todas com o mesmo nome! 😕

---

## ✅ Solução Implementada

### **1. Novo Campo `run_name`**

Adicionado campo `run_name` na tabela `lead_extraction_runs`:

```sql
ALTER TABLE lead_extraction_runs
ADD COLUMN run_name TEXT;
```

**Características:**
- ✅ Campo opcional (pode ser NULL)
- ✅ Se NULL, será gerado automaticamente pelo trigger
- ✅ Pode ser definido manualmente se necessário

---

### **2. Função de Geração Automática**

Criada função `generate_extraction_run_name()`:

```sql
CREATE OR REPLACE FUNCTION generate_extraction_run_name(
  p_extraction_name TEXT,
  p_run_created_at TIMESTAMP WITHOUT TIME ZONE
)
RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(p_extraction_name) || ' - ' || 
         TO_CHAR(p_run_created_at, 'DD/MM/YYYY') || ' ' ||
         TO_CHAR(p_run_created_at, 'HH24:MI');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Formato Gerado:**
```
"Nome da Extração - DD/MM/YYYY HH:MI"
```

**Exemplo:**
```
"Lojas Material de Construção Itaguaí Rio de Janeiro - 09/12/2025 22:07"
```

---

### **3. Trigger Automático**

Criado trigger `trg_set_extraction_run_name` que:

1. ✅ Executa **antes** de inserir nova run
2. ✅ Verifica se `run_name` já foi definido
3. ✅ Se NULL, busca `extraction_name` da config
4. ✅ Gera nome automático usando função acima
5. ✅ Define `run_name` antes de salvar

**Código do Trigger:**
```sql
CREATE TRIGGER trg_set_extraction_run_name
  BEFORE INSERT ON lead_extraction_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_extraction_run_name();
```

---

### **4. Atualização de Runs Existentes**

Migração atualiza todas as runs existentes que não têm nome:

```sql
UPDATE lead_extraction_runs ler
SET run_name = generate_extraction_run_name(
  le.extraction_name,
  COALESCE(ler.created_at, NOW())
)
FROM lead_extractions le
WHERE ler.extraction_id = le.id
  AND (ler.run_name IS NULL OR ler.run_name = '');
```

---

## 📊 Resultado Final

### **Antes:**
```
Histórico de Extrações:
- "Lojas Material de Construção Itaguaí Rio de Janeiro" (09/12/2025 22:07)
- "Lojas Material de Construção Itaguaí Rio de Janeiro" (09/12/2025 13:11)
- "Lojas Material de Construção Itaguaí Rio de Janeiro" (09/12/2025 09:34)
```

### **Depois:**
```
Histórico de Extrações:
- "Lojas Material de Construção Itaguaí Rio de Janeiro - 09/12/2025 22:07" ✅
- "Lojas Material de Construção Itaguaí Rio de Janeiro - 09/12/2025 13:11" ✅
- "Lojas Material de Construção Itaguaí Rio de Janeiro - 09/12/2025 09:34" ✅
```

Agora cada run tem seu próprio nome único! 🎉

---

## 🎯 Como Usar no Frontend

### **Opção 1: Usar `run_name` (Recomendado)**

```typescript
// Buscar runs com run_name
const { data: runs } = await supabase
  .from('lead_extraction_runs')
  .select(`
    id,
    run_name,  // ✅ Usar este campo
    status,
    created_at,
    created_quantity,
    target_quantity
  `)
  .order('created_at', { ascending: false })
  .limit(30);

// Exibir no frontend
runs.map(run => (
  <div key={run.id}>
    <h3>{run.run_name || 'Sem nome'}</h3>
    {/* ... */}
  </div>
));
```

### **Opção 2: Fallback para `extraction_name`**

```typescript
// Se run_name não existir (runs antigas), usar extraction_name
const displayName = run.run_name || 
  `${extraction.extraction_name} - ${formatDate(run.created_at)}`;
```

---

## 🔍 Verificação

### **Verificar Runs com Nome:**

```sql
SELECT 
    ler.id,
    ler.run_name,
    ler.created_at,
    le.extraction_name
FROM lead_extraction_runs ler
JOIN lead_extractions le ON le.id = ler.extraction_id
ORDER BY ler.created_at DESC
LIMIT 10;
```

**Deve retornar:**
- ✅ `run_name` preenchido para todas as runs
- ✅ Formato: `"Nome da Extração - DD/MM/YYYY HH:MI"`

---

## 📝 Notas Importantes

1. **Runs Novas:** Nome é gerado automaticamente pelo trigger
2. **Runs Antigas:** Foram atualizadas pela migração
3. **Nome Manual:** Você pode definir `run_name` manualmente ao criar a run
4. **Formato:** Sempre inclui data e hora para garantir unicidade

---

## ✅ Status

- ✅ Campo `run_name` adicionado
- ✅ Função de geração criada
- ✅ Trigger automático configurado
- ✅ Runs existentes atualizadas
- ✅ Índice criado para performance
- ✅ Migração aplicada no banco

**Próximo Passo:** Atualizar frontend para usar `run_name` ao invés de `extraction_name`! 🚀

---

**Status:** ✅ **Migração Aplicada - Pronto para Usar!**

