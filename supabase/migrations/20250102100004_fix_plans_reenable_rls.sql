-- Migration: Reabilitar RLS com políticas permissivas
-- O erro 406 pode ocorrer quando RLS está desabilitado sem configuração correta

-- ============================================
-- 1. REABILITAR RLS
-- ============================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_page_access ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROPAR TODAS AS POLÍTICAS EXISTENTES
-- ============================================
DROP POLICY IF EXISTS "plans_full_access_authenticated" ON public.plans;
DROP POLICY IF EXISTS "plans_full_access_service_role" ON public.plans;
DROP POLICY IF EXISTS "plans_select_authenticated" ON public.plans;
DROP POLICY IF EXISTS "plans_insert_authenticated" ON public.plans;
DROP POLICY IF EXISTS "plans_update_authenticated" ON public.plans;
DROP POLICY IF EXISTS "plans_delete_authenticated" ON public.plans;
DROP POLICY IF EXISTS "plans_all_service_role" ON public.plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.plans;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.plans;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.plans;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.plans;
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
DROP POLICY IF EXISTS "plans_authenticated_all" ON public.plans;

DROP POLICY IF EXISTS "system_pages_full_access_authenticated" ON public.system_pages;
DROP POLICY IF EXISTS "system_pages_full_access_service_role" ON public.system_pages;
DROP POLICY IF EXISTS "system_pages_select_authenticated" ON public.system_pages;
DROP POLICY IF EXISTS "system_pages_insert_authenticated" ON public.system_pages;
DROP POLICY IF EXISTS "system_pages_update_authenticated" ON public.system_pages;
DROP POLICY IF EXISTS "system_pages_delete_authenticated" ON public.system_pages;
DROP POLICY IF EXISTS "system_pages_all_service_role" ON public.system_pages;

DROP POLICY IF EXISTS "plan_page_access_full_access_authenticated" ON public.plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_full_access_service_role" ON public.plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_select_authenticated" ON public.plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_insert_authenticated" ON public.plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_update_authenticated" ON public.plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_delete_authenticated" ON public.plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_all_service_role" ON public.plan_page_access;

-- ============================================
-- 3. CRIAR POLÍTICAS PERMISSIVAS (INCLUINDO ANON)
-- ============================================

-- PLANS: Leitura pública, escrita autenticada
CREATE POLICY "plans_public_select" ON public.plans
  FOR SELECT
  USING (true);

CREATE POLICY "plans_authenticated_insert" ON public.plans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "plans_authenticated_update" ON public.plans
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "plans_authenticated_delete" ON public.plans
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "plans_service_role_all" ON public.plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- SYSTEM_PAGES: Leitura pública, escrita autenticada
CREATE POLICY "system_pages_public_select" ON public.system_pages
  FOR SELECT
  USING (true);

CREATE POLICY "system_pages_authenticated_insert" ON public.system_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "system_pages_authenticated_update" ON public.system_pages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "system_pages_authenticated_delete" ON public.system_pages
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "system_pages_service_role_all" ON public.system_pages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- PLAN_PAGE_ACCESS: Leitura pública, escrita autenticada
CREATE POLICY "plan_page_access_public_select" ON public.plan_page_access
  FOR SELECT
  USING (true);

CREATE POLICY "plan_page_access_authenticated_insert" ON public.plan_page_access
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "plan_page_access_authenticated_update" ON public.plan_page_access
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "plan_page_access_authenticated_delete" ON public.plan_page_access
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "plan_page_access_service_role_all" ON public.plan_page_access
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. GRANTS
-- ============================================
GRANT SELECT ON TABLE public.plans TO anon;
GRANT ALL ON TABLE public.plans TO authenticated;
GRANT ALL ON TABLE public.plans TO service_role;

GRANT SELECT ON TABLE public.system_pages TO anon;
GRANT ALL ON TABLE public.system_pages TO authenticated;
GRANT ALL ON TABLE public.system_pages TO service_role;

GRANT SELECT ON TABLE public.plan_page_access TO anon;
GRANT ALL ON TABLE public.plan_page_access TO authenticated;
GRANT ALL ON TABLE public.plan_page_access TO service_role;

-- ============================================
-- 5. VERIFICAÇÃO
-- ============================================
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('plans', 'system_pages', 'plan_page_access')
GROUP BY tablename;
