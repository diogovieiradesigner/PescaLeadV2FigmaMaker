-- Migration: Corrigir GRANTS das tabelas de planos
-- O erro 42501 indica que faltam permissões básicas nas tabelas

-- ============================================
-- GRANTS PARA TABELA PLANS
-- ============================================
GRANT ALL ON TABLE plans TO authenticated;
GRANT ALL ON TABLE plans TO service_role;
GRANT SELECT ON TABLE plans TO anon;

-- ============================================
-- GRANTS PARA TABELA SYSTEM_PAGES
-- ============================================
GRANT ALL ON TABLE system_pages TO authenticated;
GRANT ALL ON TABLE system_pages TO service_role;
GRANT SELECT ON TABLE system_pages TO anon;

-- ============================================
-- GRANTS PARA TABELA PLAN_PAGE_ACCESS
-- ============================================
GRANT ALL ON TABLE plan_page_access TO authenticated;
GRANT ALL ON TABLE plan_page_access TO service_role;
GRANT SELECT ON TABLE plan_page_access TO anon;

-- ============================================
-- VERIFICAR SE AS POLÍTICAS EXISTEM
-- ============================================
DO $$
DECLARE
  pol_count INT;
BEGIN
  SELECT COUNT(*) INTO pol_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('plans', 'system_pages', 'plan_page_access');

  RAISE NOTICE 'Total de políticas RLS: %', pol_count;

  -- Listar políticas
  FOR pol_count IN
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'plans'
  LOOP
    RAISE NOTICE 'Política encontrada em plans';
  END LOOP;
END $$;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('plans', 'system_pages', 'plan_page_access')
ORDER BY tablename, policyname;
