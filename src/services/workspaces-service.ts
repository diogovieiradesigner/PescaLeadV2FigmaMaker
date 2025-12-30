// ============================================
// Workspaces Service
// Gerencia workspaces (espaços de trabalho)
// ============================================

import { supabase } from '../utils/supabase/client';
import type { DbWorkspace, DbWorkspaceMember, DbWorkspaceInvite, WorkspaceRole } from '../types/database';
import { dbWorkspaceToFrontend, type FrontendWorkspace } from '../utils/supabase/converters';

// ============================================
// TIPOS
// ============================================

export interface CreateWorkspaceData {
  name: string;
  slug?: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  settings?: Record<string, any>;
}

export interface InviteMemberData {
  workspaceId: string;
  role: 'admin' | 'member' | 'viewer';
  expiresInDays?: number;
}

export interface WorkspaceMember {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  role: WorkspaceRole;
  joinedAt: string;
}

// ============================================
// GET MY WORKSPACES
// ============================================

/**
 * Busca todos os workspaces que o usuário tem acesso
 */
export async function getMyWorkspaces(): Promise<{
  workspaces: FrontendWorkspace[];
  error: Error | null;
}> {
  try {
    // 1. Verificar usuário autenticado
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { workspaces: [], error: authError || new Error('Não autenticado') };
    }

    // 2. Buscar memberships do usuário
    const { data: memberships, error: membershipsError } = await supabase
      .from('workspace_members')
      .select(`
        *,
        workspace:workspaces(*)
      `)
      .eq('user_id', authUser.id);

    if (membershipsError) {
      return { workspaces: [], error: membershipsError };
    }

    if (!memberships || memberships.length === 0) {
      return { workspaces: [], error: null };
    }

    // 3. Converter para formato do frontend
    const workspaces = memberships
      .filter(m => m.workspace)
      .map(m => dbWorkspaceToFrontend(
        m.workspace as any as DbWorkspace,
        m as DbWorkspaceMember
      ));

    return { workspaces, error: null };

  } catch (error) {
    return { workspaces: [], error: error as Error };
  }
}

// ============================================
// GET WORKSPACE BY ID
// ============================================

/**
 * Busca workspace específico (verifica se usuário tem acesso)
 */
export async function getWorkspaceById(workspaceId: string): Promise<{
  workspace: FrontendWorkspace | null;
  error: Error | null;
}> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { workspace: null, error: authError || new Error('Não autenticado') };
    }

    // Buscar workspace e membership
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select(`
        *,
        workspace:workspaces(*)
      `)
      .eq('workspace_id', workspaceId)
      .eq('user_id', authUser.id)
      .single();

    if (membershipError) {
      return { workspace: null, error: membershipError };
    }

    if (!membership?.workspace) {
      return { workspace: null, error: new Error('Workspace não encontrado') };
    }

    const workspace = dbWorkspaceToFrontend(
      membership.workspace as any as DbWorkspace,
      membership as DbWorkspaceMember
    );

    return { workspace, error: null };

  } catch (error) {
    return { workspace: null, error: error as Error };
  }
}

// ============================================
// CREATE WORKSPACE
// ============================================

/**
 * Cria novo workspace e adiciona usuário como owner
 * 
 * Usa RPC 'create_workspace_with_owner' para bypassar RLS
 * Fluxo (executado no banco via SECURITY DEFINER):
 * 1. Valida usuário autenticado
 * 2. Cria workspace com slug auto-gerado
 * 3. Adiciona usuário como owner em workspace_members
 * 4. Retorna dados do workspace criado
 */
export async function createWorkspace(data: CreateWorkspaceData): Promise<{
  workspace: FrontendWorkspace | null;
  error: Error | null;
}> {
  try {
    // 1. Verificar usuário autenticado
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { workspace: null, error: authError || new Error('Não autenticado') };
    }

    // 2. Criar workspace usando RPC (bypassa RLS com SECURITY DEFINER)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_workspace_with_owner', {
      p_name: data.name,
    });

    if (rpcError) {
      return { workspace: null, error: rpcError };
    }

    if (!rpcResult?.success) {
      const errorMsg = rpcResult?.error || 'Erro desconhecido ao criar workspace';
      return { workspace: null, error: new Error(errorMsg) };
    }

    // 3. Converter para formato do frontend
    const workspace: FrontendWorkspace = {
      id: rpcResult.workspace_id,
      name: rpcResult.name,
      slug: rpcResult.slug,
      role: 'owner',
      ownerId: rpcResult.owner_id,
    };

    return { workspace, error: null };

  } catch (error) {
    return { workspace: null, error: error as Error };
  }
}

