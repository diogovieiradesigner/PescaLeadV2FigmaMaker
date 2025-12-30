import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';

export interface WorkspaceMember {
  user_id: string;
  role: 'admin' | 'member';
  email: string;
  name: string;
  joined_at?: string;
  avatar_url?: string;
}

export interface WorkspaceInvite {
  code: string;
  expires_at: string;
  role: 'admin' | 'member';
  created_at?: string;
}

interface CreateInviteResponse {
  success: boolean;
  code?: string;
  expires_at?: string;
  error?: string;
}

interface AcceptInviteResponse {
  success: boolean;
  workspace_id?: string;
  role?: string;
  error?: string;
}

interface RemoveMemberResponse {
  success: boolean;
  error?: string;
}

export function useWorkspaceMembers(workspaceId: string | null, accessToken: string | null) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listar membros
  const fetchMembers = useCallback(async () => {
    if (!workspaceId || !accessToken) {
      setMembers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: members, error: rpcError } = await supabase.rpc('get_workspace_members', {
        p_workspace_id: workspaceId
      });

      if (rpcError) {
        console.error('[WORKSPACE_MEMBERS] Error fetching members:', rpcError);
        setError(rpcError.message);
        setMembers([]);
        return;
      }

      // O RPC retorna diretamente um array de membros
      if (Array.isArray(members)) {
        setMembers(members);
      } else {
        console.error('[WORKSPACE_MEMBERS] Invalid response format:', members);
        setError('Formato de resposta inválido');
        setMembers([]);
      }
    } catch (err: any) {
      console.error('[WORKSPACE_MEMBERS] Exception:', err);
      setError(err.message || 'Erro desconhecido');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, accessToken]);

  // Criar convite
  const createInvite = useCallback(async (
    role: 'admin' | 'member' = 'member',
    expiresInDays: number = 7
  ): Promise<CreateInviteResponse> => {
    if (!workspaceId || !accessToken) {
      return { success: false, error: 'Workspace ou token não disponível' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('create_workspace_invite', {
        p_workspace_id: workspaceId,
        p_role: role,
        p_expires_in_days: expiresInDays
      });

      if (rpcError) {
        console.error('[WORKSPACE_MEMBERS] Error creating invite:', rpcError);
        return { success: false, error: rpcError.message };
      }

      return data as CreateInviteResponse;
    } catch (err: any) {
      console.error('[WORKSPACE_MEMBERS] Exception creating invite:', err);
      return { success: false, error: err.message || 'Erro desconhecido' };
    }
  }, [workspaceId, accessToken]);

  // Remover membro
  const removeMember = useCallback(async (userId: string): Promise<RemoveMemberResponse> => {
    if (!workspaceId || !accessToken) {
      return { success: false, error: 'Workspace ou token não disponível' };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('remove_workspace_member', {
        p_workspace_id: workspaceId,
        p_user_id: userId
      });

      if (rpcError) {
        console.error('[WORKSPACE_MEMBERS] Error removing member:', rpcError);
        return { success: false, error: rpcError.message };
      }

      const response = data as RemoveMemberResponse;
      
      if (response.success) {
        // Atualizar lista de membros
        await fetchMembers();
      }

      return response;
    } catch (err: any) {
      console.error('[WORKSPACE_MEMBERS] Exception removing member:', err);
      return { success: false, error: err.message || 'Erro desconhecido' };
    }
  }, [workspaceId, accessToken, fetchMembers]);

  // Aceitar convite (função estática, não depende de workspace atual)
  const acceptInvite = async (inviteCode: string): Promise<AcceptInviteResponse> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('accept_workspace_invite', {
        p_invite_code: inviteCode
      });

      if (rpcError) {
        console.error('[WORKSPACE_MEMBERS] Error accepting invite:', rpcError);
        return { success: false, error: rpcError.message };
      }

      return data as AcceptInviteResponse;
    } catch (err: any) {
      console.error('[WORKSPACE_MEMBERS] Exception accepting invite:', err);
      return { success: false, error: err.message || 'Erro desconhecido' };
    }
  };

  // Carregar membros quando workspaceId mudar
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    fetchMembers,
    createInvite,
    removeMember,
    acceptInvite,
  };
}