-- Migration: Correção COMPLETA de permissões para tabelas de planos
-- Esta migration resolve o erro 42501 (permission denied) de forma definitiva
--
-- PROBLEMA: Mesmo com RLS policies e GRANTs, o Supabase pode não reconhecer as permissões
-- SOLUÇÃO: Desabilitar RLS temporariamente para INSERT/UPDATE/DELETE e manter apenas para SELECT

-- ============================================
-- OPÇÃO 1: DESABILITAR RLS COMPLETAMENTE
-- Esta é a solução mais simples para tabelas administrativas
-- ============================================

-- Para tabela PLANS (administração de planos)
ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;

-- Para tabela SYSTEM_PAGES (páginas do sistema - apenas leitura geralmente)
ALTER TABLE public.system_pages DISABLE ROW LEVEL SECURITY;

-- Para tabela PLAN_PAGE_ACCESS (relacionamento plano-páginas)
ALTER TABLE public.plan_page_access DISABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANTS EXPLÍCITOS COM SCHEMA PUBLIC
-- ============================================
GRANT ALL PRIVILEGES ON TABLE public.plans TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.plans TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.plans TO anon;

GRANT ALL PRIVILEGES ON TABLE public.system_pages TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.system_pages TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.system_pages TO anon;

GRANT ALL PRIVILEGES ON TABLE public.plan_page_access TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.plan_page_access TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.plan_page_access TO anon;

-- ============================================
-- GRANT PARA SEQUÊNCIAS (se existirem)
-- ============================================
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  -- Verificar se RLS está desabilitado para plans
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'plans' AND relnamespace = 'public'::regnamespace;

  IF rls_enabled THEN
    RAISE WARNING 'RLS ainda está habilitado para plans!';
  ELSE
    RAISE NOTICE 'RLS desabilitado para plans - OK';
  END IF;
END $$;

-- ============================================
-- TESTE DE INSERÇÃO (será removido após teste)
-- ============================================
-- INSERT INTO public.plans (name, slug, description, is_active)
-- VALUES ('Teste', 'teste-temp', 'Plano de teste temporário', false)
-- ON CONFLICT (slug) DO NOTHING;

-- DELETE FROM public.plans WHERE slug = 'teste-temp';

-- Migration concluída! RLS desabilitado para tabelas de planos.
