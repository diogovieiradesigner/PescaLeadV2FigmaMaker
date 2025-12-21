# ✅ Correção: Status de Enriquecimento

## 🔍 Problema Identificado

O campo `status_enrichment` na tabela `lead_extraction_staging` nunca era atualizado para `'completed'`, mesmo quando todos os enriquecimentos estavam completos.

### Causa Raiz

1. **Edge Functions não atualizavam `status_enrichment`:**
   - `enrich-cnpj`: Atualiza apenas `cnpj_enriched = true`
   - `enrich-whois`: Atualiza apenas `whois_enriched = true`
   - `process-scraping-queue`: Atualiza apenas `scraping_enriched = true`
   - Nenhuma delas verifica se todos os enriquecimentos estão completos

2. **Não existia trigger para atualizar automaticamente:**
   - Não havia nenhum trigger SQL que verificasse quando todos os enriquecimentos estavam completos
   - O `status_enrichment` ficava sempre como `'pending'`

---

## ✅ Solução Implementada

### 1. Função SQL: `update_status_enrichment_on_complete()`

Criada função que verifica se todos os enriquecimentos aplicáveis estão completos:

```sql
CREATE OR REPLACE FUNCTION update_status_enrichment_on_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_all_complete BOOLEAN := TRUE;
  v_has_domain BOOLEAN := FALSE;
  v_has_cnpj BOOLEAN := FALSE;
  v_has_website BOOLEAN := FALSE;
BEGIN
  -- Verificar se tem domínio .br (para WHOIS)
  v_has_domain := (NEW.domain IS NOT NULL AND NEW.domain != '' AND NEW.domain LIKE '%.br');
  
  -- Verificar se tem CNPJ (para enriquecimento CNPJ)
  v_has_cnpj := (NEW.cnpj_normalized IS NOT NULL AND NEW.cnpj_normalized != '');
  
  -- Verificar se tem website (para scraping)
  v_has_website := (NEW.primary_website IS NOT NULL AND NEW.primary_website != '');
  
  -- Se tem domínio .br, precisa ter whois_enriched = true
  IF v_has_domain AND (NEW.whois_enriched IS NULL OR NEW.whois_enriched = false) THEN
    v_all_complete := FALSE;
  END IF;
  
  -- Se tem CNPJ, precisa ter cnpj_enriched = true
  IF v_has_cnpj AND (NEW.cnpj_enriched IS NULL OR NEW.cnpj_enriched = false) THEN
    v_all_complete := FALSE;
  END IF;
  
  -- Se tem website, precisa ter scraping_enriched = true
  IF v_has_website AND (NEW.scraping_enriched IS NULL OR NEW.scraping_enriched = false) THEN
    v_all_complete := FALSE;
  END IF;
  
  -- Se não tem nenhum campo para enriquecer, considerar completo
  IF NOT v_has_domain AND NOT v_has_cnpj AND NOT v_has_website THEN
    v_all_complete := TRUE;
  END IF;
  
  -- Atualizar status_enrichment
  IF v_all_complete THEN
    NEW.status_enrichment := 'completed';
  ELSIF NEW.status_enrichment = 'pending' THEN
    -- Se ainda está pending e não está completo, mudar para 'enriching' se pelo menos um foi iniciado
    IF (NEW.whois_enriched = true OR NEW.cnpj_enriched = true OR NEW.scraping_enriched = true) THEN
      NEW.status_enrichment := 'enriching';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Lógica:**
- Verifica se o lead tem domínio `.br` → precisa de WHOIS
- Verifica se tem CNPJ → precisa de enriquecimento CNPJ
- Verifica se tem website → precisa de scraping
- Se todos os enriquecimentos aplicáveis estão completos → `status_enrichment = 'completed'`
- Se pelo menos um enriquecimento foi iniciado mas não completo → `status_enrichment = 'enriching'`

---

### 2. Trigger: `trg_update_status_enrichment`

Criado trigger que executa a função automaticamente após UPDATE:

```sql
CREATE TRIGGER trg_update_status_enrichment
  BEFORE UPDATE ON lead_extraction_staging
  FOR EACH ROW
  WHEN (
    OLD.whois_enriched IS DISTINCT FROM NEW.whois_enriched OR
    OLD.cnpj_enriched IS DISTINCT FROM NEW.cnpj_enriched OR
    OLD.scraping_enriched IS DISTINCT FROM NEW.scraping_enriched OR
    OLD.domain IS DISTINCT FROM NEW.domain OR
    OLD.cnpj_normalized IS DISTINCT FROM NEW.cnpj_normalized OR
    OLD.primary_website IS DISTINCT FROM NEW.primary_website
  )
  EXECUTE FUNCTION update_status_enrichment_on_complete();
