import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mdnvyvxkskbvvmuhfymn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbnZ5dnhrc2tidnZtdWhmeW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwMDQ3NzMsImV4cCI6MjA0ODU4MDc3M30.5kNUo2xCIvCMnzwDNRjXTCNRCeBHxBGmJJb1iKwlS8w';

// Cliente público (não autenticado) - pode ser usado para buscar convites
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

export interface InviteData {
  code: string;
  role: string;
  expires_at: string;
  workspace: {
    id: string;
    name: string;
  };
  inviter: {
    name: string;
    email: string;
  };
}

/**
 * Busca dados do convite ANTES do login
 * Funciona com cliente ANON graças à RLS policy
 */
export async function fetchInviteData(inviteCode: string): Promise<{ data: InviteData | null; error: string | null }> {
  try {
    console.log('[INVITE SERVICE] Buscando convite:', inviteCode);
    
    // 🎯 USAR JOINS NATIVOS DO SUPABASE (conforme exemplo)
    const { data, error } = await supabasePublic
      .from('workspace_invites')
      .select(`
        code,
        role,
        expires_at,
        workspace:workspace_id (
          id,
          name
        ),
        inviter:invited_by (
          name,
          email
        )
      `)
      .eq('code', inviteCode)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      console.error('[INVITE SERVICE] Erro ao buscar convite:', error);
      return { data: null, error: 'Convite inválido ou expirado' };
    }

    if (!data) {
      console.log('[INVITE SERVICE] Convite não encontrado');
      return { data: null, error: 'Convite não encontrado' };
    }

    console.log('[INVITE SERVICE] Convite encontrado:', data);

    // 🎯 Supabase já retorna os dados aninhados!
    const inviteData: InviteData = {
      code: data.code,
      role: data.role,
      expires_at: data.expires_at,
      workspace: {
        id: (data.workspace as any)?.id || '',
        name: (data.workspace as any)?.name || 'Workspace'
      },
      inviter: {
        name: (data.inviter as any)?.name || 'Usuário',
        email: (data.inviter as any)?.email || ''
      }
    };

    console.log('[INVITE SERVICE] Dados completos do convite:', inviteData);
    return { data: inviteData, error: null };

  } catch (err: any) {
    console.error('[INVITE SERVICE] Erro inesperado:', err);
    return { data: null, error: err.message || 'Erro ao buscar convite' };
  }
}

/**
 * Processa aceite do convite após login
 * Requer usuário autenticado
 */
export async function acceptInvite(
  inviteCode: string,
  userId: string,
  accessToken: string
): Promise<{ success: boolean; workspace_id?: string; error?: string }> {
  try {
    console.log('[INVITE SERVICE] Aceitando convite:', inviteCode, 'para usuário:', userId);

    // Cliente autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    // 1. Buscar convite novamente para validar
    const { data: invite, error: fetchError } = await supabaseAuth
      .from('workspace_invites')
      .select('code, workspace_id, role, invited_by, used')
      .eq('code', inviteCode)
      .single();

    if (fetchError || !invite) {
      console.error('[INVITE SERVICE] Convite não encontrado:', fetchError);
      return { success: false, error: 'Convite não encontrado' };
    }

    if (invite.used) {
      console.log('[INVITE SERVICE] Convite já foi usado');
      return { success: false, error: 'Este convite já foi utilizado' };
    }

    // 2. Verificar se usuário já é membro
    const { data: existingMember } = await supabaseAuth
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      console.log('[INVITE SERVICE] Usuário já é membro do workspace');
      // Marcar convite como usado mesmo assim
      await supabaseAuth
        .from('workspace_invites')
        .update({
          used: true,
          used_by: userId,
          used_at: new Date().toISOString()
        })
        .eq('code', inviteCode);

      return { success: true, workspace_id: invite.workspace_id };
    }

    // 3. Marcar convite como usado
    const { error: updateError } = await supabaseAuth
      .from('workspace_invites')
      .update({
        used: true,
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('code', inviteCode);

    if (updateError) {
      console.error('[INVITE SERVICE] Erro ao marcar convite como usado:', updateError);
      throw updateError;
    }

    // 4. Adicionar usuário ao workspace
    const { error: memberError } = await supabaseAuth
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: userId,
        role: invite.role,
        invited_by: invite.invited_by
      });

    if (memberError) {
      console.error('[INVITE SERVICE] Erro ao adicionar membro:', memberError);
      throw memberError;
    }

    // 5. Atualizar lookup table
    await supabaseAuth
      .from('workspace_membership_lookup')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: userId
      })
      .then(({ error }) => {
        if (error) console.warn('[INVITE SERVICE] Lookup já existe ou erro:', error);
      });

    console.log('[INVITE SERVICE] ✅ Convite aceito com sucesso!');
    return { success: true, workspace_id: invite.workspace_id };

  } catch (err: any) {
    console.error('[INVITE SERVICE] Erro ao aceitar convite:', err);
    return { success: false, error: err.message || 'Erro ao aceitar convite' };
  }
}