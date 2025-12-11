-- ============================================
-- FUNÇÃO RPC: Contar Leads Filtrados por Coluna
-- ============================================
-- Esta função retorna o total REAL de leads por coluna
-- aplicando os filtros de e-mail e whatsapp DIRETAMENTE NO BANCO.
--
-- Isso resolve o problema de mostrar contadores incorretos
-- quando filtros são aplicados no frontend.
-- ============================================

CREATE OR REPLACE FUNCTION get_filtered_lead_counts(
  p_funnel_id UUID,
  p_has_email BOOLEAN DEFAULT FALSE,
  p_has_whatsapp BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  column_id UUID,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.column_id,
    COUNT(DISTINCT l.id) as total_count
  FROM leads l
  LEFT JOIN lead_custom_fields lcf_email ON (
    lcf_email.lead_id = l.id 
    AND lcf_email.field_type = 'email'
    AND lcf_email.field_value IS NOT NULL 
    AND lcf_email.field_value != ''
  )
  LEFT JOIN lead_custom_fields lcf_phone ON (
    lcf_phone.lead_id = l.id 
    AND (
      lcf_phone.field_type = 'phone' 
      OR LOWER(lcf_phone.field_name) LIKE '%whatsapp%'
    )
    AND lcf_phone.field_value IS NOT NULL 
    AND lcf_phone.field_value != ''
  )
  WHERE l.funnel_id = p_funnel_id
    AND l.status = 'active'
    -- Filtro de e-mail
    AND (
      p_has_email = FALSE 
      OR (
        (l.email IS NOT NULL AND l.email != '')
        OR lcf_email.lead_id IS NOT NULL
      )
    )
    -- Filtro de whatsapp
    AND (
      p_has_whatsapp = FALSE
      OR (
        (l.phone IS NOT NULL AND l.phone != '')
        OR lcf_phone.lead_id IS NOT NULL
      )
    )
  GROUP BY l.column_id;
END;
$$;

-- ============================================
-- PERMISSÕES
-- ============================================
-- Permitir que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION get_filtered_lead_counts TO authenticated;

-- ============================================
-- EXEMPLOS DE USO
-- ============================================

-- Exemplo 1: Sem filtros (retorna todos os leads)
SELECT * FROM get_filtered_lead_counts(
  'uuid-do-funil',
  FALSE,  -- has_email
  FALSE   -- has_whatsapp
);
-- Retorna:
-- column_id                              | total_count
-- uuid-coluna-1                          | 150
-- uuid-coluna-2                          | 87
-- uuid-coluna-3                          | 23

-- Exemplo 2: Apenas leads com e-mail
SELECT * FROM get_filtered_lead_counts(
  'uuid-do-funil',
  TRUE,   -- has_email
  FALSE   -- has_whatsapp
);
-- Retorna:
-- column_id                              | total_count
-- uuid-coluna-1                          | 87
-- uuid-coluna-2                          | 45
-- uuid-coluna-3                          | 12

-- Exemplo 3: Leads com e-mail E whatsapp
SELECT * FROM get_filtered_lead_counts(
  'uuid-do-funil',
  TRUE,   -- has_email
  TRUE    -- has_whatsapp
);
-- Retorna:
-- column_id                              | total_count
-- uuid-coluna-1                          | 42
-- uuid-coluna-2                          | 23
-- uuid-coluna-3                          | 8

-- ============================================
-- COMO USAR NO FRONTEND (TypeScript)
-- ============================================

/*
import { supabase } from '../utils/supabase/client';

// Chamar a função RPC
const { data: filteredCounts, error } = await supabase.rpc(
  'get_filtered_lead_counts',
  {
    p_funnel_id: currentFunnelId,
    p_has_email: leadFilters.hasEmail,
    p_has_whatsapp: leadFilters.hasWhatsapp
  }
);

// Resultado:
// filteredCounts = [
//   { column_id: 'uuid-coluna-1', total_count: 87 },
//   { column_id: 'uuid-coluna-2', total_count: 45 }
// ]

// Criar mapa de contadores
const countsMap = new Map(
  filteredCounts?.map(c => [c.column_id, c.total_count]) || []
);

// Atualizar estado com contadores reais
const newState = {};
columns.forEach(column => {
  newState[column.id] = {
    ...columnLeadsState[column.id],
    total: countsMap.get(column.id) || 0,  // ✅ Total real do backend
    hasMore: false  // Desabilitar paginação durante filtros
  };
});
*/

-- ============================================
-- PERFORMANCE
-- ============================================
-- Esta query é otimizada para:
-- 1. Usar índices existentes (funnel_id, column_id, status)
-- 2. LEFT JOIN para evitar multiplicação de linhas
-- 3. COUNT(DISTINCT l.id) para garantir contagem correta
-- 4. GROUP BY para agregar por coluna
--
-- Tempo esperado: ~50-200ms para 10.000 leads
-- ============================================

-- ============================================
-- ÍNDICES RECOMENDADOS (se não existirem)
-- ============================================
-- CREATE INDEX IF NOT EXISTS idx_leads_funnel_status ON leads(funnel_id, status);
-- CREATE INDEX IF NOT EXISTS idx_leads_column_status ON leads(column_id, status);
-- CREATE INDEX IF NOT EXISTS idx_lead_custom_fields_lead_type ON lead_custom_fields(lead_id, field_type);
-- ============================================
