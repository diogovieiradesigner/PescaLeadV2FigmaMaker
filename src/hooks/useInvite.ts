import { useState, useEffect } from 'react';
import { fetchInviteData, acceptInvite, InviteData } from '../services/inviteService';

const PENDING_INVITE_KEY = 'pending_invite';

/**
 * Hook para gerenciar convites de workspace
 */
export function useInvite(inviteCode?: string) {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar dados do convite
  useEffect(() => {
    if (!inviteCode) return;

    const loadInvite = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await fetchInviteData(inviteCode);

      if (error) {
        setError(error);
        setInvite(null);
      } else {
        setInvite(data);
      }

      setLoading(false);
    };

    loadInvite();
  }, [inviteCode]);

  return { invite, loading, error };
}

/**
 * Salva código do convite no localStorage para processar após login
 */
export function savePendingInvite(inviteCode: string): void {
  console.log('[INVITE HOOK] Salvando convite pendente:', inviteCode);
  localStorage.setItem(PENDING_INVITE_KEY, inviteCode);
}

/**
 * Recupera código do convite pendente
 */
export function getPendingInvite(): string | null {
  return localStorage.getItem(PENDING_INVITE_KEY);
}

/**
 * Remove código do convite pendente
 */
export function clearPendingInvite(): void {
  console.log('[INVITE HOOK] Limpando convite pendente');
  localStorage.removeItem(PENDING_INVITE_KEY);
}

/**
 * Processa convite pendente (após login)
 */
export async function processPendingInvite(
  userId: string,
  accessToken: string
): Promise<{ success: boolean; workspace_id?: string; error?: string }> {
  const pendingCode = getPendingInvite();

  if (!pendingCode) {
    return { success: false, error: 'Nenhum convite pendente' };
  }

  console.log('[INVITE HOOK] Processando convite pendente:', pendingCode);

  const result = await acceptInvite(pendingCode, userId, accessToken);

  if (result.success) {
    clearPendingInvite();
  }

  return result;
}
