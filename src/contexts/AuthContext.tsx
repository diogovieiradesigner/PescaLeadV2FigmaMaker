import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import * as authService from '../services/auth-service';
import * as workspacesService from '../services/workspaces-service';
import type { FrontendUser, FrontendWorkspace } from '../utils/supabase/converters';

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  lastWorkspaceId: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  ownerId: string;
}

export interface WorkspaceMember {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

interface AuthContextType {
  // State
  user: User | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, workspaceName: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Workspace methods
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Workspace members methods
  getWorkspaceMembers: () => Promise<WorkspaceMember[]>;
  inviteMember: (role: 'admin' | 'member' | 'viewer', expiresInDays?: number) => Promise<string>;
  updateMemberRole: (userId: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!accessToken;

  // ============================================
  // Initialize - Check for existing session
  // ============================================
  useEffect(() => {
    checkSession();
    
    // Setup auth state change listener for token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Auth state changed:', event);
      
      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('[AUTH] Token refreshed automatically');
        setAccessToken(session.access_token);
        localStorage.setItem('supabase_auth_token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AUTH] User signed out');
        setAccessToken(null);
        setUser(null);
        setCurrentWorkspace(null);
        setWorkspaces([]);
        localStorage.removeItem('supabase_auth_token');
      } else if (event === 'SIGNED_IN' && session) {
        console.log('[AUTH] User signed in');
        setAccessToken(session.access_token);
        localStorage.setItem('supabase_auth_token', session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkSession() {
    try {
      setIsLoading(true);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('[AUTH] Nenhuma sessão ativa encontrada');
        // Clear any stale tokens
        setAccessToken(null);
        localStorage.removeItem('supabase_auth_token');
        setIsLoading(false);
        return;
      }

      const token = session.access_token;
      
      // Verify token is not expired
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        console.log('[AUTH] Token expirado, fazendo refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('[AUTH] Erro ao fazer refresh do token:', refreshError);
          setAccessToken(null);
          localStorage.removeItem('supabase_auth_token');
          setIsLoading(false);
          return;
        }
        
        setAccessToken(refreshData.session.access_token);
        localStorage.setItem('supabase_auth_token', refreshData.session.access_token);
      } else {
        setAccessToken(token);
        localStorage.setItem('supabase_auth_token', token);
      }

      // Load user profile and workspaces
      await loadUserData();

    } catch (error) {
      console.error('[AUTH] Erro ao verificar sessão:', error);
      setAccessToken(null);
      localStorage.removeItem('supabase_auth_token');
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // Load User Profile & Workspaces
  // ============================================
  async function loadUserData() {
    try {
      console.log('[AUTH] 🔄 Iniciando carregamento de dados do usuário...');
      
      // 1. Get user profile
      const { user: userData, error: userError } = await authService.getCurrentUser();
      
      if (userError || !userData) {
        console.error('[AUTH] ❌ Erro ao carregar perfil:', userError);
        return;
      }

      console.log('[AUTH] ✅ Perfil carregado:', userData.email);
      setUser(userData as User);

      // 2. Get user workspaces
      const { workspaces: workspacesData, error: workspacesError } = 
        await workspacesService.getMyWorkspaces();
      
      if (workspacesError) {
        console.error('[AUTH] ❌ Erro ao carregar workspaces:', workspacesError);
        return;
      }

      console.log('[AUTH] ✅ Workspaces carregados:', workspacesData.length);
      setWorkspaces(workspacesData as Workspace[]);

      // 3. Set current workspace (last used or first available)
      let activeWorkspace: Workspace | null = null;

      if (userData.lastWorkspaceId) {
        activeWorkspace = workspacesData.find(ws => ws.id === userData.lastWorkspaceId) || null;
      }

      if (!activeWorkspace && workspacesData.length > 0) {
        activeWorkspace = workspacesData[0] as Workspace;
      }

      setCurrentWorkspace(activeWorkspace);

      console.log('[AUTH] ✅ Dados do usuário carregados com sucesso');
      console.log('[AUTH] ✅ Current workspace:', activeWorkspace?.name, activeWorkspace?.id);

    } catch (error) {
      console.error('[AUTH] ❌ Erro ao carregar dados do usuário:', error);
    }
  }

  // ============================================
  // SIGNUP
  // ============================================
  async function signup(name: string, email: string, password: string, workspaceName: string) {
    try {
      setIsLoading(true);

      // 1. Create user
      const { user: newUser, error: signupError } = await authService.signUp({
        email,
        password,
        name,
      });

      if (signupError || !newUser) {
        throw signupError || new Error('Erro ao criar usuário');
      }

      console.log('[AUTH] Usuário criado:', newUser.email);

      // 2. Login to get session
      await login(email, password);

      // 3. Create initial workspace
      const { workspace, error: workspaceError } = await workspacesService.createWorkspace({
        name: workspaceName,
      });

      if (workspaceError) {
        console.error('[AUTH] ❌ Erro ao criar workspace inicial:', workspaceError);
        // ⚠️ IMPORTANTE: Mostrar erro ao usuário!
        throw new Error(`Workspace não criado: ${workspaceError.message}`);
      } else if (workspace) {
        console.log('[AUTH] ✅ Workspace criado:', workspace.name);
        setWorkspaces([workspace as Workspace]);
        setCurrentWorkspace(workspace as Workspace);
      } else {
        console.error('[AUTH] ❌ Workspace não foi criado (null response)');
        throw new Error('Workspace não foi criado');
      }

      console.log('[AUTH] Cadastro completo!');

    } catch (error) {
      console.error('[AUTH] Erro no cadastro:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // LOGIN
  // ============================================
  async function login(email: string, password: string) {
    try {
      setIsLoading(true);

      const { user: userData, error } = await authService.signIn({
        email,
        password,
      });

      if (error || !userData) {
        throw error || new Error('Credenciais inválidas');
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAccessToken(session.access_token);
        localStorage.setItem('supabase_auth_token', session.access_token);
      }

      setUser(userData as User);

      // Load workspaces
      const { workspaces: workspacesData } = await workspacesService.getMyWorkspaces();
      setWorkspaces(workspacesData as Workspace[]);

      // Set current workspace
      let activeWorkspace: Workspace | null = null;
      if (userData.lastWorkspaceId) {
        activeWorkspace = workspacesData.find(ws => ws.id === userData.lastWorkspaceId) as Workspace || null;
      }
      if (!activeWorkspace && workspacesData.length > 0) {
        activeWorkspace = workspacesData[0] as Workspace;
      }
      setCurrentWorkspace(activeWorkspace);

      console.log('[AUTH] Login realizado com sucesso');

    } catch (error) {
      console.error('[AUTH] Erro no login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // LOGOUT
  // ============================================
  async function logout() {
    try {
      setIsLoading(true);

      await authService.signOut();

      // Clear state
      setUser(null);
      setCurrentWorkspace(null);
      setWorkspaces([]);
      setAccessToken(null);
      localStorage.removeItem('supabase_auth_token');

      console.log('[AUTH] Logout realizado com sucesso');

    } catch (error) {
      console.error('[AUTH] Erro no logout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // SWITCH WORKSPACE
  // ============================================
  async function switchWorkspace(workspaceId: string) {
    try {
      // Update last workspace in database
      await authService.updateLastWorkspace(workspaceId);

      // Update local state
      const workspace = workspaces.find(ws => ws.id === workspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
        
        if (user) {
          setUser({ ...user, lastWorkspaceId: workspaceId });
        }
      }

      console.log('[AUTH] Workspace alterado:', workspaceId);

    } catch (error) {
      console.error('[AUTH] Erro ao trocar workspace:', error);
      throw error;
    }
  }

  // ============================================
  // REFRESH WORKSPACES
  // ============================================
  async function refreshWorkspaces() {
    try {
      const { workspaces: workspacesData, error } = await workspacesService.getMyWorkspaces();
      
      if (error) {
        throw error;
      }

      setWorkspaces(workspacesData as Workspace[]);

      // Update current workspace data
      if (currentWorkspace) {
        const updated = workspacesData.find(ws => ws.id === currentWorkspace.id);
        if (updated) {
          setCurrentWorkspace(updated as Workspace);
        }
      }

      console.log('[AUTH] Workspaces atualizados');

    } catch (error) {
      console.error('[AUTH] Erro ao atualizar workspaces:', error);
      throw error;
    }
  }

  // ============================================
  // CREATE WORKSPACE
  // ============================================
  async function createWorkspace(name: string): Promise<Workspace> {
    try {
      const { workspace, error } = await workspacesService.createWorkspace({ name });

      if (error || !workspace) {
        throw error || new Error('Erro ao criar workspace');
      }

      const newWorkspace = workspace as Workspace;
      setWorkspaces([...workspaces, newWorkspace]);
      
      // Automatically set as current workspace
      setCurrentWorkspace(newWorkspace);
      
      // Update user's last workspace
      if (user) {
        setUser({ ...user, lastWorkspaceId: newWorkspace.id });
        await authService.updateLastWorkspace(newWorkspace.id);
      }

      console.log('[AUTH] Workspace criado e selecionado:', newWorkspace.name);

      return newWorkspace;

    } catch (error) {
      console.error('[AUTH] Erro ao criar workspace:', error);
      throw error;
    }
  }

  // ============================================
  // UPDATE PROFILE
  // ============================================
  async function updateProfile(data: { name?: string; avatar?: string }) {
    try {
      const updateData: { name?: string; avatar_url?: string } = {};
      if (data.name) updateData.name = data.name;
      if (data.avatar) updateData.avatar_url = data.avatar;

      const { user: updatedUser, error } = await authService.updateProfile(updateData);

      if (error || !updatedUser) {
        throw error || new Error('Erro ao atualizar perfil');
      }

      setUser(updatedUser as User);

      console.log('[AUTH] Perfil atualizado');

    } catch (error) {
      console.error('[AUTH] Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  // ============================================
  // UPDATE PASSWORD
  // ============================================
  async function updatePassword(currentPassword: string, newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message || 'Erro ao atualizar senha');
      }

      console.log('[AUTH] Senha atualizada com sucesso');

    } catch (error) {
      console.error('[AUTH] Erro ao atualizar senha:', error);
      throw error;
    }
  }

  // ============================================
  // GET WORKSPACE MEMBERS
  // ============================================
  async function getWorkspaceMembers(): Promise<WorkspaceMember[]> {
    try {
      if (!currentWorkspace) {
        throw new Error('Nenhum workspace selecionado');
      }

      const { members, error } = await workspacesService.getMembers(currentWorkspace.id);

      if (error) {
        throw error;
      }

      return members;

    } catch (error) {
      console.error('[AUTH] Erro ao buscar membros:', error);
      throw error;
    }
  }

  // ============================================
  // INVITE MEMBER
  // ============================================
  async function inviteMember(role: 'admin' | 'member' | 'viewer', expiresInDays?: number): Promise<string> {
    try {
      if (!currentWorkspace) {
        throw new Error('Nenhum workspace selecionado');
      }

      const { inviteCode, error } = await workspacesService.inviteMember({
        workspaceId: currentWorkspace.id,
        role,
        expiresInDays,
      });

      if (error || !inviteCode) {
        throw error || new Error('Erro ao criar convite');
      }

      console.log('[AUTH] Convite criado');

      return inviteCode;

    } catch (error) {
      console.error('[AUTH] Erro ao convidar membro:', error);
      throw error;
    }
  }

  // ============================================
  // UPDATE MEMBER ROLE
  // ============================================
  async function updateMemberRole(userId: string, role: string) {
    try {
      if (!currentWorkspace) {
        throw new Error('Nenhum workspace selecionado');
      }

      const { error } = await workspacesService.updateMemberRole(
        currentWorkspace.id,
        userId,
        role as any
      );

      if (error) {
        throw error;
      }

      console.log('[AUTH] Role do membro atualizada');

    } catch (error) {
      console.error('[AUTH] Erro ao atualizar role:', error);
      throw error;
    }
  }

  // ============================================
  // REMOVE MEMBER
  // ============================================
  async function removeMember(userId: string) {
    try {
      if (!currentWorkspace) {
        throw new Error('Nenhum workspace selecionado');
      }

      const { error } = await workspacesService.removeMember(currentWorkspace.id, userId);

      if (error) {
        throw error;
      }

      console.log('[AUTH] Membro removido');

    } catch (error) {
      console.error('[AUTH] Erro ao remover membro:', error);
      throw error;
    }
  }

  // ============================================
  // PROVIDER VALUE
  // ============================================

  const value: AuthContextType = {
    // State
    user,
    currentWorkspace,
    workspaces,
    accessToken,
    isLoading,
    isAuthenticated,

    // Methods
    login,
    signup,
    logout,
    switchWorkspace,
    refreshWorkspaces,
    createWorkspace,
    updateProfile,
    updatePassword,
    getWorkspaceMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}