// ============================================
// UPDATE WORKSPACE
// ============================================

/**
 * Atualiza dados do workspace (apenas owner pode)
 */
export async function updateWorkspace(
  workspaceId: string,
  data: UpdateWorkspaceData
): Promise<{ error: Error | null }> {
  try {
    const { error: updateError } = await supabase
      .from('workspaces')
      .update(data)
      .eq('id', workspaceId);

    if (updateError) {
      return { error: updateError };
    }

    return { error: null };

  } catch (error) {
    return { error: error as Error };
  }
}

// ============================================
// DELETE WORKSPACE
// ============================================

/**
 * Deleta workspace (apenas owner pode)
 */
export async function deleteWorkspace(workspaceId: string): Promise<{ error: Error | null }> {
  try {
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (deleteError) {
      return { error: deleteError };
    }

    return { error: null };

  } catch (error) {
    return { error: error as Error };
  }
}

// ============================================
// GET MEMBERS
// ============================================

/**
 * Lista membros de um workspace
 */
export async function getMembers(workspaceId: string): Promise<{
  members: WorkspaceMember[];
  error: Error | null;
}> {
  try {
    const { data: memberships, error: membershipsError } = await supabase
      .from('workspace_members')
      .select(`
        *,
        user:users(id, name, email, avatar_url)
      `)
      .eq('workspace_id', workspaceId);

    if (membershipsError) {
      return { members: [], error: membershipsError };
    }

    const members: WorkspaceMember[] = memberships
      .filter(m => m.user)
      .map(m => ({
        userId: m.user_id,
        userName: (m.user as any).name,
        userEmail: (m.user as any).email,
        userAvatar: (m.user as any).avatar_url,
        role: m.role,
        joinedAt: m.joined_at,
      }));

    return { members, error: null };

  } catch (error) {
    return { members: [], error: error as Error };
  }
}

// ============================================
// INVITE MEMBER
// ============================================

/**
 * Gera convite para adicionar membro ao workspace
 */
export async function inviteMember(data: InviteMemberData): Promise<{
  inviteCode: string | null;
  error: Error | null;
}> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { inviteCode: null, error: authError || new Error('Não autenticado') };
    }

    // Gerar código único
    const code = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

    // Criar convite
    const { error: inviteError } = await supabase
      .from('workspace_invites')
      .insert({
        code,
        workspace_id: data.workspaceId,
        invited_by: authUser.id,
        role: data.role,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      return { inviteCode: null, error: inviteError };
    }

    return { inviteCode: code, error: null };

  } catch (error) {
    return { inviteCode: null, error: error as Error };
  }
}

// ============================================
// ACCEPT INVITE
// ============================================

/**
 * Aceita convite e adiciona usuário ao workspace
 */
export async function acceptInvite(code: string): Promise<{
  workspaceId: string | null;
  error: Error | null;
}> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { workspaceId: null, error: authError || new Error('Não autenticado') };
    }

    // 1. Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('code', code)
      .single();

    if (inviteError || !invite) {
      return { workspaceId: null, error: new Error('Convite inválido') };
    }

    // 2. Validar convite
    if (invite.used) {
      return { workspaceId: null, error: new Error('Convite já foi utilizado') };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { workspaceId: null, error: new Error('Convite expirado') };
    }

    // 3. Adicionar membro
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: authUser.id,
        role: invite.role,
        invited_by: invite.invited_by,
      });

    if (memberError) {
      return { workspaceId: null, error: memberError };
    }

    // 4. Marcar convite como usado
    await supabase
      .from('workspace_invites')
      .update({
        used: true,
        used_by: authUser.id,
        used_at: new Date().toISOString(),
      })
      .eq('code', code);

    return { workspaceId: invite.workspace_id, error: null };

  } catch (error) {
    return { workspaceId: null, error: error as Error };
  }
}

// ============================================
// REMOVE MEMBER
// ============================================

/**
 * Remove membro de um workspace
 */
export async function removeMember(
  workspaceId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error: deleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (deleteError) {
      return { error: deleteError };
    }

    return { error: null };

  } catch (error) {
    return { error: error as Error };
  }
}

// ============================================
// UPDATE MEMBER ROLE
// ============================================

/**
 * Atualiza role de um membro
 */
export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  newRole: WorkspaceRole
): Promise<{ error: Error | null }> {
  try {
    const { error: updateError } = await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (updateError) {
      return { error: updateError };
    }

    return { error: null };

  } catch (error) {
    return { error: error as Error };
  }
}