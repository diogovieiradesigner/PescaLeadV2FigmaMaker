// ============================================
// Auth Service
// Gerencia autenticação e usuários
// ============================================

import { supabase } from '../utils/supabase/client';
import type { DbUser } from '../types/database';
import { dbUserToFrontend, type FrontendUser } from '../utils/supabase/converters';

// ============================================
// TIPOS
// ============================================

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  name?: string;
  avatar_url?: string;
  phone?: string;
}

export interface AuthResponse {
  user: FrontendUser | null;
  error: Error | null;
}

export interface RateLimitResponse {
  allowed: boolean;
  attempts_remaining: number;
  blocked_until: string | null;
  message?: string;
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Verifica se o usuário está bloqueado por rate limiting
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResponse> {
  try {
    const { data, error } = await supabase.rpc('check_login_rate_limit', {
      p_identifier: identifier.toLowerCase(),
      p_identifier_type: 'email'
    });

    if (error) {
      // Se falhar, permitir (fail open para não bloquear usuários legítimos)
      return { allowed: true, attempts_remaining: 5, blocked_until: null };
    }

    return data as RateLimitResponse;
  } catch {
    return { allowed: true, attempts_remaining: 5, blocked_until: null };
  }
}

/**
 * Registra uma tentativa de login
 */
export async function recordLoginAttempt(identifier: string, success: boolean): Promise<void> {
  try {
    await supabase.rpc('record_login_attempt', {
      p_identifier: identifier.toLowerCase(),
      p_identifier_type: 'email',
      p_success: success
    });
  } catch {
    // Falha silenciosa - não bloquear login por erro no rate limiting
  }
}

// ============================================
// SIGN UP (Cadastro)
// ============================================

/**
 * Cria novo usuário no sistema
 * 
 * Fluxo:
 * 1. Cria usuário no Supabase Auth
 * 2. Aguardar trigger criar perfil
 * 3. Buscar perfil criado pelo trigger (com retry)
 * 4. Se o trigger não criou, criar manualmente
 * 5. Frontend deve criar workspace inicial separadamente
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    // 1. Criar usuário no Supabase Auth
    // ✅ Nota: Como não temos servidor de email configurado, precisamos
    // desabilitar confirmação de email no Supabase Dashboard:
    // Authentication > Settings > "Enable email confirmations" = OFF
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: data.phone,
        },
        // ⚠️ Descomente esta linha se você tiver acesso ao service_role_key:
        // emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      // Mensagens genéricas para evitar enumeração de usuários
      let friendlyMessage = 'Não foi possível criar a conta. Verifique os dados e tente novamente.';

      // Apenas erros técnicos que não revelam informação sensível
      if (authError.message.includes('Password should be at least')) {
        friendlyMessage = 'A senha deve ter no mínimo 6 caracteres.';
      }

      return { user: null, error: new Error(friendlyMessage) };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Usuário não foi criado') };
    }

    // Usuário criado com sucesso no Auth

    // 2. Aguardar trigger criar perfil
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 3. Buscar perfil criado pelo trigger (com retry)
    let profile = null;
    for (let i = 0; i < 5; i++) {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (!profileError && profileData) {
        profile = profileData;
        break;
      }

      if (i < 4) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // 4. Se o trigger não criou, criar manualmente
    if (!profile) {
      
      const { data: rpcResult, error: createError } = await supabase.rpc('create_user_profile', {
        p_user_id: authData.user.id,
        p_email: data.email,
        p_name: data.name,
      });

      if (createError) {
        // Continuar mesmo se falhar, retornar fallback
      } else if (rpcResult?.success) {
        // Buscar perfil criado
        const { data: fetchedProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        profile = fetchedProfile;
      }
    }

    const frontendUser: FrontendUser = profile ? dbUserToFrontend(profile as DbUser) : {
      id: authData.user.id,
      name: data.name,
      email: data.email,
      avatar: null,
      lastWorkspaceId: null,
    };

    return { user: frontendUser, error: null };

  } catch (error) {
    console.error('[AUTH] Erro inesperado no signup:', error);
    return { user: null, error: error as Error };
  }
}

// ============================================
// SIGN IN (Login)
// ============================================

/**
 * Autentica usuário existente
 */
export async function signIn(data: SignInData): Promise<AuthResponse> {
  try {
    // 0. Verificar rate limiting ANTES de tentar login
    const rateLimit = await checkRateLimit(data.email);

    if (!rateLimit.allowed) {
      const message = rateLimit.message || 'Muitas tentativas de login. Tente novamente mais tarde.';
      return { user: null, error: new Error(message) };
    }

    // 1. Login no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      // Registrar tentativa falha
      await recordLoginAttempt(data.email, false);

      // Mensagem genérica para evitar enumeração de usuários
      // Incluir tentativas restantes se disponível
      const attemptsMsg = rateLimit.attempts_remaining > 1
        ? ` (${rateLimit.attempts_remaining - 1} tentativas restantes)`
        : ' (última tentativa antes do bloqueio)';

      return { user: null, error: new Error('Email ou senha incorretos.' + attemptsMsg) };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Credenciais inválidas') };
    }

    // 2. Buscar perfil do usuário (com retry)
    let profile = null;

    for (let i = 0; i < 3; i++) {
      const { data: profileData, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (!err && profileData) {
        profile = profileData;
        break;
      }

      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Login bem-sucedido - limpar tentativas
    await recordLoginAttempt(data.email, true);

    // 4. Fallback se não encontrou perfil
    if (!profile) {
      const frontendUser: FrontendUser = {
        id: authData.user.id,
        name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Usuário',
        email: authData.user.email || '',
        avatar: null,
        lastWorkspaceId: null,
      };

      return { user: frontendUser, error: null };
    }

    const frontendUser = dbUserToFrontend(profile as DbUser);
    return { user: frontendUser, error: null };

  } catch (error) {
    console.error('[AUTH] Erro inesperado no login:', error);
    return { user: null, error: error as Error };
  }
}

// ============================================
// SIGN OUT (Logout)
// ============================================

/**
 * Desloga usuário
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error };
    }

    return { error: null };

  } catch (error) {
    console.error('[AUTH] Erro inesperado no logout:', error);
    return { error: error as Error };
  }
}

// ============================================
// GET CURRENT USER
// ============================================

/**
 * Retorna dados do usuário autenticado
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    // 1. Verificar sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return { user: null, error: sessionError };
    }

    if (!session?.user) {
      return { user: null, error: null };
    }

    // 2. Buscar perfil do usuário (com retry)
    let profile = null;

    for (let i = 0; i < 3; i++) {
      const { data: profileData, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!err && profileData) {
        profile = profileData;
        break;
      }

      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Se não encontrou perfil, criar manualmente
    if (!profile) {
      
      const { data: rpcResult, error: createError } = await supabase.rpc('create_user_profile', {
        p_user_id: session.user.id,
        p_email: session.user.email || '',
        p_name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
      });

      if (createError) {
        // Fallback se criação falhar
        const frontendUser: FrontendUser = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          avatar: null,
          lastWorkspaceId: null,
        };

        return { user: frontendUser, error: null };
      }

      if (rpcResult?.success) {
        // Buscar perfil criado
        const { data: fetchedProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        profile = fetchedProfile;
      } else {
        // Fallback
        const frontendUser: FrontendUser = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          avatar: null,
          lastWorkspaceId: null,
        };

        return { user: frontendUser, error: null };
      }
    }

    const frontendUser = dbUserToFrontend(profile as DbUser);
    return { user: frontendUser, error: null };

  } catch (error) {
    console.error('[AUTH] Erro inesperado ao buscar usuário:', error);
    return { user: null, error: error as Error };
  }
}

// ============================================
// UPDATE PROFILE
// ============================================

/**
 * Atualiza perfil do usuário
 */
export async function updateProfile(data: UpdateProfileData): Promise<AuthResponse> {
  try {
    // 1. Verificar usuário autenticado
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { user: null, error: authError || new Error('Não autenticado') };
    }

    // 2. Atualizar perfil
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(data)
      .eq('id', authUser.id)
      .select()
      .single();

    if (updateError) {
      return { user: null, error: updateError };
    }

    const frontendUser = dbUserToFrontend(updatedProfile as DbUser);
    return { user: frontendUser, error: null };

  } catch (error) {
    console.error('[AUTH] Erro inesperado ao atualizar perfil:', error);
    return { user: null, error: error as Error };
  }
}

// ============================================
// UPDATE LAST WORKSPACE
// ============================================

/**
 * Atualiza o último workspace acessado pelo usuário
 */
export async function updateLastWorkspace(workspaceId: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { error: authError || new Error('Não autenticado') };
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ last_workspace_id: workspaceId })
      .eq('id', authUser.id);

    if (updateError) {
      return { error: updateError };
    }

    return { error: null };

  } catch (error) {
    console.error('[AUTH] Erro inesperado ao atualizar workspace:', error);
    return { error: error as Error };
  }
}

// ============================================
// LISTEN TO AUTH CHANGES
// ============================================

/**
 * Escuta mudanças no estado de autenticação
 */
export function onAuthStateChange(callback: (user: FrontendUser | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

    if (session?.user) {
      // Buscar perfil completo
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        callback(dbUserToFrontend(profile as DbUser));
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });

  // Retornar função de cleanup
  return () => {
    subscription.unsubscribe();
  };
}

// ============================================
// HELPER: Verificar se usuário está autenticado
// ============================================

/**
 * Verifica se há um usuário autenticado (sync)
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session?.user;
}