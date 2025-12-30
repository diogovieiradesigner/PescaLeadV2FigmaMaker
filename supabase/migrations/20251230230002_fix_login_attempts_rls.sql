-- =============================================================================
-- Migration: Adicionar policy à tabela login_attempts
-- Problema: RLS habilitado mas sem policies (Supabase Advisor warning)
-- Solução: Apenas service_role pode acessar diretamente
-- =============================================================================

-- Service role full access (funções de rate limiting usam SECURITY DEFINER)
CREATE POLICY "service_role_login_attempts_all"
  ON login_attempts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Comentário explicativo
COMMENT ON TABLE login_attempts IS
  'Rastreia tentativas de login para rate limiting.
   Acesso apenas via functions SECURITY DEFINER: check_login_rate_limit, record_login_attempt.
   Nenhum acesso direto para authenticated/anon.';
