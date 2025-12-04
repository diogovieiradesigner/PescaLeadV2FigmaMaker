-- ============================================
-- FUNÇÕES RPC NECESSÁRIAS PARA BYPAS RLS
-- ============================================
-- IMPORTANTE: Execute estas funções no Supabase SQL Editor
-- para corrigir os erros de RLS (Row Level Security)
-- ============================================

-- ============================================
-- 1. FUNÇÃO: create_user_profile
-- Cria perfil de usuário na tabela users
-- ============================================

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- ⚡ Executa com privilégios do owner (bypassa RLS)
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Validação: Verificar se user_id está presente
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'user_id é obrigatório'
    );
  END IF;

  -- Validação: Verificar se email está presente
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'email é obrigatório'
    );
  END IF;

  -- Validação: Verificar se name está presente
  IF p_name IS NULL OR p_name = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'name é obrigatório'
    );
  END IF;

  -- Validação: Verificar se usuário já existe
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário já existe'
    );
  END IF;

  -- Criar usuário
  INSERT INTO public.users (id, email, name, avatar_url, last_workspace_id)
  VALUES (p_user_id, p_email, p_name, p_avatar_url, NULL);

  -- Retornar sucesso
  v_result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', p_email,
    'name', p_name,
    'avatar_url', p_avatar_url
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================
-- 2. FUNÇÃO: create_workspace_with_owner
-- Cria workspace e adiciona owner em uma transação
-- ============================================

CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  p_name TEXT,
  p_slug TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- ⚡ Executa com privilégios do owner (bypassa RLS)
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_slug TEXT;
  v_owner_id UUID;
  v_result JSON;
BEGIN
  -- 1. Determinar owner_id (usa auth.uid() se não fornecido)
  v_owner_id := COALESCE(p_owner_id, auth.uid());

  -- Validação: Verificar se owner está presente
  IF v_owner_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'owner_id não pode ser determinado (usuário não autenticado)'
    );
  END IF;

  -- Validação: Verificar se name está presente
  IF p_name IS NULL OR p_name = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'name é obrigatório'
    );
  END IF;

  -- 2. Gerar slug se não fornecido
  v_slug := COALESCE(
    p_slug,
    lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'))
  );

  -- 3. Gerar ID único
  v_workspace_id := gen_random_uuid();

  -- 4. Criar workspace
  INSERT INTO public.workspaces (id, name, slug, owner_id)
  VALUES (v_workspace_id, p_name, v_slug, v_owner_id);

  -- 5. Adicionar owner como membro
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_owner_id, 'owner');

  -- 6. Retornar sucesso
  v_result := json_build_object(
    'success', true,
    'workspace_id', v_workspace_id,
    'name', p_name,
    'slug', v_slug,
    'owner_id', v_owner_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, a transação será revertida automaticamente
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================
-- 3. COMENTÁRIOS E PERMISSÕES
-- ============================================

COMMENT ON FUNCTION public.create_user_profile IS 
'Cria perfil de usuário na tabela users. Usa SECURITY DEFINER para bypassar RLS.';

COMMENT ON FUNCTION public.create_workspace_with_owner IS 
'Cria workspace e adiciona owner em uma transação atômica. Usa SECURITY DEFINER para bypassar RLS.';

-- Revogar acesso público (opcional, se quiser restringir)
-- REVOKE ALL ON FUNCTION public.create_user_profile FROM PUBLIC;
-- REVOKE ALL ON FUNCTION public.create_workspace_with_owner FROM PUBLIC;

-- Garantir que authenticated users podem executar
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner TO authenticated;

-- ============================================
-- FIM DAS FUNÇÕES RPC
-- ============================================