```

**Quando executa:**
- Antes de qualquer UPDATE na tabela `lead_extraction_staging`
- Apenas quando campos relacionados a enriquecimento mudam
- Atualiza automaticamente o `status_enrichment`

---

### 3. Função de Correção: `fix_pending_enrichment_status()`

Criada função para corrigir leads antigos que já têm enriquecimentos completos mas `status_enrichment = 'pending'`:

```sql
CREATE OR REPLACE FUNCTION fix_pending_enrichment_status()
RETURNS TABLE(
  updated_count INTEGER,
  lead_id UUID,
  old_status TEXT,
  new_status TEXT
) AS $$
-- ... (ver implementação completa no banco)
```

**Resultado:**
- ✅ **Mais de 1.000 leads corrigidos** automaticamente
- ✅ Lead HH Sobrinho agora tem `status_enrichment = 'completed'`

---

## 📊 Resultados

### Antes da Correção:
- `status_enrichment = 'pending'` mesmo com todos os enriquecimentos completos
- Impossível saber quando um lead estava realmente completo
- Leads antigos nunca atualizavam o status

### Depois da Correção:
- ✅ `status_enrichment` atualiza automaticamente para `'completed'` quando todos os enriquecimentos aplicáveis estão completos
- ✅ Trigger funciona automaticamente para novos enriquecimentos
- ✅ Mais de 1.000 leads antigos corrigidos
- ✅ Lead HH Sobrinho: `status_enrichment = 'completed'` ✅

---

## 🔄 Como Funciona Agora

### Fluxo Automático:

1. **Edge Function atualiza enriquecimento específico:**
   ```typescript
   // enrich-cnpj atualiza:
   await supabase.from('lead_extraction_staging').update({
     cnpj_enriched: true,
     cnpj_checked_at: new Date().toISOString()
   })
   ```

2. **Trigger detecta mudança:**
   - Trigger `trg_update_status_enrichment` detecta que `cnpj_enriched` mudou
   - Executa função `update_status_enrichment_on_complete()`

3. **Função verifica completude:**
   - Verifica se tem CNPJ → precisa de `cnpj_enriched = true` ✅
   - Verifica se tem domínio `.br` → precisa de `whois_enriched = true` ✅
   - Verifica se tem website → precisa de `scraping_enriched = true` ✅
   - Se todos aplicáveis estão completos → `status_enrichment = 'completed'` ✅

4. **Status atualizado automaticamente:**
   - `status_enrichment` muda de `'pending'` → `'enriching'` → `'completed'`
   - Tudo acontece automaticamente, sem necessidade de código adicional

---

## 🎯 Benefícios

1. ✅ **Automático:** Não precisa atualizar manualmente nas Edge Functions
2. ✅ **Consistente:** Sempre reflete o estado real dos enriquecimentos
3. ✅ **Eficiente:** Trigger só executa quando campos relevantes mudam
4. ✅ **Retroativo:** Função de correção atualiza leads antigos
5. ✅ **Confiável:** Lógica centralizada em uma função SQL

---

## 📝 Próximos Passos (Opcional)

Se quiser melhorar ainda mais:

1. **Adicionar logs:** Criar tabela de logs para rastrear mudanças de status
2. **Métricas:** Criar função para calcular taxa de completude por run
3. **Notificações:** Notificar quando todos os leads de um run estão completos
4. **Dashboard:** Mostrar status de enriquecimento em tempo real

---

## ✅ Status Final

- ✅ Função criada e testada
- ✅ Trigger criado e ativo
- ✅ Mais de 1.000 leads corrigidos
- ✅ Lead HH Sobrinho corrigido: `status_enrichment = 'completed'`
- ✅ Sistema funcionando automaticamente para novos enriquecimentos

**Problema resolvido!** 🎉

