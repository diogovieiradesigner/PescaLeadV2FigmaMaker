-- Migration: Sistema de Planos e Controle de Acesso por Página
-- Data: 2025-01-02
-- Descrição: Cria tabelas para gerenciar planos de acesso e restrições de páginas por workspace
-- AUDITADA E CORRIGIDA

-- ============================================
-- 1. Tabela de Planos
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca (com IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

-- Comentário da tabela
COMMENT ON TABLE plans IS 'Planos de acesso que definem quais páginas cada workspace pode acessar';

-- ============================================
-- 2. Tabela de Páginas do Sistema
-- ============================================
CREATE TABLE IF NOT EXISTS system_pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT,
  display_order INT DEFAULT 0
);

-- Comentário da tabela
COMMENT ON TABLE system_pages IS 'Páginas disponíveis no sistema cliente (Pesca Lead)';

-- ============================================
-- 3. Tabela de Acesso: Plano → Páginas
-- ============================================
CREATE TABLE IF NOT EXISTS plan_page_access (
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  page_id TEXT REFERENCES system_pages(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, page_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_plan_page_access_plan_id ON plan_page_access(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_page_access_page_id ON plan_page_access(page_id);

-- Comentário da tabela
COMMENT ON TABLE plan_page_access IS 'Relacionamento N:N entre planos e páginas permitidas';

-- ============================================
-- 4. Adicionar plan_id em workspaces (se não existir)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspaces' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN plan_id UUID REFERENCES plans(id);
  END IF;
END $$;

-- Índice separado (com IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_workspaces_plan_id ON workspaces(plan_id);

-- ============================================
-- 5. Dados iniciais: Páginas do sistema
-- ============================================
INSERT INTO system_pages (id, name, path, icon, display_order) VALUES
  ('dashboard', 'Dashboard', '/dashboard', 'Home', 1),
  ('pipeline', 'Pipeline', '/pipeline', 'Target', 2),
  ('chat', 'Chat', '/chat', 'MessageSquare', 3),
  ('extraction', 'Extração', '/extracao', 'Download', 4),
  ('campaign', 'Campanha', '/campanhas', 'Megaphone', 5),
  ('ai-service', 'Atendimento de I.A', '/ia', 'Bot', 6),
  ('calendar', 'Calendário', '/calendario', 'Calendar', 7),
  ('documents', 'Documentos', '/documentos', 'FileText', 8),
  ('ai-assistant', 'Assistente IA', '/assistente-ia', 'BrainCircuit', 9)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

-- ============================================
-- 6. Plano "Completo" para migração
-- ============================================
INSERT INTO plans (name, slug, description, is_active) VALUES
  ('Completo', 'completo', 'Acesso a todas as funcionalidades', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 7. Dar acesso total ao plano Completo
-- ============================================
INSERT INTO plan_page_access (plan_id, page_id)
SELECT p.id, sp.id
FROM plans p, system_pages sp
WHERE p.slug = 'completo'
ON CONFLICT (plan_id, page_id) DO NOTHING;

-- ============================================
-- 8. Migrar workspaces existentes para plano Completo
-- ============================================
UPDATE workspaces
SET plan_id = (SELECT id FROM plans WHERE slug = 'completo')
WHERE plan_id IS NULL;

-- ============================================
-- 9. Função: Obter páginas acessíveis do workspace
-- ============================================
CREATE OR REPLACE FUNCTION get_workspace_accessible_pages(p_workspace_id UUID)
RETURNS TABLE (
  page_id TEXT,
  page_name TEXT,
  page_path TEXT,
  page_icon TEXT,
  display_order INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.name,
    sp.path,
    sp.icon,
    sp.display_order
  FROM workspaces w
  JOIN plan_page_access ppa ON ppa.plan_id = w.plan_id
  JOIN system_pages sp ON sp.id = ppa.page_id
  WHERE w.id = p_workspace_id
  ORDER BY sp.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_workspace_accessible_pages(UUID) IS 'Retorna as páginas que um workspace pode acessar baseado no seu plano';

-- ============================================
-- 10. Função: Verificar se workspace tem acesso a página
-- ============================================
CREATE OR REPLACE FUNCTION workspace_has_page_access(p_workspace_id UUID, p_page_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspaces w
    JOIN plan_page_access ppa ON ppa.plan_id = w.plan_id
    WHERE w.id = p_workspace_id AND ppa.page_id = p_page_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION workspace_has_page_access(UUID, TEXT) IS 'Verifica se um workspace tem acesso a uma página específica';

-- ============================================
-- 11. Função: Obter plano do workspace
-- ============================================
CREATE OR REPLACE FUNCTION get_workspace_plan(p_workspace_id UUID)
RETURNS TABLE (
  plan_id UUID,
  plan_name TEXT,
  plan_slug TEXT,
  plan_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.description
  FROM workspaces w
  JOIN plans p ON p.id = w.plan_id
  WHERE w.id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_workspace_plan(UUID) IS 'Retorna informações do plano associado ao workspace';

-- ============================================
-- 12. RLS (Row Level Security) para as novas tabelas
-- ============================================

-- =====================
-- PLANS
-- =====================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Drop policies se existirem (idempotente)
DROP POLICY IF EXISTS "plans_select_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_insert_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_update_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_delete_authenticated" ON plans;
DROP POLICY IF EXISTS "plans_all_service_role" ON plans;

CREATE POLICY "plans_select_authenticated" ON plans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "plans_insert_authenticated" ON plans
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "plans_update_authenticated" ON plans
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "plans_delete_authenticated" ON plans
  FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "plans_all_service_role" ON plans
  FOR ALL TO service_role
  USING (true);

-- =====================
-- SYSTEM_PAGES
-- =====================
ALTER TABLE system_pages ENABLE ROW LEVEL SECURITY;

-- Drop policies se existirem (idempotente)
DROP POLICY IF EXISTS "system_pages_select_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_insert_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_update_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_delete_authenticated" ON system_pages;
DROP POLICY IF EXISTS "system_pages_all_service_role" ON system_pages;

CREATE POLICY "system_pages_select_authenticated" ON system_pages
  FOR SELECT TO authenticated
  USING (true);

-- Admin precisa poder gerenciar páginas do sistema
CREATE POLICY "system_pages_insert_authenticated" ON system_pages
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "system_pages_update_authenticated" ON system_pages
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "system_pages_delete_authenticated" ON system_pages
  FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "system_pages_all_service_role" ON system_pages
  FOR ALL TO service_role
  USING (true);

-- =====================
-- PLAN_PAGE_ACCESS
-- =====================
ALTER TABLE plan_page_access ENABLE ROW LEVEL SECURITY;

-- Drop policies se existirem (idempotente)
DROP POLICY IF EXISTS "plan_page_access_select_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_insert_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_update_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_delete_authenticated" ON plan_page_access;
DROP POLICY IF EXISTS "plan_page_access_all_service_role" ON plan_page_access;

CREATE POLICY "plan_page_access_select_authenticated" ON plan_page_access
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "plan_page_access_insert_authenticated" ON plan_page_access
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "plan_page_access_update_authenticated" ON plan_page_access
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "plan_page_access_delete_authenticated" ON plan_page_access
  FOR DELETE TO authenticated
  USING (true);

CREATE POLICY "plan_page_access_all_service_role" ON plan_page_access
  FOR ALL TO service_role
  USING (true);

-- ============================================
-- 13. Grants para funções
-- ============================================
GRANT EXECUTE ON FUNCTION get_workspace_accessible_pages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_accessible_pages(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION workspace_has_page_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION workspace_has_page_access(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_workspace_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_plan(UUID) TO service_role;

-- ============================================
-- 14. Trigger para updated_at em plans
-- ============================================
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_plans_updated_at ON plans;
CREATE TRIGGER trigger_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plans_updated_at();

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
DO $$
DECLARE
  plans_count INT;
  pages_count INT;
  access_count INT;
BEGIN
  SELECT COUNT(*) INTO plans_count FROM plans;
  SELECT COUNT(*) INTO pages_count FROM system_pages;
  SELECT COUNT(*) INTO access_count FROM plan_page_access;

  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '   - Planos criados: %', plans_count;
  RAISE NOTICE '   - Páginas do sistema: %', pages_count;
  RAISE NOTICE '   - Acessos configurados: %', access_count;
END $$;
