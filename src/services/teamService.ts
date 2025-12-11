import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

const supabase = createClient();

export async function inviteMemberByEmail(
  workspaceId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer' = 'member'
) {
  console.log('[TEAM-SERVICE] inviteMemberByEmail called:', { workspaceId, email, role });

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('[TEAM-SERVICE] No session found');
    throw new Error('Não autenticado');
  }

  console.log('[TEAM-SERVICE] Session found, access_token exists:', !!session.access_token);

  const url = `https://${projectId}.supabase.co/functions/v1/invite-member-by-email`;
  const payload = {
    workspace_id: workspaceId,
    email: email.toLowerCase().trim(),
    role
  };

  console.log('[TEAM-SERVICE] Sending request to:', url);
  console.log('[TEAM-SERVICE] Payload:', payload);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[TEAM-SERVICE] Response status:', response.status);
    console.log('[TEAM-SERVICE] Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('[TEAM-SERVICE] Response data:', data);
    
    if (!response.ok) {
      console.error('[TEAM-SERVICE] Request failed:', data);
      throw {
        code: data.error_code || 'UNKNOWN_ERROR',
        message: data.message || data.error || 'Erro ao convidar'
      };
    }

    console.log('[TEAM-SERVICE] Success:', data);
    return data;
  } catch (error) {
    console.error('[TEAM-SERVICE] Exception caught:', error);
    throw error;
  }
}