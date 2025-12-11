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
      console.error('[AUTH] Erro ao criar usuário:', authError);
      console.error('[AUTH] Mensagem completa:', authError.message);
      
      // Traduzir erros comuns para mensagens amigáveis
      let friendlyMessage = authError.message;
      
      // Detectar email duplicado ou inválido
      // Supabase às vezes retorna "Email address X is invalid" para emails duplicados!
      if (authError.message.includes('User already registered') || 
          authError.message.includes('already registered') ||
          authError.message.includes('already been registered') ||
          authError.message.includes('is invalid')) {
        friendlyMessage = 'Este email já está cadastrado ou é inválido. Tente fazer login ou use outro email.';
      } else if (authError.message.includes('Email not confirmed')) {
        friendlyMessage = 'Você precisa desabilitar a confirmação de email no Supabase Dashboard (Authentication > Settings).';
      } else if (authError.message.includes('Password should be at least')) {
        friendlyMessage = 'A senha deve ter no mínimo 6 caracteres.';
      }
      
      console.error('[AUTH] Mensagem traduzida:', friendlyMessage);
      return { user: null, error: new Error(friendlyMessage) };
    }

    if (!authData.user) {
      return { user: null, error: new Error('Usuário não foi criado') };
    }

    console.log('[AUTH] Usuário criado no Auth:', authData.user.id);

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
        console.log('[AUTH] Perfil encontrado após', i + 1, 'tentativas');
        break;
      }

      if (i < 4) {
        console.log('[AUTH] Tentativa', i + 1, 'falhou, aguardando trigger...');
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // 4. Se o trigger não criou, criar manualmente
    if (!profile) {
      console.log('[AUTH] Trigger não criou perfil, criando manualmente...');
      
      const { data: rpcResult, error: createError } = await supabase.rpc('create_user_profile', {
        p_user_id: authData.user.id,
        p_email: data.email,
        p_name: data.name,
      });

      if (createError) {
        console.error('[AUTH] ❌ Erro RPC ao criar perfil:', createError);
        // Continuar mesmo se falhar, retornar fallback
      } else if (rpcResult?.success) {
        // Buscar perfil criado
        const { data: fetchedProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        profile = fetchedProfile;
        console.log('[AUTH] ✅ Perfil criado via RPC com sucesso');
      } else {
        console.error('[AUTH] ❌ RPC retornou erro:', rpcResult?.error);
      }
    }

    const frontendUser: FrontendUser = profile ? dbUserToFrontend(profile as DbUser) : {
      id: authData.user.id,
      name: data.name,
      email: data.email,
      avatar: null,
      lastWorkspaceId: null,
    };

    console.log('[AUTH] Usuário criado com sucesso:', frontendUser.email);
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
    // 1. Login no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      console.error('❌ [AUTH] Erro ao fazer login:', authError);
      // ✅ Mensagem amigável para erro de credenciais inválidas
      if (authError.message.includes('Invalid login credentials')) {
        return { user: null, error: new Error('Email ou senha incorretos. Por favor, verifique suas credenciais e tente novamente.') };
      }
      return { user: null, error: authError };
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
        console.log('[AUTH] Tentativa', i + 1, 'de buscar perfil falhou, tentando novamente...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Fallback se não encontrou perfil
    if (!profile) {
      const frontendUser: FrontendUser = {
        id: authData.user.id,
        name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Usuário',
        email: authData.user.email || '',
        avatar: null,
        lastWorkspaceId: null,
      };
      
      console.log('[AUTH] Perfil não encontrado, usando fallback:', frontendUser.email);
      return { user: frontendUser, error: null };
    }

    const frontendUser = dbUserToFrontend(profile as DbUser);
    console.log('[AUTH] Login realizado com sucesso:', frontendUser.email);
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
      console.error('[AUTH] Erro ao fazer logout:', error);
      return { error };
    }

    console.log('[AUTH] Logout realizado com sucesso');
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
      console.error('[AUTH] Erro ao verificar sessão:', sessionError);
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
        console.log('[AUTH] Tentativa', i + 1, 'de buscar perfil falhou, tentando novamente...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Se não encontrou perfil, criar manualmente
    if (!profile) {
      console.log('[AUTH] Perfil não encontrado, criando...');
      
      const { data: rpcResult, error: createError } = await supabase.rpc('create_user_profile', {
        p_user_id: session.user.id,
        p_email: session.user.email || '',
        p_name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
      });

      if (createError) {
        console.error('[AUTH] ❌ Erro RPC ao criar perfil:', createError);
        
        // Fallback se criação falhar
        const frontendUser: FrontendUser = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          avatar: null,
          lastWorkspaceId: null,
        };
        
        console.log('[AUTH] Usando fallback para perfil:', frontendUser.email);
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
        console.log('[AUTH] ✅ Perfil criado via RPC com sucesso');
      } else {
        console.error('[AUTH] ❌ RPC retornou erro:', rpcResult?.error);
        
        // Fallback
        const frontendUser: FrontendUser = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          avatar: null,
          lastWorkspaceId: null,
        };
        
        console.log('[AUTH] Usando fallback após erro RPC:', frontendUser.email);
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
      console.error('[AUTH] Usuário não autenticado:', authError);
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
      console.error('[AUTH] Erro ao atualizar perfil:', updateError);
      return { user: null, error: updateError };
    }

    const frontendUser = dbUserToFrontend(updatedProfile as DbUser);
    console.log('[AUTH] Perfil atualizado com sucesso');
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
      console.error('[AUTH] Erro ao atualizar last_workspace_id:', updateError);
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
    console.log('[AUTH] Estado de autenticação mudou:', event);

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