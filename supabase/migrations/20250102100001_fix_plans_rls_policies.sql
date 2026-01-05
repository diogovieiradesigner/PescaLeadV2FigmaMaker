-- Migration: Corrigir políticas RLS das tabelas de planos
-- Data: 2025-01-02
-- Descrição: Garante que as políticas RLS permitem acesso para usuários autenticados

-- ============================================
-- VERIFICAR E CORRIGIR POLÍTICAS PARA PLANS
-- ============================================

-- Garantir que RLS está habilitado
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Dropar todas as políticas existentes
DROP POLICY IF EXISTS "plans_select_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_insert_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_update_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_delete_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_all_service_role" ON plans;
DROP POLICY IF EXISTS "plans_all_authenticated" ON plans;
DROP POLICY IF EXISTS "Enable read access for all users" ON plans;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON plans;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON plans;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON plans;

-- Criar política única que permite TODAS as operações para authenticated
CREATE POLICY "plans_full_access_authenticated" ON plans
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para service_role
CREATE POLICY "plans_full_access_service_role" ON plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICAR E CORRIGIR POLÍTICAS PARA SYSTEM_PAGES
-- ============================================

ALTER TABLE system_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_pages_select_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_insert_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_update_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_delete_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_all_service_role" ON system_pages;
DROP POLICY IF EXISTS "system_pages_all_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_full_access_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_full_access_service_role" ON system_pages;

CREATE POLICY "system_pages_full_access_authenticated" ON system_pages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "system_pages_full_access_service_role" ON system_pages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICAR E CORRIGIR POLÍTICAS PARA PLAN_PAGE_ACCESS
-- ============================================

ALTER TABLE plan_page_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_page_access_select_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_insert_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_update_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_delete_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_all_service_role" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_all_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_full_access_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_full_access_service_role" ON plan_page_access;

CREATE POLICY "plan_page_access_full_access_authenticated" ON plan_page_access
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "plan_page_access_full_access_service_role" ON plan_page_access
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('plans', 'system_pages', 'plan_page_access');

  RAISE NOTICE '✅ Total de políticas RLS criadas: %', policy_count;
END $$;
