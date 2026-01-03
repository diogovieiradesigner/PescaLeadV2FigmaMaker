import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  phone?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  ownerId: string;
}

export interface AccessiblePage {
  page_id: string;
  page_name: string;
  page_path: string;
  page_icon: string | null;
  display_order: number;
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
  accessiblePages: AccessiblePage[];

  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, workspaceName: string, phone?: string) => Promise<void>;
  signupWithInvite: (name: string, email: string, password: string, inviteCode: string) => Promise<void>;
  logout: () => Promise<void>;

  // Workspace methods
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateProfile: (data: { name?: string; avatar?: string; phone?: string }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Workspace members methods
  getWorkspaceMembers: () => Promise<WorkspaceMember[]>;
  inviteMember: (role: 'admin' | 'member' | 'viewer', expiresInDays?: number) => Promise<string>;
  updateMemberRole: (userId: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;

  // Page access methods
  hasPageAccess: (pageId: string) => boolean;
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
  const [accessiblePages, setAccessiblePages] = useState<AccessiblePage[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const isAuthenticated = !!user && !!accessToken;

  // ============================================
  // Initialize - Check for existing session
  // ============================================
  useEffect(() => {
    checkSession();
    
    // Setup auth state change listener for token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignorar eventos durante operações de login/signup (gerenciados manualmente)
      if (event === 'TOKEN_REFRESHED' && session) {
        setAccessToken(session.access_token);
        localStorage.setItem('supabase_auth_token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        // Só limpar se realmente não tiver sessão
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setAccessToken(null);
          setUser(null);
          setCurrentWorkspace(null);
          setWorkspaces([]);
          localStorage.removeItem('supabase_auth_token');
        }
      }
      // Removido SIGNED_IN - gerenciado manualmente na função login()
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
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
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
      setAccessToken(null);
      localStorage.removeItem('supabase_auth_token');
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // Check if user is Super Admin
  // ============================================
  async function checkSuperAdmin() {
    try {
      const { data, error } = await supabase.rpc('is_super_admin');
      if (!error && data === true) {
        setIsSuperAdmin(true);
        return true;
      }
      setIsSuperAdmin(false);
      return false;
    } catch (error) {
      console.error('Error checking super admin:', error);
      setIsSuperAdmin(false);
      return false;
    }
  }

  // ============================================
  // Load User Profile & Workspaces
  // ============================================
  async function loadUserData() {
    try {
      // 1. Get user profile
      const { user: userData, error: userError } = await authService.getCurrentUser();

      if (userError || !userData) {
        return;
      }

      setUser(userData as User);

      // 2. Check if user is super admin (for full access bypass)
      await checkSuperAdmin();

      // 3. Get user workspaces
      const { workspaces: workspacesData, error: workspacesError } =
        await workspacesService.getMyWorkspaces();

      if (workspacesError) {
        return;
      }

      setWorkspaces(workspacesData as Workspace[]);

      // 4. Set current workspace (last used or first available)
      let activeWorkspace: Workspace | null = null;

      if (userData.lastWorkspaceId) {
        activeWorkspace = workspacesData.find(ws => ws.id === userData.lastWorkspaceId) || null;
      }

      if (!activeWorkspace && workspacesData.length > 0) {
        activeWorkspace = workspacesData[0] as Workspace;
      }

      setCurrentWorkspace(activeWorkspace);

      // 5. Load accessible pages for the active workspace
      if (activeWorkspace) {
        await loadAccessiblePages(activeWorkspace.id);
      }

    } catch (error) {
      // Erro silencioso ao carregar dados
    }
  }

  // ============================================
  // SIGNUP
  // ============================================
  async function signup(name: string, email: string, password: string, workspaceName: string, phone?: string) {
    try {
      setIsLoading(true);

      // 1. Create user
      const { user: newUser, error: signupError } = await authService.signUp({
        email,
        password,
        name,
        phone,
      });

      if (signupError || !newUser) {
        const errorMessage = signupError?.message || 'Erro ao criar usuário';
        throw new Error(errorMessage);
      }

      // 2. Login to get session
      await login(email, password);

      // 3. Create initial workspace
      const { workspace, error: workspaceError } = await workspacesService.createWorkspace({
        name: workspaceName,
      });

      if (workspaceError) {
        // Mostrar erro ao usuario
        throw new Error(`Workspace não criado: ${workspaceError.message}`);
      } else if (workspace) {
        setWorkspaces([workspace as Workspace]);
        setCurrentWorkspace(workspace as Workspace);
        // Load accessible pages for the new workspace
        await loadAccessiblePages(workspace.id);
      } else {
        throw new Error('Workspace não foi criado');
      }

    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // SIGNUP WITH INVITE
  // ============================================
  async function signupWithInvite(name: string, email: string, password: string, inviteCode: string) {
    try {
      setIsLoading(true);

      // 1. Create user
      const { user: newUser, error: signupError } = await authService.signUp({
        email,
        password,
        name,
      });

      if (signupError || !newUser) {
        // Lancar erro formatado para o frontend capturar
        const errorMessage = signupError?.message || 'Erro ao criar usuário';
        throw new Error(errorMessage);
      }

      // 2. Login to get session
      await login(email, password);

      // 3. Accept invite
      const { workspaceId, error: inviteError } = await workspacesService.acceptInvite(inviteCode);

      if (inviteError) {
        // Mostrar erro ao usuario
        throw new Error(`Convite não aceito: ${inviteError.message}`);
      }

      // 4. Refresh workspaces to get the new workspace
      await refreshWorkspaces();

      // 5. Switch to the invited workspace (this also loads accessible pages)
      if (workspaceId) {
        await switchWorkspace(workspaceId);
      }

    } catch (error) {
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
        // Lancar erro formatado para o frontend capturar
        const errorMessage = error?.message || 'Credenciais inválidas';
        throw new Error(errorMessage);
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setAccessToken(session.access_token);
        localStorage.setItem('supabase_auth_token', session.access_token);
      }

      setUser(userData as User);

      // Check if user is super admin (for full access bypass)
      await checkSuperAdmin();

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

      // Load accessible pages for the active workspace
      if (activeWorkspace) {
        await loadAccessiblePages(activeWorkspace.id);
      }

    } catch (error) {
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

    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // LOAD ACCESSIBLE PAGES
  // ============================================
  async function loadAccessiblePages(workspaceId: string) {
    try {
      const { data, error } = await supabase.rpc('get_workspace_accessible_pages', {
        p_workspace_id: workspaceId
      });

      if (error) {
        console.error('Error loading accessible pages:', error);
        setAccessiblePages([]);
        return;
      }

      setAccessiblePages(data || []);
    } catch (error) {
      console.error('Error loading accessible pages:', error);
      setAccessiblePages([]);
    }
  }

  // ============================================
  // HAS PAGE ACCESS
  // ============================================
  // useCallback para evitar recriação da função a cada render
  // Isso previne loops infinitos no useNavigation que depende desta função
  const hasPageAccess = useCallback((pageId: string): boolean => {
    // Super admins have access to ALL pages
    if (isSuperAdmin) return true;

    // Dashboard is always accessible
    if (pageId === 'dashboard') return true;

    // Settings pages are always accessible (not controlled by plan)
    if (pageId === 'settings' || pageId === 'account-settings') return true;

    // If no workspace selected, deny access (except dashboard/settings)
    if (!currentWorkspace) return false;

    // If pages haven't loaded yet, deny access for safety
    // The user will be redirected to dashboard until pages load
    if (accessiblePages.length === 0) return false;

    return accessiblePages.some(page => page.page_id === pageId);
  }, [isSuperAdmin, currentWorkspace, accessiblePages]);

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

        // Load accessible pages for the new workspace
        await loadAccessiblePages(workspaceId);
      }

    } catch (error) {
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

    } catch (error) {
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

      // Load accessible pages for the new workspace
      await loadAccessiblePages(newWorkspace.id);

      return newWorkspace;

    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // UPDATE PROFILE
  // ============================================
  async function updateProfile(data: { name?: string; avatar?: string; phone?: string }) {
    try {
      const updateData: { name?: string; avatar_url?: string; phone?: string } = {};
      if (data.name) updateData.name = data.name;
      if (data.avatar) updateData.avatar_url = data.avatar;
      if (data.phone) updateData.phone = data.phone;

      const { user: updatedUser, error } = await authService.updateProfile(updateData);

      if (error || !updatedUser) {
        throw error || new Error('Erro ao atualizar perfil');
      }

      setUser(updatedUser as User);

    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // UPDATE PASSWORD
  // ============================================
  async function updatePassword(currentPassword: string, newPassword: string) {
    try {
      // 1. Verificar se usuário está autenticado
      if (!user?.email) {
        throw new Error('Usuário não autenticado');
      }

      // 2. Verificar senha atual fazendo login em background
      // Usamos um cliente separado para não afetar a sessão atual
      const { createClient } = await import('@supabase/supabase-js');
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL || 'https://nlbcwaxkeaddfocigwuk.supabase.co',
        import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjkyNDksImV4cCI6MjA3OTE0NTI0OX0.BoTSbJgFVb2XWNBVOcNv75JAKrwwMlNGJWETQYyMNFg',
        { auth: { persistSession: false } }
      );

      const { error: authError } = await tempClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (authError) {
        throw new Error('Senha atual incorreta');
      }

      // 3. Agora sim, atualizar para a nova senha usando o cliente principal
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message || 'Erro ao atualizar senha');
      }

    } catch (error) {
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

      return inviteCode;

    } catch (error) {
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

    } catch (error) {
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

    } catch (error) {
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
    accessiblePages,

    // Methods
    login,
    signup,
    signupWithInvite,
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
    hasPageAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}